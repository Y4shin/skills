/**
 * Comprehensive unit tests for task-workflow tools.
 * Tests every tool directly via createTools() with no pi runtime.
 */

import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";
import YAML from "yaml";
import { createTools } from "../src/pi.js";
import { parse, dump } from "../src/core/frontmatter.js";
import {
  MAP_SECTION_NON_GOALS,
  MAP_SECTION_NON_NEGOTIABLE_FACTS,
  readMapSection,
} from "../src/core/art.js";
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
    test("registers exactly the disclosed surface: the gated workflow tools plus the dispatcher trio", () => {
      const names = Object.keys(tools).sort();
      expect(names).toEqual([
        "tw_close",
        "tw_context",
        "tw_dependency_levels",
        "tw_finalizable",
        "tw_finalize_map",
        "tw_frontier",
        "tw_get",
        "tw_list",
        "tw_map_finalizable",
        "tw_mark_done",
        "tw_next",
        "tw_open",
        "tw_resolve_uncertainty",
        "tw_show",
        "tw_state",
        "tw_state_set",
        "tw_write_section",
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

  describe("tw_finalizable", () => {
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
    test("v3 fallback: computes levels from a map's child array", async () => {
      const t = mkTmp(); seedTree(t);
      // sso exists only as a map-array entry; a task file makes it resolvable
      // so the fallback computes a real two-level chain.
      writeMd(join(t, "docs/tasks/sso/task.md"), "kind: task\ntitle: SSO\nslug: sso\nstatus: todo\nslices: []\nmap: auth\n");
      const out = await tools.tw_dependency_levels.execute({ selector: "auth" }, ctx(t));
      const parsed = JSON.parse(out);
      expect(parsed.levels).toEqual([["login"], ["sso"]]);
      expect(parsed.remaining_count).toBe(2);
      expect(parsed.done_count).toBe(0);
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

  describe("tw_map_finalizable", () => {
    test("rejects when children remain", async () => {
      const t = mkTmp(); seedTree(t);
      await expect(tools.tw_map_finalizable.execute({ selector: "auth" }, ctx(t))).rejects.toThrow(/unfinished/);
    });

    test("passes when all children done", async () => {
      const t = mkTmp(); seedTree(t);
      // The map's array is edited directly: the tick tool died with the v4
      // layout, the array fallback is what still serves this v3 map.
      const mapPath = join(t, "docs/tasks/maps/auth/map.md");
      writeFileSync(mapPath, readFileSync(mapPath, "utf-8").replace(/done: false/g, "done: true"), "utf-8");
      const out = await tools.tw_map_finalizable.execute({ selector: "auth" }, ctx(t));
      expect(out).toContain("ready to finalize");
    });
  });

  describe("tw_resolve_uncertainty", () => {
    test("records the resolution and deletes the uncertainty file", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const work = join(t, "docs/tasks/billing/tickets/login-form/.work");
      mkdirSync(work, { recursive: true });
      writeFileSync(join(work, "uncertainty.md"), "which seam?\n");
      const out = await tools.tw_resolve_uncertainty.execute(
        { selector: "docs/tasks/billing/tickets/login-form/ticket.md", resolution: "test at the public seam" },
        ctx(t),
      );
      expect(out).toBe("docs/tasks/billing/tickets/login-form/.work/resolution.md");
      expect(readFileSync(join(work, "resolution.md"), "utf-8")).toBe("test at the public seam\n");
      expect(existsSync(join(work, "uncertainty.md"))).toBe(false);
      rmSync(t, { recursive: true, force: true });
    });

    test("refuses without an uncertainty file, so it is not a generic writer", async () => {
      const t = mkTmp(); seedV4Tree(t);
      await expect(
        tools.tw_resolve_uncertainty.execute(
          { selector: "docs/tasks/billing/tickets/login-form/ticket.md", resolution: "no uncertainty here" },
          ctx(t),
        ),
      ).rejects.toThrow(/no uncertainty to resolve/);
      expect(existsSync(join(t, "docs/tasks/billing/tickets/login-form/.work"))).toBe(false);
      rmSync(t, { recursive: true, force: true });
    });

    test("refuses an empty resolution", async () => {
      const t = mkTmp(); seedV4Tree(t);
      await expect(
        tools.tw_resolve_uncertainty.execute({ selector: "login-form", resolution: "  " }, ctx(t)),
      ).rejects.toThrow(/empty/);
      rmSync(t, { recursive: true, force: true });
    });

    test("resolves by slug and rejects non-tickets", async () => {
      const t = mkTmp(); seedV4Tree(t);
      const work = join(t, "docs/tasks/billing/tickets/login-form/.work");
      mkdirSync(work, { recursive: true });
      writeFileSync(join(work, "uncertainty.md"), "x\n");
      const out = await tools.tw_resolve_uncertainty.execute(
        { selector: "login-form", resolution: "go" },
        ctx(t),
      );
      expect(out).toContain(".work/resolution.md");
      await expect(
        tools.tw_resolve_uncertainty.execute({ selector: "research-cache", resolution: "go" }, ctx(t)),
      ).rejects.toThrow(/not 'ticket'/);
      rmSync(t, { recursive: true, force: true });
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

// ─── Planning transition writers (schema 5) ──────────────────────────────────

/**
 * The v4 effort fixture the planning writers run against: a map carrying the
 * schema-5 section placeholders (empty, as intake seeds them) and one open
 * planning task, so the finalize gate has a frontier to refuse on.
 */
function seedPlanningTree(t: string, frontmatter = "type: map\ntitle: Spec gate\nstatus: stable\n"): void {
  const base = join(t, "docs/tasks");
  writeMd(
    join(base, "specgate/map.md"),
    frontmatter,
    "\n# Spec gate\n\n## Destination\n\nThe gate is mechanical.\n\n## Non-goals\n\n## Non-negotiable facts\n",
  );
  writeMd(
    join(base, "specgate/tasks/decide/task.md"),
    "type: task\nsubtype: grilling\ntitle: Decide\nstatus: stable\nworkflow_state: todo\nblocked_by: []\n",
  );
}

/** The map file of the planning fixture, re-read from disk. */
function specGateMap(t: string): string {
  return readFileSync(join(t, "docs/tasks/specgate/map.md"), "utf-8");
}

/** Flip the fixture map's flag to the reconciled state. */
function setReadyForSpec(t: string, value: boolean): void {
  const text = specGateMap(t);
  writeFileSync(
    join(t, "docs/tasks/specgate/map.md"),
    text.replace("status: stable", `status: stable\nready_for_spec: ${value}`),
    "utf-8",
  );
}

/** Finish the fixture's planning task by hand (fixture setup, not a tool call). */
function finishDecideTaskInTree(t: string): void {
  const p = join(t, "docs/tasks/specgate/tasks/decide/task.md");
  writeFileSync(p, readFileSync(p, "utf-8").replace("workflow_state: todo", "workflow_state: done"), "utf-8");
}

describe("task-workflow tools: tw_write_section, the map-section writer", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => { tools = createTools(); });

  test("writes ## Non-goals into the empty placeholder and preserves the frontmatter", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    const out = await tools.tw_write_section.execute(
      { selector: "specgate", section: MAP_SECTION_NON_GOALS, content: "- No dark mode.\n- No theming." },
      ctx(t),
    );
    expect(out).toContain("Non-goals");
    const doc = parse(specGateMap(t));
    expect(readMapSection(doc.body, MAP_SECTION_NON_GOALS)).toEqual(["- No dark mode.", "- No theming."]);
    // The write goes through the frontmatter seam: the fields survive.
    expect(doc.data.type).toBe("map");
    expect(doc.data.title).toBe("Spec gate");
    // An absent flag stays absent: the minimal frontmatter shape.
    expect(doc.data).not.toHaveProperty("ready_for_spec");
    rmSync(t, { recursive: true, force: true });
  });

  test("writes ## Non-negotiable facts including the success test line", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await tools.tw_write_section.execute(
      {
        selector: "specgate",
        section: MAP_SECTION_NON_NEGOTIABLE_FACTS,
        content: "**Success test:** the gate refuses in a fixture tree.\n\n- The schema stays additive.",
      },
      ctx(t),
    );
    const doc = parse(specGateMap(t));
    const facts = readMapSection(doc.body, MAP_SECTION_NON_NEGOTIABLE_FACTS);
    expect(facts![0]).toMatch(/^\*\*Success test:\*\*/);
    expect(facts).toContain("- The schema stays additive.");
    rmSync(t, { recursive: true, force: true });
  });

  test("replaces an existing section's content on a rewrite", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await tools.tw_write_section.execute(
      { selector: "specgate", section: MAP_SECTION_NON_GOALS, content: "- First take." },
      ctx(t),
    );
    await tools.tw_write_section.execute(
      { selector: "specgate", section: MAP_SECTION_NON_GOALS, content: "- Second take." },
      ctx(t),
    );
    const doc = parse(specGateMap(t));
    expect(readMapSection(doc.body, MAP_SECTION_NON_GOALS)).toEqual(["- Second take."]);
    expect(specGateMap(t)).not.toContain("First take");
    // The sections after the rewritten one survive intact.
    expect(readMapSection(doc.body, MAP_SECTION_NON_NEGOTIABLE_FACTS)).toEqual([]);
    rmSync(t, { recursive: true, force: true });
  });

  test("appends a section the map does not have yet", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await tools.tw_write_section.execute(
      { selector: "specgate", section: "Decisions so far", content: "- Settled: one writer." },
      ctx(t),
    );
    const doc = parse(specGateMap(t));
    expect(readMapSection(doc.body, "Decisions so far")).toEqual(["- Settled: one writer."]);
    rmSync(t, { recursive: true, force: true });
  });

  test("clears a set ready_for_spec on every write, so a post-reconcile plan edit forces one more pass", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    setReadyForSpec(t, true);
    await tools.tw_write_section.execute(
      { selector: "specgate", section: MAP_SECTION_NON_GOALS, content: "- Revised after reconcile." },
      ctx(t),
    );
    expect(parse(specGateMap(t)).data.ready_for_spec).toBe(false);
    rmSync(t, { recursive: true, force: true });
  });

  test("clears the flag again on the next write: a reordered success test or a reopened task's re-write-back", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    setReadyForSpec(t, true);
    await tools.tw_write_section.execute(
      {
        selector: "specgate",
        section: MAP_SECTION_NON_NEGOTIABLE_FACTS,
        content: "- The facts first.\n\n**Success test:** moved below the facts.",
      },
      ctx(t),
    );
    expect(parse(specGateMap(t)).data.ready_for_spec).toBe(false);
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses a v3-shape map: the v5 writers write schema-5 shape only", async () => {
    const t = mkTmp();
    writeMd(
      join(t, "docs/tasks/maps/legacy/map.md"),
      "kind: map\ntitle: Legacy\nslug: legacy\nstatus: draft\n",
    );
    await expect(
      tools.tw_write_section.execute({ selector: "legacy", section: "Non-goals", content: "- x" }, ctx(t)),
    ).rejects.toThrow(/schema-5 migration/);
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses an empty or multi-heading section name", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await expect(
      tools.tw_write_section.execute({ selector: "specgate", section: "  ", content: "- x" }, ctx(t)),
    ).rejects.toThrow(/section name is empty/);
    await expect(
      tools.tw_write_section.execute(
        { selector: "specgate", section: "Non-goals\n## Injected", content: "- x" },
        ctx(t),
      ),
    ).rejects.toThrow(/single '##' heading name/);
    rmSync(t, { recursive: true, force: true });
  });
});

describe("task-workflow tools: tw_finalize_map, the ready_for_spec checking tool", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => { tools = createTools(); });

  const GOOD_FACTS = "**Success test:** the gate refuses in a fixture tree.\n\n- The schema stays additive.";

  /** Rewrite the fixture map's body, keeping its frontmatter. */
  function setSpecGateBody(t: string, body: string): void {
    const path = join(t, "docs/tasks/specgate/map.md");
    const doc = parse(readFileSync(path, "utf-8"));
    writeFileSync(path, dump({ data: doc.data, body }), "utf-8");
  }

  /** Finish the fixture's planning task by hand (fixture setup, not a tool call). */
  function finishDecideTask(t: string): void {
    const p = join(t, "docs/tasks/specgate/tasks/decide/task.md");
    writeFileSync(p, readFileSync(p, "utf-8").replace("workflow_state: todo", "workflow_state: done"), "utf-8");
  }

  /** Fill both schema-5 sections through the section writer. */
  async function fillSections(t: string): Promise<void> {
    await tools.tw_write_section.execute(
      { selector: "specgate", section: MAP_SECTION_NON_GOALS, content: "- No dark mode." },
      ctx(t),
    );
    await tools.tw_write_section.execute(
      { selector: "specgate", section: MAP_SECTION_NON_NEGOTIABLE_FACTS, content: GOOD_FACTS },
      ctx(t),
    );
  }

  test("refuses when the planning frontier is non-empty, naming the ready task", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await fillSections(t);
    await expect(tools.tw_finalize_map.execute({ selector: "specgate" }, ctx(t))).rejects.toThrow(
      /planning frontier is not empty: decide/,
    );
    // A refusal never sets the flag.
    expect(parse(specGateMap(t)).data.ready_for_spec).not.toBe(true);
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses when ## Non-goals is missing, empty, or when the facts section is missing", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    finishDecideTask(t);
    setSpecGateBody(t, "\n# Spec gate\n\n## Destination\n\nDone.\n\n## Non-negotiable facts\n");
    await expect(tools.tw_finalize_map.execute({ selector: "specgate" }, ctx(t))).rejects.toThrow(
      /no '## Non-goals' section/,
    );
    rmSync(t, { recursive: true, force: true });

    const t2 = mkTmp(); seedPlanningTree(t2);
    finishDecideTask(t2);
    await expect(tools.tw_finalize_map.execute({ selector: "specgate" }, ctx(t2))).rejects.toThrow(
      /'## Non-goals' is empty/,
    );
    rmSync(t2, { recursive: true, force: true });

    const t3 = mkTmp(); seedPlanningTree(t3);
    finishDecideTask(t3);
    setSpecGateBody(t3, "\n# Spec gate\n\n## Destination\n\nDone.\n\n## Non-goals\n\n- No dark mode.\n");
    await expect(tools.tw_finalize_map.execute({ selector: "specgate" }, ctx(t3))).rejects.toThrow(
      /no '## Non-negotiable facts' section/,
    );
    rmSync(t3, { recursive: true, force: true });
  });

  test("refuses when ## Non-negotiable facts is empty or does not open with the bolded success test", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    finishDecideTask(t);
    await expect(tools.tw_finalize_map.execute({ selector: "specgate" }, ctx(t))).rejects.toThrow(
      /'## Non-negotiable facts' is empty/,
    );
    rmSync(t, { recursive: true, force: true });

    const t2 = mkTmp(); seedPlanningTree(t2);
    finishDecideTask(t2);
    await tools.tw_write_section.execute(
      { selector: "specgate", section: MAP_SECTION_NON_GOALS, content: "- No dark mode." },
      ctx(t2),
    );
    await tools.tw_write_section.execute(
      { selector: "specgate", section: MAP_SECTION_NON_NEGOTIABLE_FACTS, content: "- Success test: not bolded." },
      ctx(t2),
    );
    await expect(tools.tw_finalize_map.execute({ selector: "specgate" }, ctx(t2))).rejects.toThrow(
      /does not open with the bolded effort-level success-test line/,
    );
    expect(parse(specGateMap(t2)).data.ready_for_spec).not.toBe(true);
    rmSync(t2, { recursive: true, force: true });
  });

  test("reports every failed check together, exactly what is missing", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    const error = await tools.tw_finalize_map.execute({ selector: "specgate" }, ctx(t)).catch((e) => e);
    expect(error.message).toMatch(/3 check\(s\) failed/);
    expect(error.message).toMatch(/planning frontier is not empty: decide/);
    expect(error.message).toMatch(/'## Non-goals' is empty/);
    expect(error.message).toMatch(/'## Non-negotiable facts' is empty/);
    rmSync(t, { recursive: true, force: true });
  });

  test("sets ready_for_spec: true only when every check passes, and only through this tool", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    setReadyForSpec(t, true);
    await fillSections(t);
    // The section writes cleared the flag: the post-write state is unreconciled.
    expect(parse(specGateMap(t)).data.ready_for_spec).toBe(false);
    finishDecideTask(t);
    const out = await tools.tw_finalize_map.execute({ selector: "specgate" }, ctx(t));
    expect(out).toContain("ready_for_spec = true");
    expect(parse(specGateMap(t)).data.ready_for_spec).toBe(true);
    rmSync(t, { recursive: true, force: true });
  });

  test("leaves a set flag untouched on a refusal", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    setReadyForSpec(t, true);
    // Sections are empty placeholders and the task is open: refused.
    await expect(tools.tw_finalize_map.execute({ selector: "specgate" }, ctx(t))).rejects.toThrow(/failed/);
    expect(parse(specGateMap(t)).data.ready_for_spec).toBe(true);
    rmSync(t, { recursive: true, force: true });
  });

  test("the planning frontier is the task kind: an unfinished ticket does not block the finalize", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await fillSections(t);
    finishDecideTask(t);
    writeMd(
      join(t, "docs/tasks/specgate/tickets/land-it/ticket.md"),
      "type: ticket\nsubtype: feature\ntitle: Land it\nstatus: stable\nworkflow_state: todo\nblocked_by: []\n",
    );
    const out = await tools.tw_finalize_map.execute({ selector: "specgate" }, ctx(t));
    expect(out).toContain("ready_for_spec = true");
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses a v3-shape map", async () => {
    const t = mkTmp();
    writeMd(join(t, "docs/tasks/maps/legacy/map.md"), "kind: map\ntitle: Legacy\nslug: legacy\nstatus: draft\n");
    await expect(tools.tw_finalize_map.execute({ selector: "legacy" }, ctx(t))).rejects.toThrow(
      /schema-5 migration/,
    );
    rmSync(t, { recursive: true, force: true });
  });
});

