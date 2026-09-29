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
    "---\nkind: task\ntitle: Login\nslug: login\nstatus: stable\nworkflow_state: done\nslices:\n  - do-thing\n  - other-thing\nmap: auth\nstarted_at: 42\n---\n",
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
  // An arch-spec-only effort directory: the shared architecture spec with no
  // map, spec, tasks, or tickets.
  writeMd(join(base, "arch-only/arch-spec.md"), "type: arch spec\ntitle: Arch only\nstatus: draft\n");
  // The archive mirrors the live layout.
  writeMd(join(base, "archive/old-effort/map.md"), "type: map\ntitle: Old effort\nstatus: deprecated\n");
  writeMd(
    join(base, "archive/old-effort/tickets/old-ticket/ticket.md"),
    "type: ticket\nsubtype: feature\ntitle: Old ticket\nstatus: deprecated\nworkflow_state: done\n",
  );
}

/**
 * The v4 graph fixture: one effort with a spec, a task chain, a ticket chain,
 * a deprecated ticket, and an anomaly (a missing blocked_by target); a second
 * effort blocked on the first; and a spec-only effort.
 */
function seedGraphTree(t: string): void {
  const base = join(t, "docs/tasks");
  // Effort one: the anchor effort, with work in flight.
  writeMd(join(base, "billing/map.md"), "type: map\ntitle: Billing\nstatus: stable\n");
  writeMd(join(base, "billing/spec.md"), "type: spec\ntitle: Billing spec\nstatus: stable\n");
  writeMd(
    join(base, "billing/tasks/research-cache/task.md"),
    "type: task\nsubtype: research\ntitle: Research cache\nstatus: stable\nworkflow_state: done\nblocked_by: []\n",
  );
  writeMd(
    join(base, "billing/tasks/prototype-api/task.md"),
    "type: task\nsubtype: prototype\ntitle: Prototype API\nstatus: stable\nworkflow_state: todo\nblocked_by: [research-cache]\n",
  );
  writeMd(
    join(base, "billing/tickets/login-form/ticket.md"),
    "type: ticket\nsubtype: feature\ntitle: Login form\nstatus: stable\nworkflow_state: todo\nblocked_by: []\n",
  );
  writeMd(
    join(base, "billing/tickets/api-fix/ticket.md"),
    "type: ticket\nsubtype: bug\ntitle: Fix API\nstatus: stable\nworkflow_state: todo\nblocked_by: [login-form]\n",
  );
  // A deprecated ticket: done by definition, out of the graph, still reported.
  writeMd(
    join(base, "billing/tickets/legacy-shim/ticket.md"),
    "type: ticket\nsubtype: feature\ntitle: Legacy shim\nstatus: deprecated\nworkflow_state: done\n",
  );
  // An anomaly: a blocked_by target no artifact provides.
  writeMd(
    join(base, "billing/tickets/ghost-blocked/ticket.md"),
    "type: ticket\nsubtype: feature\ntitle: Ghost blocked\nstatus: stable\nworkflow_state: todo\nblocked_by: [ghost]\n",
  );
  // Effort two: blocked on effort one at the feature level.
  writeMd(join(base, "shipping/map.md"), "type: map\ntitle: Shipping\nstatus: stable\nblocked_by: [billing]\n");
  writeMd(
    join(base, "shipping/tickets/ship-form/ticket.md"),
    "type: ticket\nsubtype: feature\ntitle: Ship form\nstatus: stable\nworkflow_state: todo\nblocked_by: []\n",
  );
  // Effort three: a spec with zero tickets, the false-finalizable class.
  writeMd(join(base, "spec-only/spec.md"), "type: spec\ntitle: Spec only\nstatus: stable\n");
  // Effort four: a map and spec with all work done but zero tickets.
  writeMd(join(base, "spec-zero/map.md"), "type: map\ntitle: Spec zero\nstatus: stable\n");
  writeMd(join(base, "spec-zero/spec.md"), "type: spec\ntitle: Spec zero spec\nstatus: stable\n");
  writeMd(
    join(base, "spec-zero/tasks/decide/task.md"),
    "type: task\nsubtype: research\ntitle: Decide\nstatus: stable\nworkflow_state: done\n",
  );
  // Effort five: a map and spec with all work done and one ticket.
  writeMd(join(base, "done-effort/map.md"), "type: map\ntitle: Done effort\nstatus: stable\n");
  writeMd(join(base, "done-effort/spec.md"), "type: spec\ntitle: Done spec\nstatus: stable\n");
  writeMd(
    join(base, "done-effort/tasks/decide/task.md"),
    "type: task\nsubtype: research\ntitle: Decide\nstatus: stable\nworkflow_state: done\n",
  );
  writeMd(
    join(base, "done-effort/tickets/land/ticket.md"),
    "type: ticket\nsubtype: feature\ntitle: Land\nstatus: stable\nworkflow_state: done\n",
  );
  // An orphan: a task in an effort directory with neither map nor spec.
  writeMd(
    join(base, "orphan-effort/tasks/decide/task.md"),
    "type: task\nsubtype: research\ntitle: Decide\nstatus: stable\nworkflow_state: todo\n",
  );
  // An invalid combination: draft pairs only with todo.
  writeMd(
    join(base, "billing/tasks/draft-done/task.md"),
    "type: task\nsubtype: research\ntitle: Draft done\nstatus: draft\nworkflow_state: done\n",
  );
}

