/**
 * Integration-test harness for the task-workflow package.
 *
 * Spins up a *real* `AgentSession` (via the public `createAgentSession` SDK)
 * backed by the `faux` LLM provider — no network, no API keys. The faux
 * provider pulls canned `AssistantMessage`s off a queue, so a test authors an
 * entire conversation as a list of request/response steps and then asserts on
 * which tools the agent invoked, what those tools did to disk, and how the
 * package's extensions behaved — all inside a genuine pi runtime.
 *
 * The pattern mirrors `@earendil-works/pi-subagents`' `real-session-runner.ts`
 * and pi's own `test/suite/harness.ts`, but uses only the published SDK plus
 * the `faux` test-double shipped with `@earendil-works/pi-ai`.
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// `@earendil-works/pi-ai` is a transitive dep of pi-coding-agent and is NOT
// hoisted to the top of this repo's node_modules, so the bare specifier does
// not resolve under vitest. We import from the exact copy pi-coding-agent
// uses: this is *essential*, because `registerFauxProvider` registers the
// stream handler in a module-level registry, and the `AgentSession` reads that
// same registry at dispatch time. Two different copies would not see each
// other's registrations.
import {
	type AssistantMessage,
	type Context,
	type FauxContentBlock,
	type FauxResponseStep,
	fauxAssistantMessage,
	fauxText,
	fauxToolCall,
	registerFauxProvider,
} from "../../node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-ai/dist/compat.js";
// Re-export so tests can annotate responders without reaching into node_modules themselves.
export type { AssistantMessage, Context, FauxContentBlock };
import {
	type AgentSession,
	type AgentSessionEvent,
	createAgentSession,
	type ExtensionFactory,
	type ExtensionUIContext,
	DefaultResourceLoader,
	type Model,
	type ModelRegistry,
	SessionManager,
	SettingsManager,
} from "@earendil-works/pi-coding-agent";

// ─── canned-LLM response helpers ─────────────────────────────────────────────

/** Anything an extension factory, a raw block, or plain text can be coerced into a reply. */
export type FauxReply = string | FauxContentBlock | FauxContentBlock[] | AssistantMessage;

/** Anything a canned model turn can be: a responder, raw blocks, or plain text. */
export type FauxStep = FauxResponder | FauxReply;

/**
 * A responder is called with the full LLM-facing context on each model call.
 * Inspect `context.messages` / `context.systemPrompt` / `context.tools` to make
 * the canned reply depend on what the agent has done so far (e.g. echo a tool
 * result back), exactly like a real model would.
 */
export type FauxResponder = (context: Context, state: { callCount: number }) => FauxReply | Promise<FauxReply>;

/** Build an `AssistantMessage` from text / blocks, auto-setting stopReason from content. */
export function reply(content: FauxReply): AssistantMessage {
	if (typeof content === "object" && content !== null && "role" in content) return content;
	const blocks: FauxContentBlock[] =
		typeof content === "string" ? [fauxText(content)] : Array.isArray(content) ? content : [content];
	const hasToolCall = blocks.some((b) => (b as { type?: string }).type === "toolCall");
	return fauxAssistantMessage(blocks, { stopReason: hasToolCall ? "toolUse" : "stop" });
}

/**
 * Turn a step (value or responder) into the queue shape the faux provider
 * expects. A plain `AssistantMessage` is a valid `FauxResponseStep` on its own,
 * so it passes through; a responder is wrapped so its reply can depend on the
 * live context.
 */
function toStep(step: FauxStep): FauxResponseStep {
	if (typeof step === "function") {
		const fn = step as FauxResponder;
		return async (context, _options, state) => reply(await fn(context, state));
	}
	return reply(step);
}

/** A faux tool-call block. */
export const call = (name: string, args: Record<string, unknown> = {}, id?: string) =>
	fauxToolCall(name, args, id ? { id } : undefined);

// ─── a recording, no-op UI context (to observe extension notifications) ────────

export interface NotifyRecord {
	message: string;
	type?: string;
}

export interface RecordingUi {
	ui: ExtensionUIContext;
	notifies: NotifyRecord[];
	statuses: Array<{ key: string; text: string | undefined }>;
}

