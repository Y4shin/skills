/**
 * Real-session runner for the supervisor round-trip integration test.
 *
 * Mirrors pi-subagents' `test/support/real-session-runner.ts`:
 *   - installs a `pi` binary shim that execs our supervisor-child-cli.mjs,
 *   - boots a real parent `AgentSession` backed by the faux LLM,
 *   - loads pi-subagents + pi-intercom via `additionalExtensionPaths` (so jiti's
 *     `@mariozechner/* -> @earendil-works/*` alias map gives them the parent's
 *     module instances) and the task-workflow extension via `extensionFactories`,
 *   - registers a mocked `ask_user_question` so the headless parent can complete
 *     the skill's ask-then-reply step,
 *   - drives the parent with a state-machine faux responder that emits the exact
 *     `subagent(async) → wait → subagent_supervisor(pending) → ask_user_question
 *      → subagent_supervisor(reply) → subagent(status)` sequence from
 *     `skills/create-task/SKILL.md`'s Step 3 parent loop.
 *
 * No real API keys, no network.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Type } from "typebox";
import {
	type AssistantMessage,
	type Context,
	type FauxContentBlock,
	type FauxResponseStep,
	fauxAssistantMessage,
	fauxText,
	fauxToolCall,
	registerFauxProvider,
	type ToolCall,
} from "../../../node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-ai/dist/compat.js";
import {
	type AgentSession,
	type AgentSessionEvent,
	type ModelRegistry,
	createAgentSession,
	DefaultResourceLoader,
	SessionManager,
	SettingsManager,
} from "@earendil-works/pi-coding-agent";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const TASK_WORKFLOW_EXT = path.join(REPO_ROOT, "src/pi/index.ts");
const PI_SUBAGENTS_EXT = path.join(REPO_ROOT, "node_modules/pi-subagents/src/extension/index.ts");
const PI_INTERCOM_EXT = path.join(REPO_ROOT, "node_modules/pi-intercom/index.ts");
const CHILD_CLI_PATH = fileURLToPath(new URL("./supervisor-child-cli.mjs", import.meta.url));

/**
 * pi-subagents derives TEMP_ROOT_DIR from `os.tmpdir()` (+ uid), so by default
 * this test would share /tmp/pi-subagents-uid-1000 with the user's REAL pi
 * runtime — intermixing async runs and supervisor channels. Pin TMPDIR to a
 * private dir BEFORE the extension loads (TEMP_ROOT_DIR is a module-load-time
 * const) so the parent, the async runner subprocess, and the child subprocess
 * all compute the same isolated temp root.
 */
const ISOLATED_TMP = mkdtempSync(path.join(os.tmpdir(), "pi-supervisor-test-tmp-"));
process.env.TMPDIR = ISOLATED_TMP;
process.on("exit", () => rmSync(ISOLATED_TMP, { recursive: true, force: true }));

export type FauxReply = string | FauxContentBlock | FauxContentBlock[] | AssistantMessage;
export type FauxResponder = (context: Context, state: { callCount: number }) => FauxReply | Promise<FauxReply>;

export interface RealSupervisorRun {
	responseText: string;
	parentSession: AgentSession;
	modelCalls: number;
	events: AgentSessionEvent[];
	dispose: () => Promise<void>;
}

export const call = (name: string, args: Record<string, unknown> = {}, id?: string): ToolCall =>
	fauxToolCall(name, args, id ? { id } : undefined);

// ─── message inspection helpers ────────────────────────────────────────────────

type AnyMessage = { role?: string; toolName?: string; content?: unknown };

function textOf(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.map((p) => p && typeof p === "object" && (p as { type?: unknown }).type === "text"
			? String((p as { text?: unknown }).text ?? "")
			: "")
		.join("");
}

function toolResults(messages: readonly AnyMessage[], toolName: string): Array<{ text: string }> {
	return messages
		.filter((m) => m.role === "toolResult" && m.toolName === toolName)
		.map((m) => ({ text: textOf(m.content) }));
}

