/**
 * Integration tests for task-workflow v2 — simplified harness.
 *
 * These tests verify the extension tools work inside a real pi AgentSession
 * backed by the faux LLM provider. They exercise the full round-trip:
 * session → agent → tool execution → filesystem → tool result → session.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";

import taskWorkflow from "../../src/pi.js";
import {
  createTaskSession,
  seedTaskTree,
  toolCallNames,
  toolResultTexts,
  lastAssistantText,
  reply,
  call,
  type TaskSession,
  type Context,
  latestToolResultText,
} from "./harness.js";
import { Type } from "typebox";

const ALL_EXTENSIONS = [taskWorkflow];

const sessions: TaskSession[] = [];
afterEach(() => { while (sessions.length) sessions.pop()?.dispose(); });

async function session(extra?: Parameters<typeof createTaskSession>[0]): Promise<TaskSession> {
  // Register a subagent tool so the check-subagents warning doesn't fire
  const fakeSubagent = {
    name: "subagent",
    label: "Subagent",
    description: "Fake subagent tool for testing.",
    parameters: Type.Object({}),
    execute: async () => ({ content: [{ type: "text" as const, text: "ok" }], details: {} }),
  };
  const s = await createTaskSession({
    extensions: ALL_EXTENSIONS,
    customTools: [fakeSubagent],
    ...extra,
  });
  sessions.push(s);
  seedTaskTree(s.cwd);
  return s;
}

// ─── 1. Tool dispatch + filesystem round-trip ────────────────────────────────

describe("tool dispatch and filesystem round-trip", () => {
  test("task_list sees the on-disk tree", async () => {
    const s = await session();
    s.setResponses([
      reply([call("task_list", {})]),
      (ctx: Context) => reply(`Tasks: ${latestToolResultText(ctx, "task_list") ?? "(none)"}`),
    ]);
    await s.session.prompt("List tasks.");
    expect(toolCallNames(s.events)).toContain("task_list");
    expect(toolResultTexts(s.session, "task_list")[0]).toContain("login");
    expect(lastAssistantText(s.session)).toContain("login");
  });

  test("task_show returns frontmatter", async () => {
    const s = await session();
    s.setResponses([
      reply([call("task_show", { selector: "login" })]),
      (ctx: Context) => reply(`kind is ${(/kind: (\w+)/.exec(latestToolResultText(ctx, "task_show") ?? "")?.[1]) ?? "?"}`),
    ]);
    await s.session.prompt("Show login.");
    expect(toolResultTexts(s.session, "task_show")[0]).toContain("kind: task");
    expect(lastAssistantText(s.session)).toContain("kind is task");
  });

  test("task_assert_kind rejects a mismatch as a tool error", async () => {
    const s = await session();
    s.setResponses([
      reply([call("task_assert_kind", { selector: "login", kind: "epic" })]),
      (ctx: Context) => {
        const result = latestToolResultText(ctx, "task_assert_kind") ?? "";
        return reply(result.includes("not") ? "mismatch as expected" : "unexpected success");
      },
    ]);
    await s.session.prompt("Assert login is an epic.");
    const results = toolResultTexts(s.session, "task_assert_kind");
    expect(results.some((t) => /not/.test(t))).toBe(true);
    expect(lastAssistantText(s.session)).toContain("mismatch as expected");
  });

  test("task_get reads a field after task_set mutates it", async () => {
    const s = await session();
    s.setResponses([
      reply([call("task_set", { selector: "login", field: "status", value: "in-progress" })]),
      reply([call("task_get", { selector: "login", field: "status" })]),
      (ctx: Context) => reply(`status now: ${latestToolResultText(ctx, "task_get") ?? "?"}`),
    ]);
    await s.session.prompt("Set login to in-progress, then read it back.");
    expect(toolCallNames(s.events)).toEqual(["task_set", "task_get"]);
    expect(lastAssistantText(s.session)).toContain("status now: in-progress");
    const onDisk = readFileSync(join(s.cwd, "docs/tasks/login/task.md"), "utf-8");
    expect(onDisk).toContain("status: in-progress");
  });

  test("task_finalizable blocks while a slice is open", async () => {
    const s = await session();
    s.setResponses([
      reply([call("task_finalizable", { selector: "login" })]),
      (ctx: Context) => reply(latestToolResultText(ctx, "task_finalizable") ?? "?"),
    ]);
    await s.session.prompt("Can we finalize login?");
    expect(toolResultTexts(s.session, "task_finalizable")[0]).toMatch(/open slice/);
  });

  test("task_show works on slices by slug", async () => {
    const s = await session();
    s.setResponses([
      reply([call("task_show", { selector: "do-thing" })]),
      (ctx: Context) => reply(latestToolResultText(ctx, "task_show") ?? "?"),
    ]);
    await s.session.prompt("Show do-thing slice.");
    const result = toolResultTexts(s.session, "task_show")[0];
    expect(result).toContain("kind: slice");
    expect(result).toContain("slug: do-thing");
  });

  test("task_set works on slices by slug", async () => {
    const s = await session();
    s.setResponses([
      reply([call("task_set", { selector: "do-thing", field: "status", value: "in-progress" })]),
      (ctx: Context) => {
        const result = latestToolResultText(ctx, "task_set") ?? "";
        return reply(result.includes("in-progress") ? "set ok" : "set failed");
      },
    ]);
    await s.session.prompt("Set do-thing to in-progress.");
    expect(lastAssistantText(s.session)).toContain("set ok");
    const onDisk = readFileSync(join(s.cwd, "docs/tasks/login/slices/1-do-thing.md"), "utf-8");
    expect(onDisk).toContain("status: in-progress");
  });

  test("task_dependency_levels returns levels", async () => {
    const s = await session();
    s.setResponses([
      reply([call("task_dependency_levels", { selector: "login" })]),
      (ctx: Context) => reply(latestToolResultText(ctx, "task_dependency_levels") ?? "?"),
    ]);
    await s.session.prompt("Get dependency levels for login.");
    const result = toolResultTexts(s.session, "task_dependency_levels")[0];
    expect(result).toContain("levels");
    const parsed = JSON.parse(result);
    expect(parsed.levels.length).toBeGreaterThanOrEqual(1);
    expect(parsed.remaining_count).toBe(2);
  });

  test("task_context returns schema", async () => {
    const s = await session();
    s.setResponses([
      reply([call("task_context", {})]),
      (ctx: Context) => reply(latestToolResultText(ctx, "task_context") ?? "?"),
    ]);
    await s.session.prompt("Get context.");
    expect(lastAssistantText(s.session)).toContain("Frontmatter schema");
  });
});

// ─── 2. Multi-turn conversations ─────────────────────────────────────────────

describe("multi-turn state mutations", () => {
  test("task_epic_tick + task_epic_finalizable cross-turn", async () => {
    const s = await session();
    s.setResponses([
      reply([call("task_epic_tick", { selector: "auth", task_slug: "login" })]),
      reply([call("task_epic_tick", { selector: "auth", task_slug: "sso" })]),
      reply([call("task_epic_finalizable", { selector: "auth" })]),
      (ctx: Context) => reply(latestToolResultText(ctx, "task_epic_finalizable") ?? "?"),
    ]);
    await s.session.prompt("Tick both children done, then check epic.");
    expect(lastAssistantText(s.session)).toContain("ready to finalize");
  });

  test("task_state_set writes, task_state reads back", async () => {
    const s = await session();
    s.setResponses([
      reply([call("task_state_set", { field: "task", value: "login" })]),
      reply([call("task_state", {})]),
      (ctx: Context) => reply(`active: ${latestToolResultText(ctx, "task_state") ?? "?"}`),
    ]);
    await s.session.prompt("Set state and read it.");
    expect(lastAssistantText(s.session)).toContain("login");
  });
});

// ─── 3. Guidelines extension ─────────────────────────────────────────────────

describe("guidelines extension", () => {
  test("list_guidelines discovers seeded docs files", async () => {
    const s = await session({
      projectFiles: {
        "docs/typescript-guidelines.md": "## TS Conventions\nUse const.\n",
      },
    });
    s.setResponses([
      reply([call("list_guidelines", {})]),
      (ctx: Context) => reply(latestToolResultText(ctx, "list_guidelines") ?? "(none)"),
    ]);
    await s.session.prompt("What guidelines are available?");
    expect(toolResultTexts(s.session, "list_guidelines")[0]).toContain("typescript-guidelines");
  });

  test("get_guidelines returns content for a language", async () => {
    const s = await session({
      projectFiles: {
        "docs/typescript-guidelines.md": "## TS Conventions\nUse const.\n",
      },
    });
    s.setResponses([
      reply([call("get_guidelines", { language: "typescript" })]),
      (ctx: Context) => reply(latestToolResultText(ctx, "get_guidelines") ?? "(none)"),
    ]);
    await s.session.prompt("Get typescript guidelines.");
    expect(lastAssistantText(s.session)).toContain("Use const");
  });
});

// ─── 4. Edge cases ──────────────────────────────────────────────────────────

describe("edge cases", () => {
  test("task_list on tree without docs/tasks is graceful", async () => {
    const s = await createTaskSession({ extensions: ALL_EXTENSIONS, projectFiles: {} });
    sessions.push(s);
    s.setResponses([
      reply([call("task_list", {})]),
      (ctx: Context) => reply(latestToolResultText(ctx, "task_list") ?? "?"),
    ]);
    await s.session.prompt("List tasks.");
    expect(lastAssistantText(s.session)).toMatch(/\(empty\)|no docs\/tasks/);
  });

  test("resolve of nonexistent slug errors gracefully", async () => {
    const s = await session();
    s.setResponses([
      reply([call("task_resolve", { selector: "does-not-exist" })]),
      (ctx: Context) => {
        const result = latestToolResultText(ctx, "task_resolve") ?? "";
        return reply(result.includes("matches") ? "not found as expected" : "unexpected");
      },
    ]);
    await s.session.prompt("Resolve does-not-exist.");
    expect(lastAssistantText(s.session)).toContain("not found as expected");
  });

  test("task_state works on fresh tree", async () => {
    const s = await createTaskSession({ extensions: ALL_EXTENSIONS, projectFiles: {} });
    sessions.push(s);
    s.setResponses([
      reply([call("task_state", {})]),
      (ctx: Context) => reply(latestToolResultText(ctx, "task_state") ?? "?"),
    ]);
    await s.session.prompt("Check state.");
    expect(lastAssistantText(s.session)).toContain("(none)");
  });
});