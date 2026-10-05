/**
 * Tests for the artifact model: dependency levels.
 */

import { describe, expect, test } from "vitest";
import {
  fromFrontmatter,
  findAnomalies,
  dependencyLevels,
  validateArtifact,
  validateCombination,
  KNOWN_TYPES,
  TYPE_LEAF,
  type Artifact,
  type WorkItemInfo,
} from "../src/core/art.js";
import { parse, dump } from "../src/core/frontmatter.js";

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

  test("reads a v4 subtype verbatim, even when it equals the type", () => {
    // In v4 `subtype` is its own key, so an equal value is real data, not the
    // v3 `kind`/`type` collision.
    expect(fromFrontmatter({ type: "task", subtype: "task" }).subtype).toBe("task");
  });
});

describe("schema 5 types", () => {
  test("architecture and review are known types with their effort-root filenames", () => {
    expect(KNOWN_TYPES).toContain("architecture");
    expect(KNOWN_TYPES).toContain("review");
    expect(TYPE_LEAF["architecture"]).toBe("architecture.md");
    expect(TYPE_LEAF["review"]).toBe("review.md");
  });

  test("an architecture.md at the effort root parses and is not an orphan", () => {
    const map = fromFrontmatter({ type: "map", status: "stable" }, "eff");
    map.path = "/repo/docs/tasks/eff/map.md";
    const arch = fromFrontmatter(
      { type: "architecture", title: "Effort architecture", status: "stable" },
      "eff",
    );
    arch.path = "/repo/docs/tasks/eff/architecture.md";
    expect(arch.type).toBe("architecture");
    expect(findAnomalies([map, arch])).toEqual([]);
  });

  test("a review.md at the effort root parses and is not an orphan", () => {
    const map = fromFrontmatter({ type: "map", status: "stable" }, "eff");
    map.path = "/repo/docs/tasks/eff/map.md";
    const review = fromFrontmatter(
      { type: "review", title: "Effort review", status: "stable" },
      "eff",
    );
    review.path = "/repo/docs/tasks/eff/review.md";
    expect(review.type).toBe("review");
    expect(findAnomalies([map, review])).toEqual([]);
  });

  test("a file in the new names claiming another type is still an orphan", () => {
    // The filename implies the type, so a mismatch is caught exactly as for
    // the older leaves.
    const map = fromFrontmatter({ type: "map", status: "stable" }, "eff");
    map.path = "/repo/docs/tasks/eff/map.md";
    const wrong = fromFrontmatter({ type: "spec", status: "stable" }, "eff");
    wrong.path = "/repo/docs/tasks/eff/architecture.md";
    const anomalies = findAnomalies([map, wrong]);
    expect(anomalies.map((a) => a.kind)).toContain("orphan");
    expect(anomalies.find((a) => a.kind === "orphan")!.detail).toMatch(/not 'architecture'/);
  });
});

describe("legacy arch spec shape", () => {
  test("type: arch spec still parses as its own type", () => {
    const arch = fromFrontmatter(
      { type: "arch spec", title: "Architecture", status: "stable" },
      "eff",
    );
    expect(arch.type).toBe("arch spec");
    expect(arch.workflow_state).toBeNull();
  });

  test("an arch-spec.md at the effort root is not an orphan", () => {
    // The v4 shape stays readable until the migration runs, so a v4 tree
    // keeps parsing with no anomaly raised against its arch spec.
    const map = fromFrontmatter({ type: "map", status: "stable" }, "eff");
    map.path = "/repo/docs/tasks/eff/map.md";
    const arch = fromFrontmatter({ type: "arch spec", status: "stable" }, "eff");
    arch.path = "/repo/docs/tasks/eff/arch-spec.md";
    expect(findAnomalies([map, arch])).toEqual([]);
  });

  test("a v4 tree with both the legacy and the schema-5 shape parses cleanly", () => {
    // The migration renames arch-spec.md to architecture.md; before it runs,
    // a tree can hold either (or, mid-effort, both in different efforts).
    const legacyMap = fromFrontmatter({ type: "map", status: "stable" }, "old-eff");
    legacyMap.path = "/repo/docs/tasks/old-eff/map.md";
    const legacy = fromFrontmatter({ type: "arch spec", status: "stable" }, "old-eff");
    legacy.path = "/repo/docs/tasks/old-eff/arch-spec.md";
    const newMap = fromFrontmatter({ type: "map", status: "stable" }, "new-eff");
    newMap.path = "/repo/docs/tasks/new-eff/map.md";
    const modern = fromFrontmatter({ type: "architecture", status: "stable" }, "new-eff");
    modern.path = "/repo/docs/tasks/new-eff/architecture.md";
    expect(findAnomalies([legacyMap, legacy, newMap, modern])).toEqual([]);
  });
});