/**
 * A minimal `ExtensionUIContext` that records `notify` / `setStatus` calls and
 * no-ops everything else. Enough to observe extension side effects (e.g. the
 * check-subagents startup warning) without a real TUI. Returned via a Proxy so
 * every unimplemented method is a harmless no-op.
 */
export function createRecordingUi(): RecordingUi {
	const notifies: NotifyRecord[] = [];
	const statuses: Array<{ key: string; text: string | undefined }> = [];
	const ui = new Proxy(
		{},
		{
			get(_t, prop) {
				if (prop === "notify")
					return (message: string, type?: string) => {
						notifies.push({ message, type });
					};
				if (prop === "setStatus")
					return (key: string, text?: string) => {
						statuses.push({ key, text });
					};
				if (prop === "theme") return {};
				return () => {};
			},
		},
	) as unknown as ExtensionUIContext;
	return { ui, notifies, statuses };
}

// ─── the harness ──────────────────────────────────────────────────────────────

export interface TaskSessionOptions {
	/** Extensions to load (default: the task-workflow tool extension). */
	extensions?: ExtensionFactory[];
	/** System prompt sent to the model. Default: a short test prompt. */
	systemPrompt?: string;
	/** Extra inline custom tools (e.g. a fake `subagent` tool). */
	customTools?: Parameters<typeof createAgentSession>[0] extends infer O
		? O extends { customTools?: infer C }
			? C
			: never
		: never;
	/** Disable built-in tools (read/bash/edit/write); keeps extension+custom tools. Default: true. */
	noBuiltinTools?: boolean;
	/** Project files to seed under the session cwd, relative path -> content. */
	projectFiles?: Record<string, string>;
}

export interface TaskSession {
	session: AgentSession;
	cwd: string;
	faux: ReturnType<typeof registerFauxProvider>;
	model: Model<string>;
	events: AgentSessionEvent[];
	/** Convenience: recorded notifications if a recording UI was installed. */
	notifies: NotifyRecord[] | undefined;
	dispose: () => void;
	/** Queue canned responses (replaces any pending). Each entry is a fixed reply (text / blocks / AssistantMessage) or a responder called with the live context. */
	setResponses: (steps: FauxStep[]) => void;
}

export async function createTaskSession(options: TaskSessionOptions = {}): Promise<TaskSession> {
	const cwd = mkdtemp("pi-task-int-");
	for (const [relativePath, content] of Object.entries(options.projectFiles ?? {})) {
		const target = join(cwd, relativePath);
		mkdirSync(join(target, ".."), { recursive: true });
		writeFileSync(target, content, "utf-8");
	}

	const faux = registerFauxProvider({
		provider: `faux-int-${Math.random().toString(36).slice(2, 8)}`,
		models: [{ id: "task-test", contextWindow: 200_000 }],
	});
	faux.setResponses([]);
	const model = faux.getModel();

	const settingsManager = SettingsManager.inMemory({
		compaction: { enabled: false },
		retry: { enabled: false },
	});

	const recordingUi = createRecordingUi();
	const loader = new DefaultResourceLoader({
		cwd,
		agentDir: cwd,
		settingsManager,
		extensionFactories: options.extensions,
		noSkills: true,
		noPromptTemplates: true,
		noThemes: true,
		noContextFiles: true,
		systemPrompt: options.systemPrompt ?? "You are a test assistant. Use the available tools to answer.",
	});
	await loader.reload();

	const { session } = await createAgentSession({
		cwd,
		agentDir: cwd,
		model,
		modelRegistry: fakeModelRegistry(model),
		resourceLoader: loader,
		sessionManager: SessionManager.inMemory(cwd),
		settingsManager,
		customTools: options.customTools,
		noTools: options.noBuiltinTools === false ? undefined : "builtin",
	});

	const events: AgentSessionEvent[] = [];
	session.subscribe((event) => {
		events.push(event);
	});

	await session.bindExtensions({
		uiContext: recordingUi.ui,
	});

	return {
		session,
		cwd,
		faux,
		model,
		events,
		notifies: recordingUi.notifies,
		dispose: () => {
			try {
				session.dispose();
			} catch {
				/* ignore */
			}
			faux.unregister();
			rmSync(cwd, { recursive: true, force: true });
		},
		setResponses: (steps) => faux.setResponses(steps.map(toStep)),
	};
}

