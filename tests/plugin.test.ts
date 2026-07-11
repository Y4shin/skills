/**
 * Unit-test the task-workflow tools directly — no pi runtime.
 *
 * The tools are exported from the pi extension's createTools() factory.
 * We call execute(args, ctx) with a fake context and assert the results.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";

import { createTools } from "../src/pi/index";
import { mkTmp } from "./util";

function sampleTree(): string {
  const t = mkTmp();
  mkdirSync(join(t, "docs/tasks/epics/auth"), { recursive: true });
  mkdirSync(join(t, "docs/tasks/login/slices"), { recursive: true });
  writeFileSync(
    join(t, "docs/tasks/epics/auth/epic.md"),
    "---\nkind: epic\ntitle: Auth epic\nslug: auth\nstatus: draft\n" +
      "tasks:\n  - slug: login\n    blocked_by: []\n    done: false\n---\n",
  );
  writeFileSync(
    join(t, "docs/tasks/login/task.md"),
    "---\nkind: task\ntitle: Login\nslug: login\nstatus: draft\nslices: []\nepic: auth\n---\n",
  );
  writeFileSync(
    join(t, "docs/tasks/login/slices/3-do-thing.md"),
    "---\nkind: slice\ntitle: Do thing\nslug: do-thing\ntask: ../task.md\nmode: hitl\nstatus: todo\nsize: m\nblocked_by: []\n---\n",
  );
  return t;
}

const ctx = (directory: string) => ({ directory }) as any;

describe("task-workflow tools", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => {
    tools = createTools();
  });

  test("registers all tools with descriptions", () => {
    const names = Object.keys(tools).sort();
    expect(names.length).toBeGreaterThanOrEqual(15);
    expect(names).toContain("task_show");
    expect(names).toContain("task_finalizable");
    expect(names).toContain("task_epic_tick");
    expect(names).toContain("task_state");
    expect(names).toContain("task_state_set");
    for (const t of Object.values(tools)) {
      expect(typeof t.description).toBe("string");
      expect(typeof t.execute).toBe("function");
    }
  });

  test("task_show returns the artifact frontmatter", async () => {
    const t = sampleTree();
    const out = await tools.task_show.execute({ selector: "login" }, ctx(t));
    expect(out).toContain("kind: task");
    expect(out).toContain("slug: login");
  });

  test("task_list lists epics and tasks", async () => {
    const t = sampleTree();
    const out = await tools.task_list.execute({}, ctx(t));
    expect(out).toContain("epic");
    expect(out).toContain("login");
  });

  test("task_finalizable rejects while a slice is open", async () => {
    const t = sampleTree();
    await expect(tools.task_finalizable.execute({ selector: "login" }, ctx(t))).rejects.toThrow(
      /open slice/,
    );
  });

  test("task_set mutates frontmatter (readable back via task_get)", async () => {
    const t = sampleTree();
    const set = await tools.task_set.execute({ selector: "login", field: "status", value: "in-progress" }, ctx(t));
    expect(set).toContain("in-progress");
    const got = await tools.task_get.execute({ selector: "login", field: "status" }, ctx(t));
    expect(got).toBe("in-progress");
  });

  test("task_epic_tick marks a child task done", async () => {
    const t = sampleTree();
    const out = await tools.task_epic_tick.execute({ selector: "auth", task_slug: "login" }, ctx(t));
    expect(out).toContain("done");
  });

  test("task_assert_kind fails on a kind mismatch", async () => {
    const t = sampleTree();
    await expect(tools.task_assert_kind.execute({ selector: "login", kind: "epic" }, ctx(t))).rejects.toThrow(/not/);
  });

  test("task_state reads and writes state", async () => {
    const t = sampleTree();
    const out = await tools.task_state.execute({}, ctx(t));
    expect(out).toContain("active task:");
    expect(out).toContain("active slice:");
    // Set a state field
    const setOut = await tools.task_state_set.execute({ field: "active.task", value: "login" }, ctx(t));
    expect(setOut).toContain("login");
    // Read it back
    const out2 = await tools.task_state.execute({}, ctx(t));
    expect(out2).toContain("login");
  });

  test("task_set_slices accepts slug arrays", async () => {
    const t = sampleTree();
    const out = await tools.task_set_slices.execute({ selector: "login", slugs: ["do-thing", "other-thing"] }, ctx(t));
    expect(out).toContain("do-thing");
    expect(out).toContain("other-thing");
  });

  test("task_slices lists active slices only", async () => {
    const t = sampleTree();
    // With an unarchived slice
    const out = await tools.task_slices.execute({ selector: "login" }, ctx(t));
    expect(out).toContain("3");
    expect(out).toContain("do-thing");
  });

  test("task_epic_tasks lists child tasks", async () => {
    const t = sampleTree();
    const out = await tools.task_epic_tasks.execute({ selector: "auth" }, ctx(t));
    expect(out).toContain("login");
  });

  test("task_epic_finalizable detects unfinished children", async () => {
    const t = sampleTree();
    await expect(tools.task_epic_finalizable.execute({ selector: "auth" }, ctx(t))).rejects.toThrow(/unfinished/);
  });
});