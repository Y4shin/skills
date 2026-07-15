/**
 * Integration-level tests for agents using the faux (mock) LLM provider.
 */
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import type { AgentSession } from "@earendil-works/pi-coding-agent";
import {
	AuthStorage,
	createAgentSession,
	ModelRegistry,
	SessionManager,
} from "@earendil-works/pi-coding-agent";
import {
	createFauxCore,
	fauxAssistantMessage,
	fauxToolCall,
} from "@earendil-works/pi-ai";

// ─── Session factory ─────────────────────────────────────────────────────────────

async function createSession(
	faux: ReturnType<typeof createFauxCore>,
	cwd: string,
	tools: string[],
): Promise<AgentSession> {
	const fauxModel = faux.getModel()!;

	const auth = AuthStorage.inMemory();
	auth.setRuntimeApiKey("faux", "test-key");
	const modelRegistry = ModelRegistry.inMemory(auth);

	const { session } = await createAgentSession({
		cwd,
		model: fauxModel,
		modelRegistry,
		authStorage: auth,
		sessionManager: SessionManager.inMemory(),
		tools,
	});

	session.agent.streamFn = async (model: any, context: any, options: any) => {
		return faux.streamSimple(model, context, options);
	};

	return session;
}

// ─── Tests ───────────────────────────────────────────────────────────────────────