describe("task-workflow tools", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => { tools = createTools(); });

  describe("registration", () => {
    test("registers exactly the shrunken surface after the dead-surface deletion", () => {
      const names = Object.keys(tools).sort();
      expect(names).toEqual([
        "tw_context",
        "tw_dependency_levels",
        "tw_finalizable",
        "tw_frontier",
        "tw_get",
        "tw_list",
        "tw_map_finalizable",
        "tw_set",
        "tw_show",
        "tw_state",
        "tw_state_set",
      ]);
    });

    test("all tools have descriptions and execute functions", () => {
      for (const t of Object.values(tools)) {
        expect(typeof t.description).toBe("string");
        expect(typeof t.execute).toBe("function");
      }
    });
  });

  describe("tw_show", () => {
    test("shows task frontmatter by slug", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_show.execute({ selector: "login" }, ctx(t));
      expect(out).toContain("kind: task");
      expect(out).toContain("slug: login");
    });

    test("shows map frontmatter", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_show.execute({ selector: "auth" }, ctx(t));
      expect(out).toContain("kind: map");
    });

    test("shows slice frontmatter by slug", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_show.execute({ selector: "do-thing" }, ctx(t));
      expect(out).toContain("kind: slice");
      expect(out).toContain("slug: do-thing");
    });

    test("shows frontmatter with json flag", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_show.execute({ selector: "login", json: true }, ctx(t));
      const parsed = JSON.parse(out);
      expect(parsed.type).toBe("task");
      expect(parsed.slug).toBe("login");
    });

    test("throws on nonexistent slug", async () => {
      const t = mkTmp(); seedTree(t);
      await expect(tools.tw_show.execute({ selector: "nope" }, ctx(t))).rejects.toThrow();
    });
  });

  describe("tw_get", () => {
    test("returns a field value", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_get.execute({ selector: "login", field: "status" }, ctx(t));
      expect(out).toBe("stable");
    });

    test("returns empty string for missing field", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_get.execute({ selector: "login", field: "nonexistent" }, ctx(t));
      expect(out).toBe("");
    });
  });

  describe("tw_set", () => {
    test("sets a string value", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_set.execute({ selector: "login", field: "status", value: "in-progress" }, ctx(t));
      expect(out).toContain("in-progress");
      const got = await tools.tw_get.execute({ selector: "login", field: "status" }, ctx(t));
      expect(got).toBe("in-progress");
    });

    test("sets an int value", async () => {
      const t = mkTmp(); seedTree(t);
      await tools.tw_set.execute({ selector: "login", field: "started_at", value: "42" }, ctx(t));
      const got = await tools.tw_get.execute({ selector: "login", field: "started_at" }, ctx(t));
      expect(got).toBe("42");
    });

    test("sets a bool value", async () => {
      const t = mkTmp(); seedTree(t);
      await tools.tw_set.execute({ selector: "login", field: "flag", value: "true" }, ctx(t));
      const got = await tools.tw_get.execute({ selector: "login", field: "flag" }, ctx(t));
      expect(got).toBe("true");
    });

    test("sets null value", async () => {
      const t = mkTmp(); seedTree(t);
      await tools.tw_set.execute({ selector: "login", field: "map", value: "null" }, ctx(t));
      const got = await tools.tw_get.execute({ selector: "login", field: "map" }, ctx(t));
      expect(got).toBe("null");  // tw_get returns String(null) = "null"
    });

    test("persists to disk", async () => {
      const t = mkTmp(); seedTree(t);
      await tools.tw_set.execute({ selector: "login", field: "status", value: "done" }, ctx(t));
      const onDisk = require("fs").readFileSync(join(t, "docs/tasks/login/task.md"), "utf-8");
      expect(onDisk).toContain("status: done");
    });
  });

  describe("tw_set_slices", () => {
    test("sets the slices list", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_set_slices.execute({ selector: "login", slugs: ["a", "b", "c"] }, ctx(t));
      expect(out).toContain("a, b, c");
    });

    test("replaces existing list", async () => {
      const t = mkTmp(); seedTree(t);
      await tools.tw_set_slices.execute({ selector: "login", slugs: ["x"] }, ctx(t));
      const got = await tools.tw_get.execute({ selector: "login", field: "slices" }, ctx(t));
      expect(got).toContain("x");
      expect(got).not.toContain("do-thing");
    });

    test("accepts empty list", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_set_slices.execute({ selector: "login", slugs: [] }, ctx(t));
      expect(out).toContain("slices:");  // the tool's return message
      const got = await tools.tw_get.execute({ selector: "login", field: "slices" }, ctx(t));
      // String([]) = "", so check the tool's return instead
      expect(got).toBeDefined();
    });
  });

  describe("tw_resolve", () => {
    test("resolves task slug", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_resolve.execute({ selector: "login" }, ctx(t));
      expect(out).toContain("login/task.md");
    });

    test("resolves map slug with kind filter", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_resolve.execute({ selector: "auth", kind: "map" }, ctx(t));
      expect(out).toContain("maps/auth/map.md");
    });

    test("resolves slice slug", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_resolve.execute({ selector: "do-thing" }, ctx(t));
      expect(out).toContain("do-thing.md");
    });

    test("throws for nonexistent slug", async () => {
      const t = mkTmp(); seedTree(t);
      await expect(tools.tw_resolve.execute({ selector: "nope" }, ctx(t))).rejects.toThrow();
    });
  });

  describe("tw_assert_kind", () => {
    test("passes on match", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_assert_kind.execute({ selector: "login", kind: "task" }, ctx(t));
      expect(out).toContain("OK");
    });

    test("fails on mismatch", async () => {
      const t = mkTmp(); seedTree(t);
      await expect(tools.tw_assert_kind.execute({ selector: "login", kind: "map" }, ctx(t))).rejects.toThrow(/not/);
    });

    test("passes for slice kind", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_assert_kind.execute({ selector: "do-thing", kind: "slice" }, ctx(t));
      expect(out).toContain("OK");
    });
  });

  describe("tw_list", () => {
    test("lists all non-archived artifacts", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_list.execute({}, ctx(t));
      expect(out).toContain("login");
      expect(out).toContain("config");
      expect(out).toContain("auth");
      expect(out).not.toContain("done-task");  // archived
    });

    test("filters by kind", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_list.execute({ kind: "map" }, ctx(t));
      expect(out).toContain("auth");
      expect(out).not.toContain("login");
    });

    test("filters by status", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_list.execute({ status: "stable" }, ctx(t));
      expect(out).toContain("login");
      expect(out).not.toContain("config");
    });

    test("filters by effort", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_list.execute({ effort: "auth" }, ctx(t));
      expect(out).toContain("login");
      expect(out).not.toContain("config");
    });

    test("json flag returns structured data", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_list.execute({ json: true }, ctx(t));
      const parsed = JSON.parse(out);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("tw_slices", () => {
    test("lists active slices", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_slices.execute({ selector: "login" }, ctx(t));
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
      const out = await tools.tw_slices.execute({ selector: "empty" }, ctx(t));
      expect(out).toContain("no open slices");
    });

    test("json flag returns structured data", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_slices.execute({ selector: "login", json: true }, ctx(t));
      const parsed = JSON.parse(out);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
    });
  });

  describe("tw_finalizable", () => {
    test("rejects when slices are open", async () => {
      const t = mkTmp(); seedTree(t);
      // The v3 fixture carries workflow_state: done, so the primary status
      // check passes and the secondary slice-count gate is what fires.
      await expect(tools.tw_finalizable.execute({ selector: "login" }, ctx(t))).rejects.toThrow(/open slice/);
    });

    test("passes when no slices remain", async () => {
      const t = mkTmp(); seedTree(t);
      // Archive all slices
      rmSync(join(t, "docs/tasks/login/slices/1-do-thing.md"));
      rmSync(join(t, "docs/tasks/login/slices/2-other-thing.md"));
      const out = await tools.tw_finalizable.execute({ selector: "login" }, ctx(t));
      expect(out).toContain("ready to finalize");
    });
  });

  describe("tw_dependency_levels", () => {
    test("returns levels for a task with dependencies", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_dependency_levels.execute({ selector: "login" }, ctx(t));
      const parsed = JSON.parse(out);
      expect(parsed).toHaveProperty("levels");
      expect(parsed).toHaveProperty("remaining_count");
      expect(parsed).toHaveProperty("done_count");
    });

    test("first level has independent slices", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_dependency_levels.execute({ selector: "login" }, ctx(t));
      const parsed = JSON.parse(out);
      expect(parsed.levels[0]).toContain("do-thing");
    });

    test("last level has dependent slices", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_dependency_levels.execute({ selector: "login" }, ctx(t));
      const parsed = JSON.parse(out);
      const last = parsed.levels[parsed.levels.length - 1];
      expect(last).toContain("other-thing");
    });
  });

  describe("tw_frontier", () => {
    test("lists unblocked map children by task type", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_frontier.execute({ selector: "auth" }, ctx(t));
      expect(out).toContain("login");
      expect(out).not.toContain("sso");
    });

    test("returns structured frontier data", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_frontier.execute({ selector: "auth", json: true }, ctx(t));
      const parsed = JSON.parse(out);
      expect(parsed.map((item: any) => item.slug)).toContain("login");
    });
  });

  describe("tw_map_tasks", () => {
    test("lists children", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_map_tasks.execute({ selector: "auth" }, ctx(t));
      expect(out).toContain("login");
      expect(out).toContain("sso");
    });

    test("json flag returns structured", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_map_tasks.execute({ selector: "auth", json: true }, ctx(t));
      const parsed = JSON.parse(out);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
    });
  });

  describe("tw_map_tick", () => {
    test("marks a child done", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_map_tick.execute({ selector: "auth", task_slug: "login" }, ctx(t));
      expect(out).toContain("done");
    });

    test("throws for nonexistent child", async () => {
      const t = mkTmp(); seedTree(t);
      await expect(tools.tw_map_tick.execute({ selector: "auth", task_slug: "nope" }, ctx(t))).rejects.toThrow();
    });
  });

  describe("tw_map_finalizable", () => {
    test("rejects when children remain", async () => {
      const t = mkTmp(); seedTree(t);
      await expect(tools.tw_map_finalizable.execute({ selector: "auth" }, ctx(t))).rejects.toThrow(/unfinished/);
    });

    test("passes when all children done", async () => {
      const t = mkTmp(); seedTree(t);
      await tools.tw_map_tick.execute({ selector: "auth", task_slug: "login" }, ctx(t));
      await tools.tw_map_tick.execute({ selector: "auth", task_slug: "sso" }, ctx(t));
      const out = await tools.tw_map_finalizable.execute({ selector: "auth" }, ctx(t));
      expect(out).toContain("ready to finalize");
    });
  });

  describe("tw_state", () => {
    test("shows both map and task pointers on a fresh tree", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_state.execute({}, ctx(t));
      expect(out).toContain("map:");
      expect(out).toContain("task:");
      expect(out).toContain("(none)");
    });

    test("reflects saved state: both pointers shown", async () => {
      const t = mkTmp(); seedTree(t);
      await tools.tw_state_set.execute({ field: "map", value: "auth" }, ctx(t));
      await tools.tw_state_set.execute({ field: "task", value: "login" }, ctx(t));
      const out = await tools.tw_state.execute({}, ctx(t));
      expect(out).toMatch(/map:\s+auth/);
      expect(out).toMatch(/task:\s+login/);
    });
  });

  describe("tw_state_set", () => {
    test("sets the map field", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_state_set.execute({ field: "map", value: "auth" }, ctx(t));
      expect(out).toContain("auth");
      const show = await tools.tw_state.execute({}, ctx(t));
      expect(show).toMatch(/map:\s+auth/);
    });

    test("sets the task field", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_state_set.execute({ field: "task", value: "login" }, ctx(t));
      expect(out).toContain("login");
    });

    test("fresh repo: first write creates state.yaml with real nulls", async () => {
      const t = mkTmp(); seedTree(t);
      const before = existsSync(join(t, "docs/tasks/state.yaml"));
      expect(before).toBe(false);
      await tools.tw_state_set.execute({ field: "task", value: "login" }, ctx(t));
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
      await tools.tw_state_set.execute({ field: "task", value: "login" }, ctx(t));
      const out = await tools.tw_state_set.execute({ field: "task", value: "null" }, ctx(t));
      expect(out).toContain("task = null");
      const text = readFileSync(join(t, "docs/tasks/state.yaml"), "utf-8");
      expect(text).not.toContain("None");
      const parsed = YAML.parse(text) as Record<string, unknown>;
      expect(parsed.task).toBeNull();
      const show = await tools.tw_state.execute({}, ctx(t));
      expect(show).toContain("(none)");
    });

    test("the demonstrated bug: a planted schema_version key survives a state write", async () => {
      const t = mkTmp(); seedTree(t);
      mkdirSync(join(t, "docs/tasks"), { recursive: true });
      writeFileSync(join(t, "docs/tasks/state.yaml"), "map: null\ntask: null\nschema_version: 3\n");
      await tools.tw_state_set.execute({ field: "task", value: "login" }, ctx(t));
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
      await tools.tw_state_set.execute({ field: "task", value: "sso" }, ctx(t));
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
      await tools.tw_state_set.execute({ field: "task", value: "login" }, ctx(t));
      await tools.tw_state_set.execute({ field: "map", value: "auth" }, ctx(t));
      const parsed = YAML.parse(readFileSync(join(t, "docs/tasks/state.yaml"), "utf-8")) as Record<string, unknown>;
      expect(parsed.schema_version).toBe(3);
      expect(parsed.map).toBe("auth");
      expect(parsed.task).toBe("login");
    });

    test("empty or comment-only state.yaml yields defaults and the next write recreates the file", async () => {
      const t = mkTmp(); seedTree(t);
      writeFileSync(join(t, "docs/tasks/state.yaml"), "# only a comment\n");
      const show = await tools.tw_state.execute({}, ctx(t));
      expect(show).toMatch(/map:\s+\(none\)/);
      expect(show).toMatch(/task:\s+\(none\)/);
      await tools.tw_state_set.execute({ field: "task", value: "login" }, ctx(t));
      const parsed = YAML.parse(readFileSync(join(t, "docs/tasks/state.yaml"), "utf-8")) as Record<string, unknown>;
      expect(parsed.map).toBeNull();
      expect(parsed.task).toBe("login");
    });

    test("rejects the legacy slice field with an error naming map and task", async () => {
      const t = mkTmp(); seedTree(t);
      await expect(
        tools.tw_state_set.execute({ field: "slice", value: "do-thing" }, ctx(t)),
      ).rejects.toThrow(/map.*task|task.*map/s);
    });

    test("rejects any other unknown field with an error naming map and task", async () => {
      const t = mkTmp(); seedTree(t);
      await expect(
        tools.tw_state_set.execute({ field: "bad", value: "x" }, ctx(t)),
      ).rejects.toThrow(/map.*task|task.*map/s);
    });

    test("rejects the literal string 'None' as a pointer value on either pointer", async () => {
      const t = mkTmp(); seedTree(t);
      await expect(
        tools.tw_state_set.execute({ field: "task", value: "None" }, ctx(t)),
      ).rejects.toThrow(/None/);
      await expect(
        tools.tw_state_set.execute({ field: "map", value: "None" }, ctx(t)),
      ).rejects.toThrow(/None/);
    });
  });

  describe("tw_context", () => {
    test("returns schema reference", async () => {
      const t = mkTmp(); seedTree(t);
      const out = await tools.tw_context.execute({}, ctx(t));
      expect(out).toContain("Frontmatter schema");
      expect(out).toContain("type: task");
    });

    test("includes profile when present", async () => {
      const t = mkTmp(); seedTree(t);
      mkdirSync(join(t, "docs/tasks"), { recursive: true });
      writeFileSync(join(t, "docs/tasks/profile.md"), "# Profile\nCI: test\n");
      const out = await tools.tw_context.execute({}, ctx(t));
      expect(out).toContain("Project profile");
      expect(out).toContain("CI: test");
    });
  });

  describe("slice resolution", () => {
    test("tw_set works on slices by slug", async () => {
      const t = mkTmp(); seedTree(t);
      await tools.tw_set.execute({ selector: "do-thing", field: "status", value: "in-progress" }, ctx(t));
      const got = await tools.tw_get.execute({ selector: "do-thing", field: "status" }, ctx(t));
      expect(got).toBe("in-progress");
    });

    test("tw_show works on slices by path", async () => {
      const t = mkTmp(); seedTree(t);
      const path = join(t, "docs/tasks/login/slices/1-do-thing.md");
      const out = await tools.tw_show.execute({ selector: path }, ctx(t));
      expect(out).toContain("slug: do-thing");
    });
  });
});

