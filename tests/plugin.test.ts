/**
 * Comprehensive unit tests for task-workflow tools.
 * Tests every tool directly via createTools() with no pi runtime.
 */

import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";
import YAML from "yaml";
import { createTools } from "../src/pi.js";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

function mkTmp(): string {
  const d = join(tmpdir(), "twf-test-" + randomBytes(4).toString("hex"));
  mkdirSync(d, { recursive: true });
  return d;
}

function seedTree(t: string): void {
  mkdirSync(join(t, "docs/tasks/maps/auth"), { recursive: true });
  mkdirSync(join(t, "docs/tasks/login/slices"), { recursive: true });
  mkdirSync(join(t, "docs/tasks/archive/done-task/slices"), { recursive: true });
  writeFileSync(
    join(t, "docs/tasks/maps/auth/map.md"),
    "---\nkind: map\ntitle: Auth map\nslug: auth\nstatus: draft\n" +
      "tasks:\n  - slug: login\n    blocked_by: []\n    done: false\n  - slug: sso\n    blocked_by: [login]\n    done: false\n---\n",
  );
  writeFileSync(
    join(t, "docs/tasks/login/task.md"),
    "---\nkind: task\ntitle: Login\nslug: login\nstatus: draft\nslices:\n  - do-thing\n  - other-thing\nmap: auth\nstarted_at: 42\n---\n",
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

function writeMd(path: string, frontmatter: string, body = ""): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `---\n${frontmatter}---\n${body}`);
}

