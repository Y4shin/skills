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

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
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
      "to-tickets": ["tw_add_ticket", "tw_dependency_levels", "tw_get", "tw_list", "tw_map_finalizable", "tw_split_ticket"],
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