describe("agent integration with faux provider", () => {
	test("read tool produces correct output", async () => {
		const faux = createFauxCore({
			models: [{ id: "test-model", contextWindow: 128_000 }],
		});
		const cwd = mkdtempSync(join(tmpdir(), "task-workflow-agent-test-"));
		writeFileSync(join(cwd, "data.txt"), "hello world\n", "utf-8");

		faux.setResponses([
			fauxAssistantMessage([fauxToolCall("read", { path: "data.txt" })]),
			fauxAssistantMessage("## Result\n\n**Content:** hello world"),
		]);

		const session = await createSession(faux, cwd, ["read"]);
		await session.prompt("read data.txt", { expandPromptTemplates: false });

		expect(faux.state.callCount).toBe(2);
		expect(faux.getPendingResponseCount()).toBe(0);
	});

	test("bash tool executes commands", async () => {
		const faux = createFauxCore({
			models: [{ id: "test-model", contextWindow: 128_000 }],
		});
		const cwd = mkdtempSync(join(tmpdir(), "task-workflow-agent-test-"));
		writeFileSync(join(cwd, "hello.txt"), "world", "utf-8");

		faux.setResponses([
			fauxAssistantMessage([
				fauxToolCall("bash", { command: "cat hello.txt" }),
			]),
			fauxAssistantMessage("## Result\n\n**Output:** world"),
		]);

		const session = await createSession(faux, cwd, ["bash"]);
		await session.prompt("cat hello.txt", { expandPromptTemplates: false });

		expect(faux.state.callCount).toBe(2);
	});

	test("multi-turn: read then bash then summary", async () => {
		const faux = createFauxCore({
			models: [{ id: "test-model", contextWindow: 128_000 }],
		});
		const cwd = mkdtempSync(join(tmpdir(), "task-workflow-agent-test-"));
		mkdirSync(join(cwd, "src"), { recursive: true });
		writeFileSync(join(cwd, "src", "main.ts"), "export const V = '1.0';\n");

		faux.setResponses([
			fauxAssistantMessage([fauxToolCall("read", { path: "src/main.ts" })]),
			fauxAssistantMessage([
				fauxToolCall("bash", { command: "grep V src/main.ts" }),
			]),
			fauxAssistantMessage("## Summary\n\n**Version:** 1.0"),
		]);

		const session = await createSession(faux, cwd, ["read", "bash"]);
		await session.prompt("Find the version", {
			expandPromptTemplates: false,
		});

		expect(faux.state.callCount).toBe(3);
		expect(faux.getPendingResponseCount()).toBe(0);
	});

	test("write tool creates files", async () => {
		const faux = createFauxCore({
			models: [{ id: "test-model", contextWindow: 128_000 }],
		});
		const cwd = mkdtempSync(join(tmpdir(), "task-workflow-agent-test-"));

		faux.setResponses([
			fauxAssistantMessage([
				fauxToolCall("write", { path: "output.txt", content: "hello" }),
			]),
			fauxAssistantMessage("## Done\n\nFile written."),
		]);

		const session = await createSession(faux, cwd, ["write"]);
		await session.prompt('write "hello" to output.txt', {
			expandPromptTemplates: false,
		});

		expect(faux.state.callCount).toBe(2);
		const content = readFileSync(join(cwd, "output.txt"), "utf-8");
		expect(content).toBe("hello");
	});

	test("error recovery: tool fails, agent continues", async () => {
		const faux = createFauxCore({
			models: [{ id: "test-model", contextWindow: 128_000 }],
		});
		const cwd = mkdtempSync(join(tmpdir(), "task-workflow-agent-test-"));

		faux.setResponses([
			fauxAssistantMessage([fauxToolCall("read", { path: "nonexistent.txt" })]),
			fauxAssistantMessage([
				fauxToolCall("bash", { command: "echo 'recovered'" }),
			]),
			fauxAssistantMessage("## Result\n\nrecovered"),
		]);

		const session = await createSession(faux, cwd, ["read", "bash"]);
		await session.prompt("read missing file then echo", {
			expandPromptTemplates: false,
		});

		expect(faux.state.callCount).toBe(3);
		// Verify the error was received by the agent — tool results
		// contain error details when the tool fails. The failed read produces
		// a toolResult message with ENOENT in its text content. The agent
		// then recovers with a successful bash command.
		const messages = session.agent.state.messages;
		const errorTexts = messages
			.filter((m: any) => m.role === "toolResult" || m.role === "tool_result")
			.flatMap((m: any) =>
				Array.isArray(m.content)
					? m.content.map((c: any) => c.text ?? "")
					: [String(m.content ?? "")],
			)
			.filter((t: string) => t.includes("ENOENT") || t.includes("error"));
		// The tool error should be in the conversation
		expect(errorTexts.length).toBeGreaterThanOrEqual(1);
	});

	test("empty LLM response", async () => {
		const faux = createFauxCore({
			models: [{ id: "test-model", contextWindow: 128_000 }],
		});
		const cwd = mkdtempSync(join(tmpdir(), "task-workflow-agent-test-"));

		faux.setResponses([fauxAssistantMessage([])]);

		const session = await createSession(faux, cwd, ["read"]);
		await session.prompt("do nothing", { expandPromptTemplates: false });

		expect(faux.state.callCount).toBe(1);
		expect(faux.getPendingResponseCount()).toBe(0);
	});

	test("multiple tool calls in one LLM response", async () => {
		const faux = createFauxCore({
			models: [{ id: "test-model", contextWindow: 128_000 }],
		});
		const cwd = mkdtempSync(join(tmpdir(), "task-workflow-agent-test-"));

		faux.setResponses([
			fauxAssistantMessage([
				fauxToolCall("bash", { command: "echo 'a'" }),
				fauxToolCall("bash", { command: "echo 'b'" }),
			]),
			fauxAssistantMessage("## Done\n\na\nb"),
		]);

		const toolCalls: Array<{ name: string }> = [];
		const session = await createSession(faux, cwd, ["bash"]);
		session.agent.subscribe((event, _signal) => {
			if (event.type === "tool_execution_start") {
				toolCalls.push({ name: event.toolName });
			}
		});

		await session.prompt("run echo a and echo b", {
			expandPromptTemplates: false,
		});

		expect(faux.state.callCount).toBe(2);
		expect(toolCalls.length).toBe(2);
		expect(toolCalls[0].name).toBe("bash");
		expect(toolCalls[1].name).toBe("bash");
	});
}, 30_000);
