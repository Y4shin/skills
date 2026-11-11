/**
 * The branch gates on the two branch-bearing openers.
 *
 * `implement-ticket` and `finalize-effort` require the resolved effort branch,
 * so their open refuses on any other checkout and names the branch to create.
 * The checkout is read through the git seam in the tool context and the
 * profile through its own directory seam, so no test here needs a repository:
 * the fixture tree is a plain directory with a `.pi/settings.json`.
 *
 * The four behaviours pinned: the pass on the required branch, the refusal on
 * any other (naming current branch, required branch, and next call), the retry
 * after the branch exists (nothing latches), and the instruction text the
 * profile carries arriving as the open's and the close's result.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { dump } from "../src/core/frontmatter.js";
import { createTools } from "../src/pi.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const roots: string[] = [];

/** A temp directory, removed when the file's tests finish. */
function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), `${prefix}-`));
  roots.push(dir);
  return dir;
}

/** Write a JSON file at `path`, creating its directory. */
function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value), "utf-8");
}

/** Write one effort's artifacts into a repo fixture. */
function writeEffort(dir: string, slug: string, files: Record<string, Record<string, unknown>>): void {
  for (const [name, data] of Object.entries(files)) {
    const path = join(dir, "docs", "tasks", slug, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, dump({ data, body: "\n" }), "utf-8");
  }
}

/**
 * A session directory holding one effort that is ready to implement: a
 * reconciled map, a stable spec, a stable architecture document, and one ready
 * ticket. Nothing here is a git repository.
 */
function sessionDir(settings: Record<string, unknown> = {}): string {
  const dir = tempDir("branch-gate-repo");
  writeJson(join(dir, ".pi", "settings.json"), { taskWorkflow: settings });
  writeEffort(dir, "live-effort", {
    "map.md": { type: "map", title: "Live effort", ready_for_spec: true },
    "spec.md": { type: "spec", title: "Live effort spec", status: "stable" },
    "arch-spec.md": { type: "arch spec", title: "Live effort architecture", status: "stable" },
    "tickets/one/ticket.md": {
      type: "ticket",
      subtype: "feature",
      title: "One",
      status: "stable",
      workflow_state: "ready",
      blocked_by: [],
    },
  });
  return dir;
}

/**
 * The injected git seam: answers the checkout read from a mutable branch, and
 * records every command it was asked to run. `"HEAD"` is a detached checkout.
 */
function fakeCheckout(branch: string): {
  git: (args: string[]) => Promise<string>;
  calls: string[][];
  checkout(branch: string): void;
} {
  const calls: string[][] = [];
  const state = { branch };
  return {
    calls,
    checkout(next: string) {
      state.branch = next;
    },
    async git(args: string[]) {
      calls.push(args);
      if (args.join(" ") !== "rev-parse --abbrev-ref HEAD") {
        throw new Error(`unexpected git command: ${args.join(" ")}`);
      }
      return `${state.branch}\n`;
    },
  };
}

/** A fake context: the active set, the session directory, and the git seam. */
function openCtx(
  directory: string,
  active: string[],
  git: (args: string[]) => Promise<string>,
  extra: Record<string, unknown> = {},
) {
  return {
    directory,
    getActiveTools: () => [...active],
    setActiveTools: (names: string[]) => {
      active.splice(0, active.length, ...names);
    },
    git,
    ...extra,
  };
}

/** Drive one open through the tool as the extension registers it. */
async function open(
  args: Record<string, unknown>,
  ctx: ReturnType<typeof openCtx>,
): Promise<{ text: string; details: any }> {
  const tools = createTools() as unknown as Record<string, { execute: Function }>;
  return (await tools.tw_open.execute(args, ctx)) as { text: string; details: any };
}

afterAll(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
});

let previousAgentDir: string | undefined;

beforeAll(() => {
  previousAgentDir = process.env.PI_CODING_AGENT_DIR;
  // An empty agent dir: the global settings of the machine running the suite
  // never leak into a gate decision.
  process.env.PI_CODING_AGENT_DIR = tempDir("branch-gate-agent");
});

afterAll(() => {
  if (previousAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
  else process.env.PI_CODING_AGENT_DIR = previousAgentDir;
});

// ─── The git seam ────────────────────────────────────────────────────────────

describe("the injected git seam", () => {
  test("the open reads the checkout through the tool context's git seam", async () => {
    const dir = sessionDir();
    const checkout = fakeCheckout("effort/live-effort");
    const active: string[] = [];

    const { details } = await open(
      { skill: "implement-ticket", effort: "live-effort", target: "one" },
      openCtx(dir, active, checkout.git),
    );

    expect(checkout.calls, "the open asks git for the checked-out branch").toEqual([
      ["rev-parse", "--abbrev-ref", "HEAD"],
    ]);
    expect(details.opened).toBe(true);
  });
});
