/**
 * Tests for the artifact model — dependency levels, slice info parsing.
 */

import { describe, expect, test } from "vitest";
import {
  fromFrontmatter,
  findAnomalies,
  sliceInfoFrom,
  dependencyLevels,
  validateArtifact,
  validateCombination,
  type Artifact,
  type SliceInfo,
} from "../src/core/art.js";

describe("fromFrontmatter v4 shape", () => {
  test("parses a task artifact", () => {
    const art = fromFrontmatter({
      type: "task",
      subtype: "research",
      title: "Login",
      status: "draft",
      workflow_state: "todo",
      blocked_by: ["env"],
      mode: "human",
      size: "l",
    });
    expect(art.type).toBe("task");
    expect(art.subtype).toBe("research");
    expect(art.status).toBe("draft");
    expect(art.workflow_state).toBe("todo");
    expect(art.title).toBe("Login");
    expect(art.blocked_by).toEqual(["env"]);
    expect(art.mode).toBe("human");
    expect(art.size).toBe("l");
    expect(art.shape).toBe("v4");
  });

  test("parses a ticket artifact with no size", () => {
    const art = fromFrontmatter({ type: "ticket", subtype: "bug", status: "stable", workflow_state: "ready" });
    expect(art.type).toBe("ticket");
    expect(art.subtype).toBe("bug");
    expect(art.size).toBeNull();
    expect(art.mode).toBeNull();
  });

  test("parses a map artifact", () => {
    const art = fromFrontmatter({ type: "map", title: "Auth", status: "draft" });
    expect(art.type).toBe("map");
    expect(art.subtype).toBeNull();
    expect(art.workflow_state).toBeNull();
  });

  test("parses a spec artifact", () => {
    const art = fromFrontmatter({ type: "spec", title: "Spec", status: "draft" });
    expect(art.type).toBe("spec");
    expect(art.workflow_state).toBeNull();
  });

  test("parses an aux file", () => {
    const art = fromFrontmatter({ type: "findings", title: "Findings", status: "stable" });
    expect(art.type).toBe("findings");
    expect(art.status).toBe("stable");
  });

  test("takes the slug from the directory name when the frontmatter has none", () => {
    const art = fromFrontmatter({ type: "ticket", title: "Login" }, "login");
    expect(art.slug).toBe("login");
  });
});

describe("fromFrontmatter v3 shape", () => {
  test("maps kind to type and type to subtype", () => {
    const art = fromFrontmatter({ kind: "task", type: "feature", slug: "login", map: "auth", status: "draft" });
    expect(art.type).toBe("task");
    expect(art.subtype).toBe("feature");
    expect(art.slug).toBe("login");
    expect(art.shape).toBe("v3");
    expect(art.workflow_state).toBeNull();
  });

  test("maps a v3 map", () => {
    const art = fromFrontmatter({ kind: "map", slug: "auth", status: "draft" });
    expect(art.type).toBe("map");
    expect(art.shape).toBe("v3");
  });

  test("maps a v3 slice", () => {
    const art = fromFrontmatter({ kind: "slice", slug: "do-thing", status: "todo", size: "m" });
    expect(art.type).toBe("slice");
    expect(art.slug).toBe("do-thing");
    expect(art.size).toBe("m");
  });
});

describe("fromFrontmatter type requirement", () => {
  test("tolerates an unknown type value", () => {
    const art = fromFrontmatter({ type: "widget" });
    expect(art.type).toBe("widget");
  });

  test("rejects a missing type", () => {
    expect(() => fromFrontmatter({ title: "no type" })).toThrow(/type/);
  });

  test("rejects an empty type", () => {
    expect(() => fromFrontmatter({ type: "   " })).toThrow(/type/);
  });

  test("rejects a missing v3 kind", () => {
    expect(() => fromFrontmatter({ slug: "login" })).toThrow(/type/);
  });
});

describe("validateCombination", () => {
  test("allows draft with todo", () => {
    expect(validateCombination("draft", "todo")).toBeNull();
  });

  test("rejects draft with done", () => {
    expect(validateCombination("draft", "done")).toMatch(/draft/);
  });

  test("rejects draft with ready", () => {
    expect(validateCombination("draft", "ready")).toMatch(/draft/);
  });

  test("allows deprecated with done", () => {
    expect(validateCombination("deprecated", "done")).toBeNull();
  });

  test("rejects deprecated with todo", () => {
    expect(validateCombination("deprecated", "todo")).toMatch(/deprecated/);
  });

  test("rejects deprecated with ready", () => {
    expect(validateCombination("deprecated", "ready")).toMatch(/deprecated/);
  });

  test("allows stable with any workflow state", () => {
    for (const state of ["todo", "ready", "in-progress", "blocked", "done"]) {
      expect(validateCombination("stable", state)).toBeNull();
    }
  });

  test("absent status means stable", () => {
    expect(validateCombination(null, "done")).toBeNull();
    expect(validateCombination(null, "todo")).toBeNull();
  });

  test("absent workflow_state has no rule", () => {
    expect(validateCombination("draft", null)).toBeNull();
    expect(validateCombination("deprecated", null)).toBeNull();
  });
});

