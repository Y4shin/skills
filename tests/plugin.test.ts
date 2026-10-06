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
        "tw_add_ticket",
        "tw_archive_effort",
        "tw_close",
        "tw_context",
        "tw_dependency_levels",
        "tw_finalizable",
        "tw_finalize_map",
        "tw_frontier",
        "tw_get",
        "tw_list",
        "tw_map_finalizable",
        "tw_mark_blocked",
        "tw_mark_done",
        "tw_next",
        "tw_open",
        "tw_record_out_of_scope",
        "tw_resolve_uncertainty",
        "tw_show",
        "tw_split_ticket",
        "tw_state",
        "tw_state_set",
        "tw_write_architecture",
        "tw_write_changelog",
        "tw_write_section",
        "tw_write_spec",
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

// ─── Implementation transition tools (implementation-transition-tools) ────

describe("task-workflow tools: tw_write_spec, the specification writer", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => { tools = createTools(); });

  function specPath(t: string): string {
    return join(t, "docs/tasks/specgate/spec.md");
  }

  test("creates a draft spec when the effort has none, through the frontmatter seam", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    expect(existsSync(specPath(t))).toBe(false);
    const out = await tools.tw_write_spec.execute(
      { selector: "specgate", content: "# Spec gate specification\n\nThe settled decisions." },
      ctx(t),
    );
    expect(out).toContain("spec.md");
    const doc = parse(readFileSync(specPath(t), "utf-8"));
    // Conformant spec frontmatter: draft while writing, title from the map.
    expect(doc.data.type).toBe("spec");
    expect(doc.data.title).toBe("Spec gate");
    expect(doc.data.status).toBe("draft");
    expect(doc.data).not.toHaveProperty("workflow_state");
    expect(doc.body).toBe("\n# Spec gate specification\n\nThe settled decisions.\n");
    rmSync(t, { recursive: true, force: true });
  });

  test("uses the given title when creating and derives it from the map otherwise", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await tools.tw_write_spec.execute(
      { selector: "specgate", title: "Chosen title", content: "# Body" },
      ctx(t),
    );
    expect(parse(readFileSync(specPath(t), "utf-8")).data.title).toBe("Chosen title");
    rmSync(t, { recursive: true, force: true });

    const t2 = mkTmp();
    writeMd(join(t2, "docs/tasks/bare/map.md"), "type: map\ntitle: Bare effort\nstatus: stable\n");
    await tools.tw_write_spec.execute({ selector: "bare", content: "# Body" }, ctx(t2));
    expect(parse(readFileSync(join(t2, "docs/tasks/bare/spec.md"), "utf-8")).data.title).toBe("Bare effort");
    rmSync(t2, { recursive: true, force: true });
  });

  test("rewrites the body of an existing spec and preserves its frontmatter", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    writeMd(specPath(t), "type: spec\ntitle: Spec gate spec\nstatus: draft\n", "\n# Old body\n");
    await tools.tw_write_spec.execute(
      { selector: "specgate", content: "# Rewritten\n\nThe synthesized specification." },
      ctx(t),
    );
    const doc = parse(readFileSync(specPath(t), "utf-8"));
    expect(doc.body).toBe("\n# Rewritten\n\nThe synthesized specification.\n");
    expect(doc.data.type).toBe("spec");
    expect(doc.data.title).toBe("Spec gate spec");
    // A content write does not touch the lifecycle: still draft.
    expect(doc.data.status).toBe("draft");
    rmSync(t, { recursive: true, force: true });
  });

  test("publish sets status: stable, the spec-stable named write", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await tools.tw_write_spec.execute(
      { selector: "specgate", content: "# Spec gate specification\n\nSettled.", publish: true },
      ctx(t),
    );
    expect(parse(readFileSync(specPath(t), "utf-8")).data.status).toBe("stable");
    rmSync(t, { recursive: true, force: true });
  });

  test("publish flips an existing draft spec to stable", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    writeMd(specPath(t), "type: spec\ntitle: Spec gate spec\nstatus: draft\n", "\n# Draft\n");
    await tools.tw_write_spec.execute(
      { selector: "specgate", content: "# Draft\n\nNow settled.", publish: true },
      ctx(t),
    );
    expect(parse(readFileSync(specPath(t), "utf-8")).data.status).toBe("stable");
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses an empty content", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await expect(
      tools.tw_write_spec.execute({ selector: "specgate", content: "   " }, ctx(t)),
    ).rejects.toThrow(/empty/);
    expect(existsSync(specPath(t))).toBe(false);
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses a selector that names no live effort", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await expect(
      tools.tw_write_spec.execute({ selector: "no-such-effort", content: "# x" }, ctx(t)),
    ).rejects.toThrow(/no live effort/);
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses a v3-shape spec: the v5 writers write schema-5 shape only", async () => {
    const t = mkTmp();
    writeMd(join(t, "docs/tasks/maps/legacy/map.md"), "kind: map\ntitle: Legacy\nslug: legacy\nstatus: draft\n");
    writeMd(join(t, "docs/tasks/maps/legacy/spec.md"), "kind: spec\ntitle: Legacy spec\nslug: legacy\nstatus: draft\n");
    await expect(
      tools.tw_write_spec.execute({ selector: "legacy", content: "# x" }, ctx(t)),
    ).rejects.toThrow(/schema-5 migration/);
    rmSync(t, { recursive: true, force: true });
  });
});

