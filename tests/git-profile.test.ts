/**
 * Git settings, bundled profiles, and phase briefs.
 *
 * Three seams, one feature: the `taskWorkflow.git` settings reader (project
 * over global over defaults, malformed values diagnosed and defaulted), the
 * profile loader (`src/profiles/*.json`, a seam the tests can point at
 * fixtures), and the resolver behind `tw_phase_brief` and the branch gates
 * (a phase brief and a gate decision over one loaded profile).
 *
 * No test needs a real repository: the settings reader takes explicit
 * settings paths, and the tool tests point `PI_CODING_AGENT_DIR` at a temp
 * settings directory the way the factory tests do.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, test } from "vitest";

import { GIT_SETTINGS_DEFAULTS, readGitSettings, trunkName } from "../src/core/repo-gate.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const roots: string[] = [];

/** A temp directory, removed when the file's tests finish. */
function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), `${prefix}-`));
  roots.push(dir);
  return dir;
}

/** Write a JSON settings file at `path`, creating its directory. */
function writeSettings(path: string, settings: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(settings), "utf-8");
}

/** A settings directory pair: the global file and the project file, both absent until written. */
function settingsPair(): { globalPath: string; projectPath: string } {
  const dir = tempDir("git-settings");
  return { globalPath: join(dir, "global", "settings.json"), projectPath: join(dir, "project", ".pi", "settings.json") };
}

afterAll(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
});

// ─── Settings reader: project over global over defaults ─────────────────────

describe("git settings", () => {
  test("a repository that configures nothing gets the built-in defaults, with no diagnostic", () => {
    const { globalPath, projectPath } = settingsPair();

    const settings = readGitSettings(tempDir("git-cwd"), { globalSettingsPath: globalPath, projectSettingsPath: projectPath });

    expect(settings.profile).toBe("default");
    expect(settings.trunk).toEqual({ develop: false, main: "main" });
    expect(settings.trunkMerge).toBe("local");
    expect(settings.diagnostics).toEqual([]);
    // The resolved trunk is the main branch while no develop branch exists.
    expect(trunkName(settings.trunk)).toBe("main");
  });

  test("the project file wins key by key, the global file fills the gaps, the defaults come last", () => {
    const { globalPath, projectPath } = settingsPair();
    writeSettings(globalPath, {
      taskWorkflow: {
        git: { profile: "flat", trunk: { develop: "dev", main: "trunk" }, trunkMerge: "handoff" },
      },
    });
    writeSettings(projectPath, { taskWorkflow: { git: { profile: "custom-local" } } });

    const settings = readGitSettings(tempDir("git-cwd"), { globalSettingsPath: globalPath, projectSettingsPath: projectPath });

    // profile: the project file names one; the global file's is overridden.
    expect(settings.profile).toBe("custom-local");
    // trunk: both keys come from the global file, the project file names none.
    expect(settings.trunk).toEqual({ develop: "dev", main: "trunk" });
    expect(trunkName(settings.trunk)).toBe("dev");
    // trunkMerge: no project key, so the global value stands.
    expect(settings.trunkMerge).toBe("handoff");
    expect(settings.diagnostics).toEqual([]);
  });

  test("reads the project file from the repository's .pi directory and the global file from the agent dir", () => {
    const agentDir = tempDir("git-agent");
    const repo = tempDir("git-repo");
    mkdirSync(join(repo, ".git"), { recursive: true });
    writeSettings(join(repo, ".pi", "settings.json"), { taskWorkflow: { git: { trunkMerge: "handoff" } } });
    writeSettings(join(agentDir, "settings.json"), {
      taskWorkflow: { git: { profile: "flat", trunkMerge: "local" } },
    });
    const previous = process.env.PI_CODING_AGENT_DIR;
    process.env.PI_CODING_AGENT_DIR = agentDir;
    try {
      const settings = readGitSettings(join(repo, "docs"));
      expect(settings.profile).toBe("flat");
      expect(settings.trunkMerge).toBe("handoff");
      expect(settings.diagnostics).toEqual([]);
    } finally {
      if (previous === undefined) delete process.env.PI_CODING_AGENT_DIR;
      else process.env.PI_CODING_AGENT_DIR = previous;
    }
  });

  test("an unknown value is a diagnostic and falls back to the documented default", () => {
    const { globalPath, projectPath } = settingsPair();
    writeSettings(projectPath, {
      taskWorkflow: {
        git: {
          trunkMerge: "squash",
          trunk: { develop: true, main: 7 },
        },
      },
    });

    const settings = readGitSettings(tempDir("git-cwd"), { globalSettingsPath: globalPath, projectSettingsPath: projectPath });

    expect(settings.trunkMerge).toBe("local");
    expect(settings.trunk).toEqual(GIT_SETTINGS_DEFAULTS.trunk);
    // Each malformed key is named, and none of them throws. `true` is not a
    // develop branch name: the key takes `false` or a name.
    expect(settings.diagnostics.join("\n")).toContain("trunkMerge");
    expect(settings.diagnostics.join("\n")).toContain("taskWorkflow.git.trunk.develop");
    expect(settings.diagnostics.join("\n")).toContain("taskWorkflow.git.trunk.main");
  });

  test("a malformed settings file is a diagnostic, not a crash", () => {
    const { globalPath, projectPath } = settingsPair();
    mkdirSync(dirname(projectPath), { recursive: true });
    writeFileSync(projectPath, "{ not json", "utf-8");

    const settings = readGitSettings(tempDir("git-cwd"), { globalSettingsPath: globalPath, projectSettingsPath: projectPath });

    expect(settings.profile).toBe("default");
    expect(settings.diagnostics.join("\n")).toContain("failed to read settings");
  });
});
