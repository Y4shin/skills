/**
 * Layer 1: unit-test the opencode native tools directly — no opencode, no model.
 *
 * The tools are plain `{ description, args, execute }` objects, so we build the
 * plugin's tool map and call `execute(args, ctx)` with a fake context. This
 * exercises the same code opencode runs when the model invokes a tool.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";

import { PrdWorkflowPlugin } from "../src/opencode/plugin";
import { mkTmp } from "./util";

function sampleTree(): string {
  const t = mkTmp();
  mkdirSync(join(t, "docs/prd/epics/auth"), { recursive: true });
  mkdirSync(join(t, "docs/prd/login/slices"), { recursive: true });
  writeFileSync(
    join(t, "docs/prd/epics/auth/epic.md"),
    "---\nkind: epic\ntitle: Auth epic\nslug: auth\nstatus: draft\nepic_milestone: 7\n" +
      "prds:\n  - slug: login\n    issue: 12\n    blocked_by: []\n    done: false\n---\n",
  );
  writeFileSync(
    join(t, "docs/prd/login/prd.md"),
    "---\nkind: prd\ntitle: Login\nslug: login\nstatus: draft\nprd_issue: 12\nslices: []\nepic: auth\n---\n",
  );
  writeFileSync(
    join(t, "docs/prd/login/slices/3-do-thing.md"),
    "---\nkind: prd\ntitle: Do thing\nslug: do-thing\nissue: 3\nprd: ../prd.md\nmode: hitl\n---\n",
  );
  return t;
}

// A minimal stand-in for opencode's ToolContext (only `directory` is used).
const ctx = (directory: string) => ({ directory, worktree: directory }) as any;

describe("opencode native tools", () => {
  let tools: Record<string, { description: string; args: unknown; execute: Function }>;

  beforeAll(async () => {
    const hooks = await PrdWorkflowPlugin({} as any);
    tools = hooks.tool as any;
  });

  test("registers the prd_* tools with descriptions + arg schemas", () => {
    const names = Object.keys(tools).sort();
    expect(names.length).toBeGreaterThanOrEqual(14);
    expect(names).toContain("prd_show");
    expect(names).toContain("prd_finalizable");
    expect(names).toContain("prd_epic_tick");
    for (const t of Object.values(tools)) {
      expect(typeof t.description).toBe("string");
      expect(t.args).toBeTruthy();
      expect(typeof t.execute).toBe("function");
    }
  });

  test("prd_show returns the artifact frontmatter", async () => {
    const t = sampleTree();
    const out = await tools.prd_show.execute({ selector: "login" }, ctx(t));
    expect(out).toContain("kind: prd");
    expect(out).toContain("slug: login");
  });

  test("prd_list lists epics and PRDs", async () => {
    const t = sampleTree();
    const out = await tools.prd_list.execute({}, ctx(t));
    expect(out).toContain("epic");
    expect(out).toContain("login");
  });

  test("prd_finalizable rejects while a slice is open", async () => {
    const t = sampleTree();
    await expect(tools.prd_finalizable.execute({ selector: "login" }, ctx(t))).rejects.toThrow(
      /open slice/,
    );
  });

  test("prd_set mutates frontmatter (readable back via prd_get)", async () => {
    const t = sampleTree();
    const set = await tools.prd_set.execute(
      { selector: "login", field: "status", value: "in-progress" },
      ctx(t),
    );
    expect(set).toContain("in-progress");
    const got = await tools.prd_get.execute({ selector: "login", field: "status" }, ctx(t));
    expect(got).toBe("in-progress");
  });

  test("prd_epic_tick marks a child PRD done", async () => {
    const t = sampleTree();
    const out = await tools.prd_epic_tick.execute({ selector: "auth", prd_slug: "login" }, ctx(t));
    expect(out).toContain("done");
  });

  test("prd_assert_kind fails on a kind mismatch", async () => {
    const t = sampleTree();
    await expect(
      tools.prd_assert_kind.execute({ selector: "login", kind: "epic" }, ctx(t)),
    ).rejects.toThrow(/not/);
  });
});
