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
import factory from "../src/pi.js";

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

/** Write one profile file into a fixture profiles directory, and return the directory. */
function profileFixture(name: string, profile: unknown): string {
  const dir = tempDir("branch-gate-profiles");
  writeJson(join(dir, `${name}.json`), profile);
  return dir;
}

/**
 * An injected git seam: answers the checkout read from a mutable branch, and
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

/** Drive one close through the tool as the extension registers it. */
async function close(
  skill: string,
  ctx: ReturnType<typeof openCtx>,
): Promise<{ text: string; details: any }> {
  const tools = createTools() as unknown as Record<string, { execute: Function }>;
  return (await tools.tw_close.execute({ skill }, ctx)) as { text: string; details: any };
}

/** A stub extension API: enough for the factory's registration pass. */
function stubPi(): { api: any; tools: any[] } {
  const tools: any[] = [];
  const active: string[] = [];
  return {
    tools,
    api: {
      registerTool(tool: any) {
        tools.push(tool);
      },
      on() {},
      getAllTools: () => tools,
      getActiveTools: () => [...active],
      setActiveTools(names: string[]) {
        active.splice(0, active.length, ...names);
      },
      exec: async () => ({ stdout: "", stderr: "", code: 0, killed: false }),
      ui: { notify() {} },
    },
  };
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

  test("the registered opener runs git through the session's exec, against the session directory", async () => {
    const dir = sessionDir();
    const calls: Array<{ command: string; args: string[]; options: any }> = [];
    const { api, tools } = stubPi();
    api.exec = async (command: string, args: string[], options: any) => {
      calls.push({ command, args, options });
      return { stdout: "effort/live-effort\n", stderr: "", code: 0, killed: false };
    };
    factory(api);
    const registered = tools.find((tool) => tool.name === "tw_open");
    const active: string[] = [];

    const result = await registered.execute(
      "call-1",
      { skill: "implement-ticket", effort: "live-effort", target: "one" },
      undefined,
      undefined,
      {
        cwd: dir,
        tools: [],
        executeTool: async () => ({ isError: false }),
        getActiveTools: () => [...active],
        setActiveTools: (names: string[]) => {
          active.splice(0, active.length, ...names);
        },
        ui: { notify() {} },
      },
    );

    expect(calls).toEqual([
      { command: "git", args: ["rev-parse", "--abbrev-ref", "HEAD"], options: { cwd: dir } },
    ]);
    expect(result.details.opened).toBe(true);
    expect(result.content[0].text).toContain("Opened implement-ticket");
  });
});

// ─── The refusal on the wrong branch ─────────────────────────────────────────

describe("the open refuses on the wrong branch", () => {
  test("the implementation open on the trunk names the current branch, the effort branch, and the step", async () => {
    const dir = sessionDir();
    const active: string[] = [];

    const { text, details } = await open(
      { skill: "implement-ticket", effort: "live-effort", target: "one" },
      openCtx(dir, active, fakeCheckout("main").git),
    );

    expect(details.opened, "the open is refused").toBe(false);
    expect(active, "a refused open discloses nothing").toEqual([]);
    expect(details.required_branch).toBe("effort/live-effort");
    expect(details.reason).toBe("the checkout is on 'main', but 'implement-ticket' requires 'effort/live-effort'");
    expect(details.legal_next).toEqual([
      "create and check out effort/live-effort off the trunk (main), then open implement-ticket",
    ]);
    // The refusal renders in the opener vocabulary every other refusal uses.
    expect(text).toBe(
      "Refused: the checkout is on 'main', but 'implement-ticket' requires 'effort/live-effort'. " +
        "Legal next: create and check out effort/live-effort off the trunk (main), then open implement-ticket.",
    );
  });

  test("the effort close refuses on the same condition", async () => {
    const dir = sessionDir();
    const active: string[] = [];

    const { text, details } = await open(
      { skill: "finalize-effort", effort: "live-effort" },
      openCtx(dir, active, fakeCheckout("main").git),
    );

    expect(details.opened).toBe(false);
    expect(active).toEqual([]);
    expect(details.required_branch).toBe("effort/live-effort");
    expect(text).toBe(
      "Refused: the checkout is on 'main', but 'finalize-effort' requires 'effort/live-effort'. " +
        "Legal next: create and check out effort/live-effort off the trunk (main), then open finalize-effort.",
    );
  });
});

// ─── The retry: nothing latches ──────────────────────────────────────────────

