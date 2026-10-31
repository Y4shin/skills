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

import { existsSync, readdirSync, readFileSync } from "node:fs";
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
  test("implement-ticket does not claim grilling lacks a standalone skill and routes planning to wayfinder", () => {
    const phase = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(phase).not.toMatch(/grilling[^\n]*no standalone skill/i);
    // Planning work is Wayfinder's frontier: the implementation phase never
    // restates the grilling method, it hands the work back.
    expect(phase).toMatch(/Wayfinder's frontier/);
    expect(phase).toMatch(/\/skill:wayfinder/);
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
  "intake",
  "wayfinder",
  "to-spec",
  "to-tickets",
  "implement-ticket",
  "finalize-effort",
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

// ─── Seam 5: the machine contracts are untouched (skill-report-resources) ──

// The report contract lives in prose only. The shipped chain scripts keep
// their return shapes (ok, failed, error, step, refs), because the failure
// toolbelt needs step and refs for diagnosis and the retry pointer; the
// report resource is what keeps them out of the human-facing message.
describe("seam 5 - chain and end-of-effort return shapes unchanged", () => {
  test("the shipped chain scripts still return the settled machine shape", () => {
    const chain = readFile("skills/engineering/implement-ticket/scripts/ticket-chain.js");
    expect(chain).toMatch(/ok: false/);
    expect(chain).toMatch(/failed: "args"/);
    expect(chain).toMatch(/error: "ticket-chain\.js missing required args/);
    // Schema 5 bug tickets carry the defect record in the ticket body, so a
    // separate bug doc and reproduction are optional pointers, never
    // required args: requiring them refused every bug ticket at the gate.
    expect(chain).not.toMatch(/missing\.push\("bugPath"\)/);
    expect(chain).not.toMatch(/missing\.push\("reproPath"\)/);
    expect(chain).toMatch(/step: gate/);
    expect(chain).toMatch(/refs/);

    const end = readFile("skills/engineering/implement-ticket/scripts/end-of-effort.js");
    expect(end).toMatch(/ok: false/);
    expect(end).toMatch(/failed: "args"/);
    expect(end).toMatch(/step: spec/);
    expect(end).toMatch(/reviewOk/);
    expect(end).toMatch(/refs/);
  });

  test("the reporting prose names the machine result but never mirrors it", () => {
    // The implement-ticket report resource is the one tuned to the chain: it
    // tells the model where the machine receipt belongs and where it does
    // not.
    const report = readFile(reportPath("implement-ticket")).replace(/\s+/g, " ");
    expect(report).toMatch(/machine result/);
    expect(report).toMatch(/failure toolbelt/);
    expect(report).not.toMatch(/refs\s*:|step\s*:\s*\{/);
  });
});

// ─── Seam 7: skill-creator calls its bundled scripts as tools, not through the shell ────

// skill-creator-nested-toolset: the discipline's bundled scripts are wrapped
// in registered tools (skill_validate, skill_scaffold, skill_discover),
// disclosed when the skill opens nested inside a phase. The prose teaches the
// tools, never a shell command for the scripts, and keeps the by-hand
// fallbacks that the minimal capability ceiling needs.
describe("seam 7 - skill-creator invokes its bundled scripts through the registered tools", () => {
  const SKILL_PROSE = "skills/engineering/skill-creator/SKILL.md";
  const doc = readFile(SKILL_PROSE);

  test("the skill names its three registered script tools", () => {
    for (const tool of ["skill_validate", "skill_scaffold", "skill_discover"]) {
      expect(doc, SKILL_PROSE).toContain(tool);
    }
  });

  test("no shell invocation of the bundled scripts remains in the prose", () => {
    // The retired shape: a runnable `node .../scripts/<name>.mjs` command.
    expect(doc).not.toMatch(/node\s+[^\n]*scripts\/\w+\.mjs/);
  });

  test("the tool disclosure is tied to the nested open", () => {
    expect(doc).toMatch(/tw_open\b/);
  });

  test("the by-hand fallbacks survive for the minimal capability ceiling", () => {
    expect(doc.match(/By-hand fallback/gi)?.length).toBeGreaterThanOrEqual(3);
  });

  test("the docs page matches the rewired prose", () => {
    const page = readFile("docs/engineering/skill-creator.md");
    expect(page).toContain("skill_validate");
    expect(page).not.toMatch(/node\s+[^\n]*scripts\/\w+\.mjs/);
  });
});

// ─── Seam 6: no shared report skill or file (skill-report-resources) ──

// All files under a directory, depth-first (a tiny local walker keeps this
// seam independent of skills.test.ts's helpers).
function filesUnder(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) filesUnder(path, out);
    else if (entry.isFile()) out.push(path);
  }
  return out;
}

describe("seam 6 - no shared report skill, file, or gate", () => {
  test("no reporting skill is registered or shipped", () => {
    const pkg = JSON.parse(readFile("package.json"));
    expect(pkg.pi.skills.filter((s: string) => /report/.test(s))).toEqual([]);
    expect(existsSync(join(PROJECT, "skills/engineering/reporting"))).toBe(false);
    // The registry has no report entry: opening one is not a phase.
    expect(readFile("src/disclosure.ts")).not.toMatch(/name: "report/);
  });

  test("no shared report file exists; every report.md is per-skill", () => {
    // Every report.md under skills/ sits at <skill>/resources/report.md:
    // a shared contract file would live anywhere else.
    const offenders: string[] = [];
    for (const bucket of ["engineering", "productivity", "misc", "in-progress", "deprecated"]) {
      for (const file of filesUnder(join(PROJECT, "skills", bucket))) {
        if (file.endsWith("report.md") && !/skills\/[^/]+\/[\w-]+\/resources\/report\.md$/.test(file)) {
          offenders.push(file);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  test("no skill points at another skill's report resource", () => {
    for (const skill of WORKFLOW_SKILLS) {
      const skillDoc = readFile(`skills/engineering/${skill}/SKILL.md`);
      const pointers = [...skillDoc.matchAll(/\]\(([^)]*report\.md)\)/g)].map((m) => m[1]);
      for (const pointer of pointers) {
        expect(pointer).toBe("resources/report.md");
      }
    }
  });
});

