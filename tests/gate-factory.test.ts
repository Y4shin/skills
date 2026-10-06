/**
 * Factory-level gate tests for task-workflow.
 *
 * Drives the real extension factory with a stub ExtensionAPI to verify that
 * tw_* tools, utility tools, and session_start peer warnings are skipped
 * when the repo gate is active (work repo) and present when inactive (personal).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

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

// ─── Test helpers ────────────────────────────────────────────────────────────

const trackedRepos: string[] = [];

let globalSettings: { dir: string; cleanup: () => void } | undefined;

const GATED_NAMES = [
  "tw_open",
  "tw_next",
  "tw_close",
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
  "tw_finalize_map",
  "tw_write_section",
  "tw_write_spec",
  "tw_add_ticket",
  "tw_split_ticket",
  "tw_mark_blocked",
  "tw_write_changelog",
  "notify_user",
];

interface StubExtensionAPI extends ExtensionAPI {
  tools: Array<{ name: string }>;
  handlers: Record<string, Array<(...args: any[]) => any>>;
  notifications: Array<{ message: string; level: string }>;
  activeTools: string[];
  setActiveTools(toolNames: string[]): void;
  getActiveTools(): string[];
}

const GATED_SKILL_NAMES = [
  "task-workflow-overview",
  "setup-workflow",
  "wayfinder",
  "implement-task",
  "finalize-task",
];

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

function setupWorkRepo(): string {
  globalSettings = makeGlobalSettings(["^github\\.com[:/]QNCGmbH/.*$"]);
  process.env.PI_CODING_AGENT_DIR = globalSettings.dir;
  const repo = makeRepo("git@github.com:QNCGmbH/openai.git");
  process.chdir(repo);
  return repo;
}

function setupPersonalRepo(): string {
  globalSettings = makeGlobalSettings(["^github\\.com[:/]QNCGmbH/.*$"]);
  process.env.PI_CODING_AGENT_DIR = globalSettings.dir;
  const repo = makeRepo("https://github.com/Y4shin/skills.git");
  process.chdir(repo);
  return repo;
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

  test("work repo (gate active) does not register tw_* tools", () => {
    globalSettings = makeGlobalSettings(["^github\\.com[:/]QNCGmbH/.*$"]);
    process.env.PI_CODING_AGENT_DIR = globalSettings.dir;
    const repo = makeRepo("git@github.com:QNCGmbH/openai.git");
    process.chdir(repo);

    const stub = createStub();
    factory(stub);

    const names = stub.tools.map((t) => t.name);
    const gatedToolNames = GATED_NAMES.filter((n) => n.startsWith("tw_"));
    expect(gatedToolNames.length).toBeGreaterThan(0);
    for (const name of gatedToolNames) {
      expect(names).not.toContain(name);
    }
  });

  test("work repo (gate active) does not register utility tools", () => {
    globalSettings = makeGlobalSettings(["^github\\.com[:/]QNCGmbH/.*$"]);
    process.env.PI_CODING_AGENT_DIR = globalSettings.dir;
    const repo = makeRepo("git@github.com:QNCGmbH/openai.git");
    process.chdir(repo);

    const stub = createStub();
    factory(stub);

    const names = stub.tools.map((t) => t.name);
    expect(names).not.toContain("notify_user");
  });

  test("personal repo registers all gated tools", () => {
    globalSettings = makeGlobalSettings(["^github\\.com[:/]QNCGmbH/.*$"]);
    process.env.PI_CODING_AGENT_DIR = globalSettings.dir;
    const repo = makeRepo("https://github.com/Y4shin/skills.git");
    process.chdir(repo);

    const stub = createStub();
    factory(stub);

    const names = stub.tools.map((t) => t.name);
    // The shrunken registered surface, exactly: a deleted tool still
    // registered fails here.
    expect([...names].sort()).toEqual([...GATED_NAMES].sort());
  });

  test("work repo (gate active) skips session_start peer warnings", async () => {
    globalSettings = makeGlobalSettings(["^github\\.com[:/]QNCGmbH/.*$"]);
    process.env.PI_CODING_AGENT_DIR = globalSettings.dir;
    const repo = makeRepo("git@github.com:QNCGmbH/openai.git");
    process.chdir(repo);

    const stub = createStub();
    factory(stub);

    const sessionStartHandlers = stub.handlers["session_start"];
    expect(sessionStartHandlers).toBeDefined();
    expect(sessionStartHandlers.length).toBe(1);

    await sessionStartHandlers[0]({ type: "session_start", reason: "startup" }, { cwd: repo, ui: stub.ui });

    const messages = stub.notifications.map((n) => n.message);
    expect(messages).toContain("task-workflow gate active: work repo matched disableOnRepo pattern");
    expect(messages).not.toContain("pi-subagents is not installed. Install it with: pi install npm:pi-subagents");
    expect(messages).not.toContain("pi-telemetry is not installed. Install it with: pi install git:github.com/Y4shin/pi-telemetry@v0.4.0");
  });

  test("personal repo emits session_start peer warnings", async () => {
    globalSettings = makeGlobalSettings(["^github\\.com[:/]QNCGmbH/.*$"]);
    process.env.PI_CODING_AGENT_DIR = globalSettings.dir;
    const repo = makeRepo("https://github.com/Y4shin/skills.git");
    process.chdir(repo);

    const stub = createStub();
    factory(stub);

    const sessionStartHandlers = stub.handlers["session_start"];
    await sessionStartHandlers[0]({ type: "session_start", reason: "startup" }, { cwd: repo, ui: stub.ui });

    const messages = stub.notifications.map((n) => n.message);
    expect(messages).toContain("pi-subagents is not installed. Install it with: pi install npm:pi-subagents");
    expect(messages).toContain("pi-telemetry is not installed. Install it with: pi install git:github.com/Y4shin/pi-telemetry@v0.4.0");
  });

  test("detection throw falls open and registers all tools", async () => {
    mockControl.mode = "throw";

    const stub = createStub();
    factory(stub);

    const names = stub.tools.map((t) => t.name);
    for (const name of GATED_NAMES) {
      expect(names).toContain(name);
    }

    const sessionStartHandlers = stub.handlers["session_start"];
    await sessionStartHandlers[0]({ type: "session_start", reason: "startup" }, { cwd: process.cwd(), ui: stub.ui });

    expect(stub.notifications.some((n) => n.message.includes("gate detection failed"))).toBe(true);
  });

  test("factory re-detects gate when cwd changes between invocations", () => {
    globalSettings = makeGlobalSettings(["^github\\.com[:/]QNCGmbH/.*$"]);
    process.env.PI_CODING_AGENT_DIR = globalSettings.dir;
    const workRepo = makeRepo("git@github.com:QNCGmbH/openai.git");
    const personalRepo = makeRepo("https://github.com/Y4shin/skills.git");

    const workStub = createStub();
    process.chdir(workRepo);
    factory(workStub);
    expect(workStub.tools.map((t) => t.name)).toHaveLength(0);

    const personalStub = createStub();
    process.chdir(personalRepo);
    factory(personalStub);
    const names = personalStub.tools.map((t) => t.name);
    expect(names).toHaveLength(GATED_NAMES.length);
    for (const name of GATED_NAMES) {
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

  describe("help and skill-list limitation", () => {
    test("docs/repo-gating.md documents the /help and skill-list gap", () => {
      // The /help limitation was originally written to the (now-archived)
      // task doc; it is durably documented in docs/repo-gating.md, which
      // lives outside the per-task tree and is the stable reference.
      const limitationsPath = join(process.cwd(), "docs/repo-gating.md");

      expect(existsSync(limitationsPath)).toBe(true);

      const content = readFileSync(limitationsPath, "utf-8");
      expect(content).toContain("/help");
      expect(content).toContain("skill-list");
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
        { type: "input", text: "/skill:implement-task", source: "interactive" },
        { ui: stub.ui },
      );

      expect(result).toEqual({ action: "handled" });
      expect(stub.notifications).toContainEqual({
        message: "task-workflow is gated in this work repo; not loading implement-task",
        level: "warning",
      });
    });

    test("work repo blocks /skill:<gated-name> with trailing args", async () => {
      setupWorkRepo();

      const stub = createStub();
      factory(stub);

      const inputHandlers = stub.handlers["input"];
      const result = await inputHandlers[0](
        { type: "input", text: "/skill:implement-task some args", source: "interactive" },
        { ui: stub.ui },
      );

      expect(result).toEqual({ action: "handled" });
      expect(stub.notifications).toContainEqual({
        message: "task-workflow is gated in this work repo; not loading implement-task",
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
    test("work repo strips only the gated five and leaves non-gated skills intact", async () => {
      setupWorkRepo();

      const stub = createStub();
      factory(stub);

      const fixture = buildSkillsXml([...GATED_SKILL_NAMES, "oracle"]);
      const result = await stub.handlers["before_agent_start"][0](
        { systemPrompt: fixture },
        { ui: stub.ui },
      );

      expect(result).toBeDefined();
      for (const name of GATED_SKILL_NAMES) {
        expect(result.systemPrompt).not.toContain(`<name>${name}</name>`);
      }
      expect(result.systemPrompt).toContain("<name>oracle</name>");
      expect(result.systemPrompt).toContain("<available_skills>");
      expect(result.systemPrompt).toContain("PREFIX LINE 1");
      expect(result.systemPrompt).toContain("SUFFIX LINE 2");
    });

    test("work repo removes the whole skills block when only the five are present", async () => {
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

  test("registered tw_ tools derive their label from the tw_ prefix", () => {
    setupPersonalRepo();
    const stub = createStub();
    factory(stub);

    const labels = new Map(stub.tools.map((t: any) => [t.name, t.label]));
    for (const name of GATED_NAMES) {
      const suffix = name.replace(/^tw_/, "");
      const expected = suffix.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      expect(labels.get(name)).toBe(expected);
    }
  });

  describe("disclosure registration", () => {
    test("the dispatcher pair registers always-declared; every other workflow tool registers gated", () => {
      setupPersonalRepo();
      const stub = createStub();
      factory(stub);

      const byName = new Map(stub.tools.map((t: any) => [t.name, t]));
      for (const name of ["tw_open", "tw_next"]) {
        expect(byName.get(name)?.defaultActive, `${name} is declared in every state`).toBe(true);
        expect(byName.get(name)?.exposure, `${name} is direct`).toBe("direct");
      }
      // The bypass-free combination the prototype proved: direct (never
      // reachable through tool_search) and off until the opener activates it.
      for (const name of GATED_NAMES.filter((n) => n.startsWith("tw_") && n !== "tw_open" && n !== "tw_next")) {
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

    test("registers exactly one tool_call handler in a personal repo and none in a work repo", () => {
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
      const doc = readFileSync(join(process.cwd(), "docs", "repo-gating.md"), "utf-8");
      expect(doc).toContain("Residual risk");
      expect(doc).toContain("cannot be gated soundly");
      expect(doc).toContain("bash");
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
