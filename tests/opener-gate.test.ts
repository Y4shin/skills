/**
 * Opener-gate tests: the per-skill toolset registry and the opener's
 * phase preconditions.
 *
 * Drives createTools() directly with a fake active-tool-set context (the
 * seam the factory wires to pi.setActiveTools/getActiveTools) against real
 * fixture trees on disk, so the gate reads the same artifact-tree seam the
 * tools do (scanArtifacts plus the pure art.ts/graph.ts layers).
 *
 * The opener refusal table lives here too: given a tree state, does the
 * opener refuse or open, and does a refusal name the legal next calls.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { dump } from "../src/core/frontmatter.js";
import { createTools } from "../src/pi.js";
import { ALWAYS_DECLARED, CLOSER, SKILL_REGISTRY, openSkillsIn, signatureToolOf } from "../src/disclosure.js";

// ─── Fixture tree ─────────────────────────────────────────────────────────────

let repo: string;

/** A minimal effort: a map, plus whatever extras the fixture needs. */
function writeEffort(
  slug: string,
  files: Record<string, { data: Record<string, unknown>; body?: string }>,
): void {
  for (const [name, doc] of Object.entries(files)) {
    const path = join(repo, "docs", "tasks", slug, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, dump({ data: doc.data, body: doc.body ?? "\n" }), "utf-8");
  }
}

