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
  "skills/engineering/implement-task/SKILL.md",
  "skills/engineering/finalize-task/SKILL.md",
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
  "skills/engineering/triage/SKILL.md",
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
    expect(pkg.pi.skills.length).toBe(29);
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
    expect(content).toMatch(/one question at a time/i);
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
    expect(fm.tools).toBe("read, bash, get_guidelines");
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
    expect(agentNames).toContain("architecture-scout");  });

  test("agent names are in package subagents path", () => {
    expect(pkg.pi.subagents.agents).toContain("./agents");
  });
});

// ─── Skill references in skills ──────────────────────────────────────

describe("human-mode resource routing", () => {
  const routers = ["feature", "bug"];

  test.each(routers)("%s router is slim and references both mode resources", (kind) => {
    const content = readFile(`skills/engineering/implement-task/resources/${kind}.md`);
    expect(content).toContain(`resources/${kind}/autonomous.md`);
    expect(content).toContain(`resources/${kind}/human.md`);
    expect(content).toMatch(/ambiguous/i);
    expect(content).toMatch(/ask_user_question/);
    expect(content.length).toBeLessThan(2500);
  });

  test.each(routers)("%s mode resources exist and autonomous copy is substantial", (kind) => {
    const autonomous = readFile(`skills/engineering/implement-task/resources/${kind}/autonomous.md`);
    const human = readFile(`skills/engineering/implement-task/resources/${kind}/human.md`);
    expect(autonomous.length).toBeGreaterThan(2500);
    expect(human.length).toBeGreaterThan(100);
  });

  test.each(routers)("%s router documents clear human phrases, variants, and autonomous fallback", (kind) => {
    const content = readFile(`skills/engineering/implement-task/resources/${kind}.md`);
    expect(content).toMatch(/implement (the task )?(yourself|manually)|human mode|manual mode/i);
    expect(content).toMatch(/no prose|no trailing prose|fallback|autonomous/i);
    expect(content).toMatch(/confirmation|confirm/i);
  });
});

describe("human-mode feature pipeline", () => {
  const content = readFile("skills/engineering/implement-task/resources/feature/human.md");

  test("requires collaborative architecture planning and explicit consent before implementation", () => {
    expect(content).toMatch(/architecture[- ]spec/i);
    expect(content).toMatch(/collaborat(e|ively).*review|review.*architecture/i);
    expect(content).toMatch(/explicit (user|human) consent|consent.*before/i);
    expect(content).toMatch(/no slice (code|implementation).*before.*handoff/i);
  });

  test("defines per-slice handoff and human-owned implementation boundary", () => {
    expect(content).toMatch(/per[- ]slice.*handoff/i);
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
    expect(content).toMatch(/next slice.*approval|approval.*next slice/i);
    expect(content).toMatch(/whole-task.*refactor|collaborative.*refactor/i);
    expect(content).toMatch(/consent.*refactor|approval.*refactor/i);
  });
});