describe("task-workflow tools: tw_write_architecture, the architecture writer", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => { tools = createTools(); });

  function archPath(t: string): string {
    return join(t, "docs/tasks/specgate/architecture.md");
  }

  test("creates the v5 architecture document at the effort root, through the frontmatter seam", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    writeMd(
      join(t, "docs/tasks/specgate/spec.md"),
      "type: spec\ntitle: Spec gate spec\nstatus: stable\n",
      "\n# Spec gate\n\n## Architecture\n\nThe settled architecture content.\n",
    );
    expect(existsSync(archPath(t))).toBe(false);
    const out = await tools.tw_write_architecture.execute(
      { selector: "specgate", content: "# Spec gate architecture\n\nThe settled architecture content, inlined." },
      ctx(t),
    );
    expect(out).toContain("architecture.md");
    const doc = parse(readFileSync(archPath(t), "utf-8"));
    // Conformant v5 frontmatter: type architecture, never the legacy shape;
    // draft while writing; the title derives from the effort's map.
    expect(doc.data.type).toBe("architecture");
    expect(doc.data.title).toBe("Spec gate");
    expect(doc.data.status).toBe("draft");
    expect(doc.data).not.toHaveProperty("workflow_state");
    expect(doc.body).toBe("\n# Spec gate architecture\n\nThe settled architecture content, inlined.\n");
    rmSync(t, { recursive: true, force: true });
  });

  test("uses the given title when creating and derives it from the map otherwise", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    writeMd(join(t, "docs/tasks/specgate/spec.md"), "type: spec\ntitle: S\nstatus: stable\n");
    await tools.tw_write_architecture.execute(
      { selector: "specgate", title: "Chosen title", content: "# Body" },
      ctx(t),
    );
    expect(parse(readFileSync(archPath(t), "utf-8")).data.title).toBe("Chosen title");
    rmSync(t, { recursive: true, force: true });
  });

  test("rewrites the body of an existing document and preserves its frontmatter: the living architecture", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    writeMd(archPath(t), "type: architecture\ntitle: Spec gate architecture\nstatus: draft\n", "\n# Old body\n");
    await tools.tw_write_architecture.execute(
      { selector: "specgate", content: "# Rewritten\n\nThe architecture, updated in place." },
      ctx(t),
    );
    const doc = parse(readFileSync(archPath(t), "utf-8"));
    expect(doc.body).toBe("\n# Rewritten\n\nThe architecture, updated in place.\n");
    expect(doc.data.type).toBe("architecture");
    expect(doc.data.title).toBe("Spec gate architecture");
    // A content write does not touch the lifecycle: still draft.
    expect(doc.data.status).toBe("draft");
    rmSync(t, { recursive: true, force: true });
  });

  test("publish sets status: stable, the architecture-stable named write", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    writeMd(join(t, "docs/tasks/specgate/spec.md"), "type: spec\ntitle: S\nstatus: stable\n");
    await tools.tw_write_architecture.execute(
      { selector: "specgate", content: "# Body", publish: true },
      ctx(t),
    );
    expect(parse(readFileSync(archPath(t), "utf-8")).data.status).toBe("stable");
    rmSync(t, { recursive: true, force: true });

    const t2 = mkTmp(); seedPlanningTree(t2);
    writeMd(join(t2, "docs/tasks/specgate/spec.md"), "type: spec\ntitle: S\nstatus: stable\n");
    writeMd(archPath(t2), "type: architecture\ntitle: A\nstatus: draft\n", "\n# Draft\n");
    await tools.tw_write_architecture.execute(
      { selector: "specgate", content: "# Settled", publish: true },
      ctx(t2),
    );
    expect(parse(readFileSync(archPath(t2), "utf-8")).data.status).toBe("stable");
    rmSync(t2, { recursive: true, force: true });
  });

  test("refuses an empty content", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    writeMd(join(t, "docs/tasks/specgate/spec.md"), "type: spec\ntitle: S\nstatus: stable\n");
    await expect(
      tools.tw_write_architecture.execute({ selector: "specgate", content: "   " }, ctx(t)),
    ).rejects.toThrow(/empty/);
    expect(existsSync(archPath(t))).toBe(false);
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses a selector that names no live effort", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await expect(
      tools.tw_write_architecture.execute({ selector: "no-such-effort", content: "# x" }, ctx(t)),
    ).rejects.toThrow(/no live effort/);
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses an effort with no spec: the architecture is produced from the spec's architecture content", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await expect(
      tools.tw_write_architecture.execute({ selector: "specgate", content: "# x" }, ctx(t)),
    ).rejects.toThrow(/no spec/);
    expect(existsSync(archPath(t))).toBe(false);
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses a v3-shape spec: the v5 writers write schema-5 shape only", async () => {
    const t = mkTmp();
    writeMd(join(t, "docs/tasks/maps/legacy/map.md"), "kind: map\ntitle: Legacy\nslug: legacy\nstatus: draft\n");
    writeMd(join(t, "docs/tasks/maps/legacy/spec.md"), "kind: spec\ntitle: Legacy spec\nslug: legacy\nstatus: draft\n");
    await expect(
      tools.tw_write_architecture.execute({ selector: "legacy", content: "# x" }, ctx(t)),
    ).rejects.toThrow(/schema-5 migration/);
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses a legacy arch-spec.md in the effort: legacy shape is tolerated as input only, never produced", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    writeMd(join(t, "docs/tasks/specgate/spec.md"), "type: spec\ntitle: S\nstatus: stable\n");
    writeMd(
      join(t, "docs/tasks/specgate/arch-spec.md"),
      "type: arch spec\ntitle: Legacy architecture\nstatus: stable\n",
    );
    await expect(
      tools.tw_write_architecture.execute({ selector: "specgate", content: "# x" }, ctx(t)),
    ).rejects.toThrow(/schema-5 migration/);
    await expect(
      tools.tw_write_architecture.execute({ selector: "specgate", content: "# x" }, ctx(t)),
    ).rejects.toThrow(/arch-spec\.md/);
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses when the effort already holds an architecture document elsewhere", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    writeMd(join(t, "docs/tasks/specgate/spec.md"), "type: spec\ntitle: S\nstatus: stable\n");
    mkdirSync(join(t, "docs/tasks/specgate/nested"), { recursive: true });
    writeMd(
      join(t, "docs/tasks/specgate/nested/architecture.md"),
      "type: architecture\ntitle: Nested\nstatus: stable\n",
    );
    await expect(
      tools.tw_write_architecture.execute({ selector: "specgate", content: "# x" }, ctx(t)),
    ).rejects.toThrow(/architecture document/);
    expect(existsSync(archPath(t))).toBe(false);
    rmSync(t, { recursive: true, force: true });
  });

  test("adds the archival note to spec.md pointing at the architecture, deleting nothing", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    const specBody = "\n# Spec gate\n\n## Architecture\n\nThe settled architecture content.\n\n## Decisions\n\n- One.\n";
    writeMd(join(t, "docs/tasks/specgate/spec.md"), "type: spec\ntitle: S\nstatus: stable\n", specBody);
    await tools.tw_write_architecture.execute({ selector: "specgate", content: "# Body" }, ctx(t));
    const doc = parse(readFileSync(join(t, "docs/tasks/specgate/spec.md"), "utf-8"));
    // Nothing is deleted from the specification.
    expect(doc.body).toContain("The settled architecture content.");
    expect(doc.body).toContain("## Decisions");
    expect(doc.body).toContain("- One.");
    // The note points at the living architecture document.
    expect(doc.body).toMatch(/archival/);
    expect(doc.body).toContain("architecture.md");
    rmSync(t, { recursive: true, force: true });
  });

  test("the note is added once: rewrites never duplicate it", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    writeMd(join(t, "docs/tasks/specgate/spec.md"), "type: spec\ntitle: S\nstatus: stable\n");
    await tools.tw_write_architecture.execute({ selector: "specgate", content: "# First" }, ctx(t));
    const afterFirst = readFileSync(join(t, "docs/tasks/specgate/spec.md"), "utf-8");
    await tools.tw_write_architecture.execute({ selector: "specgate", content: "# Second" }, ctx(t));
    expect(readFileSync(join(t, "docs/tasks/specgate/spec.md"), "utf-8")).toBe(afterFirst);
    const doc = parse(afterFirst);
    expect(doc.body.match(/archival/g)?.length).toBe(1);
    rmSync(t, { recursive: true, force: true });
  });

  test("an update to the living document ensures the note too", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    writeMd(join(t, "docs/tasks/specgate/spec.md"), "type: spec\ntitle: S\nstatus: stable\n");
    writeMd(archPath(t), "type: architecture\ntitle: A\nstatus: draft\n", "\n# Existing\n");
    await tools.tw_write_architecture.execute({ selector: "specgate", content: "# Updated" }, ctx(t));
    expect(readFileSync(join(t, "docs/tasks/specgate/spec.md"), "utf-8")).toMatch(/archival/);
    rmSync(t, { recursive: true, force: true });
  });
});

