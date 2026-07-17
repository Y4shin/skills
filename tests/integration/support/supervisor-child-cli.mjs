#!/usr/bin/env node
/**
 * Child `pi` subprocess for the supervisor round-trip integration test.
 *
 * Adapted from pi-subagents' `test/support/real-session-child-cli.mjs`. The
 * parent's `subagent` executor spawns this as the `pi` binary (via a PATH
 * shim). The executor passes `--extension <subagent-prompt-runtime.ts>` so
 * `contact_supervisor` is registered (gated on the supervisor-channel env the
 * executor also sets).
 *
 * The faux model calls `contact_supervisor({ reason: "interview_request", ... })`,
 * which writes a request file and BLOCKS polling for the parent's reply. Once
 * the parent replies (see the parent responder), the call returns and the
 * child emits a `CHILD_DONE` marker, which flows back to the parent as the
 * subagent tool result.
 *
 * No real API keys, no network.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
	fauxAssistantMessage,
	fauxText,
	fauxToolCall,
	registerFauxProvider,
} from "../../../node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-ai/dist/compat.js";
import {
	createAgentSession,
	DefaultResourceLoader,
	SessionManager,
	SettingsManager,
} from "@earendil-works/pi-coding-agent";

function readText(filePath) {
	return fs.readFileSync(filePath, "utf-8");
}

function parseArgs(argv) {
	const parsed = { extensions: [], appendSystemPrompts: [], noSession: false, noSkills: false };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--mode") { parsed.mode = argv[++i] ?? "text"; continue; }
		if (arg === "-p" || arg === "--print") continue;
		if (arg === "--no-session") { parsed.noSession = true; continue; }
		if (arg === "--session") { parsed.sessionFile = argv[++i]; continue; }
		if (arg === "--session-dir") { parsed.sessionDir = argv[++i]; continue; }
		if (arg === "--model") { parsed.model = argv[++i]; continue; }
		if (arg === "--tools") { parsed.tools = (argv[++i] ?? "").split(",").map((t) => t.trim()).filter(Boolean); continue; }
		if (arg === "--extension") { const p = argv[++i]; if (p) parsed.extensions.push(p); continue; }
		if (arg === "--no-extensions") continue;
		if (arg === "--no-skills") { parsed.noSkills = true; continue; }
		if (arg === "--system-prompt") { const p = argv[++i]; if (p) parsed.systemPrompt = readText(p); continue; }
		if (arg === "--append-system-prompt") { const p = argv[++i]; if (p) parsed.appendSystemPrompts.push(readText(p)); continue; }
		if (arg?.startsWith("--")) continue;
		parsed.prompt = arg;
	}
	if (parsed.prompt?.startsWith("@")) parsed.prompt = readText(parsed.prompt.slice(1));
	return parsed;
}

function createModelRegistry(model) {
	return {
		find: (provider, id) => provider === model.provider && id === model.id ? model : undefined,
		getAll: () => [model],
		getAvailable: () => [model],
		hasConfiguredAuth: () => true,
		isUsingOAuth: () => false,
		getApiKeyAndHeaders: async () => ({ ok: true, apiKey: "faux", headers: {} }),
		registerProvider: () => {},
		unregisterProvider: () => {},
	};
}

function createSessionManager(parsed, cwd) {
	if (parsed.sessionFile) {
		const sessionDir = parsed.sessionDir ?? path.dirname(parsed.sessionFile);
		const manager = SessionManager.create(cwd, sessionDir);
		manager.setSessionFile(parsed.sessionFile);
		return manager;
	}
	if (parsed.noSession) return SessionManager.inMemory(cwd);
	return SessionManager.create(cwd, parsed.sessionDir);
}

async function main() {
	const parsed = parseArgs(process.argv.slice(2));
	const cwd = process.cwd();
	const ownedAgentDir = process.env.PI_CODING_AGENT_DIR ? undefined : mkdtemp(path.join(os.tmpdir(), "pi-supervisor-child-agent-"));
	const agentDir = process.env.PI_CODING_AGENT_DIR ?? ownedAgentDir;

	const faux = registerFauxProvider({
		provider: "faux-supervisor-child",
		models: [{ id: "child", contextWindow: 200_000 }],
	});
	const model = faux.getModel();
	let session;
	// Turn 1: ask the supervisor for approval (blocks until the parent replies).
	// Turn 2: report the outcome so it flows back as the subagent tool result.
	faux.setResponses([
		() => fauxAssistantMessage(
			[fauxToolCall("contact_supervisor", {
				reason: "interview_request",
				message: "Need approval to ship the feature before I finish.",
				interview: {
					title: "Ship approval",
					questions: [{
						id: "ship",
						type: "single",
						question: "Ship the feature?",
						options: [{ id: "yes", label: "Yes, ship it" }, { id: "no", label: "No, hold" }],
					}],
				},
			})],
			{ stopReason: "toolUse" },
		),
		() => fauxAssistantMessage(
			[fauxText("CHILD_DONE: shipped after supervisor approval")],
			{ stopReason: "stop" },
		),
	]);

	const settingsManager = SettingsManager.inMemory({
		compaction: { enabled: false },
		retry: { enabled: false },
	});
	const loader = new DefaultResourceLoader({
		cwd,
		agentDir,
		settingsManager,
		additionalExtensionPaths: parsed.extensions,
		noSkills: parsed.noSkills,
		noPromptTemplates: true,
		noThemes: true,
		noContextFiles: true,
		systemPrompt: parsed.systemPrompt,
		appendSystemPrompt: parsed.appendSystemPrompts,
	});

	try {
		await loader.reload();
		const created = await createAgentSession({
			cwd,
			agentDir,
			model,
			modelRegistry: createModelRegistry(model),
			resourceLoader: loader,
			sessionManager: createSessionManager(parsed, cwd),
			settingsManager,
			tools: parsed.tools,
		});
		session = created.session;

		session.subscribe((event) => {
			if (
				event.type === "message_end"
				|| event.type === "tool_execution_start"
				|| event.type === "tool_execution_end"
				|| event.type === "tool_result_end"
			) {
				process.stdout.write(`${JSON.stringify(event)}\n`);
			}
		});

		await session.bindExtensions({});
		await session.prompt(parsed.prompt ?? "", { expandPromptTemplates: false });
		await session.extensionRunner.emit({ type: "session_shutdown", reason: "quit" });
		session.dispose();
	} finally {
		faux.unregister();
		if (ownedAgentDir) fs.rmSync(ownedAgentDir, { recursive: true, force: true });
	}
}

function mkdtemp(prefix) {
	return fs.mkdtempSync(prefix);
}

main().catch((error) => {
	process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
	process.exit(1);
});