function lastToolResult(messages: readonly AnyMessage[]): { toolName: string; text: string } | undefined {
	for (let i = messages.length - 1; i >= 0; i--) {
		const m = messages[i]!;
		if (m.role === "toolResult") return { toolName: m.toolName ?? "", text: textOf(m.content) };
	}
	return undefined;
}

/** Run id from the async launch result text: `Async: <agent> [<runId>]`. */
function extractRunId(text: string): string | undefined {
	return /\[([^\]]+)\]/.exec(text)?.[1];
}

/** Request id from the pending result text: `Reply: subagent_supervisor({ action: "reply", replyTo: "<id>", ... })`. */
function extractReplyTo(text: string): string | undefined {
	return /replyTo:\s*"([^"]+)"/.exec(text)?.[1];
}

// ─── the parent-loop faux responder (mirrors SKILL.md Step 3) ───────────────────

/**
 * State machine that emits the create-task parent loop:
 *   subagent(async) → wait → pending → ask_user_question → reply → status → (loop|done)
 *
 * It inspects the conversation to extract the run id (from the async launch
 * result) and the request id (from the pending result), exactly as a real
 * model reading tool results would.
 *
 * The async runner takes a few hundred ms to boot and write status.json, and
 * the child then blocks on `contact_supervisor`. A real model has seconds of
 * think-latency between tool results, but the faux responder has none, so we
 * inject small sleeps around `wait` to let the runner catch up. Without this,
 * `wait` sees no on-disk run yet ("Nothing to wait for") and the responder
 * would spin through the whole faux queue before the child starts.
 */
