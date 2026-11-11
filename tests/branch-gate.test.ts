/**
 * The branch gates on the two branch-bearing openers.
 *
 * `implement-ticket` and `finalize-effort` require the resolved effort branch,
 * so their open refuses on any other checkout and names the branch to create.
 * The checkout is read through the git seam in the tool context and the
 * profile through its own directory seam, so no test here needs a repository:
 * the fixture tree is a plain directory with a `.pi/settings.json`.
 *
 * The behaviours pinned: the pass on the required branch, the refusal on any
 * other (naming current branch, required branch, and next call), the refusal on
 * a checkout the gate could not read at all (guards block, they do not warn),
 * the retry after the branch exists (nothing latches), and the instruction text
 * the profile carries arriving as the open's and the close's result.
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
  git: ((args: string[]) => Promise<string>) | undefined,
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

/** Drive one close that names the effort the closing phase works in. */
async function closeIn(
  args: Record<string, unknown>,
  ctx: ReturnType<typeof openCtx>,
): Promise<{ text: string; details: any }> {
  const tools = createTools() as unknown as Record<string, { execute: Function }>;
  return (await tools.tw_close.execute(args, ctx)) as { text: string; details: any };
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

  test("the flat profile requires no branch, so the trunk opens the implementation phase", async () => {
    const dir = sessionDir({ git: { profile: "flat" } });
    const active: string[] = [];

    const { details } = await open(
      { skill: "implement-ticket", effort: "live-effort", target: "one" },
      openCtx(dir, active, fakeCheckout("main").git),
    );

    expect(details.profile).toBe("flat");
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
});

// ─── The refusal on a checkout the gate could not read ──────────────────────

/**
 * Guards block, they do not warn. A checkout the seam cannot read is a
 * condition the gate cannot clear, so the open is refused in the same shape as
 * a wrong branch, and the cause still rides the details.
 */
describe("the open refuses on a checkout it cannot read", () => {
  const args = { skill: "implement-ticket", effort: "live-effort", target: "one" };

  test("a git that fails refuses the open, naming what could not be read", async () => {
    const dir = sessionDir();
    const active: string[] = [];
    const failing = async (): Promise<string> => {
      throw new Error("fatal: not a git repository");
    };

    const { text, details } = await open(args, openCtx(dir, active, failing));

    expect(details.opened, "a checkout the gate never read never opens the phase").toBe(false);
    expect(active, "a refused open discloses nothing").toEqual([]);
    expect(details.required_branch).toBe("effort/live-effort");
    expect(details.reason).toBe(
      "the checkout could not be read (git rev-parse --abbrev-ref HEAD failed: fatal: not a git repository), " +
        "so 'implement-ticket' cannot confirm it is on 'effort/live-effort'",
    );
    expect(details.legal_next).toEqual([
      "make the checkout readable (git rev-parse --abbrev-ref HEAD must answer the checked-out branch), " +
        "then open implement-ticket",
    ]);
    // The refusal is the openers' existing shape, and the cause still reports.
    expect(text).toBe(
      "Refused: the checkout could not be read (git rev-parse --abbrev-ref HEAD failed: fatal: not a git repository), " +
        "so 'implement-ticket' cannot confirm it is on 'effort/live-effort'. " +
        "Legal next: make the checkout readable (git rev-parse --abbrev-ref HEAD must answer the checked-out branch), " +
        "then open implement-ticket.",
    );
    expect(details.diagnostics.join(" "), "the gate's diagnostic still reports the cause").toContain(
      "fatal: not a git repository",
    );
  });

  test("a missing git seam refuses the open on the same rule", async () => {
    const dir = sessionDir();
    const active: string[] = [];

    // No seam at all: the session offers nothing to read the checkout with.
    const { details } = await open(args, openCtx(dir, active, undefined));

    expect(details.opened, "a session with no seam cannot confirm the branch either").toBe(false);
    expect(active).toEqual([]);
    expect(details.required_branch).toBe("effort/live-effort");
    expect(details.reason).toContain("the checkout could not be read");
    expect(details.reason).toContain("no git seam");
    expect(details.reason).toContain("cannot confirm it is on 'effort/live-effort'");
    expect(details.diagnostics.length, "the cause still reports").toBeGreaterThan(0);
  });

  test("the effort close refuses on the same condition", async () => {
    const dir = sessionDir();
    const failing = async (): Promise<string> => {
      throw new Error("fatal: not a git repository");
    };

    const { details } = await open(
      { skill: "finalize-effort", effort: "live-effort" },
      openCtx(dir, [], failing),
    );

    expect(details.opened).toBe(false);
    expect(details.reason).toContain("cannot confirm it is on 'effort/live-effort'");
    expect(details.legal_next[0]).toContain("then open finalize-effort");
  });

  test("a phase the profile gives no branch still opens, and reads no checkout", async () => {
    const dir = sessionDir();
    const calls: string[][] = [];
    const failing = async (gitArgs: string[]): Promise<string> => {
      calls.push(gitArgs);
      throw new Error("fatal: not a git repository");
    };

    const { details } = await open({ skill: "wayfinder", effort: "live-effort" }, openCtx(dir, [], failing));

    expect(details.opened).toBe(true);
    expect(details.required_branch).toBeNull();
    expect(calls, "a phase with no branch gate never reads the checkout").toEqual([]);
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

// ─── The close gate ─────────────────────────────────────────────────────────

/**
 * A phase whose profile row carries a closing gate may only close from the
 * branch that row names. The close is the second half of the branch gate: a
 * run that drifted off its branch after the open (a worker's checkout, a hand
 * run `git checkout`) cannot release the phase from there. The refusal is the
 * openers' own shape, nothing latches, and a phase whose row carries no gate
 * closes from wherever it is.
 */
describe("the close gate", () => {
  /** Open the implementation phase on its branch, and close it from the checkout given. */
  async function openedAndClosed(checkoutBranch: string) {
    const dir = sessionDir();
    const checkout = fakeCheckout("effort/live-effort");
    const active: string[] = [];
    const ctx = openCtx(dir, active, checkout.git);
    const opened = await open(
      { skill: "implement-ticket", effort: "live-effort", target: "one" },
      ctx,
    );
    expect(opened.details.opened).toBe(true);
    // The checkout moves after the open, as a ticket branch would.
    checkout.checkout(checkoutBranch);
    const result = await closeIn({ skill: "implement-ticket", effort: "live-effort" }, ctx);
    return { ...result, active, checkout, ctx };
  }

  test("the close on the branch the row gates on passes and reports the gate", async () => {
    const dir = sessionDir();
    const checkout = fakeCheckout("effort/live-effort");
    const active: string[] = [];
    const ctx = openCtx(dir, active, checkout.git);
    await open({ skill: "implement-ticket", effort: "live-effort", target: "one" }, ctx);

    const { text, details } = await closeIn({ skill: "implement-ticket", effort: "live-effort" }, ctx);

    expect(details.closed).toBe(true);
    expect(details.close_gate).toBe("effort/live-effort");
    expect(details.profile).toBe("default");
    expect(text).toContain("Closed implement-ticket");
    expect(active, "the closed phase releases its toolset").not.toContain("tw_write_changelog");
  });

  test("the close from another checkout refuses, naming the current branch, the gate branch, and the next call", async () => {
    const { text, details, active } = await openedAndClosed("main");

    expect(details.closed, "the close is refused").toBe(false);
    expect(details.close_gate).toBe("effort/live-effort");
    expect(details.reason).toBe("the checkout is on 'main', but 'implement-ticket' closes on 'effort/live-effort'");
    expect(details.legal_next).toEqual(["check out effort/live-effort, then close implement-ticket"]);
    expect(text).toBe(
      "Refused: the checkout is on 'main', but 'implement-ticket' closes on 'effort/live-effort'. " +
        "Legal next: check out effort/live-effort, then close implement-ticket.",
    );
    // A refused close leaves the phase open: its toolset is untouched.
    expect(active).toContain("tw_write_changelog");
  });

  test("nothing latches: checking the branch out and retrying closes", async () => {
    const { details, active, checkout, ctx } = await openedAndClosed("ticket/one");
    expect(details.closed).toBe(false);

    // The model performs the step the refusal named, then retries the close.
    checkout.checkout("effort/live-effort");
    const retried = await closeIn({ skill: "implement-ticket", effort: "live-effort" }, ctx);

    expect(retried.details.closed).toBe(true);
    expect(retried.text).toContain("Closed implement-ticket");
    expect(active).not.toContain("tw_write_changelog");
  });

  test("the effort close gates the same way", async () => {
    const dir = sessionDir();
    const checkout = fakeCheckout("effort/live-effort");
    const ctx = openCtx(dir, [], checkout.git);
    await open({ skill: "finalize-effort", effort: "live-effort" }, ctx);
    checkout.checkout("main");

    const { text, details } = await closeIn({ skill: "finalize-effort", effort: "live-effort" }, ctx);

    expect(details.closed).toBe(false);
    expect(details.reason).toBe(
      "the checkout is on 'main', but 'finalize-effort' closes on 'effort/live-effort'",
    );
    expect(text).toContain("Legal next: check out effort/live-effort, then close finalize-effort.");
  });

  test("a checkout the close cannot read refuses rather than passing", async () => {
    const dir = sessionDir();
    const failing = async (): Promise<string> => {
      throw new Error("fatal: not a git repository");
    };
    const active: string[] = [];
    const ctx = openCtx(dir, active, fakeCheckout("effort/live-effort").git);
    await open({ skill: "implement-ticket", effort: "live-effort", target: "one" }, ctx);

    const { text, details } = await closeIn(
      { skill: "implement-ticket", effort: "live-effort" },
      openCtx(dir, active, failing),
    );

    expect(details.closed, "a checkout the close never read never releases the phase").toBe(false);
    expect(details.reason).toBe(
      "the checkout could not be read (git rev-parse --abbrev-ref HEAD failed: fatal: not a git repository), " +
        "so 'implement-ticket' cannot confirm it is on 'effort/live-effort'",
    );
    expect(text).toContain(
      "Legal next: make the checkout readable (git rev-parse --abbrev-ref HEAD must answer the checked-out branch), " +
        "then close implement-ticket.",
    );
    expect(active, "the phase stays open").toContain("tw_write_changelog");
  });

  test("a close that names no effort cannot resolve its gate, and refuses naming what it needs", async () => {
    const dir = sessionDir();
    const checkout = fakeCheckout("effort/live-effort");
    const ctx = openCtx(dir, [], checkout.git);
    await open({ skill: "implement-ticket", effort: "live-effort", target: "one" }, ctx);
    // The open read the checkout; the close is what must not.
    checkout.calls.length = 0;

    const { text, details } = await close("implement-ticket", ctx);

    expect(details.closed).toBe(false);
    expect(details.reason).toBe(
      "'implement-ticket' closes on a branch this close could not resolve ('effort/{effort}'): " +
        "name the effort the phase works in",
    );
    expect(details.legal_next).toEqual(["retry tw_close implement-ticket with the effort"]);
    expect(text).toContain("Refused:");
    // The unresolved gate never reads the checkout: there is nothing to compare.
    expect(checkout.calls, "an unresolved gate reads no checkout").toEqual([]);
  });

  test("the planning phases close with no effort and no gate", async () => {
    const dir = sessionDir();
    const calls: string[][] = [];
    const failing = async (args: string[]): Promise<string> => {
      calls.push(args);
      throw new Error("fatal: not a git repository");
    };
    const active: string[] = [];
    const ctx = openCtx(dir, active, failing);
    await open({ skill: "wayfinder", effort: "live-effort" }, ctx);

    const { details } = await close("wayfinder", ctx);

    expect(details.closed, "a phase whose row carries no close gate closes").toBe(true);
    expect(details.close_gate).toBeNull();
    // No close gate, so the close never reads the checkout.
    expect(calls).toEqual([]);
  });

  test("the flat profile gates no close, so a gated phase closes from the trunk with no effort", async () => {
    const dir = sessionDir({ git: { profile: "flat" } });
    const checkout = fakeCheckout("main");
    const active: string[] = [];
    const ctx = openCtx(dir, active, checkout.git);
    await open({ skill: "implement-ticket", effort: "live-effort", target: "one" }, ctx);

    const { details } = await close("implement-ticket", ctx);

    expect(details.closed).toBe(true);
    expect(details.close_gate).toBeNull();
    expect(details.profile).toBe("flat");
    expect(checkout.calls, "a profile with no close gate reads no checkout").toEqual([]);
  });
});
