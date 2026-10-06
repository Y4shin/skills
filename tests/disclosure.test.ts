/**
 * Tool-level tests for the disclosure core: tw_open, tw_close, tw_next.
 *
 * Drives createTools() directly with a fake active-tool-set context (the
 * seam the factory wires to pi.setActiveTools/getActiveTools), so the open,
 * close, and next semantics are testable without a pi runtime. The real
 * wiring (declared set, tool_search, transcript restore) is covered by the
 * integration tests in tests/integration/disclosure.test.ts.
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { dump } from "../src/core/frontmatter.js";
import { createTools } from "../src/pi.js";

/** The idle declared set: what registration leaves active before any open. */
const IDLE = ["tw_open", "tw_next"];

let repo: string;

beforeAll(() => {
  // The opener reads the artifact tree (the gate lives in the same call as
  // the disclosure), so the fake session context needs a real fixture tree
  // with the efforts these tests open.
  repo = join(tmpdir(), `disclosure-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  for (const slug of ["e", "some-effort"]) {
    const map = join(repo, "docs", "tasks", slug, "map.md");
    mkdirSync(dirname(map), { recursive: true });
    writeFileSync(
      map,
      dump({ data: { type: "map", title: `Fixture ${slug}`, ready_for_spec: true }, body: "\n" }),
      "utf-8",
    );
  }
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
  details: { opened?: boolean; closed?: boolean; reason?: string; open?: string[] };
}

describe("disclosure core: tw_open", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => { tools = createTools(); });

  test("opening a skill activates its toolset and discloses tw_close", async () => {
    const active = [...IDLE];
    const result = (await tools.tw_open.execute(
      { skill: "wayfinder", effort: "some-effort" },
      disclosureCtx(active),
    )) as { text: string; details: Record<string, unknown> };
    expect(result.text).toContain("Opened wayfinder");
    expect(result.details).toMatchObject({ opened: true, skill: "wayfinder" });
    // The declared set is now the open skill's toolset plus the dispatcher
    // trio; every gated workflow tool that stayed closed is still absent.
    // (The toolsets come from the opener-gate-and-toolsets registry.)
    expect(active).toContain("tw_close");
    expect(active).toContain("tw_open");
    expect(active).toContain("tw_next");
    for (const tool of ["tw_frontier", "tw_list", "tw_write_section", "tw_finalize_map", "tw_mark_done"]) {
      expect(active, `${tool} must be declared once wayfinder is open`).toContain(tool);
    }
    for (const tool of ["tw_show", "tw_state", "tw_resolve_uncertainty", "tw_finalizable", "tw_dependency_levels"]) {
      expect(active, `${tool} belongs to no open skill and stays undeclared`).not.toContain(tool);
    }
  });

  test("opening to-spec discloses the spec writer and derives from the new signature", async () => {
    // The opener-gate-and-toolsets registry gives to-spec the spec writer and
    // moves the planning writers to wayfinder, where the write-backs live.
    const active = [...IDLE];
    const ctx = disclosureCtx(active);
    const result = (await tools.tw_open.execute(
      { skill: "to-spec", effort: "some-effort" },
      ctx,
    )) as ToolResult;
    expect(result.details.opened).toBe(true);
    for (const tool of ["tw_write_spec", "tw_get", "tw_list", "tw_close"]) {
      expect(active, `${tool} must be declared once to-spec is open`).toContain(tool);
    }
    // The open-set derivation keys on the signature tool: with to-spec's
    // writer active, the router names to-spec as the open skill.
    const next = (await tools.tw_next.execute({}, ctx)) as ToolResult;
    expect(next.text).toContain("to-spec");
    await tools.tw_close.execute({ skill: "to-spec" }, ctx);
    expect(active).toEqual(expect.arrayContaining([...IDLE]));
    for (const tool of ["tw_close", "tw_write_spec", "tw_get", "tw_list"]) {
      expect(active, `${tool} must leave the declared set when to-spec closes`).not.toContain(tool);
    }
  });

  test("refuses a duplicate open and leaves the declared set untouched", async () => {
    const active = [...IDLE];
    const ctx = disclosureCtx(active);
    await tools.tw_open.execute({ skill: "wayfinder", effort: "e" }, ctx);
    const opened = [...active];

    const result = (await tools.tw_open.execute({ skill: "wayfinder", effort: "e" }, ctx)) as ToolResult;
    expect(result.details.opened).toBe(false);
    expect(result.details.reason).toContain("already open");
    expect(active).toEqual(opened);
  });

  test("refuses a conflicting phase open in either order", async () => {
    // wayfinder open, then a different phase: refused, set untouched.
    const first = [...IDLE];
    const firstCtx = disclosureCtx(first);
    await tools.tw_open.execute({ skill: "wayfinder", effort: "e" }, firstCtx);
    const afterWayfinder = [...first];
    const refused = (await tools.tw_open.execute({ skill: "to-tickets", effort: "e" }, firstCtx)) as ToolResult;
    expect(refused.details.opened).toBe(false);
    expect(refused.details.reason).toContain("conflicts");
    expect(refused.details.reason).toContain("wayfinder");
    expect(first).toEqual(afterWayfinder);

    // The reversed order must refuse symmetrically: exclusivity is a
    // symmetric data table, so the check is order-independent.
    const second = [...IDLE];
    const secondCtx = disclosureCtx(second);
    await tools.tw_open.execute({ skill: "to-tickets", effort: "e" }, secondCtx);
    const afterToTickets = [...second];
    const refusedBack = (await tools.tw_open.execute({ skill: "wayfinder", effort: "e" }, secondCtx)) as ToolResult;
    expect(refusedBack.details.opened).toBe(false);
    expect(refusedBack.details.reason).toContain("conflicts");
    expect(second).toEqual(afterToTickets);
  });

  test("a nested open adds a second toolset without disturbing the first", async () => {
    const active = [...IDLE];
    const ctx = disclosureCtx(active);
    await tools.tw_open.execute({ skill: "wayfinder", effort: "e" }, ctx);
    const phaseSet = [...active];

    // A discipline nests inside the open phase: no conflict, no close.
    const nested = (await tools.tw_open.execute({ skill: "skill-creator", effort: "e" }, ctx)) as ToolResult;
    expect(nested.details.opened).toBe(true);
    // The phase's tools are all still declared.
    for (const tool of phaseSet) {
      expect(active, `${tool} must survive the nested open`).toContain(tool);
    }
    // The nested skill's own tools joined the declared set.
    expect(active).toContain("tw_show");
  });

  test("runtime validation backs the discriminated union up", async () => {
    const ctx = disclosureCtx([...IDLE]);
    // A ticket open carries the effort and the target: omitting the target throws.
    await expect(
      tools.tw_open.execute({ skill: "implement-ticket", effort: "e" }, ctx),
    ).rejects.toThrow(/target/);
    // An effort-only open carries no target: a provider that flattens the
    // union and always sends one is refused with the reason.
    await expect(
      tools.tw_open.execute({ skill: "wayfinder", effort: "e", target: "stray" }, ctx),
    ).rejects.toThrow(/takes no target/);
    await expect(tools.tw_open.execute({ skill: "no-such-skill", effort: "e" }, ctx)).rejects.toThrow(
      /unknown skill/,
    );
    await expect(tools.tw_open.execute({ skill: "wayfinder", effort: "  " }, ctx)).rejects.toThrow(
      /non-empty effort/,
    );
    // None of the failed validations disclosed anything.
    expect(ctx.getActiveTools()).toEqual([...IDLE]);
  });

  test("tw_close removes only the closed skill's unneeded tools", async () => {
    const active = [...IDLE];
    const ctx = disclosureCtx(active);
    await tools.tw_open.execute({ skill: "wayfinder", effort: "e" }, ctx);
    await tools.tw_open.execute({ skill: "skill-creator", effort: "e" }, ctx);

    const result = (await tools.tw_close.execute({ skill: "skill-creator" }, ctx)) as ToolResult;
    expect(result.text).toContain("Closed skill-creator");
    expect(result.details.closed).toBe(true);
    // The closed skill's own tools are gone.
    expect(active).not.toContain("tw_show");
    // The still-open phase keeps its own tools, and tw_close stays declared
    // because a skill is still open.
    for (const tool of ["tw_frontier", "tw_list", "tw_write_section", "tw_get", "tw_close", "tw_open", "tw_next"]) {
      expect(active, `${tool} must survive closing the nested skill`).toContain(tool);
    }
  });

  test("tw_close on the last open skill returns to the idle set", async () => {
    const active = [...IDLE];
    const ctx = disclosureCtx(active);
    await tools.tw_open.execute({ skill: "wayfinder", effort: "e" }, ctx);
    await tools.tw_close.execute({ skill: "wayfinder" }, ctx);

    // The workflow part of the declared set is idle again: no toolset, no
    // closer, exactly the dispatcher pair.
    expect(active).toEqual(expect.arrayContaining(["tw_open", "tw_next"]));
    for (const tool of ["tw_close", "tw_frontier", "tw_list", "tw_write_section", "tw_get"]) {
      expect(active).not.toContain(tool);
    }
  });

  test("tw_close refuses a skill that is not open", async () => {
    const active = [...IDLE];
    const ctx = disclosureCtx(active);
    await tools.tw_open.execute({ skill: "wayfinder", effort: "e" }, ctx);
    const before = [...active];

    const result = (await tools.tw_close.execute({ skill: "skill-creator" }, ctx)) as ToolResult;
    expect(result.details.closed).toBe(false);
    expect(result.details.reason).toContain("not open");
    expect(active).toEqual(before);
  });
});

describe("disclosure core: tw_next", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => { tools = createTools(); });

  test("outside a skill it answers in short prose and points at the opener", async () => {
    const ctx = disclosureCtx([...IDLE]);
    const result = (await tools.tw_next.execute({}, ctx)) as ToolResult;
    expect(typeof result.text).toBe("string");
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.text).toContain("tw_open");
    // It never returns a structured frontier.
    expect(() => JSON.parse(result.text)).toThrow();
  });

  test("inside a skill it says to finish the current work first and never suggests closing", async () => {
    const active = [...IDLE];
    const ctx = disclosureCtx(active);
    await tools.tw_open.execute({ skill: "wayfinder", effort: "e" }, ctx);

    const result = (await tools.tw_next.execute({}, ctx)) as ToolResult;
    expect(result.text).toContain("wayfinder");
    expect(result.text).toMatch(/finish/i);
    // The in-skill prose must not suggest abandoning the skill.
    expect(result.text).not.toMatch(/close/i);
  });

  test("it never errors, whatever the arguments", async () => {
    const idleCtx = disclosureCtx([...IDLE]);
    await expect(tools.tw_next.execute({}, idleCtx)).resolves.toBeTruthy();
    await expect(tools.tw_next.execute({ stray: "junk" }, idleCtx)).resolves.toBeTruthy();

    const active = [...IDLE];
    const workingCtx = disclosureCtx(active);
    await tools.tw_open.execute({ skill: "to-spec", effort: "e" }, workingCtx);
    await expect(tools.tw_next.execute({}, workingCtx)).resolves.toBeTruthy();
  });
});