export function parentLoopResponder(): FauxResponder {
	const asked = { value: false };
	let waitRetries = 0;
	const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
	return async (context): Promise<FauxReply> => {
		const messages = context.messages as AnyMessage[];
		const last = lastToolResult(messages);
		const subagentLaunch = toolResults(messages, "subagent").find((r) => /Async:.*\[/.test(r.text));
		const runId = subagentLaunch ? extractRunId(subagentLaunch.text) : undefined;

		// Start: launch the detached subagent.
		if (!last) {
			return call("subagent", {
				agent: "supervisor-child",
				task: "Ask the supervisor for approval to ship, then report the outcome.",
				async: true,
				clarify: false,
				agentScope: "project",
				acceptance: { level: "none", reason: "supervisor round-trip integration test" },
				// Shorten the no-activity watchdog so a child blocked on
				// contact_supervisor flags attention in ~2s instead of the 60s
				// default. wait()'s poll fallback then wakes the parent promptly
				// even if the one-shot detach event races past its subscription.
				control: { enabled: true, needsAttentionAfterMs: 2_000, notifyChannels: ["event"] },
			});
		}

		// After launch -> wait for attention/completion. Call wait WITHOUT a
		// pre-sleep: the faux responder has zero think-latency, so sleeping
		// before subscribing risks letting the child reach contact_supervisor and
		// the supervisor poller fire its one-shot detach event while wait isn't
		// listening. The waitRetries loop below tolerates the run not being on
		// disk yet ("Nothing to wait for"). The reliable wake is the shortened
		// 2s no-activity watchdog set in the launch call's `control` param —
		// wait's poll fallback flags the blocked run as needs_attention within
		// ~2s regardless of the detach-event race.
		if (last.toolName === "subagent" && /Async:.*\[/.test(last.text)) {
			return call("wait", { id: runId });
		}

		if (last.toolName === "wait") {
			// Startup race: run not on disk yet. Retry wait instead of advancing.
			if (/Nothing to wait for|No active run matched/.test(last.text) && waitRetries < 40) {
				waitRetries++;
				await sleep(150);
				return call("wait", { id: runId });
			}
			waitRetries = 0;
			// wait() returned on attention or completion -> inspect pending.
			return call("subagent_supervisor", { action: "pending" });
		}

		if (last.toolName === "subagent_supervisor") {
			// Just replied -> check chain status.
			if (/Replied to supervisor request/.test(last.text)) {
				await sleep(150);
				return call("subagent", { action: "status", id: runId });
			}
			// pending result: if there's a request, ask the user; else check status.
			if (/No pending supervisor requests/.test(last.text)) {
				await sleep(150);
				return call("subagent", { action: "status", id: runId });
			}
			if (!asked.value) {
				asked.value = true;
				return call("ask_user_question", {
					questions: [{
						header: "Ship approval",
						question: "The child wants approval to ship. Approve?",
						options: [
							{ label: "Yes, ship it", description: "Approve and let the child finish." },
							{ label: "No, hold", description: "Deny." },
						],
					}],
				});
			}
			// Already asked but still pending (shouldn't happen) -> reply approved.
			const replyTo = extractReplyTo(last.text);
			return call("subagent_supervisor", { action: "reply", replyTo, message: JSON.stringify({ answer: "yes" }) });
		}

		// ask_user_question answered -> reply to the child's request.
		if (last.toolName === "ask_user_question") {
			const pending = toolResults(messages, "subagent_supervisor").find((r) => /replyTo:/.test(r.text));
			const replyTo = pending ? extractReplyTo(pending.text) : undefined;
			return call("subagent_supervisor", { action: "reply", replyTo, message: JSON.stringify({ answer: "yes" }) });
		}

		// subagent(status) -> if complete, finish; else loop back to wait.
		if (last.toolName === "subagent") {
			if (/\b(complete|done|finished)\b/i.test(last.text) || /CHILD_DONE/.test(last.text)) {
				return "ROUNDTRIP_OK";
			}
			await sleep(200);
			return call("wait", { id: runId });
		}

		return "ROUNDTRIP_UNEXPECTED";
	};
}

// ─── pi binary shim (points at supervisor-child-cli.mjs) ────────────────────────

function installChildPiShim(): () => void {
	const rootDir = mkdtempSync(path.join(os.tmpdir(), "pi-supervisor-shim-"));
	const binDir = path.join(rootDir, "bin");
	const piPackageDir = path.join(rootDir, "pi-package");
	const childCliPath = path.join(piPackageDir, "dist", "cli.mjs");
	const previousPath = process.env.PATH;
	const previousPiBinary = process.env.PI_SUBAGENT_PI_BINARY;

	mkdirSync(binDir, { recursive: true });
	mkdirSync(path.dirname(childCliPath), { recursive: true });
	writeFileSync(childCliPath, `import ${JSON.stringify(pathToFileURL(CHILD_CLI_PATH).href)};\n`);
	writeFileSync(path.join(piPackageDir, "package.json"), JSON.stringify({ name: "@earendil-works/pi-coding-agent" }));
	writeFileSync(path.join(binDir, "pi"), `#!/bin/sh\nexec "${process.execPath}" "${childCliPath}" "$@"\n`, { mode: 0o755 });
	writeFileSync(path.join(binDir, "pi.cmd"), `@echo off\r\n"${process.execPath}" "${childCliPath}" %*\r\n`);

	process.env.PATH = `${binDir}${path.delimiter}${previousPath ?? ""}`;
	process.env.PI_SUBAGENT_PI_BINARY = path.join(binDir, "pi");

	return () => {
		if (previousPath === undefined) delete process.env.PATH;
		else process.env.PATH = previousPath;
		if (previousPiBinary === undefined) delete process.env.PI_SUBAGENT_PI_BINARY;
		else process.env.PI_SUBAGENT_PI_BINARY = previousPiBinary;
		rmSync(rootDir, { recursive: true, force: true });
	};
}

// ─── env isolation ─────────────────────────────────────────────────────────────

const ISOLATED_ENV_KEYS = [
	"PI_SUBAGENT_CHILD",
	"PI_SUBAGENT_FANOUT_CHILD",
	"PI_SUBAGENT_DEPTH",
	"PI_SUBAGENT_MAX_DEPTH",
	"PI_SUBAGENT_EXTRA_AGENT_DIRS",
	"PI_SUBAGENT_PARENT_SESSION",
	"PI_SUBAGENTS_PI_CODING_AGENT_PACKAGE_ROOT",
] as const;

function snapshotEnv(): Map<string, string | undefined> {
	return new Map(ISOLATED_ENV_KEYS.map((k) => [k, process.env[k]]));
}

function restoreEnv(snapshot: Map<string, string | undefined>): void {
	for (const [k, v] of snapshot) {
		if (v === undefined) delete process.env[k];
		else process.env[k] = v;
	}
}

// ─── the runner ───────────────────────────────────────────────────────────────

function fakeModelRegistry(model: { provider: string; id: string }): ModelRegistry {
	return {
		find: (p: string, id: string) => (p === model.provider && id === model.id ? model : undefined),
		getAll: () => [model],
		getAvailable: () => [model],
		hasConfiguredAuth: () => true,
		isUsingOAuth: () => false,
		getApiKeyAndHeaders: async () => ({ ok: true as const, apiKey: "faux", headers: {} }),
		registerProvider: () => {},
		unregisterProvider: () => {},
	} as unknown as ModelRegistry;
}

function toAssistantMessage(reply: FauxReply): AssistantMessage {
	if (reply && typeof reply === "object" && "role" in reply) return reply as AssistantMessage;
	const content: FauxContentBlock[] = typeof reply === "string" ? [fauxText(reply)] : Array.isArray(reply) ? reply : [reply];
	const hasToolCall = content.some((b) => (b as { type?: string }).type === "toolCall");
	return fauxAssistantMessage(content, { stopReason: hasToolCall ? "toolUse" : "stop" });
}

const SUPERVISOR_CHILD_AGENT = `---
name: supervisor-child
description: Calls contact_supervisor to ask for approval, then completes.
tools: contact_supervisor
completionGuard: false
---
Ask the supervisor for approval to ship, then report the outcome.`;

export interface RunOptions {
	prompt?: string;
	respond?: FauxResponder;
	timeoutMs?: number;
}

export async function runSupervisorRoundtrip(options: RunOptions = {}): Promise<RealSupervisorRun> {
	const cwd = mkdtempSync(path.join(os.tmpdir(), "pi-supervisor-cwd-"));
	const home = mkdtempSync(path.join(os.tmpdir(), "pi-supervisor-home-"));
	const previousCwd = process.cwd();
	const envSnapshot = snapshotEnv();
	const uninstallShim = installChildPiShim();
	let session: AgentSession | undefined;
	let faux: ReturnType<typeof registerFauxProvider> | undefined;
	let disposed = false;

	const dispose = async () => {
		if (disposed) return;
		disposed = true;
		try { await session?.extensionRunner.emit({ type: "session_shutdown", reason: "quit" }); } catch {}
		try { session?.dispose(); } catch {}
		faux?.unregister();
		uninstallShim();
		restoreEnv(envSnapshot);
		try { process.chdir(previousCwd); } catch {}
		rmSync(cwd, { recursive: true, force: true });
		rmSync(home, { recursive: true, force: true });
	};

	try {
		process.chdir(cwd);
		process.env.HOME = home;
		process.env.USERPROFILE = home;
		process.env.PI_CODING_AGENT_DIR = home;
		for (const k of ISOLATED_ENV_KEYS) delete process.env[k];

		// Seed the project agent the parent will delegate to.
		mkdirSync(path.join(cwd, ".pi", "agents"), { recursive: true });
		writeFileSync(path.join(cwd, ".pi", "agents", "supervisor-child.md"), SUPERVISOR_CHILD_AGENT, "utf-8");

		faux = registerFauxProvider({
			provider: `faux-supervisor-parent-${Math.random().toString(36).slice(2, 8)}`,
			models: [{ id: "parent", contextWindow: 200_000 }],
		});
		const model = faux.getModel();
		const respond = options.respond ?? parentLoopResponder();
		const responseFactory: FauxResponseStep = async (context, _opts, state) =>
			toAssistantMessage(await respond(context, state));
		// Plenty of turns for launch + wait + pending + ask + reply + status + (loop) + done.
		faux.setResponses(Array.from({ length: 16 }, () => responseFactory));

		// Mocked ask_user_question: auto-answers so the headless parent can
		// complete the skill's ask-then-reply step.
		const mockAskUserQuestion = {
			name: "ask_user_question",
			label: "Ask User",
			description: "Mocked ask_user_question for the integration test; auto-answers.",
			parameters: Type.Object({
				questions: Type.Array(Type.Object({
					question: Type.String(),
					header: Type.String(),
					options: Type.Array(Type.Object({ label: Type.String(), description: Type.Optional(Type.String()) })),
				})),
			}),
			execute: async () => ({
				content: [{ type: "text" as const, text: "User selected: Yes, ship it" }],
				details: { answers: [{ header: "Ship approval", selected: "Yes, ship it" }] },
			}),
		};

		const settingsManager = SettingsManager.inMemory({
			compaction: { enabled: false },
			retry: { enabled: false },
		});
		const loader = new DefaultResourceLoader({
			cwd,
			agentDir: home,
			settingsManager,
			additionalExtensionPaths: [TASK_WORKFLOW_EXT, PI_SUBAGENTS_EXT, PI_INTERCOM_EXT],
			noSkills: true,
			noPromptTemplates: true,
			noThemes: true,
			noContextFiles: true,
			systemPrompt: "You are a test parent. Drive the create-task parent loop exactly.",
		});
		await loader.reload();

		const created = await createAgentSession({
			cwd,
			agentDir: home,
			model,
			modelRegistry: fakeModelRegistry(model),
			resourceLoader: loader,
			sessionManager: SessionManager.create(cwd, path.join(home, "sessions")),
			settingsManager,
			customTools: [mockAskUserQuestion],
			noTools: "builtin",
		});
		session = created.session;
		session.setSessionName("supervisor-roundtrip-parent");

		const events: AgentSessionEvent[] = [];
		let responseText = "";
		const unsubscribe = session.subscribe((event: AgentSessionEvent) => {
			events.push(event);
			if (event.type === "message_start") responseText = "";
			if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
				responseText += event.assistantMessageEvent.delta;
			}
		});

		await session.bindExtensions({});

		const timeoutMs = options.timeoutMs ?? 60_000;
		let timer: ReturnType<typeof setTimeout> | undefined;
		try {
			await Promise.race([
				session.prompt(options.prompt ?? "Run the supervisor round-trip: delegate, wait for the child's question, answer it, then report.", { expandPromptTemplates: false }),
				new Promise<never>((_, reject) => {
					timer = setTimeout(() => reject(new Error(`supervisor round-trip timed out after ${timeoutMs}ms`)), timeoutMs);
				}),
			]);
		} finally {
			if (timer) clearTimeout(timer);
			unsubscribe();
		}

		return {
			responseText: responseText.trim() || session.getLastAssistantText()?.trim() || "",
			parentSession: session,
			modelCalls: faux.state.callCount,
			events,
			dispose,
		};
	} catch (error) {
		await dispose();
		throw error;
	}
}

// Convenience: names of tools the parent invoked, in order.
export function toolCallNames(events: readonly AgentSessionEvent[]): string[] {
	return events
		.filter((e): e is Extract<AgentSessionEvent, { type: "tool_execution_start" }> => e.type === "tool_execution_start")
		.map((e) => e.toolName);
}

export function toolResultTexts(session: AgentSession, toolName?: string): string[] {
	return (session.messages as AnyMessage[])
		.filter((m) => m.role === "toolResult" && (toolName === undefined || m.toolName === toolName))
		.map((m) => textOf(m.content));
}