describe("task-workflow tools: tw_mark_done, the planning half", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => { tools = createTools(); });

  /** Write the task's results back to the map, the way a planning task closes. */
  async function writeBackDecide(t: string): Promise<void> {
    await tools.tw_write_section.execute(
      {
        selector: "specgate",
        section: "Decisions so far",
        content: "- Settled in decide: the gate refuses with named missing items.",
      },
      ctx(t),
    );
  }

  test("marks a planning task done after its results were written back to the map", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await writeBackDecide(t);
    const out = await tools.tw_mark_done.execute({ selector: "decide" }, ctx(t));
    expect(out).toContain("decide");
    expect(out).toMatch(/done/);
    const doc = parse(readFileSync(join(t, "docs/tasks/specgate/tasks/decide/task.md"), "utf-8"));
    expect(doc.data.workflow_state).toBe("done");
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses when the map does not reference the task's recorded results", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await expect(tools.tw_mark_done.execute({ selector: "decide" }, ctx(t))).rejects.toThrow(
      /not written back to the map first/,
    );
    await expect(tools.tw_mark_done.execute({ selector: "decide" }, ctx(t))).rejects.toThrow(
      /tw_write_section/,
    );
    // The refusal leaves the task untouched.
    const doc = parse(readFileSync(join(t, "docs/tasks/specgate/tasks/decide/task.md"), "utf-8"));
    expect(doc.data.workflow_state).toBe("todo");
    rmSync(t, { recursive: true, force: true });
  });

  test("does not count a longer hyphenated slug as the reference", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await tools.tw_write_section.execute(
      { selector: "specgate", section: "Decisions so far", content: "- Settled in decide-v2 instead." },
      ctx(t),
    );
    await expect(tools.tw_mark_done.execute({ selector: "decide" }, ctx(t))).rejects.toThrow(
      /not written back to the map first/,
    );
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses an already-done or deprecated task", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await writeBackDecide(t);
    finishDecideTaskInTree(t);
    await expect(tools.tw_mark_done.execute({ selector: "decide" }, ctx(t))).rejects.toThrow(/already done/);
    rmSync(t, { recursive: true, force: true });

    const t2 = mkTmp();
    writeMd(
      join(t2, "docs/tasks/deprec-eff/map.md"),
      "type: map\ntitle: Deprec\nstatus: stable\n",
      "\n# Deprec\n\n## Non-goals\n\n- Nothing.\n\n## Non-negotiable facts\n\n**Success test:** x.\n",
    );
    writeMd(
      join(t2, "docs/tasks/deprec-eff/tasks/gone/task.md"),
      "type: task\nsubtype: manual\ntitle: Gone\nstatus: deprecated\nworkflow_state: done\nblocked_by: []\n",
    );
    await tools.tw_write_section.execute(
      { selector: "deprec-eff", section: "Decisions so far", content: "- Settled in gone." },
      ctx(t2),
    );
    await expect(tools.tw_mark_done.execute({ selector: "gone" }, ctx(t2))).rejects.toThrow(/deprecated/);
    rmSync(t2, { recursive: true, force: true });
  });

  test("refuses a ticket selector: the planning half marks planning tasks only", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    writeMd(
      join(t, "docs/tasks/specgate/tickets/land-it/ticket.md"),
      "type: ticket\nsubtype: feature\ntitle: Land it\nstatus: stable\nworkflow_state: todo\nblocked_by: []\n",
    );
    await expect(tools.tw_mark_done.execute({ selector: "land-it" }, ctx(t))).rejects.toThrow(
      /has type 'ticket', not 'task'/,
    );
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses a v3-shape task", async () => {
    const t = mkTmp();
    writeMd(
      join(t, "docs/tasks/maps/legacy/map.md"),
      "kind: map\ntitle: Legacy\nslug: legacy\nstatus: draft\n",
    );
    writeMd(
      join(t, "docs/tasks/legacy-decide/task.md"),
      "kind: task\ntitle: Legacy decide\nslug: legacy-decide\nstatus: todo\nslices: []\nmap: legacy\n",
    );
    await expect(tools.tw_mark_done.execute({ selector: "legacy-decide" }, ctx(t))).rejects.toThrow(
      /schema-5 migration/,
    );
    rmSync(t, { recursive: true, force: true });
  });

  test("clears a set ready_for_spec on the map when the done-marking changes the plan", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await writeBackDecide(t);
    // The flag set after the write-back: the out-of-order state where the
    // done-marking itself must clear the flag (an unfinished task remained
    // when the map was finalized).
    setReadyForSpec(t, true);
    const out = await tools.tw_mark_done.execute({ selector: "decide" }, ctx(t));
    expect(out).toContain("ready_for_spec cleared");
    expect(parse(specGateMap(t)).data.ready_for_spec).toBe(false);
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses when the effort has no map to write the results back to", async () => {
    const t = mkTmp();
    writeMd(
      join(t, "docs/tasks/mapless/tasks/decide/task.md"),
      "type: task\nsubtype: grilling\ntitle: Decide\nstatus: stable\nworkflow_state: todo\nblocked_by: []\n",
    );
    await expect(tools.tw_mark_done.execute({ selector: "decide" }, ctx(t))).rejects.toThrow(
      /no map/,
    );
    rmSync(t, { recursive: true, force: true });
  });
});