describe("task-workflow tools: tw_add_ticket, the ticket creator", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => { tools = createTools(); });

  function ticketPath(t: string, slug: string): string {
    return join(t, "docs/tasks/specgate/tickets", slug, "ticket.md");
  }

  test("creates a ticket through the frontmatter seam with the v5 ticket shape", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    const out = await tools.tw_add_ticket.execute(
      {
        effort: "specgate",
        slug: "land-it",
        title: "Land it",
        subtype: "feature",
        content: "## What to build\n\nThe gate.",
      },
      ctx(t),
    );
    expect(out).toContain("land-it");
    const doc = parse(readFileSync(ticketPath(t, "land-it"), "utf-8"));
    expect(doc.data.type).toBe("ticket");
    expect(doc.data.subtype).toBe("feature");
    expect(doc.data.title).toBe("Land it");
    expect(doc.data.status).toBe("stable");
    expect(doc.data.workflow_state).toBe("ready");
    expect(doc.data.blocked_by).toEqual([]);
    // Size is absent when not given: absent means m.
    expect(doc.data).not.toHaveProperty("size");
    expect(doc.data).not.toHaveProperty("mode");
    expect(doc.body).toBe("\n## What to build\n\nThe gate.\n");
    rmSync(t, { recursive: true, force: true });
  });

  test("lands size, mode, and blocked_by when given", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await tools.tw_add_ticket.execute(
      { effort: "specgate", slug: "first", title: "First", subtype: "bug", size: "s", mode: "human", blocked_by: [] },
      ctx(t),
    );
    await tools.tw_add_ticket.execute(
      {
        effort: "specgate",
        slug: "second",
        title: "Second",
        subtype: "feature",
        size: "l",
        blocked_by: ["first"],
      },
      ctx(t),
    );
    const second = parse(readFileSync(ticketPath(t, "second"), "utf-8"));
    expect(second.data.size).toBe("l");
    expect(second.data.blocked_by).toEqual(["first"]);
    expect(second.data).not.toHaveProperty("mode");
    const first = parse(readFileSync(ticketPath(t, "first"), "utf-8"));
    expect(first.data.mode).toBe("human");
    expect(first.data.size).toBe("s");
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses a duplicate slug: an existing ticket, or any artifact with that slug in the effort", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await tools.tw_add_ticket.execute(
      { effort: "specgate", slug: "land-it", title: "Land it", subtype: "feature" },
      ctx(t),
    );
    await expect(
      tools.tw_add_ticket.execute({ effort: "specgate", slug: "land-it", title: "Again", subtype: "feature" }, ctx(t)),
    ).rejects.toThrow(/already exists/);
    // The task slug is taken too: slugs are unique per effort.
    await expect(
      tools.tw_add_ticket.execute({ effort: "specgate", slug: "decide", title: "Clash", subtype: "feature" }, ctx(t)),
    ).rejects.toThrow(/already exists/);
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses an unsafe slug", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    for (const slug of ["Land It", "land/it", "../escape", "-lead", ""]) {
      await expect(
        tools.tw_add_ticket.execute({ effort: "specgate", slug, title: "T", subtype: "feature" }, ctx(t)),
      ).rejects.toThrow(/invalid slug/);
    }
    expect(existsSync(join(t, "docs/tasks/specgate/tickets"))).toBe(false);
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses a subtype that is not feature or bug, and a bad size or mode", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await expect(
      tools.tw_add_ticket.execute({ effort: "specgate", slug: "x", title: "T", subtype: "chore" }, ctx(t)),
    ).rejects.toThrow(/subtype/);
    await expect(
      tools.tw_add_ticket.execute({ effort: "specgate", slug: "x", title: "T", subtype: "feature", size: "xxl" }, ctx(t)),
    ).rejects.toThrow(/size/);
    await expect(
      tools.tw_add_ticket.execute({ effort: "specgate", slug: "x", title: "T", subtype: "feature", mode: "afk" }, ctx(t)),
    ).rejects.toThrow(/mode/);
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses blocked_by edges that dangle or cross the kind: tickets block tickets", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await expect(
      tools.tw_add_ticket.execute(
        { effort: "specgate", slug: "x", title: "T", subtype: "feature", blocked_by: ["ghost"] },
        ctx(t),
      ),
    ).rejects.toThrow(/'ghost' is not an existing ticket/);
    // A planning task is not a ticket edge target (kind-scoped).
    await expect(
      tools.tw_add_ticket.execute(
        { effort: "specgate", slug: "x", title: "T", subtype: "feature", blocked_by: ["decide"] },
        ctx(t),
      ),
    ).rejects.toThrow(/tickets block tickets/);
    expect(existsSync(ticketPath(t, "x"))).toBe(false);
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses an effort with no map or spec anchor, so the graph gains no orphans", async () => {
    const t = mkTmp();
    mkdirSync(join(t, "docs/tasks/orphan-effort"), { recursive: true });
    await expect(
      tools.tw_add_ticket.execute({ effort: "orphan-effort", slug: "x", title: "T", subtype: "feature" }, ctx(t)),
    ).rejects.toThrow(/neither a map nor a spec/);
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses an unknown effort and an archived effort", async () => {
    const t = mkTmp(); seedV4Tree(t);
    await expect(
      tools.tw_add_ticket.execute({ effort: "no-such-effort", slug: "x", title: "T", subtype: "feature" }, ctx(t)),
    ).rejects.toThrow(/no live effort/);
    await expect(
      tools.tw_add_ticket.execute({ effort: "old-effort", slug: "x", title: "T", subtype: "feature" }, ctx(t)),
    ).rejects.toThrow(/no live effort/);
    rmSync(t, { recursive: true, force: true });
  });
});

