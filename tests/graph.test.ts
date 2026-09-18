/**
 * Model-seam tests for the scan-based effort graph.
 *
 * Pure computation over hand-built Artifact lists: no file I/O. The tool
 * contract seam (createTools against fixture trees) lives in
 * tests/plugin.test.ts.
 */

import { describe, expect, test } from "vitest";
import {
  effortGraphs,
  effortFrontier,
  effortLevels,
  effortFinalizable,
  liveFrontier,
  itemFinalizable,
  type ScanIndexLike,
} from "../src/core/graph.js";
import type { Artifact } from "../src/core/art.js";

interface ArtOpts {
  status?: string | null;
  workflow_state?: string | null;
  blocked_by?: string[];
  subtype?: string | null;
  shape?: "v3" | "v4";
}

function art(type: string, slug: string, path: string, opts: ArtOpts = {}): Artifact {
  return {
    type,
    subtype: opts.subtype ?? null,
    status: opts.status === undefined ? "stable" : opts.status,
    workflow_state: opts.workflow_state === undefined ? null : opts.workflow_state,
    slug,
    title: slug,
    mode: null,
    size: null,
    blocked_by: opts.blocked_by ?? [],
    shape: opts.shape ?? "v4",
    path,
    data: {},
  };
}

function task(slug: string, effort: string, opts: ArtOpts = {}): Artifact {
  return art("task", slug, `docs/tasks/${effort}/tasks/${slug}/task.md`, opts);
}

function ticket(slug: string, effort: string, opts: ArtOpts = {}): Artifact {
  return art("ticket", slug, `docs/tasks/${effort}/tickets/${slug}/ticket.md`, opts);
}

function map(slug: string, effort: string, opts: ArtOpts = {}): Artifact {
  return art("map", slug, `docs/tasks/${effort}/map.md`, opts);
}

function spec(slug: string, effort: string, opts: ArtOpts = {}): Artifact {
  return art("spec", slug, `docs/tasks/${effort}/spec.md`, opts);
}

function index(hits: Artifact[]): ScanIndexLike {
  return { hits: hits.map((a) => ({ path: a.path!, art: a })), anomalies: [] };
}

/** The one effort graph in an index, by anchor slug. */
function graphFor(idx: ScanIndexLike, slug: string) {
  const g = [...effortGraphs(idx).values()].find((e) => e.slug === slug);
  if (!g) throw new Error(`no effort graph '${slug}'`);
  return g;
}

describe("effortGraphs", () => {
  test("groups a mixed scan into efforts and separates deprecated artifacts", () => {
    const idx = index([
      map("billing", "billing"),
      spec("billing", "billing"),
      task("research", "billing", { workflow_state: "todo" }),
      task("prototype", "billing", { workflow_state: "done" }),
      ticket("login", "billing", { workflow_state: "ready" }),
      ticket("legacy", "billing", { status: "deprecated", workflow_state: "done" }),
      art("findings", "login-findings", "docs/tasks/billing/tickets/login/findings.md"),
      map("auth", "auth"),
      task("sso", "auth", { workflow_state: "todo" }),
    ]);

    const graphs = effortGraphs(idx);
    expect([...graphs.values()].map((g) => g.slug).sort()).toEqual(["auth", "billing"]);

    const billing = graphFor(idx, "billing");
    expect(billing.map?.slug).toBe("billing");
    expect(billing.spec?.slug).toBe("billing");
    expect(billing.tasks.map((t) => t.slug)).toEqual(["research", "prototype"]);
    expect(billing.tickets.map((t) => t.slug)).toEqual(["login"]);
    expect(billing.deprecated.map((t) => t.slug)).toEqual(["legacy"]);
  });

  test("carries the anomalies touching the effort", () => {
    const idx: ScanIndexLike = {
      hits: [{ path: "docs/tasks/billing/tasks/research/task.md", art: task("research", "billing", { workflow_state: "todo" }) }],
      anomalies: [
        { kind: "missing-blocked-by-target", artifact: "research", detail: "artifact 'research' is blocked by 'ghost'" },
        { kind: "orphan", artifact: "elsewhere", detail: "artifact 'elsewhere' sits in effort 'other'" },
      ],
    };
    expect(graphFor(idx, "billing").anomalies.map((a) => a.artifact)).toEqual(["research"]);
  });

  test("an effort with no map anchors on the directory name", () => {
    const idx = index([spec("spec-only", "spec-only"), task("decide", "spec-only", { workflow_state: "todo" })]);
    expect(graphFor(idx, "spec-only").map).toBeNull();
    expect(graphFor(idx, "spec-only").spec?.slug).toBe("spec-only");
  });

  test("a spec-only effort is not finalizable (the false-finalizable class)", () => {
    // The pi-harness-evals class: an effort whose only artifact is a spec
    // must never read as finalizable, map or no map.
    const idx = index([spec("spec-only", "spec-only")]);
    const reason = effortFinalizable(graphFor(idx, "spec-only"));
    expect(reason).not.toBeNull();
    expect(reason).toMatch(/no tickets/);
  });
});