describe("map frontmatter, schema 5", () => {
  test("ready_for_spec reads as false when absent", () => {
    expect(fromFrontmatter({ type: "map" }).ready_for_spec).toBe(false);
  });

  test("ready_for_spec reads as false when explicitly false", () => {
    // The user amendment: an explicit false is allowed, and absent and false
    // are treated identically by every consumer.
    expect(fromFrontmatter({ type: "map", ready_for_spec: false }).ready_for_spec).toBe(false);
  });

  test("ready_for_spec reads as true only when the boolean is set", () => {
    expect(fromFrontmatter({ type: "map", ready_for_spec: true }).ready_for_spec).toBe(true);
  });

  test("a non-boolean ready_for_spec reads as false, never truthy", () => {
    expect(fromFrontmatter({ type: "map", ready_for_spec: "true" }).ready_for_spec).toBe(false);
  });

  test("origin_effort round-trips when present and is null when absent", () => {
    expect(fromFrontmatter({ type: "map", origin_effort: "auth" }).origin_effort).toBe("auth");
    expect(fromFrontmatter({ type: "map" }).origin_effort).toBeNull();
    expect(fromFrontmatter({ type: "map", origin_effort: "  " }).origin_effort).toBeNull();
  });

  test("the schema-5 map fields survive a full frontmatter round-trip", () => {
    const text = dump({
      data: { type: "map", title: "Follow-up", ready_for_spec: true, origin_effort: "auth" },
      body: "# Follow-up\n",
    });
    const doc = parse(text);
    const art = fromFrontmatter(doc.data);
    expect(art.ready_for_spec).toBe(true);
    expect(art.origin_effort).toBe("auth");
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

  test("accepts a map's feature-to-feature edge to another effort's map", () => {
    // A map's blocked_by holds feature-to-feature edges, so its target is
    // always in a different effort. Flagging it would make every real map
    // edge a false positive.
    const a = fromFrontmatter({ type: "map", status: "stable" }, "eff-a");
    a.path = "/repo/docs/tasks/eff-a/map.md";
    const b = fromFrontmatter({ type: "map", status: "stable", blocked_by: ["eff-a"] }, "eff-b");
    b.path = "/repo/docs/tasks/eff-b/map.md";
    expect(findAnomalies([a, b])).toEqual([]);
  });

  test("still reports a map edge whose target map does not exist", () => {
    const b = fromFrontmatter({ type: "map", status: "stable", blocked_by: ["ghost-effort"] }, "eff-b");
    b.path = "/repo/docs/tasks/eff-b/map.md";
    expect(findAnomalies([b]).map((x) => x.kind)).toContain("missing-blocked-by-target");
  });

  test("catches a v4 task.md in a task directory literally named 'tasks'", () => {
    const art = fromFrontmatter({ type: "ticket", status: "stable", workflow_state: "todo" }, "x");
    art.path = "/repo/docs/tasks/eff/tasks/tasks/task.md";
    const map = fromFrontmatter({ type: "map", status: "draft" }, "eff");
    map.path = "/repo/docs/tasks/eff/map.md";
    expect(findAnomalies([map, art]).map((a) => a.kind)).toContain("orphan");
  });
});

describe("dependencyLevels", () => {
  test("single item with no deps returns one level", () => {
    const items: WorkItemInfo[] = [
      { slug: "a", status: "todo", type: null, size: "m", blocked_by: [] },
    ];
    expect(dependencyLevels(items)).toEqual([["a"]]);
  });

  test("chain dependency produces sequential levels", () => {
    const items: WorkItemInfo[] = [
      { slug: "a", status: "todo", type: null, size: "m", blocked_by: [] },
      { slug: "b", status: "todo", type: null, size: "m", blocked_by: ["a"] },
      { slug: "c", status: "todo", type: null, size: "m", blocked_by: ["b"] },
    ];
    expect(dependencyLevels(items)).toEqual([["a"], ["b"], ["c"]]);
  });

  test("independent items share a level", () => {
    const items: WorkItemInfo[] = [
      { slug: "a", status: "todo", type: null, size: "m", blocked_by: [] },
      { slug: "b", status: "todo", type: null, size: "m", blocked_by: [] },
      { slug: "c", status: "todo", type: null, size: "m", blocked_by: ["a", "b"] },
    ];
    const levels = dependencyLevels(items);
    expect(levels[0]).toEqual(expect.arrayContaining(["a", "b"]));
    expect(levels[1]).toEqual(["c"]);
  });

  test("diamond dependency resolves", () => {
    const items: WorkItemInfo[] = [
      { slug: "a", status: "todo", type: null, size: "m", blocked_by: [] },
      { slug: "b", status: "todo", type: null, size: "m", blocked_by: ["a"] },
      { slug: "c", status: "todo", type: null, size: "m", blocked_by: ["a"] },
      { slug: "d", status: "todo", type: null, size: "m", blocked_by: ["b", "c"] },
    ];
    const levels = dependencyLevels(items);
    expect(levels[0]).toEqual(["a"]);
    expect(levels[1]).toEqual(expect.arrayContaining(["b", "c"]));
    expect(levels[2]).toEqual(["d"]);
  });

  test("handles circular deps gracefully", () => {
    const items: WorkItemInfo[] = [
      { slug: "a", status: "todo", type: null, size: "m", blocked_by: ["b"] },
      { slug: "b", status: "todo", type: null, size: "m", blocked_by: ["a"] },
    ];
    // Should not deadlock — puts remaining in one level
    const levels = dependencyLevels(items);
    expect(levels.length).toBe(1);
    expect(levels[0]).toEqual(expect.arrayContaining(["a", "b"]));
  });
});