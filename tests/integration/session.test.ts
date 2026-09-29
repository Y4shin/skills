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
  test("tw_list sees the on-disk tree", async () => {
    const s = await session();
    s.setResponses([
      reply([call("tw_list", {})]),
      (ctx: Context) => reply(`Tasks: ${latestToolResultText(ctx, "tw_list") ?? "(none)"}`),
    ]);
    await s.session.prompt("List tasks.");
    expect(toolCallNames(s.events)).toContain("tw_list");
    expect(toolResultTexts(s.session, "tw_list")[0]).toContain("login");
    expect(lastAssistantText(s.session)).toContain("login");
  });

  test("tw_show returns frontmatter", async () => {
    const s = await session();
    s.setResponses([
      reply([call("tw_show", { selector: "login" })]),
      (ctx: Context) => reply(`kind is ${(/kind: (\w+)/.exec(latestToolResultText(ctx, "tw_show") ?? "")?.[1]) ?? "?"}`),
    ]);
    await s.session.prompt("Show login.");
    expect(toolResultTexts(s.session, "tw_show")[0]).toContain("kind: task");
    expect(lastAssistantText(s.session)).toContain("kind is task");
  });

  test("tw_get reads a field after tw_set mutates it", async () => {
    const s = await session();
    s.setResponses([
      reply([call("tw_set", { selector: "login", field: "status", value: "in-progress" })]),
      reply([call("tw_get", { selector: "login", field: "status" })]),
      (ctx: Context) => reply(`status now: ${latestToolResultText(ctx, "tw_get") ?? "?"}`),
    ]);
    await s.session.prompt("Set login to in-progress, then read it back.");
    expect(toolCallNames(s.events)).toEqual(["tw_set", "tw_get"]);
    expect(lastAssistantText(s.session)).toContain("status now: in-progress");
    const onDisk = readFileSync(join(s.cwd, "docs/tasks/login/task.md"), "utf-8");
    expect(onDisk).toContain("status: in-progress");
  });

  test("tw_show works on slices by slug", async () => {
    const s = await session();
    s.setResponses([
      reply([call("tw_show", { selector: "do-thing" })]),
      (ctx: Context) => reply(latestToolResultText(ctx, "tw_show") ?? "?"),
    ]);
    await s.session.prompt("Show do-thing slice.");
    const result = toolResultTexts(s.session, "tw_show")[0];
    expect(result).toContain("kind: slice");
    expect(result).toContain("slug: do-thing");
  });

  test("tw_set works on slices by slug", async () => {
    const s = await session();
    s.setResponses([
      reply([call("tw_set", { selector: "do-thing", field: "status", value: "in-progress" })]),
      (ctx: Context) => {
        const result = latestToolResultText(ctx, "tw_set") ?? "";
        return reply(result.includes("in-progress") ? "set ok" : "set failed");
      },
    ]);
    await s.session.prompt("Set do-thing to in-progress.");
    expect(lastAssistantText(s.session)).toContain("set ok");
    const onDisk = readFileSync(join(s.cwd, "docs/tasks/login/slices/1-do-thing.md"), "utf-8");
    expect(onDisk).toContain("status: in-progress");
  });

  test("tw_dependency_levels returns levels", async () => {
    const s = await session();
    s.setResponses([
      reply([call("tw_dependency_levels", { selector: "auth" })]),
      (ctx: Context) => reply(latestToolResultText(ctx, "tw_dependency_levels") ?? "?"),
    ]);
    await s.session.prompt("Get dependency levels for auth.");
    const result = toolResultTexts(s.session, "tw_dependency_levels")[0];
    expect(result).toContain("levels");
    const parsed = JSON.parse(result);
    expect(parsed.levels.length).toBeGreaterThanOrEqual(1);
    expect(parsed.remaining_count).toBe(1);
  });

  test("tw_context returns schema", async () => {
    const s = await session();
    s.setResponses([
      reply([call("tw_context", {})]),
      (ctx: Context) => reply(latestToolResultText(ctx, "tw_context") ?? "?"),
    ]);
    await s.session.prompt("Get context.");
    expect(lastAssistantText(s.session)).toContain("Frontmatter schema");
  });
});

// ─── 2. Multi-turn conversations ─────────────────────────────────────────────

describe("multi-turn state mutations", () => {
  test("tw_state_set writes, tw_state reads back", async () => {
    const s = await session();
    s.setResponses([
      reply([call("tw_state_set", { field: "task", value: "login" })]),
      reply([call("tw_state", {})]),
      (ctx: Context) => reply(`active: ${latestToolResultText(ctx, "tw_state") ?? "?"}`),
    ]);
    await s.session.prompt("Set state and read it.");
    expect(lastAssistantText(s.session)).toContain("login");
  });
});

// ─── 3. Edge cases ──────────────────────────────────────────────────────────

describe("edge cases", () => {
  test("tw_list on tree without docs/tasks is graceful", async () => {
    const s = await createTaskSession({ extensions: ALL_EXTENSIONS, projectFiles: {} });
    sessions.push(s);
    s.setResponses([
      reply([call("tw_list", {})]),
      (ctx: Context) => reply(latestToolResultText(ctx, "tw_list") ?? "?"),
    ]);
    await s.session.prompt("List tasks.");
    expect(lastAssistantText(s.session)).toMatch(/\(empty\)|no docs\/tasks/);
  });

  test("tw_state works on fresh tree", async () => {
    const s = await createTaskSession({ extensions: ALL_EXTENSIONS, projectFiles: {} });
    sessions.push(s);
    s.setResponses([
      reply([call("tw_state", {})]),
      (ctx: Context) => reply(latestToolResultText(ctx, "tw_state") ?? "?"),
    ]);
    await s.session.prompt("Check state.");
    expect(lastAssistantText(s.session)).toContain("(none)");
  });
});