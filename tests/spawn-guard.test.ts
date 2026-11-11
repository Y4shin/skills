/**
 * The spawn block on the five implementation sub-agents.
 *
 * A dispatch of an implementation agent commits on the ticket branch, so
 * spawning one from any other checkout is refused before the child starts:
 * at the outer `subagent` call (identity in `args`) and at the per-child
 * `subagent_launch` call (identity in a step key that embeds the slug, because
 * a workflow child's `args` never reach the handler).
 *
 * The guard lives in the extension's `tool_call` handler and reads the
 * checkout through the session's git seam, so every test here runs against a
 * stub extension API and a fake `exec`: no repository is needed.
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import factory from "../src/pi.js";
import { KEY_SEPARATOR, ticketFromKey } from "../src/core/spawn-guard.js";

/** The repo root, in POSIX form, for the structure assertions over the chain. */
const PROJECT = fileURLToPath(new URL("..", import.meta.url));

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

/** A session directory selecting the bundled profile the call resolves against. */
function sessionDir(settings: Record<string, unknown> = {}): string {
  const dir = tempDir("spawn-guard-repo");
  writeJson(join(dir, ".pi", "settings.json"), { taskWorkflow: settings });
  return dir;
}

/** The chain launch the implementation phase sends: identity lives in `args`. */
function chainLaunch(args: Record<string, unknown>): Record<string, unknown> {
  return {
    async: true,
    workflow: "skills/engineering/implement-ticket/scripts/ticket-chain.js",
    args: { ...args },
  };
}

/** A direct single-agent dispatch: identity lives in `agent` and `args`. */
function directSpawn(agent: string, args: Record<string, unknown> = {}): Record<string, unknown> {
  return { agent, task: "do the thing", args: { ...args } };
}

/** The `subagent_launch` input a workflow child start sends: identity is the key. */
function launchCall(key: string, agent: string): Record<string, unknown> {
  return { workflowRunId: "wf-1", key, agent, task: "do the thing", cwd: "/tmp", async: true };
}

interface Stub {
  api: any;
  handlers: Record<string, Array<(...args: any[]) => any>>;
  execCalls: Array<{ command: string; args: string[]; options: any }>;
  notices: string[];
}

/**
 * A stub extension API carrying the state the guard needs: the registered
 * handlers, and an `exec` that answers the checkout read from a mutable branch
 * (and records every command it was asked to run).
 */
function stubPi(checkout: { branch: string }): Stub {
  const handlers: Record<string, Array<(...args: any[]) => any>> = {};
  const execCalls: Stub["execCalls"] = [];
  const notices: string[] = [];
  const api: any = {
    registerTool() {},
    on(event: string, handler: (...args: any[]) => any) {
      (handlers[event] ??= []).push(handler);
    },
    getAllTools() {
      return [];
    },
    getActiveTools() {
      return [];
    },
    setActiveTools() {},
    async exec(command: string, args: string[], options: any) {
      execCalls.push({ command, args, options });
      return { stdout: `${checkout.branch}\n`, stderr: "", code: 0, killed: false };
    },
    ui: {
      notify(message: string) {
        notices.push(message);
      },
      confirm: async () => true,
    },
  };
  factory(api);
  return { api, handlers, execCalls, notices };
}

/** Fire the extension's one `tool_call` handler, as pi does before the tool runs. */
async function fire(stub: Stub, cwd: string, toolName: string, input: Record<string, unknown>): Promise<any> {
  const handlers = stub.handlers["tool_call"];
  expect(handlers, "the extension must register a tool_call handler").toBeDefined();
  expect(handlers.length).toBe(1);
  return handlers[0](
    { type: "tool_call", toolCallId: "call-1", toolName, input },
    { cwd, ui: stub.api.ui },
  );
}

afterAll(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
});

let previousAgentDir: string | undefined;

beforeAll(() => {
  previousAgentDir = process.env.PI_CODING_AGENT_DIR;
  // An empty agent dir: the global settings of the machine running the suite
  // never leak into a spawn decision.
  process.env.PI_CODING_AGENT_DIR = tempDir("spawn-guard-agent");
});

