// Slice 5 — seam 1: parseGapReport parses the agent's end-of-run gap report
// correctly. Parameterized over sample reports, including a silent one
// (= non-convergence).
import { describe, expect, it } from "vitest";
import { parseGapReport, type GapReport } from "./harness.js";

describe("seam 1 — parseGapReport parses agent gap reports", () => {
  it("parses a report listing missing operations", () => {
    const report = `
I grilled the subject. At the end, here are the CLI operations I needed but did not exist:

## Missing Operations
- update remove-question: I needed to remove a question that was no longer relevant
- update rename-question: I needed to rename a question slug that was wrong
- update set-question-round: I needed to move a question to a different round (different from promote because it also updates deps)

Everything else was available.
`;
    const result = parseGapReport(report);
    expect(result.converged).toBe(false);
    expect(result.missingCommands).toEqual([
      { name: "remove-question", reason: "I needed to remove a question that was no longer relevant" },
      { name: "rename-question", reason: "I needed to rename a question slug that was wrong" },
      { name: "set-question-round", reason: "I needed to move a question to a different round (different from promote because it also updates deps)" },
    ]);
  });

  it("parses a clean report (no missing operations) = converged", () => {
    const report = `
I grilled the subject and used the CLI throughout. At the end, I did not need any CLI operations that did not exist. All required commands were available.
`;
    const result = parseGapReport(report);
    expect(result.converged).toBe(true);
    expect(result.missingCommands).toEqual([]);
  });

  it("parses a report with explicit 'no missing operations' statement", () => {
    const report = `
Grilling complete. Missing operations: none. I had everything I needed.
`;
    const result = parseGapReport(report);
    expect(result.converged).toBe(true);
    expect(result.missingCommands).toEqual([]);
  });

  it("parses a report with missing operations in a different format", () => {
    const report = `
The grilling went well. However, I found gaps:

1. update add-note: needed to annotate a question with a note
2. update set-question-answer: needed to record an answer directly via CLI (not just browser submit)

No other gaps.
`;
    const result = parseGapReport(report);
    expect(result.converged).toBe(false);
    expect(result.missingCommands).toHaveLength(2);
    expect(result.missingCommands[0].name).toBe("add-note");
    expect(result.missingCommands[1].name).toBe("set-question-answer");
  });

  it("silent report (no mention of missing operations) = non-convergence", () => {
    const report = `
I asked the questions and recorded the answers. The subject was about choosing a framework.
`;
    const result = parseGapReport(report);
    expect(result.converged).toBe(false);
    expect(result.missingCommands).toEqual([]);
  });

  it("empty report = non-convergence (silent)", () => {
    const result = parseGapReport("");
    expect(result.converged).toBe(false);
    expect(result.missingCommands).toEqual([]);
  });

  it("parses a report that mentions missing operations but lists none = non-convergence", () => {
    const report = `
I needed some operations that did not exist but I forgot to list them.
`;
    const result = parseGapReport(report);
    expect(result.converged).toBe(false);
    expect(result.missingCommands).toEqual([]);
  });

  it("deduplicates missing operations with the same name", () => {
    const report = `
Missing operations:
- update remove-question: first reason
- update remove-question: second reason (different context)
`;
    const result = parseGapReport(report);
    expect(result.converged).toBe(false);
    expect(result.missingCommands).toHaveLength(1);
    expect(result.missingCommands[0].name).toBe("remove-question");
  });

  it("strips 'update ' prefix from command names", () => {
    const report = `
Missing operations:
- update remove-question: reason
`;
    const result = parseGapReport(report);
    expect(result.missingCommands[0].name).toBe("remove-question");
  });

  it("requires the 'update' prefix to avoid false positives (e.g. 'Round 1')", () => {
    const report = `
Missing operations:
- update remove-question: reason
`;
    const result = parseGapReport(report);
    expect(result.missingCommands[0].name).toBe("remove-question");
  });

  it("does NOT misparse prose like 'Round 1' or 'R1' as a missing command", () => {
    const report = `
Round 1: opened via set-state in-round.
- R1: user chose monorepo.
Missing operations report:
- update answer: no CLI verb to record answers.
`;
    const result = parseGapReport(report);
    expect(result.missingCommands.length).toBe(1);
    expect(result.missingCommands[0].name).toBe("answer");
  });
});