describe("human-mode bug pipeline", () => {
  const content = readFile("skills/engineering/implement-task/resources/bug/human.md");

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
    const router = readFile(`skills/engineering/implement-task/resources/${kind}.md`);
    expect(router).toContain(`resources/${kind}/autonomous.md`);
    expect(router).toContain(`resources/${kind}/human.md`);
    expect(router).toMatch(/no trailing mode prose|no prose/i);
    expect(router).toMatch(/ambiguous/i);
    expect(router).toContain("ask_user_question");

    const wrapper = readFile("skills/engineering/implement-task/SKILL.md");
    expect(wrapper).toContain(`resources/${kind}.md`);
    expect(wrapper).not.toContain(`resources/${kind}/human.md`);
    expect(wrapper).not.toContain(`resources/${kind}/autonomous.md`);
  });

  test.each(taskKinds.flatMap((kind) => modes.map((mode) => [kind, mode] as const)))
    ("%s %s resource exists and is non-empty", (kind, mode) => {
      const content = readFile(`skills/engineering/implement-task/resources/${kind}/${mode}.md`);
      expect(content.trim().length).toBeGreaterThan(100);
    });

  test("verification agent permissions are read-only while landing remains separate", () => {
    const verifier = parseFrontmatter(readFile("agents/slice-verifier.md"));
    const reviewer = parseFrontmatter(readFile("agents/code-reviewer.md"));
    expect(verifier.tools).toBe("read, bash");
    expect(reviewer.tools).not.toMatch(/edit|write|land-worker/);

    for (const kind of taskKinds) {
      const human = readFile(`skills/engineering/implement-task/resources/${kind}/human.md`);
      expect(human).toMatch(/read[- ]only/i);
      expect(human).toMatch(/must not edit|cannot edit/i);
      expect(human).toContain("land-worker");
      expect(human.indexOf("explicit human approval")).toBeLessThan(human.lastIndexOf("land-worker"));
    }
  });

  test.each(taskKinds)("%s human protocol covers verifier failure and approval rejection", (kind) => {
    const human = readFile(`skills/engineering/implement-task/resources/${kind}/human.md`);
    expect(human).toMatch(/verifier[- ]first/i);
    expect(human).toMatch(/fast[- ]fail/i);
    expect(human).toMatch(/failure.*return|return.*failure/i);
    expect(human).toMatch(/rejected|declined|not approved/i);
    expect(human).toMatch(/next slice|task completion|declaring task completion/i);
  });

  test("feature human protocol preserves collaborative post-handoff assistance boundary", () => {
    const human = readFile("skills/engineering/implement-task/resources/feature/human.md");
    expect(human).toMatch(/after the per[- ]slice handoff|after.*handoff/i);
    expect(human).toMatch(/explicit request.*code assistance|code assistance.*explicit/i);
    expect(human).toMatch(/multiple slices|each slice|every slice/i);
    expect(human).toMatch(/whole-task.*refactor|collaborative.*refactor/i);
  });
});

