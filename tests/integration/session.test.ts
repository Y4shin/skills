/**
 * Integration tests for the task-workflow package.
 *
 * These drive a *real* pi `AgentSession` whose LLM is the `faux` test-double.
 * Each test authors a conversation as a list of canned model responses and
 * then asserts on which tools the agent invoked, what those tools did to the
 * `docs/tasks/` tree on disk, and how the package's extensions behaved — with
 * no network and no API keys.
 *
 * See `./harness.ts` for the session-creation machinery.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";

import taskWorkflow from "../../src/pi/index";
import guidelines from "../../src/pi/guidelines";
import checkSubagents from "../../src/pi/check-subagents";
import { Type } from "typebox";
import {
	assistantTexts,
	type Context,
	createTaskSession,
	latestToolResultText,
	type TaskSession,
	toolCallNames,
	toolResultTexts,
	lastAssistantText,
	reply,
	call,
	seedTaskTree,
} from "./harness";

const ALL_EXTENSIONS = [taskWorkflow, guidelines, checkSubagents];

const sessions: TaskSession[] = [];
afterEach(() => {
	while (sessions.length) sessions.pop()?.dispose();
});

async function session(extra?: Parameters<typeof createTaskSession>[0]): Promise<TaskSession> {
	const s = await createTaskSession({ extensions: ALL_EXTENSIONS, ...extra });
	sessions.push(s);
	seedTaskTree(s.cwd);
	return s;
}

// ─── 1. tool dispatch + real filesystem round-trip ────────────────────────────

describe("faux LLM ↔ task_* tools ↔ real filesystem", () => {
	test("LLM calls task_list, sees the on-disk tree, and relays it", async () => {
		const s = await session();
		s.setResponses([
			// Turn 1: the "model" decides to call task_list.
			reply([call("task_list", {})]),
			// Turn 2: the model echoes the tool result back as its answer.
			(context: Context) => reply(`Tasks: ${latestToolResultText(context, "task_list") ?? "(none)"}`),
		]);

		await s.session.prompt("List the tasks in this project.");

		expect(toolCallNames(s.events)).toContain("task_list");
		expect(toolResultTexts(s.session, "task_list")[0]).toContain("login");
		expect(lastAssistantText(s.session)).toContain("login");
	});

	test("task_show returns frontmatter for the resolved slug", async () => {
		const s = await session();
		s.setResponses([
			reply([call("task_show", { selector: "login" })]),
			(context: Context) =>
				reply(`kind is ${/kind: (\w+)/.exec(latestToolResultText(context, "task_show") ?? "")?.[1] ?? "?"}`),
		]);

		await s.session.prompt("Show the login task.");

		expect(toolResultTexts(s.session, "task_show")[0]).toContain("kind: task");
		expect(lastAssistantText(s.session)).toContain("kind is task");
	});

	test("task_assert_kind rejects a mismatch as a tool error the model sees", async () => {
		const s = await session();
		s.setResponses([
			reply([call("task_assert_kind", { selector: "login", kind: "epic" })]),
			(context: Context) => {
				const result = latestToolResultText(context, "task_assert_kind") ?? "";
				return reply(result.includes("not") ? "mismatch as expected" : "unexpected success");
			},
		]);

		await s.session.prompt("Assert login is an epic.");

		const results = toolResultTexts(s.session, "task_assert_kind");
		expect(results.some((t) => /not/.test(t))).toBe(true);
		expect(lastAssistantText(s.session)).toContain("mismatch as expected");
	});
});

// ─── 2. mutation persists across turns (whole conversation) ──────────────────

describe("multi-turn conversation drives state changes", () => {
	test("task_set mutates frontmatter on disk, readable by a later task_get", async () => {
		const s = await session();
		s.setResponses([
			reply([call("task_set", { selector: "login", field: "status", value: "in-progress" })]),
			reply([call("task_get", { selector: "login", field: "status" })]),
			(context: Context) => reply(`status now: ${latestToolResultText(context, "task_get") ?? "?"}`),
		]);

		await s.session.prompt("Set login to in-progress, then read it back.");

		expect(toolCallNames(s.events)).toEqual(["task_set", "task_get"]);
		// The second model turn read what the first wrote.
		expect(lastAssistantText(s.session)).toContain("status now: in-progress");
		// And the mutation is actually persisted to disk.
		const onDisk = readFileSync(join(s.cwd, "docs/tasks/login/task.md"), "utf-8");
		expect(onDisk).toContain("status: in-progress");
	});

	test("task_epic_tick marks a child done and task_epic_finalizable reflects it", async () => {
		const s = await session();
		s.setResponses([
			reply([call("task_epic_tick", { selector: "auth", task_slug: "login" })]),
			reply([call("task_epic_finalizable", { selector: "auth" })]),
			(context: Context) => reply(latestToolResultText(context, "task_epic_finalizable") ?? "?"),
		]);

		await s.session.prompt("Tick login done, then check if the epic is finalizable.");

		expect(toolResultTexts(s.session, "task_epic_tick")[0]).toContain("done");
		// With login done, the epic has no unfinished children.
		expect(lastAssistantText(s.session)).toMatch(/ready to finalize/);
	});

	test("task_finalizable blocks while a slice is open", async () => {
		const s = await session();
		s.setResponses([
			reply([call("task_finalizable", { selector: "login" })]),
			(context: Context) => reply(latestToolResultText(context, "task_finalizable") ?? "?"),
		]);

		await s.session.prompt("Can we finalize login?");

		// do-thing slice is still open → tool errors.
		expect(toolResultTexts(s.session, "task_finalizable")[0]).toMatch(/open slice/);
	});
});

// ─── 3. extension behavior ────────────────────────────────────────────────────

describe("extensions behave inside a real session", () => {
	test("guidelines injects a snippet into the system prompt and exposes list_guidelines", async () => {
		const s = await session({
			projectFiles: {
				"docs/typescript-guidelines.md": "---\ndescription: TS conventions\n---\nUse const.\n",
			},
		});

		let providerSystemPrompt = "";
		s.setResponses([
			reply([call("list_guidelines", {})]),
			(context: Context) => {
				providerSystemPrompt = context.systemPrompt ?? "";
				return reply(latestToolResultText(context, "list_guidelines") ?? "(none)");
			},
		]);

		await s.session.prompt("What guidelines are available?");

		// The faux provider saw the guidelines extension's injected snippet.
		expect(providerSystemPrompt).toContain("Project coding guidelines");
		// And list_guidelines discovered the seeded file.
		expect(toolResultTexts(s.session, "list_guidelines")[0]).toContain("typescript-guidelines");
	});

	test("check-subagents warns on startup when the subagent tool is absent", async () => {
		const s = await session();
		// No prompt needed: the warning fires during session_start (in bindExtensions).
		s.setResponses([reply("ok")]);

		const subagentWarning = s.notifies?.find((n) => /pi-subagents is not installed/.test(n.message));
		expect(subagentWarning).toBeDefined();
	});

	test("check-subagents stays quiet when a subagent tool is present", async () => {
		// Register a fake `subagent` tool so getAllTools() reports it.
		const fakeSubagent = {
			name: "subagent",
			label: "Subagent",
			description: "Fake subagent tool for the test.",
			parameters: Type.Object({}),
			execute: async () => ({ content: [{ type: "text" as const, text: "ok" }], details: {} }),
		};
		const s = await session({ customTools: [fakeSubagent] });
		s.setResponses([reply("ok")]);

		const subagentWarning = s.notifies?.find((n) => /pi-subagents is not installed/.test(n.message));
		expect(subagentWarning).toBeUndefined();
	});
});

// ─── Ideas to port (sketched, not yet implemented) ───────────────────────────────
// Origin's tests/agents.test.ts (deleted on origin, import-fixed here) tested
// pi's built-in tools rather than this package, but it sketched several agent-
// mechanic cases this suite doesn't yet cover. Fold these in later using the
// harness helpers (reply / call / toolCallNames / errorToolResults):
//
// 1. Error recovery — a tool fails and the agent continues:
//      s.setResponses([
//        reply([call("read", { path: "nonexistent.txt" })]),   // read fails → ENOENT
//        reply([call("bash", { command: "echo recovered" })]),
//        reply("recovered"),
//      ]);
//    Assert the failing toolResult carries isError + ENOENT text (use
//    errorToolResults(s.session, "read")) and that a later turn still ran.
//
// 2. Empty LLM response — the agent must handle an empty assistant turn:
//      s.setResponses([reply([])]);   // fauxAssistantMessage([]) → stopReason "stop"
//    Assert faux.state.callCount === 1 and session.prompt() didn't throw.
//
// 3. Multiple tool calls in one assistant turn (parallel execution):
//      s.setResponses([
//        reply([call("bash", { command: "echo a" }), call("bash", { command: "echo b" })]),
//        reply("done"),
//      ]);
//    Assert toolCallNames(s.events) contains two "bash" entries from one call.
//
// 4. Leaner auth wiring — origin used the real AuthStorage.inMemory +
//    ModelRegistry.inMemory rather than a duck-typed registry. That's cleaner
//    than harness.fakeModelRegistry() if it survives the faux stream dispatch;
//    verify, then swap fakeModelRegistry for the real pair.
//
// 5. Lightweight completion checks — faux.state.callCount and
//    getPendingResponseCount() are cheap "the loop ran N times / drained the
//    queue" assertions; pair them with the content assertions used above.

