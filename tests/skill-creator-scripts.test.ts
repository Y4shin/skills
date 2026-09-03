/**
 * Tests for the skill-creator helper scripts (validate_skill, scaffold_skill,
 * discover_skill). The TDD seam is the script CLIs (stdout + exit code) via
 * spawnSync, as specified in the arch spec.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test, afterAll, beforeAll } from "vitest";

const PROJECT = process.cwd();
const SCRIPTS_DIR = join(PROJECT, "skills", "engineering", "skill-creator", "scripts");

function runScript(scriptName: string, args: string[], cwd?: string) {
  return spawnSync("node", [join(SCRIPTS_DIR, scriptName), ...args], {
    cwd: cwd ?? PROJECT,
    encoding: "utf-8",
    timeout: 10000,
  });
}

function makeTempSkillDir(name: string, frontmatter: string, body = ""): string {
  const dir = mkdtempSync(join(tmpdir(), "skill-test-"));
  // Create a subdirectory matching the skill name so `name` == folder name
  const skillDir = join(dir, name);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(
    join(skillDir, "SKILL.md"),
    `---\n${frontmatter}\n---\n${body}`,
  );
  return dir;
}

const VALID_FRONTMATTER = `name: test-skill\ndescription: A valid test skill for unit testing.`;

describe("validate_skill.mjs", () => {
  test("accepts a valid temp skill (exit 0, OK)", () => {
    const dir = makeTempSkillDir("test-skill", VALID_FRONTMATTER);
    try {
      const result = runScript("validate_skill.mjs", ["test-skill"], dir);
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe("OK");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rejects a bad name (uppercase + underscore)", () => {
    const dir = makeTempSkillDir(
      "test-skill",
      `name: Skill_Name\ndescription: A skill with a bad name.`,
    );
    try {
      const result = runScript("validate_skill.mjs", ["test-skill"], dir);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("name");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rejects missing description", () => {
    const dir = makeTempSkillDir("test-skill", `name: test-skill`);
    try {
      const result = runScript("validate_skill.mjs", ["test-skill"], dir);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("description");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rejects description >1024 chars", () => {
    const longDesc = "A".repeat(1025);
    const dir = makeTempSkillDir(
      "test-skill",
      `name: test-skill\ndescription: ${longDesc}`,
    );
    try {
      const result = runScript("validate_skill.mjs", ["test-skill"], dir);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("description");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts description exactly 1024 chars (boundary)", () => {
    const exactDesc = "A".repeat(1024);
    const dir = makeTempSkillDir(
      "test-skill",
      `name: test-skill\ndescription: ${exactDesc}`,
    );
    try {
      const result = runScript("validate_skill.mjs", ["test-skill"], dir);
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe("OK");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rejects unknown frontmatter key (disable-model-invocation)", () => {
    const dir = makeTempSkillDir(
      "test-skill",
      `name: test-skill\ndescription: A valid skill.\ndisable-model-invocation: true`,
    );
    try {
      const result = runScript("validate_skill.mjs", ["test-skill"], dir);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("disable-model-invocation");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts a skill with compatibility field (the bug-fix assertion)", () => {
    const dir = makeTempSkillDir(
      "test-skill",
      `name: test-skill\ndescription: A valid skill.\ncompatibility: claude-sonnet-4-5`,
    );
    try {
      const result = runScript("validate_skill.mjs", ["test-skill"], dir);
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe("OK");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rejects name with trailing hyphen", () => {
    const dir = makeTempSkillDir(
      "test-skill",
      `name: test-skill-\ndescription: A valid skill.`,
    );
    try {
      const result = runScript("validate_skill.mjs", ["test-skill"], dir);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("name");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rejects name that does not match folder name", () => {
    const dir = makeTempSkillDir(
      "test-skill",
      `name: other-skill\ndescription: A valid skill.`,
    );
    try {
      const result = runScript("validate_skill.mjs", ["test-skill"], dir);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("name");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rejects description with angle brackets", () => {
    const dir = makeTempSkillDir(
      "test-skill",
      `name: test-skill\ndescription: A skill with <angle> brackets.`,
    );
    try {
      const result = runScript("validate_skill.mjs", ["test-skill"], dir);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("description");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rejects consecutive hyphens in name", () => {
    const dir = makeTempSkillDir(
      "test-skill",
      `name: test--skill\ndescription: A valid skill.`,
    );
    try {
      const result = runScript("validate_skill.mjs", ["test-skill"], dir);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("name");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rejects name longer than 64 chars", () => {
    const longName = "a".repeat(65);
    const dir = makeTempSkillDir(
      longName,
      `name: ${longName}\ndescription: A valid skill.`,
    );
    try {
      const result = runScript("validate_skill.mjs", [longName], dir);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("name");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rejects missing SKILL.md", () => {
    const dir = mkdtempSync(join(tmpdir(), "skill-test-"));
    try {
      const result = runScript("validate_skill.mjs", ["nonexistent"], dir);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("SKILL.md");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts description containing a colon (robust YAML parse)", () => {
    const dir = makeTempSkillDir(
      "test-skill",
      `name: test-skill\ndescription: "A skill: with a colon"`,
    );
    try {
      const result = runScript("validate_skill.mjs", ["test-skill"], dir);
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe("OK");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts all allowed frontmatter keys", () => {
    const dir = makeTempSkillDir(
      "test-skill",
      [
        "name: test-skill",
        "description: A valid skill.",
        "license: MIT",
        "compatibility: claude-sonnet-4-5",
        "allowed-tools: read write bash",
        "metadata:",
        "  author: test",
      ].join("\n"),
    );
    try {
      const result = runScript("validate_skill.mjs", ["test-skill"], dir);
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe("OK");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("dogfood: validates skills/skill-creator (PASS)", () => {
    const result = runScript("validate_skill.mjs", ["skills/engineering/skill-creator"]);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("OK");
  });

  test("dogfood: validates skills/tdd (PASS)", () => {
    const result = runScript("validate_skill.mjs", ["skills/engineering/tdd"]);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("OK");
  });
});

describe("scaffold_skill.mjs", () => {
  test("creates a new skill dir + SKILL.md with normalized name", () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), "scaffold-test-"));
    try {
      const result = runScript("scaffold_skill.mjs", ["my-new-skill", "--path", tmpRoot]);
      expect(result.status).toBe(0);
      const skillDir = join(tmpRoot, "my-new-skill");
      expect(existsSync(skillDir)).toBe(true);
      expect(existsSync(join(skillDir, "SKILL.md"))).toBe(true);
      const content = readFileSync(join(skillDir, "SKILL.md"), "utf-8");
      expect(content).toContain("name: my-new-skill");
      expect(content).toContain("description:");
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  test("refuses to overwrite an existing skill", () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), "scaffold-test-"));
    try {
      // First scaffold creates the skill
      runScript("scaffold_skill.mjs", ["existing-skill", "--path", tmpRoot]);
      const skillDir = join(tmpRoot, "existing-skill");
      expect(existsSync(skillDir)).toBe(true);

      // Second scaffold on same name should refuse
      const result = runScript("scaffold_skill.mjs", ["existing-skill", "--path", tmpRoot]);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("exists");
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  test("normalizes a name with spaces to hyphens", () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), "scaffold-test-"));
    try {
      const result = runScript("scaffold_skill.mjs", ["My Cool Skill", "--path", tmpRoot]);
      expect(result.status).toBe(0);
      const skillDir = join(tmpRoot, "my-cool-skill");
      expect(existsSync(skillDir)).toBe(true);
      const content = readFileSync(join(skillDir, "SKILL.md"), "utf-8");
      expect(content).toContain("name: my-cool-skill");
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});

describe("discover_skill.mjs", () => {
  test("ranks a known skill above an irrelevant one above the threshold", () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), "discover-test-"));
    try {
      // Create a relevant skill
      const relevantDir = join(tmpRoot, "code-review");
      mkdirSync(relevantDir, { recursive: true });
      writeFileSync(
        join(relevantDir, "SKILL.md"),
        "---\nname: code-review\ndescription: Review code for quality, bugs, and style issues.\n---\n# Code Review\n",
      );

      // Create an irrelevant skill
      const irrelevantDir = join(tmpRoot, "cooking-recipes");
      mkdirSync(irrelevantDir, { recursive: true });
      writeFileSync(
        join(irrelevantDir, "SKILL.md"),
        "---\nname: cooking-recipes\ndescription: Find and organize cooking recipes.\n---\n# Cooking Recipes\n",
      );

      const result = runScript(
        "discover_skill.mjs",
        ["review code quality", "--skills-dir", tmpRoot, "--threshold", "0.1"],
      );
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("code-review");
      expect(result.stdout.indexOf("code-review")).toBeLessThan(
        result.stdout.indexOf("cooking-recipes") === -1
          ? Infinity
          : result.stdout.indexOf("cooking-recipes"),
      );
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  test("supports --json output", () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), "discover-test-"));
    try {
      const relevantDir = join(tmpRoot, "code-review");
      mkdirSync(relevantDir, { recursive: true });
      writeFileSync(
        join(relevantDir, "SKILL.md"),
        "---\nname: code-review\ndescription: Review code for quality, bugs, and style issues.\n---\n# Code Review\n",
      );

      const result = runScript(
        "discover_skill.mjs",
        ["review code quality", "--skills-dir", tmpRoot, "--threshold", "0.1", "--json"],
      );
      expect(result.status).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0].name).toBe("code-review");
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});