describe("skill cross-references", () => {
  test("overview references all core skills", () => {
    const content = readFile("skills/engineering/task-workflow-overview/SKILL.md");
    expect(content).toContain("wayfinder");
    expect(content).toContain("implement-task");
    expect(content).toContain("finalize-task");
    expect(content).toContain("setup-workflow");
  });

  test("implement-task wrapper reads type and dispatches to resources", () => {
    const content = readFile("skills/engineering/implement-task/SKILL.md");
    expect(content).toContain("tw_get");
    expect(content).toContain("type");
    expect(content).toContain("resources/feature.md");
    expect(content).toContain("resources/bug.md");
    expect(content).toContain("resources/research.md");
    expect(content).toContain("resources/prototype.md");
    expect(content).toContain("resources/grilling.md");
    expect(content).toContain("resources/manual.md");
    expect(content).toMatch(/absent.*feature|feature.*default|\btype:\s*feature\b/i);
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

  test("implement-task re-enters wayfinder after a map frontier", () => {
    const content = readFile("skills/engineering/implement-task/SKILL.md");
    expect(content).toContain("wayfinder <map-slug>");
    expect(content).toContain("reassess the map");
  });

  test("implement-task feature resource references tw_dependency_levels", () => {
    const content = readFile("skills/engineering/implement-task/resources/feature/autonomous.md");
    expect(content).toContain("tw_dependency_levels");
  });

  test("implement-task feature resource references tdd-worker agent", () => {
    const content = readFile("skills/engineering/implement-task/resources/feature/autonomous.md");
    expect(content).toContain("tdd-worker");
  });

  test("implement-task feature resource references slice-verifier agent", () => {
    const content = readFile("skills/engineering/implement-task/resources/feature/autonomous.md");
    expect(content).toContain("slice-verifier");
  });

  test("implement-task feature resource references land-worker agent", () => {
    const content = readFile("skills/engineering/implement-task/resources/feature/autonomous.md");
    expect(content).toContain("land-worker");
  });

  test("implement-task feature resource references deviation-reporter agent", () => {
    const content = readFile("skills/engineering/implement-task/resources/feature/autonomous.md");
    expect(content).toContain("deviation-reporter");
  });

  test("implement-task feature resource references code-reviewer agent", () => {
    const content = readFile("skills/engineering/implement-task/resources/feature/autonomous.md");
    expect(content).toContain("code-reviewer");
  });

  for (const resource of ["research", "prototype", "grilling", "manual"]) {
    test(`implement-task ${resource} resource exists and is non-coding`, () => {
      const content = readFile(`skills/engineering/implement-task/resources/${resource}.md`);
      expect(content).toContain("Implement Task");
      expect(content).toContain("Completion evidence");
    });
  }

  test("implement-task bug resource references tdd-worker agent", () => {
    const content = readFile("skills/engineering/implement-task/resources/bug/autonomous.md");
    expect(content).toContain("tdd-worker");
  });

  test("implement-task bug resource references slice-verifier agent", () => {
    const content = readFile("skills/engineering/implement-task/resources/bug/autonomous.md");
    expect(content).toContain("slice-verifier");
  });

  test("implement-task bug resource references land-worker agent", () => {
    const content = readFile("skills/engineering/implement-task/resources/bug/autonomous.md");
    expect(content).toContain("land-worker");
  });

  test("implement-task bug resource references code-reviewer agent", () => {
    const content = readFile("skills/engineering/implement-task/resources/bug/autonomous.md");
    expect(content).toContain("code-reviewer");
  });

  test("implement-task bug resource uses red-first regression test rule", () => {
    const content = readFile("skills/engineering/implement-task/resources/bug/autonomous.md");
    expect(content).toMatch(/red.{0,40}test|test.{0,40}red/i);
  });

  test("feature and bug resources include failure toolbelt in order", () => {
    const feature = readFile("skills/engineering/implement-task/resources/feature/autonomous.md");
    const bug = readFile("skills/engineering/implement-task/resources/bug/autonomous.md");
    for (const content of [feature, bug]) {
      const splitIdx = content.indexOf("split");
      const retryIdx = content.indexOf("retry");
      expect(splitIdx).toBeGreaterThan(-1);
      expect(retryIdx).toBeGreaterThan(-1);
      expect(splitIdx).toBeLessThan(retryIdx);
      expect(content).toContain("parent never implements");
    }
  });

  test("finalize-task references tw_finalizable", () => {
    const content = readFile("skills/engineering/finalize-task/SKILL.md");
    expect(content).toContain("tw_finalizable");
  });

  test("finalize-task references tw_map_tick", () => {
    const content = readFile("skills/engineering/finalize-task/SKILL.md");
    expect(content).toContain("tw_map_tick");
  });

  test("finalize-task Step 7 separates Pi tool calls from the shell archive block", () => {
    const content = readFile("skills/engineering/finalize-task/SKILL.md");
    const step7Start = content.indexOf("## Step 7");
    expect(step7Start).toBeGreaterThan(-1);
    const step8Start = content.indexOf("## Step 8", step7Start);
    const step7 = step8Start > -1 ? content.slice(step7Start, step8Start) : content.slice(step7Start);

    // The git shell block (containing `git merge --no-ff`) must not interleave
    // Pi tool calls (tw_state_set / tw_map_tick) as if they were shell
    // binaries, under `set -e` that aborts the archive mid-sequence (see
    // docs/bugs/finalize-task-set-e-tool-confusion.md).
    const fence = /```[^\n]*\n([\s\S]*?)```/g;
    let shellBlock: string | null = null;
    let m: RegExpExecArray | null;
    while ((m = fence.exec(step7)) !== null) {
      if (/git\s+merge\s+--no-ff/.test(m[1])) {
        shellBlock = m[1];
        break;
      }
    }
    expect(shellBlock).not.toBeNull();
    expect(shellBlock!).not.toMatch(/tw_state_set/);
    expect(shellBlock!).not.toMatch(/tw_map_tick/);

    // The Pi tool calls must still appear in Step 7, clearly marked as tool
    // invocations rather than shell commands.
    expect(step7).toContain("tw_state_set");
    expect(step7).toContain("tw_map_tick");
    expect(step7).toMatch(/Pi tool|tool call|tool invocation|invoke .*tool|not .*shell command/i);
  });

  test("finalize-task references tw_map_finalizable", () => {
    const content = readFile("skills/engineering/finalize-task/SKILL.md");
    expect(content).toContain("tw_map_finalizable");
  });

  test("finalize-task has a type: bug branch", () => {
    const content = readFile("skills/engineering/finalize-task/SKILL.md");
    expect(content).toMatch(/type\s*:\s*bug/i);
  });

  test("finalize-task bug branch archives bug docs to docs/bugs/archive", () => {
    const content = readFile("skills/engineering/finalize-task/SKILL.md");
    expect(content).toContain("docs/bugs/archive");
  });

  test("finalize-task bug branch sets status fixed and fills fix_commit", () => {
    const content = readFile("skills/engineering/finalize-task/SKILL.md");
    expect(content).toContain("status: fixed");
    expect(content).toContain("fix_commit");
  });

  test("finalize-task bug branch asks user when bug field is absent", () => {
    const content = readFile("skills/engineering/finalize-task/SKILL.md");
    expect(content).toMatch(/ask.{0,80}bug/i);
  });

  test("finalize-task documents bug slug frontmatter convention", () => {
    const content = readFile("skills/engineering/finalize-task/SKILL.md");
    expect(content).toContain("bug: <slug>");
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

  test("task-overview lists triage queue query", () => {
    const content = readFile("skills/engineering/task-workflow-overview/SKILL.md");
    expect(content).toContain('grep -l "status: reported" docs/bugs/*.md');
  });

  test("task-overview mentions docs/bugs as bug list location", () => {
    const content = readFile("skills/engineering/task-workflow-overview/SKILL.md");
    expect(content).toContain("docs/bugs/");
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

  test("implement-task bug resource references diagnosing-bugs skill", () => {
    const content = readFile("skills/engineering/implement-task/resources/bug/autonomous.md");
    expect(content).toContain("diagnosing-bugs");
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

// ─── setup-workflow v4 (schema_version 4) ────────────────────────────

describe("setup-workflow v4", () => {
  const skill = readFile("skills/engineering/setup-workflow/SKILL.md");

  test("keys detection on schema_version 4 as current", () => {
    expect(skill).toMatch(/current schema version is \*\*4\*\*|schema_version 4|`4`/);
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

  test("the onboard branch writes the v4 scaffold", () => {
    expect(skill).toMatch(/schema_version: 4/);
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
// ─── Planning skills v4 (overhaul-planning-skills) ──────────────────

// The tool names the new planning prose may reference: the surviving surface
// after the overhaul rename.
const SURVIVING_TOOLS = new Set([
  "tw_show",
  "tw_get",
  "tw_set",
  "tw_list",
  "tw_frontier",
  "tw_dependency_levels",
  "tw_finalizable",
  "tw_map_finalizable",
  "tw_state",
  "tw_state_set",
  "tw_context",
]);

function toolNamesIn(content: string): string[] {
  return [...content.matchAll(/\btw_[a-z_]+\b/g)].map((m) => m[0]);
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

/** Run one substituted template through the repo's conformance chain. */
function conform(template: string): Artifact {
  const doc = parse(substituteTemplate(template));
  const art = fromFrontmatter(doc.data, "fixture");
  const anomalies = [...validateArtifact(art), ...findAnomalies([art])];
  expect(anomalies).toEqual([]);
  return art;
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
    for (const name of toolNamesIn(content)) {
      expect(SURVIVING_TOOLS.has(name), name).toBe(true);
    }
  });

  test("every frontmatter template conforms by construction", () => {
    for (const template of templates) {
      conform(template);
    }
  });
});

describe("wayfinder planning resources v4", () => {
  test("each planning resource's task template carries its v4 subtype", () => {
    for (const subtype of ["research", "prototype", "grilling", "manual"]) {
      const content = wayfinderFile(join("resources", `${subtype}.md`));
      const templates = extractFrontmatterTemplates(content);
      expect(templates.length).toBeGreaterThan(0);
      for (const template of templates) {
        expect(frontmatterKeys(template)).toContain("subtype");
        expect(template).toMatch(new RegExp(`^subtype: ${subtype}$`, "m"));
        conform(template);
      }
    }
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

/** Assemble a v4 effort on a temp tree from the extracted prose templates. */
function buildFixtureEffort(t: string): { root: string; effort: string } {
  const mapTemplate = extractFrontmatterTemplates(readFile(join(WAYFINDER_DIR, "SKILL.md")))
    .find((tpl) => /^type: map$/m.test(tpl))!;
  const taskTemplate = extractFrontmatterTemplates(
    wayfinderFile(join("resources", "research.md")),
  )[0]!;
  writeFm(t, "docs/tasks/demo/map.md", substituteTemplate(mapTemplate));
  writeFm(t, "docs/tasks/demo/tasks/first-question/task.md", substituteTemplate(taskTemplate));
  return { root: t, effort: "demo" };
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
      const { effort } = buildFixtureEffort(t);
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
      const { effort } = buildFixtureEffort(t);
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
      const { effort } = buildFixtureEffort(t);
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
    for (const template of templates) conform(template);
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
    expect(content).toMatch(/directory is the registration/i);
  });

  test("no map-array registration language", () => {
    expect(content).not.toMatch(/tasks array/i);
    expect(content).not.toMatch(/Register each ticket/i);
    expect(content).not.toMatch(/entry to the map frontmatter/i);
  });

  test("the honest contract: files written by hand, the graph queryable", () => {
    expect(content).toMatch(/written by hand/i);
    expect(content).toMatch(/graph queryable/i);
    // No claim of tool support for creation.
    expect(content).not.toMatch(/tools? (write|create|generate) (the )?tickets/i);
  });

  test("queries the graph via the surviving tools", () => {
    expect(content).toContain("tw_dependency_levels <effort-slug>");
    expect(content).toContain("tw_frontier <effort-slug>");
    for (const name of toolNamesIn(content)) {
      expect(SURVIVING_TOOLS.has(name), name).toBe(true);
    }
  });

  test("one-ticket efforts are fine", () => {
    expect(content).toMatch(/one ticket/i);
  });

  test("every frontmatter template conforms by construction", () => {
    for (const template of templates) conform(template);
  });

  test("a one-off effort (map with exactly one ticket, empty tasks/) produces zero anomalies", () => {
    const t = mkdtempSync(join(tmpdir(), "okf-one-off-"));
    try {
      const mapTemplate = extractFrontmatterTemplates(readFile(join(WAYFINDER_DIR, "SKILL.md")))
        .find((tpl) => /^type: map$/m.test(tpl))!;
      writeFm(t, "docs/tasks/one-off/map.md", substituteTemplate(mapTemplate));
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
    expect(resource).toContain("/skill:finalize-task");
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
    for (const text of [content, readFile(resourcePath)]) {
      for (const name of toolNamesIn(text)) {
        expect(SURVIVING_TOOLS.has(name), name).toBe(true);
      }
    }
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
    for (const name of toolNamesIn(content)) {
      expect(SURVIVING_TOOLS.has(name), name).toBe(true);
    }
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
        conform(template);
      }
    }
    // The three producers still carry their templates; the doctor and the
    // router produce no artifacts and carry none.
    expect(templateCount).toBeGreaterThanOrEqual(6);
  });
});