describe("task-workflow tools: tw_split_ticket, the escape-hatch split", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => { tools = createTools(); });

  /** The fixture: a live effort whose in-flight ticket "big" splits. */
  function seedSplitTree(t: string, originalState = "workflow_state: in-progress"): void {
    seedPlanningTree(t);
    writeMd(
      join(t, "docs/tasks/specgate/tickets/base/ticket.md"),
      "type: ticket\nsubtype: feature\ntitle: Base\nstatus: stable\nworkflow_state: todo\nblocked_by: []\n",
    );
    writeMd(
      join(t, "docs/tasks/specgate/tickets/big/ticket.md"),
      `type: ticket\nsubtype: bug\ntitle: Big\nstatus: stable\n${originalState}\nsize: l\nblocked_by: [base]\n`,
      "\n## What to build\n\nToo big.\n",
    );
  }

  function originalPath(t: string): string {
    return join(t, "docs/tasks/specgate/tickets/big/ticket.md");
  }

  function subPath(t: string, slug: string): string {
    return join(t, "docs/tasks/specgate/tickets", slug, "ticket.md");
  }

  test("creates the sub-tickets and supersedes the original as deprecated plus done", async () => {
    const t = mkTmp(); seedSplitTree(t);
    const out = await tools.tw_split_ticket.execute(
      {
        selector: "big",
        subtickets: [
          { slug: "big-one", title: "Big one", size: "s", content: "## What to build\n\nPart one." },
          { slug: "big-two", title: "Big two", blocked_by: ["big-one"] },
        ],
      },
      ctx(t),
    );
    expect(out.text).toContain("big-one");
    expect(out.text).toContain("deprecated");

    // The sub-tickets inherit the original's subtype and edges.
    const one = parse(readFileSync(subPath(t, "big-one"), "utf-8"));
    expect(one.data.type).toBe("ticket");
    expect(one.data.subtype).toBe("bug");
    expect(one.data.status).toBe("stable");
    expect(one.data.workflow_state).toBe("ready");
    expect(one.data.blocked_by).toEqual(["base"]);
    expect(one.data.size).toBe("s");
    expect(one.body).toBe("\n## What to build\n\nPart one.\n");

    const two = parse(readFileSync(subPath(t, "big-two"), "utf-8"));
    expect(two.data.blocked_by).toEqual(["base", "big-one"]);
    // Size absent when not given.
    expect(two.data).not.toHaveProperty("size");

    // The original: deprecated plus done, with a body note naming the subs.
    const original = parse(readFileSync(originalPath(t), "utf-8"));
    expect(original.data.status).toBe("deprecated");
    expect(original.data.workflow_state).toBe("done");
    expect(original.body).toContain("Superseded by big-one, big-two.");
    expect(original.body).toContain("Too big.");
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses an original that is already done or deprecated", async () => {
    const t = mkTmp(); seedSplitTree(t, "workflow_state: done");
    await expect(
      tools.tw_split_ticket.execute({ selector: "big", subtickets: [{ slug: "x", title: "X" }] }, ctx(t)),
    ).rejects.toThrow(/already done/);
    rmSync(t, { recursive: true, force: true });

    const t2 = mkTmp(); seedSplitTree(t2, "workflow_state: done");
    const p = originalPath(t2);
    writeFileSync(p, readFileSync(p, "utf-8").replace("status: stable", "status: deprecated"), "utf-8");
    await expect(
      tools.tw_split_ticket.execute({ selector: "big", subtickets: [{ slug: "x", title: "X" }] }, ctx(t2)),
    ).rejects.toThrow(/deprecated/);
    rmSync(t2, { recursive: true, force: true });
  });

  test("refuses sub slugs that collide with existing artifacts or each other", async () => {
    const t = mkTmp(); seedSplitTree(t);
    await expect(
      tools.tw_split_ticket.execute(
        { selector: "big", subtickets: [{ slug: "base", title: "Clash" }] },
        ctx(t),
      ),
    ).rejects.toThrow(/already exists/);
    await expect(
      tools.tw_split_ticket.execute(
        { selector: "big", subtickets: [{ slug: "a", title: "A" }, { slug: "a", title: "A again" }] },
        ctx(t),
      ),
    ).rejects.toThrow(/duplicate|already/);
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses a split that keeps the original's slug or dangles an edge", async () => {
    const t = mkTmp(); seedSplitTree(t);
    await expect(
      tools.tw_split_ticket.execute(
        { selector: "big", subtickets: [{ slug: "big", title: "Same" }] },
        ctx(t),
      ),
    ).rejects.toThrow(/superseded|slug/);
    await expect(
      tools.tw_split_ticket.execute(
        { selector: "big", subtickets: [{ slug: "a", title: "A", blocked_by: ["ghost"] }] },
        ctx(t),
      ),
    ).rejects.toThrow(/'ghost' is not an existing ticket/);
    expect(existsSync(subPath(t, "a"))).toBe(false);
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses an empty sub-ticket list and an invalid sub seed", async () => {
    const t = mkTmp(); seedSplitTree(t);
    await expect(tools.tw_split_ticket.execute({ selector: "big", subtickets: [] }, ctx(t))).rejects.toThrow(
      /at least one sub-ticket/,
    );
    await expect(
      tools.tw_split_ticket.execute({ selector: "big", subtickets: [{ slug: "Bad Slug", title: "X" }] }, ctx(t)),
    ).rejects.toThrow(/invalid slug/);
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses a v3-shape original", async () => {
    const t = mkTmp();
    writeMd(join(t, "docs/tasks/maps/legacy/map.md"), "kind: map\ntitle: Legacy\nslug: legacy\nstatus: draft\n");
    writeMd(
      join(t, "docs/tasks/maps/legacy/tickets/big/ticket.md"),
      "kind: ticket\ntitle: Big\nslug: big\nstatus: stable\n",
    );
    await expect(
      tools.tw_split_ticket.execute({ selector: "big", subtickets: [{ slug: "x", title: "X" }] }, ctx(t)),
    ).rejects.toThrow(/schema-5 migration/);
    rmSync(t, { recursive: true, force: true });
  });
});