beforeAll(() => {
  repo = join(tmpdir(), `opener-gate-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(join(repo, "docs", "tasks"), { recursive: true });
  // A fully implementable effort: map (flag set), stable spec, stable
  // architecture document, one ready ticket, one done ticket.
  writeEffort("ready-effort", {
    "map.md": { data: { type: "map", title: "Ready effort", ready_for_spec: true } },
    "spec.md": { data: { type: "spec", title: "Ready effort spec", status: "stable" } },
    "arch-spec.md": { data: { type: "arch spec", title: "Ready effort architecture", status: "stable" } },
    "tickets/one/ticket.md": {
      data: { type: "ticket", subtype: "feature", title: "One", status: "stable", workflow_state: "ready", blocked_by: [] },
    },
    "tickets/two/ticket.md": {
      data: { type: "ticket", subtype: "feature", title: "Two", status: "stable", workflow_state: "done", blocked_by: ["one"] },
    },
  });
  // A planning effort whose reconcile never ran: the flag is absent, which
  // reads false.
  writeEffort("unreconciled", {
    "map.md": { data: { type: "map", title: "Unreconciled effort" } },
  });
  // Ticket generation has not run: a spec, no tickets.
  writeEffort("spec-only", {
    "map.md": { data: { type: "map", title: "Spec only", ready_for_spec: true } },
    "spec.md": { data: { type: "spec", title: "Spec only spec", status: "stable" } },
  });
  // Every ticket done: the effort is ready to finalize, not to implement.
  writeEffort("all-done", {
    "map.md": { data: { type: "map", title: "All done", ready_for_spec: true } },
    "spec.md": { data: { type: "spec", title: "All done spec", status: "stable" } },
    "arch-spec.md": { data: { type: "arch spec", title: "All done architecture", status: "stable" } },
    "tickets/first/ticket.md": {
      data: { type: "ticket", subtype: "feature", title: "First", status: "stable", workflow_state: "done", blocked_by: [] },
    },
    "tickets/second/ticket.md": {
      data: { type: "ticket", subtype: "feature", title: "Second", status: "stable", workflow_state: "done", blocked_by: ["first"] },
    },
  });
  // A ticket marked blocked, one blocked by an unfinished ticket, and one
  // gated behind an unfinished prerequisite without a blocked marking.
  writeEffort("gated-effort", {
    "map.md": { data: { type: "map", title: "Gated effort", ready_for_spec: true } },
    "spec.md": { data: { type: "spec", title: "Gated effort spec", status: "stable" } },
    "arch-spec.md": { data: { type: "arch spec", title: "Gated effort architecture", status: "stable" } },
    "tickets/stuck/ticket.md": {
      data: { type: "ticket", subtype: "feature", title: "Stuck", status: "stable", workflow_state: "ready", blocked_by: [] },
    },
    "tickets/marked-blocked/ticket.md": {
      data: {
        type: "ticket", subtype: "feature", title: "Marked blocked", status: "stable", workflow_state: "blocked", blocked_by: [],
      },
    },
    "tickets/blocked-by-item/ticket.md": {
      data: {
        type: "ticket", subtype: "feature", title: "Blocked by item", status: "stable", workflow_state: "blocked", blocked_by: ["stuck"],
      },
    },
    "tickets/gated/ticket.md": {
      data: {
        type: "ticket", subtype: "feature", title: "Gated", status: "stable", workflow_state: "ready", blocked_by: ["stuck"],
      },
    },
  });
  // A resumed run: the in-progress ticket is a legal target.
  writeEffort("ready-effort", {
    "tickets/three/ticket.md": {
      data: {
        type: "ticket", subtype: "feature", title: "Three", status: "stable", workflow_state: "in-progress", blocked_by: [],
      },
    },
  });
  // Ticket generation ran, the architecture document did not.
  writeEffort("no-arch", {
    "map.md": { data: { type: "map", title: "No arch", ready_for_spec: true } },
    "spec.md": { data: { type: "spec", title: "No arch spec", status: "stable" } },
    "tickets/only/ticket.md": {
      data: { type: "ticket", subtype: "feature", title: "Only", status: "stable", workflow_state: "ready", blocked_by: [] },
    },
  });
  // The architecture document exists but was never published.
  writeEffort("draft-arch", {
    "map.md": { data: { type: "map", title: "Draft arch", ready_for_spec: true } },
    "spec.md": { data: { type: "spec", title: "Draft arch spec", status: "stable" } },
    "arch-spec.md": { data: { type: "arch spec", title: "Draft arch architecture", status: "draft" } },
    "tickets/only/ticket.md": {
      data: { type: "ticket", subtype: "feature", title: "Only", status: "stable", workflow_state: "ready", blocked_by: [] },
    },
  });
  // The schema-5 name: architecture.md at the effort root.
  writeEffort("v5-arch", {
    "map.md": { data: { type: "map", title: "V5 arch", ready_for_spec: true } },
    "spec.md": { data: { type: "spec", title: "V5 arch spec", status: "stable" } },
    "architecture.md": { data: { type: "architecture", title: "V5 arch architecture", status: "stable" } },
    "tickets/only/ticket.md": {
      data: { type: "ticket", subtype: "feature", title: "Only", status: "stable", workflow_state: "ready", blocked_by: [] },
    },
  });
  // A bug-only effort: no architecture document by design.
  writeEffort("bug-only", {
    "map.md": { data: { type: "map", title: "Bug only", ready_for_spec: true } },
    "spec.md": { data: { type: "spec", title: "Bug only spec", status: "stable" } },
    "tickets/fix-one/ticket.md": {
      data: { type: "ticket", subtype: "bug", title: "Fix one", status: "stable", workflow_state: "ready", blocked_by: [] },
    },
    "tickets/fix-two/ticket.md": {
      data: { type: "ticket", subtype: "bug", title: "Fix two", status: "stable", workflow_state: "done", blocked_by: ["fix-one"] },
    },
  });
  // Finalizable efforts whose review artifact is the archive gate's subject:
  // one with undispositioned findings, one fully dispositioned, one whose
  // superseded review no longer blocks.
  const doneTickets = (slugs: string[]) =>
    Object.fromEntries(
      slugs.map((slug, i) => [
        `tickets/${slug}/ticket.md`,
        {
          data: {
            type: "ticket", subtype: "feature", title: slug, status: "stable", workflow_state: "done",
            blocked_by: i === 0 ? [] : [slugs[i - 1]!],
          },
        },
      ]),
    );
  writeEffort("review-pending", {
    "map.md": { data: { type: "map", title: "Review pending", ready_for_spec: true } },
    "spec.md": { data: { type: "spec", title: "Review pending spec", status: "stable" } },
    "review.md": { data: { type: "review", title: "Review pending review" } },
    ...doneTickets(["done-a"]),
  });
  writeEffort("review-dispositioned", {
    "map.md": { data: { type: "map", title: "Reviewed", ready_for_spec: true } },
    "spec.md": { data: { type: "spec", title: "Reviewed spec", status: "stable" } },
    "review.md": { data: { type: "review", title: "Reviewed review", dispositioned: true } },
    ...doneTickets(["done-a"]),
  });
  writeEffort("review-superseded", {
    "map.md": { data: { type: "map", title: "Superseded review", ready_for_spec: true } },
    "spec.md": { data: { type: "spec", title: "Superseded review spec", status: "stable" } },
    "review.md": { data: { type: "review", title: "Old review", status: "deprecated" } },
    ...doneTickets(["done-a"]),
  });
});

afterAll(() => {
  rmSync(repo, { recursive: true, force: true });
});

/** A tool context with an in-memory active set standing in for the session. */
function disclosureCtx(active: string[]) {
  return {
    directory: repo,
    getActiveTools: () => [...active],
    setActiveTools: (names: string[]) => {
      active.splice(0, active.length, ...names);
    },
  };
}

interface ToolResult {
  text: string;
  details: {
    opened?: boolean;
    closed?: boolean;
    reason?: string;
    legal_next?: string[];
    open?: string[];
    disclosed?: string[];
  };
}

// ─── The registry is the single source of the gates ───────────────────────────

describe("the registry is the single source of the gates", () => {
  test("no phase skill's prose restates the opener preconditions", () => {
    // The gate preconditions live in the extension tools only (the registry
    // row plus the evaluator); skill prose carries meaning and craft, never
    // the phase gates. The v5 skills land against this registry, so whichever
    // phase skill dirs exist are pinned here.
    const phaseSkills = ["intake", "wayfinder", "to-spec", "to-tickets", "implement-ticket", "finalize-effort"];
    const gatePhrases = /ready_for_spec|undispositioned|arch-spec\.md is missing|architecture\.md is missing/;
    for (const skill of phaseSkills) {
      const skillPath = join("skills", "engineering", skill, "SKILL.md");
      const absolute = join(process.cwd(), skillPath);
      if (!existsSync(absolute)) continue;
      const prose = readFileSync(absolute, "utf-8");
      expect(prose, `${skillPath} must not restate the opener preconditions`).not.toMatch(gatePhrases);
    }
  });
});

// ─── The finalize-effort archive gate: undispositioned findings ──────────────

describe("the finalize-effort archive gate", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => {
    tools = createTools();
  });

  test("refuses the archive move while a finding is undispositioned", async () => {
    await expect(
      tools.tw_archive_effort.execute({ selector: "review-pending" }, { directory: repo }),
    ).rejects.toThrow(/undispositioned/);
    await expect(
      tools.tw_archive_effort.execute({ selector: "review-pending" }, { directory: repo }),
    ).rejects.toThrow(/review\.md/);
    // Nothing moved.
    expect(existsSync(join(repo, "docs", "tasks", "review-pending", "map.md"))).toBe(true);
    expect(existsSync(join(repo, "docs", "tasks", "archive", "review-pending"))).toBe(false);
  });

  test("archives when every finding is dispositioned", async () => {
    const out = (await tools.tw_archive_effort.execute(
      { selector: "review-dispositioned" },
      { directory: repo },
    )) as unknown as string;
    expect(out).toContain("archived");
    expect(existsSync(join(repo, "docs", "tasks", "archive", "review-dispositioned", "map.md"))).toBe(true);
  });

  test("a superseded (deprecated) review artifact no longer blocks the archive", async () => {
    const out = (await tools.tw_archive_effort.execute(
      { selector: "review-superseded" },
      { directory: repo },
    )) as unknown as string;
    expect(out).toContain("archived");
  });
});

// ─── The implementation gate: the architecture document ──────────────────────

describe("the implementation gate: the architecture document", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => {
    tools = createTools();
  });

  test("refuses a missing architecture document, pointing at to-tickets and naming the v5 rename", async () => {
    const active = [...ALWAYS_DECLARED];
    const result = (await tools.tw_open.execute(
      { skill: "implement-ticket", effort: "no-arch", target: "only" },
      disclosureCtx(active),
    )) as ToolResult;
    expect(result.details.opened).toBe(false);
    expect(result.details.reason).toContain("architecture");
    expect(result.details.reason).toContain("architecture.md");
    expect(result.details.reason).toContain("arch-spec.md");
    expect(result.details.legal_next).toEqual(["run to-tickets"]);
    expect(active).toEqual([...ALWAYS_DECLARED]);
  });

  test("refuses an unstable architecture document and never drafts one", async () => {
    const active = [...ALWAYS_DECLARED];
    const result = (await tools.tw_open.execute(
      { skill: "implement-ticket", effort: "draft-arch", target: "only" },
      disclosureCtx(active),
    )) as ToolResult;
    expect(result.details.opened).toBe(false);
    expect(result.details.reason).toContain("draft");
    expect(result.details.reason).toContain("not stable");
    expect(result.details.legal_next).toEqual(["run to-tickets"]);
    expect(active).toEqual([...ALWAYS_DECLARED]);
  });

  test("opens on a stable architecture.md, the schema-5 name", async () => {
    const active = [...ALWAYS_DECLARED];
    const result = (await tools.tw_open.execute(
      { skill: "implement-ticket", effort: "v5-arch", target: "only" },
      disclosureCtx(active),
    )) as ToolResult;
    expect(result.details.opened).toBe(true);
  });

  test("a bug-only effort needs no architecture document and opens", async () => {
    const active = [...ALWAYS_DECLARED];
    const result = (await tools.tw_open.execute(
      { skill: "implement-ticket", effort: "bug-only", target: "fix-one" },
      disclosureCtx(active),
    )) as ToolResult;
    expect(result.details.opened).toBe(true);
  });
});

// ─── The implementation gate: the target ticket ──────────────────────────────

describe("the implementation gate: the target ticket", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => {
    tools = createTools();
  });

  test("a legal target activates the toolset and returns opened true", async () => {
    const active = [...ALWAYS_DECLARED];
    const result = (await tools.tw_open.execute(
      { skill: "implement-ticket", effort: "ready-effort", target: "one" },
      disclosureCtx(active),
    )) as ToolResult;
    expect(result.details.opened).toBe(true);
    expect(result.details).toMatchObject({ skill: "implement-ticket", effort: "ready-effort", target: "one" });
    for (const tool of ["tw_write_changelog", "tw_mark_done", "tw_frontier", "tw_close"]) {
      expect(active, `${tool} must be declared once the ticket phase is open`).toContain(tool);
    }
  });

  test("an in-progress target is legal: a resumed run opens", async () => {
    const active = [...ALWAYS_DECLARED];
    const result = (await tools.tw_open.execute(
      { skill: "implement-ticket", effort: "ready-effort", target: "three" },
      disclosureCtx(active),
    )) as ToolResult;
    expect(result.details.opened).toBe(true);
  });

  test("refuses a done target and names the remaining ready tickets", async () => {
    const active = [...ALWAYS_DECLARED];
    const result = (await tools.tw_open.execute(
      { skill: "implement-ticket", effort: "ready-effort", target: "two" },
      disclosureCtx(active),
    )) as ToolResult;
    expect(result.details.opened).toBe(false);
    expect(result.details.reason).toContain("'two' is done");
    // The ready frontier is the legal next: the untouched ticket and the
    // in-progress one a resumed run would pick up.
    expect(result.details.legal_next).toEqual(["implement-ticket: one", "implement-ticket: three"]);
    expect(active).toEqual([...ALWAYS_DECLARED]);
  });

  test("refuses a blocked target and names the blocker", async () => {
    const active = [...ALWAYS_DECLARED];
    const result = (await tools.tw_open.execute(
      { skill: "implement-ticket", effort: "gated-effort", target: "blocked-by-item" },
      disclosureCtx(active),
    )) as ToolResult;
    expect(result.details.opened).toBe(false);
    expect(result.details.reason).toContain("blocked");
    expect(result.details.reason).toContain("stuck");
    expect(result.details.legal_next).toEqual(["implement-ticket: stuck"]);
    expect(active).toEqual([...ALWAYS_DECLARED]);
  });

  test("refuses a target marked blocked with no unfinished blocker", async () => {
    const active = [...ALWAYS_DECLARED];
    const result = (await tools.tw_open.execute(
      { skill: "implement-ticket", effort: "gated-effort", target: "marked-blocked" },
      disclosureCtx(active),
    )) as ToolResult;
    expect(result.details.opened).toBe(false);
    expect(result.details.reason).toContain("marked blocked");
    expect(active).toEqual([...ALWAYS_DECLARED]);
  });

  test("refuses a not-ready target whose blockers are unfinished, naming them", async () => {
    const active = [...ALWAYS_DECLARED];
    const result = (await tools.tw_open.execute(
      { skill: "implement-ticket", effort: "gated-effort", target: "gated" },
      disclosureCtx(active),
    )) as ToolResult;
    expect(result.details.opened).toBe(false);
    expect(result.details.reason).toContain("not ready");
    expect(result.details.reason).toContain("stuck");
    expect(result.details.legal_next).toEqual(["implement-ticket: stuck"]);
    expect(active).toEqual([...ALWAYS_DECLARED]);
  });

  test("refuses a target that is no ticket of the effort", async () => {
    const active = [...ALWAYS_DECLARED];
    const result = (await tools.tw_open.execute(
      { skill: "implement-ticket", effort: "ready-effort", target: "no-such-ticket" },
      disclosureCtx(active),
    )) as ToolResult;
    expect(result.details.opened).toBe(false);
    expect(result.details.reason).toContain("no ticket 'no-such-ticket'");
    expect(active).toEqual([...ALWAYS_DECLARED]);
  });
});

// ─── The implementation gate: the effort's work state ────────────────────────

describe("the implementation gate: the effort's work state", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => {
    tools = createTools();
  });

  test("a targetless ticket open is a refusal that names the retry, not a throw", async () => {
    const active = [...ALWAYS_DECLARED];
    const result = (await tools.tw_open.execute(
      { skill: "implement-ticket", effort: "ready-effort" },
      disclosureCtx(active),
    )) as ToolResult;
    expect(result.details.opened).toBe(false);
    expect(result.details.reason).toContain("target");
    expect(result.details.legal_next?.length).toBeGreaterThan(0);
    expect(active).toEqual([...ALWAYS_DECLARED]);
  });

  test("refuses an effort with a spec and no tickets, pointing at to-tickets", async () => {
    const active = [...ALWAYS_DECLARED];
    const result = (await tools.tw_open.execute(
      { skill: "implement-ticket", effort: "spec-only", target: "one" },
      disclosureCtx(active),
    )) as ToolResult;
    expect(result.details.opened).toBe(false);
    expect(result.details.reason).toContain("spec but no tickets");
    expect(result.details.legal_next).toEqual(["run to-tickets"]);
    expect(active).toEqual([...ALWAYS_DECLARED]);
  });

  test("refuses an effort with every ticket done, pointing at finalize-effort", async () => {
    const active = [...ALWAYS_DECLARED];
    const result = (await tools.tw_open.execute(
      { skill: "implement-ticket", effort: "all-done", target: "first" },
      disclosureCtx(active),
    )) as ToolResult;
    expect(result.details.opened).toBe(false);
    expect(result.details.reason).toContain("done");
    expect(result.details.legal_next).toEqual(["run finalize-effort"]);
    expect(active).toEqual([...ALWAYS_DECLARED]);
  });
});

// ─── The to-spec flag gate ────────────────────────────────────────────────────────

describe("the to-spec flag gate", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => {
    tools = createTools();
  });

  test("refuses when ready_for_spec is false and points back to Wayfinder", async () => {
    const active = [...ALWAYS_DECLARED];
    const result = (await tools.tw_open.execute(
      { skill: "to-spec", effort: "unreconciled" },
      disclosureCtx(active),
    )) as ToolResult;
    expect(result.details.opened).toBe(false);
    expect(result.details.reason).toContain("ready_for_spec");
    expect(result.details.reason).toMatch(/wayfinder/i);
    expect(result.details.legal_next).toEqual(["run wayfinder"]);
    // A refused open activates nothing.
    expect(active).toEqual([...ALWAYS_DECLARED]);
  });

  test("opens when ready_for_spec is true and discloses the spec writer", async () => {
    const active = [...ALWAYS_DECLARED];
    const ctx = disclosureCtx(active);
    const result = (await tools.tw_open.execute({ skill: "to-spec", effort: "ready-effort" }, ctx)) as ToolResult;
    expect(result.details.opened).toBe(true);
    for (const tool of ["tw_write_spec", "tw_close"]) {
      expect(active).toContain(tool);
    }
  });
});

// ─── The opener gate ──────────────────────────────────────────────────────────

describe("the opener gate", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => {
    tools = createTools();
  });

  test("refuses a phase open on an effort that does not exist, naming the live efforts", async () => {
    const active = [...ALWAYS_DECLARED];
    const result = (await tools.tw_open.execute(
      { skill: "wayfinder", effort: "no-such-effort" },
      disclosureCtx(active),
    )) as ToolResult;
    expect(result.details.opened).toBe(false);
    expect(result.details.reason).toContain("no live effort 'no-such-effort'");
    expect(result.details.reason).toContain("ready-effort");
    expect(result.details.legal_next).toEqual(["run intake"]);
    // A refused open activates nothing.
    expect(active).toEqual([...ALWAYS_DECLARED]);
  });

  test("refuses each effort-taking phase the same way", async () => {
    for (const skill of ["wayfinder", "to-spec", "to-tickets", "implement-ticket", "finalize-effort"]) {
      const active = [...ALWAYS_DECLARED];
      const args: Record<string, unknown> = { skill, effort: "no-such-effort" };
      if (skill === "implement-ticket") args.target = "one";
      const result = (await tools.tw_open.execute(args, disclosureCtx(active))) as ToolResult;
      expect(result.details.opened, `${skill} refuses the unknown effort`).toBe(false);
      expect(result.details.reason).toContain("no live effort");
      expect(active).toEqual([...ALWAYS_DECLARED]);
    }
  });

  test("opens the phases that carry no effort precondition", async () => {
    // Intake creates the effort it is opened for, so the slug need not exist;
    // setup-workflow and skill-creator are not effort-scoped at all.
    for (const skill of ["intake", "setup-workflow", "skill-creator"]) {
      const active = [...ALWAYS_DECLARED];
      const result = (await tools.tw_open.execute(
        { skill, effort: "brand-new-effort" },
        disclosureCtx(active),
      )) as ToolResult;
      expect(result.details.opened, `${skill} opens without an existing effort`).toBe(true);
      await tools.tw_close.execute({ skill }, disclosureCtx(active));
    }
  });

  test("refusals name the legal next calls", async () => {
    // A duplicate open: the work is already open, nothing further is legal
    // through the opener.
    const first = [...ALWAYS_DECLARED];
    const firstCtx = disclosureCtx(first);
    await tools.tw_open.execute({ skill: "wayfinder", effort: "ready-effort" }, firstCtx);
    const duplicate = (await tools.tw_open.execute(
      { skill: "wayfinder", effort: "ready-effort" },
      firstCtx,
    )) as ToolResult;
    expect(duplicate.details.legal_next).toEqual([]);

    // A conflicting open: the legal next call is closing the open skill.
    const second = [...ALWAYS_DECLARED];
    const secondCtx = disclosureCtx(second);
    await tools.tw_open.execute({ skill: "wayfinder", effort: "ready-effort" }, secondCtx);
    const conflict = (await tools.tw_open.execute(
      { skill: "to-tickets", effort: "ready-effort" },
      secondCtx,
    )) as ToolResult;
    expect(conflict.details.opened).toBe(false);
    expect(conflict.details.legal_next).toEqual(["tw_close wayfinder"]);
    expect(second).toEqual([...ALWAYS_DECLARED, "tw_close", ...SKILL_REGISTRY.find((e) => e.name === "wayfinder")!.toolset].sort());
  });
});

// ─── The phase-to-toolset registry ─────────────────────────────────────────────

describe("the phase-to-toolset registry", () => {
  test("maps every skill to its real phase toolset", () => {
    const toolsetOf = Object.fromEntries(SKILL_REGISTRY.map((e) => [e.name, e.toolset.sort()]));
    expect(toolsetOf).toEqual({
      intake: ["tw_add_ticket", "tw_get", "tw_list", "tw_state", "tw_state_set"],
      "setup-workflow": ["tw_context", "tw_get", "tw_list"],
      wayfinder: [
        "tw_finalize_map",
        "tw_frontier",
        "tw_get",
        "tw_list",
        "tw_mark_blocked",
        "tw_mark_done",
        "tw_record_out_of_scope",
        "tw_write_section",
      ],
      "to-spec": ["tw_get", "tw_list", "tw_write_spec"],
      // The signature tool is the architecture writer: to-tickets-architecture
      // rotated it here from the interim tw_map_finalizable when the writer
      // landed. tw_map_finalizable stays disclosed as the graph-state read.
      "to-tickets": ["tw_add_ticket", "tw_dependency_levels", "tw_get", "tw_list", "tw_map_finalizable", "tw_split_ticket", "tw_write_architecture"],
      "implement-ticket": [
        "tw_add_ticket",
        "tw_dependency_levels",
        "tw_frontier",
        "tw_get",
        "tw_list",
        "tw_mark_blocked",
        "tw_mark_done",
        "tw_resolve_uncertainty",
        "tw_split_ticket",
        "tw_write_changelog",
      ],
      "finalize-effort": ["tw_add_ticket", "tw_archive_effort", "tw_finalizable", "tw_get", "tw_list"],
      "skill-creator": ["tw_show"],
    });
  });

  test("discloses every registered workflow tool through some phase toolset", () => {
    const tools = createTools();
    const registered = Object.keys(tools).filter(
      (n) => n.startsWith("tw_") && ![...ALWAYS_DECLARED, CLOSER].includes(n),
    );
    const disclosed = new Set(SKILL_REGISTRY.flatMap((e) => e.toolset));
    for (const name of registered) {
      expect(disclosed.has(name), `${name} must be disclosed by some phase toolset`).toBe(true);
    }
  });

  test("keeps one private signature tool per skill, so the open-set derivation stays exact", () => {
    for (const entry of SKILL_REGISTRY) {
      expect(() => signatureToolOf(entry)).not.toThrow();
      // The derivation is exact: the signature tool is active precisely when
      // the skill is open.
      const active = [...entry.toolset, CLOSER];
      expect(openSkillsIn(active).has(entry.name), `${entry.name} derives from its signature tool`).toBe(true);
    }
    expect(openSkillsIn([...ALWAYS_DECLARED]).size).toBe(0);
  });

  test("the opener serves the registry: a legal open discloses exactly the entry's toolset plus the closer", async () => {
    const tools = createTools();
    for (const entry of SKILL_REGISTRY) {
      const active: string[] = [...ALWAYS_DECLARED];
      const args: Record<string, unknown> = { skill: entry.name, effort: "ready-effort" };
      if (entry.takesTarget) args.target = "one";
      const result = (await tools.tw_open.execute(args, disclosureCtx(active))) as ToolResult;
      expect(result.details.opened, `${entry.name} opens`).toBe(true);
      const idleAndCloser = [...ALWAYS_DECLARED, CLOSER];
      const expected = [...new Set([...entry.toolset, CLOSER])].sort();
      expect([...active].sort(), `${entry.name} discloses its registry toolset`).toEqual(
        [...new Set([...idleAndCloser, ...entry.toolset])].sort(),
      );
      expect(active.filter((t) => !expected.includes(t) && !ALWAYS_DECLARED.includes(t as any))).toEqual([]);
      await tools.tw_close.execute({ skill: entry.name }, disclosureCtx(active));
    }
  });
});