// A duck-typed `ModelRegistry` that always reports auth as configured for the
// faux model. Mirrors the same trick used by pi-subagents' real-session-runner.
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

// ─── filesystem fixtures ──────────────────────────────────────────────────────

/** Seed a small docs/tasks tree under cwd (login task + one open slice). */
export function seedTaskTree(cwd: string): void {
	mkdirSync(join(cwd, "docs/tasks/login/slices"), { recursive: true });
	writeFileSync(
		join(cwd, "docs/tasks/login/task.md"),
		"---\nkind: task\ntitle: Login\nslug: login\nstatus: draft\nslices: []\nepic: auth\n---\n",
	);
	mkdirSync(join(cwd, "docs/tasks/epics/auth"), { recursive: true });
	writeFileSync(
		join(cwd, "docs/tasks/epics/auth/epic.md"),
		"---\nkind: epic\ntitle: Auth epic\nslug: auth\nstatus: draft\n" +
			"tasks:\n  - slug: login\n    blocked_by: []\n    done: false\n---\n",
	);
	writeFileSync(
		join(cwd, "docs/tasks/login/slices/3-do-thing.md"),
		"---\nkind: slice\ntitle: Do thing\nslug: do-thing\ntask: ../task.md\nmode: hitl\nstatus: todo\nsize: m\nblocked_by: []\n---\n",
	);
}

// ─── message / event inspection helpers ───────────────────────────────────────

type AnyMessage = { role?: string; content?: unknown; toolName?: string; isError?: boolean };
type TextPart = { type: "text"; text: string };

function textOf(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.filter((p): p is TextPart => p && typeof p === "object" && (p as { type?: string }).type === "text")
		.map((p) => p.text)
		.join("");
}

/** Names of tools the agent invoked, in invocation order. */
export function toolCallNames(events: readonly AgentSessionEvent[]): string[] {
	return events
		.filter((e): e is Extract<AgentSessionEvent, { type: "tool_execution_start" }> => e.type === "tool_execution_start")
		.map((e) => e.toolName);
}

/** Final-assistant text of each assistant message, in order. */
export function assistantTexts(session: AgentSession): string[] {
	return session.messages
		.filter((m): m is AnyMessage => (m as AnyMessage).role === "assistant")
		.map((m) => textOf((m as AnyMessage).content));
}

/** Last assistant text, or "" if none. */
export function lastAssistantText(session: AgentSession): string {
	const texts = assistantTexts(session);
	return texts.length ? texts[texts.length - 1]! : "";
}

/** Text content of tool results, optionally filtered by tool name. */
export function toolResultTexts(session: AgentSession, toolName?: string): string[] {
	return session.messages
		.filter((m): m is AnyMessage => {
			const mm = m as AnyMessage;
			return mm.role === "toolResult" && (toolName === undefined || mm.toolName === toolName);
		})
		.map((m) => textOf((m as AnyMessage).content));
}

/** Error tool results (isError === true), optionally filtered by tool name. */
export function errorToolResults(session: AgentSession, toolName?: string): AnyMessage[] {
	return session.messages.filter((m): m is AnyMessage => {
		const mm = m as AnyMessage;
		return mm.role === "toolResult" && mm.isError === true && (toolName === undefined || mm.toolName === toolName);
	});
}

/** Extract text from the latest toolResult message of the given tool. */
export function latestToolResultText(context: Context, toolName: string): string | undefined {
	for (let i = context.messages.length - 1; i >= 0; i--) {
		const m = context.messages[i]! as AnyMessage;
		if (m.role === "toolResult" && m.toolName === toolName) return textOf(m.content);
	}
	return undefined;
}

// ─── misc ─────────────────────────────────────────────────────────────────────

function mkdtemp(prefix: string): string {
	const dir = join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
	mkdirSync(dir, { recursive: true });
	return dir;
}