describe("task-workflow tools: tw_mark_done, the ticket half", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => { tools = createTools(); });

  /** The fixture: a landed ticket whose changelog entry may or may not exist. */
  function seedTicketDoneTree(t: string, changelogBody?: string): void {
    seedPlanningTree(t);
    writeMd(
      join(t, "docs/tasks/specgate/tickets/land-it/ticket.md"),
      "type: ticket\nsubtype: feature\ntitle: Land it\nstatus: stable\nworkflow_state: in-progress\nsize: m\nblocked_by: []\n",
    );
    writeMd(
      join(t, "docs/tasks/CHANGELOG.md"),
      "type: changelog\ntitle: Task Changelog\n",
      changelogBody ?? "\n# Task Changelog\n",
    );
  }

  function ticketPath(t: string): string {
    return join(t, "docs/tasks/specgate/tickets/land-it/ticket.md");
  }

  test("marks a ticket done when the changelog references it: the entry lands before the done-marking", async () => {
    const t = mkTmp();
    seedTicketDoneTree(
      t,
      "\n# Task Changelog\n\n## 2026-10-01, Land it (land-it)\n\nThe ticket landed.\n",
    );
    const out = await tools.tw_mark_done.execute({ selector: "land-it" }, ctx(t));
    expect(out).toMatch(/done/);
    const doc = parse(readFileSync(ticketPath(t), "utf-8"));
    expect(doc.data.workflow_state).toBe("done");
    // The status is not the done-ness field; it stays as it was.
    expect(doc.data.status).toBe("stable");
    // A ticket done-marking is not a plan change: no ready_for_spec on the ticket.
    expect(doc.data).not.toHaveProperty("ready_for_spec");
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses when the changelog has no entry for the ticket, naming the changelog writer", async () => {
    const t = mkTmp(); seedTicketDoneTree(t);
    await expect(tools.tw_mark_done.execute({ selector: "land-it" }, ctx(t))).rejects.toThrow(
      /tw_write_changelog/,
    );
    // The refusal leaves the ticket untouched.
    expect(parse(readFileSync(ticketPath(t), "utf-8")).data.workflow_state).toBe("in-progress");
    rmSync(t, { recursive: true, force: true });
  });

  test("does not count a longer hyphenated slug as the changelog reference", async () => {
    const t = mkTmp();
    seedTicketDoneTree(
      t,
      "\n# Task Changelog\n\n## 2026-10-01, Other (land-it-v2)\n\nAnother ticket landed.\n",
    );
    await expect(tools.tw_mark_done.execute({ selector: "land-it" }, ctx(t))).rejects.toThrow(
      /tw_write_changelog/,
    );
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses when the changelog does not exist yet", async () => {
    const t = mkTmp(); seedTicketDoneTree(t);
    rmSync(join(t, "docs/tasks/CHANGELOG.md"));
    await expect(tools.tw_mark_done.execute({ selector: "land-it" }, ctx(t))).rejects.toThrow(
      /changelog/,
    );
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses an already-done or deprecated ticket", async () => {
    const t = mkTmp();
    seedTicketDoneTree(t, "\n# Task Changelog\n\n## 2026-10-01, Land it (land-it)\n\nLanded.\n");
    writeFileSync(ticketPath(t), readFileSync(ticketPath(t), "utf-8").replace("in-progress", "done"), "utf-8");
    await expect(tools.tw_mark_done.execute({ selector: "land-it" }, ctx(t))).rejects.toThrow(/already done/);
    rmSync(t, { recursive: true, force: true });

    const t2 = mkTmp();
    seedTicketDoneTree(t2, "\n# Task Changelog\n\n## 2026-10-01, Land it (land-it)\n\nLanded.\n");
    const p = ticketPath(t2);
    writeFileSync(p, readFileSync(p, "utf-8").replace("status: stable", "status: deprecated"), "utf-8");
    await expect(tools.tw_mark_done.execute({ selector: "land-it" }, ctx(t2))).rejects.toThrow(/deprecated/);
    rmSync(t2, { recursive: true, force: true });
  });
});

