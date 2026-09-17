/**
 * Tests for the v4 migration (src/core/migrate.ts), the approved seam:
 * `migrate(tree, opts)` against an in-memory TreePort seeded with one fixture
 * per vintage. Asserts the end state, idempotence, resumability, corruption
 * safety, and the report.
 */

import { describe, expect, test } from "vitest";
import { migrate, verifyStagedWrite, type TreePort } from "../src/core/migrate.js";
import { parse, dump } from "../src/core/frontmatter.js";

/** An in-memory TreePort: staged changes land only on commit. */
class MemPort implements TreePort {
  private files = new Map<string, string>();
  private writes = new Map<string, string>();
  private moves: Array<[string, string]> = [];
  private deletes: string[] = [];

  constructor(files: Record<string, string> = {}) {
    for (const [k, v] of Object.entries(files)) this.files.set(k, v);
  }

  list(): string[] {
    return [...this.files.keys()].sort();
  }

  read(path: string): string {
    const v = this.files.get(path);
    if (v === undefined) throw new Error(`no such file: ${path}`);
    return v;
  }

  stageWrite(path: string, content: string): void {
    this.writes.set(path, content);
  }

  stageMove(from: string, to: string): void {
    this.moves.push([from, to]);
  }

  stageDelete(path: string): void {
    this.deletes.push(path);
  }

  commit(opts: { failAfterWrites?: number } = {}): void {
    // The atomicity boundary: nothing lands until every write is verified.
    for (const [path, content] of this.writes) verifyStagedWrite(path, content);
    let n = 0;
    for (const [from, to] of this.moves) {
      n++;
      if (opts.failAfterWrites !== undefined && n === opts.failAfterWrites) {
        throw new Error(`injected failure at write ${n}`);
      }
      const content = this.files.get(from);
      if (content === undefined) throw new Error(`no such file: ${from}`);
      this.files.delete(from);
      this.files.set(to, content);
    }
    for (const [path, content] of this.writes) {
      n++;
      if (opts.failAfterWrites !== undefined && n === opts.failAfterWrites) {
        throw new Error(`injected failure at write ${n}`);
      }
      this.files.set(path, content);
    }
    for (const path of this.deletes) this.files.delete(path);
    this.writes.clear();
    this.moves = [];
    this.deletes = [];
  }

  rollback(): void {
    this.writes.clear();
    this.moves = [];
    this.deletes = [];
  }

  /** The committed tree, for assertions. */
  snapshot(): Record<string, string> {
    return Object.fromEntries([...this.files.entries()].sort());
  }
}

function port(files: Record<string, string> = {}): MemPort {
  return new MemPort(files);
}

describe("migrate: fresh repo", () => {
  test("a repo with no docs/tasks lands on the v4 scaffold", () => {
    const tree = port({ "README.md": "# hi\n" });
    const report = migrate(tree);

    expect(report.from).toBe(0);
    expect(report.to).toBe(4);
    expect(report.noop).toBe(false);

    const files = tree.snapshot();
    expect(files["docs/tasks/state.yaml"]).toBe(
      "schema_version: 4\nmap: null\ntask: null\n",
    );
    expect(files["docs/tasks/index.md"]).toContain('okf_version: "0.2"');
    expect(files["docs/tasks/CHANGELOG.md"]).toContain("type: changelog");
    expect(files["README.md"]).toBe("# hi\n");
  });

  test("every markdown the migration writes carries parseable YAML", () => {
    const tree = port({});
    migrate(tree);
    for (const [path, content] of Object.entries(tree.snapshot())) {
      if (!path.endsWith(".md")) continue;
      const doc = parse(content);
      // The round-trip is stable: dump(parse(x)) re-parses to the same data.
      expect(parse(dump(doc)).data).toEqual(doc.data);
    }
  });
});
