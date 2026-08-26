/**
 * Structure tests for SKILL.md files, agent frontmatter, and package manifest.
 * Verifies that all files have the expected structure and references.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

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
  "skills/task-overview/SKILL.md",
  "skills/onboard-workflow/SKILL.md",
  "skills/wayfinder/SKILL.md",
  "skills/implement-task/SKILL.md",
  "skills/finalize-task/SKILL.md",
  "skills/report-bug/SKILL.md",
  "skills/tdd/SKILL.md",
  "skills/code-review/SKILL.md",
  "skills/task-workflow-doctor/SKILL.md",
  "skills/diagnosing-bugs/SKILL.md",
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
    expect(pkg.pi.skills.length).toBe(10);
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
});

// ─── Agent file existence tests ──────────────────────────────────────

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
  });

  test("agent names are in package subagents path", () => {
    expect(pkg.pi.subagents.agents).toContain("./agents");
  });
});

// ─── Skill references in skills ──────────────────────────────────────

describe("human-mode resource routing", () => {
  const routers = ["feature", "bug"];

  test.each(routers)("%s router is slim and references both mode resources", (kind) => {
    const content = readFile(`skills/implement-task/resources/${kind}.md`);
    expect(content).toContain(`resources/${kind}/autonomous.md`);
    expect(content).toContain(`resources/${kind}/human.md`);
    expect(content).toMatch(/ambiguous/i);
    expect(content).toMatch(/ask_user_question/);
    expect(content.length).toBeLessThan(2500);
  });

  test.each(routers)("%s mode resources exist and autonomous copy is substantial", (kind) => {
    const autonomous = readFile(`skills/implement-task/resources/${kind}/autonomous.md`);
    const human = readFile(`skills/implement-task/resources/${kind}/human.md`);
    expect(autonomous.length).toBeGreaterThan(2500);
    expect(human.length).toBeGreaterThan(100);
  });

  test.each(routers)("%s router documents clear human phrases, variants, and autonomous fallback", (kind) => {
    const content = readFile(`skills/implement-task/resources/${kind}.md`);
    expect(content).toMatch(/implement (the task )?(yourself|manually)|human mode|manual mode/i);
    expect(content).toMatch(/no prose|no trailing prose|fallback|autonomous/i);
    expect(content).toMatch(/confirmation|confirm/i);
  });
});

describe("human-mode feature pipeline", () => {
  const content = readFile("skills/implement-task/resources/feature/human.md");

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
  const content = readFile("skills/implement-task/resources/bug/human.md");

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
    const router = readFile(`skills/implement-task/resources/${kind}.md`);
    expect(router).toContain(`resources/${kind}/autonomous.md`);
    expect(router).toContain(`resources/${kind}/human.md`);
    expect(router).toMatch(/no trailing mode prose|no prose/i);
    expect(router).toMatch(/ambiguous/i);
    expect(router).toContain("ask_user_question");

    const wrapper = readFile("skills/implement-task/SKILL.md");
    expect(wrapper).toContain(`resources/${kind}.md`);
    expect(wrapper).not.toContain(`resources/${kind}/human.md`);
    expect(wrapper).not.toContain(`resources/${kind}/autonomous.md`);
  });

  test.each(taskKinds.flatMap((kind) => modes.map((mode) => [kind, mode] as const)))
    ("%s %s resource exists and is non-empty", (kind, mode) => {
      const content = readFile(`skills/implement-task/resources/${kind}/${mode}.md`);
      expect(content.trim().length).toBeGreaterThan(100);
    });

  test("verification agent permissions are read-only while landing remains separate", () => {
    const verifier = parseFrontmatter(readFile("agents/slice-verifier.md"));
    const reviewer = parseFrontmatter(readFile("agents/code-reviewer.md"));
    expect(verifier.tools).toBe("read, bash");
    expect(reviewer.tools).not.toMatch(/edit|write|land-worker/);

    for (const kind of taskKinds) {
      const human = readFile(`skills/implement-task/resources/${kind}/human.md`);
      expect(human).toMatch(/read[- ]only/i);
      expect(human).toMatch(/must not edit|cannot edit/i);
      expect(human).toContain("land-worker");
      expect(human.indexOf("explicit human approval")).toBeLessThan(human.lastIndexOf("land-worker"));
    }
  });

  test.each(taskKinds)("%s human protocol covers verifier failure and approval rejection", (kind) => {
    const human = readFile(`skills/implement-task/resources/${kind}/human.md`);
    expect(human).toMatch(/verifier[- ]first/i);
    expect(human).toMatch(/fast[- ]fail/i);
    expect(human).toMatch(/failure.*return|return.*failure/i);
    expect(human).toMatch(/rejected|declined|not approved/i);
    expect(human).toMatch(/next slice|task completion|declaring task completion/i);
  });

  test("feature human protocol preserves collaborative post-handoff assistance boundary", () => {
    const human = readFile("skills/implement-task/resources/feature/human.md");
    expect(human).toMatch(/after the per[- ]slice handoff|after.*handoff/i);
    expect(human).toMatch(/explicit request.*code assistance|code assistance.*explicit/i);
    expect(human).toMatch(/multiple slices|each slice|every slice/i);
    expect(human).toMatch(/whole-task.*refactor|collaborative.*refactor/i);
  });
});

describe("skill cross-references", () => {
  test("overview references all core skills", () => {
    const content = readFile("skills/task-overview/SKILL.md");
    expect(content).toContain("wayfinder");
    expect(content).toContain("implement-task");
    expect(content).toContain("finalize-task");
    expect(content).toContain("onboard-workflow");
  });

  test("implement-task wrapper reads type and dispatches to resources", () => {
    const content = readFile("skills/implement-task/SKILL.md");
    expect(content).toContain("task_get");
    expect(content).toContain("type");
    expect(content).toContain("resources/feature.md");
    expect(content).toContain("resources/bug.md");
    expect(content).toContain("resources/research.md");
    expect(content).toContain("resources/prototype.md");
    expect(content).toContain("resources/grilling.md");
    expect(content).toContain("resources/manual.md");
    expect(content).toMatch(/absent.*feature|feature.*default|\btype:\s*feature\b/i);
  });

  test("wayfinder owns task creation and direct handoff", () => {
    const content = readFile("skills/wayfinder/SKILL.md");
    expect(content).toContain("`create-task`, `to-spec`, and `to-tickets`");
    expect(content).toContain("mandatory grilling session");
    expect(content).toContain("implement-task");
    expect(content).toContain("blocked_by");
    expect(content).toContain("## Dynamic growth");
  });

  test("wayfinder has one planning resource per task type", () => {
    for (const type of ["feature", "bug", "research", "prototype", "grilling", "manual"]) {
      const content = readFile(`skills/wayfinder/resources/${type}.md`);
      expect(content).toContain("Wayfinder Planning Resource");
      expect(content).toContain(`type: ${type}`);
    }
  });

  test("implement-task re-enters wayfinder after a map frontier", () => {
    const content = readFile("skills/implement-task/SKILL.md");
    expect(content).toContain("wayfinder <map-slug>");
    expect(content).toContain("reassess the map");
  });

  test("implement-task feature resource references task_dependency_levels", () => {
    const content = readFile("skills/implement-task/resources/feature/autonomous.md");
    expect(content).toContain("task_dependency_levels");
  });

  test("implement-task feature resource references tdd-worker agent", () => {
    const content = readFile("skills/implement-task/resources/feature/autonomous.md");
    expect(content).toContain("tdd-worker");
  });

  test("implement-task feature resource references slice-verifier agent", () => {
    const content = readFile("skills/implement-task/resources/feature/autonomous.md");
    expect(content).toContain("slice-verifier");
  });

  test("implement-task feature resource references land-worker agent", () => {
    const content = readFile("skills/implement-task/resources/feature/autonomous.md");
    expect(content).toContain("land-worker");
  });

  test("implement-task feature resource references deviation-reporter agent", () => {
    const content = readFile("skills/implement-task/resources/feature/autonomous.md");
    expect(content).toContain("deviation-reporter");
  });

  test("implement-task feature resource references code-reviewer agent", () => {
    const content = readFile("skills/implement-task/resources/feature/autonomous.md");
    expect(content).toContain("code-reviewer");
  });

  for (const resource of ["research", "prototype", "grilling", "manual"]) {
    test(`implement-task ${resource} resource exists and is non-coding`, () => {
      const content = readFile(`skills/implement-task/resources/${resource}.md`);
      expect(content).toContain("Implement Task");
      expect(content).toContain("Completion evidence");
    });
  }

  test("implement-task bug resource references tdd-worker agent", () => {
    const content = readFile("skills/implement-task/resources/bug/autonomous.md");
    expect(content).toContain("tdd-worker");
  });

  test("implement-task bug resource references slice-verifier agent", () => {
    const content = readFile("skills/implement-task/resources/bug/autonomous.md");
    expect(content).toContain("slice-verifier");
  });

  test("implement-task bug resource references land-worker agent", () => {
    const content = readFile("skills/implement-task/resources/bug/autonomous.md");
    expect(content).toContain("land-worker");
  });

  test("implement-task bug resource references code-reviewer agent", () => {
    const content = readFile("skills/implement-task/resources/bug/autonomous.md");
    expect(content).toContain("code-reviewer");
  });

  test("implement-task bug resource uses red-first regression test rule", () => {
    const content = readFile("skills/implement-task/resources/bug/autonomous.md");
    expect(content).toMatch(/red.{0,40}test|test.{0,40}red/i);
  });

  test("feature and bug resources include failure toolbelt in order", () => {
    const feature = readFile("skills/implement-task/resources/feature/autonomous.md");
    const bug = readFile("skills/implement-task/resources/bug/autonomous.md");
    for (const content of [feature, bug]) {
      const splitIdx = content.indexOf("split");
      const retryIdx = content.indexOf("retry");
      expect(splitIdx).toBeGreaterThan(-1);
      expect(retryIdx).toBeGreaterThan(-1);
      expect(splitIdx).toBeLessThan(retryIdx);
      expect(content).toContain("parent never implements");
    }
  });

  test("finalize-task references task_finalizable", () => {
    const content = readFile("skills/finalize-task/SKILL.md");
    expect(content).toContain("task_finalizable");
  });

  test("finalize-task references task_map_tick", () => {
    const content = readFile("skills/finalize-task/SKILL.md");
    expect(content).toContain("task_map_tick");
  });

  test("finalize-task references task_map_finalizable", () => {
    const content = readFile("skills/finalize-task/SKILL.md");
    expect(content).toContain("task_map_finalizable");
  });

  test("finalize-task has a type: bug branch", () => {
    const content = readFile("skills/finalize-task/SKILL.md");
    expect(content).toMatch(/type\s*:\s*bug/i);
  });

  test("finalize-task bug branch archives bug docs to docs/bugs/archive", () => {
    const content = readFile("skills/finalize-task/SKILL.md");
    expect(content).toContain("docs/bugs/archive");
  });

  test("finalize-task bug branch sets status fixed and fills fix_commit", () => {
    const content = readFile("skills/finalize-task/SKILL.md");
    expect(content).toContain("status: fixed");
    expect(content).toContain("fix_commit");
  });

  test("finalize-task bug branch asks user when bug field is absent", () => {
    const content = readFile("skills/finalize-task/SKILL.md");
    expect(content).toMatch(/ask.{0,80}bug/i);
  });

  test("finalize-task documents bug slug frontmatter convention", () => {
    const content = readFile("skills/finalize-task/SKILL.md");
    expect(content).toContain("bug: <slug>");
  });

  test("onboard-workflow creates docs/bugs/archive directory", () => {
    const content = readFile("skills/onboard-workflow/SKILL.md");
    expect(content).toContain("docs/bugs/archive");
  });

  test("onboard-workflow writes docs/dev-env.md template", () => {
    const content = readFile("skills/onboard-workflow/SKILL.md");
    expect(content).toContain("docs/dev-env.md");
  });

  test("onboard-workflow does not clobber existing docs/dev-env.md", () => {
    const content = readFile("skills/onboard-workflow/SKILL.md");
    expect(content).toMatch(/do not clobber|already exists|skip.*docs\/dev-env\.md|preserve.*docs\/dev-env\.md/i);
  });

  test("task-overview routes planning to wayfinder", () => {
    const content = readFile("skills/task-overview/SKILL.md");
    expect(content).toContain("/skill:wayfinder");
    expect(content).toContain("task_frontier");
  });

  test("task-overview routes report a bug to /skill:report-bug", () => {
    const content = readFile("skills/task-overview/SKILL.md");
    expect(content).toContain("/skill:report-bug");
  });

  test("task-overview lists triage queue query", () => {
    const content = readFile("skills/task-overview/SKILL.md");
    expect(content).toContain('grep -l "status: reported" docs/bugs/*.md');
  });

  test("task-overview mentions docs/bugs as bug list location", () => {
    const content = readFile("skills/task-overview/SKILL.md");
    expect(content).toContain("docs/bugs/");
  });

  test("task-workflow-doctor references onboard-workflow", () => {
    const content = readFile("skills/task-workflow-doctor/SKILL.md");
    expect(content).toContain("onboard-workflow");
  });

  test("task-workflow-doctor has not-a-fixer contract", () => {
    const content = readFile("skills/task-workflow-doctor/SKILL.md");
    expect(content).toContain("diagnoses");
    expect(content).toContain("routes");
  });

  test("implement-task bug resource references diagnosing-bugs skill", () => {
    const content = readFile("skills/implement-task/resources/bug/autonomous.md");
    expect(content).toContain("diagnosing-bugs");
  });

  test("tdd-worker agent references diagnosing-bugs skill", () => {
    const content = readFile("agents/tdd-worker.md");
    expect(content).toContain("diagnosing-bugs");
  });

  test("diagnosing-bugs skill names Phase 1 as non-skippable", () => {
    const content = readFile("skills/diagnosing-bugs/SKILL.md");
    expect(content).toContain("Phase 1");
    expect(content).toContain("non-skippable");
  });

  test("diagnosing-bugs skill documents skippable phases with recorded justification", () => {
    const content = readFile("skills/diagnosing-bugs/SKILL.md");
    expect(content).toContain("skippable");
    expect(content).toMatch(/justified|recorded/);
  });
});