describe("validateArtifact", () => {
  test("returns no anomaly for an allowed combination", () => {
    const art = fromFrontmatter({ type: "task", status: "draft", workflow_state: "todo" });
    expect(validateArtifact(art)).toEqual([]);
  });

  test("reports an invalid combination", () => {
    const art = fromFrontmatter({ type: "task", status: "draft", workflow_state: "done" });
    const anomalies = validateArtifact(art);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].kind).toBe("invalid-combination");
    expect(anomalies[0].detail).toMatch(/draft/);
  });
});

describe("findAnomalies", () => {
  test("returns nothing for a consistent set", () => {
    const arts = [
      fromFrontmatter({ type: "map", title: "Eff", status: "draft" }, "eff"),
      fromFrontmatter({ type: "task", subtype: "research", status: "stable", workflow_state: "todo" }, "decide"),
    ];
    arts[1].path = "/repo/docs/tasks/eff/tasks/decide/task.md";
    arts[0].path = "/repo/docs/tasks/eff/map.md";
    expect(findAnomalies(arts)).toEqual([]);
  });

  test("reports a type that disagrees with its location", () => {
    const art = fromFrontmatter({ type: "task", status: "stable", workflow_state: "todo" }, "login");
    art.path = "/repo/docs/tasks/eff/tickets/login/ticket.md";
    const map = fromFrontmatter({ type: "map", status: "draft" }, "eff");
    map.path = "/repo/docs/tasks/eff/map.md";
    const anomalies = findAnomalies([map, art]);
    expect(anomalies.map((a) => a.kind)).toContain("orphan");
    expect(anomalies.find((a) => a.kind === "orphan")!.artifact).toBe("login");
  });

  test("reports a task in an effort directory with neither map nor spec", () => {
    const art = fromFrontmatter({ type: "task", status: "stable", workflow_state: "todo" }, "decide");
    art.path = "/repo/docs/tasks/eff/tasks/decide/task.md";
    const anomalies = findAnomalies([art]);
    expect(anomalies.map((a) => a.kind)).toContain("orphan");
  });

  test("reports a blocked_by target that does not exist", () => {
    const art = fromFrontmatter(
      { type: "task", status: "stable", workflow_state: "todo", blocked_by: ["ghost"] },
      "decide",
    );
    art.path = "/repo/docs/tasks/eff/tasks/decide/task.md";
    const map = fromFrontmatter({ type: "map", status: "draft" }, "eff");
    map.path = "/repo/docs/tasks/eff/map.md";
    const anomalies = findAnomalies([map, art]);
    expect(anomalies.map((a) => a.kind)).toContain("missing-blocked-by-target");
    expect(anomalies.find((a) => a.kind === "missing-blocked-by-target")!.detail).toContain("ghost");
  });

  test("does not report a blocked_by target that exists in the same effort", () => {
    const a = fromFrontmatter({ type: "task", status: "stable", workflow_state: "todo" }, "first");
    a.path = "/repo/docs/tasks/eff/tasks/first/task.md";
    const b = fromFrontmatter(
      { type: "task", status: "stable", workflow_state: "todo", blocked_by: ["first"] },
      "second",
    );
    b.path = "/repo/docs/tasks/eff/tasks/second/task.md";
    const map = fromFrontmatter({ type: "map", status: "draft" }, "eff");
    map.path = "/repo/docs/tasks/eff/map.md";
    expect(findAnomalies([map, a, b])).toEqual([]);
  });

  test("reports a v4 task.md that declares type ticket (both orphan directions)", () => {
    const map = fromFrontmatter({ type: "map", status: "draft" }, "eff");
    map.path = "/repo/docs/tasks/eff/map.md";
    const asTicket = fromFrontmatter({ type: "ticket", status: "stable", workflow_state: "todo" }, "decide");
    asTicket.path = "/repo/docs/tasks/eff/tasks/decide/task.md";
    const anomalies = findAnomalies([map, asTicket]);
    expect(anomalies.map((a) => a.kind)).toContain("orphan");
    expect(anomalies[0].detail).toMatch(/declares type 'ticket', not 'task'/);
  });

  test("does not flag a v3 flat task.md as an orphan (task.md is v3-neutral)", () => {
    const art = fromFrontmatter({ kind: "task", type: "feature", slug: "legacy", status: "done" });
    art.path = "/repo/docs/tasks/legacy/task.md";
    expect(findAnomalies([art])).toEqual([]);
  });

  test("does not flag a v3 flat task for lacking a map or spec anchor", () => {
    const art = fromFrontmatter({ kind: "task", type: "feature", slug: "legacy", status: "done" });
    art.path = "/repo/docs/tasks/legacy/task.md";
    expect(findAnomalies([art]).filter((a) => a.kind === "orphan")).toEqual([]);
  });

  test("scopes v3 tasks by their map field, so a sibling dependency resolves", () => {
    const a = fromFrontmatter({ kind: "task", type: "feature", slug: "first", map: "eff", status: "done" });
    a.path = "/repo/docs/tasks/first/task.md";
    const b = fromFrontmatter({
      kind: "task",
      type: "feature",
      slug: "second",
      map: "eff",
      status: "ready",
      blocked_by: ["first"],
    });
    b.path = "/repo/docs/tasks/second/task.md";
    expect(findAnomalies([a, b])).toEqual([]);
  });

  test("reports a v3 blocked_by edge across two different maps", () => {
    const a = fromFrontmatter({ kind: "task", type: "feature", slug: "first", map: "eff-a", status: "done" });
    a.path = "/repo/docs/tasks/archive/first/task.md";
    const b = fromFrontmatter({
      kind: "task",
      type: "feature",
      slug: "second",
      map: "eff-b",
      status: "ready",
      blocked_by: ["first"],
    });
    b.path = "/repo/docs/tasks/archive/second/task.md";
    const anomalies = findAnomalies([a, b]);
    expect(anomalies.map((x) => x.kind)).toContain("missing-blocked-by-target");
  });

  test("keeps archived efforts distinct instead of collapsing them into one bucket", () => {
    const a = fromFrontmatter({ kind: "task", type: "feature", slug: "first", status: "done" });
    a.path = "/repo/docs/tasks/archive/eff-a/task.md";
    const b = fromFrontmatter({
      kind: "task",
      type: "feature",
      slug: "second",
      status: "ready",
      blocked_by: ["first"],
    });
    b.path = "/repo/docs/tasks/archive/eff-b/task.md";
    expect(findAnomalies([a, b]).map((x) => x.kind)).toContain("missing-blocked-by-target");
  });
});