describe("task-workflow tools: tw_list on the v4 effort-grouped tree", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => { tools = createTools(); });

  test("lists tasks, tickets, maps, and specs, excluding archived", async () => {
    const t = mkTmp(); seedV4Tree(t);
    const out = await tools.tw_list.execute({}, ctx(t));
    expect(out).toContain("research-cache");
    expect(out).toContain("login-form");
    expect(out).toContain("billing");
    expect(out).not.toContain("old-effort");
  });

  test("filters by kind: ticket", async () => {
    const t = mkTmp(); seedV4Tree(t);
    const out = await tools.tw_list.execute({ kind: "ticket" }, ctx(t));
    expect(out).toContain("login-form");
    expect(out).toContain("api-fix");
    expect(out).not.toContain("research-cache");
  });

  test("filters by effort", async () => {
    const t = mkTmp(); seedV4Tree(t);
    const out = await tools.tw_list.execute({ effort: "billing" }, ctx(t));
    expect(out).toContain("login-form");
    expect(out).toContain("research-cache");
    expect(out).not.toContain("spec-only");
  });

  test("filters by workflow_state", async () => {
    const t = mkTmp(); seedV4Tree(t);
    const out = await tools.tw_list.execute({ workflow_state: "ready" }, ctx(t));
    expect(out).toContain("prototype-api");
    expect(out).toContain("login-form");
    expect(out).not.toContain("api-fix");
  });

  test("rows show type/subtype and the workflow state", async () => {
    const t = mkTmp(); seedV4Tree(t);
    const out = await tools.tw_list.execute({}, ctx(t));
    expect(out).toContain("login-form (ticket/feature)");
    expect(out).toContain("research-cache (task/research)");
    // Maps carry no workflow_state: the status is the fallback.
    expect(out).toContain("billing (map)");
  });

  test("json rows carry slug, type, subtype, status, workflow_state, effort, path", async () => {
    const t = mkTmp(); seedV4Tree(t);
    const out = await tools.tw_list.execute({ json: true }, ctx(t));
    const parsed = JSON.parse(out);
    // The login-form directory also carries an aux findings file; select the
    // ticket row.
    const row = parsed.find((r: any) => r.slug === "login-form" && r.type === "ticket");
    expect(row).toMatchObject({
      slug: "login-form",
      type: "ticket",
      subtype: "feature",
      status: "stable",
      workflow_state: "ready",
      effort: "billing",
    });
    expect(row.path).toMatch(/ticket\.md$/);
  });
});

