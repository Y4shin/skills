// Slice 5 — seam 2: the harness iterates and converges.
// Given a mock that reports gaps then clean-then-clean, it stops at
// 2-clean-in-a-row. Given perpetual gaps, it caps at 5 and escalates.
import { describe, expect, it } from "vitest";
import { runScenario, type Scenario, type RunResult, type GapReportFn } from "./harness.js";

// A minimal scenario for testing the iteration logic.
const testScenario: Scenario = {
  id: "test",
  name: "Test scenario",
  subject: "A simple either/or decision with one dependency",
  maxQuestions: 12,
  prompt: "Grill this subject and report missing CLI operations.",
};

describe("seam 2 — runScenario iterates and converges", () => {
  it("stops at 2-clean-in-a-row after initial gaps", async () => {
    const reports = [
      { converged: false, missingCommands: [{ name: "remove-question", reason: "need it" }] },
      { converged: true, missingCommands: [] },
      { converged: true, missingCommands: [] },
    ];
    let callIdx = 0;
    const mockGapFn: GapReportFn = () => {
      return Promise.resolve(reports[callIdx++]);
    };

    const result = await runScenario(testScenario, mockGapFn);

    expect(result.converged).toBe(true);
    expect(result.iterations).toBe(3); // gap, clean, clean = 3 runs
    expect(result.allGaps).toHaveLength(1); // only the first run had gaps
    expect(result.allGaps[0].missingCommands[0].name).toBe("remove-question");
  });

  it("converges immediately (0 gaps on first run) needs 2 clean runs", async () => {
    const reports = [
      { converged: true, missingCommands: [] },
      { converged: true, missingCommands: [] },
    ];
    let callIdx = 0;
    const mockGapFn: GapReportFn = () => {
      return Promise.resolve(reports[callIdx++]);
    };

    const result = await runScenario(testScenario, mockGapFn);

    expect(result.converged).toBe(true);
    expect(result.iterations).toBe(2); // clean, clean = 2 runs
  });

  it("oscillating gaps count as non-convergence (do not count toward 2-clean)", async () => {
    const reports = [
      { converged: false, missingCommands: [{ name: "gap-a", reason: "a" }] },
      { converged: true, missingCommands: [] },
      { converged: false, missingCommands: [{ name: "gap-b", reason: "b" }] },
      { converged: true, missingCommands: [] },
      { converged: true, missingCommands: [] },
    ];
    let callIdx = 0;
    const mockGapFn: GapReportFn = () => {
      return Promise.resolve(reports[callIdx++]);
    };

    const result = await runScenario(testScenario, mockGapFn);

    expect(result.converged).toBe(true);
    expect(result.iterations).toBe(5);
    // The last two runs were clean (runs 4 and 5).
  });

  it("caps at 5 iterations with perpetual gaps and escalates", async () => {
    const reports = Array(5).fill({ converged: false, missingCommands: [{ name: "perpetual-gap", reason: "never resolves" }] });
    let callIdx = 0;
    const mockGapFn: GapReportFn = () => {
      return Promise.resolve(reports[callIdx++]);
    };

    const result = await runScenario(testScenario, mockGapFn);

    expect(result.converged).toBe(false);
    expect(result.iterations).toBe(5);
    expect(result.escalated).toBe(true);
    expect(result.allGaps).toHaveLength(5);
    expect(result.lastGaps?.missingCommands[0].name).toBe("perpetual-gap");
  });

  it("escalation message includes the scenario id and last gaps", async () => {
    const reports = Array(5).fill({ converged: false, missingCommands: [{ name: "gap-x", reason: "test" }] });
    let callIdx = 0;
    const mockGapFn: GapReportFn = () => {
      return Promise.resolve(reports[callIdx++]);
    };

    const result = await runScenario(testScenario, mockGapFn);

    expect(result.escalationMessage).toContain("test");
    expect(result.escalationMessage).toContain("gap-x");
  });

  it("stops at 2-clean-in-a-row even if earlier runs had gaps (mixed pattern)", async () => {
    const reports = [
      { converged: false, missingCommands: [{ name: "gap-1", reason: "a" }] },
      { converged: false, missingCommands: [{ name: "gap-2", reason: "b" }] },
      { converged: true, missingCommands: [] },
      { converged: true, missingCommands: [] },
    ];
    let callIdx = 0;
    const mockGapFn: GapReportFn = () => {
      return Promise.resolve(reports[callIdx++]);
    };

    const result = await runScenario(testScenario, mockGapFn);

    expect(result.converged).toBe(true);
    expect(result.iterations).toBe(4);
  });

  it("does not count a single clean run as convergence (needs 2)", async () => {
    // 4 runs: gap, gap, clean, then would need a 5th clean — but cap is 5.
    // Actually: gap, gap, clean, gap → 4 runs, not converged. Then 5th = gap → cap.
    const reports = [
      { converged: false, missingCommands: [{ name: "g1", reason: "a" }] },
      { converged: false, missingCommands: [{ name: "g2", reason: "b" }] },
      { converged: true, missingCommands: [] },
      { converged: false, missingCommands: [{ name: "g3", reason: "c" }] },
      { converged: false, missingCommands: [{ name: "g4", reason: "d" }] },
    ];
    let callIdx = 0;
    const mockGapFn: GapReportFn = () => {
      return Promise.resolve(reports[callIdx++]);
    };

    const result = await runScenario(testScenario, mockGapFn);

    expect(result.converged).toBe(false);
    expect(result.iterations).toBe(5);
    expect(result.escalated).toBe(true);
  });
});
