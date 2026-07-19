/**
 * Tests for frontmatter parsing — pure functions, no I/O.
 */

import { describe, expect, test } from "vitest";
import { parse, dump } from "../src/core/frontmatter.js";

describe("parse", () => {
  test("parses valid frontmatter", () => {
    const doc = parse("---\nkind: task\nslug: login\n---\n# Body\n");
    expect(doc.data.kind).toBe("task");
    expect(doc.data.slug).toBe("login");
    expect(doc.body).toBe("# Body\n");
  });

  test("handles multi-line body", () => {
    const doc = parse("---\nkind: task\n---\n# Title\n\nSome text.\n");
    expect(doc.body).toBe("# Title\n\nSome text.\n");
  });

  test("throws on missing opening fence", () => {
    expect(() => parse("no fence here")).toThrow();
  });

  test("throws on unterminated fence", () => {
    expect(() => parse("---\nkind: task\n")).toThrow();
  });

  test("throws on non-mapping frontmatter", () => {
    expect(() => parse("---\nhello\n---\nbody")).toThrow();
  });
});

describe("dump", () => {
  test("serializes back to string", () => {
    const doc = { data: { kind: "task", slug: "login" }, body: "# Body\n" };
    const out = dump(doc);
    expect(out).toContain("kind: task");
    expect(out).toContain("slug: login");
    expect(out).toContain("# Body");
  });

  test("round-trips through parse", () => {
    const input = "---\nkind: task\nslug: login\n---\n# Body\n";
    const doc = parse(input);
    const output = dump(doc);
    expect(parse(output).data).toEqual(doc.data);
    expect(parse(output).body).toBe(doc.body);
  });
});