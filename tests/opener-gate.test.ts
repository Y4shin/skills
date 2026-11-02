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

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { dump, parse } from "../src/core/frontmatter.js";
import { createTools } from "../src/pi.js";
import {
  ALWAYS_DECLARED,
  CLOSER,
  SKILL_REGISTRY,
  assertDerivableOpenSets,
  openSkillsIn,
  privateToolOf,
} from "../src/disclosure.js";
import {
  MAP_SECTION_NON_GOALS,
  MAP_SECTION_NON_NEGOTIABLE_FACTS,
  readMapSection,
} from "../src/core/art.js";
import { parse as frontmatterParse } from "../src/core/frontmatter.js";
import { fromFrontmatter } from "../src/core/art.js";

/** Read a fixture artifact file the way the tools' own seam does. */
function parseArtifactFile(path: string): { art: ReturnType<typeof fromFrontmatter>; doc: ReturnType<typeof frontmatterParse> } {
  const doc = frontmatterParse(readFileSync(path, "utf-8"));
  return { art: fromFrontmatter(doc.data, path), doc };
}

/** Every markdown file under a skill directory, excluding its bundled scripts. */
function markdownFilesUnder(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "scripts") markdownFilesUnder(path, out);
    } else if (entry.name.endsWith(".md")) {
      out.push(path);
    }
  }
  return out;
}

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
    "review.md": {
      data: {
        type: "review",
        title: "Reviewed review",
        dispositioned: true,
        reconcile: "none: the fixture ships no architecture document",
      },
    },
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
function disclosureCtx(active: string[], extra: Record<string, unknown> = {}) {
  return {
    directory: repo,
    getActiveTools: () => [...active],
    setActiveTools: (names: string[]) => {
      active.splice(0, active.length, ...names);
    },
    ...extra,
  };
}

/**
 * A context that can answer a tool request: the operator's decision, the
 * nested calls it recorded, and the sibling feedback tool's schema so the
 * row takes the `source` shape.
 */
function requestCtx(
  active: string[],
  decision: boolean | undefined,
  executed: Array<{ name: string; args: Record<string, unknown> }>,
) {
  return disclosureCtx(active, {
    hasUI: decision !== undefined,
    ...(decision === undefined ? {} : { confirm: async () => decision }),
    executeTool: async (name: string, args: unknown) => {
      executed.push({ name, args: (args ?? {}) as Record<string, unknown> });
      return { isError: false };
    },
    tools: [{ name: "submit_feedback", parameters: { properties: { source: {}, kind: {}, data: {} } } }],
  });
}