describe("task-workflow tools: tw_mark_blocked, the blocked marking for planning tasks", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => { tools = createTools(); });

  function taskPath(t: string): string {
    return join(t, "docs/tasks/specgate/tasks/decide/task.md");
  }

  test("marks a planning task blocked and records the reason in the task body", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    const out = await tools.tw_mark_blocked.execute(
      { selector: "decide", reason: "the auth provider docs are unreachable; retry with the vendored copy" },
      ctx(t),
    );
    expect(out).toMatch(/blocked/);
    const doc = parse(readFileSync(taskPath(t), "utf-8"));
    expect(doc.data.workflow_state).toBe("blocked");
    expect(doc.data.status).toBe("stable");
    expect(doc.body).toContain(
      "Blocked: the auth provider docs are unreachable; retry with the vendored copy",
    );
    rmSync(t, { recursive: true, force: true });
  });

  test("re-blocking replaces the recorded reason instead of accumulating lines", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await tools.tw_mark_blocked.execute({ selector: "decide", reason: "first reason" }, ctx(t));
    await tools.tw_mark_blocked.execute({ selector: "decide", reason: "second reason" }, ctx(t));
    const doc = parse(readFileSync(taskPath(t), "utf-8"));
    expect(doc.body).toContain("Blocked: second reason");
    expect(doc.body).not.toContain("Blocked: first reason");
    expect(doc.data.workflow_state).toBe("blocked");
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses an empty reason", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await expect(tools.tw_mark_blocked.execute({ selector: "decide", reason: "  " }, ctx(t))).rejects.toThrow(
      /reason is empty/,
    );
    expect(parse(readFileSync(taskPath(t), "utf-8")).data.workflow_state).toBe("todo");
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses a done or deprecated task: blocking must not resurrect finished work", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    writeFileSync(taskPath(t), readFileSync(taskPath(t), "utf-8").replace("todo", "done"), "utf-8");
    await expect(
      tools.tw_mark_blocked.execute({ selector: "decide", reason: "x" }, ctx(t)),
    ).rejects.toThrow(/already done/);
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
    await expect(
      tools.tw_mark_blocked.execute({ selector: "gone", reason: "x" }, ctx(t2)),
    ).rejects.toThrow(/deprecated/);
    rmSync(t2, { recursive: true, force: true });
  });

  test("refuses a ticket selector: this marks planning tasks only", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    writeMd(
      join(t, "docs/tasks/specgate/tickets/land-it/ticket.md"),
      "type: ticket\nsubtype: feature\ntitle: Land it\nstatus: stable\nworkflow_state: ready\nblocked_by: []\n",
    );
    await expect(
      tools.tw_mark_blocked.execute({ selector: "land-it", reason: "x" }, ctx(t)),
    ).rejects.toThrow(/has type 'ticket', not 'task'/);
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses a v3-shape task", async () => {
    const t = mkTmp();
    writeMd(
      join(t, "docs/tasks/legacy-decide/task.md"),
      "kind: task\ntitle: Legacy decide\nslug: legacy-decide\nstatus: todo\nslices: []\n",
    );
    await expect(
      tools.tw_mark_blocked.execute({ selector: "legacy-decide", reason: "x" }, ctx(t)),
    ).rejects.toThrow(/schema-5 migration/);
    rmSync(t, { recursive: true, force: true });
  });
});

describe("task-workflow tools: tw_write_changelog, the changelog writer", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => { tools = createTools(); });

  function changelogPath(t: string): string {
    return join(t, "docs/tasks/CHANGELOG.md");
  }

  function writeChangelog(t: string, body: string): void {
    writeMd(changelogPath(t), "type: changelog\ntitle: Task Changelog\n", body);
  }

  test("creates the changelog when missing, with conformant frontmatter", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    const out = await tools.tw_write_changelog.execute(
      { slug: "land-it", title: "Land it", content: "The ticket landed with the gate enforced.", date: "2026-10-02" },
      ctx(t),
    );
    expect(out).toContain("CHANGELOG.md");
    const doc = parse(readFileSync(changelogPath(t), "utf-8"));
    expect(doc.data.type).toBe("changelog");
    expect(doc.data.title).toBe("Task Changelog");
    expect(doc.body).toContain("## 2026-10-02, Land it (land-it)");
    expect(doc.body).toContain("The ticket landed with the gate enforced.");
    rmSync(t, { recursive: true, force: true });
  });

  test("lands the new entry on top of the dated region, below any release block", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    writeChangelog(
      t,
      "\n# Task Changelog\n\n# task-workflow\n\n## 4.0.0\n\n### Major Changes\n\n- 5816b6b: The v4 overhaul.\n\n## 2026-09-29, Older entry (older-ticket)\n\nOlder.\n",
    );
    await tools.tw_write_changelog.execute(
      { slug: "land-it", title: "Land it", content: "Newest.", date: "2026-10-02" },
      ctx(t),
    );
    const body = parse(readFileSync(changelogPath(t), "utf-8")).body;
    const release = body.indexOf("## 4.0.0");
    const newEntry = body.indexOf("## 2026-10-02, Land it (land-it)");
    const oldEntry = body.indexOf("## 2026-09-29, Older entry (older-ticket)");
    expect(release).toBeLessThan(newEntry);
    expect(newEntry).toBeLessThan(oldEntry);
    // The release block survives untouched above the dated region.
    expect(body).toContain("### Major Changes");
    rmSync(t, { recursive: true, force: true });
  });

  test("appends the first entry after the heading when no dated region exists", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    writeChangelog(t, "\n# Task Changelog\n");
    await tools.tw_write_changelog.execute(
      { slug: "land-it", title: "Land it", content: "First.", date: "2026-10-02" },
      ctx(t),
    );
    const body = parse(readFileSync(changelogPath(t), "utf-8")).body;
    expect(body.indexOf("# Task Changelog")).toBeLessThan(body.indexOf("## 2026-10-02, Land it (land-it)"));
    expect(body.trimEnd().endsWith("First.")).toBe(true);
    rmSync(t, { recursive: true, force: true });
  });

  test("dates the entry today when no date is given", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await tools.tw_write_changelog.execute(
      { slug: "land-it", title: "Land it", content: "Dated now." },
      ctx(t),
    );
    const today = new Date().toISOString().slice(0, 10);
    expect(readFileSync(changelogPath(t), "utf-8")).toContain(`## ${today}, Land it (land-it)`);
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses a duplicate entry for the same slug", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    writeChangelog(t, "\n# Task Changelog\n\n## 2026-10-01, Land it (land-it)\n\nAlready recorded.\n");
    await expect(
      tools.tw_write_changelog.execute({ slug: "land-it", title: "Land it", content: "Again." }, ctx(t)),
    ).rejects.toThrow(/already has an entry/);
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses an empty slug, title, or content, and a malformed date", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await expect(
      tools.tw_write_changelog.execute({ slug: "", title: "T", content: "C" }, ctx(t)),
    ).rejects.toThrow(/invalid slug/);
    await expect(
      tools.tw_write_changelog.execute({ slug: "x", title: "  ", content: "C" }, ctx(t)),
    ).rejects.toThrow(/title/);
    await expect(
      tools.tw_write_changelog.execute({ slug: "x", title: "T", content: "   " }, ctx(t)),
    ).rejects.toThrow(/content is empty/);
    await expect(
      tools.tw_write_changelog.execute({ slug: "x", title: "T", content: "C", date: "October 2" }, ctx(t)),
    ).rejects.toThrow(/date/);
    expect(existsSync(changelogPath(t))).toBe(false);
    rmSync(t, { recursive: true, force: true });
  });
});

