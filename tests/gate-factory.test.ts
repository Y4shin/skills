/**
 * Factory-level gate tests for task-workflow.
 *
 * Drives the real extension factory with a stub ExtensionAPI to verify the
 * registration split by gate state: an ungated repo (personal) registers the
 * full tool surface, a gated one (work repo) registers exactly the passive
 * set, the skill-creator tools, and notify_user. Also pins the session-start
 * behavior of each state: the gate diagnostics and the peer-extension checks
 * fire in both, the transcript declared-set replay stays workflow-bound
 * (ungated only), and the strip plus invocation block hooks fire in gated
 * repos only.
 */

import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { ALWAYS_DECLARED, GATED_SKILL_NAMES, SKILL_REGISTRY, openSkillsIn } from "../src/disclosure.js";
import factory from "../src/pi.js";

// ─── Mock control for fail-open throw scenario ───────────────────────────────
//
// Most tests drive resolveGate through real temp repo fixtures. The mock
// defaults to passthrough so the real implementation runs. Setting mode to
// "throw" lets us assert fail-open behavior when detection throws.

const mockControl = vi.hoisted(() => ({
  mode: "passthrough" as "passthrough" | "throw",
}));

vi.mock("../src/core/repo-gate.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/core/repo-gate.js")>();
  return {
    ...original,
    resolveGate: (cwd: string) => {
      if (mockControl.mode === "throw") {
        throw new Error("gate detection failed");
      }
      return original.resolveGate(cwd);
    },
  };
});

// ─── Test helpers ────────────────────────────────────────────────────────────────────

const trackedRepos: string[] = [];

let globalSettings: { dir: string; cleanup: () => void } | undefined;

/**
 * The full tool surface an ungated (personal) repo registers, exactly: every
 * tw_* tool from the factory, skill-creator's bundled script tools, and
 * notify_user. The registered surface in an ungated repo is unchanged by the
 * gate-state split, so a deleted or added tool fails here. tw_phase_brief sits
 * with the dispatcher quartet because it is declared in every state too: a
 * phase asks for its brief before it opens.
 */
const FULL_TOOL_SURFACE = [
  "skill_discover",
  "skill_scaffold",
  "skill_validate",
  "tw_open",
  "tw_next",
  "tw_request_tool",
  "tw_close",
  "tw_phase_brief",
  "tw_show",
  "tw_get",
  "tw_list",
  "tw_finalizable",
  "tw_dependency_levels",
  "tw_frontier",
  "tw_map_finalizable",
  "tw_mark_done",
  "tw_resolve_uncertainty",
  "tw_state",
  "tw_state_set",
  "tw_context",
  "tw_migrate",
  "tw_finalize_map",
  "tw_write_section",
  "tw_write_spec",
  "tw_add_task",
  "tw_create_effort",
  "tw_add_ticket",
  "tw_split_ticket",
  "tw_mark_blocked",
  "tw_archive_effort",
  "tw_record_out_of_scope",
  "tw_write_architecture",
  "tw_write_changelog",
  "tw_write_changesets",
  "tw_write_review",
  "tw_write_task_note",
  "tw_write_ticket_note",
  "tw_feedback",
  "notify_user",
];

/**
 * The registered tool surface a gated (work) repo contributes, exactly:
 * the passive set (tw_open, tw_close, tw_feedback), skill-creator's three
 * bundled tools (inactive; the restricted tw_open discloses them there),
 * and notify_user (generic; it reads only the user's ntfy config). Every
 * other tw_* tool, including all writers and the dispatcher companions,
 * stays unregistered in a gated repo. Deliberately not named
 * GATED_REGISTERED_TOOLS: that constant in src/pi.ts is the tw_* passive
 * set alone, and this surface adds the skill-creator tools and notify_user.
 */
const GATED_TOOL_SURFACE = [
  "tw_open",
  "tw_close",
  "tw_feedback",
  "skill_validate",
  "skill_scaffold",
  "skill_discover",
  "notify_user",
];

interface StubExtensionAPI extends ExtensionAPI {
  tools: Array<{ name: string }>;
  handlers: Record<string, Array<(...args: any[]) => any>>;
  notifications: Array<{ message: string; level: string }>;
  activeTools: string[];
  setActiveTools(toolNames: string[]): void;
  getActiveTools(): string[];
  /** The one UI surface the extension touches; the stub records the notices. */
  ui: { notify(message: string, level: string): void };
}

// The stale gated-five strip fixture is gone: the strip reads the static
// manifest exported from src/disclosure.ts, imported above as
// GATED_SKILL_NAMES, so a manifest change updates these tests with it.

function buildSkillsXml(skillNames: string[]): string {
  const preamble = [
    "The following skills provide specialized instructions for specific tasks.",
    "Use the read tool to load a skill's file when the task matches its description.",
    "When a skill file references a relative path, resolve it against the skill directory (parent of SKILL.md / dirname of the path) and use that absolute path in tool commands.",
  ].join("\n");
  const skills = skillNames
    .map((name) =>
      [
        "  <skill>",
        `    <name>${name}</name>`,
        `    <description>${name} skill</description>`,
        `    <location>/path/to/${name}/SKILL.md</location>`,
        "  </skill>",
      ].join("\n"),
    )
    .join("\n");
  return [
    "PREFIX LINE 1",
    "PREFIX LINE 2",
    "",
    preamble,
    "",
    "<available_skills>",
    skills,
    "</available_skills>",
    "",
    "SUFFIX LINE 1",
    "SUFFIX LINE 2",
  ].join("\n");
}