describe("task-workflow tools: scan-based graph tools", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => { tools = createTools(); });

  describe("tw_frontier on an effort map", () => {
    test("lists the per-kind frontier and omits the deprecated ticket", async () => {
      const t = mkTmp(); seedGraphTree(t);
      const out = await tools.tw_frontier.execute({ selector: "billing" }, ctx(t));
      const frontierSection = out.split("## ")[0]!;
      expect(frontierSection).toContain("prototype-api");
      expect(frontierSection).toContain("login-form");
      expect(frontierSection).toContain("ghost-blocked");
      expect(frontierSection).not.toContain("api-fix");
      expect(frontierSection).not.toContain("legacy-shim");
      expect(frontierSection).not.toContain("research-cache");
    });

    test("appends the anomalies block", async () => {
      const t = mkTmp(); seedGraphTree(t);
      const out = await tools.tw_frontier.execute({ selector: "billing" }, ctx(t));
      expect(out).toContain("## Anomalies");
      expect(out).toContain("[missing-blocked-by-target]");
      expect(out).toContain("ghost");
    });

    test("reports anomalies under --json too", async () => {
      const t = mkTmp(); seedGraphTree(t);
      const out = await tools.tw_frontier.execute({ selector: "billing", json: true }, ctx(t));
      const parsed = JSON.parse(out);
      expect(parsed.anomalies.length).toBeGreaterThan(0);
      expect(parsed.anomalies.map((a: any) => a.kind)).toContain("missing-blocked-by-target");
    });
  });

  describe("tw_frontier on the tasks root", () => {
    test("the blocked second effort is absent until the first is done", async () => {
      const t = mkTmp(); seedGraphTree(t);
      const root = join(t, "docs/tasks");
      const out = await tools.tw_frontier.execute({ selector: root }, ctx(t));
      expect(out).toContain("billing");
      expect(out).not.toContain("shipping");
    });

    test("the blocked second effort appears once the first is done", async () => {
      const t = mkTmp(); seedGraphTree(t);
      const root = join(t, "docs/tasks");
      // Finish every billing item, including the anomaly fixture.
      for (const slug of ["prototype-api", "login-form", "api-fix", "ghost-blocked", "legacy-shim"]) {
        const p = join(t, `docs/tasks/billing/tickets/${slug}/ticket.md`);
        const direct = join(t, `docs/tasks/billing/tasks/${slug}/task.md`);
        const file = existsSync(p) ? p : direct;
        writeFileSync(file, readFileSync(file, "utf-8").replace("workflow_state: todo", "workflow_state: done"), "utf-8");
      }
      const out = await tools.tw_frontier.execute({ selector: root }, ctx(t));
      expect(out).toContain("shipping");
    });
  });

  describe("tw_dependency_levels on an effort map", () => {
    test("levels tasks and tickets independently", async () => {
      const t = mkTmp(); seedGraphTree(t);
      const out = await tools.tw_dependency_levels.execute({ selector: "billing" }, ctx(t));
      const parsed = JSON.parse(out);
      expect(parsed.tasks).toEqual([["prototype-api"]]);
      expect(parsed.tickets[0]).toEqual(expect.arrayContaining(["login-form", "ghost-blocked"]));
      expect(parsed.tickets[parsed.tickets.length - 1]).toEqual(["api-fix"]);
      expect(parsed.remaining_count).toBe(4);
      expect(parsed.done_count).toBe(3);
    });
  });

  describe("tw_map_finalizable", () => {
    test("refuses a spec-plus-zero-tickets effort, naming the rule", async () => {
      const t = mkTmp(); seedGraphTree(t);
      await expect(
        tools.tw_map_finalizable.execute({ selector: "spec-zero" }, ctx(t)),
      ).rejects.toThrow(/ticket/);
    });

    test("passes an all-done effort with a spec and one ticket", async () => {
      const t = mkTmp(); seedGraphTree(t);
      const out = await tools.tw_map_finalizable.execute({ selector: "done-effort" }, ctx(t));
      expect(out).toContain("ready to finalize");
    });

    test("names the unfinished items when work remains", async () => {
      const t = mkTmp(); seedGraphTree(t);
      await expect(
        tools.tw_map_finalizable.execute({ selector: "billing" }, ctx(t)),
      ).rejects.toThrow(/prototype-api/);
    });

    test("the spec-only false-finalizable fixture reads as unfinished", async () => {
      const t = mkTmp(); seedGraphTree(t);
      // The spec-only effort has no map, so it is not a map selector target.
      // The reachable false-finalizable case is the map-plus-spec effort whose
      // only child is a spec: it must be refused, naming the ticket rule.
      await expect(
        tools.tw_map_finalizable.execute({ selector: "spec-zero" }, ctx(t)),
      ).rejects.toThrow(/ticket/);
      // And the spec-only effort contributes no unfinished work to the root
      // frontier: it is not silently reported as ready either.
      const out = await tools.tw_frontier.execute({ selector: join(t, "docs/tasks") }, ctx(t));
      expect(out).not.toContain("spec-only");
    });
  });

  describe("tw_finalizable", () => {
    test("passes a done ticket and names the state otherwise", async () => {
      const t = mkTmp(); seedGraphTree(t);
      const out = await tools.tw_finalizable.execute({ selector: "research-cache" }, ctx(t));
      expect(out).toContain("ready to finalize");
      await expect(
        tools.tw_finalizable.execute({ selector: "prototype-api" }, ctx(t)),
      ).rejects.toThrow(/todo/);
    });

    test("still surfaces the v3 slice contradiction", async () => {
      const t = mkTmp(); seedTree(t);
      await expect(tools.tw_finalizable.execute({ selector: "login" }, ctx(t))).rejects.toThrow(/open slice/);
    });

    test("falls back to status: done on the live v3 shape (no workflow_state)", async () => {
      const t = mkTmp();
      // The live v3 tree carries status only, never workflow_state. The
      // pre-overhaul tool returned "ready to finalize" for these; the
      // status-based rewrite must keep serving them.
      writeMd(
        join(t, "docs/tasks/legacy-done/task.md"),
        "kind: task\ntitle: Legacy done\nslug: legacy-done\nstatus: done\nslices: []\nmap: auth\n",
      );
      writeMd(
        join(t, "docs/tasks/legacy-open/task.md"),
        "kind: task\ntitle: Legacy open\nslug: legacy-open\nstatus: ready\nslices: []\nmap: auth\n",
      );
      const out = await tools.tw_finalizable.execute({ selector: "legacy-done" }, ctx(t));
      expect(out).toContain("ready to finalize");
      await expect(
        tools.tw_finalizable.execute({ selector: "legacy-open" }, ctx(t)),
      ).rejects.toThrow(/ready/);
    });
  });

  describe("anomaly classes are reported, never silently dropped", () => {
    test("an orphan is reported", async () => {
      const t = mkTmp(); seedGraphTree(t);
      const out = await tools.tw_frontier.execute({ selector: join(t, "docs/tasks") }, ctx(t));
      expect(out).toContain("[orphan]");
      expect(out).toContain("orphan-effort");
    });

    test("a missing blocked_by target is reported", async () => {
      const t = mkTmp(); seedGraphTree(t);
      const out = await tools.tw_frontier.execute({ selector: "billing" }, ctx(t));
      expect(out).toContain("[missing-blocked-by-target]");
    });

    test("an invalid status/workflow_state combination is reported", async () => {
      const t = mkTmp(); seedGraphTree(t);
      const out = await tools.tw_frontier.execute({ selector: "billing" }, ctx(t));
      expect(out).toContain("[invalid-combination]");
    });

    test("a deprecated artifact treated as done is reported", async () => {
      const t = mkTmp(); seedGraphTree(t);
      const out = await tools.tw_frontier.execute({ selector: "billing", json: true }, ctx(t));
      const parsed = JSON.parse(out);
      expect(parsed.frontier.map((a: any) => a.slug)).not.toContain("legacy-shim");
      expect(parsed.deprecated.map((a: any) => a.slug)).toContain("legacy-shim");
    });

    test("a deprecated artifact is reported in the text output too", async () => {
      const t = mkTmp(); seedGraphTree(t);
      const out = await tools.tw_frontier.execute({ selector: "billing" }, ctx(t));
      expect(out).toContain("legacy-shim");
      expect(out).toMatch(/deprecated/i);
    });

    test("dependency levels carry the deprecated set", async () => {
      const t = mkTmp(); seedGraphTree(t);
      const out = await tools.tw_dependency_levels.execute({ selector: "billing" }, ctx(t));
      const parsed = JSON.parse(out);
      expect(parsed.deprecated.map((a: any) => a.slug)).toContain("legacy-shim");
    });

    test("map finalizable reports the deprecated set once everything is done", async () => {
      const t = mkTmp(); seedGraphTree(t);
      // Finish every open item: the effort goes finalizable with the
      // deprecated ticket still visible.
      const open = [
        "tasks/prototype-api/task.md",
        "tickets/login-form/ticket.md",
        "tickets/api-fix/ticket.md",
        "tickets/ghost-blocked/ticket.md",
      ];
      for (const rel of open) {
        const file = join(t, "docs/tasks/billing", rel);
        writeFileSync(file, readFileSync(file, "utf-8").replace("workflow_state: todo", "workflow_state: done"), "utf-8");
      }
      const out = await tools.tw_map_finalizable.execute({ selector: "billing" }, ctx(t));
      expect(out).toContain("ready to finalize");
      expect(out).toContain("legacy-shim");
    });
  });

  describe("tw_context schema reference", () => {
    test("describes the v4 types, fields, and two-phase flow", async () => {
      const t = mkTmp(); seedGraphTree(t);
      const out = await tools.tw_context.execute({}, ctx(t));
      expect(out).toContain("subtype");
      expect(out).toContain("workflow_state");
      expect(out).toContain("mode");
      expect(out).toContain("size");
      expect(out).toContain("ticket");
      expect(out).toMatch(/to-tickets|ticket generation/i);
    });

    test("carries no slice block and no killed fields", async () => {
      const t = mkTmp(); seedGraphTree(t);
      const out = await tools.tw_context.execute({}, ctx(t));
      expect(out).not.toContain("kind:");
      expect(out).not.toContain("slices:");
      expect(out).not.toContain("started_at");
      expect(out).not.toContain("completed_at");
      expect(out).not.toMatch(/no separate ticket-generation phase/i);
    });
  });
});