describe("sliceInfoFrom", () => {
  test("parses filename and frontmatter", () => {
    const info = sliceInfoFrom("3-do-thing.md", {
      status: "todo",
      size: "m",
      blocked_by: ["env-loading"],
    });
    expect(info.number).toBe(3);
    expect(info.slug).toBe("do-thing");
    expect(info.status).toBe("todo");
    expect(info.size).toBe("m");
    expect(info.blocked_by).toEqual(["env-loading"]);
  });

  test("handles missing blocked_by", () => {
    const info = sliceInfoFrom("1-first.md", { status: "todo" });
    expect(info.blocked_by).toEqual([]);
  });

  test("throws on bad filename", () => {
    expect(() => sliceInfoFrom("bad-file.md", {})).toThrow();
  });
});

describe("dependencyLevels", () => {
  test("single slice with no deps returns one level", () => {
    const slices: SliceInfo[] = [
      { number: 1, slug: "a", status: "todo", size: "m", blocked_by: [] },
    ];
    expect(dependencyLevels(slices)).toEqual([["a"]]);
  });

  test("chain dependency produces sequential levels", () => {
    const slices: SliceInfo[] = [
      { number: 1, slug: "a", status: "todo", size: "m", blocked_by: [] },
      { number: 2, slug: "b", status: "todo", size: "m", blocked_by: ["a"] },
      { number: 3, slug: "c", status: "todo", size: "m", blocked_by: ["b"] },
    ];
    expect(dependencyLevels(slices)).toEqual([["a"], ["b"], ["c"]]);
  });

  test("independent slices share a level", () => {
    const slices: SliceInfo[] = [
      { number: 1, slug: "a", status: "todo", size: "m", blocked_by: [] },
      { number: 2, slug: "b", status: "todo", size: "m", blocked_by: [] },
      { number: 3, slug: "c", status: "todo", size: "m", blocked_by: ["a", "b"] },
    ];
    const levels = dependencyLevels(slices);
    expect(levels[0]).toEqual(expect.arrayContaining(["a", "b"]));
    expect(levels[1]).toEqual(["c"]);
  });

  test("diamond dependency resolves", () => {
    const slices: SliceInfo[] = [
      { number: 1, slug: "a", status: "todo", size: "m", blocked_by: [] },
      { number: 2, slug: "b", status: "todo", size: "m", blocked_by: ["a"] },
      { number: 3, slug: "c", status: "todo", size: "m", blocked_by: ["a"] },
      { number: 4, slug: "d", status: "todo", size: "m", blocked_by: ["b", "c"] },
    ];
    const levels = dependencyLevels(slices);
    expect(levels[0]).toEqual(["a"]);
    expect(levels[1]).toEqual(expect.arrayContaining(["b", "c"]));
    expect(levels[2]).toEqual(["d"]);
  });

  test("handles circular deps gracefully", () => {
    const slices: SliceInfo[] = [
      { number: 1, slug: "a", status: "todo", size: "m", blocked_by: ["b"] },
      { number: 2, slug: "b", status: "todo", size: "m", blocked_by: ["a"] },
    ];
    // Should not deadlock — puts remaining in one level
    const levels = dependencyLevels(slices);
    expect(levels.length).toBe(1);
    expect(levels[0]).toEqual(expect.arrayContaining(["a", "b"]));
  });
});