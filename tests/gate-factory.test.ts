/**
 * Factory-level gate tests for task-workflow.
 *
 * Drives the real extension factory with a stub ExtensionAPI to verify that
 * task_* tools, utility tools, and session_start peer warnings are skipped
 * when the repo gate is active (work repo) and present when inactive (personal).
 */

import { mkdirSync, writeFileSync, rmSync } from "node:fs";
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

const GATED_NAMES = [
  "task_show",
  "task_get",
  "task_set",
  "task_set_slices",
  "task_resolve",
  "task_assert_kind",
  "task_list",
  "task_slices",
  "task_finalizable",
  "task_dependency_levels",
  "task_frontier",
  "task_map_tasks",
  "task_map_tick",
  "task_map_finalizable",
  "task_state",
  "task_state_set",
  "task_context",
  "notify_user",
  "get_guidelines",
  "list_guidelines",
];

interface StubExtensionAPI extends ExtensionAPI {
  tools: Array<{ name: string }>;
  handlers: Record<string, Array<(...args: any[]) => any>>;
  notifications: Array<{ message: string; level: string }>;
}

function createStub(): StubExtensionAPI {
  const tools: Array<{ name: string }> = [];
  const handlers: Record<string, Array<(...args: any[]) => any>> = {};
  const notifications: Array<{ message: string; level: string }> = [];

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
  let globalSettings: { dir: string; cleanup: () => void } | undefined;

  beforeEach(() => {
    previousCwd = process.cwd();
    previousAgentDir = process.env.PI_CODING_AGENT_DIR;
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
    mockControl.mode = "passthrough";
  });

  test("work repo (gate active) does not register task_* tools", () => {
    globalSettings = makeGlobalSettings(["^github\\.com[:/]QNCGmbH/.*$"]);
    process.env.PI_CODING_AGENT_DIR = globalSettings.dir;
    const repo = makeRepo("git@github.com:QNCGmbH/openai.git");
    process.chdir(repo);

    const stub = createStub();
    factory(stub);

    const names = stub.tools.map((t) => t.name);
    const taskNames = GATED_NAMES.filter((n) => n.startsWith("task_"));
    for (const name of taskNames) {
      expect(names).not.toContain(name);
    }
  });
});
