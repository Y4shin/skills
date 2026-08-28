// Slice 5 — scenarios: 3 synthetic grilling scenarios, each trivial-to-moderate
// and ≤12 questions. Written down in the slice/task artifacts.
import { describe, expect, it } from "vitest";
import { SCENARIOS } from "./scenarios.js";
import type { Scenario } from "./harness.js";

describe("scenarios — 3 synthetic grilling scenarios", () => {
  it("defines exactly 3 scenarios", () => {
    expect(SCENARIOS).toHaveLength(3);
  });

  it("each scenario has a unique id", () => {
    const ids = SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each scenario has a name, subject, prompt, and maxQuestions", () => {
    for (const s of SCENARIOS) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.subject).toBeTruthy();
      expect(s.prompt).toBeTruthy();
      expect(s.maxQuestions).toBeGreaterThan(0);
    }
  });

  it("scenario A is trivial (≤5 questions, simple either/or with 1 dep)", () => {
    const a = SCENARIOS.find((s) => s.id === "A");
    expect(a).toBeDefined();
    expect(a!.maxQuestions).toBeLessThanOrEqual(5);
    expect(a!.subject).toMatch(/either\/or|simple/i);
    expect(a!.subject).toMatch(/depend/i);
  });

  it("scenario B is moderate (≤9 questions, 2-3 rounds, contradiction, reference edge)", () => {
    const b = SCENARIOS.find((s) => s.id === "B");
    expect(b).toBeDefined();
    expect(b!.maxQuestions).toBeLessThanOrEqual(9);
    expect(b!.subject).toMatch(/round|contradiction|reference/i);
  });

  it("scenario C is moderate (≤12 questions, multiple deps, contradiction, rejected final-review)", () => {
    const c = SCENARIOS.find((s) => s.id === "C");
    expect(c).toBeDefined();
    expect(c!.maxQuestions).toBeLessThanOrEqual(12);
    expect(c!.subject).toMatch(/depend|contradiction|reject/i);
  });

  it("each scenario maxQuestions ≤ 12 (the hard cap)", () => {
    for (const s of SCENARIOS) {
      expect(s.maxQuestions).toBeLessThanOrEqual(12);
    }
  });

  it("each scenario prompt instructs the agent to grill and report missing CLI operations", () => {
    for (const s of SCENARIOS) {
      expect(s.prompt).toMatch(/grill/i);
      expect(s.prompt).toMatch(/missing|gap|did not exist/i);
    }
  });
});
