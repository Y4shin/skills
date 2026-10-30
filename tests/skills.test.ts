/**
 * Structure tests for SKILL.md files, agent frontmatter, and package manifest.
 * Verifies that all files have the expected structure and references.
 */

import { readFileSync, existsSync, readdirSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import { parse } from "../src/core/frontmatter.js";
import { findAnomalies, fromFrontmatter, validateArtifact, type Artifact } from "../src/core/art.js";
import { createTools } from "../src/pi.js";

const PROJECT = process.cwd();

function readFile(relativePath: string): string {
  const p = join(PROJECT, relativePath);
  if (!existsSync(p)) throw new Error(`File not found: ${relativePath}`);
  return readFileSync(p, "utf-8");
}

function parseFrontmatter(content: string): Record<string, any> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm: Record<string, any> = {};
  for (const line of match[1].split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();
    fm[key] = value;
  }
  return fm;
}

// ─── Agent frontmatter tests ─────────────────────────────────────────

const AGENT_FILES = [
  "agents/tdd-worker.md",
  "agents/slice-verifier.md",
  "agents/land-worker.md",
  "agents/deviation-reporter.md",
  "agents/code-reviewer.md",
  "agents/architecture-scout.md",
  "agents/skill-reviewer.md",
  "agents/implement-preconditions.md",
  "agents/coherence-refactorer.md",
  "agents/test-runner.md",
  "agents/spec-reconciler.md",
];

describe("agent frontmatter", () => {
  for (const file of AGENT_FILES) {
    const agentName = file.replace("agents/", "").replace(".md", "");
    describe(agentName, () => {
      const content = readFile(file);
      const fm = parseFrontmatter(content);

      test("has frontmatter", () => {
        expect(fm["name"]).toBe(agentName);
      });

      test("has inheritProjectContext: true", () => {
        expect(fm["inheritProjectContext"]).toBe("true");
      });

      test("has defaultContext", () => {
        expect(fm["defaultContext"]).toBeDefined();
      });

      test("has tools defined", () => {
        expect(fm["tools"]).toBeDefined();
      });

      test("has description", () => {
        expect(fm["description"]).toBeDefined();
        expect(fm["description"].length).toBeGreaterThan(10);
      });
    });
  }
});

// ─── Skill SKILL.md structure tests ──────────────────────────────────

const SKILL_FILES = [
  "skills/engineering/task-workflow-overview/SKILL.md",
  "skills/engineering/setup-workflow/SKILL.md",
  "skills/engineering/wayfinder/SKILL.md",
  "skills/engineering/implement-ticket/SKILL.md",
  "skills/engineering/tdd/SKILL.md",
  "skills/engineering/code-review/SKILL.md",
  "skills/engineering/task-workflow-doctor/SKILL.md",
  "skills/engineering/diagnosing-bugs/SKILL.md",
  "skills/engineering/codebase-design/SKILL.md",
  "skills/engineering/grilling/SKILL.md",
  "skills/engineering/domain-modeling/SKILL.md",
  "skills/engineering/improve-codebase-architecture/SKILL.md",
  "skills/productivity/wait-what/SKILL.md",
  "skills/engineering/skill-creator/SKILL.md",
  "skills/engineering/prototype/SKILL.md",
  "skills/engineering/research/SKILL.md",
  "skills/engineering/resolving-merge-conflicts/SKILL.md",
  "skills/engineering/wizard/SKILL.md",
  "skills/engineering/intake/SKILL.md",
  "skills/productivity/handoff/SKILL.md",
  "skills/productivity/to-questionnaire/SKILL.md",
  "skills/productivity/teach/SKILL.md",
  "skills/productivity/writing-for-agents/SKILL.md",
  "skills/productivity/grill-me/SKILL.md",
  "skills/engineering/to-spec/SKILL.md",
  "skills/engineering/to-tickets/SKILL.md",
  "skills/engineering/skill-review/SKILL.md",
  "skills/engineering/eval-review/SKILL.md",
];

describe("skill files", () => {
  for (const file of SKILL_FILES) {
    const skillName = file.split("/")[1];
    describe(skillName, () => {
      const content = readFile(file);
      const fm = parseFrontmatter(content);

      test("has name in frontmatter", () => {
        expect(fm["name"]).toBeDefined();
      });

      test("has description", () => {
        expect(fm["description"]).toBeDefined();
        expect(fm["description"].length).toBeGreaterThan(5);
      });

      test("no chain JSON references", () => {
        expect(content).not.toMatch(/\.chain\.json/);
      });

      test("no supervisor/intercom patterns", () => {
        expect(content).not.toContain("subagent_supervisor");
        expect(content).not.toContain("contact_supervisor");
      });
    });
  }
});

// ─── Package manifest tests ──────────────────────────────────────────

describe("package.json", () => {
  const pkg = JSON.parse(readFile("package.json"));

  test("has pi block with extensions", () => {
    expect(pkg.pi).toBeDefined();
    expect(pkg.pi.extensions).toBeDefined();
    expect(pkg.pi.extensions).toContain("./src/pi.ts");
  });

  test("has skills list", () => {
    expect(Array.isArray(pkg.pi.skills)).toBe(true);
    expect(pkg.pi.skills.length).toBe(28);
    expect(pkg.pi.skills).toContain("./skills/engineering/codebase-design");
    expect(pkg.pi.skills).toContain("./skills/engineering/domain-modeling");
    expect(pkg.pi.skills).toContain("./skills/engineering/improve-codebase-architecture");
    expect(pkg.pi.skills).toContain("./skills/engineering/grilling");
    expect(pkg.pi.skills).toContain("./skills/productivity/wait-what");
    expect(pkg.pi.skills).toContain("./skills/engineering/skill-creator");
    expect(pkg.pi.skills).toContain("./skills/engineering/skill-review");
  });

  test("has subagents config", () => {
    expect(pkg.pi.subagents).toBeDefined();
    expect(pkg.pi.subagents.agents).toContain("./agents");
  });

  test("no chain files directory", () => {
    expect(existsSync(join(PROJECT, "chains"))).toBe(false);
  });

  test("no skills/archive", () => {
    expect(existsSync(join(PROJECT, "skills", "archive"))).toBe(false);
  });

  test("skills are organized into promoted buckets", () => {
    // Bucket layout (adopt-mp-skills-way, grilling #1 Q3):
    // engineering/ + productivity/ are promoted; misc/in-progress/deprecated are not.
    for (const bucket of ["engineering", "productivity", "misc", "in-progress", "deprecated"]) {
      expect(existsSync(join(PROJECT, "skills", bucket))).toBe(true);
    }
    // No skill dirs left at the top level except the buckets.
    const top = readdirSync(join(PROJECT, "skills"));
    for (const entry of top) {
      expect(["engineering", "productivity", "misc", "in-progress", "deprecated"]).toContain(entry);
    }
  });
});

describe("grilling skill references", () => {
  const content = readFile("skills/engineering/grilling/SKILL.md");

  test("is registered as the reusable Pi grilling skill", () => {
    const pkg = JSON.parse(readFile("package.json"));
    expect(pkg.pi.skills).toContain("./skills/engineering/grilling");
    expect(content).toMatch(/^name: grilling/m);
    expect(content).toMatch(/model-invoked|Pi-native/i);
  });

  test("preserves canonical design-tree and round frontier protocol", () => {
    expect(content).toMatch(/design tree/i);
    expect(content).toMatch(/round/i);
    expect(content).toMatch(/frontier/i);
    expect(content).toMatch(/whole frontier|every decision.*prerequisites/i);
    expect(content).toMatch(/prerequisite|depends on/i);
    expect(content).toMatch(/recommended answer/i);
    expect(content).toMatch(/fact(s| finding).*job|finding facts/i);
  });

  test("records decisions and requires shared-understanding completion", () => {
    expect(content).toMatch(/settled decision|settled decisions/i);
    expect(content).toMatch(/downstream consequences|consequences/i);
    expect(content).toMatch(/shared understanding/i);
    expect(content).toMatch(/frontier is empty|nothing left silently assumed/i);
  });

  test("uses plain-text rounds, not the CLI/visualizer", () => {
    // The text-based grilling skill drives rounds through plain text, not
    // Pi's ask_user_question structured interaction. It must NOT reference
    // the grilling CLI/visualizer.
    expect(content).toMatch(/round/i);
    expect(content).not.toMatch(/ask_user_question/);
    expect(content).not.toMatch(/grilling-cli\.mjs/);
    expect(content).not.toMatch(/--state/);
  });
});


describe("domain-modeling skill references", () => {
  const content = readFile("skills/engineering/domain-modeling/SKILL.md");

  test("is registered as a model-invoked Pi skill", () => {
    const pkg = JSON.parse(readFile("package.json"));
    expect(pkg.pi.skills).toContain("./skills/engineering/domain-modeling");
    expect(content).toMatch(/^name: domain-modeling/m);
    expect(content).toMatch(/model-invoked|Pi-native/i);
  });

  test("covers the portable domain modeling vocabulary and output", () => {
    expect(content).toMatch(/concepts?/i);
    expect(content).toMatch(/relationships?/i);
    expect(content).toMatch(/invariants?/i);
    expect(content).toMatch(/ownership/i);
    expect(content).toMatch(/terminology/i);
    expect(content).toMatch(/lifecycle|state transitions?/i);
    expect(content).toMatch(/uncertaint(y|ies)|open questions?/i);
    expect(content).toMatch(/output|deliverable/i);
  });
});