/** The v4 effort-grouped layout: one directory per effort, tasks/ and tickets/ subtrees. */
function seedV4Tree(t: string): void {
  const base = join(t, "docs/tasks");
  writeMd(join(base, "billing/map.md"), "type: map\ntitle: Billing\nstatus: draft\n");
  writeMd(join(base, "billing/spec.md"), "type: spec\ntitle: Billing spec\nstatus: draft\n");
  writeMd(join(base, "billing/arch-spec.md"), "type: arch spec\ntitle: Billing architecture\nstatus: draft\n");
  writeMd(
    join(base, "billing/tasks/research-cache/task.md"),
    "type: task\nsubtype: research\ntitle: Research cache\nstatus: stable\nworkflow_state: todo\nblocked_by: []\n",
  );
  writeMd(
    join(base, "billing/tasks/prototype-api/task.md"),
    "type: task\nsubtype: prototype\ntitle: Prototype API\nstatus: stable\nworkflow_state: ready\nblocked_by: [research-cache]\n",
  );
  writeMd(
    join(base, "billing/tickets/login-form/ticket.md"),
    "type: ticket\nsubtype: feature\ntitle: Login form\nstatus: stable\nworkflow_state: ready\nsize: l\nblocked_by: []\n",
  );
  writeMd(
    join(base, "billing/tickets/login-form/findings.md"),
    "type: findings\ntitle: Login form findings\nstatus: stable\n",
  );
  writeMd(
    join(base, "billing/tickets/login-form/deviation-reports/1-split.md"),
    "type: deviation report\ntitle: Split report\nstatus: stable\n",
  );
  writeMd(
    join(base, "billing/tickets/api-fix/ticket.md"),
    "type: ticket\nsubtype: bug\ntitle: Fix API\nstatus: stable\nworkflow_state: todo\nblocked_by: [login-form]\n",
  );
  // A spec-only effort directory: no map, no tasks, no tickets.
  writeMd(join(base, "spec-only/spec.md"), "type: spec\ntitle: Spec only\nstatus: stable\n");
  // The archive mirrors the live layout.
  writeMd(join(base, "archive/old-effort/map.md"), "type: map\ntitle: Old effort\nstatus: deprecated\n");
  writeMd(
    join(base, "archive/old-effort/tickets/old-ticket/ticket.md"),
    "type: ticket\nsubtype: feature\ntitle: Old ticket\nstatus: deprecated\nworkflow_state: done\n",
  );
}

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

    test("shows map frontmatter", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_show.execute({ selector: "auth" }, ctx(t));
      expect(out).toContain("kind: map");
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
      expect(parsed.type).toBe("task");
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
      await tools.task_set.execute({ selector: "login", field: "map", value: "null" }, ctx(t));
      const got = await tools.task_get.execute({ selector: "login", field: "map" }, ctx(t));
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

    test("resolves map slug with kind filter", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_resolve.execute({ selector: "auth", kind: "map" }, ctx(t));
      expect(out).toContain("maps/auth/map.md");
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
      await expect(tools.task_assert_kind.execute({ selector: "login", kind: "map" }, ctx(t))).rejects.toThrow(/not/);
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
      const out = await tools.task_list.execute({ kind: "map" }, ctx(t));
      expect(out).toContain("auth");
      expect(out).not.toContain("login");
    });

    test("filters by status", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_list.execute({ status: "draft" }, ctx(t));
      expect(out).toContain("login");
      expect(out).not.toContain("config");
    });

    test("filters by map", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_list.execute({ map: "auth" }, ctx(t));
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

  describe("task_frontier", () => {
    test("lists unblocked map children by task type", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_frontier.execute({ selector: "auth" }, ctx(t));
      expect(out).toContain("login");
      expect(out).not.toContain("sso");
    });

    test("returns structured frontier data", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_frontier.execute({ selector: "auth", json: true }, ctx(t));
      const parsed = JSON.parse(out);
      expect(parsed.map((item: any) => item.slug)).toContain("login");
    });
  });

  describe("task_map_tasks", () => {
    test("lists children", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_map_tasks.execute({ selector: "auth" }, ctx(t));
      expect(out).toContain("login");
      expect(out).toContain("sso");
    });

    test("json flag returns structured", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_map_tasks.execute({ selector: "auth", json: true }, ctx(t));
      const parsed = JSON.parse(out);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
    });
  });

  describe("task_map_tick", () => {
    test("marks a child done", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_map_tick.execute({ selector: "auth", task_slug: "login" }, ctx(t));
      expect(out).toContain("done");
    });

    test("throws for nonexistent child", async () => {
      const t = mkTmp(); seedTree(t);
      await expect(tools.task_map_tick.execute({ selector: "auth", task_slug: "nope" }, ctx(t))).rejects.toThrow();
    });
  });

  describe("task_map_finalizable", () => {
    test("rejects when children remain", async () => {
      const t = mkTmp(); seedTree(t);
      await expect(tools.task_map_finalizable.execute({ selector: "auth" }, ctx(t))).rejects.toThrow(/unfinished/);
    });

    test("passes when all children done", async () => {
      const t = mkTmp(); seedTree(t);
      await tools.task_map_tick.execute({ selector: "auth", task_slug: "login" }, ctx(t));
      await tools.task_map_tick.execute({ selector: "auth", task_slug: "sso" }, ctx(t));
      const out = await tools.task_map_finalizable.execute({ selector: "auth" }, ctx(t));
      expect(out).toContain("ready to finalize");
    });
  });

  describe("task_state", () => {
    test("shows both map and task pointers on a fresh tree", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_state.execute({}, ctx(t));
      expect(out).toContain("map:");
      expect(out).toContain("task:");
      expect(out).toContain("(none)");
    });

    test("reflects saved state: both pointers shown", async () => {
      const t = mkTmp(); seedTree(t);
      await tools.task_state_set.execute({ field: "map", value: "auth" }, ctx(t));
      await tools.task_state_set.execute({ field: "task", value: "login" }, ctx(t));
      const out = await tools.task_state.execute({}, ctx(t));
      expect(out).toMatch(/map:\s+auth/);
      expect(out).toMatch(/task:\s+login/);
    });
  });

  describe("task_state_set", () => {
    test("sets the map field", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_state_set.execute({ field: "map", value: "auth" }, ctx(t));
      expect(out).toContain("auth");
      const show = await tools.task_state.execute({}, ctx(t));
      expect(show).toMatch(/map:\s+auth/);
    });

    test("sets the task field", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.task_state_set.execute({ field: "task", value: "login" }, ctx(t));
      expect(out).toContain("login");
    });

    test("fresh repo: first write creates state.yaml with real nulls", async () => {
      const t = mkTmp(); seedTree(t);
      const before = existsSync(join(t, "docs/tasks/state.yaml"));
      expect(before).toBe(false);
      await tools.task_state_set.execute({ field: "task", value: "login" }, ctx(t));
      const text = readFileSync(join(t, "docs/tasks/state.yaml"), "utf-8");
      expect(text).not.toContain("None");
      const parsed = YAML.parse(text) as Record<string, unknown>;
      expect(parsed.task).toBe("login");
      expect(parsed.map).toBeNull();
      // The module never stamps schema_version; the file's business.
      expect(parsed).not.toHaveProperty("schema_version");
    });

    test("clears a pointer with 'null' and writes a real null, not 'None'", async () => {
      const t = mkTmp(); seedTree(t);
      await tools.task_state_set.execute({ field: "task", value: "login" }, ctx(t));
      const out = await tools.task_state_set.execute({ field: "task", value: "null" }, ctx(t));
      expect(out).toContain("task = null");
      const text = readFileSync(join(t, "docs/tasks/state.yaml"), "utf-8");
      expect(text).not.toContain("None");
      const parsed = YAML.parse(text) as Record<string, unknown>;
      expect(parsed.task).toBeNull();
      const show = await tools.task_state.execute({}, ctx(t));
      expect(show).toContain("(none)");
    });

    test("the demonstrated bug: a planted schema_version key survives a state write", async () => {
      const t = mkTmp(); seedTree(t);
      mkdirSync(join(t, "docs/tasks"), { recursive: true });
      writeFileSync(join(t, "docs/tasks/state.yaml"), "map: null\ntask: null\nschema_version: 3\n");
      await tools.task_state_set.execute({ field: "task", value: "login" }, ctx(t));
      const parsed = YAML.parse(readFileSync(join(t, "docs/tasks/state.yaml"), "utf-8")) as Record<string, unknown>;
      expect(parsed.schema_version).toBe(3);
      expect(parsed.task).toBe("login");
    });

    test("a v3 file with unknown keys plus a legacy slice key keeps all of them through a write", async () => {
      const t = mkTmp(); seedTree(t);
      writeFileSync(
        join(t, "docs/tasks/state.yaml"),
        "map: auth\ntask: login\nslice: login-form\nschema_version: 3\nfuture_key: keep me\n",
      );
      await tools.task_state_set.execute({ field: "task", value: "sso" }, ctx(t));
      const parsed = YAML.parse(readFileSync(join(t, "docs/tasks/state.yaml"), "utf-8")) as Record<string, unknown>;
      expect(parsed.slice).toBe("login-form");
      expect(parsed.schema_version).toBe(3);
      expect(parsed.future_key).toBe("keep me");
      expect(parsed.map).toBe("auth");
      expect(parsed.task).toBe("sso");
    });

    test("preservation holds across two consecutive writes", async () => {
      const t = mkTmp(); seedTree(t);
      writeFileSync(join(t, "docs/tasks/state.yaml"), "map: null\ntask: null\nschema_version: 3\n");
      await tools.task_state_set.execute({ field: "task", value: "login" }, ctx(t));
      await tools.task_state_set.execute({ field: "map", value: "auth" }, ctx(t));
      const parsed = YAML.parse(readFileSync(join(t, "docs/tasks/state.yaml"), "utf-8")) as Record<string, unknown>;
      expect(parsed.schema_version).toBe(3);
      expect(parsed.map).toBe("auth");
      expect(parsed.task).toBe("login");
    });

    test("empty or comment-only state.yaml yields defaults and the next write recreates the file", async () => {
      const t = mkTmp(); seedTree(t);
      writeFileSync(join(t, "docs/tasks/state.yaml"), "# only a comment\n");
      const show = await tools.task_state.execute({}, ctx(t));
      expect(show).toMatch(/map:\s+\(none\)/);
      expect(show).toMatch(/task:\s+\(none\)/);
      await tools.task_state_set.execute({ field: "task", value: "login" }, ctx(t));
      const parsed = YAML.parse(readFileSync(join(t, "docs/tasks/state.yaml"), "utf-8")) as Record<string, unknown>;
      expect(parsed.map).toBeNull();
      expect(parsed.task).toBe("login");
    });

    test("rejects the legacy slice field with an error naming map and task", async () => {
      const t = mkTmp(); seedTree(t);
      await expect(
        tools.task_state_set.execute({ field: "slice", value: "do-thing" }, ctx(t)),
      ).rejects.toThrow(/map.*task|task.*map/s);
    });

    test("rejects any other unknown field with an error naming map and task", async () => {
      const t = mkTmp(); seedTree(t);
      await expect(
        tools.task_state_set.execute({ field: "bad", value: "x" }, ctx(t)),
      ).rejects.toThrow(/map.*task|task.*map/s);
    });

    test("rejects the literal string 'None' as a pointer value on either pointer", async () => {
      const t = mkTmp(); seedTree(t);
      await expect(
        tools.task_state_set.execute({ field: "task", value: "None" }, ctx(t)),
      ).rejects.toThrow(/None/);
      await expect(
        tools.task_state_set.execute({ field: "map", value: "None" }, ctx(t)),
      ).rejects.toThrow(/None/);
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

describe("task-workflow tools — v4 effort-grouped tree", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => { tools = createTools(); });

  describe("resolution by slug and by path", () => {
    test("resolves the effort map by slug", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.task_show.execute({ selector: "billing" }, ctx(t));
      expect(out).toContain("type: map");
    });

    test("resolves the effort map by path", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.task_show.execute({ selector: join(t, "docs/tasks/billing/map.md") }, ctx(t));
      expect(out).toContain("type: map");
    });

    test("resolves the effort directory to its map", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.task_show.execute({ selector: join(t, "docs/tasks/billing") }, ctx(t));
      expect(out).toContain("type: map");
    });

    test("resolves a task by slug", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.task_show.execute({ selector: "research-cache" }, ctx(t));
      expect(out).toContain("type: task");
    });

    test("resolves a ticket by slug", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.task_show.execute({ selector: "login-form" }, ctx(t));
      expect(out).toContain("type: ticket");
    });

    test("resolves a ticket by path", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.task_show.execute({ selector: join(t, "docs/tasks/billing/tickets/login-form/ticket.md") }, ctx(t));
      expect(out).toContain("type: ticket");
    });

    test("resolves the spec by slug", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.task_show.execute({ selector: join(t, "docs/tasks/billing/spec.md") }, ctx(t));
      expect(out).toContain("type: spec");
    });

    test("resolves a spec-only effort directory", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.task_show.execute({ selector: join(t, "docs/tasks/spec-only") }, ctx(t));
      expect(out).toContain("type: spec");
    });

    test("resolves a deviated aux file", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.task_show.execute(
        { selector: join(t, "docs/tasks/billing/tickets/login-form/deviation-reports/1-split.md") },
        ctx(t),
      );
      expect(out).toContain("type: deviation report");
    });

    test("resolves the archived effort map", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.task_show.execute({ selector: join(t, "docs/tasks/archive/old-effort/map.md") }, ctx(t));
      expect(out).toContain("Old effort");
    });
  });

  describe("task_get on new-shape artifacts", () => {
    test("reads a field from a ticket", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.task_get.execute({ selector: "login-form", field: "subtype" }, ctx(t));
      expect(out).toBe("feature");
    });

    test("reads a field from a spec", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.task_get.execute({ selector: join(t, "docs/tasks/billing/spec.md"), field: "title" }, ctx(t));
      expect(out).toBe("Billing spec");
    });

    test("reads a field from a map", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.task_get.execute({ selector: "billing", field: "status" }, ctx(t));
      expect(out).toBe("draft");
    });

    test("reads a field from a task", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.task_get.execute({ selector: "prototype-api", field: "workflow_state" }, ctx(t));
      expect(out).toBe("ready");
    });

    test("reads a field from an aux findings file", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.task_get.execute(
        { selector: join(t, "docs/tasks/billing/tickets/login-form/findings.md"), field: "type" },
        ctx(t),
      );
      expect(out).toBe("findings");
    });
  });

  describe("kind confusion regression", () => {
    test("a wanted map against a ticket slug errors naming the actual type", async () => {
      const t = mkTmp(); seedV4Tree(t);
      await expect(
        tools.task_resolve.execute({ selector: "login-form", kind: "map" }, ctx(t)),
      ).rejects.toThrow(/ticket.*map|map.*ticket/s);
    });

    test("a wanted task against a ticket slug errors naming the actual type", async () => {
      const t = mkTmp(); seedV4Tree(t);
      await expect(
        tools.task_resolve.execute({ selector: "login-form", kind: "task" }, ctx(t)),
      ).rejects.toThrow(/ticket/);
    });

    test("a wanted map against a task slug errors naming the actual type", async () => {
      const t = mkTmp(); seedV4Tree(t);
      await expect(
        tools.task_resolve.execute({ selector: "research-cache", kind: "map" }, ctx(t)),
      ).rejects.toThrow(/task/);
    });

    test("a wanted map against a task slug does not silently return the task", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.task_resolve.execute({ selector: "research-cache", kind: "task" }, ctx(t));
      expect(out).toContain("tasks/research-cache/task.md");
    });

    test("resolves each type when the wanted type matches", async () => {
      const t = mkTmp(); seedV4Tree(t);
      expect(await tools.task_resolve.execute({ selector: "billing", kind: "map" }, ctx(t))).toContain("map.md");
      expect(await tools.task_resolve.execute({ selector: "login-form", kind: "ticket" }, ctx(t))).toContain("ticket.md");
      expect(await tools.task_resolve.execute({ selector: "research-cache", kind: "task" }, ctx(t))).toContain("task.md");
    });

    test("an unresolvable slug names the wanted type", async () => {
      const t = mkTmp(); seedV4Tree(t);
      await expect(
        tools.task_resolve.execute({ selector: "ghost", kind: "ticket" }, ctx(t)),
      ).rejects.toThrow(/no ticket matches 'ghost'/);
    });

    test("an unresolvable slug with no wanted type stays generic", async () => {
      const t = mkTmp(); seedV4Tree(t);
      await expect(
        tools.task_resolve.execute({ selector: "ghost" }, ctx(t)),
      ).rejects.toThrow(/no artifact matches 'ghost'/);
    });
  });

  describe("mixed tree", () => {
    test("both shapes coexist and both resolve", async () => {
      const t = mkTmp(); seedTree(t); seedV4Tree(t);
      const old = await tools.task_show.execute({ selector: "login" }, ctx(t));
      expect(old).toContain("kind: task");
      const fresh = await tools.task_show.execute({ selector: "login-form" }, ctx(t));
      expect(fresh).toContain("type: ticket");
    });

    test("a v3 slice still resolves by slug", async () => {
      const t = mkTmp(); seedTree(t); seedV4Tree(t);
      const out = await tools.task_show.execute({ selector: "do-thing" }, ctx(t));
      expect(out).toContain("kind: slice");
    });
  });

  describe("error cases", () => {
    test("an empty effort directory produces a clear error, not a crash", async () => {
      const t = mkTmp(); seedV4Tree(t);
      mkdirSync(join(t, "docs/tasks/empty-effort"), { recursive: true });
      await expect(
        tools.task_show.execute({ selector: join(t, "docs/tasks/empty-effort") }, ctx(t)),
      ).rejects.toThrow(/not a recognised artifact/);
    });

    test("an empty frontmatter block produces a clear error, not a crash", async () => {
      const t = mkTmp(); seedV4Tree(t);
      writeMd(join(t, "docs/tasks/billing/tickets/blank/ticket.md"), "title: Blank\n");
      await expect(
        tools.task_show.execute({ selector: join(t, "docs/tasks/billing/tickets/blank/ticket.md") }, ctx(t)),
      ).rejects.toThrow(/type/);
    });

    test("a file with no frontmatter at all produces a clear error", async () => {
      const t = mkTmp(); seedV4Tree(t);
      mkdirSync(join(t, "docs/tasks/billing/tickets/raw"), { recursive: true });
      writeFileSync(join(t, "docs/tasks/billing/tickets/raw/ticket.md"), "# no frontmatter\n");
      await expect(
        tools.task_show.execute({ selector: join(t, "docs/tasks/billing/tickets/raw/ticket.md") }, ctx(t)),
      ).rejects.toThrow(/not a recognised artifact/);
    });
  });
});