interface ToolResult {
  text: string;
  details: {
    opened?: boolean;
    closed?: boolean;
    granted?: boolean;
    tool?: string;
    removed?: string[];
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

  test("a review written through the writer blocks the archive until its findings are dispositioned", async () => {
    const doneTicket = {
      data: {
        type: "ticket", subtype: "feature", title: "Done a", status: "stable",
        workflow_state: "done", blocked_by: [],
      },
    };
    writeEffort("writer-pending", {
      "map.md": { data: { type: "map", title: "Writer pending" } },
      "tickets/done-a/ticket.md": doneTicket,
    });
    await tools.tw_write_review.execute(
      { selector: "writer-pending", content: "## Findings\n\n1. Something to triage." },
      { directory: repo },
    );
    // The first pass carries no dispositions: the flag is closed and the gate
    // reads it.
    await expect(
      tools.tw_archive_effort.execute({ selector: "writer-pending" }, { directory: repo }),
    ).rejects.toThrow(/review\.md/);

    await tools.tw_write_review.execute(
      {
        selector: "writer-pending",
        content: "## Findings\n\n1. Something to triage.",
        findings: [{ finding: "Something to triage", disposition: "informational" }],
        reconcile: "none: the fixture ships no architecture document",
      },
      { directory: repo },
    );
    const out = (await tools.tw_archive_effort.execute(
      { selector: "writer-pending" },
      { directory: repo },
    )) as unknown as string;
    expect(out).toContain("archived");
  });

  test("an accepted follow-up's moved findings unblock the origin's archive", async () => {
    const doneTicket = {
      data: {
        type: "ticket", subtype: "feature", title: "Done a", status: "stable",
        workflow_state: "done", blocked_by: [],
      },
    };
    writeEffort("writer-origin", {
      "map.md": { data: { type: "map", title: "Writer origin" } },
      "tickets/done-a/ticket.md": doneTicket,
    });
    writeEffort("writer-child", {
      "map.md": { data: { type: "map", title: "Writer child", origin_effort: "writer-origin" } },
    });
    await tools.tw_write_review.execute(
      {
        selector: "writer-origin",
        content: "## Findings\n\n1. Too large for this effort.",
        reconcile: "none: the fixture ships no architecture document",
        findings: [
          { finding: "Too large for this effort", disposition: "follow-up", target: "writer-child" },
        ],
        follow_up: "writer-child",
      },
      { directory: repo },
    );
    expect(existsSync(join(repo, "docs", "tasks", "writer-child", "review.md"))).toBe(true);
    const out = (await tools.tw_archive_effort.execute(
      { selector: "writer-origin" },
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
    expect(second).toEqual(
      [...new Set([...ALWAYS_DECLARED, ...SKILL_REGISTRY.find((e) => e.name === "wayfinder")!.toolset])].sort(),
    );
  });
});

// ─── Requesting a tool a phase does not disclose ──────────────────────────────

describe("tw_request_tool", () => {
  test("grants on approval, records the outcome as feedback, and the next close revokes it", async () => {
    const tools = createTools();
    const active: string[] = [...ALWAYS_DECLARED];
    const executed: Array<{ name: string; args: Record<string, unknown> }> = [];
    const ctx = requestCtx(active, true, executed);
    await tools.tw_open.execute({ skill: "wayfinder", effort: "ready-effort" }, ctx);

    const granted = (await tools.tw_request_tool.execute(
      { tool: "tw_add_ticket", reason: "record the follow-up this phase found" },
      ctx,
    )) as ToolResult;
    expect(granted.details.granted).toBe(true);
    expect(granted.details.tool).toBe("tw_add_ticket");
    expect(active).toContain("tw_add_ticket");

    const feedback = executed.filter((call) => call.name === "submit_feedback");
    expect(feedback).toHaveLength(1);
    expect(feedback[0].args.kind).toBe("friction");
    expect(JSON.stringify(feedback[0].args.data)).toContain("granted");

    // The grant is scoped to the phase: closing it takes the tool back.
    const closed = (await tools.tw_close.execute({ skill: "wayfinder" }, ctx)) as ToolResult;
    expect(closed.details.removed).toContain("tw_add_ticket");
    expect(active).not.toContain("tw_add_ticket");
  });

  test("leaves the tool set alone when the operator denies, and records the denial", async () => {
    const tools = createTools();
    const active: string[] = [...ALWAYS_DECLARED];
    const executed: Array<{ name: string; args: Record<string, unknown> }> = [];
    const ctx = requestCtx(active, false, executed);
    await tools.tw_open.execute({ skill: "wayfinder", effort: "ready-effort" }, ctx);
    const before = [...active];

    const denied = (await tools.tw_request_tool.execute(
      { tool: "tw_add_ticket", reason: "record the follow-up this phase found" },
      ctx,
    )) as ToolResult;
    expect(denied.details.granted).toBe(false);
    expect(denied.details.reason).toBe("operator denied");
    expect(active).toEqual(before);
    const feedback = executed.filter((call) => call.name === "submit_feedback");
    expect(feedback).toHaveLength(1);
    expect(JSON.stringify(feedback[0].args.data)).toContain("denied");
  });

  test("refuses with the legal next call when there is nothing to grant to", async () => {
    const tools = createTools();
    const ctx = requestCtx([...ALWAYS_DECLARED], true, []);
    const result = (await tools.tw_request_tool.execute(
      { tool: "tw_add_ticket", reason: "no phase is open" },
      ctx,
    )) as ToolResult;
    expect(result.details.granted).toBe(false);
    expect(result.details.reason).toBe("no open skill");
    expect(result.details.legal_next).toEqual(["tw_open"]);
  });

  test("refuses an unknown tool, an always-declared tool, and one already active", async () => {
    const tools = createTools();
    const active: string[] = [...ALWAYS_DECLARED];
    const ctx = requestCtx(active, true, []);
    await tools.tw_open.execute({ skill: "wayfinder", effort: "ready-effort" }, ctx);

    const unknown = (await tools.tw_request_tool.execute(
      { tool: "bash", reason: "read a file" },
      ctx,
    )) as ToolResult;
    expect(unknown.details.reason).toBe("unknown tool");

    const declared = (await tools.tw_request_tool.execute(
      { tool: "tw_open", reason: "open another phase" },
      ctx,
    )) as ToolResult;
    expect(declared.details.reason).toBe("already declared");

    const present = (await tools.tw_request_tool.execute(
      { tool: "tw_add_task", reason: "add a planning task" },
      ctx,
    )) as ToolResult;
    expect(present.details.reason).toBe("already active");
    expect(active).not.toContain("tw_add_ticket");
  });

  test("refuses a grant that would make another skill look open", async () => {
    // setup-workflow declares tw_context plus three tools wayfinder already
    // has, so granting it would complete that toolset and derive an open skill
    // nobody opened. The open set stays exact, and the refusal names the skill.
    const tools = createTools();
    const active: string[] = [...ALWAYS_DECLARED];
    const executed: Array<{ name: string; args: Record<string, unknown> }> = [];
    const ctx = requestCtx(active, true, executed);
    await tools.tw_open.execute({ skill: "wayfinder", effort: "ready-effort" }, ctx);
    const before = [...active];

    const result = (await tools.tw_request_tool.execute(
      { tool: "tw_context", reason: "read the project profile" },
      ctx,
    )) as ToolResult;
    expect(result.details.granted).toBe(false);
    expect(result.details.reason).toBe("would open another skill");
    expect(active).toEqual(before);
    const feedback = executed.filter((call) => call.name === "submit_feedback");
    expect(JSON.stringify(feedback[0]?.args.data)).toContain("blocked");
    expect(JSON.stringify(feedback[0]?.args.data)).toContain("setup-workflow");
  });

  test("refuses without an interactive UI and records why, instead of assuming a decision", async () => {
    const tools = createTools();
    const active: string[] = [...ALWAYS_DECLARED];
    const executed: Array<{ name: string; args: Record<string, unknown> }> = [];
    const ctx = requestCtx(active, undefined, executed);
    await tools.tw_open.execute({ skill: "wayfinder", effort: "ready-effort" }, ctx);
    const before = [...active];

    const result = (await tools.tw_request_tool.execute(
      { tool: "tw_add_ticket", reason: "record the follow-up this phase found" },
      ctx,
    )) as ToolResult;
    expect(result.details.granted).toBe(false);
    expect(result.details.reason).toBe("no interactive UI");
    expect(active).toEqual(before);
    const feedback = executed.filter((call) => call.name === "submit_feedback");
    expect(feedback).toHaveLength(1);
    expect(JSON.stringify(feedback[0].args.data)).toContain("unavailable");
  });
});

// ─── The phase-to-toolset registry ─────────────────────────────────────────────

describe("the phase-to-toolset registry", () => {
  test("maps every skill to its real phase toolset", () => {
    const toolsetOf = Object.fromEntries(SKILL_REGISTRY.map((e) => [e.name, e.toolset.sort()]));
    expect(toolsetOf).toEqual({
      intake: ["tw_add_task", "tw_add_ticket", "tw_create_effort", "tw_feedback", "tw_get", "tw_list", "tw_state", "tw_state_set"],
      "setup-workflow": ["tw_context", "tw_feedback", "tw_get", "tw_list"],
      wayfinder: [
        "tw_add_task",
        "tw_dependency_levels",
        "tw_feedback",
        "tw_finalize_map",
        "tw_frontier",
        "tw_get",
        "tw_list",
        "tw_mark_blocked",
        "tw_mark_done",
        "tw_record_out_of_scope",
        "tw_show",
        "tw_state",
        "tw_state_set",
        "tw_write_section",
        "tw_write_task_note",
      ],
      "to-spec": ["tw_feedback", "tw_get", "tw_list", "tw_write_spec"],
      // The signature tool is the architecture writer: to-tickets-architecture
      // rotated it here from the interim tw_map_finalizable when the writer
      // landed. tw_map_finalizable stays disclosed as the graph-state read.
      "to-tickets": ["tw_add_ticket", "tw_dependency_levels", "tw_feedback", "tw_frontier", "tw_get", "tw_list", "tw_map_finalizable", "tw_split_ticket", "tw_write_architecture"],
      "implement-ticket": [
        "tw_add_ticket",
        "tw_dependency_levels",
        "tw_feedback",
        "tw_finalizable",
        "tw_frontier",
        "tw_get",
        "tw_list",
        "tw_mark_done",
        "tw_resolve_uncertainty",
        "tw_split_ticket",
        "tw_state",
        "tw_state_set",
        "tw_write_architecture",
        "tw_write_changelog",
        "tw_write_review",
        "tw_write_ticket_note",
      ],
      // tw_archive_effort stays the private signature tool; the review writer
      // joined the toolset when finalize-effort-skill landed, and the effort
      // creator joined it because an accepted follow-up is created inside this
      // phase (intake, the other discloser, is mutually exclusive with it).
      "finalize-effort": [
        "tw_add_ticket",
        "tw_archive_effort",
        "tw_create_effort",
        "tw_feedback",
        "tw_finalizable",
        "tw_get",
        "tw_list",
        "tw_write_architecture",
        "tw_write_review",
      ],
      "skill-creator": ["skill_discover", "skill_scaffold", "skill_validate", "tw_feedback", "tw_show"],
    });
  });

  test("discloses every tool a phase's prose instructs, so no documented step is unreachable", () => {
    // The reverse invariant of the test above: a skill's own prose must not
    // instruct a tool its toolset never declares. Without it a phase can
    // document a step the opener leaves unreachable (finalize-effort once told
    // the model to create a follow-up with tw_create_effort, which only intake
    // declares). The opener pair is exempt: it is declared in every state.
    const exempt = new Set<string>([...ALWAYS_DECLARED, CLOSER]);
    const offenders: string[] = [];
    for (const entry of SKILL_REGISTRY) {
      const dir = join(process.cwd(), "skills", "engineering", entry.name);
      if (!existsSync(dir)) continue;
      for (const file of markdownFilesUnder(dir)) {
        const prose = readFileSync(file, "utf-8");
        for (const [name] of prose.matchAll(/\btw_[a-z_]+\b/g)) {
          if (exempt.has(name) || entry.toolset.includes(name)) continue;
          offenders.push(`${entry.name}: ${name} (${file.slice(process.cwd().length + 1)})`);
        }
      }
    }
    expect(offenders).toEqual([]);
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

  test("tw_show is disclosed to the phase the overview's read-only table routes to", () => {
    // The overview cannot open (no registry entry), so a row may only name a
    // tool some phase declares. tw_show is the artifact read: wayfinder, the
    // phase the table sends a reader to, declares it; skill-creator keeps it
    // as the nested discipline's tree read.
    const wayfinder = SKILL_REGISTRY.find((e) => e.name === "wayfinder")!;
    expect(wayfinder.toolset).toContain("tw_show");
    // The bundled script tools stay the discipline's own: no other phase
    // declares them.
    const creator = SKILL_REGISTRY.find((e) => e.name === "skill-creator")!;
    expect(creator.toolset).toContain("skill_validate");
    expect(privateToolOf(creator)).toMatch(/^skill_/);
  });

  test("the archive move stays unique to finalize-effort", () => {
    // The effort close is the only phase that may archive, so its writer
    // cannot drift into another toolset unnoticed.
    const entry = SKILL_REGISTRY.find((e) => e.name === "finalize-effort")!;
    expect(entry.toolset).toContain("tw_archive_effort");
    expect(privateToolOf(entry)).toBe("tw_archive_effort");
  });

  test("a phase that sets a state pointer can read it back", () => {
    // The overview routes "where am I?" to a phase and has it call tw_state,
    // so a toolset that carries the pointer writer but not the pointer reader
    // is a phase that can move you without telling you where you are.
    for (const entry of SKILL_REGISTRY) {
      if (!entry.toolset.includes("tw_state_set")) continue;
      expect(entry.toolset, `${entry.name} writes the pointers but cannot read them`).toContain("tw_state");
    }
  });

  test("the open set derives from whole toolsets, so a shared tool opens nothing extra", () => {
    expect(() => assertDerivableOpenSets()).not.toThrow();
    for (const entry of SKILL_REGISTRY) {
      const active = [...entry.toolset, CLOSER];
      // A toolset derives as open when it is active, and a shared tool alone
      // never opens the phase that also declares it.
      expect(openSkillsIn(active).has(entry.name), `${entry.name} derives from its own toolset`).toBe(true);
    }
    expect(openSkillsIn([...ALWAYS_DECLARED]).size).toBe(0);
    // The regression: tw_add_task is intake's creator and wayfinder's charter
    // tool, so it is shared. Each derives as itself and only itself.
    for (const name of ["intake", "wayfinder"]) {
      const entry = SKILL_REGISTRY.find((e) => e.name === name)!;
      expect(entry.toolset, `${name} keeps task creation`).toContain("tw_add_task");
      expect(openSkillsIn([...entry.toolset, CLOSER])).toEqual(new Set([name]));
    }
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

/** The bullet names one `##` section of an index-style body lists. */
function sectionNames(body: string, section: string): string[] {
  const lines = readMapSection(body, section) ?? [];
  return lines
    .filter((l) => /^- /.test(l.trim()))
    .map((l) => l.trim().replace(/^- /, ""));
}

// ─── The intake creation tools (intake-skill) ────────────────────────────────
//
// Intake always creates an effort through the named transition tools: the map
// (tw_create_effort, with the two canonical sections seeded empty), the one
// non-negotiables grilling task (tw_add_task), and, for a bug report, the
// subtype: bug implementation ticket (tw_add_ticket). These are the only
// writers of the tree intake needs, so a run needs no built-in write.

describe("the intake creation tools", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => {
    tools = createTools();
  });

  test("tw_create_effort writes the map with the two canonical sections seeded empty", async () => {
    const out = (await tools.tw_create_effort.execute(
      { effort: "fresh-request", title: "Fresh request" },
      { directory: repo },
    )) as unknown as string;
    expect(out).toContain("map.md");
    const mapPath = join(repo, "docs", "tasks", "fresh-request", "map.md");
    expect(existsSync(mapPath)).toBe(true);
    const { art, doc } = parseArtifactFile(mapPath);
    expect(art.type).toBe("map");
    expect(art.title).toBe("Fresh request");
    // The sections exist as empty placeholders: a later gate refusal names
    // missing content, not a missing section.
    expect(readMapSection(doc.body, MAP_SECTION_NON_GOALS)).toEqual([]);
    expect(readMapSection(doc.body, MAP_SECTION_NON_NEGOTIABLE_FACTS)).toEqual([]);
    // The write goes through the frontmatter seam (YAML-verified shape).
    expect(existsSync(mapPath)).toBe(true);
  });

  test("tw_create_effort refuses a slug that is not safe", async () => {
    await expect(
      tools.tw_create_effort.execute({ effort: "../escape", title: "Escape" }, { directory: repo }),
    ).rejects.toThrow(/slug/);
  });

  test("tw_create_effort refuses an effort that already exists", async () => {
    await expect(
      tools.tw_create_effort.execute({ effort: "fresh-request", title: "Again" }, { directory: repo }),
    ).rejects.toThrow(/fresh-request/);
  });

  test("tw_create_effort registers the effort in the root index's Live list, sorted", async () => {
    const before = sectionNames(
      parse(readFileSync(join(repo, "docs", "tasks", "index.md"), "utf-8")).body,
      "Live",
    );
    await tools.tw_create_effort.execute({ effort: "another-request", title: "Another" }, { directory: repo });
    const after = sectionNames(
      parse(readFileSync(join(repo, "docs", "tasks", "index.md"), "utf-8")).body,
      "Live",
    );
    expect(after).toContain("fresh-request");
    expect(after).toContain("another-request");
    expect(after).toEqual([...after].sort());
    expect(before).not.toContain("another-request");
  });

  test("tw_create_effort links a follow-up by origin_effort, and omits the field by default", async () => {
    await tools.tw_create_effort.execute(
      { effort: "linked-follow-up", title: "Linked follow-up", origin_effort: "ready-effort" },
      { directory: repo },
    );
    const linked = parseArtifactFile(join(repo, "docs", "tasks", "linked-follow-up", "map.md"));
    expect(linked.art.origin_effort).toBe("ready-effort");
    expect(linked.doc.data.origin_effort).toBe("ready-effort");

    await tools.tw_create_effort.execute({ effort: "plain-request", title: "Plain request" }, { directory: repo });
    const plain = parseArtifactFile(join(repo, "docs", "tasks", "plain-request", "map.md"));
    // The field is additive: an ordinary effort's map does not carry it.
    expect(plain.art.origin_effort).toBeNull();
    expect(plain.doc.data).not.toHaveProperty("origin_effort");
  });

  test("tw_create_effort refuses an origin that is not a live effort", async () => {
    await expect(
      tools.tw_create_effort.execute(
        { effort: "floating-follow-up", title: "Floating", origin_effort: "no-such-effort" },
        { directory: repo },
      ),
    ).rejects.toThrow(/origin effort 'no-such-effort'/);
    // An archived effort is not live: a follow-up links forward, not back into
    // the archive.
    const archivedDir = join(repo, "docs", "tasks", "archive", "archived-origin");
    mkdirSync(archivedDir, { recursive: true });
    writeFileSync(
      join(archivedDir, "map.md"),
      dump({ data: { type: "map", title: "Archived origin", status: "deprecated" }, body: "\n" }),
      "utf-8",
    );
    await expect(
      tools.tw_create_effort.execute(
        { effort: "archived-follow-up", title: "Archived follow-up", origin_effort: "archived-origin" },
        { directory: repo },
      ),
    ).rejects.toThrow(/live effort/);
    expect(existsSync(join(repo, "docs", "tasks", "floating-follow-up"))).toBe(false);
    expect(existsSync(join(repo, "docs", "tasks", "archived-follow-up"))).toBe(false);
  });

  test("tw_add_task creates exactly one grilling task with the given body", async () => {
    const out = (await tools.tw_add_task.execute(
      {
        effort: "fresh-request",
        slug: "grill-non-negotiables",
        subtype: "grilling",
        title: "Grill the non-negotiables",
        content: "\n## Decision to settle\n\nThe non-goals and non-negotiable facts.\n",
      },
      { directory: repo },
    )) as unknown as string;
    expect(out).toContain("task.md");
    const taskPath = join(repo, "docs", "tasks", "fresh-request", "tasks", "grill-non-negotiables", "task.md");
    const { art } = parseArtifactFile(taskPath);
    expect(art.type).toBe("task");
    expect(art.subtype).toBe("grilling");
    expect(art.status).toBe("stable");
    expect(art.workflow_state).toBe("ready");
    expect(art.blocked_by).toEqual([]);
  });

  test("tw_add_task writes the blocked_by edges it was given", async () => {
    const out = (await tools.tw_add_task.execute(
      {
        effort: "fresh-request",
        slug: "research-the-open-question",
        subtype: "research",
        title: "Research the open question",
        blocked_by: ["grill-non-negotiables"],
      },
      { directory: repo },
    )) as unknown as string;
    expect(out).toContain("task.md");
    const taskPath = join(repo, "docs", "tasks", "fresh-request", "tasks", "research-the-open-question", "task.md");
    const { art } = parseArtifactFile(taskPath);
    expect(art.blocked_by).toEqual(["grill-non-negotiables"]);
    expect(art.workflow_state).toBe("ready");
  });

  test("tw_add_task refuses a dangling edge, a self edge, and an edge that crosses the kind", async () => {
    await expect(
      tools.tw_add_task.execute(
        { effort: "fresh-request", slug: "orphan-edge", subtype: "research", title: "Orphan edge", blocked_by: ["nope"] },
        { directory: repo },
      ),
    ).rejects.toThrow(/not an existing planning task/);
    await expect(
      tools.tw_add_task.execute(
        { effort: "fresh-request", slug: "self-edge", subtype: "research", title: "Self edge", blocked_by: ["self-edge"] },
        { directory: repo },
      ),
    ).rejects.toThrow(/cannot block on itself/);
    // 'stuck' is a ticket of gated-effort, so the edge crosses the kind.
    await expect(
      tools.tw_add_task.execute(
        { effort: "gated-effort", slug: "cross-kind-edge", subtype: "research", title: "Cross kind", blocked_by: ["stuck"] },
        { directory: repo },
      ),
    ).rejects.toThrow(/not an existing planning task/);
  });

  test("tw_add_task refuses a planning subtype outside the schema and an unsafe slug", async () => {
    await expect(
      tools.tw_add_task.execute(
        { effort: "fresh-request", slug: "not-a-task", subtype: "feature", title: "No" },
        { directory: repo },
      ),
    ).rejects.toThrow(/subtype/);
    await expect(
      tools.tw_add_task.execute(
        { effort: "fresh-request", slug: "Bad Slug", subtype: "grilling", title: "No" },
        { directory: repo },
      ),
    ).rejects.toThrow(/slug/);
  });

  test("tw_add_task refuses a task the effort already has", async () => {
    await expect(
      tools.tw_add_task.execute(
        { effort: "fresh-request", slug: "grill-non-negotiables", subtype: "grilling", title: "Again" },
        { directory: repo },
      ),
    ).rejects.toThrow(/grill-non-negotiables/);
  });

  test("tw_add_task requires an effort with a map", async () => {
    await expect(
      tools.tw_add_task.execute(
        { effort: "no-such-effort", slug: "orphan", subtype: "grilling", title: "Orphan" },
        { directory: repo },
      ),
    ).rejects.toThrow(/no live effort/);
  });

  test("tw_add_task refuses a slug that collides with an existing ticket of the effort", async () => {
    await expect(
      tools.tw_add_task.execute(
        { effort: "ready-effort", slug: "one", subtype: "grilling", title: "Clash" },
        { directory: repo },
      ),
    ).rejects.toThrow(/'one' already exists/);
  });

  test("a bug intake creates the subtype: bug implementation ticket through tw_add_ticket", async () => {
    await tools.tw_create_effort.execute({ effort: "bug-report", title: "Bug report" }, { directory: repo });
    await tools.tw_add_task.execute(
      {
        effort: "bug-report",
        slug: "grill-non-negotiables",
        subtype: "grilling",
        title: "Grill the non-negotiables",
      },
      { directory: repo },
    );
    const out = (await tools.tw_add_ticket.execute(
      {
        effort: "bug-report",
        slug: "fix-defect",
        title: "Fix the defect",
        subtype: "bug",
        content: "\n## What to build\n\nThe defect fix.\n",
      },
      { directory: repo },
    )) as unknown as string;
    expect(out).toContain("bug");
    const ticketPath = join(repo, "docs", "tasks", "bug-report", "tickets", "fix-defect", "ticket.md");
    const { art } = parseArtifactFile(ticketPath);
    expect(art.subtype).toBe("bug");
    expect(art.workflow_state).toBe("ready");
  });
});