describe("improve-codebase-architecture skill references", () => {
  const content = readFile("skills/engineering/improve-codebase-architecture/SKILL.md");

  test("routes the survey through the scout and wayfinder", () => {
    expect(content).toContain("architecture-scout");
    expect(content).toContain("wayfinder");
    expect(content).toContain("codebase-design");
  });

  test("documents the no-grill mode", () => {
    expect(content).toMatch(/no-grill|don't grill me/i);
  });

  test("has a wayfinder handoff", () => {
    expect(content).toMatch(/hand.*wayfinder|wayfinder.*hand/i);
  });

  test("documents repository context and ADR references", () => {
    expect(content).toContain("CONTEXT.md");
    expect(content).toContain("docs/adr");
  });

  test("documents the complete report and candidate decision flow", () => {
    expect(content).toMatch(/architecture-review-<timestamp>\.html/);
    expect(content).toMatch(/xdg-open|open|start/);
    expect(content).toMatch(/absolute path/i);
    expect(content).toMatch(/Which of these would you like to explore\?/);
    expect(content).toMatch(/candidate.*pick|pick.*candidate/i);
    expect(content).toMatch(/`grilling` skill/);
    expect(content).not.toMatch(/one question at a time/i);
    expect(content).toMatch(/frontier/i);
    expect(content).toMatch(/ADR|docs\/adr/i);
    expect(content).toMatch(/decision.*wayfinder|wayfinder.*decision/i);
  });

  test("is explicitly user-invoked and has an offline report scaffold", () => {
    const fm = parseFrontmatter(content);
    expect(fm["disable-model-invocation"]).toBe("true");
    const report = readFile("skills/engineering/improve-codebase-architecture/HTML-REPORT.md");
    expect(report.trim().length).toBeGreaterThan(0);
    expect(report).toContain("vendor/tailwind.min.js");
    expect(report).toContain("vendor/mermaid.min.js");
    expect(report).not.toMatch(/https?:\/\/cdn\./i);
  });

  test("vendors both report dependencies", () => {
    expect(readFile("skills/engineering/improve-codebase-architecture/vendor/tailwind.min.js").length).toBeGreaterThan(100_000);
    expect(readFile("skills/engineering/improve-codebase-architecture/vendor/mermaid.min.js").length).toBeGreaterThan(1_000_000);
  });
});

describe("codebase-design skill references", () => {
  const content = readFile("skills/engineering/codebase-design/SKILL.md");

  test("documents Pi-native architecture exploration vocabulary", () => {
    expect(content).toMatch(/CodeGraph/i);
    expect(content).toMatch(/boundar(y|ies)/i);
    expect(content).toMatch(/dependenc(y|ies)/i);
    expect(content).toMatch(/reuse/i);
    expect(content).toMatch(/deletion[- ]test/i);
    expect(content).toMatch(/safe extension point/i);
  });

  test("defines expected architecture output", () => {
    expect(content).toMatch(/output|report|deliverable/i);
    expect(content).toMatch(/architecture[- ]scout/i);
    expect(content).toMatch(/architecture survey/i);
  });
});

// ─── Agent file existence tests ──────────────────────────────────────

describe("architecture scout structure", () => {
  test("uses the read-only tool allowlist and fresh context", () => {
    const fm = parseFrontmatter(readFile("agents/architecture-scout.md"));
    // The guidelines tool is gone; the scout reads CONTEXT.md and docs/adr/
    // directly.
    expect(fm.tools).toBe("read, bash");
    expect(fm.defaultContext).toBe("fresh");
    expect(fm.inheritProjectContext).toBe("true");
  });

  test("documents deletion test and architecture heuristics", () => {
    const content = readFile("agents/architecture-scout.md");
    expect(content).toMatch(/deletion test/i);
    expect(content).toMatch(/shallow modules/i);
    expect(content).toMatch(/codebase-design/i);
    expect(content).toMatch(/do not edit|read-only/i);
  });
});

describe("all referenced agents exist", () => {
  const pkg = JSON.parse(readFile("package.json"));

  // Discover all agent names from the agents/ directory
  const agentFiles = AGENT_FILES.map((f) => f.replace("agents/", ""));
  const agentNames = agentFiles.map((f) => f.replace(".md", ""));

  test("each agent file has a corresponding agent name", () => {
    expect(agentNames).toContain("tdd-worker");
    expect(agentNames).toContain("slice-verifier");
    expect(agentNames).toContain("land-worker");
    expect(agentNames).toContain("deviation-reporter");
    expect(agentNames).toContain("architecture-scout");
    expect(agentNames).toContain("implement-preconditions");
    expect(agentNames).toContain("coherence-refactorer");
    expect(agentNames).toContain("test-runner");
    expect(agentNames).toContain("spec-reconciler");  });

  test("agent names are in package subagents path", () => {
    expect(pkg.pi.subagents.agents).toContain("./agents");
  });
});

// ─── Skill references in skills ──────────────────────────────────────

// ─── The intake skill (intake-skill) ─────────────────────────────────

// The front door: intake replaces triage as the single entry to the
// workflow. It is user-invoked (starting an effort is a deliberate human
// act), opens through tw_open, and always creates an effort: a map plus
// exactly one non-negotiables grilling task.
describe("intake skill (intake-skill)", () => {
  const content = readFile("skills/engineering/intake/SKILL.md");
  const fm = parseFrontmatter(content);

  test("is registered in pi.skills and exists as a user-invoked skill", () => {
    const pkg = JSON.parse(readFile("package.json"));
    expect(pkg.pi.skills).toContain("./skills/engineering/intake");
    expect(fm["name"]).toBe("intake");
    expect(fm["disable-model-invocation"]).toBe("true");
  });

  test("opens through tw_open and names the tools it works through", () => {
    expect(content).toMatch(/tw_open/);
    expect(content).toMatch(/tw_create_effort/);
    expect(content).toMatch(/tw_add_task/);
  });

  test("always creates an effort: a map plus exactly one non-negotiables grilling task", () => {
    expect(content).toMatch(/exactly one/i);
    expect(content).toMatch(/non-negotiables grilling task/i);
    expect(content).toMatch(/tw_add_ticket/);
  });

  test("records the intake facts", () => {
    expect(content).toMatch(/raw request/i);
    expect(content).toMatch(/destination/i);
    expect(content).toMatch(/actor/i);
    expect(content).toMatch(/classification/i);
    expect(content).toMatch(/three to five/i);
    expect(content).toMatch(/steps, expected versus actual, and impact|expected versus actual/i);
    expect(content).toMatch(/constraints/i);
  });

  test("the duplicate and link checks are bounded and time-boxed", () => {
    expect(content).toMatch(/bounded/i);
    expect(content).toMatch(/time-boxed/i);
    expect(content).toMatch(/archived/i);
  });

  test("every bug report becomes an effort; intake decides no simple-versus-full split", () => {
    expect(content).toMatch(/every bug report becomes an effort/i);
    expect(content).toMatch(/subtype: bug/);
    expect(content).toMatch(/no simple-versus-full split|does not decide.*simple/i);
    expect(content).toMatch(/wayfinder/i);
  });

  test("seeds the canonical map sections as empty placeholders", () => {
    expect(content).toMatch(/Non-goals/);
    expect(content).toMatch(/Non-negotiable facts/);
    expect(content).toMatch(/empty placeholder/i);
  });

  test("does not restate opener preconditions or the literal ready_for_spec token", () => {
    expect(content).not.toMatch(/ready_for_spec/);
  });

  test("ships its report resource", () => {
    const report = readFile("skills/engineering/intake/resources/report.md");
    expect(report).toMatch(/## 1\. What is now true/);
  });
});

describe("triage is retired (intake-skill)", () => {
  test("moves to skills/deprecated/triage with its replacement named", () => {
    const deprecated = readFile("skills/deprecated/triage/SKILL.md");
    expect(deprecated).toMatch(/intake/);
    expect(existsSync(join(PROJECT, "skills/engineering/triage"))).toBe(false);
  });

  test("is absent from pi.skills and the docs page tree", () => {
    const pkg = JSON.parse(readFile("package.json"));
    expect(pkg.pi.skills).not.toContain("./skills/engineering/triage");
    expect(existsSync(join(PROJECT, "docs/engineering/triage.md"))).toBe(false);
  });

  test("the deprecated bucket README lists it with its replacement", () => {
    const readme = readFile("skills/deprecated/README.md");
    expect(readme).toContain("[triage](./triage/SKILL.md)");
    expect(readme).toMatch(/Replaced by `intake`/);
  });

  test("the workflow-skills report seam drops triage and carries intake", () => {
    // Seam 4's coverage set is edited when a skill joins or leaves the
    // package; this pins the intake-skill reshuffle.
    const source = readFile("tests/skill-rewire.test.ts");
    expect(source).toContain('"intake"');
  });

  test("the skill surface stays the promoted set: intake in, triage out, count unchanged", () => {
    const pkg = JSON.parse(readFile("package.json"));
    expect(pkg.pi.skills).toContain("./skills/engineering/intake");
    expect(pkg.pi.skills).not.toContain("./skills/engineering/triage");
    expect(pkg.pi.skills.length).toBe(28);
    expect(pkg.pi.skills.filter((s: string) => s.includes("intake") || s.includes("triage"))).toEqual([
      "./skills/engineering/intake",
    ]);
  });

  test("intake has a docs page and triage has none", () => {
    expect(existsSync(join(PROJECT, "docs/engineering/intake.md"))).toBe(true);
    expect(existsSync(join(PROJECT, "docs/engineering/triage.md"))).toBe(false);
    const page = readFile("docs/engineering/intake.md");
    for (const section of ["## What it does", "## When to reach for it", "## Common questions", "## It's working if"]) {
      expect(page).toContain(section);
    }
  });

  test("the no-rejection path: intake never routes a request to a wontfix", () => {
    const intake = readFile("skills/engineering/intake/SKILL.md");
    expect(intake).toMatch(/no rejection path|never reject|no rejection/i);
    expect(intake).not.toMatch(/wontfix/);
  });
  test("the repo-root docs keep the retired bug queue out of the routing tables", () => {
    // The overview's on-ramp and query table reflect the v5 front door: the
    // triage queue and the docs/bugs grep are gone with triage.
    const overview = readFile("skills/engineering/task-workflow-overview/SKILL.md");
    expect(overview).toContain("/skill:intake");
    expect(overview).not.toContain("/skill:triage");
    expect(overview).not.toContain('grep -l "status: reported" docs/bugs/*.md');
    // The effort's own carried constraint: docs/bugs/ survives only as a
    // static archive, so the overview no longer names it as the bug list.
    expect(overview).not.toContain("docs/bugs/");
  });
});

// ─── implement-ticket: the implementation phase ──────────────────────

// The phase is a model-invoked skill in the promoted set: it opens through
// tw_open (the gate) and closes through tw_close. Its chain scripts live
// under the skill directory; the retired implementation router and close-out
// skill sit in skills/deprecated/ with their replacements named and are gone
// from pi.skills and the docs page tree.
describe("implement-ticket skill (implement-ticket-skill)", () => {
  const content = readFile("skills/engineering/implement-ticket/SKILL.md");
  const fm = parseFrontmatter(content);
  const pkg = JSON.parse(readFile("package.json"));

  test("is a model-invoked skill registered in pi.skills", () => {
    expect(pkg.pi.skills).toContain("./skills/engineering/implement-ticket");
    expect(fm["name"]).toBe("implement-ticket");
    // Model-invoked: the frontmatter carries no disable-model-invocation.
    expect(fm["disable-model-invocation"]).toBeUndefined();
  });

  test("opens through tw_open with the effort and target, and closes through tw_close", () => {
    expect(content).toMatch(/tw_open/);
    expect(content).toMatch(/skill: "implement-ticket", effort: "<effort-slug>", target: "<ticket-slug>"/);
    expect(content).toContain("tw_close implement-ticket");
  });

  test("the chain scripts live under the skill; the retired router paths are gone", () => {
    expect(existsSync(join(PROJECT, "skills/engineering/implement-ticket/scripts/ticket-chain.js"))).toBe(true);
    expect(existsSync(join(PROJECT, "skills/engineering/implement-ticket/scripts/end-of-effort.js"))).toBe(true);
    expect(existsSync(join(PROJECT, "skills/engineering/implement-task"))).toBe(false);
    expect(existsSync(join(PROJECT, "skills/engineering/finalize-task"))).toBe(false);
  });

  test("implement-task and finalize-task are retired with their replacements named", () => {
    for (const retired of ["implement-task", "finalize-task"]) {
      expect(pkg.pi.skills).not.toContain(`./skills/engineering/${retired}`);
      expect(existsSync(join(PROJECT, `docs/engineering/${retired}.md`))).toBe(false);
      const deprecated = readFile(`skills/deprecated/${retired}/SKILL.md`);
      expect(deprecated).toMatch(/implement-ticket/);
    }
    const readme = readFile("skills/deprecated/README.md");
    expect(readme).toContain("[implement-task](./implement-task/SKILL.md)");
    expect(readme).toContain("[finalize-task](./finalize-task/SKILL.md)");
  });
});

describe("human-mode resource routing", () => {
  const routers = ["feature", "bug"];

  test.each(routers)("%s router is slim and references both mode resources", (kind) => {
    const content = readFile(`skills/engineering/implement-ticket/resources/${kind}.md`);
    expect(content).toContain(`resources/${kind}/autonomous.md`);
    expect(content).toContain(`resources/${kind}/human.md`);
    expect(content).toMatch(/ambiguous/i);
    expect(content).toMatch(/ask_user_question/);
    expect(content.length).toBeLessThan(2500);
  });

  test.each(routers)("%s mode resources exist and autonomous copy is substantial", (kind) => {
    const autonomous = readFile(`skills/engineering/implement-ticket/resources/${kind}/autonomous.md`);
    const human = readFile(`skills/engineering/implement-ticket/resources/${kind}/human.md`);
    expect(autonomous.length).toBeGreaterThan(2500);
    expect(human.length).toBeGreaterThan(100);
  });

  test.each(routers)("%s router documents clear human phrases, variants, and autonomous fallback", (kind) => {
    const content = readFile(`skills/engineering/implement-ticket/resources/${kind}.md`);
    expect(content).toMatch(/implement (the task )?(yourself|manually)|human mode|manual mode/i);
    expect(content).toMatch(/no prose|no trailing prose|fallback|autonomous/i);
    expect(content).toMatch(/confirmation|confirm/i);
  });
});

describe("human-mode feature pipeline", () => {
  const content = readFile("skills/engineering/implement-ticket/resources/feature/human.md");

  test("requires collaborative architecture planning and explicit consent before implementation", () => {
    expect(content).toMatch(/architecture[- ]spec/i);
    expect(content).toMatch(/collaborat(e|ively).*review|review.*architecture/i);
    expect(content).toMatch(/explicit (user|human) consent|consent.*before/i);
    expect(content).toMatch(/no ticket (code|implementation).*before.*handoff/i);
    // v5: the architecture document lives at the effort root (to-tickets'
    // output); ordering reads the effort graph.
    expect(content).toMatch(/docs\/tasks\/<effort>\/architecture\.md/);
    expect(content).toContain("tw_dependency_levels <effort-slug>");
  });

  test("defines per-ticket handoff and human-owned implementation boundary", () => {
    expect(content).toMatch(/per[- ]ticket.*handoff/i);
    expect(content).toMatch(/non[- ]code context/i);
    expect(content).toMatch(/verification contract/i);
    expect(content).toMatch(/human.*implement/i);
    expect(content).toMatch(/explicit.*request.*code assistance|code assistance.*explicit/i);
  });

  test("defines read-only verifier-first fast-fail chain", () => {
    expect(content).toMatch(/verifier[- ]first/i);
    expect(content).toMatch(/read[- ]only/i);
    expect(content).toMatch(/fast[- ]fail/i);
    expect(content).toContain("slice-verifier");
    expect(content).toContain("deviation-reporter");
    expect(content).toContain("code-reviewer");
    expect(content).toMatch(/must not edit|cannot edit/i);
    expect(content).toMatch(/failure.*return|return.*failure/i);
  });

  test("keeps planning, handoff, verification, landing, and refactoring in order", () => {
    const stages = ["## 1.", "## 2.", "## 3.", "## 4.", "## 5."];
    const positions = stages.map((stage) => content.indexOf(stage));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(content).toMatch(/approval gate/i);
  });

  test("gates findings, landing, progression, and refactoring on approval", () => {
    expect(content).toMatch(/present.*findings|findings.*present/i);
    expect(content).toMatch(/explicit.*approval.*landing|approval.*before.*landing/i);
    expect(content).toContain("land-worker");
    expect(content).toMatch(/next ticket.*approval|approval.*next ticket/i);
    expect(content).toMatch(/whole-effort.*refactor|collaborative.*refactor/i);
    expect(content).toMatch(/consent.*refactor|approval.*refactor/i);
  });
});

describe("human-mode bug pipeline", () => {
  const content = readFile("skills/engineering/implement-ticket/resources/bug/human.md");

  test("requires collaborative reproduction and diagnosis planning with consent", () => {
    expect(content).toMatch(/reproduction|reproduce/i);
    expect(content).toMatch(/diagnos(e|is)/i);
    expect(content).toMatch(/cause|regression seam|acceptance criteria|scope/i);
    expect(content).toMatch(/explicit (user|human) consent|consent.*before/i);
    expect(content).toMatch(/not.*feature.*architecture|do not.*architecture-spec/i);
  });

  test("defines human implementation handoff and forbids unrequested edits", () => {
    expect(content).toMatch(/implementation handoff|hand.*human/i);
    expect(content).toMatch(/do not write.*(fix|code)|no.*code.*before/i);
    expect(content).toMatch(/explicit.*request.*code assistance|code assistance.*explicit/i);
  });

  test("defines read-only verifier-first fast-fail chain and permissions", () => {
    expect(content).toMatch(/verifier[- ]first/i);
    expect(content).toMatch(/read[- ]only/i);
    expect(content).toMatch(/fast[- ]fail/i);
    expect(content).toContain("slice-verifier");
    expect(content).toMatch(/must not edit|cannot edit/i);
    expect(content).toMatch(/failure.*return|return.*failure/i);
  });

  test("requires findings approval before separate landing and completion", () => {
    expect(content).toMatch(/present.*findings|findings.*present/i);
    expect(content).toMatch(/explicit.*approval.*landing|approval.*before.*landing/i);
    expect(content).toContain("land-worker");
    expect(content).toMatch(/next slice|task completion|complete/i);
  });
});

// ─── Human-mode integration contracts ────────────────────────────────

/**
 * These assertions intentionally observe resource boundaries and protocol
 * vocabulary, rather than matching the surrounding explanatory prose. This
 * keeps the workflow coverage stable when the orchestration text is revised.
 */
describe("human-mode integration coverage", () => {
  const modes = ["autonomous", "human"] as const;
  const taskKinds = ["feature", "bug"] as const;

  test.each(taskKinds)("%s router is the sole dispatch entry and discovers both modes", (kind) => {
    const router = readFile(`skills/engineering/implement-ticket/resources/${kind}.md`);
    expect(router).toContain(`resources/${kind}/autonomous.md`);
    expect(router).toContain(`resources/${kind}/human.md`);
    expect(router).toMatch(/no trailing mode prose|no prose/i);
    expect(router).toMatch(/ambiguous/i);
    expect(router).toContain("ask_user_question");

    const phase = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(phase).toContain(`resources/${kind}.md`);
    // The mode-specific pipelines are the routers' own discovery; the phase
    // never selects one directly.
    expect(phase).not.toContain(`resources/${kind}/human.md`);
    expect(phase).not.toContain(`resources/${kind}/autonomous.md`);
  });

  test.each(taskKinds.flatMap((kind) => modes.map((mode) => [kind, mode] as const)))
    ("%s %s resource exists and is non-empty", (kind, mode) => {
      const content = readFile(`skills/engineering/implement-ticket/resources/${kind}/${mode}.md`);
      expect(content.trim().length).toBeGreaterThan(100);
    });

  test("verification agent permissions are read-only while landing remains separate", () => {
    const verifier = parseFrontmatter(readFile("agents/slice-verifier.md"));
    const reviewer = parseFrontmatter(readFile("agents/code-reviewer.md"));
    expect(verifier.tools).toBe("read, bash, submit_feedback");
    expect(reviewer.tools).not.toMatch(/edit|write|land-worker/);

    for (const kind of taskKinds) {
      const human = readFile(`skills/engineering/implement-ticket/resources/${kind}/human.md`);
      expect(human).toMatch(/read[- ]only/i);
      expect(human).toMatch(/must not edit|cannot edit/i);
      expect(human).toContain("land-worker");
      expect(human.indexOf("explicit human approval")).toBeLessThan(human.lastIndexOf("land-worker"));
    }
  });

  test.each(taskKinds)("%s human protocol covers verifier failure and approval rejection", (kind) => {
    const human = readFile(`skills/engineering/implement-ticket/resources/${kind}/human.md`);
    expect(human).toMatch(/verifier[- ]first/i);
    expect(human).toMatch(/fast[- ]fail/i);
    expect(human).toMatch(/failure.*return|return.*failure/i);
    expect(human).toMatch(/rejected|declined|not approved/i);
    expect(human).toMatch(/next ticket|ticket completion|declaring ticket completion/i);
  });

  test("feature human protocol preserves collaborative post-handoff assistance boundary", () => {
    const human = readFile("skills/engineering/implement-ticket/resources/feature/human.md");
    expect(human).toMatch(/after the per[- ]ticket handoff|after.*handoff/i);
    expect(human).toMatch(/explicit request.*code assistance|code assistance.*explicit/i);
    expect(human).toMatch(/multiple tickets|each ticket|every ticket/i);
    expect(human).toMatch(/whole-effort.*refactor|collaborative.*refactor/i);
  });
});

describe("skill cross-references", () => {
  test("overview references all core skills", () => {
    const content = readFile("skills/engineering/task-workflow-overview/SKILL.md");
    expect(content).toContain("wayfinder");
    expect(content).toContain("/skill:implement-ticket");
    expect(content).toContain("setup-workflow");
    // The retired routers are gone from the router table.
    expect(content).not.toContain("/skill:implement-task");
    expect(content).not.toContain("/skill:finalize-task");
  });

  test("implement-ticket never denies the grilling skill exists", () => {
    // The implementation phase routes planning work back to wayfinder
    // (grilling-delegation-fix): it never restates the method and never
    // claims grilling lacks a standalone skill.
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(content).toMatch(/Wayfinder's frontier/);
    expect(content).toMatch(/\/skill:wayfinder/);
    expect(content).not.toMatch(/grilling[^\n]*no standalone skill/i);
  });

  test("implement-ticket routes feature and bug tickets and hands planning back to wayfinder", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    // The v5 routing fields: subtype names the ticket kind (feature or bug),
    // mode marks a human-owned ticket. Implementation work is always a
    // ticket; there is no type fallback and no planning dispatch here.
    expect(content).toMatch(/"subtype"/);
    expect(content).toContain("resources/feature.md");
    expect(content).toContain("resources/bug.md");
    expect(content).toMatch(/`type: ticket` with `subtype` `feature` or `bug`/);
    // The planning frontier is Wayfinder's; the phase never dispatches a
    // planning subtype and never restates the grilling method.
    expect(content).toMatch(/planning subtypes \(research, prototype, grilling, manual\) are/);
    expect(content).not.toContain("implement-task/resources/research.md");
    expect(content).not.toContain("implement-task/resources/prototype.md");
    expect(content).not.toContain("implement-task/resources/grilling.md");
    expect(content).not.toContain("implement-task/resources/manual.md");
  });

  test("wayfinder creates planning tasks only; to-tickets owns feature and bug creation", () => {
    const content = readFile("skills/engineering/wayfinder/SKILL.md");
    expect(content).toContain("to-tickets");
    expect(content).toMatch(/feature and bug/i);
    expect(content).toContain("blocked_by");
    expect(content).toMatch(/decisions, not deliverables|hand off, don't build/i);
    // The stale "replaces create-task, to-spec, and to-tickets" sentence is
    // gone: wayfinder hands off to to-spec and to-tickets (two-phase model).
    expect(content).not.toContain("create-task");
    expect(content).not.toContain("It replaces");
  });

  test("to-tickets owns implementation task creation", () => {
    const content = readFile("skills/engineering/to-tickets/SKILL.md");
    expect(content).toContain("feature");
    expect(content).toContain("bug");
    expect(content).toContain("blocked_by");
    expect(content).toMatch(/tw_dependency_levels|tw_frontier/);
  });

  test("wayfinder has one planning resource per planning subtype, no feature/bug resources", () => {
    for (const subtype of ["research", "prototype", "grilling", "manual"]) {
      const content = readFile(`skills/engineering/wayfinder/resources/${subtype}.md`);
      expect(content).toContain("Wayfinder Planning Resource");
      expect(content).toMatch(new RegExp(`^type: task$`, "m"));
      expect(content).toMatch(new RegExp(`^subtype: ${subtype}$`, "m"));
    }
    // Feature and bug planning resources are deleted: feature and bug
    // creation is to-tickets' job, aligned with its Boundary.
    expect(existsSync(join(PROJECT, "skills/engineering/wayfinder/resources/feature.md"))).toBe(false);
    expect(existsSync(join(PROJECT, "skills/engineering/wayfinder/resources/bug.md"))).toBe(false);
  });

  test("implement-ticket sends planning work back to wayfinder", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    // Planning work discovered mid-implementation is Wayfinder's: the run
    // stops and tells the human, it never improvises a hidden plan.
    expect(content).toMatch(/tells? the human to run `\/skill:wayfinder`/);
    expect(content).toMatch(/do not improvise a hidden/);
  });

  test("implement-ticket feature resource references tw_dependency_levels", () => {
    const content = readFile("skills/engineering/implement-ticket/resources/feature/autonomous.md");
    expect(content).toContain("tw_dependency_levels");
  });

  test("implement-ticket feature resource references tdd-worker agent", () => {
    const content = readFile("skills/engineering/implement-ticket/resources/feature/autonomous.md");
    expect(content).toContain("tdd-worker");
  });

  test("implement-ticket feature resource references slice-verifier agent", () => {
    const content = readFile("skills/engineering/implement-ticket/resources/feature/autonomous.md");
    expect(content).toContain("slice-verifier");
  });

  test("implement-ticket feature resource references land-worker agent", () => {
    const content = readFile("skills/engineering/implement-ticket/resources/feature/autonomous.md");
    expect(content).toContain("land-worker");
  });

  test("implement-ticket feature resource references deviation-reporter agent", () => {
    const content = readFile("skills/engineering/implement-ticket/resources/feature/autonomous.md");
    expect(content).toContain("deviation-reporter");
  });

  test("implement-ticket feature resource references code-reviewer agent", () => {
    const content = readFile("skills/engineering/implement-ticket/resources/feature/autonomous.md");
    expect(content).toContain("code-reviewer");
  });

  for (const resource of ["research", "prototype", "grilling", "manual"]) {
    test(`the ${resource} planning resource lives under wayfinder and is non-coding`, () => {
      const content = readFile(`skills/engineering/wayfinder/resources/${resource}.md`);
      expect(content).toContain("Wayfinder Planning Resource");
      expect(content).toContain("Completion evidence");
    });
  }

  test("implement-ticket bug resource references tdd-worker agent", () => {
    const content = readFile("skills/engineering/implement-ticket/resources/bug/autonomous.md");
    expect(content).toContain("tdd-worker");
  });

  test("implement-ticket bug resource references slice-verifier agent", () => {
    const content = readFile("skills/engineering/implement-ticket/resources/bug/autonomous.md");
    expect(content).toContain("slice-verifier");
  });

  test("implement-ticket bug resource references land-worker agent", () => {
    const content = readFile("skills/engineering/implement-ticket/resources/bug/autonomous.md");
    expect(content).toContain("land-worker");
  });

  test("implement-ticket bug resource references code-reviewer agent", () => {
    const content = readFile("skills/engineering/implement-ticket/resources/bug/autonomous.md");
    expect(content).toContain("code-reviewer");
  });

  test("implement-ticket bug chain keeps the red-first regression test rule", () => {
    // The rule lives in the diagnosing-bugs skill the worker receives; the
    // task text never restates it.
    const diagnosing = readFile("skills/engineering/diagnosing-bugs/SKILL.md");
    expect(diagnosing).toMatch(/regression test .{0,40}before the fix/i);
    const chain = readFile("skills/engineering/implement-ticket/scripts/ticket-chain.js");
    expect(chain).not.toMatch(/regression test/i);
  });

  test("feature and bug resources include failure toolbelt in order", () => {
    const feature = readFile("skills/engineering/implement-ticket/resources/feature/autonomous.md");
    const bug = readFile("skills/engineering/implement-ticket/resources/bug/autonomous.md");
    for (const content of [feature, bug]) {
      const splitIdx = content.indexOf("split");
      const retryIdx = content.indexOf("retry");
      expect(splitIdx).toBeGreaterThan(-1);
      expect(retryIdx).toBeGreaterThan(-1);
      expect(splitIdx).toBeLessThan(retryIdx);
      expect(content).toContain("parent never implements");
    }
  });

  test("the close-out marks the ticket done through tw_mark_done, the one owner", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(content).toContain("tw_mark_done");
    expect(content).toMatch(/the one owner of the/i);
    // The chain never marks it: the close-out is the marking's only writer.
    expect(content).toMatch(/the chain never marks it/);
  });

  test("the close-out runs inline in the same run that lands the ticket", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(content).toMatch(/close-out runs inline, in the same autonomous run that lands the/i);
    expect(content).toMatch(/The human never waits to type a close-out skill/i);
  });

  test("the changelog entry lands before the done-marking, through the only writer", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(content).toMatch(/tw_write_changelog/);
    expect(content).toMatch(/the only\n   writer of `docs\/tasks\/CHANGELOG\.md`/);
    expect(content).toMatch(/changelog step must land first/i);
  });

  test("the CI gate runs before the merge; a red branch is never merged", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(content).toMatch(/CI gate/i);
    expect(content).toMatch(/Do not merge a red branch/i);
  });

  test("the close-out keeps Pi tool calls out of the set -e shell blocks", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    const fence = /```[^\n]*\n([\s\S]*?)```/g;
    let m: RegExpExecArray | null;
    let shellBlocks = 0;
    while ((m = fence.exec(content)) !== null) {
      if (/git\s+merge\s+--no-ff/.test(m[1])) {
        shellBlocks++;
        // Wrapping a Pi tool call in a set -e shell block fails with
        // command not found and aborts the close-out mid-sequence (see
        // docs/bugs/finalize-task-set-e-tool-confusion.md).
        expect(m[1]).not.toMatch(/tw_state_set|tw_finalizable/);
      }
    }
    expect(shellBlocks).toBeGreaterThan(0);
    // The Pi tool calls must still appear, clearly marked as tool invocations
    // rather than shell commands.
    expect(content).toMatch(/Pi tool|tool call|tool invocation|not a shell command/i);
  });

  test("the done-marking verifies with tw_finalizable and clears the task pointer", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(content).toContain("tw_finalizable <ticket-slug>");
    expect(content).toMatch(/anomal/i);
    expect(content).toContain("tw_state_set task null");
    // The slice pointer is not called: the state setter has no slice field.
    expect(content).not.toMatch(/tw_state_set slice/);
  });

  test("no per-ticket git mv: the ticket stays in the live effort", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(content).toMatch(/no per-ticket move|the ticket stays in the live effort/i);
    expect(content).toMatch(/the effort archives as a unit/i);
    // Archiving is finalize-effort's; the close-out never moves the ticket.
    expect(content).not.toContain("docs/tasks/archive/<effort>");
  });

  test("the close-out has a subtype: bug branch", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(content).toMatch(/subtype: bug/i);
  });

  test("the bug branch archives bug docs to docs/bugs/archive", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(content).toContain("docs/bugs/archive");
  });

  test("the bug branch sets status fixed and fills fix_commit", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(content).toContain("status: fixed");
    expect(content).toContain("fix_commit");
  });

  test("the bug branch asks user when the body reference is absent", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(content).toMatch(/ask.{0,80}(which bug|bug doc)/i);
  });

  test("the bug branch takes the bug slug from the ticket body's reference", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(content).toMatch(/ticket body/i);
    // The bug frontmatter field is dead; the body reference is the convention.
    expect(content).not.toContain("bug: <slug>");
  });

  test("setup-workflow creates docs/bugs/archive directory", () => {
    const content = readFile("skills/engineering/setup-workflow/SKILL.md");
    expect(content).toContain("docs/bugs/archive");
  });

  test("setup-workflow writes docs/dev-env.md template", () => {
    const content = readFile("skills/engineering/setup-workflow/SKILL.md");
    expect(content).toContain("docs/dev-env.md");
  });

  test("setup-workflow does not clobber existing docs/dev-env.md", () => {
    const content = readFile("skills/engineering/setup-workflow/SKILL.md");
    expect(content).toMatch(/do not clobber|already exists|skip.*docs\/dev-env\.md|preserve.*docs\/dev-env\.md/i);
  });

  test("task-overview routes planning to wayfinder", () => {
    const content = readFile("skills/engineering/task-workflow-overview/SKILL.md");
    expect(content).toContain("/skill:wayfinder");
    expect(content).toContain("tw_frontier");
  });

  test("task-workflow-doctor references setup-workflow", () => {
    const content = readFile("skills/engineering/task-workflow-doctor/SKILL.md");
    expect(content).toContain("setup-workflow");
  });

  test("task-workflow-doctor has not-a-fixer contract", () => {
    const content = readFile("skills/engineering/task-workflow-doctor/SKILL.md");
    expect(content).toContain("diagnoses");
    expect(content).toContain("routes");
  });

  test("implement-ticket bug chain references diagnosing-bugs skill", () => {
    // The discipline routing moved into the shipped chain script.
    const chain = readFile("skills/engineering/implement-ticket/scripts/ticket-chain.js");
    expect(chain).toContain("diagnosing-bugs");
  });

  test("tdd-worker agent references diagnosing-bugs skill", () => {
    const content = readFile("agents/tdd-worker.md");
    expect(content).toContain("diagnosing-bugs");
  });

  test("diagnosing-bugs skill names Phase 1 as non-skippable", () => {
    const content = readFile("skills/engineering/diagnosing-bugs/SKILL.md");
    expect(content).toContain("Phase 1");
    expect(content).toContain("non-skippable");
  });

  test("diagnosing-bugs skill documents skippable phases with recorded justification", () => {
    const content = readFile("skills/engineering/diagnosing-bugs/SKILL.md");
    expect(content).toContain("skippable");
    expect(content).toMatch(/justified|recorded/);
  });
});