/**
 * The shared disableOnRepo pattern: a QNCGmbH work remote matches it, the
 * personal Y4shin/skills remote does not.
 */
const WORK_REPO_PATTERN = ["^github\\.com[:/]QNCGmbH/.*$"];

/**
 * Create the global settings the gate reads and point the agent dir at
 * them: the shared classification seam, so a test body only picks a repo.
 */
function useGlobalSettings(disableOnRepo: string[] = WORK_REPO_PATTERN): void {
  globalSettings = makeGlobalSettings(disableOnRepo);
  process.env.PI_CODING_AGENT_DIR = globalSettings.dir;
}

function setupWorkRepo(): string {
  useGlobalSettings();
  const repo = makeRepo("git@github.com:QNCGmbH/openai.git");
  process.chdir(repo);
  return repo;
}

function setupPersonalRepo(): string {
  useGlobalSettings();
  const repo = makeRepo("https://github.com/Y4shin/skills.git");
  // An initialized tree: the lockdown protects it. The bootstrap exemption
  // (an unstamped tree) has its own test.
  mkdirSync(join(repo, "docs", "tasks"), { recursive: true });
  writeFileSync(join(repo, "docs", "tasks", "state.yaml"), "schema_version: 5\nmap: null\ntask: null\n");
  process.chdir(repo);
  return repo;
}

/**
 * A prose file the doc-content tests pin, read from the working tree the
 * factory tests run in: the one read seam behind readRepoGatingDoc and the
 * README / skill-creator-reference doc-content test.
 */
function readRepoDoc(...segments: string[]): string {
  return readFileSync(join(process.cwd(), ...segments), "utf-8");
}

/**
 * The narrative contract the doc tests pin: docs/repo-gating.md, read
 * from the working tree the factory tests run in.
 */
function readRepoGatingDoc(): string {
  return readRepoDoc("docs", "repo-gating.md");
}

function createStub(): StubExtensionAPI {
  const tools: Array<{ name: string }> = [];
  const handlers: Record<string, Array<(...args: any[]) => any>> = {};
  const notifications: Array<{ message: string; level: string }> = [];
  const activeTools: string[] = [];

  return {
    tools,
    handlers,
    notifications,
    registerTool(tool: any) {
      tools.push(tool);
    },
    on(event: string, handler: (...args: any[]) => any) {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
    },
    getAllTools() {
      return tools;
    },
    setActiveTools(toolNames: string[]) {
      activeTools.splice(0, activeTools.length, ...toolNames);
    },
    getActiveTools() {
      return [...activeTools];
    },
    ui: {
      notify(message: string, level: string) {
        notifications.push({ message, level });
      },
    },
  } as unknown as StubExtensionAPI;
}

