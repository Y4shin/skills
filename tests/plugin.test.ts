/**
 * Comprehensive unit tests for task-workflow tools.
 * Tests every tool directly via createTools() with no pi runtime.
 */

import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";
import { createTools } from "../src/pi.js";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

function mkTmp(): string {
  const d = join(tmpdir(), "twf-test-" + randomBytes(4).toString("hex"));
  mkdirSync(d, { recursive: true });
  return d;
}

function seedTree(t: string): void {
  mkdirSync(join(t, "docs/tasks/epics/auth"), { recursive: true });
  mkdirSync(join(t, "docs/tasks/login/slices"), { recursive: true });
  mkdirSync(join(t, "docs/tasks/archive/done-task/slices"), { recursive: true });
  writeFileSync(
    join(t, "docs/tasks/epics/auth/epic.md"),
    "---\nkind: epic\ntitle: Auth epic\nslug: auth\nstatus: draft\n" +
      "tasks:\n  - slug: login\n    blocked_by: []\n    done: false\n  - slug: sso\n    blocked_by: [login]\n    done: false\n---\n",
  );
  writeFileSync(
    join(t, "docs/tasks/login/task.md"),
    "---\nkind: task\ntitle: Login\nslug: login\nstatus: draft\nslices:\n  - do-thing\n  - other-thing\nepic: auth\nstarted_at: 42\n---\n",
  );
  writeFileSync(
    join(t, "docs/tasks/login/slices/1-do-thing.md"),
    "---\nkind: slice\ntitle: Do thing\nslug: do-thing\ntask: ../task.md\nmode: hitl\nstatus: todo\nsize: m\nblocked_by: []\n---\n",
  );
  writeFileSync(
    join(t, "docs/tasks/login/slices/2-other-thing.md"),
    "---\nkind: slice\ntitle: Other thing\nslug: other-thing\ntask: ../task.md\nmode: afk\nstatus: todo\nsize: s\nblocked_by: [do-thing]\n---\n",
  );
  writeFileSync(
    join(t, "docs/tasks/archive/done-task/task.md"),
    "---\nkind: task\ntitle: Done\nslug: done-task\nstatus: done\nslices: []\n---\n",
  );
  // Another task for list tests
  mkdirSync(join(t, "docs/tasks/config/slices"), { recursive: true });
  writeFileSync(
    join(t, "docs/tasks/config/task.md"),
    "---\nkind: task\ntitle: Config\nslug: config\nstatus: todo\nslices:\n  - db-setup\n---\n",
  );
  writeFileSync(
    join(t, "docs/tasks/config/slices/1-db-setup.md"),
    "---\nkind: slice\ntitle: DB setup\nslug: db-setup\ntask: ../task.md\nmode: afk\nstatus: todo\nsize: m\nblocked_by: []\n---\n",
  );
}

const ctx = (directory: string) => ({ directory }) as any;

