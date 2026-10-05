/**
 * Tool-level tests for the disclosure core: tw_open, tw_close, tw_next.
 *
 * Drives createTools() directly with a fake active-tool-set context (the
 * seam the factory wires to pi.setActiveTools/getActiveTools), so the open,
 * close, and next semantics are testable without a pi runtime. The real
 * wiring (declared set, tool_search, transcript restore) is covered by the
 * integration tests in tests/integration/disclosure.test.ts.
 */

import { beforeAll, describe, expect, test } from "vitest";

import { createTools } from "../src/pi.js";

/** The idle declared set: what registration leaves active before any open. */
const IDLE = ["tw_open", "tw_next"];

/** A tool context with an in-memory active set standing in for the session. */
function disclosureCtx(active: string[]) {
  return {
    directory: "/tmp/disclosure-test",
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
    expect(active).toContain("tw_close");
    expect(active).toContain("tw_open");
    expect(active).toContain("tw_next");
    for (const tool of ["tw_frontier", "tw_list", "tw_dependency_levels"]) {
      expect(active, `${tool} must be declared once wayfinder is open`).toContain(tool);
    }
    for (const tool of ["tw_show", "tw_state", "tw_set", "tw_finalizable"]) {
      expect(active, `${tool} belongs to no open skill and stays undeclared`).not.toContain(tool);
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
});