// ─── setup-workflow / migration skill references ─────────────────────

describe("setup-workflow / migration skill references", () => {
  test("is registered as a promoted Pi skill", () => {
    const pkg = JSON.parse(readFile("package.json"));
    expect(pkg.pi.skills).toContain("./skills/engineering/setup-workflow");
  });

  test("SKILL.md references the upgrade-2-to-3 resource", () => {
    const content = readFile("skills/engineering/setup-workflow/SKILL.md");
    expect(content).toMatch(/upgrade-2-to-3/);
  });

  test("SKILL.md references the target-state spec", () => {
    const content = readFile("skills/engineering/setup-workflow/SKILL.md");
    expect(content).toMatch(/migration-target\.yaml/);
  });

  test("SKILL.md mentions schema_version detection", () => {
    const content = readFile("skills/engineering/setup-workflow/SKILL.md");
    expect(content).toMatch(/schema_version/);
  });

  test("SKILL.md mentions dry-run safety", () => {
    const content = readFile("skills/engineering/setup-workflow/SKILL.md");
    expect(content).toMatch(/dry-run/i);
  });

  test("SKILL.md mentions backup branch safety", () => {
    const content = readFile("skills/engineering/setup-workflow/SKILL.md");
    expect(content).toMatch(/backup/i);
  });

  test("SKILL.md mentions idempotence", () => {
    const content = readFile("skills/engineering/setup-workflow/SKILL.md");
    expect(content).toMatch(/idempoten/i);
  });

  test("upgrade-2-to-3 resource exists and lists 9 steps", () => {
    const content = readFile("skills/engineering/setup-workflow/resources/upgrade-2-to-3.md");
    for (let i = 1; i <= 9; i++) {
      expect(content).toMatch(new RegExp(`## Step ${i}`));
    }
  });
});

// ─── setup-workflow v5 (schema_version 5) ────────────────────────────

