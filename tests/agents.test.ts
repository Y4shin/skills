/**
 * Integration-level test for agents using the faux (mock) LLM provider.
 *
 * Creates an AgentSession with a custom `streamFn` that routes through the
 * faux provider, avoiding the dual-module-instance issue between the test
 * imports and the SDK's internal imports.
 *
 * Flow:
 * 1. Create a faux core with canned response sequences
 * 2. Create an AgentSession with the task-workflow tools
 * 3. Override the Agent's `streamFn` to use the faux provider's stream
 * 4. Feed the agent a task prompt
 * 5. The faux provider returns canned tool calls → tools execute → faux returns
 *    next response
 * 6. Assert the tool call sequence and final output
 */

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

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

// ─── Tests ───────────────────────────────────────────────────────────────────────

describe("agent integration with faux provider", () => {
	let tmpDir: string;
	let cleanup: () => void;

	beforeAll(async () => {
		tmpDir = mkdtempSync(join(tmpdir(), "task-workflow-agent-test-"));

		// Create a minimal project structure with auth source files
		mkdirSync(join(tmpDir, "src/auth"), { recursive: true });
		mkdirSync(join(tmpDir, "docs/tasks/oauth"), { recursive: true });

		const write = (path: string, content: string) =>
			writeFileSync(join(tmpDir, path), content, "utf-8");

		write(
			"src/auth/login.ts",
			[
				'import { sign } from "jsonwebtoken";',
				'import { cookies } from "next/headers";',
				"",
				"export async function login(email: string, password: string) {",
				'  const token = sign({ email }, process.env.JWT_SECRET!, { expiresIn: "15m" });',
				'  cookies().set("session", token, { httpOnly: true, secure: true });',
				"  return { success: true };",
				"}",
				"",
				"export async function logout() {",
				'  cookies().delete("session");',
				"}",
			].join("\n"),
		);

		write(
			"src/auth/session.ts",
			[
				'import { verify } from "jsonwebtoken";',
				'import { cookies } from "next/headers";',
				"",
				"export function getSession(): { email: string } | null {",
				'  const token = cookies().get("session")?.value;',
				"  if (!token) return null;",
				"  try {",
				"    return verify(token, process.env.JWT_SECRET!) as { email: string };",
				"  } catch {",
				"    return null;",
				"  }",
				"}",
			].join("\n"),
		);

		write(
			"package.json",
			JSON.stringify({ name: "test-project", version: "1.0.0" }),
		);
		write(
			"docs/tasks/oauth/task.md",
			[
				"---",
				"kind: task",
				"title: Add Google OAuth Login",
				"slug: oauth",
				"status: draft",
				"slices: []",
				"---",
				"",
				"# Add Google OAuth Login",
				"",
				"Users should be able to log in with their Google account.",
				"The existing auth uses JWT tokens stored in httpOnly cookies.",
			].join("\n"),
		);

		cleanup = () => {
			try {
				const fs = require("node:fs") as typeof import("node:fs");
				fs.rmSync(tmpDir, { recursive: true, force: true });
			} catch {
				// best-effort
			}
		};
	});

	afterAll(() => {
		cleanup?.();
	});

	test("faux provider drives agent through tool calls to final output", async () => {
		// ── 1. Create the faux core with a test model ──────────────────────
		// createFauxCore gives us the raw stream function and state tracking
		// without going through the global API registry (avoiding the dual-module
		// problem).
		const faux = createFauxCore({
			models: [{ id: "test-model", contextWindow: 128_000 }],
		});

		const fauxModel = faux.getModel("test-model")!;

		// ── 2. Set up the canned response sequence ────────────────────────
		// Each entry is one LLM call:
		//   Call 1: read auth/login.ts
		//   Call 2: read auth/session.ts
		//   Call 3: output final summary (no tool calls → agent stops)
		faux.setResponses([
			fauxAssistantMessage([
				fauxToolCall("read", { path: "src/auth/login.ts" }),
			]),
			fauxAssistantMessage([
				fauxToolCall("read", { path: "src/auth/session.ts" }),
			]),
			fauxAssistantMessage(
				[
					"## Interview summary",
					"",
					"**Context:** Adding Google OAuth to existing JWT auth",
					"",
					"**Decision tree walked:**",
					"- Existing auth: JWT tokens in httpOnly cookies (login.ts)",
					"- Session verification: JWT verify with catch (session.ts)",
					"- OAuth provider: Google",
					"",
					"**Confirmed decisions:**",
					"- Use Passport.js Google Strategy for OAuth flow",
					"- Store Google profile info alongside JWT token",
					"",
					"**Recommendations for next step:**",
					"- Implement OAuth routes in src/auth/oauth.ts",
					"- Add Google OAuth credentials to .env",
				].join("\n"),
			),
		]);

		// ── 3. Create in-memory auth + model registry ────────────────────
		const auth = AuthStorage.inMemory();
		auth.setRuntimeApiKey("faux", "test-key");
		const modelRegistry = ModelRegistry.inMemory(auth);

		// ── 4. Create an in-memory AgentSession ──────────────────────────
		const { session } = await createAgentSession({
			cwd: tmpDir,
			model: fauxModel,
			modelRegistry,
			authStorage: auth,
			sessionManager: SessionManager.inMemory(),
			tools: ["read", "bash", "write"],
		});

		// ── 5. Override the Agent's streamFn to use the faux provider ────
		// The SDK's default streamFn uses the global API registry, which has a
		// separate module instance from our test imports. By overriding it here,
		// we bypass the registry entirely and route directly to the faux core.
		//
		// The streamFn signature is:
		//   (model, context, options) => AssistantMessageEventStream
		//
		// We use the faux core's stream function, which returns an async iterable
		// of stream events. The Agent expects this to be compatible with
		// streamSimple's return type.
		session.agent.streamFn = async (model: any, context: any, options: any) => {
			// Use the faux provider's stream function directly
			// The faux core's stream is an async generator that yields events
			// compatible with AssistantMessageEventStream
			return faux.streamSimple(model, context, options);
		};

		// ── 6. Track tool calls via the Agent's events ───────────────────
		const toolCalls: Array<{ name: string }> = [];
		session.agent.subscribe((event, _signal) => {
			if (event.type === "tool_execution_start") {
				toolCalls.push({ name: event.toolName });
			}
		});

		// ── 7. Send the prompt ───────────────────────────────────────────
		await session.prompt(
			"Analyze the auth code in this project. " +
				"What patterns exist for authentication? " +
				"Walk the decision tree for adding Google OAuth. " +
				"Output a structured summary.",
			{ expandPromptTemplates: false },
		);

		// ── 8. Assert the faux provider was used correctly ───────────────
		expect(faux.state.callCount).toBe(3);
		expect(faux.getPendingResponseCount()).toBe(0);

		// ── 9. Assert tool call sequence ─────────────────────────────────
		expect(toolCalls.length).toBe(2);
		expect(toolCalls[0].name).toBe("read");
		expect(toolCalls[1].name).toBe("read");

		// ── 10. Assert session stats ─────────────────────────────────────
		const stats = session.getSessionStats();
		expect(stats.assistantMessages).toBeGreaterThanOrEqual(1);
		expect(stats.toolCalls).toBe(2);

		// ── 11. Assert the final output ──────────────────────────────────
		const messages = session.agent.state.messages;
		const lastAssistant = [...messages]
			.reverse()
			.find((m): m is any => m.role === "assistant");
		expect(lastAssistant).toBeDefined();

		const content = lastAssistant!.content;
		const textContent = Array.isArray(content)
			? content.map((c: any) => c.text ?? "").join("")
			: String(content ?? "");
		expect(textContent).toContain("Interview summary");
		expect(textContent).toContain("Google OAuth");
		expect(textContent).toContain("Passport.js");
	}, 30_000);
});
