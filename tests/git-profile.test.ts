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

import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, test } from "vitest";

import {
  BUNDLED_PROFILES,
  bundledProfilesDir,
  gateDecision,
  loadProfile,
  phaseBrief,
} from "../src/core/git-profile.js";
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

// ─── The bundled profiles ───────────────────────────────────────────────────

/** The six workflow phases and the five implementation sub-agents. */
const PHASES = ["intake", "wayfinder", "to-spec", "to-tickets", "implement-ticket", "finalize-effort"];
const PLANNING_PHASES = ["intake", "wayfinder", "to-spec", "to-tickets"];
const BRANCH_PHASES = ["implement-ticket", "finalize-effort"];
const AGENTS = ["implement-preconditions", "tdd-worker", "slice-verifier", "deviation-reporter", "land-worker"];

/** A settings pair whose project file selects `profile`. */
function selecting(profile: string): { globalSettingsPath: string; projectSettingsPath: string } {
  const { globalPath, projectPath } = settingsPair();
  writeSettings(projectPath, { taskWorkflow: { git: { profile } } });
  return { globalSettingsPath: globalPath, projectSettingsPath: projectPath };
}

/** A copy of the package's own profile directory, for tests that break one file. */
function profileFixtureDir(): string {
  const dir = tempDir("profile-fixtures");
  for (const entry of readdirSync(bundledProfilesDir())) {
    copyFileSync(join(bundledProfilesDir(), entry), join(dir, entry));
  }
  return dir;
}

describe("bundled profiles", () => {
  test("both profiles ship as data and load with no configuration", () => {
    expect([...BUNDLED_PROFILES]).toEqual(["default", "flat"]);
    for (const name of BUNDLED_PROFILES) {
      const { profile, diagnostics } = loadProfile(name);
      expect(diagnostics).toEqual([]);
      expect(profile.name).toBe(name);
    }
  });

  test("both bundled profiles carry empty instruction fields and no branch for the planning phases", () => {
    for (const name of BUNDLED_PROFILES) {
      const { profile } = loadProfile(name);
      for (const phase of PLANNING_PHASES) {
        expect(profile.phases[phase], `${name} lists '${phase}'`).toBeDefined();
        expect(profile.phases[phase].branch).toBeUndefined();
        expect(profile.phases[phase].openInstructions ?? "").toBe("");
        expect(profile.phases[phase].closeInstructions ?? "").toBe("");
      }
      for (const phase of PHASES) {
        expect(profile.phases[phase].openInstructions ?? "", `${name}.${phase}`).toBe("");
        expect(profile.phases[phase].closeInstructions ?? "", `${name}.${phase}`).toBe("");
      }
    }
  });
});

// ─── The resolver: one brief per phase and profile ─────────────────────────