describe("the retry after the branch exists", () => {
  test("the same open passes once the checkout is on the required branch", async () => {
    const dir = sessionDir();
    const checkout = fakeCheckout("main");
    const active: string[] = [];
    const ctx = openCtx(dir, active, checkout.git);
    const args = { skill: "implement-ticket", effort: "live-effort", target: "one" };

    const refused = await open(args, ctx);
    expect(refused.details.opened).toBe(false);

    // The model performs the step the refusal named, then retries the open.
    checkout.checkout("effort/live-effort");
    const retried = await open(args, ctx);

    expect(retried.details.opened).toBe(true);
    expect(retried.details.skill).toBe("implement-ticket");
    expect(active, "the retried open activates the phase's toolset").toContain("tw_write_changelog");
    expect(active).toContain("tw_close");
  });

  test("a phase the profile gives no branch opens on any checkout", async () => {
    const dir = sessionDir();
    const active: string[] = [];

    const { details } = await open(
      { skill: "wayfinder", effort: "live-effort" },
      openCtx(dir, active, fakeCheckout("main").git),
    );

    expect(details.opened).toBe(true);
    expect(details.required_branch).toBeNull();
  });

  test("a detached checkout refuses, naming no branch rather than a wrong one", async () => {
    const dir = sessionDir();

    const { text, details } = await open(
      { skill: "implement-ticket", effort: "live-effort", target: "one" },
      openCtx(dir, [], fakeCheckout("HEAD").git),
    );

    expect(details.opened).toBe(false);
    expect(details.reason).toBe(
      "the checkout is on no branch (a detached HEAD), but 'implement-ticket' requires 'effort/live-effort'",
    );
    expect(text).toContain("Legal next:");
  });

  test("a checkout the seam cannot read opens, with the gate's diagnostic in the result", async () => {
    const dir = sessionDir();
    const failing = async (): Promise<string> => {
      throw new Error("fatal: not a git repository");
    };

    const { text, details } = await open(
      { skill: "implement-ticket", effort: "live-effort", target: "one" },
      openCtx(dir, [], failing),
    );

    expect(details.opened, "a checkout the gate never saw never refuses").toBe(true);
    expect(details.diagnostics.join(" ")).toContain("fatal: not a git repository");
    expect(text).toContain("Diagnostics:");
  });
});

// ─── The profile's instruction text, delivered as the tool result ────────────

describe("the profile's instruction text", () => {
  const profile = {
    name: "custom",
    phases: {
      "implement-ticket": {
        branch: "effort/{effort}",
        openInstructions: "Start from the ticket's acceptance criteria, and state the seams you will test.",
        closeInstructions: "Record the ticket's notes before you close it.",
      },
      "finalize-effort": { branch: "effort/{effort}", closeInstructions: "Print the close-out report." },
    },
  };

  test("the open delivers the phase's opening instructions as its result text", async () => {
    const dir = sessionDir({ git: { profile: "custom" } });
    const profilesDir = profileFixture("custom", profile);

    const { text, details } = await open(
      { skill: "implement-ticket", effort: "live-effort", target: "one" },
      openCtx(dir, [], fakeCheckout("effort/live-effort").git, { profilesDir }),
    );

    expect(details.opened).toBe(true);
    expect(text).toContain(profile.phases["implement-ticket"].openInstructions);
  });

  test("the close delivers the phase's closing instructions as its result text", async () => {
    const dir = sessionDir({ git: { profile: "custom" } });
    const profilesDir = profileFixture("custom", profile);
    const ctx = openCtx(dir, [], fakeCheckout("effort/live-effort").git, { profilesDir });

    await open({ skill: "implement-ticket", effort: "live-effort", target: "one" }, ctx);
    const { text, details } = await close("implement-ticket", ctx);

    expect(details.closed).toBe(true);
    expect(text).toContain(profile.phases["implement-ticket"].closeInstructions);
  });
});

// ─── Sequential execution ─────────────────────────────────────────────────

describe("sequential execution mode", () => {
  test("both openers declare it, so a sibling call cannot race them", () => {
    const tools = createTools() as unknown as Record<string, { executionMode?: string }>;

    expect(tools.tw_open.executionMode).toBe("sequential");
    expect(tools.tw_close.executionMode).toBe("sequential");
  });

  test("registration passes it to every opener the extension registers", () => {
    const { api, tools } = stubPi();
    factory(api);
    const byName = new Map(tools.map((tool) => [tool.name, tool]));

    expect((byName.get("tw_open") as any)?.executionMode).toBe("sequential");
    expect((byName.get("tw_close") as any)?.executionMode).toBe("sequential");
  });
});
