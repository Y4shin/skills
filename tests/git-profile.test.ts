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
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
  BUNDLED_PROFILES,
  bundledProfilesDir,
  gateDecision,
  loadProfile,
  phaseBrief,
} from "../src/core/git-profile.js";
import { GIT_SETTINGS_DEFAULTS, readGitSettings, trunkName } from "../src/core/repo-gate.js";
import { SKILL_REGISTRY } from "../src/disclosure.js";
import { createTools } from "../src/pi.js";

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

  test("a bundled profile's merge value is a complete merge flag", () => {
    // The value rides into a shell command as-is, so `no-ff` would produce
    // `git merge no-ff <branch>` and fail. A flag has to carry its dashes.
    for (const name of BUNDLED_PROFILES) {
      const { profile } = loadProfile(name);
      if (profile.merge) {
        expect(profile.merge, `${name}.merge`).toMatch(/^--[a-z][a-z-]*$/);
      }
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
      // The step names what the phase does before dispatching this agent. The
      // agent never performs it: a worker expects the branch checked out, so
      // the caller that asks the brief is the one that creates it.
      expect(brief.step).toContain("create and check out ticket/a-ticket");
      expect(brief.step).toContain("off effort/an-effort");
      expect(brief.step).toContain(agent);
    }
  });

  test("a brief reports the trunk and the trunk-merge mode the close-out needs", () => {
    const { globalPath, projectPath } = settingsPair();
    writeSettings(projectPath, { taskWorkflow: { git: { trunkMerge: "handoff" } } });

    const brief = phaseBrief(
      tempDir("git-cwd"),
      { name: "finalize-effort", effort: "an-effort" },
      { globalSettingsPath: globalPath, projectSettingsPath: projectPath },
    );

    // The close-out merges into the trunk and reads the mode that decides
    // whether it merges locally or hands off, so the brief carries both.
    expect(brief.trunk).toBe("main");
    expect(brief.trunkMerge).toBe("handoff");
    // The profile's merge flag and push policy ride along, so the close-out
    // never restates them in prose.
    expect(brief.merge).toBe("--no-ff");
    expect(brief.push).toBe("always");
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

// ─── tw_phase_brief: the read-only brief any phase asks for before opening ──

describe("tw_phase_brief", () => {
  /** The session directory: a temp repo selecting a profile, nothing else. */
  function sessionDir(settings: Record<string, unknown> = {}): string {
    const dir = tempDir("brief-repo");
    writeSettings(join(dir, ".pi", "settings.json"), { taskWorkflow: settings });
    return dir;
  }

  /** The tool as an extension registers it: driven with a bare directory context. */
  async function brief(
    args: Record<string, unknown>,
    directory: string,
    extra: Record<string, unknown> = {},
  ): Promise<{ text: string; details: any }> {
    const tools = createTools() as unknown as Record<string, { execute: Function }>;
    const result = await tools.tw_phase_brief.execute(args, { directory, ...extra });
    expect(typeof result, "the brief tool answers with text plus details").toBe("object");
    return result as { text: string; details: any };
  }

  let previousAgentDir: string | undefined;

  beforeAll(() => {
    previousAgentDir = process.env.PI_CODING_AGENT_DIR;
    // An empty agent dir: the global settings of the machine running the
    // suite never leak into a brief.
    process.env.PI_CODING_AGENT_DIR = tempDir("brief-agent");
  });

  afterAll(() => {
    if (previousAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
    else process.env.PI_CODING_AGENT_DIR = previousAgentDir;
  });

  test("names the effort branch, the step that creates it off the trunk, and the instruction text", async () => {
    const { text, details } = await brief(
      { skill: "implement-ticket", effort: "configurable-git-workflow", ticket: "profile-data-and-phase-briefs" },
      sessionDir(),
    );

    expect(details.branch).toBe("effort/configurable-git-workflow");
    expect(details.branch_step).toContain("create and check out effort/configurable-git-workflow");
    expect(details.branch_step).toContain("the trunk (main)");
    // Both bundled profiles carry empty instruction fields, so the brief
    // reports that plainly rather than inventing text.
    expect(details.instructions).toBe("");
    expect(text).toContain("effort/configurable-git-workflow");
    expect(text).toContain("Instructions: none");
    expect(text).toContain("profile: default");
  });

  test("answers for an implementation agent: its branch and the step that creates it", async () => {
    const { text, details } = await brief(
      { skill: "tdd-worker", effort: "configurable-git-workflow", ticket: "workflow-prose" },
      sessionDir(),
    );

    // The phase creates the ticket branch before it dispatches the chain, so
    // the brief has to answer for the worker's row as well as a phase's.
    expect(details.kind).toBe("agent");
    expect(details.branch).toBe("ticket/workflow-prose");
    expect(details.branch_step).toContain("create and check out ticket/workflow-prose");
    expect(details.branch_step).toContain("off effort/configurable-git-workflow");
    expect(text).toContain("ticket/workflow-prose");
    expect(text).toContain("Step:");
  });

  test("carries the trunk and the trunk-merge mode the effort close acts on", async () => {
    const { details } = await brief(
      { skill: "finalize-effort", effort: "configurable-git-workflow" },
      sessionDir({ git: { trunk: { develop: "dev", main: "main" }, trunkMerge: "handoff" } }),
    );

    expect(details.trunk).toBe("dev");
    expect(details.trunk_merge).toBe("handoff");
    expect(details.merge).toBe("--no-ff");
    expect(details.push).toBe("always");
  });

  test("reports no branch requirement for a planning phase", async () => {
    const { text, details } = await brief(
      { skill: "wayfinder", effort: "configurable-git-workflow" },
      sessionDir(),
    );

    expect(details.branch).toBeNull();
    expect(details.branch_step).toBeNull();
    expect(text).toContain("Required branch: none");
    expect(text).toContain("requires no branch");
  });

  test("carries nothing for any phase when the repository selects flat", async () => {
    const dir = sessionDir({ git: { profile: "flat" } });
    for (const skill of PHASES) {
      const { text, details } = await brief({ skill, effort: "configurable-git-workflow", ticket: "a-ticket" }, dir);

      expect(details.branch, skill).toBeNull();
      expect(details.branch_step, skill).toBeNull();
      expect(details.close_gate, skill).toBeNull();
      expect(details.instructions, skill).toBe("");
      expect(text).toContain("Required branch: none");
    }
  });

  test("refuses a name that is neither a phase nor a gated agent, naming what it accepts", async () => {
    const tools = createTools() as unknown as Record<string, { execute: Function }>;
    const result = (await tools.tw_phase_brief.execute(
      { skill: "nonsense-skill", effort: "configurable-git-workflow" },
      { directory: sessionDir() },
    )) as { text: string; details: any };

    expect(result.details.reason).toContain("nonsense-skill");
    expect(result.text).toContain("Refused:");
    expect(result.text).toContain("wayfinder");
    expect(result.text).toContain("Legal next:");
    // An agent the profile gates answers; a name that is neither does not.
    expect(result.details.reason).toMatch(/phase|agent/);
  });

  test("reports a malformed setting as a diagnostic and answers from the default profile", async () => {
    const { text, details } = await brief(
      { skill: "implement-ticket", effort: "configurable-git-workflow" },
      sessionDir({ git: { profile: "flat", trunkMerge: "squash" } }),
    );

    // The malformed key falls back to the documented default, so the flat
    // selection still stands and the brief says so.
    expect(details.profile).toBe("flat");
    expect(details.branch).toBeNull();
    expect(details.diagnostics.join("\n")).toContain("trunkMerge");
    expect(text).toContain("Diagnostics:");
  });

  test("is declared in every state and belongs to no phase toolset", () => {
    const tools = createTools() as unknown as Record<string, { activeByDefault?: boolean }>;
    // A phase asks for its brief before it opens, so the tool cannot wait for
    // an opener to activate it.
    expect(tools.tw_phase_brief.activeByDefault).toBe(true);
    // And no toolset lists it, so its presence can never derive a phase as open.
    for (const entry of SKILL_REGISTRY) {
      expect(entry.toolset, entry.name).not.toContain("tw_phase_brief");
    }
  });
});

// ─── The push step the profile's policy renders ─────────────────────────────

/**
 * The push is a step the brief renders from the profile's push policy, not a
 * command the phase's prose carries: `always` names the command for the branch
 * the phase is on, and `never` (or a profile with no policy at all) names none,
 * so the step and the prose can never disagree about whether anything is pushed.
 */
describe("the push step follows the profile's push policy", () => {
  function sessionDir(settings: Record<string, unknown> = {}): string {
    const dir = tempDir("push-repo");
    writeSettings(join(dir, ".pi", "settings.json"), { taskWorkflow: settings });
    return dir;
  }

  /** A profile directory holding the bundled files plus one custom profile. */
  function customProfiles(push: unknown): string {
    const dir = profileFixtureDir();
    writeSettings(join(dir, "custom.json"), {
      name: "custom",
      ...(push === undefined ? {} : { push }),
      phases: { "implement-ticket": { branch: "effort/{effort}" }, "finalize-effort": { branch: "effort/{effort}" } },
    });
    return dir;
  }

  async function brief(args: Record<string, unknown>, dir: string, profilesDir?: string) {
    const tools = createTools() as unknown as Record<string, { execute: Function }>;
    const result = (await tools.tw_phase_brief.execute(
      args,
      profilesDir === undefined ? { directory: dir } : { directory: dir, profilesDir },
    )) as { text: string; details: any };
    return result;
  }

  test("an always policy puts the push command in the step, for the branch the phase is on", async () => {
    const { text, details } = await brief(
      { skill: "implement-ticket", effort: "live-effort", ticket: "one" },
      sessionDir(),
    );

    expect(details.push).toBe("always");
    expect(text).toContain("Push step: git push origin effort/live-effort.");
  });

  test("a never policy renders no push command at all", async () => {
    const { text, details } = await brief(
      { skill: "implement-ticket", effort: "live-effort", ticket: "one" },
      sessionDir({ git: { profile: "custom" } }),
      customProfiles("never"),
    );

    expect(details.push).toBe("never");
    expect(text).toContain("Push step: none; the profile's push policy is 'never', so nothing is pushed.");
    expect(text, "no push command appears under a never policy").not.toContain("git push");
  });

  test("a profile that names no push policy renders none either, and still names the branch", async () => {
    const { text, details } = await brief(
      { skill: "finalize-effort", effort: "live-effort" },
      sessionDir({ git: { profile: "flat" } }),
    );

    expect(details.push).toBeNull();
    expect(text).toContain("Push step: none");
    expect(text).not.toContain("git push");
  });

  test("a phase that requires no branch has nothing to push, and says so", async () => {
    const { text } = await brief({ skill: "wayfinder", effort: "live-effort" }, sessionDir());

    expect(text).toContain("Push step: none; 'wayfinder' requires no branch, so there is nothing to push.");
    expect(text).not.toContain("git push");
  });

  test("an implementation agent's brief carries no push step: the phase pushes, not the worker", async () => {
    const { text } = await brief(
      { skill: "tdd-worker", effort: "live-effort", ticket: "one" },
      sessionDir(),
    );

    expect(text).not.toContain("Push step");
  });
});