describe("the phase brief resolver", () => {
  test("default names the effort branch and its step for the implementation phase and the effort close", () => {
    for (const phase of BRANCH_PHASES) {
      const brief = phaseBrief(tempDir("git-cwd"), { name: phase, effort: "an-effort" }, selecting("default"));

      expect(brief.kind).toBe("phase");
      expect(brief.branch).toBe("effort/an-effort");
      // The step names the branch and the trunk it is created off.
      expect(brief.step).toContain("effort/an-effort");
      expect(brief.step).toContain("the trunk (main)");
      expect(brief.step).toContain(phase);
      expect(brief.diagnostics).toEqual([]);
    }
  });

  test("default carries no branch for the planning phases", () => {
    for (const phase of PLANNING_PHASES) {
      const brief = phaseBrief(tempDir("git-cwd"), { name: phase, effort: "an-effort" }, selecting("default"));

      expect(brief.kind).toBe("phase");
      expect(brief.branch).toBeNull();
      expect(brief.step).toBeNull();
      expect(brief.openInstructions).toBe("");
    }
  });

  test("default names the ticket branch for the five implementation agents", () => {
    for (const agent of AGENTS) {
      const brief = phaseBrief(
        tempDir("git-cwd"),
        { name: agent, effort: "an-effort", ticket: "a-ticket" },
        selecting("default"),
      );

      expect(brief.kind).toBe("agent");
      expect(brief.branch).toBe("ticket/a-ticket");
      // An agent's branch is created by the phase that dispatches it, never
      // by the agent itself, so an agent brief carries no step.
      expect(brief.step).toBeNull();
    }
  });

  test("flat resolves nothing for any phase or agent", () => {
    const deps = selecting("flat");
    for (const name of [...PHASES, ...AGENTS]) {
      const brief = phaseBrief(tempDir("git-cwd"), { name, effort: "an-effort", ticket: "a-ticket" }, deps);

      expect(brief.branch, name).toBeNull();
      expect(brief.step, name).toBeNull();
      expect(brief.closeGate, name).toBeNull();
      expect(brief.openInstructions, name).toBe("");
      expect(brief.closeInstructions, name).toBe("");
    }
  });

  test("the trunk a repository configures names the step's base", () => {
    const { globalPath, projectPath } = settingsPair();
    writeSettings(projectPath, {
      taskWorkflow: { git: { profile: "default", trunk: { develop: "dev", main: "main" } } },
    });

    const brief = phaseBrief(
      tempDir("git-cwd"),
      { name: "implement-ticket", effort: "an-effort" },
      { globalSettingsPath: globalPath, projectSettingsPath: projectPath },
    );

    expect(brief.step).toContain("the trunk (dev)");
  });

  test("a profile's instruction text reaches the brief", () => {
    const profilesDir = profileFixtureDir();
    writeFileSync(
      join(profilesDir, "custom.json"),
      JSON.stringify({
        name: "custom",
        phases: {
          wayfinder: { openInstructions: "Read the map before you start.", closeInstructions: "Record the decision." },
          "implement-ticket": { branch: "feature/{effort}", openInstructions: "Work the frontier." },
          "finalize-effort": { branch: "ticket/{ticket}" },
        },
        agents: {},
      }),
      "utf-8",
    );
    const deps = { ...selecting("custom"), profilesDir };

    const planning = phaseBrief(tempDir("git-cwd"), { name: "wayfinder", effort: "an-effort" }, deps);
    expect(planning.openInstructions).toBe("Read the map before you start.");
    expect(planning.closeInstructions).toBe("Record the decision.");
    expect(planning.branch).toBeNull();

    // A phase's template is resolved as written, and its step still names the
    // trunk the settings configure, not a hardcoded one.
    const implementation = phaseBrief(tempDir("git-cwd"), { name: "implement-ticket", effort: "an-effort" }, deps);
    expect(implementation.branch).toBe("feature/an-effort");
    expect(implementation.openInstructions).toBe("Work the frontier.");
  });
});

// ─── The gate decision ─────────────────────────────────────────────────────

describe("the gate decision", () => {
  test("passes on the required branch", () => {
    const decision = gateDecision(
      tempDir("git-cwd"),
      { name: "implement-ticket", effort: "an-effort", currentBranch: "effort/an-effort" },
      selecting("default"),
    );

    expect(decision.pass).toBe(true);
    expect(decision.branch).toBe("effort/an-effort");
    expect(decision.reason).toBe("");
  });

  test("passes when the profile requires no branch", () => {
    const planning = gateDecision(
      tempDir("git-cwd"),
      { name: "wayfinder", effort: "an-effort", currentBranch: "main" },
      selecting("default"),
    );
    expect(planning.pass).toBe(true);

    const flat = gateDecision(
      tempDir("git-cwd"),
      { name: "implement-ticket", effort: "an-effort", currentBranch: "main" },
      selecting("flat"),
    );
    expect(flat.pass).toBe(true);
    expect(flat.branch).toBeNull();
  });

  test("refuses off the required branch, naming both branches and the step", () => {
    const decision = gateDecision(
      tempDir("git-cwd"),
      { name: "implement-ticket", effort: "an-effort", currentBranch: "main" },
      selecting("default"),
    );

    expect(decision.pass).toBe(false);
    expect(decision.reason).toContain("main");
    expect(decision.reason).toContain("effort/an-effort");
    expect(decision.step).toContain("effort/an-effort");
  });
});

