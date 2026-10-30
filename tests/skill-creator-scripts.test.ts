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

import { createTools } from "../src/pi.js";

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

  test("accepts disable-model-invocation as a valid frontmatter key", () => {
    const dir = makeTempSkillDir(
      "test-skill",
      `name: test-skill\ndescription: A valid skill.\ndisable-model-invocation: true`,
    );
    try {
      const result = runScript("validate_skill.mjs", ["test-skill"], dir);
      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
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

// ─── The disclosed nested toolset: the scripts registered as tools ────────────
//
// The skill-creator discipline calls the bundled scripts through registered
// tools (skill-creator-nested-toolset), not through the shell. The tools run
// the same bundled scripts the CLI tests above pin, so one seam proves the
// registration and the other proves the scripts themselves.

describe("the registered script tools", () => {
  const ctx = (directory: string) => ({ directory });

  test("the three bundled scripts are registered as tools", () => {
    const tools = createTools();
    for (const name of ["skill_validate", "skill_scaffold", "skill_discover"]) {
      expect(tools[name], `${name} must be registered`).toBeDefined();
      expect(typeof tools[name].description).toBe("string");
      expect(typeof tools[name].execute).toBe("function");
    }
  });

  test("skill_validate passes a valid skill and fails an invalid one with the script's reason", async () => {
    const tools = createTools();
    const dir = makeTempSkillDir("tool-good", `name: tool-good\ndescription: A valid tool-tested skill.`);
    try {
      await expect(
        tools.skill_validate.execute({ skillDir: join(dir, "tool-good") }, ctx(dir)),
      ).resolves.toBe("OK");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }

    const bad = makeTempSkillDir("tool-bad", `name: other-skill\ndescription: A valid skill.`);
    try {
      await expect(
        tools.skill_validate.execute({ skillDir: join(bad, "tool-bad") }, ctx(bad)),
      ).rejects.toThrow(/does not match folder name/);
    } finally {
      rmSync(bad, { recursive: true, force: true });
    }
  });

  test("skill_validate resolves relative skill dirs against the session directory", async () => {
    const tools = createTools();
    const dir = makeTempSkillDir("tool-rel", `name: tool-rel\ndescription: A valid tool-tested skill.`);
    try {
      await expect(
        tools.skill_validate.execute({ skillDir: "tool-rel" }, ctx(dir)),
      ).resolves.toBe("OK");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("skill_validate validates a real repo skill through the bundled script", async () => {
    const tools = createTools();
    // Dogfood: the bundled validator validates the repo's own skills.
    await expect(
      tools.skill_validate.execute({ skillDir: "skills/engineering/skill-creator" }, ctx(PROJECT)),
    ).resolves.toBe("OK");
  });

  test("skill_scaffold scaffolds a new skill and refuses an existing one", async () => {
    const tools = createTools();
    const tmpRoot = mkdtempSync(join(tmpdir(), "scaffold-tool-"));
    try {
      const created = (await tools.skill_scaffold.execute(
        { name: "My Tool Skill", path: tmpRoot },
        ctx(PROJECT),
      )) as string;
      expect(created).toContain(`Created skill "my-tool-skill"`);
      const content = readFileSync(join(tmpRoot, "my-tool-skill", "SKILL.md"), "utf-8");
      expect(content).toContain("name: my-tool-skill");

      await expect(
        tools.skill_scaffold.execute({ name: "my-tool-skill", path: tmpRoot }, ctx(PROJECT)),
      ).rejects.toThrow(/already exists/);
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  test("skill_scaffold creates the requested resource directories", async () => {
    const tools = createTools();
    const tmpRoot = mkdtempSync(join(tmpdir(), "scaffold-tool-"));
    try {
      await tools.skill_scaffold.execute(
        { name: "resourced", path: tmpRoot, resources: ["scripts", "references"] },
        ctx(PROJECT),
      );
      expect(existsSync(join(tmpRoot, "resourced", "scripts"))).toBe(true);
      expect(existsSync(join(tmpRoot, "resourced", "references"))).toBe(true);
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  test("skill_discover ranks candidates and carries the JSON output", async () => {
    const tools = createTools();
    const tmpRoot = mkdtempSync(join(tmpdir(), "discover-tool-"));
    try {
      const relevantDir = join(tmpRoot, "code-review");
      mkdirSync(relevantDir, { recursive: true });
      writeFileSync(
        join(relevantDir, "SKILL.md"),
        "---\nname: code-review\ndescription: Review code for quality, bugs, and style issues.\n---\n# Code Review\n",
      );

      const text = (await tools.skill_discover.execute(
        { intent: "review code quality", skillsDir: tmpRoot, threshold: 0.1 },
        ctx(PROJECT),
      )) as { text: string };
      expect(text.text).toContain("code-review");
      expect(text.text).toContain("UPDATE over create");

      const json = (await tools.skill_discover.execute(
        { intent: "review code quality", skillsDir: tmpRoot, threshold: 0.1, json: true },
        ctx(PROJECT),
      )) as { text: string };
      const parsed = JSON.parse(json.text);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].name).toBe("code-review");
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  test("skill_discover defaults the skills dir to the session's skills directory", async () => {
    const tools = createTools();
    const tmpRoot = mkdtempSync(join(tmpdir(), "discover-tool-"));
    try {
      const relevantDir = join(tmpRoot, "skills", "code-review");
      mkdirSync(relevantDir, { recursive: true });
      writeFileSync(
        join(relevantDir, "SKILL.md"),
        "---\nname: code-review\ndescription: Review code for quality, bugs, and style issues.\n---\n# Code Review\n",
      );

      const result = (await tools.skill_discover.execute(
        { intent: "review code quality", threshold: 0.1 },
        ctx(tmpRoot),
      )) as { text: string };
      expect(result.text).toContain("code-review");
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});
