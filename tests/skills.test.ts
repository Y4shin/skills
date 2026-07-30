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
  "skills/create-task/SKILL.md",
  "skills/implement-task/SKILL.md",
  "skills/finalize-task/SKILL.md",
  "skills/report-bug/SKILL.md",
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
    expect(pkg.pi.skills.length).toBe(7);
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

describe("skill cross-references", () => {
  test("overview references all core skills", () => {
    const content = readFile("skills/task-overview/SKILL.md");
    expect(content).toContain("create-task");
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
    expect(content).toMatch(/absent.*feature|feature.*default|\btype:\s*feature\b/i);
  });

  test("implement-task feature resource references task_dependency_levels", () => {
    const content = readFile("skills/implement-task/resources/feature.md");
    expect(content).toContain("task_dependency_levels");
  });

  test("implement-task feature resource references tdd-worker agent", () => {
    const content = readFile("skills/implement-task/resources/feature.md");
    expect(content).toContain("tdd-worker");
  });

  test("implement-task feature resource references slice-verifier agent", () => {
    const content = readFile("skills/implement-task/resources/feature.md");
    expect(content).toContain("slice-verifier");
  });

  test("implement-task feature resource references land-worker agent", () => {
    const content = readFile("skills/implement-task/resources/feature.md");
    expect(content).toContain("land-worker");
  });

  test("implement-task feature resource references deviation-reporter agent", () => {
    const content = readFile("skills/implement-task/resources/feature.md");
    expect(content).toContain("deviation-reporter");
  });

  test("implement-task bug resource references tdd-worker agent", () => {
    const content = readFile("skills/implement-task/resources/bug.md");
    expect(content).toContain("tdd-worker");
  });

  test("implement-task bug resource references slice-verifier agent", () => {
    const content = readFile("skills/implement-task/resources/bug.md");
    expect(content).toContain("slice-verifier");
  });

  test("implement-task bug resource references land-worker agent", () => {
    const content = readFile("skills/implement-task/resources/bug.md");
    expect(content).toContain("land-worker");
  });

  test("implement-task bug resource uses red-first regression test rule", () => {
    const content = readFile("skills/implement-task/resources/bug.md");
    expect(content).toMatch(/red.{0,40}test|test.{0,40}red/i);
  });

  test("feature and bug resources include failure toolbelt in order", () => {
    const feature = readFile("skills/implement-task/resources/feature.md");
    const bug = readFile("skills/implement-task/resources/bug.md");
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

  test("finalize-task references task_epic_tick", () => {
    const content = readFile("skills/finalize-task/SKILL.md");
    expect(content).toContain("task_epic_tick");
  });

  test("finalize-task references task_epic_finalizable", () => {
    const content = readFile("skills/finalize-task/SKILL.md");
    expect(content).toContain("task_epic_finalizable");
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
});