// ─── Fallbacks: a diagnostic and the documented behaviour, never a crash ───

describe("the profile fallbacks", () => {
  test("an unknown profile name is a diagnostic and falls back to default", () => {
    const dir = profileFixtureDir();
    const { profile, diagnostics } = loadProfile("no-such-profile", { profilesDir: dir });

    expect(profile.name).toBe("default");
    expect(diagnostics.join("\n")).toContain("no-such-profile");
  });

  test("a missing profile file is a diagnostic and falls back to default", () => {
    const dir = profileFixtureDir();
    rmSync(join(dir, "flat.json"));
    const { profile, diagnostics } = loadProfile("flat", { profilesDir: dir });

    expect(profile.name).toBe("default");
    expect(diagnostics.join("\n")).toContain("flat.json");
  });

  test("a malformed profile file is a diagnostic and falls back to default", () => {
    const dir = profileFixtureDir();
    writeFileSync(join(dir, "broken.json"), "{ not json", "utf-8");
    const { profile, diagnostics } = loadProfile("broken", { profilesDir: dir });

    expect(profile.name).toBe("default");
    expect(diagnostics.join("\n")).toContain("broken");
  });

  test("a profile whose shape is wrong is a diagnostic, not a crash", () => {
    const dir = profileFixtureDir();
    writeFileSync(join(dir, "wrongshape.json"), JSON.stringify({ name: "wrongshape", phases: [] }), "utf-8");
    const { profile, diagnostics } = loadProfile("wrongshape", { profilesDir: dir });

    // The fallback profile still answers: the implementation phase keeps the
    // effort branch the default profile gives it.
    expect(profile.name).toBe("default");
    expect(profile.phases["implement-ticket"].branch).toBe("effort/{effort}");
    expect(diagnostics.join("\n")).toContain("phases");
  });

  test("a profile name that is not a plain name is refused rather than resolved as a path", () => {
    const dir = profileFixtureDir();
    const { profile, diagnostics } = loadProfile("../../../etc/passwd", { profilesDir: dir });

    expect(profile.name).toBe("default");
    expect(diagnostics.join("\n")).toContain("passwd");
  });

  test("a package with no profile files at all still answers, with a diagnostic", () => {
    const dir = tempDir("empty-profiles");
    const { profile, diagnostics } = loadProfile("default", { profilesDir: dir });
    expect(profile.phases).toEqual({});
    expect(diagnostics.length).toBeGreaterThan(0);

    // The resolver falls through the same path: no branch, no crash.
    const brief = phaseBrief(
      tempDir("git-cwd"),
      { name: "implement-ticket", effort: "an-effort" },
      { ...selecting("default"), profilesDir: dir },
    );
    expect(brief.branch).toBeNull();
    expect(brief.diagnostics.length).toBeGreaterThan(0);
  });

  test("a malformed settings value is a diagnostic and falls back to the default profile", () => {
    const { globalPath, projectPath } = settingsPair();
    writeSettings(projectPath, { taskWorkflow: { git: { profile: 7 } } });

    const brief = phaseBrief(
      tempDir("git-cwd"),
      { name: "implement-ticket", effort: "an-effort" },
      { globalSettingsPath: globalPath, projectSettingsPath: projectPath },
    );

    expect(brief.profile).toBe("default");
    expect(brief.branch).toBe("effort/an-effort");
    expect(brief.diagnostics.join("\n")).toContain("profile");
  });
});