describe("task-workflow tools: tw_record_out_of_scope, the out-of-scope KB writer", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => { tools = createTools(); });

  function kbDir(t: string): string {
    return join(t, "docs/tasks/out-of-scope");
  }

  test("writes the note with the request and the reason, through the frontmatter seam", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    const out = await tools.tw_record_out_of_scope.execute(
      {
        slug: "mainframe-port",
        title: "Mainframe port",
        request: "Port the CLI to OS/390.",
        reason: "No user runs it there; the port cost exceeds the value.",
      },
      ctx(t),
    );
    expect(out).toContain("mainframe-port.md");
    const doc = parse(readFileSync(join(kbDir(t), "mainframe-port.md"), "utf-8"));
    expect(doc.data.type).toBe("out-of-scope note");
    expect(doc.data.title).toBe("Mainframe port");
    expect(doc.data.status).toBe("stable");
    expect(doc.body).toBe("\n## Request\n\nPort the CLI to OS/390.\n\n## Reason\n\nNo user runs it there; the port cost exceeds the value.\n");
    rmSync(t, { recursive: true, force: true });
  });

  test("updates the index with one bullet per note, sorted by slug", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    writeMd(join(kbDir(t), "index.md"), "type: out-of-scope note\ntitle: out-of-scope\nstatus: stable\n", "\n# out-of-scope\n\n## Notes\n\n- [Zeta](zeta.md)\n");
    await tools.tw_record_out_of_scope.execute(
      { slug: "alpha", title: "Alpha", request: "R", reason: "Q" },
      ctx(t),
    );
    await tools.tw_record_out_of_scope.execute(
      { slug: "mid", title: "Mid", request: "R", reason: "Q" },
      ctx(t),
    );
    const doc = parse(readFileSync(join(kbDir(t), "index.md"), "utf-8"));
    expect(readMapSection(doc.body, "Notes")).toEqual([
      "- [Alpha](alpha.md)",
      "- [Mid](mid.md)",
      "- [Zeta](zeta.md)",
    ]);
    // The index frontmatter survives the update.
    expect(doc.data.type).toBe("out-of-scope note");
    rmSync(t, { recursive: true, force: true });
  });

  test("creates the index when missing, with the bundle's index frontmatter", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await tools.tw_record_out_of_scope.execute(
      { slug: "alpha", title: "Alpha", request: "R", reason: "Q" },
      ctx(t),
    );
    const doc = parse(readFileSync(join(kbDir(t), "index.md"), "utf-8"));
    expect(doc.data.type).toBe("out-of-scope note");
    expect(doc.data.title).toBe("out-of-scope");
    expect(doc.data.status).toBe("stable");
    expect(readMapSection(doc.body, "Notes")).toEqual(["- [Alpha](alpha.md)"]);
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses a duplicate slug: the same no is not recorded twice", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await tools.tw_record_out_of_scope.execute({ slug: "alpha", title: "Alpha", request: "R", reason: "Q" }, ctx(t));
    await expect(
      tools.tw_record_out_of_scope.execute({ slug: "alpha", title: "Alpha again", request: "R2", reason: "Q2" }, ctx(t)),
    ).rejects.toThrow(/already recorded/);
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses an empty request or reason: a rejection without a reason is not a record", async () => {
    const t = mkTmp(); seedPlanningTree(t);
    await expect(
      tools.tw_record_out_of_scope.execute({ slug: "x", title: "X", request: "  ", reason: "Q" }, ctx(t)),
    ).rejects.toThrow(/request is empty/);
    await expect(
      tools.tw_record_out_of_scope.execute({ slug: "x", title: "X", request: "R", reason: "" }, ctx(t)),
    ).rejects.toThrow(/reason is empty/);
    await expect(
      tools.tw_record_out_of_scope.execute({ slug: "Bad Slug", title: "X", request: "R", reason: "Q" }, ctx(t)),
    ).rejects.toThrow(/invalid slug/);
    expect(existsSync(kbDir(t))).toBe(false);
    rmSync(t, { recursive: true, force: true });
  });
});

