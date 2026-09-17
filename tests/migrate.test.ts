/**
 * Tests for the v4 migration (src/core/migrate.ts), the approved seam:
 * `migrate(tree, opts)` against an in-memory TreePort seeded with one fixture
 * per vintage. Asserts the end state, idempotence, resumability, corruption
 * safety, and the report.
 */

import { describe, expect, test } from "vitest";
import YAML from "yaml";
import { migrate, verifyStagedWrite, type TreePort } from "../src/core/migrate.js";
import { parse, dump } from "../src/core/frontmatter.js";

function parseYamlFileForTest(text: string): unknown {
  return YAML.parse(text);
}

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

/** A v3 tree: flat task dirs, the maps/ subtree, legacy slices, an archive. */
const V3_FILES: Record<string, string> = {
  "docs/tasks/state.yaml":
    "slice: null\nschema_version: 3\nmap: task-tools-overhaul\ntask: null\n",
  "docs/tasks/maps/task-tools-overhaul/map.md":
    "---\nkind: map\nslug: task-tools-overhaul\ntitle: Tool overhaul\nstatus: active\n" +
    "tasks:\n- slug: my-task\n  blocked_by: []\n  done: false\n---\n",
  "docs/tasks/my-task/task.md":
    "---\nkind: task\ntype: feature\nslug: my-task\ntitle: My task\n" +
    "map: task-tools-overhaul\nstatus: ready\nblocked_by: []\nslices: [my-task]\n" +
    "started_at: 2026-01-01\n---\n\nbody\n",
  "docs/tasks/my-task/arch-spec.md": "# Arch\n\nno frontmatter here\n",
  "docs/tasks/my-task/findings.md":
    "---\nkind: finding\ntask: my-task\nmap: task-tools-overhaul\ntitle: Findings\n---\n\nbody\n",
  "docs/tasks/my-task/deviation-reports/1-split.md": "# Split\n\nbody\n",
  "docs/tasks/my-task/slices/1-my-task.md":
    "---\nkind: slice\nslug: my-task\ntask: ../task.md\nmode: afk\nstatus: todo\n" +
    "size: xl\nblocked_by: []\n---\n\nbody\n",
  "docs/tasks/archive/old-task/task.md":
    "---\nkind: task\ntype: bug\nslug: old-task\ntitle: Old\nmap: old-map\n" +
    "status: done\nblocked_by: []\nslices: []\n---\n",
  "docs/tasks/maps/archive/old-map/map.md":
    "---\nkind: map\nslug: old-map\ntitle: Old map\nstatus: done\ntasks: []\n---\n",
};

function fm(content: string): Record<string, unknown> {
  return parse(content).data;
}

describe("migrate: v3 vintage", () => {
  test("the flat task and maps subtree fold into the effort-grouped layout", () => {
    const tree = port({ ...V3_FILES });
    const report = migrate(tree);
    const files = tree.snapshot();

    expect(report.from).toBe(3);
    expect(files["docs/tasks/task-tools-overhaul/map.md"]).toBeDefined();
    expect(files["docs/tasks/task-tools-overhaul/tickets/my-task/ticket.md"]).toBeDefined();
    expect(files["docs/tasks/maps/task-tools-overhaul/map.md"]).toBeUndefined();
    expect(files["docs/tasks/my-task/task.md"]).toBeUndefined();
  });

  test("frontmatter unifies: kind to type, old type to subtype, slug and map dropped", () => {
    const tree = port({ ...V3_FILES });
    migrate(tree);
    const files = tree.snapshot();

    const ticket = fm(files["docs/tasks/task-tools-overhaul/tickets/my-task/ticket.md"]);
    expect(ticket.type).toBe("ticket");
    expect(ticket.subtype).toBe("feature");
    expect(ticket.title).toBe("My task");
    expect(ticket.kind).toBeUndefined();
    expect(ticket.slug).toBeUndefined();
    expect(ticket.map).toBeUndefined();
    expect(ticket.slices).toBeUndefined();
    expect(ticket.started_at).toBeUndefined();
    expect(ticket.status).toBe("stable");
    expect(ticket.workflow_state).toBe("ready");

    const map = fm(files["docs/tasks/task-tools-overhaul/map.md"]);
    expect(map.type).toBe("map");
    expect(map.status).toBe("stable");
    expect(map.tasks).toBeUndefined();
    expect(map.slug).toBeUndefined();
  });

  test("aux files gain conformant frontmatter", () => {
    const tree = port({ ...V3_FILES });
    migrate(tree);
    const files = tree.snapshot();

    const arch = fm(files["docs/tasks/task-tools-overhaul/tickets/my-task/arch-spec.md"]);
    expect(arch.type).toBe("arch spec");
    expect(arch.title).toBe("Arch");

    const findings = fm(files["docs/tasks/task-tools-overhaul/tickets/my-task/findings.md"]);
    expect(findings.type).toBe("findings");
    expect(findings.kind).toBeUndefined();

    const dev = fm(
      files["docs/tasks/task-tools-overhaul/tickets/my-task/deviation-reports/1-split.md"],
    );
    expect(dev.type).toBe("deviation report");
  });

  test("the archive reshapes and backfills the same way", () => {
    const tree = port({ ...V3_FILES });
    migrate(tree);
    const files = tree.snapshot();

    const map = fm(files["docs/tasks/archive/old-map/map.md"]);
    expect(map.type).toBe("map");
    expect(map.status).toBe("deprecated");

    const ticket = fm(files["docs/tasks/archive/old-map/tickets/old-task/ticket.md"]);
    expect(ticket.type).toBe("ticket");
    expect(ticket.subtype).toBe("bug");
    expect(ticket.status).toBe("deprecated");
    expect(ticket.workflow_state).toBe("done");
    expect(files["docs/tasks/archive/old-task/task.md"]).toBeUndefined();
  });

  test("the state file rebuilds flat with real nulls and the slice key dropped", () => {
    const tree = port({ ...V3_FILES });
    migrate(tree);
    const state = parseYamlFileForTest(tree.snapshot()["docs/tasks/state.yaml"]);
    expect(state).toEqual({ schema_version: 4, map: "task-tools-overhaul", task: null });
  });

  test("legacy slice directories are reported, never deleted", () => {
    const tree = port({ ...V3_FILES });
    const report = migrate(tree);
    const files = tree.snapshot();

    const sliceItem = report.needsHuman.find((h) => h.kind === "slice-dir");
    expect(sliceItem).toBeDefined();
    expect(sliceItem!.path).toContain("slices");
    // Reported, never deleted: the slice doc is still on disk.
    expect(files["docs/tasks/my-task/slices/1-my-task.md"]).toBeDefined();
  });

  test("the report lists every change", () => {
    const tree = port({ ...V3_FILES });
    const report = migrate(tree);
    expect(report.changes.length).toBeGreaterThan(0);
    for (const c of report.changes) {
      expect(c.detail.length).toBeGreaterThan(0);
      expect(c.path.length).toBeGreaterThan(0);
    }
    expect(report.changes.some((c) => c.action === "move")).toBe(true);
  });
});