describe("task-workflow tools: v4 effort-grouped tree", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => { tools = createTools(); });

  describe("resolution by slug and by path", () => {
    test("resolves the effort map by slug", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.tw_show.execute({ selector: "billing" }, ctx(t));
      expect(out).toContain("type: map");
    });

    test("resolves the effort map by path", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.tw_show.execute({ selector: join(t, "docs/tasks/billing/map.md") }, ctx(t));
      expect(out).toContain("type: map");
    });

    test("resolves the effort directory to its map", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.tw_show.execute({ selector: join(t, "docs/tasks/billing") }, ctx(t));
      expect(out).toContain("type: map");
    });

    test("resolves a task by slug", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.tw_show.execute({ selector: "research-cache" }, ctx(t));
      expect(out).toContain("type: task");
    });

    test("resolves a ticket by slug", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.tw_show.execute({ selector: "login-form" }, ctx(t));
      expect(out).toContain("type: ticket");
    });

    test("resolves a ticket by path", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.tw_show.execute({ selector: join(t, "docs/tasks/billing/tickets/login-form/ticket.md") }, ctx(t));
      expect(out).toContain("type: ticket");
    });

    test("resolves the spec by slug", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.tw_show.execute({ selector: join(t, "docs/tasks/billing/spec.md") }, ctx(t));
      expect(out).toContain("type: spec");
    });

    test("resolves a spec-only effort directory", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.tw_show.execute({ selector: join(t, "docs/tasks/spec-only") }, ctx(t));
      expect(out).toContain("type: spec");
    });

    test("resolves a deviated aux file", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.tw_show.execute(
        { selector: join(t, "docs/tasks/billing/tickets/login-form/deviation-reports/1-split.md") },
        ctx(t),
      );
      expect(out).toContain("type: deviation report");
    });

    test("resolves the archived effort map", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.tw_show.execute({ selector: join(t, "docs/tasks/archive/old-effort/map.md") }, ctx(t));
      expect(out).toContain("Old effort");
    });

    test("resolves an arch-spec-only effort directory", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.tw_show.execute({ selector: join(t, "docs/tasks/arch-only") }, ctx(t));
      expect(out).toContain("type: arch spec");
    });

    test("honors the wanted type on a directory selector holding map and spec", async () => {
      const t = mkTmp(); seedV4Tree(t);
      // billing/ holds both map.md and spec.md. A want:"map" tool must pick
      // map.md rather than erroring on whichever leaf it finds first: the
      // scan-based check reports the effort's unfinished work, which only the
      // map's effort can produce.
      await expect(
        tools.tw_map_finalizable.execute({ selector: join(t, "docs/tasks/billing") }, ctx(t)),
      ).rejects.toThrow(/unfinished/);
    });

    test("errors naming the wanted type when a directory has no such artifact", async () => {
      const t = mkTmp(); seedV4Tree(t);
      await expect(
        tools.tw_map_finalizable.execute({ selector: join(t, "docs/tasks/spec-only") }, ctx(t)),
      ).rejects.toThrow(/map/);
    });

    test("errors naming both paths when a slug is ambiguous within one type", async () => {
      const t = mkTmp(); seedV4Tree(t);
      // Two tickets share the slug 'dup' in different efforts.
      mkdirSync(join(t, "docs/tasks/other/tickets/dup"), { recursive: true });
      writeMd(join(t, "docs/tasks/other/tickets/dup/ticket.md"), "type: ticket\ntitle: Dup\nsubtype: feature\nstatus: stable\nworkflow_state: todo\n");
      mkdirSync(join(t, "docs/tasks/billing/tickets/dup"), { recursive: true });
      writeMd(join(t, "docs/tasks/billing/tickets/dup/ticket.md"), "type: ticket\ntitle: Dup\nsubtype: feature\nstatus: stable\nworkflow_state: todo\n");
      await expect(tools.tw_show.execute({ selector: "dup" }, ctx(t))).rejects.toThrow(/ambiguous/);
    });
  });

  describe("tw_get on new-shape artifacts", () => {
    test("reads a field from a ticket", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.tw_get.execute({ selector: "login-form", field: "subtype" }, ctx(t));
      expect(out).toBe("feature");
    });

    test("reads a field from a spec", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.tw_get.execute({ selector: join(t, "docs/tasks/billing/spec.md"), field: "title" }, ctx(t));
      expect(out).toBe("Billing spec");
    });

    test("reads a field from a map", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.tw_get.execute({ selector: "billing", field: "status" }, ctx(t));
      expect(out).toBe("draft");
    });

    test("reads a field from a task", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.tw_get.execute({ selector: "prototype-api", field: "workflow_state" }, ctx(t));
      expect(out).toBe("ready");
    });

    test("reads a field from an aux findings file", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.tw_get.execute(
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
        tools.tw_resolve.execute({ selector: "login-form", kind: "map" }, ctx(t)),
      ).rejects.toThrow(/ticket.*map|map.*ticket/s);
    });

    test("a wanted task against a ticket slug errors naming the actual type", async () => {
      const t = mkTmp(); seedV4Tree(t);
      await expect(
        tools.tw_resolve.execute({ selector: "login-form", kind: "task" }, ctx(t)),
      ).rejects.toThrow(/ticket/);
    });

    test("a wanted map against a task slug errors naming the actual type", async () => {
      const t = mkTmp(); seedV4Tree(t);
      await expect(
        tools.tw_resolve.execute({ selector: "research-cache", kind: "map" }, ctx(t)),
      ).rejects.toThrow(/task/);
    });

    test("a wanted map against a task slug does not silently return the task", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const out = await tools.tw_resolve.execute({ selector: "research-cache", kind: "task" }, ctx(t));
      expect(out).toContain("tasks/research-cache/task.md");
    });

    test("resolves each type when the wanted type matches", async () => {
      const t = mkTmp(); seedV4Tree(t);
      expect(await tools.tw_resolve.execute({ selector: "billing", kind: "map" }, ctx(t))).toContain("map.md");
      expect(await tools.tw_resolve.execute({ selector: "login-form", kind: "ticket" }, ctx(t))).toContain("ticket.md");
      expect(await tools.tw_resolve.execute({ selector: "research-cache", kind: "task" }, ctx(t))).toContain("task.md");
    });

    test("an unresolvable slug names the wanted type", async () => {
      const t = mkTmp(); seedV4Tree(t);
      await expect(
        tools.tw_resolve.execute({ selector: "ghost", kind: "ticket" }, ctx(t)),
      ).rejects.toThrow(/no ticket matches 'ghost'/);
    });

    test("an unresolvable slug with no wanted type stays generic", async () => {
      const t = mkTmp(); seedV4Tree(t);
      await expect(
        tools.tw_resolve.execute({ selector: "ghost" }, ctx(t)),
      ).rejects.toThrow(/no artifact matches 'ghost'/);
    });
  });

  describe("mixed tree", () => {
    test("both shapes coexist and both resolve", async () => {
      const t = mkTmp(); seedTree(t); seedV4Tree(t);
      const old = await tools.tw_show.execute({ selector: "login" }, ctx(t));
      expect(old).toContain("kind: task");
      const fresh = await tools.tw_show.execute({ selector: "login-form" }, ctx(t));
      expect(fresh).toContain("type: ticket");
    });

    test("a v3 slice still resolves by slug", async () => {
      const t = mkTmp(); seedTree(t); seedV4Tree(t);
      const out = await tools.tw_show.execute({ selector: "do-thing" }, ctx(t));
      expect(out).toContain("kind: slice");
    });
  });

  describe("error cases", () => {
    test("an empty effort directory produces a clear error, not a crash", async () => {
      const t = mkTmp(); seedV4Tree(t);
      mkdirSync(join(t, "docs/tasks/empty-effort"), { recursive: true });
      await expect(
        tools.tw_show.execute({ selector: join(t, "docs/tasks/empty-effort") }, ctx(t)),
      ).rejects.toThrow(/not a recognised artifact/);
    });

    test("an empty frontmatter block produces a clear error, not a crash", async () => {
      const t = mkTmp(); seedV4Tree(t);
      writeMd(join(t, "docs/tasks/billing/tickets/blank/ticket.md"), "title: Blank\n");
      await expect(
        tools.tw_show.execute({ selector: join(t, "docs/tasks/billing/tickets/blank/ticket.md") }, ctx(t)),
      ).rejects.toThrow(/type/);
    });

    test("a file with no frontmatter at all produces a clear error", async () => {
      const t = mkTmp(); seedV4Tree(t);
      mkdirSync(join(t, "docs/tasks/billing/tickets/raw"), { recursive: true });
      writeFileSync(join(t, "docs/tasks/billing/tickets/raw/ticket.md"), "# no frontmatter\n");
      await expect(
        tools.tw_show.execute({ selector: join(t, "docs/tasks/billing/tickets/raw/ticket.md") }, ctx(t)),
      ).rejects.toThrow(/not a recognised artifact/);
    });
  });
});