describe("effortFrontier", () => {
  test("returns unfinished items whose blockers are done, per kind", () => {
    const idx = index([
      map("billing", "billing"),
      task("done-task", "billing", { workflow_state: "done" }),
      task("ready-task", "billing", { workflow_state: "todo", blocked_by: ["done-task"] }),
      task("blocked-task", "billing", { workflow_state: "todo", blocked_by: ["ready-task"] }),
      ticket("blocked-ticket", "billing", { workflow_state: "todo", blocked_by: ["open-ticket"] }),
      ticket("open-ticket", "billing", { workflow_state: "in-progress" }),
    ]);

    const frontier = effortFrontier(graphFor(idx, "billing"));
    expect(frontier.map((a) => a.slug).sort()).toEqual(["open-ticket", "ready-task"]);
  });

  test("kind scoping: a ticket blocked by a task slug is not gated by that task", () => {
    const idx = index([
      map("billing", "billing"),
      task("research", "billing", { workflow_state: "todo" }),
      ticket("login", "billing", { workflow_state: "todo", blocked_by: ["research"] }),
    ]);
    expect(effortFrontier(graphFor(idx, "billing")).map((a) => a.slug).sort()).toEqual(["login", "research"]);
  });

  test("deprecated items sit out of the frontier", () => {
    const idx = index([
      map("billing", "billing"),
      ticket("legacy", "billing", { status: "deprecated", workflow_state: "done" }),
      ticket("login", "billing", { workflow_state: "todo" }),
    ]);
    expect(effortFrontier(graphFor(idx, "billing")).map((a) => a.slug)).toEqual(["login"]);
  });
});

describe("effortLevels", () => {
  test("levels task chains and ticket chains independently", () => {
    const idx = index([
      map("billing", "billing"),
      task("t1", "billing", { workflow_state: "todo" }),
      task("t2", "billing", { workflow_state: "todo", blocked_by: ["t1"] }),
      ticket("k1", "billing", { workflow_state: "todo" }),
      ticket("k2", "billing", { workflow_state: "todo", blocked_by: ["k1"] }),
      ticket("k3", "billing", { workflow_state: "todo", blocked_by: ["k2"] }),
    ]);

    const levels = effortLevels(graphFor(idx, "billing"));
    expect(levels.tasks).toEqual([["t1"], ["t2"]]);
    expect(levels.tickets).toEqual([["k1"], ["k2"], ["k3"]]);
    expect(levels.remaining_count).toBe(5);
    expect(levels.done_count).toBe(0);
  });

  test("a cycle in one kind does not deadlock the other", () => {
    const idx = index([
      map("billing", "billing"),
      task("a", "billing", { workflow_state: "todo", blocked_by: ["b"] }),
      task("b", "billing", { workflow_state: "todo", blocked_by: ["a"] }),
      ticket("k1", "billing", { workflow_state: "todo" }),
      ticket("k2", "billing", { workflow_state: "todo", blocked_by: ["k1"] }),
    ]);

    const levels = effortLevels(graphFor(idx, "billing"));
    expect(levels.tasks).toEqual([["a", "b"]]);
    expect(levels.tickets).toEqual([["k1"], ["k2"]]);
  });

  test("done and deprecated items count as done and stay out of the levels", () => {
    const idx = index([
      map("billing", "billing"),
      task("finished", "billing", { workflow_state: "done" }),
      task("dropped", "billing", { status: "deprecated", workflow_state: "done" }),
      ticket("open", "billing", { workflow_state: "ready", blocked_by: ["finished"] }),
    ]);

    const levels = effortLevels(graphFor(idx, "billing"));
    expect(levels.tasks).toEqual([]);
    expect(levels.tickets).toEqual([["open"]]);
    expect(levels.remaining_count).toBe(1);
    expect(levels.done_count).toBe(2);
  });
});