describe("task-workflow tools: tw_archive_effort, the archive move", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => { tools = createTools(); });

  const INDEX_FM = 'type: index\nokf_version: "0.2"\ntitle: docs/tasks\n';

  /** A finished effort, plus a root index listing it as live. */
  function seedArchiveTree(t: string, withIndex = true): void {
    const base = join(t, "docs/tasks");
    writeMd(join(base, "winding-down/map.md"), "type: map\ntitle: Winding down\nstatus: stable\n");
    writeMd(join(base, "winding-down/spec.md"), "type: spec\ntitle: Winding down spec\nstatus: stable\n");
    writeMd(
      join(base, "winding-down/tasks/decide/task.md"),
      "type: task\nsubtype: research\ntitle: Decide\nstatus: stable\nworkflow_state: done\nblocked_by: []\n",
    );
    writeMd(
      join(base, "winding-down/tickets/land/ticket.md"),
      "type: ticket\nsubtype: feature\ntitle: Land\nstatus: stable\nworkflow_state: done\nblocked_by: []\n",
    );
    if (withIndex) {
      writeMd(
        join(base, "index.md"),
        INDEX_FM,
        "\n# docs/tasks\n\n## Live\n\n- enforced-workflow-v5\n- winding-down\n\n## Archived\n\n- old-effort\n",
      );
    }
    mkdirSync(join(base, "archive/old-effort"), { recursive: true });
    writeMd(join(base, "archive/old-effort/map.md"), "type: map\ntitle: Old effort\nstatus: deprecated\n");
  }

  test("refuses an effort that is not finalizable, naming what remains", async () => {
    const t = mkTmp(); seedArchiveTree(t);
    writeFileSync(
      join(t, "docs/tasks/winding-down/tickets/land/ticket.md"),
      readFileSync(join(t, "docs/tasks/winding-down/tickets/land/ticket.md"), "utf-8").replace("done", "todo"),
      "utf-8",
    );
    await expect(tools.tw_archive_effort.execute({ selector: "winding-down" }, ctx(t))).rejects.toThrow(
      /unfinished item\(s\): land/,
    );
    // The refusal moves nothing and deprecates nothing.
    expect(existsSync(join(t, "docs/tasks/winding-down/map.md"))).toBe(true);
    expect(existsSync(join(t, "docs/tasks/archive/winding-down"))).toBe(false);
    rmSync(t, { recursive: true, force: true });
  });

  test("deprecates the map and its done items, then moves the effort to the archive", async () => {
    const t = mkTmp(); seedArchiveTree(t);
    const out = await tools.tw_archive_effort.execute({ selector: "winding-down" }, ctx(t));
    expect(out).toContain("archive/winding-down");
    expect(existsSync(join(t, "docs/tasks/winding-down"))).toBe(false);

    const map = parse(readFileSync(join(t, "docs/tasks/archive/winding-down/map.md"), "utf-8"));
    expect(map.data.status).toBe("deprecated");
    expect(map.data).not.toHaveProperty("workflow_state");
    const ticket = parse(readFileSync(join(t, "docs/tasks/archive/winding-down/tickets/land/ticket.md"), "utf-8"));
    expect(ticket.data.status).toBe("deprecated");
    expect(ticket.data.workflow_state).toBe("done");
    const task = parse(readFileSync(join(t, "docs/tasks/archive/winding-down/tasks/decide/task.md"), "utf-8"));
    expect(task.data.status).toBe("deprecated");
    expect(task.data.workflow_state).toBe("done");
    // The spec is not a done item: it keeps its status.
    const spec = parse(readFileSync(join(t, "docs/tasks/archive/winding-down/spec.md"), "utf-8"));
    expect(spec.data.status).toBe("stable");
    rmSync(t, { recursive: true, force: true });
  });

  test("updates the root index: the effort leaves Live and joins Archived, both sorted", async () => {
    const t = mkTmp(); seedArchiveTree(t);
    await tools.tw_archive_effort.execute({ selector: "winding-down" }, ctx(t));
    const doc = parse(readFileSync(join(t, "docs/tasks/index.md"), "utf-8"));
    expect(readMapSection(doc.body, "Live")).toEqual(["- enforced-workflow-v5"]);
    expect(readMapSection(doc.body, "Archived")).toEqual(["- old-effort", "- winding-down"]);
    // The index frontmatter survives.
    expect(doc.data.type).toBe("index");
    expect(doc.data.okf_version).toBe("0.2");
    rmSync(t, { recursive: true, force: true });
  });

  test("creates the root index with the migration's shape when it is missing", async () => {
    const t = mkTmp(); seedArchiveTree(t, false);
    const out = await tools.tw_archive_effort.execute({ selector: "winding-down" }, ctx(t));
    expect(out).toContain("index");
    const doc = parse(readFileSync(join(t, "docs/tasks/index.md"), "utf-8"));
    expect(doc.data.type).toBe("index");
    expect(doc.data.okf_version).toBe("0.2");
    expect(doc.data.title).toBe("docs/tasks");
    expect(readMapSection(doc.body, "Live")).toEqual(["(none)"]);
    // A missing index carries no memory of earlier archives: this run's move
    // is the only entry it can list.
    expect(readMapSection(doc.body, "Archived")).toEqual(["- winding-down"]);
    rmSync(t, { recursive: true, force: true });
  });

  test("refuses an already-archived effort and a destination collision", async () => {
    const t = mkTmp(); seedArchiveTree(t);
    await expect(tools.tw_archive_effort.execute({ selector: "old-effort" }, ctx(t))).rejects.toThrow(
      /not a live effort/,
    );
    rmSync(t, { recursive: true, force: true });

    const t2 = mkTmp(); seedArchiveTree(t2);
    mkdirSync(join(t2, "docs/tasks/archive/winding-down"), { recursive: true });
    await expect(tools.tw_archive_effort.execute({ selector: "winding-down" }, ctx(t2))).rejects.toThrow(
      /already exists/,
    );
    // The collision refuses without deprecating the live map.
    expect(parse(readFileSync(join(t2, "docs/tasks/winding-down/map.md"), "utf-8")).data.status).toBe("stable");
    rmSync(t2, { recursive: true, force: true });
  });

  test("refuses a v3-shape map: run the migration first", async () => {
    const t = mkTmp();
    writeMd(join(t, "docs/tasks/maps/legacy/map.md"), "kind: map\ntitle: Legacy\nslug: legacy\nstatus: draft\n");
    writeMd(join(t, "docs/tasks/maps/legacy/tasks/decide/task.md"), "kind: task\ntitle: Decide\nslug: decide\nstatus: done\n");
    await expect(tools.tw_archive_effort.execute({ selector: "legacy" }, ctx(t))).rejects.toThrow(
      /schema-5 migration/,
    );
    rmSync(t, { recursive: true, force: true });
  });
});