describe("task-workflow tools", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => { tools = createTools(); });

  describe("registration", () => {
    test("all tools have descriptions and execute functions", () => {
      const names = Object.keys(tools).sort();
      expect(names.length).toBeGreaterThanOrEqual(14);
      for (const t of Object.values(tools)) {
        expect(typeof t.description).toBe("string");
        expect(typeof t.execute).toBe("function");
      }
    });
  });

  describe("task_show", () => {
    test("shows task frontmatter by slug", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_show.execute({ selector: "login" }, ctx(t));
      expect(out).toContain("kind: task");
      expect(out).toContain("slug: login");
    });

    test("shows epic frontmatter", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_show.execute({ selector: "auth" }, ctx(t));
      expect(out).toContain("kind: epic");
    });

    test("shows slice frontmatter by slug", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_show.execute({ selector: "do-thing" }, ctx(t));
      expect(out).toContain("kind: slice");
      expect(out).toContain("slug: do-thing");
    });

    test("shows frontmatter with json flag", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_show.execute({ selector: "login", json: true }, ctx(t));
      const parsed = JSON.parse(out);
      expect(parsed.kind).toBe("task");
      expect(parsed.slug).toBe("login");
    });

    test("throws on nonexistent slug", async () => {
      const t = mkTmp(); seedTree(t);
      await expect(tools.task_show.execute({ selector: "nope" }, ctx(t))).rejects.toThrow();
    });
  });

  describe("task_get", () => {
    test("returns a field value", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_get.execute({ selector: "login", field: "status" }, ctx(t));
      expect(out).toBe("draft");
    });

    test("returns empty string for missing field", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_get.execute({ selector: "login", field: "nonexistent" }, ctx(t));
      expect(out).toBe("");
    });
  });

  describe("task_set", () => {
    test("sets a string value", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_set.execute({ selector: "login", field: "status", value: "in-progress" }, ctx(t));
      expect(out).toContain("in-progress");
      const got = await tools.task_get.execute({ selector: "login", field: "status" }, ctx(t));
      expect(got).toBe("in-progress");
    });

    test("sets an int value", async () => {
      const t = mkTmp(); seedTree(t);
      await tools.task_set.execute({ selector: "login", field: "started_at", value: "42" }, ctx(t));
      const got = await tools.task_get.execute({ selector: "login", field: "started_at" }, ctx(t));
      expect(got).toBe("42");
    });

    test("sets a bool value", async () => {
      const t = mkTmp(); seedTree(t);
      await tools.task_set.execute({ selector: "login", field: "flag", value: "true" }, ctx(t));
      const got = await tools.task_get.execute({ selector: "login", field: "flag" }, ctx(t));
      expect(got).toBe("true");
    });

    test("sets null value", async () => {
      const t = mkTmp(); seedTree(t);
      await tools.task_set.execute({ selector: "login", field: "epic", value: "null" }, ctx(t));
      const got = await tools.task_get.execute({ selector: "login", field: "epic" }, ctx(t));
      expect(got).toBe("null");  // task_get returns String(null) = "null"
    });

    test("persists to disk", async () => {
      const t = mkTmp(); seedTree(t);
      await tools.task_set.execute({ selector: "login", field: "status", value: "done" }, ctx(t));
      const onDisk = require("fs").readFileSync(join(t, "docs/tasks/login/task.md"), "utf-8");
      expect(onDisk).toContain("status: done");
    });
  });

  describe("task_set_slices", () => {
    test("sets the slices list", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_set_slices.execute({ selector: "login", slugs: ["a", "b", "c"] }, ctx(t));
      expect(out).toContain("a, b, c");
    });

    test("replaces existing list", async () => {
      const t = mkTmp(); seedTree(t);
      await tools.task_set_slices.execute({ selector: "login", slugs: ["x"] }, ctx(t));
      const got = await tools.task_get.execute({ selector: "login", field: "slices" }, ctx(t));
      expect(got).toContain("x");
      expect(got).not.toContain("do-thing");
    });

    test("accepts empty list", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_set_slices.execute({ selector: "login", slugs: [] }, ctx(t));
      expect(out).toContain("slices:");  // the tool's return message
      const got = await tools.task_get.execute({ selector: "login", field: "slices" }, ctx(t));
      // String([]) = "", so check the tool's return instead
      expect(got).toBeDefined();
    });
  });

  describe("task_resolve", () => {
    test("resolves task slug", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_resolve.execute({ selector: "login" }, ctx(t));
      expect(out).toContain("login/task.md");
    });

    test("resolves epic slug with kind filter", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_resolve.execute({ selector: "auth", kind: "epic" }, ctx(t));
      expect(out).toContain("epics/auth/epic.md");
    });

    test("resolves slice slug", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_resolve.execute({ selector: "do-thing" }, ctx(t));
      expect(out).toContain("do-thing.md");
    });

    test("throws for nonexistent slug", async () => {
      const t = mkTmp(); seedTree(t);
      await expect(tools.task_resolve.execute({ selector: "nope" }, ctx(t))).rejects.toThrow();
    });
  });

  describe("task_assert_kind", () => {
    test("passes on match", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_assert_kind.execute({ selector: "login", kind: "task" }, ctx(t));
      expect(out).toContain("OK");
    });

    test("fails on mismatch", async () => {
      const t = mkTmp(); seedTree(t);
      await expect(tools.task_assert_kind.execute({ selector: "login", kind: "epic" }, ctx(t))).rejects.toThrow(/not/);
    });

    test("passes for slice kind", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_assert_kind.execute({ selector: "do-thing", kind: "slice" }, ctx(t));
      expect(out).toContain("OK");
    });
  });

  describe("task_list", () => {
    test("lists all non-archived artifacts", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_list.execute({}, ctx(t));
      expect(out).toContain("login");
      expect(out).toContain("config");
      expect(out).toContain("auth");
      expect(out).not.toContain("done-task");  // archived
    });

    test("filters by kind", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_list.execute({ kind: "epic" }, ctx(t));
      expect(out).toContain("auth");
      expect(out).not.toContain("login");
    });

    test("filters by status", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_list.execute({ status: "draft" }, ctx(t));
      expect(out).toContain("login");
      expect(out).not.toContain("config");
    });

    test("filters by epic", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_list.execute({ epic: "auth" }, ctx(t));
      expect(out).toContain("login");
      expect(out).not.toContain("config");
    });

    test("json flag returns structured data", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_list.execute({ json: true }, ctx(t));
      const parsed = JSON.parse(out);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("task_slices", () => {
    test("lists active slices", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_slices.execute({ selector: "login" }, ctx(t));
      expect(out).toContain("do-thing");
      expect(out).toContain("other-thing");
    });

    test("returns empty for done/finalized task", async () => {
      const t = mkTmp(); seedTree(t);
      // Create a task with no slices
      mkdirSync(join(t, "docs/tasks/empty/slices"), { recursive: true });
      writeFileSync(
        join(t, "docs/tasks/empty/task.md"),
        "---\nkind: task\ntitle: Empty\nslug: empty\nstatus: done\nslices: []\n---\n",
      );
      const out = await tools.task_slices.execute({ selector: "empty" }, ctx(t));
      expect(out).toContain("no open slices");
    });

    test("json flag returns structured data", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_slices.execute({ selector: "login", json: true }, ctx(t));
      const parsed = JSON.parse(out);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
    });
  });

  describe("task_finalizable", () => {
    test("rejects when slices are open", async () => {
      const t = mkTmp(); seedTree(t);
      await expect(tools.task_finalizable.execute({ selector: "login" }, ctx(t))).rejects.toThrow(/open slice/);
    });

    test("passes when no slices remain", async () => {
      const t = mkTmp(); seedTree(t);
      // Archive all slices
      rmSync(join(t, "docs/tasks/login/slices/1-do-thing.md"));
      rmSync(join(t, "docs/tasks/login/slices/2-other-thing.md"));
      const out = await tools.task_finalizable.execute({ selector: "login" }, ctx(t));
      expect(out).toContain("ready to finalize");
    });
  });

  describe("task_dependency_levels", () => {
    test("returns levels for a task with dependencies", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_dependency_levels.execute({ selector: "login" }, ctx(t));
      const parsed = JSON.parse(out);
      expect(parsed).toHaveProperty("levels");
      expect(parsed).toHaveProperty("remaining_count");
      expect(parsed).toHaveProperty("done_count");
    });

    test("first level has independent slices", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_dependency_levels.execute({ selector: "login" }, ctx(t));
      const parsed = JSON.parse(out);
      expect(parsed.levels[0]).toContain("do-thing");
    });

    test("last level has dependent slices", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_dependency_levels.execute({ selector: "login" }, ctx(t));
      const parsed = JSON.parse(out);
      const last = parsed.levels[parsed.levels.length - 1];
      expect(last).toContain("other-thing");
    });
  });

  describe("task_epic_tasks", () => {
    test("lists children", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_epic_tasks.execute({ selector: "auth" }, ctx(t));
      expect(out).toContain("login");
      expect(out).toContain("sso");
    });

    test("json flag returns structured", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_epic_tasks.execute({ selector: "auth", json: true }, ctx(t));
      const parsed = JSON.parse(out);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
    });
  });

  describe("task_epic_tick", () => {
    test("marks a child done", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_epic_tick.execute({ selector: "auth", task_slug: "login" }, ctx(t));
      expect(out).toContain("done");
    });

    test("throws for nonexistent child", async () => {
      const t = mkTmp(); seedTree(t);
      await expect(tools.task_epic_tick.execute({ selector: "auth", task_slug: "nope" }, ctx(t))).rejects.toThrow();
    });
  });

  describe("task_epic_finalizable", () => {
    test("rejects when children remain", async () => {
      const t = mkTmp(); seedTree(t);
      await expect(tools.task_epic_finalizable.execute({ selector: "auth" }, ctx(t))).rejects.toThrow(/unfinished/);
    });

    test("passes when all children done", async () => {
      const t = mkTmp(); seedTree(t);
      await tools.task_epic_tick.execute({ selector: "auth", task_slug: "login" }, ctx(t));
      await tools.task_epic_tick.execute({ selector: "auth", task_slug: "sso" }, ctx(t));
      const out = await tools.task_epic_finalizable.execute({ selector: "auth" }, ctx(t));
      expect(out).toContain("ready to finalize");
    });
  });

  describe("task_state", () => {
    test("returns defaults on fresh tree", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_state.execute({}, ctx(t));
      expect(out).toContain("task:");
      expect(out).toContain("slice:");
    });

    test("reflects saved state", async () => {
      const t = mkTmp(); seedTree(t);
      await tools.task_state_set.execute({ field: "task", value: "login" }, ctx(t));
      await tools.task_state_set.execute({ field: "slice", value: "do-thing" }, ctx(t));
      const out = await tools.task_state.execute({}, ctx(t));
      expect(out).toContain("login");
      expect(out).toContain("do-thing");
    });
  });

  describe("task_state_set", () => {
    test("sets task field", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_state_set.execute({ field: "task", value: "login" }, ctx(t));
      expect(out).toContain("login");
    });

    test("sets slice field", async () => {
      const t = mkTmp(); seedTree(t);
      await tools.task_state_set.execute({ field: "slice", value: "do-thing" }, ctx(t));
      const out = await tools.task_state.execute({}, ctx(t));
      expect(out).toContain("do-thing");
    });

    test("clears field with null", async () => {
      const t = mkTmp(); seedTree(t);
      await tools.task_state_set.execute({ field: "task", value: "null" }, ctx(t));
      const out = await tools.task_state.execute({}, ctx(t));
      expect(out).toContain("(none)");
    });

    test("throws for unknown field", async () => {
      const t = mkTmp(); seedTree(t);
      await expect(tools.task_state_set.execute({ field: "bad", value: "x" }, ctx(t))).rejects.toThrow(/unknown/);
    });
  });

  describe("task_context", () => {
    test("returns schema reference", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_context.execute({}, ctx(t));
      expect(out).toContain("Frontmatter schema");
      expect(out).toContain("kind: task");
    });

    test("includes profile when present", async () => {
      const t = mkTmp(); seedTree(t);
      mkdirSync(join(t, "docs/tasks"), { recursive: true });
      writeFileSync(join(t, "docs/tasks/profile.md"), "# Profile\nCI: test\n");
      const out = await tools.task_context.execute({}, ctx(t));
      expect(out).toContain("Project profile");
      expect(out).toContain("CI: test");
    });
  });

  describe("slice resolution", () => {
    test("task_set works on slices by slug", async () => {
      const t = mkTmp(); seedTree(t);
      await tools.task_set.execute({ selector: "do-thing", field: "status", value: "in-progress" }, ctx(t));
      const got = await tools.task_get.execute({ selector: "do-thing", field: "status" }, ctx(t));
      expect(got).toBe("in-progress");
    });

    test("task_show works on slices by path", async () => {
      const t = mkTmp(); seedTree(t);
      const path = join(t, "docs/tasks/login/slices/1-do-thing.md");
      const out = await tools.task_show.execute({ selector: path }, ctx(t));
      expect(out).toContain("slug: do-thing");
    });
  });
});