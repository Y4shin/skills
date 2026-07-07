/**
 * Unit-test the prd-workflow tools directly — no pi runtime, no opencode.
 *
 * The tools are exported from the pi extension's createTools() factory.
 * We call execute(args, ctx) with a fake context and assert the results.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";

import { createTools } from "../src/pi/index";
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

const ctx = (directory: string) => ({ directory }) as any;

describe("prd-workflow tools", () => {
  let tools: Record<string, { description: string; execute: Function }>;

  beforeAll(() => {
    tools = createTools();
  });

  test("registers all tools with descriptions", () => {
    const names = Object.keys(tools).sort();
    expect(names.length).toBeGreaterThanOrEqual(15);
    expect(names).toContain("prd_show");
    expect(names).toContain("prd_finalizable");
    expect(names).toContain("prd_epic_tick");
    for (const t of Object.values(tools)) {
      expect(typeof t.description).toBe("string");
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
    const set = await tools.prd_set.execute({ selector: "login", field: "status", value: "in-progress" }, ctx(t));
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
    await expect(tools.prd_assert_kind.execute({ selector: "login", kind: "epic" }, ctx(t))).rejects.toThrow(/not/);
  });
});