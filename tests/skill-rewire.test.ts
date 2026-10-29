/**
 * Structural & grep tests for the text-based grilling skill and the
 * Wayfinder grilling resource. (The browser-visualized grilling-with-ui variant
 * and its CLI were dropped in the adopt-mp-skills-way map, grilling #1 Q15;
 * the seams that asserted them are removed.)
 *
 *  - skills/engineering/grilling/SKILL.md is the text-based skill (plain-text
 *    rounds, not ask_user_question), and skills/engineering/wayfinder/
 *    resources/grilling.md creates the task document and delegates every
 *    session to that skill (wayfinder-reconcile-and-passes; the interview
 *    method has one home).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const PROJECT = process.cwd();

function readFile(relativePath: string): string {
  return readFileSync(join(PROJECT, relativePath), "utf-8");
}

// ─── Seam 2e: improve-codebase-architecture delegates, does not restate ──

describe("seam 2e - improve-codebase-architecture delegates grilling to the skill", () => {
  const content = readFile("skills/engineering/improve-codebase-architecture/SKILL.md");

  test("delegates the session to the grilling skill by name", () => {
    expect(content).toMatch(/`grilling` skill/);
  });

  test("does not restate the one-question-at-a-time method", () => {
    expect(content).not.toMatch(/one question at a time/i);
  });

  test("does not invent a new grilling variant", () => {
    expect(content).toMatch(/not.*invent a new grilling variant/i);
  });

  test("still routes the picked candidate to wayfinder", () => {
    expect(content).toMatch(/wayfinder/i);
  });
});

// ─── Seam 2f: no router denies the standalone grilling skill ────────

describe("seam 2f - no router denies the standalone grilling skill", () => {
  test("implement-task does not claim grilling lacks a standalone skill", () => {
    const router = readFile("skills/engineering/implement-task/SKILL.md");
    expect(router).toMatch(/delegate to the `grilling` skill/);
    expect(router).not.toMatch(/grilling[^\n]*no standalone skill/i);
  });
});

// ─── Seam 2c: text-based grilling skill uses plain-text rounds ────────

describe("seam 2c - text-based grilling skill uses plain-text rounds, not the CLI", () => {
  const content = readFile("skills/engineering/grilling/SKILL.md");

  test("drives rounds through plain text (Q1/Q2 format)", () => {
    expect(content).toMatch(/Q1|round/i);
  });

  test("does not reference ask_user_question", () => {
    expect(content).not.toMatch(/ask_user_question/);
  });

  test("does not reference the grilling CLI / visualizer", () => {
    expect(content).not.toMatch(/grilling-cli\.mjs/);
    expect(content).not.toMatch(/--state/);
    expect(content).not.toMatch(/visualizer/i);
  });
});

// ─── Seam 2d: wayfinder grilling.md drives the text path ─────────

describe("seam 2d - wayfinder grilling.md delegates the method to the grilling skill", () => {
  const content = readFile("skills/engineering/wayfinder/resources/grilling.md");

  test("delegates every session to the grilling skill", () => {
    expect(content).toMatch(/`grilling` skill/);
  });

  test("does not restate how questions are asked", () => {
    expect(content).not.toMatch(/one question at a time/i);
    expect(content).not.toMatch(/answer on[\s\S]*behalf/i);
    expect(content).not.toMatch(/\bQ1\b/);
  });

  test("does not mention the CLI / visualizer", () => {
    expect(content).not.toMatch(/CLI|visualizer|grilling-cli/i);
  });

  test("still requires the task body to state the decision", () => {
    expect(content).toMatch(/decision/i);
  });

  test("still references parent decisions", () => {
    expect(content).toMatch(/parent decision/i);
  });

  test("still references known choices", () => {
    expect(content).toMatch(/choices|known choice/i);
  });

  test("still references recommended starting answer", () => {
    expect(content).toMatch(/recommended.*answer|starting answer/i);
  });

  test("still references downstream work", () => {
    expect(content).toMatch(/downstream work/i);
  });
});

// ─── Seam 4: per-skill completion reports (skill-report-resources) ────

// The workflow skills: the skills that end a run with the human waiting
// (the phase skills and the workflow routers). The discipline and
// vocabulary skills are not run-ending workflow skills. The list is the
// test seam's coverage set; a skill added to (or retired from) the package
// joins (or leaves) this contract by editing the list.
const WORKFLOW_SKILLS = [
  "wayfinder",
  "to-spec",
  "to-tickets",
  "implement-task",
  "finalize-task",
  "triage",
  "setup-workflow",
  "task-workflow-overview",
  "task-workflow-doctor",
];

// The fixed, ordered report shape from the effort's report contract:
// (1) what is now true, (2) what needs the human, (3) what to run next,
// (4) what is broken or blocked, (5) one pointer to the detail.
const REPORT_PARTS = [
  "1. What is now true",
  "2. What needs the human",
  "3. What to run next",
  "4. What is broken or blocked",
  "5. One pointer to the detail",
];

// The part names in plain form: a skill points at its report resource but
// never restates the shape inline, so these phrases must not appear in a
// SKILL.md.
const ReportShapePhrases = [
  "what is now true",
  "what needs the human",
  "what to run next",
  "what is broken or blocked",
];

function reportPath(skill: string): string {
  return `skills/engineering/${skill}/resources/report.md`;
}

describe("seam 4 - each workflow skill ships its report resource", () => {
  test.each(WORKFLOW_SKILLS)("%s has a report resource with the fixed five-part order", (skill) => {
    const report = readFile(reportPath(skill));
    // The five parts carry the exact names, in the fixed order, and they
    // are the only sections: no reordering, no added sections.
    const positions = REPORT_PARTS.map((part) => report.indexOf(`## ${part}`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    const sections = [...report.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    expect(sections).toEqual(REPORT_PARTS);
  });

  test.each(WORKFLOW_SKILLS)("%s points at its report resource instead of restating the shape", (skill) => {
    const skillDoc = readFile(`skills/engineering/${skill}/SKILL.md`);
    // The skill carries a pointer to its own report resource, not a copy
    // of the shape: the part names live only in the resource.
    expect(skillDoc).toMatch(/resources\/report\.md/);
    const lowered = skillDoc.toLowerCase();
    for (const phrase of [...ReportShapePhrases, "one pointer to the detail"]) {
      expect(lowered).not.toContain(phrase);
    }
  });

  test.each(WORKFLOW_SKILLS)("%s report resource keeps failure, refusal, and escalation in the same shape", (skill) => {
    const report = readFile(reportPath(skill)).replace(/\s+/g, " ");
    const intro = report.slice(0, report.indexOf("1. What is now true"));
    // The shape applies to completion, refusal, failure, and escalation alike.
    for (const word of [/completion/i, /refusal/i, /failure/i, /escalation/i]) {
      expect(intro).toMatch(word);
    }
    // In a failure, part 1 becomes the not-done line and part 2 carries the
    // escalation question: same five parts, no variant sections.
    expect(intro).toMatch(/part 1/i);
    expect(intro).toMatch(/part 2/i);
    expect(intro).toMatch(/escalation question/i);
  });

  test.each(WORKFLOW_SKILLS)("%s report resource names the never-inline categories and carries no machine receipt", (skill) => {
    // Prose wraps; squeeze whitespace before matching.
    const report = readFile(reportPath(skill)).replace(/\s+/g, " ");
    // The template names every category of run noise that must never be
    // inlined (the shared rules, duplicated per skill by design).
    for (const category of [
      /run ids?/i,
      /receipts?/i,
      /output references?/i,
      /harness counts?/i,
      /tool-call detail/i,
      /chain JSON/i,
      /workflow-internal terms/i,
    ]) {
      expect(report).toMatch(category);
    }
    // And the template itself must not embed a machine receipt, a sample
    // report, or any chain machine shape.
    for (const shape of [
      /outputReference/,
      /\brefs\s*:/,
      /\bstep\s*:\s*\{/,
      /\brunId\s*[:=]/,
      /\.chain\.json/,
      /runs\.run\(/,
    ]) {
      expect(report).not.toMatch(shape);
    }
  });
});