describe("effortFinalizable", () => {
  test("a map-only effort is finalizable", () => {
    const idx = index([map("billing", "billing")]);
    expect(effortFinalizable(graphFor(idx, "billing"))).toBeNull();
  });

  test("all done with a spec and one ticket is finalizable", () => {
    const idx = index([
      map("billing", "billing"),
      spec("billing", "billing"),
      task("research", "billing", { workflow_state: "done" }),
      ticket("login", "billing", { workflow_state: "done" }),
    ]);
    expect(effortFinalizable(graphFor(idx, "billing"))).toBeNull();
  });

  test("all done with a spec and zero tickets is not finalizable", () => {
    const idx = index([
      map("billing", "billing"),
      spec("billing", "billing"),
      task("research", "billing", { workflow_state: "done" }),
    ]);
    const reason = effortFinalizable(graphFor(idx, "billing"));
    expect(reason).not.toBeNull();
    expect(reason).toMatch(/ticket/);
  });

  test("one unfinished ticket blocks finalizability and names it", () => {
    const idx = index([
      map("billing", "billing"),
      spec("billing", "billing"),
      ticket("login", "billing", { workflow_state: "in-progress" }),
    ]);
    const reason = effortFinalizable(graphFor(idx, "billing"));
    expect(reason).not.toBeNull();
    expect(reason).toContain("login");
  });

  test("a deprecated ticket counts as done, so a spec-plus-deprecated-ticket effort is finalizable", () => {
    const idx = index([
      map("billing", "billing"),
      spec("billing", "billing"),
      ticket("legacy", "billing", { status: "deprecated", workflow_state: "done" }),
    ]);
    expect(effortFinalizable(graphFor(idx, "billing"))).toBeNull();
  });
});

describe("liveFrontier", () => {
  test("an effort-to-effort edge delays readiness until the blocking effort is done", () => {
    const idx = index([
      map("auth", "auth", { blocked_by: [] }),
      task("sso", "auth", { workflow_state: "in-progress" }),
      map("billing", "billing", { blocked_by: ["auth"] }),
      task("research", "billing", { workflow_state: "todo" }),
    ]);

    expect(liveFrontier(idx).map((g) => g.slug)).toEqual(["auth"]);

    const done = index([
      map("auth", "auth", { blocked_by: [] }),
      task("sso", "auth", { workflow_state: "done" }),
      map("billing", "billing", { blocked_by: ["auth"] }),
      task("research", "billing", { workflow_state: "todo" }),
    ]);
    expect(liveFrontier(done).map((g) => g.slug).sort()).toEqual(["billing"]);
  });

  test("a fully done effort is not in the frontier", () => {
    const idx = index([
      map("auth", "auth"),
      task("sso", "auth", { workflow_state: "done" }),
    ]);
    expect(liveFrontier(idx)).toEqual([]);
  });

  test("a deprecated blocking map counts as done", () => {
    const idx = index([
      map("auth", "auth", { status: "deprecated" }),
      task("sso", "auth", { workflow_state: "done" }),
      map("billing", "billing", { blocked_by: ["auth"] }),
      ticket("login", "billing", { workflow_state: "todo" }),
    ]);
    expect(liveFrontier(idx).map((g) => g.slug)).toEqual(["billing"]);
  });
});

describe("itemFinalizable", () => {
  test("done is ready to finalize", () => {
    expect(itemFinalizable(task("research", "billing", { workflow_state: "done" }))).toBeNull();
  });

  test.each(["todo", "ready", "in-progress", "blocked"])("names the state when it is '%s'", (state) => {
    const reason = itemFinalizable(task("research", "billing", { workflow_state: state }));
    expect(reason).not.toBeNull();
    expect(reason).toContain(state);
  });

  test("an absent workflow_state names that instead of passing", () => {
    const reason = itemFinalizable(task("research", "billing", { workflow_state: null }));
    expect(reason).not.toBeNull();
    expect(reason).toMatch(/workflow_state/);
  });

  test("a v3-shape artifact falls back to status: done", () => {
    expect(
      itemFinalizable(task("legacy", "legacy", { shape: "v3", status: "done", workflow_state: null })),
    ).toBeNull();
  });

  test("a v3-shape artifact with an unfinished status names it", () => {
    const reason = itemFinalizable(
      task("legacy", "legacy", { shape: "v3", status: "ready", workflow_state: null }),
    );
    expect(reason).not.toBeNull();
    expect(reason).toContain("ready");
  });
});
