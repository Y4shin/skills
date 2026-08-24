/**
 * Unit tests for the get_guidelines standards extension.
 *
 * Drives the extension factory with a stub ExtensionAPI and exercises the
 * discoverGuidelines / get_guidelines / list_guidelines tools via temp repo
 * fixtures. The repo gate is mocked inactive so guidelines tools register.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import factory from "../src/pi.js";

vi.mock("../src/core/repo-gate.js", () => ({
  resolveGate: () => ({ active: false, reason: "mock inactive", diagnostics: [] }),
}));

// ─── Test helpers ────────────────────────────────────────────────────────────

interface StubExtensionAPI extends ExtensionAPI {
  tools: Array<{ name: string; execute: (...args: any[]) => any }>;
  handlers: Record<string, Array<(...args: any[]) => any>>;
  notifications: Array<{ message: string; level: string }>;
}

const trackedRepos: string[] = [];

function createStub(): StubExtensionAPI {
  const tools: Array<{ name: string; execute: (...args: any[]) => any }> = [];
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

function makeRepo(): string {
  const dir = join(
    tmpdir(),
    "guidelines-repo-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8),
  );
  mkdirSync(dir, { recursive: true });
  trackedRepos.push(dir);
  return dir;
}

function writeDocs(repo: string, name: string, content: string) {
  const docsDir = join(repo, "docs");
  if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true });
  writeFileSync(join(docsDir, name), content);
}

function writeRoot(repo: string, name: string, content: string) {
  writeFileSync(join(repo, name), content);
}

async function startSession(stub: StubExtensionAPI, repo: string) {
  const sessionStartHandlers = stub.handlers["session_start"];
  expect(sessionStartHandlers).toBeDefined();
  expect(sessionStartHandlers.length).toBe(1);
  await sessionStartHandlers[0](
    { type: "session_start", reason: "startup" },
    { cwd: repo, ui: stub.ui },
  );
}

function findTool(stub: StubExtensionAPI, name: string) {
  const tool = stub.tools.find((t) => t.name === name);
  expect(tool).toBeDefined();
  return tool!;
}

async function callTool(tool: { execute: (...args: any[]) => any }, params: any) {
  const result = await tool.execute("test-id", params, undefined, undefined, { cwd: process.cwd() });
  expect(result).toBeDefined();
  expect(result.content).toBeDefined();
  expect(result.content.length).toBeGreaterThan(0);
  return result.content[0].text as string;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("guidelines standards extension", () => {
  let previousCwd: string;

  beforeEach(() => {
    previousCwd = process.cwd();
    trackedRepos.length = 0;
  });

  afterEach(() => {
    process.chdir(previousCwd);
    for (const repo of trackedRepos) {
      rmSync(repo, { recursive: true, force: true });
    }
    trackedRepos.length = 0;
  });

  test("discoverGuidelines picks up repo-root standards files and docs/standards.md", async () => {
    const repo = makeRepo();
    writeRoot(repo, "AGENTS.md", "# Agent instructions\n");
    writeRoot(repo, "CLAUDE.md", "# Claude context\n");
    writeRoot(repo, "CONTEXT.md", "# Project context\n");
    writeDocs(repo, "standards.md", "# Standards\n");

    const stub = createStub();
    factory(stub);
    await startSession(stub, repo);

    const listTool = findTool(stub, "list_guidelines");
    const text = await callTool(listTool, {});

    expect(text).toContain("AGENTS.md");
    expect(text).toContain("CLAUDE.md");
    expect(text).toContain("CONTEXT.md");
    expect(text).toContain("docs/standards.md");
    expect(text).toContain("standards");
  });

  test("get_guidelines returns the smell baseline floor when no repo standards match", async () => {
    const repo = makeRepo();

    const stub = createStub();
    factory(stub);
    await startSession(stub, repo);

    const getTool = findTool(stub, "get_guidelines");
    const text = await callTool(getTool, { language: "typescript" });

    expect(text).toContain("Smell baseline");
    expect(text).toContain("floor — no repo standards found for this request");
    expect(text).toContain("Mysterious Name");
    expect(text).toContain("Refused Bequest");
  });

  test("get_guidelines does NOT append the baseline when repo standards match", async () => {
    const repo = makeRepo();
    writeDocs(repo, "typescript-guidelines.md", "# TypeScript guidelines\nUse strict mode.\n");

    const stub = createStub();
    factory(stub);
    await startSession(stub, repo);

    const getTool = findTool(stub, "get_guidelines");
    const text = await callTool(getTool, { language: "typescript" });

    expect(text).toContain("TypeScript guidelines");
    expect(text).toContain("Use strict mode");
    expect(text).not.toContain("Smell baseline");
    expect(text).not.toContain("Mysterious Name");
  });

  test("list_guidelines reports the baseline as a source when in effect", async () => {
    const repo = makeRepo();

    const stub = createStub();
    factory(stub);
    await startSession(stub, repo);

    const listTool = findTool(stub, "list_guidelines");
    const text = await callTool(listTool, {});

    expect(text).toContain("Smell baseline (Fowler 12)");
    expect(text).toContain("served as the floor when no repo standards match");
  });

  test("existing behavior regression: docs/typescript-guidelines.md is still discovered and served", async () => {
    const repo = makeRepo();
    writeDocs(repo, "typescript-guidelines.md", "# TypeScript guidelines\nPrefer interfaces.\n");

    const stub = createStub();
    factory(stub);
    await startSession(stub, repo);

    const listTool = findTool(stub, "list_guidelines");
    const listText = await callTool(listTool, {});
    expect(listText).toContain("typescript-guidelines.md");
    expect(listText).toContain("typescript");

    const getTool = findTool(stub, "get_guidelines");
    const text = await callTool(getTool, { language: "typescript" });
    expect(text).toContain("TypeScript guidelines");
    expect(text).toContain("Prefer interfaces");
  });
});