describe("setup-workflow v5", () => {
  const skill = readFile("skills/engineering/setup-workflow/SKILL.md");

  test("keys detection on schema_version 5 as current", () => {
    expect(skill).toMatch(/current schema version is \*\*5\*\*/);
  });

  test("routes a v4 repo to the upgrade-4-to-5 resource", () => {
    expect(skill).toMatch(/upgrade-4-to-5/);
  });

  test("the no-op message names schema_version 5", () => {
    expect(skill).toMatch(/already on schema_version 5, nothing to do/);
  });

  test("names the three branches: fresh, migrate, no-op", () => {
    expect(skill).toMatch(/onboard/i);
    expect(skill).toMatch(/migrate/i);
    expect(skill).toMatch(/no-op|already on schema_version/i);
  });

  test("the migrate branch invokes the CLI", () => {
    expect(skill).toMatch(/scripts\/migrate\.mjs/);
  });

  test("the migrate branch mentions the MigrateReport", () => {
    expect(skill).toMatch(/MigrateReport/);
  });

  test("the onboard branch writes the v5 scaffold", () => {
    expect(skill).toMatch(/schema_version: 5/);
    expect(skill).toMatch(/okf_version/);
  });

  test("references the upgrade-3-to-4 resource", () => {
    expect(skill).toMatch(/upgrade-3-to-4/);
  });

  test("the dead task-overview pointer is fixed", () => {
    expect(skill).toContain("/skill:task-workflow-overview");
    expect(skill).not.toContain("/skill:task-overview`");
  });

  test("upgrade-3-to-4 resource exists with the ordered step list", () => {
    const content = readFile("skills/engineering/setup-workflow/resources/upgrade-3-to-4.md");
    expect(content).toMatch(/Migration/);
    expect(content).toMatch(/scripts\/migrate\.mjs/);
    for (let i = 1; i <= 9; i++) {
      expect(content).toMatch(new RegExp(`## Step ${i}`));
    }
  });

  test("upgrade-4-to-5 resource exists with the established shape", () => {
    const content = readFile("skills/engineering/setup-workflow/resources/upgrade-4-to-5.md");
    expect(content).toMatch(/scripts\/migrate\.mjs/);
    expect(content).toMatch(/## Before you start/);
    expect(content).toMatch(/## After the run/);
    expect(content).toMatch(/## Step 1/);
    expect(content).toMatch(/## Step 2/);
  });

  test("upgrade-4-to-5 covers every v4-to-5 rewrite the migration performs", () => {
    const content = readFile("skills/engineering/setup-workflow/resources/upgrade-4-to-5.md");
    // The type and filename rename, live and archived.
    expect(content).toMatch(/arch-spec\.md/);
    expect(content).toMatch(/architecture\.md/);
    expect(content).toMatch(/arch spec/);
    // The multi-architecture-doc corner: renamed in place, not hoisted.
    expect(content).toMatch(/in place/);
    // The map body reshape.
    expect(content).toMatch(/## Out of scope/);
    expect(content).toMatch(/Non-goals/);
    expect(content).toMatch(/Non-negotiable facts/);
    // The state stamp and what the hop never touches.
    expect(content).toMatch(/schema_version: 5/);
    expect(content).toMatch(/docs\/bugs\//);
  });

  test("upgrade-4-to-5's transcript matches what the CLI actually prints", () => {
    const content = readFile("skills/engineering/setup-workflow/resources/upgrade-4-to-5.md");
    expect(content).toMatch(/migrated from schema_version 4 to 5/);
    expect(content).toMatch(/already on schema_version 5, nothing to do\./);
    expect(content).toMatch(/rebuilt state\.yaml at schema_version 5/);
  });
});
// ─── Skill-review wiring ─────────────────────────────────────────────

describe("skill-review wiring", () => {
  const skill = readFile("skills/engineering/skill-review/SKILL.md");
  const reviewer = readFile("agents/skill-reviewer.md");
  const creator = readFile("skills/engineering/skill-creator/SKILL.md");

  test("skill-review is registered and names axes with stage-0 triage", () => {
    const pkg = JSON.parse(readFile("package.json"));
    expect(pkg.pi.skills).toContain("./skills/engineering/skill-review");
    expect(skill).toMatch(/^name: skill-review/m);
    expect(skill).toMatch(/audience fit/i);
    expect(skill).toMatch(/trigger behavior/i);
    expect(skill).toMatch(/spec \/ portability|portability/i);
    expect(skill).toMatch(/triage/i);
  });

  test("skill-review fixes the plan up front with no mid-run escalation", () => {
    expect(skill).toMatch(/final once fixed|before any reviewer runs/);
    expect(skill).toMatch(/no reviewer consumes another axis|no reviewer.*another axis|request another axis later/);
    expect(skill).toMatch(/at most \*{0,2}5 axes\*{0,2}/);
    expect(skill).toMatch(/parallel sub-agent|parallel.*fresh context/);
  });

  test("skill-review defines core and optional axes with triggers", () => {
    expect(skill).toMatch(/progressive disclosure \/ token budget|progressive disclosure/i);
    expect(skill).toMatch(/accessibility.*UI|UI.*accessibility/i);
    expect(skill).toMatch(/safety.*destructive|destructive.*safety|consequential ops/i);
    expect(skill).toMatch(/reference integrity/i);
  });

  test("skill-reviewer agent mirrors code-reviewer conventions", () => {
    const fm = parseFrontmatter(reviewer);
    expect(fm.name).toBe("skill-reviewer");
    expect(fm.inheritProjectContext).toBe("true");
    expect(fm.defaultContext).toBe("fresh");
    expect(fm.tools).toBeDefined();
    expect(reviewer).toMatch(/fanout guard|do not invoke/);
  });

  test("skill-creator invokes the reviewer and teaches meta-noise pruning", () => {
    expect(creator).toMatch(/skill-reviewer|skill-review/);
    expect(creator).toMatch(/meta-level narrative/i);
    expect(creator).toMatch(/reader-agent/);
    expect(creator).toMatch(/author-facing rationale/i);
  });

  test("skill-reviewer agent does stage-0 triage before spawning", () => {
    expect(reviewer).toMatch(/triage the axis set before spawning/i);
    expect(reviewer).toMatch(/final once fixed/);
    expect(reviewer).toMatch(/at most \*{0,2}5 axes\*{0,2}/);
    expect(reviewer).toMatch(/Aggregate.*Include the review-plan|review-plan preamble/);
  });
});

// ─── Tool prefix rename (corpus check) ───────────────────────────────

// The old tool prefix and the tool suffixes are assembled from parts so this
// test file itself carries no old-prefix literal.
const OLD_PREFIX = "task" + "_";
const TOOL_SUFFIXES = [
  "show",
  "get",
  "set",
  "set_slices",
  "resolve",
  "assert_kind",
  "list",
  "slices",
  "finalizable",
  "dependency_levels",
  "frontier",
  "map_tasks",
  "map_tick",
  "map_finalizable",
  "state",
  "state_set",
  "context",
];
const OLD_TOOL_PATTERN = new RegExp(`\\b${OLD_PREFIX}(${TOOL_SUFFIXES.join("|")})\\b`);
// The wildcard family reference (`task_*`) is also an old-prefix reference;
// assembled from parts for the same reason as OLD_PREFIX.
const OLD_WILDCARD_PATTERN = new RegExp(`${OLD_PREFIX}\\*`);

// Mirrors the sweep verification: every file under the package root, minus
// node_modules/.git, any archive directory (archived docs are historical
// records and keep the names that were live when they ran), and
// prototype-bundle (gitignored vendored experiment trees whose third-party
// build output, e.g. Python deps under smoke-py/build, is not package
// surface and can coincidentally match old tool names like the anyio
// `task` + `_state` variable).
const CORPUS_SKIP_DIRS = new Set(["node_modules", ".git", "archive", "prototype-bundle"]);
function corpusFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (CORPUS_SKIP_DIRS.has(entry.name)) continue;
      corpusFiles(join(dir, entry.name), out);
    } else if (entry.isFile()) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

// Historical-record exemptions, same class as the archive: documents that
// record the old surface as it was keep the names that were live when
// written. Dated changelog entries, decision records, audit findings, and
// the rename task's own arch-spec (its old-to-new mapping table must keep
// the old names to stay meaningful).
const CORPUS_EXEMPTIONS = new Set([
  "docs/tasks/CHANGELOG.md",
  "docs/tasks/overhaul-tw-rename/arch-spec.md",
  "docs/tasks/maps/task-tools-overhaul/handoff.md",
  "docs/tasks/overhaul-synthesis-grilling/task.md",
  "docs/tasks/tool-surface-inventory/findings.md",
  "docs/tasks/tool-surface-inventory/task.md",
  "docs/tasks/workflow-tool-usage-audit/findings.md",
  "docs/tasks/workflow-tool-usage-audit/task.md",
  "docs/tasks/eval-stack-research/findings.md",
]);

// Wildcard (`task_*`) exemptions, a wider class: historical records that
// describe the old surface as it was (decision records, audit findings,
// ideas docs) keep the name that was live when written, including the
// ruling lines that must name the old prefix to stay meaningful (the map
// doc's rename ruling, this task's own docs, and this test file's
// comments).
const WILDCARD_EXEMPTIONS = new Set([
  "docs/tasks/CHANGELOG.md",
  "docs/tasks/overhaul-tw-rename/arch-spec.md",
  "docs/tasks/overhaul-tw-rename/task.md",
  "docs/tasks/maps/task-tools-overhaul/handoff.md",
  "docs/tasks/maps/task-tools-overhaul/map.md",
  "docs/tasks/overhaul-synthesis-grilling/task.md",
  "docs/tasks/tool-surface-inventory/findings.md",
  "docs/tasks/tool-surface-inventory/task.md",
  "docs/tasks/workflow-tool-usage-audit/findings.md",
  "docs/tasks/workflow-tool-usage-audit/task.md",
  "docs/tasks/eval-stack-research/findings.md",
  "docs/adr/0001-largely-adopt-mp-skills.md",
  "docs/ideas/bug-workflow.md",
  "docs/ideas/gate-skills-by-repo.md",
  "tests/skills.test.ts",
]);

describe("tool prefix rename", () => {
  test("no old-prefix tool reference remains outside archive", () => {
    const offenders: string[] = [];
    for (const file of corpusFiles(PROJECT)) {
      const rel = file.slice(PROJECT.length + 1);
      if (CORPUS_EXEMPTIONS.has(rel)) continue;
      const content = readFileSync(file, "utf-8");
      if (OLD_TOOL_PATTERN.test(content)) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("no old-prefix wildcard reference remains in living docs", () => {
    const offenders: string[] = [];
    for (const file of corpusFiles(PROJECT)) {
      const rel = file.slice(PROJECT.length + 1);
      if (WILDCARD_EXEMPTIONS.has(rel)) continue;
      const content = readFileSync(file, "utf-8");
      if (OLD_WILDCARD_PATTERN.test(content)) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });
});
// ─── Dead-surface deletion (corpus check) ────────────────────────────

// The eight tools the overhaul deleted plus the guidelines machinery
// identifiers. Unlike the rename sweep above, the names are written
// literally: this sweep has no old-to-new mapping to collapse, and this
// file is its own exemption (the sweep must not eat itself).
const DELETED_SURFACE_NAMES = [
  "tw_resolve",
  "tw_assert_kind",
  "tw_map_tasks",
  "tw_map_tick",
  "tw_slices",
  "tw_set_slices",
  "get_guidelines",
  "list_guidelines",
  "discoverGuidelines",
  "guidelinesCache",
  "shouldInjectGuidelines",
  "guidelineDisplayPath",
  "EXT_TO_LANG",
  "SMELL_BASELINE",
];
const DELETED_SURFACE_PATTERN = new RegExp(`\\b(${DELETED_SURFACE_NAMES.join("|")})\\b`);

// Historical-record exemptions (the arch spec's zero-references contract):
// documents that record the deleted surface as it was keep the names that
// were live when written. Archived task trees are already skipped wholesale
// by the corpus walk's archive rule; pending changeset entries are release
// notes for the removal and name the removed tools by necessity.
const DEAD_SURFACE_EXEMPT_FILES = new Set([
  "docs/tasks/CHANGELOG.md",
  "docs/tasks/maps/task-tools-overhaul/map.md",
  "docs/tasks/task-tools-overhaul/spec.md",
  "docs/tasks/overhaul-synthesis-grilling/task.md",
  "docs/migration-target.yaml",
  "rewrite-plan.md",
  "tests/skills.test.ts",
]);
const DEAD_SURFACE_EXEMPT_PREFIXES = [
  "docs/ideas/",
  ".changeset/",
  "docs/tasks/overhaul-dead-surface/",
  "docs/tasks/overhaul-execution-skills/",
  "docs/tasks/tool-surface-inventory/",
  "docs/tasks/workflow-tool-usage-audit/",
];

describe("dead surface deletion (corpus check)", () => {
  test("no deleted tool or guidelines machinery identifier remains outside the historical exemptions", () => {
    const offenders: string[] = [];
    for (const file of corpusFiles(PROJECT)) {
      const rel = file.slice(PROJECT.length + 1);
      if (DEAD_SURFACE_EXEMPT_FILES.has(rel)) continue;
      if (DEAD_SURFACE_EXEMPT_PREFIXES.some((p) => rel.startsWith(p))) continue;
      if (DELETED_SURFACE_PATTERN.test(readFileSync(file, "utf-8"))) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("the guidelines discovery skip-list identifier is gone from the extension source", () => {
    // SKIP_DIRS is a generic identifier (vendored tooling carries its own);
    // guidelines discovery was its sole user in src/, so the check is
    // scoped to the extension source.
    const offenders: string[] = [];
    for (const file of corpusFiles(join(PROJECT, "src"))) {
      if (/\bSKIP_DIRS\b/.test(readFileSync(file, "utf-8"))) {
        offenders.push(file.slice(PROJECT.length + 1));
      }
    }
    expect(offenders).toEqual([]);
  });
});

// ─── Planning skills v4 (overhaul-planning-skills) ──────────────────

// The tool names the new planning prose may reference: the surviving surface
// after the overhaul rename.
const SURVIVING_TOOLS = new Set([
  // v4 surface.
  "tw_show",
  "tw_get",
  "tw_mark_done",
  "tw_write_section",
  "tw_finalize_map",
  "tw_list",
  "tw_frontier",
  "tw_dependency_levels",
  "tw_finalizable",
  "tw_map_finalizable",
  "tw_resolve_uncertainty",
  "tw_state",
  "tw_state_set",
  "tw_context",
  // The v5 named-transition and disclosure tools as they landed:
  // disclosure-open-close-core (tw_open, tw_close, tw_next),
  // implementation-transition-tools (tw_mark_blocked,
  // tw_record_out_of_scope, tw_add_ticket, tw_split_ticket,
  // tw_write_spec, tw_finalize_map, tw_write_section), and
  // to-tickets-architecture (tw_write_architecture), and
  // implementation-transition-tools (tw_write_changelog, tw_archive_effort).
  "tw_open",
  "tw_close",
  "tw_next",
  "tw_mark_blocked",
  "tw_record_out_of_scope",
  "tw_add_ticket",
  "tw_split_ticket",
  "tw_write_spec",
  "tw_finalize_map",
  "tw_write_section",
  "tw_write_architecture",
  "tw_write_changelog",
  "tw_archive_effort",
]);

function toolNamesIn(content: string): string[] {
  return [...content.matchAll(/\btw_[a-z_]+\b/g)].map((m) => m[0]);
}

/** Assert every tw_* tool named in a prose text is in the surviving set. */
function expectOnlySurvivingTools(content: string): void {
  for (const name of toolNamesIn(content)) {
    expect(SURVIVING_TOOLS.has(name), name).toBe(true);
  }
}

// The YAML frontmatter templates a skill's prose carries: fenced blocks whose
// first line is the opening `---` fence.
function extractFrontmatterTemplates(content: string): string[] {
  const out: string[] = [];
  const fence = /```[^\n]*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(content)) !== null) {
    if (m[1].startsWith("---")) out.push(m[1]);
  }
  return out;
}

// The killed v3 fields: no producer template may carry them.
const KILLED_KEYS = new Set(["kind", "slug", "map", "slices"]);

function frontmatterKeys(template: string): string[] {
  const keys: string[] = [];
  for (const line of template.split("\n").slice(1)) {
    const trimmed = line.trim();
    if (trimmed === "---") break;
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    keys.push(trimmed.slice(0, colonIdx).trim());
  }
  return keys;
}

/** Substitute the prose placeholders so a template parses as real frontmatter. */
function substituteTemplate(template: string): string {
  return template
    .replace(/\[[^\]]*<[^>]*>[^\]]*\]/g, "[]")
    .replace(/<[^>]+>/g, "example");
}

/** Assert one substituted template passes the repo's conformance chain. */
function assertTemplateConforms(template: string): void {
  const doc = parse(substituteTemplate(template));
  const art = fromFrontmatter(doc.data, "fixture");
  const anomalies = [...validateArtifact(art), ...findAnomalies([art])];
  expect(anomalies).toEqual([]);
}

function wayfinderFile(rel: string): string {
  return readFile(join("skills/engineering/wayfinder", rel));
}

describe("wayfinder v4 (overhaul-planning-skills)", () => {
  const content = readFile("skills/engineering/wayfinder/SKILL.md");
  const templates = extractFrontmatterTemplates(content);
  const mapTemplate = templates.find((t) => /^type: map$/m.test(t))!;
  const taskTemplate = templates.find((t) => /^type: task$/m.test(t))!;

  test("map template carries the v4 fields and no killed keys", () => {
    expect(mapTemplate).toBeDefined();
    const keys = frontmatterKeys(mapTemplate);
    expect(keys).toContain("type");
    expect(keys).toContain("title");
    expect(keys).toContain("status");
    for (const killed of KILLED_KEYS) expect(keys).not.toContain(killed);
  });

  test("decision-task template carries the v4 fields and no killed keys", () => {
    expect(taskTemplate).toBeDefined();
    const keys = frontmatterKeys(taskTemplate);
    expect(keys).toContain("type");
    expect(keys).toContain("subtype");
    expect(keys).toContain("title");
    expect(keys).toContain("status");
    expect(keys).toContain("workflow_state");
    expect(keys).toContain("blocked_by");
    for (const killed of KILLED_KEYS) expect(keys).not.toContain(killed);
  });

  test("map sits at the effort root and tasks under the effort's tasks/ subtree", () => {
    expect(content).toMatch(/docs\/tasks\/<effort>\/map\.md/);
    expect(content).toMatch(/docs\/tasks\/<effort>\/tasks\/<task-slug>\/task\.md/);
    // The maps/ subtree is gone from the target layout.
    expect(content).not.toMatch(/docs\/tasks\/maps/);
  });

  test("sets the state pointers on map creation", () => {
    expect(content).toContain("tw_state_set map <effort-slug>");
    expect(content).toMatch(/tw_state_set task null/);
  });

  test("sets the state pointers on resume", () => {
    expect(content).toContain("tw_state_set task <task-slug>");
  });

  test("regenerates the root index on map creation", () => {
    expect(content).toContain("docs/tasks/index.md");
    expect(content).toMatch(/## Live/);
    expect(content).toMatch(/sorted/i);
  });

  test("frontier prose runs tw_frontier over the effort", () => {
    expect(content).toContain("tw_frontier <effort-slug>");
    expect(content).toMatch(/ready when every task in its .blocked_by. list is done/);
  });

  test("telemetry names the effort directory, not the maps subtree", () => {
    expect(content).toMatch(/effort slug/);
    expect(content).not.toContain("docs/tasks/maps/");
  });

  test("references only surviving tools", () => {
    expectOnlySurvivingTools(content);
  });

  test("every frontmatter template conforms by construction", () => {
    for (const template of templates) {
      assertTemplateConforms(template);
    }
  });
});

describe("wayfinder planning resources v4", () => {
  test("each planning resource's task template carries its v4 subtype", () => {
    for (const subtype of ["research", "prototype", "grilling", "manual"]) {
      const content = wayfinderFile(join("resources", `${subtype}.md`));
      const templates = extractFrontmatterTemplates(content);
      expect(templates.length).toBeGreaterThan(0);
      // The merged resources may carry other templates (findings); the task
      // template is the one pinned to the subtype.
      const taskTemplate = templates.find((t) => /^type: task$/m.test(t));
      expect(taskTemplate, `${subtype} resource carries a type: task template`).toBeDefined();
      expect(frontmatterKeys(taskTemplate!)).toContain("subtype");
      expect(taskTemplate).toMatch(new RegExp(`^subtype: ${subtype}$`, "m"));
      assertTemplateConforms(taskTemplate!);
    }
  });
});

// ─── wayfinder v5: the absorbed planning phase (wayfinder-reconcile-and-passes) ──

describe("wayfinder v5 (wayfinder-reconcile-and-passes)", () => {
  const content = readFile("skills/engineering/wayfinder/SKILL.md");

  test("wayfinder is user-invoked with the correct frontmatter", () => {
    const fm = parseFrontmatter(content);
    expect(fm["name"]).toBe("wayfinder");
    expect(fm["disable-model-invocation"]).toBe("true");
  });

  test("the skill opens through tw_open and releases the pass through tw_close", () => {
    expect(content).toMatch(/tw_open/);
    expect(content).toMatch(/tw_close wayfinder/);
  });

  test("a pass is bounded to one frontier snapshot and at most one grilling", () => {
    expect(content).toMatch(/one frontier snapshot/i);
    expect(content).toMatch(/at most one grilling/i);
  });

  test("a pass works the non-grilling ready tasks, then runs exactly one grilling", () => {
    expect(content).toMatch(/non-grilling ready tasks/i);
    expect(content).toMatch(/exactly one grilling/i);
  });

  test("planning work is serialized per kind", () => {
    expect(content).toMatch(/never two grillings at once/i);
    expect(content).toMatch(/research and prototype\s+may run concurrently/i);
  });

  test("a pass releases and never rolls into the next frontier", () => {
    expect(content).toMatch(/never rolls into the next frontier/i);
    expect(content).toMatch(/releases?/i);
  });

  test("an empty ready frontier triggers the reconcile step", () => {
    expect(content).toMatch(/when the snapshot's ready frontier is empty/i);
    expect(content).toMatch(/the pass runs the reconcile step/i);
  });

  test("the reconcile sets the ready flag only through tw_finalize_map", () => {
    expect(content).toMatch(/tw_finalize_map/);
    expect(content).toMatch(/only setter of/i);
    expect(content).toMatch(/Never set the flag any other way/i);
  });

  test("tw_finalize_map refuses naming every missing item", () => {
    expect(content).toMatch(/naming\s+every\s+missing\s+item/i);
  });

  test("every planning task writes its results back before marking itself done", () => {
    expect(content).toMatch(/writes its own results back to the map through\s+`tw_write_section` as its final step/i);
    expect(content).toMatch(/before it marks itself done with\s+`tw_mark_done`/i);
  });

  test("the write-back pointer convention: the map must reference the task slug", () => {
    expect(content).toMatch(/referencing the task's slug as a stand-alone token/i);
    expect(content).toMatch(/`tw_mark_done` refuses the\s+done-marking while the map does not reference the task/i);
  });

  test("wayfinder never re-synthesizes decisions from task bodies", () => {
    expect(content).toMatch(/never re-synthesizes decisions from task bodies/i);
  });

  test("a done-marking clears the flag, so post-reconcile plan changes force one more pass", () => {
    expect(content).toMatch(/A done-marking clears\s+a set ready flag/i);
    expect(content).toMatch(/forces one more\s+pass/i);
  });

  test("planning resources consolidate under wayfinder/resources; the implementation router carries none", () => {
    for (const subtype of ["research", "prototype", "grilling", "manual"]) {
      expect(existsSync(join(PROJECT, `skills/engineering/wayfinder/resources/${subtype}.md`))).toBe(true);
      expect(existsSync(join(PROJECT, `skills/engineering/implement-ticket/resources/${subtype}.md`))).toBe(false);
    }
  });

  test("each planning resource carries the write-back pointer convention and the done-marking order", () => {
    for (const subtype of ["research", "prototype", "grilling", "manual"]) {
      const content = readFile(`skills/engineering/wayfinder/resources/${subtype}.md`);
      expect(content).toMatch(/tw_write_section/);
      expect(content).toMatch(/tw_mark_done\b/);
      expect(content).toMatch(/stand-alone token/i);
    }
  });

  test("the grilling resource creates the task document and delegates the method to the grilling skill", () => {
    const content = readFile("skills/engineering/wayfinder/resources/grilling.md");
    expect(content).toMatch(/`grilling` skill/);
    expect(content).not.toMatch(/one question at a time/i);
    expect(content).not.toMatch(/answer on[\s\S]*behalf/i);
  });
});

// ─── Conformance seam: fixture efforts built from the prose templates ──

const WAYFINDER_DIR = "skills/engineering/wayfinder";

function writeFm(base: string, rel: string, frontmatter: string, body = "body text\n"): string {
  const p = join(base, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, `${frontmatter.trimEnd()}\n${body}`, "utf-8");
  return p;
}

/** The wayfinder map template extracted from the skill's prose. */
function wayfinderMapTemplate(): string {
  return extractFrontmatterTemplates(readFile(join(WAYFINDER_DIR, "SKILL.md")))
    .find((tpl) => /^type: map$/m.test(tpl))!;
}

/** Assemble a v4 effort on a temp tree from the extracted prose templates. */
function buildFixtureEffort(t: string): string {
  const taskTemplate = extractFrontmatterTemplates(
    wayfinderFile(join("resources", "research.md")),
  )[0]!;
  writeFm(t, "docs/tasks/demo/map.md", substituteTemplate(wayfinderMapTemplate()));
  writeFm(t, "docs/tasks/demo/tasks/first-question/task.md", substituteTemplate(taskTemplate));
  return "demo";
}

/** Scan a fixture tree's artifact files the way the scan layer does. */
function fixtureArtifacts(t: string, rels: string[]): Artifact[] {
  return rels.map((rel) => {
    const doc = parse(readFileSync(join(t, rel), "utf-8"));
    const dirName = rel.split("/").at(-2)!;
    const art = fromFrontmatter(doc.data, dirName);
    art.path = join(t, rel);
    return art;
  });
}

/** The doctor's bash sweep as a predicate: frontmatter presence + non-empty type. */
function sweepIssues(text: string): string[] {
  const lines = text.split("\n");
  if (lines[0]?.trim() !== "---") return ["no frontmatter"];
  const issues: string[] = [];
  let sawType = false;
  for (const line of lines.slice(1)) {
    if (line.trim() === "---") break;
    if (/^type:[ \t]*$/.test(line)) issues.push("empty type");
    if (/^type:\s*\S/.test(line)) sawType = true;
  }
  if (!sawType) issues.push("no type");
  return issues;
}

describe("conformance seam: fixture efforts from the prose templates", () => {
  test("wayfinder's map plus task tree produces zero anomalies", () => {
    const t = mkdtempSync(join(tmpdir(), "okf-fixture-"));
    try {
      const effort = buildFixtureEffort(t);
      const rels = [`docs/tasks/${effort}/map.md`, `docs/tasks/${effort}/tasks/first-question/task.md`];
      for (const rel of rels) expect(existsSync(join(t, rel))).toBe(true);
      const anomalies = findAnomalies(fixtureArtifacts(t, rels));
      expect(anomalies).toEqual([]);
    } finally {
      rmSync(t, { recursive: true, force: true });
    }
  });

  test("resume: state pointers set from an existing effort read back", async () => {
    const t = mkdtempSync(join(tmpdir(), "okf-fixture-"));
    try {
      buildFixtureEffort(t);
      const tools = createTools();
      const ctx = { directory: t } as any;
      await tools.tw_state_set.execute({ field: "map", value: "demo" }, ctx);
      await tools.tw_state_set.execute({ field: "task", value: "first-question" }, ctx);
      const out = await tools.tw_state.execute({}, ctx);
      expect(out).toMatch(/map:\s+demo/);
      expect(out).toMatch(/task:\s+first-question/);
      // Clearing the task pointer is the create-time counterpart.
      await tools.tw_state_set.execute({ field: "task", value: "null" }, ctx);
      const cleared = await tools.tw_state.execute({}, ctx);
      expect(cleared).toMatch(/task:\s+\(none\)/);
    } finally {
      rmSync(t, { recursive: true, force: true });
    }
  });

  test("a planted invalid pair is reported by findAnomalies", () => {
    const t = mkdtempSync(join(tmpdir(), "okf-fixture-"));
    try {
      const effort = buildFixtureEffort(t);
      const taskTemplate = extractFrontmatterTemplates(
        wayfinderFile(join("resources", "research.md")),
      )[0]!;
      // status: draft pairs only with workflow_state: todo; this fixture
      // pairs draft with done, the exact combination rule the doctor reads.
      const planted = substituteTemplate(taskTemplate)
        .replace(/^status: stable$/m, "status: draft")
        .replace(/^workflow_state: ready$/m, "workflow_state: done");
      writeFm(t, `docs/tasks/${effort}/tasks/planted/task.md`, planted);
      const anomalies = findAnomalies(fixtureArtifacts(t, [
        `docs/tasks/${effort}/map.md`,
        `docs/tasks/${effort}/tasks/first-question/task.md`,
        `docs/tasks/${effort}/tasks/planted/task.md`,
      ]));
      expect(anomalies.map((a) => a.kind)).toContain("invalid-combination");
      expect(anomalies.some((a) => a.detail.includes("draft") && a.detail.includes("done"))).toBe(true);
    } finally {
      rmSync(t, { recursive: true, force: true });
    }
  });

  test("a planted type-less file is flagged by the sweep predicate", () => {
    const t = mkdtempSync(join(tmpdir(), "okf-fixture-"));
    try {
      const effort = buildFixtureEffort(t);
      // Frontmatter present but no type: fromFrontmatter throws, the scan
      // skips the file silently, and the doctor's bash sweep is what finds it.
      writeFm(t, `docs/tasks/${effort}/tasks/typeless/task.md`, "---\ntitle: Typeless\n---\n");
      const issues = sweepIssues(readFileSync(join(t, `docs/tasks/${effort}/tasks/typeless/task.md`), "utf-8"));
      expect(issues).toContain("no type");
      expect(() => fromFrontmatter(parse(readFileSync(join(t, `docs/tasks/${effort}/tasks/typeless/task.md`), "utf-8")).data, "typeless")).toThrow();
    } finally {
      rmSync(t, { recursive: true, force: true });
    }
  });
});

// ─── to-spec v4 (overhaul-planning-skills) ───────────────────────────

describe("to-spec v4 (overhaul-planning-skills)", () => {
  const content = readFile("skills/engineering/to-spec/SKILL.md");
  const templates = extractFrontmatterTemplates(content);
  const specTemplate = templates.find((t) => /^type: spec$/m.test(t))!;

  test("spec template carries type, title, status and no killed keys", () => {
    expect(specTemplate).toBeDefined();
    const keys = frontmatterKeys(specTemplate);
    expect(keys).toContain("type");
    expect(keys).toContain("title");
    expect(keys).toContain("status");
    expect(keys).not.toContain("workflow_state");
    for (const killed of KILLED_KEYS) expect(keys).not.toContain(killed);
  });

  test("saves at the effort root", () => {
    expect(content).toMatch(/docs\/tasks\/<effort>\/spec\.md/);
    // The bare pre-v4 path is gone from the prose and the description.
    expect(content).not.toMatch(/docs\/tasks\/spec\.md/);
  });

  test("the description frontmatter names the effort-root path", () => {
    const fm = parseFrontmatter(content);
    expect(String(fm["description"])).toContain("docs/tasks/<effort>/spec.md");
  });

  test("draft while synthesizing, stable once the user approves", () => {
    expect(specTemplate).toMatch(/# stable once the user approves the spec/);
    expect(content).toMatch(/approves the spec|user approves/i);
  });

  test("every frontmatter template conforms by construction", () => {
    for (const template of templates) assertTemplateConforms(template);
  });

  test("a spec-only effort at planning time produces zero anomalies", () => {
    const t = mkdtempSync(join(tmpdir(), "okf-spec-only-"));
    try {
      writeFm(t, "docs/tasks/spec-only/spec.md", substituteTemplate(specTemplate));
      const anomalies = findAnomalies(fixtureArtifacts(t, ["docs/tasks/spec-only/spec.md"]));
      expect(anomalies).toEqual([]);
    } finally {
      rmSync(t, { recursive: true, force: true });
    }
  });
});

// ─── to-tickets v4 (overhaul-planning-skills) ────────────────────────

describe("to-tickets v4 (overhaul-planning-skills)", () => {
  const content = readFile("skills/engineering/to-tickets/SKILL.md");
  const templates = extractFrontmatterTemplates(content);
  const ticketTemplate = templates.find((t) => /^type: ticket$/m.test(t))!;

  test("ticket template carries the v4 fields and no killed keys", () => {
    expect(ticketTemplate).toBeDefined();
    const keys = frontmatterKeys(ticketTemplate);
    for (const key of ["type", "subtype", "title", "status", "workflow_state", "blocked_by"]) {
      expect(keys).toContain(key);
    }
    expect(keys).toContain("size");
    expect(keys).toContain("mode");
    for (const killed of KILLED_KEYS) expect(keys).not.toContain(killed);
  });

  test("no slice-list field anywhere in the prose", () => {
    expect(content).not.toContain("slices:");
  });

  test("tickets live under the effort's tickets/ subtree", () => {
    expect(content).toMatch(/docs\/tasks\/<effort>\/tickets\/<ticket-slug>\/ticket\.md/);
  });

  test("no map-array registration language", () => {
    expect(content).not.toMatch(/tasks array/i);
    expect(content).not.toMatch(/Register each ticket/i);
    expect(content).not.toMatch(/entry to the map frontmatter/i);
  });

  test("the honest contract: the tools write the tickets and the graph", () => {
    // The v5 transition tools own every write: tw_add_ticket creates the
    // tickets, tw_write_architecture writes the living architecture. The
    // v4 by-hand contract is retired (the write guard refuses hand edits).
    expect(content).toMatch(/tw_add_ticket/);
    expect(content).toMatch(/tw_write_architecture/);
    expect(content).not.toMatch(/written by hand/i);
    expect(content).not.toMatch(/No tw_\* tool (writes|creates)/i);
  });

  test("queries the graph via the surviving tools", () => {
    expect(content).toContain("tw_dependency_levels <effort-slug>");
    expect(content).toContain("tw_frontier <effort-slug>");
    expectOnlySurvivingTools(content);
  });

  test("one-ticket efforts are fine", () => {
    expect(content).toMatch(/one ticket/i);
  });

  test("every frontmatter template conforms by construction", () => {
    for (const template of templates) assertTemplateConforms(template);
  });

  test("a one-off effort (map with exactly one ticket, empty tasks/) produces zero anomalies", () => {
    const t = mkdtempSync(join(tmpdir(), "okf-one-off-"));
    try {
      writeFm(t, "docs/tasks/one-off/map.md", substituteTemplate(wayfinderMapTemplate()));
      writeFm(t, "docs/tasks/one-off/tickets/the-thing/ticket.md", substituteTemplate(ticketTemplate));
      const anomalies = findAnomalies(fixtureArtifacts(t, [
        "docs/tasks/one-off/map.md",
        "docs/tasks/one-off/tickets/the-thing/ticket.md",
      ]));
      expect(anomalies).toEqual([]);
    } finally {
      rmSync(t, { recursive: true, force: true });
    }
  });
});

// ─── to-tickets v5 (to-tickets-architecture) ─────────────────────

describe("to-tickets v5 (to-tickets-architecture)", () => {
  const content = readFile("skills/engineering/to-tickets/SKILL.md");
  const docsPage = readFile("docs/engineering/to-tickets.md");

  test("to-tickets is user-invoked with the correct frontmatter", () => {
    const fm = parseFrontmatter(content);
    expect(fm["name"]).toBe("to-tickets");
    expect(fm["disable-model-invocation"]).toBe("true");
  });

  test("the skill opens through tw_open and releases the phase through tw_close", () => {
    expect(content).toMatch(/tw_open/);
    expect(content).toMatch(/tw_close to-tickets/);
  });

  test("produces the architecture document plus the ticket graph from a spec", () => {
    expect(content).toMatch(/architecture document/i);
    expect(content).toMatch(/ticket graph/i);
    expect(content).toMatch(/from the spec|from a spec|produced from the spec/i);
  });

  test("the architecture inlines the spec's architecture content in full", () => {
    expect(content).toMatch(/inlines? the spec's architecture content in full/i);
  });

  test("the architecture adds exports, existing abstractions, do-not-reimplement, seams, and per-ticket interface contracts", () => {
    expect(content).toMatch(/per-ticket exports/i);
    expect(content).toMatch(/existing abstractions/i);
    expect(content).toMatch(/do-not-reimplement/i);
    expect(content).toMatch(/seams/i);
    expect(content).toMatch(/interface contracts/i);
  });

  test("the architecture is the living document and the spec's architecture content becomes archival", () => {
    expect(content).toMatch(/living architecture/i);
    expect(content).toMatch(/archival/i);
  });

  test("the writer is tw_write_architecture, the only writer of the architecture document", () => {
    expect(content).toMatch(/tw_write_architecture/);
    expect(content).toMatch(/only writer of the architecture document/i);
  });

  test("a note pointing at the architecture is added to spec.md, and nothing is deleted", () => {
    expect(content).toMatch(/note to `spec\.md` pointing at the architecture/);
    expect(content).toMatch(/nothing is deleted|deletes nothing/i);
  });

  test("a bug-only effort produces tickets with no architecture document", () => {
    expect(content).toMatch(/bug-only/i);
    expect(content).toMatch(/no architecture document/i);
    expect(content).toMatch(/skip the architecture/i);
  });

  test("tickets are created through tw_add_ticket in dependency order: creation-order wiring", () => {
    expect(content).toMatch(/tw_add_ticket/);
    expect(content).toMatch(/validates `blocked_by` at creation/i);
    expect(content).toMatch(/dependency order/i);
    // The retired second wiring pass has no mechanism: the write guard
    // refuses hand edits, so the prose must not teach one.
    expect(content).not.toMatch(/second pass/);
    expect(content).not.toMatch(/editing the frontmatter/i);
  });

  test("splits go through tw_split_ticket, not hand edits", () => {
    expect(content).toMatch(/tw_split_ticket/);
  });

  test("the phase ends with a publish write, so the document is stable for implementation", () => {
    expect(content).toMatch(/publish write \(`publish: true`\)/);
    expect(content).toMatch(/stable/);
  });

  test("the prose does not restate the opener preconditions", () => {
    expect(content).not.toMatch(/ready_for_spec/);
  });

  test("references only surviving tools", () => {
    expectOnlySurvivingTools(content);
    expectOnlySurvivingTools(docsPage);
  });

  test("the docs page describes the architecture output and the tool-written tickets", () => {
    expect(docsPage).toMatch(/tw_write_architecture/);
    expect(docsPage).toMatch(/tw_add_ticket/);
    expect(docsPage).toMatch(/architecture document/i);
    expect(docsPage).toMatch(/no architecture document|bug-only/i);
  });

  test("every frontmatter template conforms by construction", () => {
    const templates = extractFrontmatterTemplates(content);
    expect(templates.length).toBeGreaterThan(0);
    for (const template of templates) assertTemplateConforms(template);
  });
});

// ─── to-spec v5 (to-spec-rescope) ─────────────────────────────────────

describe("to-spec v5 (to-spec-rescope)", () => {
  const content = readFile("skills/engineering/to-spec/SKILL.md");
  const docsPage = readFile("docs/engineering/to-spec.md");

  test("the skill opens through tw_open and releases the phase through tw_close", () => {
    expect(content).toMatch(/tw_open/);
    expect(content).toMatch(/tw_close to-spec/);
  });

  test("no seam or architecture interview remains in the prose", () => {
    // The seam interview is gone: the architecture is to-tickets' output and
    // the spec's architecture content is what planning already settled.
    expect(content).not.toMatch(/seam/i);
    expect(content).not.toMatch(/interview/i);
    expect(content).not.toMatch(/Check with the user/i);
    // The docs page carries the same rescope.
    expect(docsPage).not.toMatch(/seams were confirmed/i);
  });

  test("the spec is written through tw_write_spec, the only writer of the spec", () => {
    expect(content).toMatch(/tw_write_spec/);
    expect(content).toMatch(/only writer of the spec/i);
  });

  test("the spec keeps its full section set", () => {
    for (const section of [
      "## Problem Statement",
      "## Solution",
      "## User Stories",
      "## Implementation Decisions",
      "## Testing Decisions",
      "## Out of Scope",
      "## Further Notes",
    ]) {
      expect(content).toContain(section);
    }
  });

  test("the prose does not restate the opener preconditions or the literal ready_for_spec token", () => {
    expect(content).not.toMatch(/ready_for_spec/);
  });

  test("the spec's architecture content is what planning settled, and the archival note comes from the architecture writer", () => {
    expect(content).toMatch(/what planning already settled|the settled record/i);
    expect(content).toMatch(/to-tickets/);
  });

  test("references only surviving tools", () => {
    expectOnlySurvivingTools(content);
    expectOnlySurvivingTools(docsPage);
  });

  test("every frontmatter template conforms by construction", () => {
    const templates = extractFrontmatterTemplates(content);
    expect(templates.length).toBeGreaterThan(0);
    for (const template of templates) assertTemplateConforms(template);
  });
});

// ─── task-workflow-doctor v4 (overhaul-planning-skills) ──────────────

describe("task-workflow-doctor v4 (overhaul-planning-skills)", () => {
  const content = readFile("skills/engineering/task-workflow-doctor/SKILL.md");
  const resourcePath = "skills/engineering/task-workflow-doctor/resources/okf-conformance-failure.md";

  test("gains the OKF conformance symptom row", () => {
    expect(content).toMatch(/OKF conformance/);
    expect(content).toContain("okf-conformance-failure.md");
  });

  test("the conformance resource routes to the migration and the producers", () => {
    const resource = readFile(resourcePath);
    expect(resource).toContain("/skill:setup-workflow");
    expect(resource).toMatch(/migrate/i);
    expect(resource).toContain("/skill:wayfinder");
    expect(resource).toContain("/skill:to-tickets");
    expect(resource).toContain("/skill:to-spec");
    expect(resource).toContain("/skill:finalize-effort");
    for (const file of ["map.md", "task.md", "ticket.md", "spec.md"]) {
      expect(resource).toContain(file);
    }
  });

  test("the conformance resource detects a pre-v4 tree, anomalies, and frontmatter gaps", () => {
    const resource = readFile(resourcePath);
    expect(resource).toMatch(/schema_version/);
    expect(resource).toContain("tw_frontier");
    expect(resource).toMatch(/Anomalies/);
    expect(resource).toMatch(/index\.md/);
    expect(resource).toMatch(/log\.md/);
  });

  test("doctor prose references only surviving tools", () => {
    for (const text of [content, readFile(resourcePath)]) expectOnlySurvivingTools(text);
  });

  test("missing-tasks-tree resource describes the v4 tree shape", () => {
    const resource = readFile("skills/engineering/task-workflow-doctor/resources/missing-tasks-tree.md");
    expect(resource).toMatch(/map\.md/);
    expect(resource).toMatch(/tasks\//);
    expect(resource).toMatch(/tickets\//);
    expect(resource).toMatch(/state\.yaml/);
    expect(resource).toMatch(/index\.md/);
    // The maps/ subtree is gone from the target layout.
    expect(resource).not.toMatch(/maps\//);
  });
});

// ─── task-workflow-overview v4 (overhaul-planning-skills) ────────────

describe("task-workflow-overview v4 (overhaul-planning-skills)", () => {
  const content = readFile("skills/engineering/task-workflow-overview/SKILL.md");

  test("describes the effort-grouped OKF bundle", () => {
    expect(content).toMatch(/OKF bundle/i);
    expect(content).toMatch(/map\.md/);
    expect(content).toMatch(/spec\.md/);
    expect(content).toMatch(/tasks\//);
    expect(content).toMatch(/tickets\//);
    expect(content).toMatch(/decision tasks/i);
    expect(content).toMatch(/implementation tickets/i);
  });

  test("carries the wayfinder to to-spec to to-tickets handoff", () => {
    expect(content).toContain("/skill:wayfinder");
    expect(content).toContain("/skill:to-spec");
    expect(content).toContain("/skill:to-tickets");
  });

  test("the tw_slices row is gone; effort-level queries use the graph tools", () => {
    expect(content).not.toContain("tw_slices");
    expect(content).toContain("tw_dependency_levels");
    expect(content).toContain("tw_frontier");
  });

  test("tw_list lists efforts, tasks, and tickets", () => {
    expect(content).toMatch(/List efforts \/ tasks \/ tickets/);
  });

  test("actions include the doctor row", () => {
    expect(content).toMatch(/Diagnose a broken workflow/i);
    expect(content).toContain("/skill:task-workflow-doctor");
  });

  test("references only surviving tools", () => {
    expectOnlySurvivingTools(content);
  });
});

// ─── Structure facts: registration + full template conformance ───────

describe("planning skills structure facts (overhaul-planning-skills)", () => {
  const FIVE_SKILLS = [
    "skills/engineering/wayfinder/SKILL.md",
    "skills/engineering/to-spec/SKILL.md",
    "skills/engineering/to-tickets/SKILL.md",
    "skills/engineering/task-workflow-doctor/SKILL.md",
    "skills/engineering/task-workflow-overview/SKILL.md",
  ];

  test("the five planning skills are registered in package.json", () => {
    const pkg = JSON.parse(readFile("package.json"));
    for (const dir of ["wayfinder", "to-spec", "to-tickets", "task-workflow-doctor", "task-workflow-overview"]) {
      expect(pkg.pi.skills).toContain(`./skills/engineering/${dir}`);
    }
  });

  test("every frontmatter template across the five skills' prose conforms, no killed keys", () => {
    const files = [
      ...FIVE_SKILLS,
      "skills/engineering/wayfinder/resources/research.md",
      "skills/engineering/wayfinder/resources/prototype.md",
      "skills/engineering/wayfinder/resources/grilling.md",
      "skills/engineering/wayfinder/resources/manual.md",
    ];
    let templateCount = 0;
    for (const file of files) {
      for (const template of extractFrontmatterTemplates(readFile(file))) {
        templateCount++;
        const keys = frontmatterKeys(template);
        for (const killed of KILLED_KEYS) {
          expect(keys, `${file} carries the killed key '${killed}'`).not.toContain(killed);
        }
        assertTemplateConforms(template);
      }
    }
    // The three producers still carry their templates; the doctor and the
    // router produce no artifacts and carry none.
    expect(templateCount).toBeGreaterThanOrEqual(6);
  });
});

describe("mode: human refusal (overhaul-execution-skills)", () => {
  test("the phase hard-refuses autonomous dispatch for a mode: human ticket", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(content).toMatch(/mode: human/);
    expect(content).toMatch(/hard-refuses autonomous dispatch/i);
    // It never dispatches chains for a marked ticket, and it does not fall
    // through to the subtype resource's autonomous pipeline.
    expect(content).toMatch(/never launches subagent chains|never dispatches chains/i);
    expect(content).toMatch(/does not fall through/i);
    // The handoff names the skill invocation for the human to run.
    expect(content).toContain("/skill:implement-ticket <slug>");
    // The refusal is a router rule: it fires before any resource is selected.
    expect(content).toMatch(/before any resource is selected/);
  });

  test.each(["feature", "bug"])("the %s router repeats the refusal rule", (kind) => {
    const content = readFile(`skills/engineering/implement-ticket/resources/${kind}.md`);
    expect(content).toMatch(/mode: human/);
    expect(content).toMatch(/hard-refus|refuse/i);
    expect(content).toContain("/skill:implement-ticket");
  });
});

// ─── Per-ticket chains v4 (overhaul-execution-skills) ────────────────

describe("feature chain v4 (overhaul-execution-skills)", () => {
  const content = readFile("skills/engineering/implement-ticket/resources/feature/autonomous.md");

  test("step 0 reads the ticket (subtype, mode, size) and works the effort frontier", () => {
    expect(content).toContain("tw_frontier <effort-slug>");
    expect(content).toMatch(/docs\/tasks\/<effort>\/tickets\/<ticket-slug>\/ticket\.md/);
    expect(content).toMatch(/subtype, mode, size/i);
  });

  test("the architecture document lives at the effort root and is read, never drafted", () => {
    // v5: the architecture is to-tickets' output; the opener gates on it
    // (stable, architecture.md; the legacy arch-spec.md is tolerated input)
    // and implementation only reads it.
    expect(content).toMatch(/docs\/tasks\/<effort>\/architecture\.md/);
    expect(content).toMatch(/the legacy\n`arch-spec\.md` is a tolerated input/i);
    expect(content).toMatch(/`to-tickets`' output/i);
    expect(content).toMatch(/never a draft step here|never drafted here/i);
    expect(content).toMatch(/the opener has checked/i);
  });

  test("budgets key off the ticket's size with the m default, expressed as timeoutMs", () => {
    expect(content).toMatch(/\|\|\s*"m"/);
    expect(content).toMatch(/s:\s*15/);
    expect(content).toMatch(/m:\s*30/);
    expect(content).toMatch(/l:\s*45/);
    expect(content).toMatch(/xl:\s*60/);
    expect(content).toMatch(/\+50 percent|by 50 percent/i);
    // The retired chain API's turnBudget has no current equivalent; the
    // timeout is the honest lever.
    expect(content).not.toMatch(/turnBudget/);
    expect(content).toMatch(/timeoutMs/);
  });

  test("chains run per ticket per dependency level; the level boundary serializes", () => {
    expect(content).toContain("tw_dependency_levels <effort-slug>");
    // Tickets within one level may run concurrently; across levels the
    // boundary serializes (strict barriers).
    expect(content).toMatch(/may run \*\*concurrently\*\*/i);
    expect(content).toMatch(/strict barriers/i);
    expect(content).toMatch(/level N\+1 starts only after every ticket in level N has landed/i);
  });

  test("the chain dispatches tdd, then verify plus deviation gated, then land", () => {
    expect(content).toContain("tdd-worker");
    expect(content).toContain("slice-verifier");
    expect(content).toContain("deviation-reporter");
    expect(content).toContain("land-worker");
    // The chain ships as a pre-canned workflow script; the step order,
    // ok-gates, and keyed calls live there and are pinned by the
    // chain call shapes tests below.
    expect(content).toMatch(/scripts\/ticket-chain\.js/);
    expect(content).toMatch(/ok-gate|ok gate/i);
  });

  test("the chain never marks the ticket done; the inlined close-out owns the marking", () => {
    // The dispatch loop, before the close-out section: no chain step sets the
    // field, the marking has one owner (the close-out).
    const beforeCloseout = content.split("## Step 2b -- The inlined per-ticket close-out")[0];
    expect(beforeCloseout).not.toMatch(/tw_mark_done|tw_set[^)]*workflow_state/);
    expect(beforeCloseout).not.toMatch(/workflow_state.{0,20}done/);
    // The close-out itself marks done (the one-owner rule) and the report
    // hands the effort close to finalize-effort.
    expect(content).toMatch(/tw_mark_done/);
    expect(content).toMatch(/one-owner rule holds|one owner/i);
  });

  test("dispatch points the state file at the ticket", () => {
    expect(content).toContain("tw_state_set task <ticket-slug>");
  });

  test("the end-of-effort wrap-up is a shipped workflow, not parent work", () => {
    expect(content).toMatch(/scripts\/end-of-effort\.js/);
    expect(content).toMatch(/spec-reconciler/);
    expect(content).toMatch(/coherence-refactorer/);
    expect(content).toMatch(/test-runner/);
    // The parent never refactors, never edits the spec, never runs the suite.
    expect(content).not.toMatch(/done directly by you/i);
    expect(content).toMatch(/never\s+refactors/);
  });

  test("uncertainty lives in the ticket directory", () => {
    expect(content).toMatch(/docs\/tasks\/<effort>\/tickets\/<ticket-slug>\/\.work\/uncertainty\.md/);
  });

  test("the uncertainty resolution goes through the scoped tool", () => {
    expect(content).toMatch(/tw_resolve_uncertainty/);
  });

  test("no slice machinery, no ui-noter, no guidelines tool remains", () => {
    expect(content).not.toContain("tw_slices");
    expect(content).not.toMatch(/slices\//);
    expect(content).not.toContain("get_guidelines");
    expect(content).not.toMatch(/ui-noter/);
    expect(content).not.toMatch(/impeccable/i);
  });

  test("references only surviving tools", () => {
    expectOnlySurvivingTools(content);
  });
});

describe("bug chain v4 (overhaul-execution-skills)", () => {
  const content = readFile("skills/engineering/implement-ticket/resources/bug/autonomous.md");

  test("the lean per-ticket chain: tdd, verify, land, gated; no deviation-reporter", () => {
    expect(content).toContain("tdd-worker");
    expect(content).toContain("slice-verifier");
    expect(content).toContain("land-worker");
    expect(content).not.toContain("deviation-reporter");
    expect(content).toMatch(/scripts\/ticket-chain\.js/);
  });

  test("the bug doc and reproduction are referenced from the ticket body", () => {
    expect(content).toMatch(/ticket body/);
    expect(content).toMatch(/docs\/bugs/);
    // The bug frontmatter field is dead: no tool reads it, no prose reads it.
    expect(content).not.toMatch(/tw_get\([^)]*,\s*"bug"\)/);
    expect(content).not.toMatch(/bug: <slug>/);
  });

  test("budgets key off the ticket's size with the m default", () => {
    expect(content).toMatch(/\|\|\s*"m"/);
    expect(content).toMatch(/s:\s*15/);
    expect(content).toMatch(/m:\s*30/);
    expect(content).toMatch(/l:\s*45/);
    expect(content).toMatch(/xl:\s*60/);
    expect(content).not.toMatch(/turnBudget/);
  });

  test("keeps the red-first regression rule and the diagnosing-bugs discipline", () => {
    // The rule lives in the diagnosing-bugs skill; the script only routes the
    // discipline via the skill field and never restates it.
    const diagnosing = readFile("skills/engineering/diagnosing-bugs/SKILL.md");
    expect(diagnosing).toMatch(/regression test .{0,40}before the fix/i);
    const chain = readFile("skills/engineering/implement-ticket/scripts/ticket-chain.js");
    expect(chain).toMatch(/skill: subtype === "bug" \? "diagnosing-bugs" : "tdd"/);
    expect(chain).not.toMatch(/regression test/i);
  });

  test("no slice machinery, no ui-noter, no guidelines tool remains", () => {
    expect(content).not.toContain("tw_slices");
    expect(content).not.toMatch(/slices\//);
    expect(content).not.toMatch(/ui-noter/);
    expect(content).not.toContain("get_guidelines");
    expectOnlySurvivingTools(content);
  });
});

describe("chain call shapes (shipped ticket-chain.js)", () => {
  const resources = [
    "skills/engineering/implement-ticket/resources/feature/autonomous.md",
    "skills/engineering/implement-ticket/resources/bug/autonomous.md",
  ];
  const chain = readFile("skills/engineering/implement-ticket/scripts/ticket-chain.js");

  test.each(resources)("%s launches the shipped chain script, no retired chain API", (file) => {
    const content = readFile(file);
    // The chain is real code now, not inline pseudocode: the resources must
    // launch the shipped script with args instead of composing the chain.
    expect(content).toMatch(/scripts\/ticket-chain\.js/);
    expect(content).toMatch(/async: true/);
    expect(content).toMatch(/args:/);
    expect(content).not.toMatch(/workflowScript/);  // retired field name
    expect(content).not.toMatch(/\bas:\s*"/);      // retired chain-API labels
    expect(content).not.toMatch(/\{outputs\./);     // retired interpolation
    expect(content).not.toMatch(/\(runs\)\s*=>/);   // retired function-wrapper form
    expect(content).toMatch(/implement-preconditions/);
  });

  test("the chain gates preconditions before any worker launches", () => {
    expect(chain).toMatch(/await runs\.run\("gate"/);
    expect(chain).toMatch(/agent: "implement-preconditions"/);
    expect(chain).toMatch(/failed: "gate"/);
    // The gate step precedes the tdd step in the script.
    expect(chain.indexOf('runs.run("gate"')).toBeLessThan(chain.indexOf('runs.run("tdd"'));
  });

  test("refusals are enforced, not trusted: verdicts fail closed and deliverables are host-gated", () => {
    // A child ending its turn with a refusal is a successful run completion,
    // so ok alone can never express refusal (found by probe: the gate child
    // refused a nonexistent ticket and the chain landed it anyway).
    expect(chain).toMatch(/function verdict\(receipt, marker\)/);
    expect(chain).toMatch(/verdict\(gate, "VERDICT: PASS"\)/);
    // Host-run gates verify the deliverables model-independently.
    expect(chain).toMatch(/gate: "test -f " \+ args\.ticketPath/);
    expect(chain).toMatch(/test ! -f " \+ args\.ticketPath\.replace/);
    expect(chain).toMatch(/git rev-parse --verify refs\/heads\/ticket\//);
    expect(chain).toMatch(/git rev-parse --verify refs\/heads\/task\//);
    expect(chain).toMatch(/deviation-reports\/" \+ args\.ticket/);
  });

  test("re-runs pass pointers, never authored instructions", () => {
    // extra is a labeled context-pointer slot, and the resources only ever
    // fill it with paths: the recorded resolution, prior-attempt outputs.
    expect(chain).toMatch(/Additional context, read before starting: /);
    for (const file of resources) {
      const content = readFile(file);
      expect(content).toMatch(/args\.extra/);
      expect(content).not.toMatch(/diagnosis\/fix instructions/);
    }
    // The uncertainty resolution is recorded in the ticket's .work/ and
    // passed as a pointer.
    expect(readFile(resources[0])).toMatch(/\.work\/resolution\.md/);
  });

  test("the chain script uses keyed awaited runs.run, no retired chain API", () => {
    expect(chain).toMatch(/await runs\.run\("tdd"/);
    expect(chain).toMatch(/await runs\.run\("verify"/);
    expect(chain).toMatch(/await runs\.run\("land"/);
    expect(chain).not.toMatch(/\bas:\s*"/);
    expect(chain).not.toMatch(/\{outputs\./);
    expect(chain).not.toMatch(/\(runs\)\s*=>/);
  });

  test("the feature chain fans out with runs.all; the bug chain stays sequential", () => {
    // One script, two shapes: the fan-out sits inside the feature branch,
    // the bug branch verifies through a plain awaited runs.run.
    const [beforeElse, afterElse] = chain.split("} else {");
    expect(chain).toMatch(/subtype === "bug"/);
    expect(beforeElse).toMatch(/runs\.all\(/);
    expect(afterElse).not.toMatch(/runs\.all/);
  });

  test("the chain gates landing and reports failures structurally", () => {
    expect(chain).toMatch(/if \(!pair\[0\]\.ok\)/);
    expect(chain).toMatch(/if \(!pair\[1\]\.ok\)/);
    expect(chain).toMatch(/if \(!verify\.ok\)/);
    expect(chain).toMatch(/failed: "args"/);
    expect(chain).toMatch(/landed: true/);
  });
});

describe("end-of-effort agents", () => {
  test("coherence-refactorer fixes the listed inconsistencies and stops at boundaries", () => {
    const content = readFile("agents/coherence-refactorer.md");
    const fm = parseFrontmatter(content);
    expect(String(fm.tools)).toBe("read, write, edit, bash, submit_feedback");
    expect(content).toMatch(/listed inconsistencies/i);
    expect(content).toMatch(/Do NOT change API surfaces/i);
    expect(content).toMatch(/REFACTORED/);
    expect(content).toMatch(/STOPPED/);
    expect(content).toMatch(/refactor\(coherence\)/);
  });

  test("test-runner runs the docs/testing.md protocol and never fixes", () => {
    const content = readFile("agents/test-runner.md");
    const fm = parseFrontmatter(content);
    expect(String(fm.tools)).toBe("read, bash, submit_feedback");
    expect(content).toMatch(/run these always/i);
    expect(content).toMatch(/run if asked/i);
    expect(content).toMatch(/SUITE: GREEN/);
    expect(content).toMatch(/SUITE: RED/);
    expect(content).toMatch(/never invent or guess/i);
    expect(content).toMatch(/never edit/i);
  });

  test("spec-reconciler edits exactly one file: the architecture document", () => {
    const content = readFile("agents/spec-reconciler.md");
    const fm = parseFrontmatter(content);
    expect(String(fm.tools)).toBe("read, edit, submit_feedback");
    expect(content).toMatch(/architecture\.md/);
    expect(content).toMatch(/exactly one file/i);
    expect(content).toMatch(/Pending update/i);
    expect(content).toMatch(/Final reconcile/i);
    expect(content).toMatch(/RECONCILED/);
    expect(content).toMatch(/FLAGGED/);
  });
});

describe("end-of-effort workflow (shipped end-of-effort.js)", () => {
  const script = readFile("skills/engineering/implement-ticket/scripts/end-of-effort.js");

  test("runs review, spec, coherence, and the suite gate with keyed awaited runs.run", () => {
    expect(script).toMatch(/await runs\.run\("review"/);
    expect(script).toMatch(/await runs\.run\("spec"/);
    expect(script).toMatch(/await runs\.run\("coherence"/);
    expect(script).toMatch(/await runs\.run\("suite"/);
  });

  test("steps are toggleable or input-driven; the suite gate runs last", () => {
    expect(script).toMatch(/args\.review !== false/);
    expect(script).toMatch(/args\.reconcile !== false/);
    expect(script).toMatch(/inconsistencies\.length > 0/);
    expect(script.indexOf('runs.run("suite"')).toBeGreaterThan(script.indexOf('runs.run("coherence"'));
  });

  test("optional tests pass to the test-runner task as numbers", () => {
    expect(script).toMatch(/optionalTests/);
    expect(script).toMatch(/Run if asked/);
  });

  test("the review stays advisory: a failed reviewer never fails the workflow", () => {
    expect(script).toMatch(/reviewOk = review\.ok/);
    expect(script).not.toMatch(/failed: "review"/);
  });

  test("the suite gate and its siblings gate on verdicts, not run completion", () => {
    expect(script).toMatch(/verdict\(spec, "RECONCILED"\)/);
    expect(script).toMatch(/verdict\(coherence, "REFACTORED"\)/);
    expect(script).toMatch(/verdict\(suite, "SUITE: GREEN"\)/);
  });

  test("docs/testing.md carries the test protocol the test-runner reads", () => {
    const content = readFile("docs/testing.md");
    expect(content).toMatch(/## Test protocol/);
    expect(content).toMatch(/Run these always/);
    expect(content).toMatch(/Run if asked/);
  });
});

describe("chain agents v4 (overhaul-execution-skills)", () => {
  test("tdd-worker implements one ticket on a ticket/<slug> working branch", () => {
    const content = readFile("agents/tdd-worker.md");
    expect(content).toMatch(/ticket\/<slug>/);
    expect(content).not.toMatch(/slice\//);
    expect(content).toMatch(/docs\/tasks\/<effort>\/architecture\.md/);
    expect(content).toMatch(/ticket doc/i);
    expect(content).toMatch(/tickets\/<ticket-slug>\/\.work\/uncertainty\.md/);
  });

  test("slice-verifier verifies the ticket from its test plan or the architecture seams", () => {
    const content = readFile("agents/slice-verifier.md");
    expect(content).toMatch(/ticket doc/i);
    expect(content).toMatch(/architecture document's seams|test plan/i);
    expect(content).not.toMatch(/slice doc/i);
  });

  test("land-worker merges the working branch into the landing branch, no archive duty", () => {
    const content = readFile("agents/land-worker.md");
    expect(content).toMatch(/ticket\/<ticket-slug>|ticket\/<slug>/);
    expect(content).toMatch(/task\/<ticket-slug>|task\/<slug>/);
    expect(content).not.toMatch(/slices\/archive|archive the slice/i);
    expect(content).not.toMatch(/state\.yaml/);
    expect(content).toMatch(/finalize/i);
  });

  test("implement-preconditions gates the chain read-only before any worker", () => {
    const content = readFile("agents/implement-preconditions.md");
    const fm = parseFrontmatter(content);
    // Strict read-only ceiling: file reads plus workflow telemetry only.
    expect(String(fm.tools)).toBe("read, submit_feedback");
    expect(content).toMatch(/read-only/i);
    expect(content).toMatch(/VERDICT: PASS/);
    expect(content).toMatch(/VERDICT: REFUSE/);
    expect(content).toMatch(/fails closed/i);
    expect(content).toMatch(/type: ticket/);
    expect(content).toMatch(/mode: human/);
    expect(content).toMatch(/subtype/);
    expect(content).toMatch(/bug\s+doc\s+path and the reproduction\s+path/i);
    // The refusal is the gate's job; submit_feedback is for workflow
    // friction, not the refusal itself.
    expect(content).toMatch(/not.*for the refusal itself|NOT use it for the refusal itself/i);
  });

  test("deviation-reporter writes frontmattered reports to the ticket directory", () => {
    const content = readFile("agents/deviation-reporter.md");
    expect(content).toMatch(/deviation-reports/);
    expect(content).toMatch(/task\/<ticket-slug>\.\.ticket\/<ticket-slug>/);
    const templates = extractFrontmatterTemplates(content);
    const report = templates.find((t) => /^type: deviation report$/m.test(t));
    expect(report).toBeDefined();
    const keys = frontmatterKeys(report!);
    expect(keys).toContain("type");
    expect(keys).toContain("title");
    expect(keys).toContain("status");
    for (const killed of KILLED_KEYS) expect(keys).not.toContain(killed);
    assertTemplateConforms(report!);
  });
});

describe("failure splits v4 (overhaul-execution-skills)", () => {
  const feature = readFile("skills/engineering/implement-ticket/resources/feature/autonomous.md");
  const bug = readFile("skills/engineering/implement-ticket/resources/bug/autonomous.md");

  test.each([[feature, "feature"], [bug, "bug"]] as const)(
    "the %s toolbelt splits into sub-tickets registered in the effort",
    (content, kind) => {
      expect(content).toMatch(/sub-tickets registered in the effort/i);
      expect(content).toMatch(/docs\/tasks\/<effort>\/tickets\/<sub-ticket-slug>\/ticket\.md/);
      // No ad-hoc slice docs: the split never writes a slices/ file or a
      // split status mark.
      expect(content).not.toMatch(/slices\/\d|status: split/);
    },
  );

  test("the split protocol specifies the sub-ticket frontmatter and wiring", () => {
    expect(feature).toMatch(/inherited subtype|inherits the original's subtype/i);
    expect(feature).toMatch(/size from the diagnosis/i);
    expect(feature).toMatch(/blocked_by[^.]*inherit|inherit[^.]*blocked_by/i);
    expect(feature).toMatch(/chain(s|ing)? between the subs|chained between the subs/i);
  });

  test("the superseded original leaves the graph as deprecated plus done", () => {
    expect(feature).toMatch(/status: deprecated/);
    expect(feature).toMatch(/workflow_state: done/);
    expect(feature).toMatch(/note naming its sub-tickets/i);
  });
});

// ─── Standards direct reads (overhaul-execution-skills) ─────────────

const STANDARDS_FILES = ["AGENTS.md", "CONTEXT.md", "docs/standards.md", "docs/testing.md"];

describe("standards direct reads (overhaul-execution-skills)", () => {
  test("the code-review skill reads standards files directly, no guidelines tool", () => {
    const content = readFile("skills/engineering/code-review/SKILL.md");
    expect(content).not.toContain("get_guidelines");
    for (const file of STANDARDS_FILES) expect(content).toContain(file);
    // The smell baseline stays, named for the sub-agent prompt.
    expect(content).toMatch(/smells\.md/);
  });

  test("the code-review spec sources go v5", () => {
    const content = readFile("skills/engineering/code-review/SKILL.md");
    expect(content).toMatch(/docs\/tasks\/<effort>\/tickets\/<ticket-slug>\/ticket\.md/);
    expect(content).toMatch(/docs\/tasks\/<effort>\/architecture\.md/);
    expect(content).toMatch(/bug doc/i);
    // The old per-task paths are gone.
    expect(content).not.toMatch(/docs\/tasks\/\$\{taskSlug\}|docs\/tasks\/<taskSlug>/);
  });

  test("the code-reviewer agent drops the guidelines tool and reads files directly", () => {
    const content = readFile("agents/code-reviewer.md");
    const fm = parseFrontmatter(content);
    expect(String(fm.tools)).not.toContain("get_guidelines");
    expect(content).not.toContain("get_guidelines");
    for (const file of STANDARDS_FILES) expect(content).toContain(file);
    // The standards reviewer's inner allowlist drops the tool too.
    expect(content).not.toMatch(/tools:\s*read,\s*bash,\s*get_guidelines/);
  });

  test("the tdd-worker reads standards files directly", () => {
    const content = readFile("agents/tdd-worker.md");
    const fm = parseFrontmatter(content);
    expect(String(fm.tools)).not.toContain("get_guidelines");
    expect(content).not.toContain("get_guidelines");
    for (const file of STANDARDS_FILES) expect(content).toContain(file);
  });

  test("the chain tasks carry pointers, not procedure", () => {
    // Procedure lives in the agent definitions and skills (pinned by the
    // agent tests); the composed tasks carry identity, pointers, and the
    // tdd uncertainty anchor only.
    const chain = readFile("skills/engineering/implement-ticket/scripts/ticket-chain.js");
    expect(chain).toMatch(/Ticket doc: /);
    expect(chain).toMatch(/Architecture: docs\/tasks\//);
    expect(chain).toMatch(/uncertainty\.md and stop/);
    expect(chain).not.toMatch(/Before writing code/);
    expect(chain).not.toMatch(/Commit after each GREEN/);
    expect(chain).not.toMatch(/standards files/i);
    expect(chain).not.toMatch(/Run lint and tests/);
    expect(chain).not.toContain("get_guidelines");
    for (const kind of ["feature", "bug"]) {
      const content = readFile(`skills/engineering/implement-ticket/resources/${kind}/autonomous.md`);
      expect(content).not.toContain("get_guidelines");
    }
  });
});

// ─── Planning-type resources v4 touch (overhaul-execution-skills) ────

describe("planning resources v4 touch (overhaul-execution-skills)", () => {
  test.each(["research", "prototype", "grilling", "manual"])(
    "%s marks the task done via the named done tool after the map write-back",
    (subtype) => {
      const content = readFile(`skills/engineering/wayfinder/resources/${subtype}.md`);
      expect(content).toMatch(/tw_write_section/);
      expect(content).toMatch(/tw_mark_done\b/);
      expect(content).not.toContain("tw_set");
      expectOnlySurvivingTools(content);
    },
  );

  test("research captures findings in the task directory with frontmatter", () => {
    const content = readFile("skills/engineering/wayfinder/resources/research.md");
    expect(content).toMatch(/docs\/tasks\/<effort>\/tasks\/<task-slug>\/findings\.md/);
    const templates = extractFrontmatterTemplates(content);
    const findings = templates.find((t) => /^type: findings$/m.test(t));
    expect(findings).toBeDefined();
    const keys = frontmatterKeys(findings!);
    expect(keys).toContain("type");
    expect(keys).toContain("title");
    expect(keys).toContain("status");
    for (const killed of KILLED_KEYS) expect(keys).not.toContain(killed);
    assertTemplateConforms(findings!);
  });
});

// ─── The inlined per-ticket close-out (implement-ticket-skill) ───────

// The retired finalize-task's per-ticket close-out runs inline in
// implement-ticket, in the same autonomous run that lands the ticket. The
// close-out tests above pin the SKILL.md sequence; these pin the resources'
// close-out sections and the one-owner rule across the surface.
describe("the inlined per-ticket close-out (implement-ticket-skill)", () => {
  for (const kind of ["feature", "bug"]) {
    const content = readFile(`skills/engineering/implement-ticket/resources/${kind}/autonomous.md`);

    test(`the ${kind} close-out marks done through tw_mark_done and verifies with tw_finalizable`, () => {
      expect(content).not.toContain("tw_set");
      expect(content).toMatch(/tw_mark_done/);
      expect(content).toMatch(/one owner/i);
      expect(content).toContain("tw_finalizable <ticket-slug>");
      expect(content).toMatch(/anomal/i);
    });

    test(`the ${kind} close-out clears the task pointer; the slice pointer is not called`, () => {
      expect(content).toMatch(/tw_state_set task null/);
      expect(content).not.toMatch(/tw_state_set slice/);
    });

    test(`the ${kind} close-out writes the changelog through the only writer`, () => {
      expect(content).toMatch(/tw_write_changelog/);
      expect(content).toMatch(/writer of `docs\/tasks\/CHANGELOG\.md`/);
    });

    test(`the ${kind} close-out gates on the CI check and never merges a red branch`, () => {
      expect(content).toMatch(/CI gate/i);
      expect(content).toMatch(/red branch/i);
    });

    test(`the ${kind} close-out merges the landing branch into main with --no-ff`, () => {
      expect(content).toMatch(/git merge --no-ff task\/<ticket-slug>/);
    });
  }

  test("the bug close-out closes and archives the bug doc; the feature one skips it", () => {
    const feature = readFile("skills/engineering/implement-ticket/resources/feature/autonomous.md");
    const bug = readFile("skills/engineering/implement-ticket/resources/bug/autonomous.md");
    expect(feature).toMatch(/subtype: bug only/i);
    expect(bug).toContain("docs/bugs/archive");
    expect(bug).toContain("status: fixed");
    expect(bug).toContain("fix_commit");
    expect(bug).toMatch(/ask the user which bug doc/i);
    expect(bug).toMatch(/ticket body/i);
    expect(bug).not.toContain("bug: <slug>");
  });

  test("only this phase sets a ticket's workflow_state: done (the one-owner rule)", () => {
    const skill = readFile("skills/engineering/implement-ticket/SKILL.md");
    const feature = readFile("skills/engineering/implement-ticket/resources/feature/autonomous.md");
    const bug = readFile("skills/engineering/implement-ticket/resources/bug/autonomous.md");
    for (const text of [skill, feature, bug]) {
      expect(text).toMatch(/one owner|only owner|the one owner of the marking/i);
    }
    // The chain never marks it.
    const chain = readFile("skills/engineering/implement-ticket/scripts/ticket-chain.js");
    expect(chain).toMatch(/is NOT marked done/);
  });
});

// ─── Human-facing docs pages (backfill-skill-docs-pages) ────────────

// The four H2 sections every finished page carries, in order (the AGENTS.md
// docs-page mandate). The two pre-existing pages (eval-review, handoff)
// already conform; the seam pins the whole promoted set.
const DOC_PAGE_SECTIONS = [
  "## What it does",
  "## When to reach for it",
  "## Common questions",
  "## It's working if",
];

/** "./skills/<bucket>/<name>" -> { bucket, name }; pi.skills is the promoted-set single source of truth. */
function promotedSkill(entry: string): { bucket: string; name: string } {
  const parts = entry.split("/");
  return { bucket: parts[2], name: parts[3] };
}

describe("human-facing docs pages (backfill-skill-docs-pages)", () => {
  const pkg = JSON.parse(readFile("package.json"));
  const promoted = (pkg.pi.skills as string[]).map(promotedSkill);

  test("every promoted skill has a docs page", () => {
    const missing: string[] = [];
    for (const { bucket, name } of promoted) {
      const rel = join("docs", bucket, `${name}.md`);
      if (!existsSync(join(PROJECT, rel))) missing.push(rel);
    }
    expect(missing).toEqual([]);
  });

  test("every docs page carries the four sections in order", () => {
    for (const { bucket, name } of promoted) {
      const content = readFile(join("docs", bucket, `${name}.md`));
      const positions = DOC_PAGE_SECTIONS.map((s) => content.indexOf(s));
      expect(
        positions.every((p) => p >= 0),
        `docs/${bucket}/${name}.md is missing one of: ${DOC_PAGE_SECTIONS.join(", ")}`,
      ).toBe(true);
      expect(positions, `docs/${bucket}/${name}.md sections out of order`).toEqual(
        [...positions].sort((a, b) => a - b),
      );
    }
  });

  test("non-promoted buckets have no docs pages", () => {
    // The docs tree mirrors only the two promoted buckets; misc/,
    // in-progress/, and deprecated/ skills get no page.
    for (const bucket of ["misc", "in-progress", "deprecated"]) {
      const dir = join(PROJECT, "skills", bucket);
      if (!existsSync(dir)) continue;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const mirrored = join(PROJECT, "docs", bucket, `${entry.name}.md`);
        expect(
          existsSync(mirrored),
          `docs page exists for non-promoted skill ${bucket}/${entry.name}`,
        ).toBe(false);
      }
    }
  });

  test("every tw_* tool named in a docs page is a surviving tool", () => {
    for (const { bucket, name } of promoted) {
      expectOnlySurvivingTools(readFile(join("docs", bucket, `${name}.md`)));
    }
  });

  test("the flow pages describe the effort-grouped tree", () => {
    // The effort-grouped path is what distinguishes v4 prose from the v3
    // maps/ subtree: each flow page must name the effort directory shape.
    const flowPages = [
      "wayfinder",
      "to-spec",
      "to-tickets",
      "task-workflow-overview",
      "task-workflow-doctor",
      "implement-ticket",
      "intake",
    ];
    for (const name of flowPages) {
      const content = readFile(join("docs", "engineering", `${name}.md`));
      expect(content, `docs/engineering/${name}.md`).toMatch(/docs\/tasks\/<effort>\//);
    }
  });
});

// ─── overview-doctor-rescope (enforced workflow v5) ──────────────────

// Arch spec entry 19: the overview is the layered explainer with a `tw_next`
// fast track, and the doctor is narrowed to what the tools cannot
// self-diagnose (a legacy tree, missing scaffolding, a failed migration,
// opener-refusal routing). Both stay model-invoked.

// The user-reachable v5 surface: the seven names the ticket pins. The
// overview is the router, so a missing name is a router that lies.
const USER_REACHABLE_V5 = [
  "intake",
  "wayfinder",
  "to-spec",
  "to-tickets",
  "implement-ticket",
  "finalize-effort",
  "setup-workflow",
];

describe("task-workflow-overview v5 (overview-doctor-rescope)", () => {
  const content = readFile("skills/engineering/task-workflow-overview/SKILL.md");
  const page = readFile("docs/engineering/task-workflow-overview.md");

  test("names every user-reachable v5 skill by its invocation", () => {
    for (const name of USER_REACHABLE_V5) {
      expect(content, name).toContain(`/skill:${name}`);
    }
    // The retired routers never reappear in the map.
    for (const retired of ["triage", "implement-task", "finalize-task"]) {
      expect(content).not.toContain(`/skill:${retired}`);
    }
  });

  test("the fast track is the first layer and points at tw_next for the live answer", () => {
    // The fast track answers "what do I run now?" with the live tool, not a
    // restatement of the flow.
    const fastTrack = content.match(/fast track[\s\S]*?(?=\n## )/i)?.[0] ?? "";
    expect(fastTrack).toMatch(/tw_next/);
    expect(fastTrack).toMatch(/live answer/i);
    // It is the first layer, above the story.
    expect(content.indexOf("tw_next")).toBeLessThan(content.indexOf("## The short version"));
  });

  test("the explainer stays layered and progressively disclosed", () => {
    // Layer 1: the fast track. Layer 2: the short story, a stop-anywhere
    // paragraph. Layer 3: the main flow. Deeper still: the linked
    // phase-boundaries reference, never inlined.
    const fast = content.search(/fast track/i);
    const short = content.indexOf("## The short version");
    const main = content.indexOf("## The main flow");
    const deeper = content.indexOf("PHASE-BOUNDARIES.md");
    expect(fast).toBeGreaterThan(-1);
    expect(short).toBeGreaterThan(fast);
    expect(main).toBeGreaterThan(short);
    expect(deeper).toBeGreaterThan(main);
    // The short version is a stopping point, not the whole main flow again.
    expect(main - short).toBeLessThan(1200);
    // The deepest layer stays in the resource: the five context-management
    // options are not restated here.
    expect(content).not.toMatch(/### The five options/i);
    expect(content).toMatch(/resources\/report\.md/);
  });

  test("the docs page carries the same fast track and names the v5 surface", () => {
    expect(page).toContain("tw_next");
    for (const name of USER_REACHABLE_V5) {
      expect(page, name).toContain(`/skill:${name}`);
    }
    // The retired bug substrate is not part of the live surface.
    expect(page).not.toMatch(/docs\/bugs/);
  });
});

describe("task-workflow-doctor v5 (overview-doctor-rescope)", () => {
  const DOCTOR_DIR = "skills/engineering/task-workflow-doctor";
  const RESOURCES_DIR = `${DOCTOR_DIR}/resources`;
  const content = readFile(`${DOCTOR_DIR}/SKILL.md`);
  const page = readFile("docs/engineering/task-workflow-doctor.md");

  test("covers exactly the four scopes the tools cannot self-diagnose", () => {
    // The symptom table groups the diagnosis into the four scopes: a legacy
    // or unversioned tree, missing scaffolding, a failed migration, and an
    // opener refusal.
    expect(content).toMatch(/legacy or unversioned/i);
    expect(content).toMatch(/missing scaffolding/i);
    expect(content).toMatch(/failed migration/i);
    expect(content).toMatch(/opener refus/i);
    for (const resource of [
      "okf-conformance-failure.md",
      "missing-tasks-tree.md",
      "missing-context-md.md",
      "failed-migration.md",
      "opener-refusal.md",
    ]) {
      expect(content, resource).toContain(`resources/${resource}`);
    }
  });

  test("routes legacy trees and failed migrations to the migrate branch", () => {
    const legacy = readFile(`${RESOURCES_DIR}/okf-conformance-failure.md`);
    expect(legacy).toMatch(/schema_version/);
    expect(legacy).toMatch(/less than 5|below 5|pre-v5|not 5/);
    expect(legacy).toContain("/skill:setup-workflow");
    expect(legacy).not.toMatch(/below 4|pre-v4/i);

    const failed = readFile(`${RESOURCES_DIR}/failed-migration.md`);
    expect(failed).toMatch(/migrat/i);
    expect(failed).toMatch(/backup branch/);
    expect(failed).toContain("/skill:setup-workflow");
  });

  test("routes an opener refusal to its legal next call, never fixes it", () => {
    const refusal = readFile(`${RESOURCES_DIR}/opener-refusal.md`);
    // The opener's refusal carries a reason and the legal next calls; the
    // doctor's job is to route to them.
    expect(refusal).toContain("tw_open");
    expect(refusal).toContain("tw_next");
    expect(refusal).toContain("legal_next");
    for (const route of ["intake", "to-tickets", "finalize-effort"]) {
      expect(refusal, route).toContain(route);
    }
    // The refusals the opener returns: unknown effort, missing target,
    // blocked, done, not-ready, and the missing architecture document.
    for (const shape of ["unknown effort", "missing target", "blocked", "done", "architecture"]) {
      expect(refusal.toLowerCase(), shape).toContain(shape);
    }
  });

  test("no resource for a retired substrate remains", () => {
    // `docs/bugs/` retires as a live substrate (it survives only as an
    // archive), and the retired routers and slice vocabulary are not part of
    // the v5 language. A resource that named them is removed or repointed.
    expect(existsSync(join(PROJECT, `${RESOURCES_DIR}/missing-bugs-dirs.md`))).toBe(false);
    for (const entry of readdirSync(join(PROJECT, RESOURCES_DIR))) {
      const text = readFile(`${RESOURCES_DIR}/${entry}`);
      for (const retired of [
        "/skill:triage",
        "/skill:implement-task",
        "/skill:finalize-task",
        "docs/bugs",
        "tw_slices",
        "slices/",
        "mode: hitl",
      ]) {
        expect(text, `${entry} names the retired '${retired}'`).not.toContain(retired);
      }
      expect(text, `${entry} uses the retired 'slice' vocabulary`).not.toMatch(/\bslices?\b/i);
    }
    // The skill and its docs page carry the same retirement.
    for (const text of [content, page]) {
      expect(text).not.toMatch(/docs\/bugs/);
      expect(text).not.toMatch(/cannot create.*bugs|bugs cannot be created/i);
    }
  });
});
