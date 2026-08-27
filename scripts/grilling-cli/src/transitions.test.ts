import { describe, expect, it } from "vitest";
import { canTransition, assertTransition, PAGE_STATES } from "./transitions.js";

describe("seam 2 — transitions.ts 7-state machine", () => {
  // The allowed transition table:
  // view→in-round→round-done→{in-round|final-review→{accepted→done|rejected→in-round}}
  const allowed: [string, string][] = [
    ["view", "in-round"],
    ["in-round", "round-done"],
    ["round-done", "in-round"],
    ["round-done", "final-review"],
    ["final-review", "accepted"],
    ["final-review", "rejected"],
    ["accepted", "done"],
    ["rejected", "in-round"],
  ];

  // Parameterized over the full 7×7 table.
  describe.each(PAGE_STATES)("from %s", (from) => {
    it.each(PAGE_STATES)("→ %s is correctly classified", (to) => {
      const expected = allowed.some(
        ([f, t]) => f === from && t === to,
      );
      expect(canTransition(from as never, to as never)).toBe(expected);
    });
  });

  it("assertTransition succeeds for an allowed transition", () => {
    expect(() => assertTransition("view", "in-round")).not.toThrow();
    expect(() => assertTransition("in-round", "round-done")).not.toThrow();
    expect(() => assertTransition("round-done", "final-review")).not.toThrow();
    expect(() => assertTransition("final-review", "accepted")).not.toThrow();
    expect(() => assertTransition("final-review", "rejected")).not.toThrow();
    expect(() => assertTransition("accepted", "done")).not.toThrow();
    expect(() => assertTransition("rejected", "in-round")).not.toThrow();
    expect(() => assertTransition("round-done", "in-round")).not.toThrow();
  });

  it("assertTransition throws a clear error for a disallowed transition", () => {
    expect(() => assertTransition("view", "done")).toThrow(/transition/i);
    expect(() => assertTransition("view", "final-review")).toThrow(/transition/i);
    expect(() => assertTransition("done", "view")).toThrow(/transition/i);
    expect(() => assertTransition("accepted", "in-round")).toThrow(/transition/i);
    expect(() => assertTransition("rejected", "done")).toThrow(/transition/i);
  });

  it("the error message names both states and the transition", () => {
    try {
      assertTransition("view", "done");
      expect.fail("should have thrown");
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain("view");
      expect(msg).toContain("done");
    }
  });
});
