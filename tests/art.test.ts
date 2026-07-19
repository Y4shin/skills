/**
 * Tests for the artifact model — dependency levels, slice info parsing.
 */

import { describe, expect, test } from "vitest";
import { fromFrontmatter, sliceInfoFrom, dependencyLevels, type SliceInfo } from "../src/core/art.js";

describe("fromFrontmatter", () => {
  test("parses a task artifact", () => {
    const art = fromFrontmatter({ kind: "task", slug: "login", title: "Login", status: "draft" });
    expect(art.kind).toBe("task");
    expect(art.slug).toBe("login");
    expect(art.status).toBe("draft");
  });

  test("parses an epic artifact", () => {
    const art = fromFrontmatter({ kind: "epic", slug: "auth", status: "draft" });
    expect(art.kind).toBe("epic");
  });

  test("parses a slice artifact", () => {
    const art = fromFrontmatter({ kind: "slice", slug: "do-thing", status: "todo", size: "m" });
    expect(art.kind).toBe("slice");
    expect(art.slug).toBe("do-thing");
  });

  test("throws on invalid kind", () => {
    expect(() => fromFrontmatter({ kind: "widget" })).toThrow();
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