function makeRepo(originUrl: string): string {
  const dir = join(tmpdir(), "gate-factory-repo-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8));
  mkdirSync(join(dir, ".git"), { recursive: true });
  writeFileSync(
    join(dir, ".git", "config"),
    `[remote "origin"]\n\turl = ${originUrl}\n`,
  );
  trackedRepos.push(dir);
  return dir;
}

function makeGlobalSettings(disableOnRepo: string[]): { dir: string; cleanup: () => void } {
  const dir = join(tmpdir(), "gate-factory-global-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8));
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "settings.json"),
    JSON.stringify({ taskWorkflow: { disableOnRepo } }),
  );
  return {
    dir,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("factory gate", () => {
  let previousCwd: string;
  let previousAgentDir: string | undefined;

  beforeEach(() => {
    previousCwd = process.cwd();
    previousAgentDir = process.env.PI_CODING_AGENT_DIR;
    trackedRepos.length = 0;
    mockControl.mode = "passthrough";
  });

  afterEach(() => {
    process.chdir(previousCwd);
    if (previousAgentDir === undefined) {
      delete process.env.PI_CODING_AGENT_DIR;
    } else {
      process.env.PI_CODING_AGENT_DIR = previousAgentDir;
    }
    if (globalSettings) {
      globalSettings.cleanup();
      globalSettings = undefined;
    }
    for (const repo of trackedRepos) {
      rmSync(repo, { recursive: true, force: true });
    }
    trackedRepos.length = 0;
    mockControl.mode = "passthrough";
  });

  test("work repo (gate active) registers exactly the passive set, the skill-creator tools, and notify_user", () => {
    setupWorkRepo();

    const stub = createStub();
    factory(stub);

    const names = stub.tools.map((t) => t.name);
    // The registered surface in a gated repo, exactly: a missing, extra, or
    // stale tool (a writer, a dispatcher companion) fails here.
    expect([...names].sort()).toEqual([...GATED_TOOL_SURFACE].sort());
  });

  test("gated registration keeps the opener and closer always-declared and the rest inactive", () => {
    setupWorkRepo();

    const stub = createStub();
    factory(stub);

    const byName = new Map(stub.tools.map((t: any) => [t.name, t]));
    // The opener is the activation path in a gated repo too (for the one kept
    // discipline, skill-creator), and the closer is declared in every state,
    // so both ride the same always-declared shape as in an ungated repo. The
    // feedback wrapper and the skill-creator tools register inactive, exactly
    // as in an ungated repo: a phase's disclosure activates them.
    expect(byName.get("tw_open")?.defaultActive, "tw_open is declared in every state").toBe(true);
    expect(byName.get("tw_close")?.defaultActive, "tw_close is declared in every state").toBe(true);
    for (const name of ["tw_feedback", "skill_validate", "skill_scaffold", "skill_discover"]) {
      expect(byName.get(name)?.defaultActive, `${name} is off until an opener activates it`).toBe(false);
    }
    for (const name of GATED_TOOL_SURFACE.filter((n) => n !== "notify_user")) {
      expect(byName.get(name)?.exposure, `${name} is direct, never deferred`).toBe("direct");
    }
  });

  test("personal repo registers the full tool surface", () => {
    setupPersonalRepo();

    const stub = createStub();
    factory(stub);

    const names = stub.tools.map((t) => t.name);
    // The shrunken registered surface, exactly: a deleted tool still
    // registered fails here.
    expect([...names].sort()).toEqual([...FULL_TOOL_SURFACE].sort());
  });

  test("work repo (gate active) still emits the peer-extension warnings", async () => {
    const repo = setupWorkRepo();

    const stub = createStub();
    factory(stub);

    const sessionStartHandlers = stub.handlers["session_start"];
    expect(sessionStartHandlers).toBeDefined();
    expect(sessionStartHandlers.length).toBe(1);

    await sessionStartHandlers[0]({ type: "session_start", reason: "startup" }, { cwd: repo, ui: stub.ui });

    const messages = stub.notifications.map((n) => n.message);
    expect(messages).toContain("task-workflow gate active: work repo matched disableOnRepo pattern");
    // The peer checks fire in a gated repo too: tw_feedback registers there
    // (claimed by the shipped subagent allowlists) and the subagents launch
    // there, so a missing peer is as diagnosable as in a personal repo.
    expect(messages).toContain("pi-subagents is not installed. Install it with: pi install npm:pi-subagents");
    const telemetry = messages.find((m) => m.startsWith("pi-telemetry is not installed."));
    expect(telemetry).toBeDefined();
    expect(telemetry).toContain("pi install npm:@y4shin/pi-telemetry");
    expect(telemetry).toMatch(/allowlist/);
    // Verified against the installed pi-subagents 0.84.0 source: every plain
    // name in an agent's tools allowlist becomes a required child tool, and
    // the child's agent_start hook fails the run when a required tool never
    // registers ("requested unavailable child tools"). The warning states
    // that consequence, not the 0.34.0-era "the chain still launches".
    expect(telemetry).toMatch(/0\.84\.0/);
    expect(telemetry).toMatch(/requested unavailable child tools/);
    expect(telemetry).not.toMatch(/still launches/);
  });

  test("work repo (gate active) skips the transcript declared-set replay on resume", async () => {
    const repo = setupWorkRepo();

    const stub = createStub();
    factory(stub);

    // The declared set is the open/close engine's state, which only exists
    // where the workflow runs: a gated repo never replays it, whatever the
    // session-start reason. A regression here would also throw, since the
    // replay reads the session transcript through the pi-ai helper.
    const setActiveTools = vi.spyOn(stub, "setActiveTools");
    await stub.handlers["session_start"][0](
      { type: "session_start", reason: "resume" },
      { cwd: repo, ui: stub.ui, sessionManager: { buildSessionProjection: () => ({ messages: [] }) } },
    );
    expect(setActiveTools).not.toHaveBeenCalled();
  });

  test("personal repo emits session_start peer warnings", async () => {
    const repo = setupPersonalRepo();

    const stub = createStub();
    factory(stub);

    const sessionStartHandlers = stub.handlers["session_start"];
    await sessionStartHandlers[0]({ type: "session_start", reason: "startup" }, { cwd: repo, ui: stub.ui });

    const messages = stub.notifications.map((n) => n.message);
    expect(messages).toContain("pi-subagents is not installed. Install it with: pi install npm:pi-subagents");
    // The warning names why the shipped chains cannot run without it: the
    // shipped agents list submit_feedback (a pi-telemetry tool) in their
    // tools allowlist, and on pi-subagents 0.84.0 an allowlisted tool that
    // never registers fails the child's run at agent start, so without
    // pi-telemetry every chain child fails instead of recording feedback.
    const telemetry = messages.find((m) => m.startsWith("pi-telemetry is not installed."));
    expect(telemetry).toBeDefined();
    expect(telemetry).toContain("pi install npm:@y4shin/pi-telemetry");
    expect(telemetry).toMatch(/allowlist/);
    expect(telemetry).toMatch(/0\.84\.0/);
    expect(telemetry).toMatch(/requested unavailable child tools/);
    expect(telemetry).not.toMatch(/still launches/);
  });

  test("detection throw falls open and registers all tools", async () => {
    mockControl.mode = "throw";

    const stub = createStub();
    factory(stub);

    const names = stub.tools.map((t) => t.name);
    for (const name of FULL_TOOL_SURFACE) {
      expect(names).toContain(name);
    }

    const sessionStartHandlers = stub.handlers["session_start"];
    await sessionStartHandlers[0]({ type: "session_start", reason: "startup" }, { cwd: process.cwd(), ui: stub.ui });

    expect(stub.notifications.some((n) => n.message.includes("gate detection failed"))).toBe(true);
  });

  test("factory re-detects gate when cwd changes between invocations", () => {
    useGlobalSettings();
    const workRepo = makeRepo("git@github.com:QNCGmbH/openai.git");
    const personalRepo = makeRepo("https://github.com/Y4shin/skills.git");

    const workStub = createStub();
    process.chdir(workRepo);
    factory(workStub);
    expect([...workStub.tools.map((t) => t.name)].sort()).toEqual([...GATED_TOOL_SURFACE].sort());

    const personalStub = createStub();
    process.chdir(personalRepo);
    factory(personalStub);
    const names = personalStub.tools.map((t) => t.name);
    expect(names).toHaveLength(FULL_TOOL_SURFACE.length);
    for (const name of FULL_TOOL_SURFACE) {
      expect(names).toContain(name);
    }
  });

  describe("before_agent_start", () => {
    test("work repo (gate active) registers the strip handler on before_agent_start", () => {
      setupWorkRepo();

      const stub = createStub();
      factory(stub);

      expect(stub.handlers["before_agent_start"]).toBeDefined();
      expect(stub.handlers["before_agent_start"].length).toBe(1);
    });
  });

  describe("repo-gating doc resync (the narrowed gate)", () => {
    // The narrative contract (the docs seam): docs/repo-gating.md must
    // describe the registered surface the implementation tickets pinned,
    // not the pre-narrowing behavior. These assertions pin the resynced
    // description; a regression to "no tools register" phrasing fails here.

    test("documents the registered passive surface by name", () => {
      const content = readRepoGatingDoc();
      for (const name of [
        "tw_open",
        "tw_close",
        "tw_feedback",
        "notify_user",
        "skill_validate",
        "skill_scaffold",
        "skill_discover",
      ]) {
        expect(content, `the doc must name ${name}`).toContain(name);
      }
    });

    test("names the gated skill set and the one kept registry entry", () => {
      const content = readRepoGatingDoc();
      for (const name of [
        "task-workflow-overview",
        "setup-workflow",
        "intake",
        "wayfinder",
        "to-spec",
        "to-tickets",
        "implement-ticket",
        "finalize-effort",
        "task-workflow-doctor",
        "workflow-failure",
        "skill-creator",
      ]) {
        expect(content, `the doc must name ${name}`).toContain(name);
      }
    });

    test("states the tw_open restriction and that the refusal covers the whole manifest", () => {
      const content = readRepoGatingDoc();
      expect(content).toMatch(/restrict/i);
      expect(content).toMatch(/whole manifest|entire manifest|all ten/i);
    });

    test("scopes the /help and skill-list limitation to the gated workflow skills", () => {
      const content = readRepoGatingDoc();
      // Durably documented here: the limitation originally lived in a
      // (now-archived) task doc; this doc sits outside any per-task tree
      // and is the stable reference.
      expect(content).toContain("/help");
      expect(content).toContain("skill-list");
      // Re-scoped: the gap now covers the ten gated skills, not every skill
      // the package ships (skill-creator is not stripped).
      expect(content).toMatch(/\bten\b|\b10\b/);
    });

    test("states the write lockdown keys on the workflow being enabled", () => {
      const content = readRepoGatingDoc();
      expect(content).toMatch(/workflow (is|being) enabled/i);
    });

    test("re-states the classification contract as unchanged", () => {
      const content = readRepoGatingDoc();
      expect(content).toContain("disableOnRepo");
      expect(content).toContain("Truth table");
      expect(content).toMatch(/unchanged/i);
    });

    test("states the verified pi-subagents launch behavior", () => {
      // Verified against the installed pi-subagents 0.84.0 source: every
      // plain name in an agent's tools allowlist becomes a required child
      // tool, and the child's agent_start hook fails the run when a required
      // tool never registers. The doc states that shape version-pinned, not
      // the 0.34.0-era no-launch-check record.
      const content = readRepoGatingDoc();
      expect(content).toMatch(/0\.84\.0/);
      expect(content).toMatch(/requested\s+unavailable\s+child\s+tools/);
      expect(content).toMatch(/agent start/i);
      expect(content).not.toMatch(/still launches|silently ignores|does not check the allowlist/i);
    });

    test("carries the version-pinned launch shape in the README and the skill-creator reference", () => {
      // The same correction propagated beyond docs/repo-gating.md: the
      // README's install paragraph and skill-creator's target-pi reference
      // must state the 0.84.0 shape, not the superseded 0.34.0 record.
      const readme = readRepoDoc("README.md");
      const targetPi = readRepoDoc(
        "skills",
        "engineering",
        "skill-creator",
        "references",
        "target-pi.md",
      );
      for (const content of [readme, targetPi]) {
        expect(content).toMatch(/0\.84\.0/);
        expect(content).toMatch(/requested\s+unavailable\s+child\s+tools/);
        expect(content).not.toMatch(/still launches|silently ignores|does not check the allowlist/i);
      }
    });
  });

  describe("input skill invocation gate", () => {
    test("work repo blocks /skill:<gated-name> and notifies", async () => {
      setupWorkRepo();

      const stub = createStub();
      factory(stub);

      const inputHandlers = stub.handlers["input"];
      expect(inputHandlers).toBeDefined();
      expect(inputHandlers.length).toBe(1);

      const result = await inputHandlers[0](
        { type: "input", text: "/skill:implement-ticket", source: "interactive" },
        { ui: stub.ui },
      );

      expect(result).toEqual({ action: "handled" });
      expect(stub.notifications).toContainEqual({
        message: "task-workflow is gated in this work repo; not loading implement-ticket",
        level: "warning",
      });
    });

    test("work repo blocks /skill:<gated-name> with trailing args", async () => {
      setupWorkRepo();

      const stub = createStub();
      factory(stub);

      const inputHandlers = stub.handlers["input"];
      const result = await inputHandlers[0](
        { type: "input", text: "/skill:implement-ticket some args", source: "interactive" },
        { ui: stub.ui },
      );

      expect(result).toEqual({ action: "handled" });
      expect(stub.notifications).toContainEqual({
        message: "task-workflow is gated in this work repo; not loading implement-ticket",
        level: "warning",
      });
    });

    test("work repo passes through /skill:<non-gated-name>", async () => {
      setupWorkRepo();

      const stub = createStub();
      factory(stub);

      const inputHandlers = stub.handlers["input"];
      const result = await inputHandlers[0](
        { type: "input", text: "/skill:oracle", source: "interactive" },
        { ui: stub.ui },
      );

      expect(result).toEqual({ action: "continue" });
      expect(stub.notifications).toHaveLength(0);
    });

    test("work repo passes through /skill:<non-manifest package skill>", async () => {
      setupWorkRepo();

      const stub = createStub();
      factory(stub);

      // tdd ships in pi.skills but is not a workflow skill: the invocation
      // block reads the static manifest, not the package's whole skill list.
      const inputHandlers = stub.handlers["input"];
      const result = await inputHandlers[0](
        { type: "input", text: "/skill:tdd", source: "interactive" },
        { ui: stub.ui },
      );

      expect(result).toEqual({ action: "continue" });
      expect(stub.notifications).toHaveLength(0);
    });

    test("work repo blocks /skill:task-workflow-doctor, a manifest name with no registry entry", async () => {
      setupWorkRepo();

      const stub = createStub();
      factory(stub);

      const inputHandlers = stub.handlers["input"];
      const result = await inputHandlers[0](
        { type: "input", text: "/skill:task-workflow-doctor", source: "interactive" },
        { ui: stub.ui },
      );

      expect(result).toEqual({ action: "handled" });
      expect(stub.notifications).toContainEqual({
        message: "task-workflow is gated in this work repo; not loading task-workflow-doctor",
        level: "warning",
      });
    });

    test("work repo passes through non-/skill: input", async () => {
      setupWorkRepo();

      const stub = createStub();
      factory(stub);

      const inputHandlers = stub.handlers["input"];
      const result = await inputHandlers[0](
        { type: "input", text: "/help", source: "interactive" },
        { ui: stub.ui },
      );

      expect(result).toEqual({ action: "continue" });
      expect(stub.notifications).toHaveLength(0);
    });

    test("personal repo does not register the input handler", async () => {
      setupPersonalRepo();

      const stub = createStub();
      factory(stub);

      expect(stub.handlers["input"]).toBeUndefined();
    });
  });

  describe("before_agent_start skill strip", () => {
    test("work repo strips exactly the manifest skills and leaves the rest intact", async () => {
      setupWorkRepo();

      const stub = createStub();
      factory(stub);

      // The manifest's 10 workflow skills go; a non-manifest package skill
      // (tdd) and a foreign skill (oracle) stay.
      const fixture = buildSkillsXml([...GATED_SKILL_NAMES, "oracle", "tdd"]);
      const result = await stub.handlers["before_agent_start"][0](
        { systemPrompt: fixture },
        { ui: stub.ui },
      );

      expect(result).toBeDefined();
      for (const name of GATED_SKILL_NAMES) {
        expect(result.systemPrompt).not.toContain(`<name>${name}</name>`);
      }
      expect(result.systemPrompt).toContain("<name>oracle</name>");
      expect(result.systemPrompt).toContain("<name>tdd</name>");
      expect(result.systemPrompt).toContain("<available_skills>");
      expect(result.systemPrompt).toContain("PREFIX LINE 1");
      expect(result.systemPrompt).toContain("SUFFIX LINE 2");
    });

    test("work repo leaves a non-manifest package skill in the prompt", async () => {
      setupWorkRepo();

      const stub = createStub();
      factory(stub);

      // tdd and research ship in pi.skills but are not workflow skills: the
      // static manifest gates exactly the 10, so the strip leaves them alone
      // while a manifest name goes.
      const fixture = buildSkillsXml(["tdd", "research", "wayfinder"]);
      const result = await stub.handlers["before_agent_start"][0](
        { systemPrompt: fixture },
        { ui: stub.ui },
      );

      expect(result.systemPrompt).toContain("<name>tdd</name>");
      expect(result.systemPrompt).toContain("<name>research</name>");
      expect(result.systemPrompt).not.toContain("<name>wayfinder</name>");
    });

    test("work repo removes the whole skills block when only manifest skills are present", async () => {
      setupWorkRepo();

      const stub = createStub();
      factory(stub);

      const fixture = buildSkillsXml([...GATED_SKILL_NAMES]);
      const result = await stub.handlers["before_agent_start"][0](
        { systemPrompt: fixture },
        { ui: stub.ui },
      );

      expect(result.systemPrompt).not.toContain("<available_skills>");
      expect(result.systemPrompt).not.toContain("The following skills");
      expect(result.systemPrompt).toBe(
        ["PREFIX LINE 1", "PREFIX LINE 2", "", "SUFFIX LINE 1", "SUFFIX LINE 2"].join("\n"),
      );
    });

    test("work repo emits a diagnostic and leaves prompt unchanged when no available_skills block exists", async () => {
      setupWorkRepo();

      const stub = createStub();
      factory(stub);

      const fixture = "NO SKILLS BLOCK";
      const result = await stub.handlers["before_agent_start"][0](
        { systemPrompt: fixture },
        { ui: stub.ui },
      );

      expect(result.systemPrompt).toBe(fixture);
      expect(
        stub.notifications.some((n) =>
          n.message.includes("skill-strip: expected an <available_skills> block"),
        ),
      ).toBe(true);
      expect(stub.notifications.some((n) => n.level === "warning")).toBe(true);
    });

    test("work repo does not strip skill names that are only substrings of gated names", async () => {
      setupWorkRepo();

      const stub = createStub();
      factory(stub);

      const fixture = buildSkillsXml(["way", "task", "oracle"]);
      const result = await stub.handlers["before_agent_start"][0](
        { systemPrompt: fixture },
        { ui: stub.ui },
      );

      expect(result.systemPrompt).toContain("<name>way</name>");
      expect(result.systemPrompt).toContain("<name>task</name>");
      expect(result.systemPrompt).toContain("<name>oracle</name>");
    });

    test("personal repo does not register the strip handler", () => {
      const repo = setupPersonalRepo();

      const stub = createStub();
      factory(stub);

      // The guidelines injection hook is gone: a personal repo registers no
      // before_agent_start handler at all, strip included.
      expect(stub.handlers["before_agent_start"]).toBeUndefined();
    });
  });

  // ── The gated tw_open restriction (tw-open-gated-restriction) ──────────────

  describe("the gated tw_open restriction", () => {
    /** The registered tw_open tool definition, or undefined. */
    function registeredTwOpen(stub: StubExtensionAPI): any {
      return stub.tools.find((t: any) => t.name === "tw_open");
    }

    test("work repo: tw_open's parameter schema offers only the non-gated registry entries", () => {
      setupWorkRepo();

      const stub = createStub();
      factory(stub);

      const twOpen = registeredTwOpen(stub);
      expect(twOpen).toBeDefined();
      const skill = (twOpen.parameters as any)?.properties?.skill;
      expect(skill, "tw_open's schema carries the skill parameter").toBeDefined();
      // Enumerated narrowing: a gated name never appears in the offered
      // surface, so the model cannot even see a hopeless value.
      for (const name of GATED_SKILL_NAMES) {
        expect(skill.description, `the gated schema must not offer '${name}'`).not.toContain(name);
      }
      expect(skill.description).toContain("skill-creator");
    });

    test("work repo: opening skill-creator discloses its toolset exactly as in an ungated repo", async () => {
      const repo = setupWorkRepo();

      const stub = createStub();
      factory(stub);
      stub.setActiveTools(["tw_open", "tw_close"]);

      const twOpen = registeredTwOpen(stub);
      const result = await twOpen.execute(
        "t2",
        { skill: "skill-creator", effort: "ready-effort" },
        undefined,
        undefined,
        { cwd: repo, ui: stub.ui },
      );

      // The one kept discipline opens in a gated repo too: its bundled tools
      // plus the shared reads activate, matching the ungated experience.
      expect(result.details.opened).toBe(true);
      expect(stub.getActiveTools()).toEqual(
        expect.arrayContaining([
          "tw_open",
          "tw_close",
          "tw_show",
          "skill_validate",
          "skill_scaffold",
          "skill_discover",
          "tw_feedback",
        ]),
      );
    });

    test("work repo: tw_open refuses a workflow skill with the refused-outcome shape and notifies", async () => {
      const repo = setupWorkRepo();

      const stub = createStub();
      factory(stub);
      // The declared state in a gated repo: the opener and the closer.
      stub.setActiveTools(["tw_open", "tw_close"]);

      const twOpen = registeredTwOpen(stub);
      const result = await twOpen.execute(
        "t1",
        { skill: "wayfinder", effort: "ready-effort" },
        undefined,
        undefined,
        { cwd: repo, ui: stub.ui },
      );

      const text = result.content[0].text as string;
      expect(text).toMatch(/^Refused:/);
      expect(text).toContain("gated");
      expect(result.details.opened).toBe(false);
      expect(result.details.reason).toContain("gated");
      expect(result.details.legal_next).toEqual(["tw_open skill-creator"]);
      // A refused open activates nothing.
      expect(stub.getActiveTools()).toEqual(["tw_open", "tw_close"]);
      // A notify in the spirit of the skill-invocation gate: same sentence
      // family, warning level.
      expect(stub.notifications).toContainEqual({
        message: "task-workflow is gated in this work repo; not opening wayfinder",
        level: "warning",
      });
    });

    test("personal repo: tw_open is unchanged", async () => {
      const repo = setupPersonalRepo();

      const stub = createStub();
      factory(stub);

      const twOpen = registeredTwOpen(stub);
      // The ungated schema still offers every registry entry.
      const skill = (twOpen.parameters as any)?.properties?.skill;
      for (const entry of SKILL_REGISTRY) {
        expect(skill.description, `the ungated schema must still offer '${entry.name}'`).toContain(entry.name);
      }
      // The ungated opener runs the phase gates, not the gated refusal: the
      // refusal here is the phase gate's, and no gated notify fires.
      const result = await twOpen.execute(
        "t3",
        { skill: "wayfinder", effort: "ready-effort" },
        undefined,
        undefined,
        { cwd: repo, ui: stub.ui },
      );
      expect(result.details.opened).toBe(false);
      expect(result.details.reason).toContain("no live effort");
      expect(stub.notifications.some((n) => n.message.includes("not opening"))).toBe(false);
    });
  });

  // ── Disclosure soundness in a gated repo (tw-open-gated-restriction) ──────

  describe("the open-set derivation in a gated repo", () => {
    test("cannot derive a workflow phase as open from the passive active set", () => {
      setupWorkRepo();

      const stub = createStub();
      factory(stub);

      // The passive active set: everything a gated repo can ever have active.
      // The declared set is what registration marks defaultActive (the opener
      // and the closer); the only toolset an open there can activate is the
      // non-gated registry entries' (today skill-creator's), since a workflow
      // phase never opens and tw_request_tool never registers to grant more.
      const declared = stub.tools.filter((t: any) => t.defaultActive).map((t: any) => t.name);
      const activatable = SKILL_REGISTRY.filter((e) => !GATED_SKILL_NAMES.includes(e.name)).flatMap(
        (e) => e.toolset,
      );
      const passive = [...new Set([...declared, ...activatable])];

      // The idle declared set derives nothing.
      expect(openSkillsIn(declared).size, "the idle declared set opens nothing").toBe(0);

      // The maximal passive set derives exactly the skill that genuinely
      // opened, and never a workflow phase: a transcript replay that restored
      // the whole passive set would still not manufacture an open phase.
      const open = openSkillsIn(passive);
      for (const name of GATED_SKILL_NAMES) {
        expect(open.has(name), `${name} must not derive as open in a gated repo`).toBe(false);
      }
      expect([...open].sort()).toEqual(["skill-creator"]);
    });
  });

  test("registered tw_ tools derive their label from the tw_ prefix", () => {
    setupPersonalRepo();
    const stub = createStub();
    factory(stub);

    const labels = new Map(stub.tools.map((t: any) => [t.name, t.label]));
    for (const name of FULL_TOOL_SURFACE) {
      const suffix = name.replace(/^tw_/, "");
      const expected = suffix.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      expect(labels.get(name)).toBe(expected);
    }
  });

  describe("disclosure registration", () => {
    test("the always-declared tools register always-declared; every other workflow tool registers gated", () => {
      setupPersonalRepo();
      const stub = createStub();
      factory(stub);

        const byName = new Map(stub.tools.map((t: any) => [t.name, t]));
      for (const name of ALWAYS_DECLARED) {
        expect(byName.get(name)?.defaultActive, `${name} is declared in every state`).toBe(true);
        expect(byName.get(name)?.exposure, `${name} is direct`).toBe("direct");
      }
      // The bypass-free combination the prototype proved: direct (never
      // reachable through tool_search) and off until the opener activates it.
      // Everything declared in every state (the dispatcher quartet and the
      // phase brief) is the stated exception.
      for (const name of FULL_TOOL_SURFACE.filter(
        (n) => n.startsWith("tw_") && !(ALWAYS_DECLARED as readonly string[]).includes(n),
      )) {
        expect(byName.get(name)?.defaultActive, `${name} is off until an opener activates it`).toBe(false);
        expect(byName.get(name)?.exposure, `${name} is direct, never deferred`).toBe("direct");
      }
    });
  });

  describe("write lockdown guard", () => {
    /** Fire the registered tool_call guard and fail loudly if it is absent. */
    function fireGuard(
      stub: StubExtensionAPI,
      cwd: string,
      toolName: string,
      input: Record<string, unknown>,
    ): Promise<any> {
      const handlers = stub.handlers["tool_call"];
      expect(handlers, "the guard must register a tool_call handler").toBeDefined();
      expect(handlers.length).toBe(1);
      return handlers[0](
        { type: "tool_call", toolCallId: "guard-1", toolName, input },
        { cwd, ui: stub.ui },
      );
    }

    test("refuses write and edit under docs/tasks for relative and absolute paths", async () => {
      const repo = setupPersonalRepo();

      const stub = createStub();
      factory(stub);

      const blockedPaths = [
        "docs/tasks/effort-one/map.md",
        "docs/tasks/effort-one/tasks/research/task.md",
        // The changelog sits under the tree, so the built-ins are refused there
        // too and the changelog writer stays the only writer of it.
        "docs/tasks/CHANGELOG.md",
        // Normalized before the containment check: traversal cannot slip past.
        "docs/../docs/tasks/effort-one/map.md",
        join(repo, "docs/tasks/effort-one/map.md"),
      ];
      for (const path of blockedPaths) {
        const result = await fireGuard(stub, repo, "write", { path, content: "x" });
        expect(result, `write '${path}' must be blocked`).toMatchObject({ block: true });
        expect(result.reason, `write '${path}' must carry the lockdown reason`).toContain("write lockdown");
      }

      const editPaths = [
        "docs/tasks/effort-one/tickets/one/ticket.md",
        join(repo, "docs/tasks/effort-one/tickets/one/ticket.md"),
      ];
      for (const path of editPaths) {
        const result = await fireGuard(stub, repo, "edit", { path, edits: [] });
        expect(result, `edit '${path}' must be blocked`).toMatchObject({ block: true });
        expect(result.reason, `edit '${path}' must carry the lockdown reason`).toContain("write lockdown");
      }
    });

    test("the lockdown registers when the workflow is enabled: one handler in a personal repo, none in a gated repo", () => {
      // The guard keys on the workflow-enabled condition, not on the raw gate
      // boolean: wherever the workflow runs, the named tw_* writers are the
      // only writers of the tree. Today the two coincide, so the handler
      // registers exactly in the ungated shape.
      setupPersonalRepo();
      const personalStub = createStub();
      factory(personalStub);
      expect(personalStub.handlers["tool_call"]).toBeDefined();
      expect(personalStub.handlers["tool_call"].length).toBe(1);

      setupWorkRepo();
      const workStub = createStub();
      factory(workStub);
      expect(workStub.handlers["tool_call"]).toBeUndefined();
    });

    test("blocks while a toolset is open, independent of the active tool set", async () => {
      const repo = setupPersonalRepo();

      const stub = createStub();
      factory(stub);

      // Simulate an open phase toolset: the declared active set now carries
      // the built-in write tool plus a phase toolset, the shape setActiveTools
      // leaves behind while a skill is open.
      stub.setActiveTools(["write", "edit", "tw_open", "tw_next", "tw_show"]);
      expect(stub.getActiveTools()).toContain("write");

      const result = await fireGuard(stub, repo, "write", {
        path: "docs/tasks/effort-one/map.md",
        content: "x",
      });
      expect(result).toMatchObject({ block: true });
      expect(result.reason).toContain("write lockdown");
    });

    test("adds no bash command-string scan: bash and read pass the guard unblocked", async () => {
      const repo = setupPersonalRepo();

      const stub = createStub();
      factory(stub);

      // A shell command string cannot be gated soundly, so the guard does not
      // scan one: even a mutation-shaped command naming the tree passes. The
      // residual risk is accepted and documented in docs/repo-gating.md.
      const passThrough = [
        { toolName: "bash", input: { command: "rm -rf docs/tasks/effort-one" } },
        { toolName: "bash", input: { command: "echo hello > docs/tasks/effort-one/map.md" } },
        // Reading the tree stays allowed.
        { toolName: "read", input: { path: "docs/tasks/effort-one/map.md" } },
      ];
      for (const { toolName, input } of passThrough) {
        const result = await fireGuard(stub, repo, toolName, input);
        expect(result, `${toolName} ${JSON.stringify(input)} must pass unblocked`).toBeUndefined();
      }
    });

    test("the boundary documentation records the accepted bash residual risk", () => {
      const doc = readRepoGatingDoc();
      expect(doc).toContain("Residual risk");
      expect(doc).toContain("cannot be gated soundly");
      expect(doc).toContain("bash");
    });

    test("exempts scratch and evidence beside an artifact: .work/ and deviation-reports/", async () => {
      const repo = setupPersonalRepo();

      const stub = createStub();
      factory(stub);

      // .work/ and deviation-reports/ sit beside an artifact rather than being
      // artifacts: the designed escape hatch (the uncertainty stop) and the
      // deviation evidence are shipped procedures the guard must let through.
      const allowed = [
        "docs/tasks/effort-one/tickets/one/.work/uncertainty.md",
        "docs/tasks/effort-one/tickets/one/.work/resolution.md",
        join(repo, "docs/tasks/effort-one/tickets/one/.work/uncertainty.md"),
        "docs/tasks/effort-one/tickets/one/deviation-reports/one.md",
        join(repo, "docs/tasks/effort-one/tickets/one/deviation-reports/one.md"),
      ];
      for (const path of allowed) {
        const write = await fireGuard(stub, repo, "write", { path, content: "x" });
        expect(write, `write '${path}' is scratch or evidence and must pass`).toBeUndefined();
        const edit = await fireGuard(stub, repo, "edit", { path, edits: [] });
        expect(edit, `edit '${path}' is scratch or evidence and must pass`).toBeUndefined();
      }

      // The artifact beside them stays guarded: the exemption is the two
      // segments, not the ticket directory.
      for (const path of [
        "docs/tasks/effort-one/tickets/one/ticket.md",
        "docs/tasks/effort-one/tickets/one/.work/../../ticket.md",
        "docs/tasks/effort-one/tickets/one/deviation-reports/../../ticket.md",
      ]) {
        const result = await fireGuard(stub, repo, "write", { path, content: "x" });
        expect(result, `write '${path}' must stay blocked`).toMatchObject({ block: true });
      }
    });

    test("a refusal names the exemption and the named tool that would have worked", async () => {
      const repo = setupPersonalRepo();

      const stub = createStub();
      factory(stub);

      const result = await fireGuard(stub, repo, "edit", {
        path: "docs/tasks/effort-one/tickets/one/ticket.md",
        edits: [],
      });
      expect(result).toMatchObject({ block: true });
      // A model that hits the guard can reroute: the reason names the two
      // exempt segments and the named writer for the artifact it wanted.
      expect(result.reason).toContain(".work/");
      expect(result.reason).toContain("deviation-reports/");
      expect(result.reason).toContain("tw_write_ticket_note");
    });

    test("allows write and edit outside docs/tasks, including docs/bugs", async () => {
      const repo = setupPersonalRepo();

      const stub = createStub();
      factory(stub);

      const allowedCases: Array<{ toolName: string; path: string }> = [
        // docs/bugs is out of the guard scope: the bug substrate retires.
        { toolName: "write", path: "docs/bugs/login-loop.md" },
        { toolName: "write", path: join(repo, "docs/bugs/login-loop.md") },
        { toolName: "write", path: "README.md" },
        { toolName: "write", path: join(tmpdir(), "write-lockdown-elsewhere", "notes.md") },
        { toolName: "edit", path: "src/index.ts" },
        // A sibling directory is not the tree: the match is not a prefix test.
        { toolName: "edit", path: "docs/tasks-archive/notes.md" },
      ];
      for (const { toolName, path } of allowedCases) {
        const input = toolName === "write" ? { path, content: "x" } : { path, edits: [] };
        const result = await fireGuard(stub, repo, toolName, input);
        expect(result, `${toolName} '${path}' must pass the guard unblocked`).toBeUndefined();
      }
    });
  });
});

describe("write lockdown bootstrap exemption", () => {
  test("an unstamped tree is not locked, so onboarding can create it", async () => {
    useGlobalSettings([]);
    const repo = makeRepo("https://github.com/Y4shin/skills.git");
    // No docs/tasks/state.yaml yet: there is no schema to protect.
    mkdirSync(join(repo, "docs", "tasks"), { recursive: true });
    process.chdir(repo);

    const stub = createStub();
    factory(stub);
    const handlers = stub.handlers["tool_call"];
    const result = await handlers[0](
      { type: "tool_call", toolCallId: "bootstrap-1", toolName: "write", input: { path: "docs/tasks/state.yaml", content: "schema_version: 5\n" } },
      { cwd: repo, ui: stub.ui },
    );
    expect(result, "an onboard write is legal before the stamp exists").toBeUndefined();
  });
});