afterAll(() => {
  if (previousAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
  else process.env.PI_CODING_AGENT_DIR = previousAgentDir;
});

// ─── The outer call: identity in the args, and the agent name ────────────────

describe("the outer subagent call", () => {
  const identity = { effort: "an-effort", ticket: "one" };

  test("a dispatch naming tdd-worker is blocked when the checkout is not the resolved ticket branch", async () => {
    const dir = sessionDir();
    const stub = stubPi({ branch: "main" });

    const result = await fire(stub, dir, "subagent", directSpawn("tdd-worker", identity));

    expect(result, "the spawn is blocked").toMatchObject({ block: true });
  });

  test("the chain launch is blocked too: the workflow carries the ticket, not the agent", async () => {
    const dir = sessionDir();
    const stub = stubPi({ branch: "effort/an-effort" });

    const result = await fire(stub, dir, "subagent", chainLaunch(identity));

    expect(result, "the chain launch is blocked off the ticket branch").toMatchObject({ block: true });
  });

  test("the checkout is read through the session's git seam, against the session directory", async () => {
    const dir = sessionDir();
    const stub = stubPi({ branch: "main" });

    await fire(stub, dir, "subagent", directSpawn("tdd-worker", identity));

    expect(stub.execCalls).toEqual([
      { command: "git", args: ["rev-parse", "--abbrev-ref", "HEAD"], options: { cwd: dir } },
    ]);
  });

  test("the block names the current and the required branch, and the step that creates it", async () => {
    const dir = sessionDir();
    const stub = stubPi({ branch: "effort/an-effort" });

    const result = await fire(stub, dir, "subagent", directSpawn("tdd-worker", identity));

    expect(result.block).toBe(true);
    // The openers' refusal shape: what is checked out, what is required, and
    // the next legal move, so a model that hits it can perform the step.
    expect(result.reason).toBe(
      "Refused: the checkout is on 'effort/an-effort', but 'tdd-worker' requires 'ticket/one'. " +
        "Legal next: create and check out ticket/one off effort/an-effort, then dispatch again.",
    );
  });

  test("the chain launch's block names the chain and the same required branch", async () => {
    const dir = sessionDir();
    const stub = stubPi({ branch: "effort/an-effort" });

    const result = await fire(stub, dir, "subagent", chainLaunch(identity));

    expect(result.reason).toContain("the checkout is on 'effort/an-effort'");
    expect(result.reason).toContain("requires 'ticket/one'");
  });

  test("a detached checkout is named as a detached HEAD, not as a wrong branch", async () => {
    const dir = sessionDir();
    const stub = stubPi({ branch: "HEAD" });

    const result = await fire(stub, dir, "subagent", directSpawn("tdd-worker", identity));

    expect(result.block).toBe(true);
    expect(result.reason).toContain("the checkout is on no branch (a detached HEAD)");
  });
});

// ─── The per-child launch: identity in the step key ──────────────────────────

describe("the per-child subagent_launch call", () => {
  test("is blocked on the same predicate, with the ticket read from the step key", async () => {
    const dir = sessionDir();
    const stub = stubPi({ branch: "effort/an-effort" });

    const result = await fire(stub, dir, "subagent_launch", launchCall("tdd@one", "tdd-worker"));

    expect(result, "the child never starts").toMatchObject({ block: true });
    // The launch carries no effort slug, so the base reads as "the effort
    // branch": the required branch and the checkout are still named exactly.
    expect(result.reason).toBe(
      "Refused: the checkout is on 'effort/an-effort', but 'tdd-worker' requires 'ticket/one'. " +
        "Legal next: create and check out ticket/one off the effort branch, then dispatch again.",
    );
  });

  test("every implementation agent is blocked on the launch surface", async () => {
    const dir = sessionDir();
    for (const agent of [
      "implement-preconditions",
      "tdd-worker",
      "slice-verifier",
      "deviation-reporter",
      "land-worker",
    ]) {
      const stub = stubPi({ branch: "main" });
      const result = await fire(stub, dir, "subagent_launch", launchCall(`step@one`, agent));
      expect(result, `${agent} is blocked`).toMatchObject({ block: true });
      expect(result.reason).toContain("requires 'ticket/one'");
    }
  });

  test("passes on the ticket branch, the same way the outer call does", async () => {
    const dir = sessionDir();
    const stub = stubPi({ branch: "ticket/one" });

    const result = await fire(stub, dir, "subagent_launch", launchCall("verify@one", "slice-verifier"));

    expect(result).toBeUndefined();
  });
});

// ─── The chain's step keys: the identity that survives the per-child call ────

describe("the chain's step keys", () => {
  const chain = readFileSync(
    join(PROJECT, "skills/engineering/implement-ticket/scripts/ticket-chain.js"),
    "utf-8",
  );

  test("every step key embeds the ticket slug, so no launch is anonymous", () => {
    // One helper builds every key, and it is the ticket that rides along.
    expect(chain).toMatch(/function stepKey\(step\) \{\s*return step \+ "@" \+ args\.ticket;\s*\}/);
    for (const step of ["gate", "gate-retry", "tdd", "verify", "deviation", "land"]) {
      expect(chain, `the ${step} step key carries the ticket`).toContain(`stepKey("${step}")`);
    }
    // No step is left with a bare literal key: those carry no identity at all.
    expect(chain).not.toMatch(/runs\.run\("/);
    expect(chain).not.toMatch(/key: "/);
  });

  test("the key's slug is the text after the last separator, and nothing else is a slug", () => {
    expect(ticketFromKey(`tdd${KEY_SEPARATOR}one`)).toBe("one");
    expect(ticketFromKey(`gate-retry${KEY_SEPARATOR}a-ticket`)).toBe("a-ticket");
    // A slug never carries the separator, so the last one wins.
    expect(ticketFromKey(`step${KEY_SEPARATOR}two${KEY_SEPARATOR}one`)).toBe("one");
    for (const anonymous of ["tdd", "", "tdd@", 42, null, undefined, { key: "tdd@one" }]) {
      expect(ticketFromKey(anonymous), String(anonymous)).toBe("");
    }
  });

  test("a key built the way the chain builds it carries the ticket the guard reads", async () => {
    const dir = sessionDir();
    const stub = stubPi({ branch: "main" });

    // The script's `step + "@" + args.ticket`, from the shared separator.
    const key = ["tdd", "one"].join(KEY_SEPARATOR);
    const result = await fire(stub, dir, "subagent_launch", launchCall(key, "tdd-worker"));

    expect(result).toMatchObject({ block: true });
    expect(result.reason).toContain("requires 'ticket/one'");
  });
});

// ─── Pass-through: anything that is not a gated implementation spawn ─────────

describe("calls the guard must leave untouched", () => {
  const identity = { effort: "an-effort", ticket: "one" };

  test.each([
    "code-reviewer",
    "coherence-refactorer",
    "spec-reconciler",
    "architecture-scout",
    "test-runner",
  ])("a dispatch of %s passes, and the checkout is never read", async (agent) => {
    const dir = sessionDir();
    const stub = stubPi({ branch: "main" });

    const result = await fire(stub, dir, "subagent", directSpawn(agent, identity));

    expect(result).toBeUndefined();
    expect(stub.execCalls, "an ungated agent costs no git call").toEqual([]);
  });

  test("a launch of an agent outside the profile passes untouched", async () => {
    const dir = sessionDir();
    const stub = stubPi({ branch: "main" });

    const result = await fire(stub, dir, "subagent_launch", launchCall("review@one", "code-reviewer"));

    expect(result).toBeUndefined();
    expect(stub.execCalls).toEqual([]);
  });

  test("a chain launch with no ticket identity passes untouched", async () => {
    const dir = sessionDir();
    const stub = stubPi({ branch: "main" });

    // The effort close's workflow carries the effort only: no ticket, no
    // ticket branch to require.
    const result = await fire(stub, dir, "subagent", {
      async: true,
      workflow: "skills/engineering/implement-ticket/scripts/end-of-effort.js",
      args: { effort: "an-effort", startingBranch: "main" },
    });

    expect(result).toBeUndefined();
    expect(stub.execCalls).toEqual([]);
  });

  test("an implementation agent dispatched with no ticket passes untouched", async () => {
    const dir = sessionDir();
    const stub = stubPi({ branch: "main" });

    const result = await fire(stub, dir, "subagent", directSpawn("tdd-worker", { effort: "an-effort" }));

    expect(result, "no ticket means no ticket branch to require").toBeUndefined();
    expect(stub.execCalls).toEqual([]);
  });

  test("a step key with no slug passes untouched", async () => {
    const dir = sessionDir();
    const stub = stubPi({ branch: "main" });

    const result = await fire(stub, dir, "subagent_launch", launchCall("tdd", "tdd-worker"));

    expect(result).toBeUndefined();
    expect(stub.execCalls).toEqual([]);
  });

  test("any other tool is never looked at by the spawn guard", async () => {
    const dir = sessionDir();
    const stub = stubPi({ branch: "main" });

    for (const toolName of ["bash", "read", "tw_get", "tw_open"]) {
      const result = await fire(stub, dir, toolName, { command: "git checkout main" });
      expect(result, toolName).toBeUndefined();
    }
    expect(stub.execCalls).toEqual([]);
  });

  test("the flat profile requires no branch, so every spawn passes on any checkout", async () => {
    const dir = sessionDir({ git: { profile: "flat" } });
    const stub = stubPi({ branch: "main" });

    expect(await fire(stub, dir, "subagent", directSpawn("tdd-worker", identity))).toBeUndefined();
    expect(await fire(stub, dir, "subagent", chainLaunch(identity))).toBeUndefined();
    expect(await fire(stub, dir, "subagent_launch", launchCall("tdd@one", "tdd-worker"))).toBeUndefined();
    expect(stub.execCalls, "a profile with no branch gate reads no checkout").toEqual([]);
  });

  test("a checkout the seam cannot read passes, rather than refusing a spawn it never saw", async () => {
    const dir = sessionDir();
    const stub = stubPi({ branch: "main" });
    stub.api.exec = async () => ({ stdout: "", stderr: "fatal: not a git repository", code: 128, killed: false });

    const result = await fire(stub, dir, "subagent", directSpawn("tdd-worker", identity));

    expect(result, "a gate that never saw the checkout never blocks").toBeUndefined();
    expect(
      stub.notices.join("\n"),
      "a guard that did not run says so, instead of passing silently",
    ).toContain("fatal: not a git repository");
  });
});

// ─── The block is a step failure, not a session failure ──────────────────────

describe("a blocked spawn fails its step and the session continues", () => {
  const identity = { effort: "an-effort", ticket: "one" };

  test("the guard answers a block result instead of throwing", async () => {
    const dir = sessionDir();
    const stub = stubPi({ branch: "main" });

    // A returned block becomes an error tool result for that call alone; a
    // thrown error would not be the same shape for the workflow that started
    // the child.
    await expect(fire(stub, dir, "subagent_launch", launchCall("tdd@one", "tdd-worker"))).resolves.toMatchObject({
      block: true,
    });
  });

  test("nothing latches: after a block the same call passes once the checkout moves", async () => {
    const dir = sessionDir();
    const checkout = { branch: "main" };
    const stub = stubPi(checkout);
    const call = () => fire(stub, dir, "subagent", directSpawn("tdd-worker", identity));

    expect(await call()).toMatchObject({ block: true });

    // The model performs the step the refusal named, then dispatches again.
    checkout.branch = "ticket/one";
    expect(await call()).toBeUndefined();
  });

  test("the session keeps working after a block: other guards and other calls still answer", async () => {
    const dir = sessionDir();
    const stub = stubPi({ branch: "main" });
    const statePath = join(dir, "docs", "tasks", "state.yaml");
    mkdirSync(dirname(statePath), { recursive: true });
    writeFileSync(statePath, "schema_version: 5\nmap: null\ntask: null\n", "utf-8");

    expect(await fire(stub, dir, "subagent", directSpawn("tdd-worker", identity))).toMatchObject({ block: true });

    // The write lockdown still refuses inside the tree, and a call outside it
    // still passes: one blocked spawn changed nothing else about the session.
    expect(await fire(stub, dir, "write", { path: "docs/tasks/an-effort/map.md", content: "x" })).toMatchObject({
      block: true,
    });
    expect(await fire(stub, dir, "write", { path: "src/app.ts", content: "x" })).toBeUndefined();
  });
});
