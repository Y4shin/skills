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
import { readMapSection } from "../src/core/art.js";

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
    // The atomicity boundary: verify every staged write, apply to a scratch
    // copy, and only swap it in when the whole apply succeeded. An injected
    // failure mid-apply therefore leaves the live map untouched.
    for (const [path, content] of this.writes) verifyStagedWrite(path, content);
    const next = new Map(this.files);
    let n = 0;
    const bump = (): void => {
      n++;
      if (opts.failAfterWrites !== undefined && n === opts.failAfterWrites) {
        throw new Error(`injected failure at write ${n}`);
      }
    };
    for (const [from, to] of this.moves) {
      bump();
      const content = next.get(from);
      if (content === undefined) throw new Error(`no such file: ${from}`);
      next.delete(from);
      next.set(to, content);
    }
    for (const [path, content] of this.writes) {
      bump();
      next.set(path, content);
    }
    for (const path of this.deletes) next.delete(path);
    this.files = next;
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
  test("a repo with no docs/tasks lands on the schema-5 scaffold", () => {
    const tree = port({ "README.md": "# hi\n" });
    const report = migrate(tree);

    expect(report.from).toBe(0);
    expect(report.to).toBe(5);
    expect(report.noop).toBe(false);

    const files = tree.snapshot();
    expect(files["docs/tasks/state.yaml"]).toBe(
      "schema_version: 5\nmap: null\ntask: null\n",
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

    const arch = fm(files["docs/tasks/task-tools-overhaul/architecture.md"]);
    expect(arch.type).toBe("architecture");
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
    expect(state).toEqual({ schema_version: 5, map: "task-tools-overhaul", task: null });
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

describe("migrate: idempotence", () => {
  test("a second run over the migrated tree is a no-op with zero changes", () => {
    const tree = port({ ...V3_FILES });
    const first = migrate(tree);
    expect(first.noop).toBe(false);

    const before = tree.snapshot();
    const second = migrate(tree);
    expect(second.noop).toBe(true);
    expect(second.changes).toEqual([]);
    expect(tree.snapshot()).toEqual(before);
  });

  test("a fresh repo's scaffold is itself idempotent", () => {
    const tree = port({});
    migrate(tree);
    const before = tree.snapshot();
    const second = migrate(tree);
    expect(second.noop).toBe(true);
    expect(tree.snapshot()).toEqual(before);
  });

  test("idempotence holds when the tree has a vendored clone", () => {
    // The regression: the index was computed from the pre-migration path set,
    // so run 1 missed the pointer file the plan itself adds and run 2 saw it,
    // staging an index rewrite and breaking the no-op guarantee.
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: null\ntask: null\n",
      "docs/tasks/archive/report/matt-skills/README.md": "# v\n",
      "docs/tasks/archive/report/matt-skills/docs/a.md": "# a\n",
    });
    const first = migrate(tree);
    expect(first.noop).toBe(false);
    const before = tree.snapshot();
    const second = migrate(tree);
    expect(second.noop).toBe(true);
    expect(second.changes).toEqual([]);
    expect(tree.snapshot()).toEqual(before);
  });

  test("idempotence holds across every vintage fixture", () => {
    for (const files of [V3_FILES, {}, { "docs/tasks/state.yaml": "active:\n  task: t\n  map: m\nlast_action: x\n" }]) {
      const tree = port({ ...files });
      migrate(tree);
      const before = tree.snapshot();
      const second = migrate(tree);
      expect(second.noop).toBe(true);
      expect(second.changes).toEqual([]);
      expect(tree.snapshot()).toEqual(before);
    }
  });
});

describe("migrate: corruption safety", () => {
  test("a mid-migration failure leaves the tree byte-identical", () => {
    for (const n of [1, 2, 3]) {
      const tree = port({ ...V3_FILES });
      const before = tree.snapshot();
      expect(() => migrate(tree, { failAfterWrites: n })).toThrow();
      expect(tree.snapshot()).toEqual(before);
    }
  });

  test("the migration itself verifies every rewrite, not just the port", () => {
    // A naive port that writes whatever it is given and verifies nothing:
    // the migration must still verify its own staged writes before they land.
    class NaivePort extends MemPort {
      commit(): void {
        for (const [from, to] of (this as any).moves as Array<[string, string]>) {
          const content = (this as any).files.get(from);
          (this as any).files.delete(from);
          (this as any).files.set(to, content);
        }
        for (const [path, content] of (this as any).writes as Map<string, string>) {
          (this as any).files.set(path, content);
        }
        (this as any).writes.clear();
        (this as any).moves = [];
        (this as any).deletes = [];
      }
    }
    const tree = new NaivePort({ ...V3_FILES });
    // A `!!set` tag parses to an object but dumps back as a list: the value
    // cannot be represented verbatim. The migration must refuse to write it.
    (tree as any).files.set(
      "docs/tasks/my-task/findings.md",
      "---\nkind: finding\ntitle: F\ntags: !!set {a: null}\n---\n\nbody\n",
    );
    const before = tree.snapshot();
    expect(() => migrate(tree)).toThrow(/round-trip/);
    expect(tree.snapshot()).toEqual(before);
  });

  test("a malformed staged rewrite throws before anything lands", () => {
    const tree = port({ ...V3_FILES });
    const before = tree.snapshot();
    expect(() => {
      tree.stageWrite("docs/tasks/broken.md", "no frontmatter fence here");
      tree.commit();
    }).toThrow();
    expect(tree.snapshot()).toEqual(before);
  });
});

describe("migrate: resumability", () => {
  test("an interrupted run resumes to the same end state", () => {
    const uninterrupted = port({ ...V3_FILES });
    migrate(uninterrupted);
    const expected = uninterrupted.snapshot();

    // Interrupt after the first commit, then re-run with the marker present.
    const interrupted = port({ ...V3_FILES });
    expect(() => migrate(interrupted, { failAfterWrites: 1 })).toThrow();
    const resumed = migrate(interrupted);
    expect(resumed.noop).toBe(false);
    expect(interrupted.snapshot()).toEqual(expected);
  });

  test("a completed run leaves no marker behind", () => {
    const tree = port({ ...V3_FILES });
    migrate(tree);
    expect(tree.snapshot()["docs/tasks/.migration-progress"]).toBeUndefined();
  });

  test("a marker naming completed steps is honored", () => {
    // A marker left by an earlier interrupted run: the steps it names are
    // skipped, and the remaining steps still run.
    const tree = port({ ...V3_FILES });
    tree.stageWrite("docs/tasks/.migration-progress", "1\n2\n3\n4\n5\n");
    tree.commit();
    const report = migrate(tree);
    expect(report.noop).toBe(false);
    // Step 1 was skipped, so no task was moved.
    const files = tree.snapshot();
    expect(files["docs/tasks/my-task/task.md"]).toBeDefined();
    // Step 2 was skipped too, so the state file was left as it was.
    expect(files["docs/tasks/state.yaml"]).toContain("schema_version: 3");
  });

  test("a resume that loses the marker still converges", () => {
    const tree = port({ ...V3_FILES });
    migrate(tree);
    // Drop the marker: every step is independently idempotent, so a re-run
    // that never sees the marker still converges to the same end state.
    tree.stageDelete("docs/tasks/.migration-progress");
    tree.commit();
    const before = tree.snapshot();
    const second = migrate(tree);
    expect(second.noop).toBe(true);
    expect(tree.snapshot()).toEqual(before);
  });
});

describe("migrate: every vintage reaches the same end state", () => {
  /** The v4 end state a given fixture should produce, as a comparable shape. */
  function endState(tree: MemPort): Record<string, string> {
    return tree.snapshot();
  }

  test("v1 nested state: pointers read, block dropped", () => {
    const tree = port({
      "docs/tasks/state.yaml":
        "active:\n  map: my-map\n  task: my-task\nlast_action: did a thing\nnext_action: do another\n",
      "docs/tasks/maps/my-map/map.md":
        "---\nkind: map\nslug: my-map\ntitle: My map\nstatus: active\ntasks: []\n---\n",
      "docs/tasks/my-task/task.md":
        "---\nkind: task\ntype: grilling\nslug: my-task\ntitle: My task\nmap: my-map\nstatus: done\nblocked_by: []\n---\n",
    });
    const report = migrate(tree);
    expect(report.from).toBe(1);
    const state = parseYamlFileForTest(tree.snapshot()["docs/tasks/state.yaml"]);
    expect(state).toEqual({ schema_version: 5, map: "my-map", task: "my-task" });
    // A grilling category stays a decision task, in tasks/.
    expect(tree.snapshot()["docs/tasks/my-map/tasks/my-task/task.md"]).toBeDefined();
  });

  test("v2 flat tree folds into the effort-grouped layout", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 2\nmap: null\ntask: null\n",
      "docs/tasks/flat-task/task.md":
        "---\nkind: task\ntype: feature\nslug: flat-task\ntitle: Flat\nmap: flat-map\nstatus: todo\nblocked_by: []\n---\n",
    });
    const report = migrate(tree);
    expect(report.from).toBe(2);
    expect(tree.snapshot()["docs/tasks/flat-map/tickets/flat-task/ticket.md"]).toBeDefined();
  });

  test("unversioned tree (no schema_version) migrates by shape", () => {
    const tree = port({
      "docs/tasks/state.yaml": "map: null\ntask: null\n",
      "docs/tasks/maps/some-map/map.md":
        "---\nkind: map\nslug: some-map\ntitle: Some\nstatus: active\ntasks: []\n---\n",
    });
    const report = migrate(tree);
    expect(report.from).toBe(0);
    expect(tree.snapshot()["docs/tasks/some-map/map.md"]).toBeDefined();
    const state = parseYamlFileForTest(tree.snapshot()["docs/tasks/state.yaml"]);
    expect(state).toEqual({ schema_version: 5, map: null, task: null });
  });

  test("a state.yaml with unknown keys drops them (v4 owns the shape)", () => {
    const tree = port({
      "docs/tasks/state.yaml":
        "schema_version: 3\nmap: m\ntask: null\nslice: null\nfuture_key: keep-me\n",
      "docs/tasks/maps/m/map.md":
        "---\nkind: map\nslug: m\ntitle: M\nstatus: active\ntasks: []\n---\n",
    });
    migrate(tree);
    const state = parseYamlFileForTest(tree.snapshot()["docs/tasks/state.yaml"]);
    expect(state).toEqual({ schema_version: 5, map: "m", task: null });
  });

  test("the same end state across v1, v2 and v3 for the same effort", () => {
    const shared = {
      "docs/tasks/maps/effort/map.md":
        "---\nkind: map\nslug: effort\ntitle: Effort\nstatus: active\ntasks: []\n---\n",
      "docs/tasks/effort-task/task.md":
        "---\nkind: task\ntype: feature\nslug: effort-task\ntitle: Effort task\nmap: effort\nstatus: ready\nblocked_by: []\n---\n",
    };
    const v1 = port({
      "docs/tasks/state.yaml": "active:\n  map: effort\n  task: null\n",
      ...shared,
    });
    const v2 = port({
      "docs/tasks/state.yaml": "schema_version: 2\nmap: effort\ntask: null\n",
      ...shared,
    });
    const v3 = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: effort\ntask: null\nslice: null\n",
      ...shared,
    });
    migrate(v1);
    migrate(v2);
    migrate(v3);
    expect(endState(v1)).toEqual(endState(v2));
    expect(endState(v2)).toEqual(endState(v3));
  });
});

describe("migrate: edge cases", () => {
  test("an empty docs/tasks with a stamp still reaches the schema-5 scaffold", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: null\ntask: null\n",
      "docs/tasks/archive/.gitkeep": "",
    });
    const report = migrate(tree);
    expect(report.from).toBe(3);
    const files = tree.snapshot();
    expect(files["docs/tasks/state.yaml"]).toBe("schema_version: 5\nmap: null\ntask: null\n");
    expect(files["docs/tasks/index.md"]).toContain('okf_version: "0.2"');
    expect(files["docs/tasks/CHANGELOG.md"]).toContain("type: changelog");
  });

  test("a stamp with an unversioned tree shape still migrates", () => {
    // schema_version is present but no legacy layout markers exist: the
    // migration reads the stamp and reshapes whatever it finds.
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: e\ntask: null\n",
      "docs/tasks/effort/map.md":
        "---\ntype: map\ntitle: Effort\nstatus: stable\n---\n",
      "docs/tasks/effort/tickets/t/ticket.md":
        "---\ntype: ticket\nsubtype: feature\ntitle: T\nstatus: stable\nworkflow_state: ready\n---\n",
    });
    const report = migrate(tree);
    expect(report.from).toBe(3);
    const files = tree.snapshot();
    expect(files["docs/tasks/effort/map.md"]).toBeDefined();
    expect(files["docs/tasks/effort/tickets/t/ticket.md"]).toBeDefined();
    expect(files["docs/tasks/state.yaml"]).toBe("schema_version: 5\nmap: e\ntask: null\n");
  });

  test("a fresh repo's state.yaml has real nulls, not the string None", () => {
    const tree = port({});
    migrate(tree);
    const state = parseYamlFileForTest(tree.snapshot()["docs/tasks/state.yaml"]);
    expect(state.map).toBeNull();
    expect(state.task).toBeNull();
    expect(tree.snapshot()["docs/tasks/state.yaml"]).not.toContain("None");
  });
});

describe("migrate: the root index", () => {
  test("carries okf_version 0.2 and lists the tree", () => {
    const tree = port({ ...V3_FILES });
    migrate(tree);
    const content = tree.snapshot()["docs/tasks/index.md"];
    const doc = parse(content);
    expect(doc.data.okf_version).toBe("0.2");
    expect(doc.data.type).toBe("index");
    expect(doc.body).toContain("task-tools-overhaul");
  });

  test("never lists placeholder files as efforts", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: null\ntask: null\n",
      "docs/tasks/maps/archive/.gitkeep": "",
      "docs/tasks/archive/.gitkeep": "",
      "docs/tasks/maps/effort/map.md":
        "---\nkind: map\nslug: effort\ntitle: Effort\nstatus: active\ntasks: []\n---\n",
    });
    migrate(tree);
    const body = parse(tree.snapshot()["docs/tasks/index.md"]).body;
    expect(body).not.toContain(".gitkeep");
    expect(body).toContain("effort");
  });

  test("the index is stable across a re-run", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: null\ntask: null\n",
      "docs/tasks/maps/archive/.gitkeep": "",
      "docs/tasks/maps/effort/map.md":
        "---\nkind: map\nslug: effort\ntitle: Effort\nstatus: active\ntasks: []\n---\n",
    });
    migrate(tree);
    const first = tree.snapshot()["docs/tasks/index.md"];
    const second = migrate(tree);
    expect(second.noop).toBe(true);
    expect(tree.snapshot()["docs/tasks/index.md"]).toBe(first);
  });

  test("lists live efforts and archived efforts separately", () => {
    const tree = port({ ...V3_FILES });
    migrate(tree);
    const body = parse(tree.snapshot()["docs/tasks/index.md"]).body;
    expect(body).toMatch(/## Live/);
    expect(body).toMatch(/## Archived/);
    // The live effort is under Live, the archived one under Archived.
    const live = body.slice(body.indexOf("## Live"), body.indexOf("## Archived"));
    const archived = body.slice(body.indexOf("## Archived"));
    expect(live).toContain("task-tools-overhaul");
    expect(live).not.toContain("old-map");
    expect(archived).toContain("old-map");
  });
});

describe("migrate: reporting", () => {
  test("a spec-only effort directory survives the migration", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: null\ntask: null\n",
      "docs/tasks/spec-only/spec.md":
        "---\nkind: spec\ntitle: Spec only\nstatus: draft\n---\n\n# Spec\n",
    });
    migrate(tree);
    const spec = fm(tree.snapshot()["docs/tasks/spec-only/spec.md"]);
    expect(spec.type).toBe("spec");
    expect(spec.status).toBe("draft");
    expect(spec.kind).toBeUndefined();
  });

  test("an effort directory with only a map survives", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: null\ntask: null\n",
      "docs/tasks/maps/lonely/map.md":
        "---\nkind: map\nslug: lonely\ntitle: Lonely\nstatus: active\ntasks: []\n---\n",
    });
    migrate(tree);
    expect(tree.snapshot()["docs/tasks/lonely/map.md"]).toBeDefined();
  });

  test("a vendored tree moves outside the bundle with a pointer left behind", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: null\ntask: null\n",
      "docs/tasks/archive/report/matt-skills/README.md": "# vendored\n",
      "docs/tasks/archive/report/matt-skills/skills/tdd/SKILL.md": "# tdd\n",
    });
    const report = migrate(tree);
    const files = tree.snapshot();

    // Namespaced by its containing effort, so two efforts with a same-named
    // clone cannot collide.
    expect(files["docs/vendored/report/matt-skills/README.md"]).toBe("# vendored\n");
    expect(files["docs/vendored/report/matt-skills/skills/tdd/SKILL.md"]).toBe("# tdd\n");
    expect(files["docs/tasks/archive/report/matt-skills/README.md"]).toBeUndefined();

    const pointer = files["docs/tasks/archive/report/matt-skills.pointer.md"];
    expect(pointer).toBeDefined();
    expect(parse(pointer).data.type).toBe("out-of-scope note");
    expect(pointer).toContain("docs/vendored/report/matt-skills");

    const item = report.needsHuman.find((h) => h.kind === "vendored-tree");
    expect(item).toBeDefined();
    expect(item!.path).toContain("matt-skills");
  });

  test("the vendored rule is general, not a hardcoded name", () => {
    // Any foreign clone is caught, whatever it is called.
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: null\ntask: null\n",
      "docs/tasks/archive/report/other-vendor/README.md": "# other\n",
      "docs/tasks/archive/report/other-vendor/docs/a.md": "# a\n",
    });
    const report = migrate(tree);
    const files = tree.snapshot();
    expect(files["docs/vendored/report/other-vendor/README.md"]).toBe("# other\n");
    expect(report.needsHuman.some((h) => h.kind === "vendored-tree")).toBe(true);
  });

  test("a vendored clone is relocated even when its effort also holds an artifact", () => {
    // The regression: reorganize used to claim the clone's files too, so the
    // vendored move silently no-opped while the report claimed it moved.
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: null\ntask: null\n",
      "docs/tasks/archive/rep/task.md":
        "---\nkind: task\ntype: feature\nslug: rep\ntitle: R\nmap: rep\nstatus: done\nblocked_by: []\n---\n",
      "docs/tasks/archive/rep/matt-skills/README.md": "# vendored\n",
      "docs/tasks/archive/rep/matt-skills/docs/a.md": "# a\n",
    });
    const report = migrate(tree);
    const files = tree.snapshot();
    expect(files["docs/vendored/rep/matt-skills/README.md"]).toBe("# vendored\n");
    expect(files["docs/vendored/rep/matt-skills/docs/a.md"]).toBe("# a\n");
    expect(files["docs/tasks/archive/rep/matt-skills/README.md"]).toBeUndefined();
    // The effort's own task still migrated normally.
    expect(files["docs/tasks/archive/rep/tickets/rep/ticket.md"]).toBeDefined();
    expect(report.needsHuman.some((h) => h.kind === "vendored-tree")).toBe(true);
  });

  test("two efforts with a same-named clone do not collide", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: e1\ntask: null\n",
      "docs/tasks/maps/e1/map.md":
        "---\nkind: map\nslug: e1\ntitle: E1\nstatus: active\ntasks: []\n---\n",
      "docs/tasks/maps/e2/map.md":
        "---\nkind: map\nslug: e2\ntitle: E2\nstatus: active\ntasks: []\n---\n",
      "docs/tasks/archive/r1/clone/README.md": "# one\n",
      "docs/tasks/archive/r1/clone/docs/a.md": "# a\n",
      "docs/tasks/archive/r2/clone/README.md": "# two\n",
      "docs/tasks/archive/r2/clone/docs/b.md": "# b\n",
    });
    migrate(tree);
    const files = tree.snapshot();
    // Both clones survive, namespaced by their effort.
    expect(files["docs/vendored/r1/clone/README.md"]).toBe("# one\n");
    expect(files["docs/vendored/r2/clone/README.md"]).toBe("# two\n");
  });

  test("a notes subdirectory under a maps-subtree effort is NOT vendored", () => {
    // Regression: two frontmatter-less notes under `maps/<effort>/notes/`
    // used to be classified as a vendored clone and moved out of the bundle.
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: effort\ntask: null\n",
      "docs/tasks/maps/effort/map.md":
        "---\nkind: map\nslug: effort\ntitle: E\nstatus: active\ntasks: []\n---\n",
      "docs/tasks/maps/effort/notes/a.md": "# note a\n",
      "docs/tasks/maps/effort/notes/b.md": "# note b\n",
    });
    const report = migrate(tree);
    expect(report.needsHuman.some((h) => h.kind === "vendored-tree")).toBe(false);
    const files = tree.snapshot();
    expect(Object.keys(files).some((f) => f.startsWith("docs/vendored/"))).toBe(false);
  });

  test("a task directory with frontmatter-less aux files is NOT vendored", () => {
    // Two frontmatter-less aux files beside a real task are ordinary content
    // the migration backfills, not a vendored clone to relocate.
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: null\ntask: null\n",
      "docs/tasks/maps/effort/map.md":
        "---\nkind: map\nslug: effort\ntitle: Effort\nstatus: active\ntasks: []\n---\n",
      "docs/tasks/my-task/task.md":
        "---\nkind: task\ntype: feature\nslug: my-task\ntitle: T\nmap: effort\nstatus: ready\nblocked_by: []\n---\n",
      "docs/tasks/my-task/arch-spec.md": "# Arch\n\nno frontmatter\n",
      "docs/tasks/my-task/deviation-reports/1-split.md": "# Split\n\nno frontmatter\n",
    });
    const report = migrate(tree);
    const files = tree.snapshot();
    expect(report.needsHuman.some((h) => h.kind === "vendored-tree")).toBe(false);
    // The aux files stayed in the bundle and gained frontmatter. A single
    // The architecture document hoists to the effort root under its
    // schema-5 name; the deviation report stays beside the ticket.
    expect(files["docs/tasks/effort/architecture.md"]).toBeDefined();
    expect(files["docs/tasks/effort/tickets/my-task/deviation-reports/1-split.md"]).toBeDefined();
  });

  test("an unresolvable blocked_by reference is reported, not dropped", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: null\ntask: null\n",
      "docs/tasks/maps/effort/map.md":
        "---\nkind: map\nslug: effort\ntitle: Effort\nstatus: active\ntasks: []\n---\n",
      "docs/tasks/effort-task/task.md":
        "---\nkind: task\ntype: feature\nslug: effort-task\ntitle: T\nmap: effort\nstatus: todo\nblocked_by: [ghost-task]\n---\n",
    });
    const report = migrate(tree);
    const item = report.needsHuman.find((h) => h.kind === "unresolvable-ref");
    expect(item).toBeDefined();
    expect(item!.detail).toContain("ghost-task");
    // Reported, not dropped: the reference survives in the migrated file.
    const ticket = fm(tree.snapshot()["docs/tasks/effort/tickets/effort-task/ticket.md"]);
    expect(ticket.blocked_by).toEqual(["ghost-task"]);
  });

  test("a normalized combination appears in needsHuman", () => {
    // A hand-edited or partially migrated file can carry an invalid OKF pair;
    // the migration normalizes it and records it for human eyes.
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: null\ntask: null\n",
      "docs/tasks/maps/effort/map.md":
        "---\nkind: map\nslug: effort\ntitle: Effort\nstatus: active\ntasks: []\n---\n",
      "docs/tasks/effort/tickets/effort-task/ticket.md":
        "---\ntype: ticket\nsubtype: feature\ntitle: T\nstatus: draft\nworkflow_state: done\n---\n",
    });
    const report = migrate(tree);
    const item = report.needsHuman.find((h) => h.kind === "normalized-combination");
    expect(item).toBeDefined();
    const ticket = fm(tree.snapshot()["docs/tasks/effort/tickets/effort-task/ticket.md"]);
    expect(ticket.status).toBe("draft");
    expect(ticket.workflow_state).toBe("todo");
  });

  test("the report lists every change and every needs-human item", () => {
    const tree = port({ ...V3_FILES });
    const report = migrate(tree);
    expect(report.changes.length).toBeGreaterThan(0);
    expect(report.needsHuman.length).toBeGreaterThan(0);
    for (const c of report.changes) {
      expect(["add", "move", "rewrite", "delete"]).toContain(c.action);
      expect(c.path).not.toBe("");
      expect(c.detail).not.toBe("");
    }
    for (const h of report.needsHuman) {
      expect(h.path).not.toBe("");
      expect(h.detail).not.toBe("");
    }
  });
});

describe("migrate: no two files collapse to one destination", () => {
  test("per-task arch specs in one effort each keep their own home", () => {
    // A v3 archive can hold several tasks in one effort, each with its own
    // architecture document. Collapsing them all to the effort root would
    // silently lose all but one; the rename lands in place instead.
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: null\ntask: null\n",
      "docs/tasks/maps/effort/map.md":
        "---\nkind: map\nslug: effort\ntitle: Effort\nstatus: active\ntasks: []\n---\n",
      "docs/tasks/archive/alpha/task.md":
        "---\nkind: task\ntype: feature\nslug: alpha\ntitle: Alpha\nmap: effort\nstatus: done\nblocked_by: []\n---\n",
      "docs/tasks/archive/alpha/arch-spec.md": "# Alpha arch\n",
      "docs/tasks/archive/beta/task.md":
        "---\nkind: task\ntype: feature\nslug: beta\ntitle: Beta\nmap: effort\nstatus: done\nblocked_by: []\n---\n",
      "docs/tasks/archive/beta/arch-spec.md": "# Beta arch\n",
    });
    migrate(tree);
    const files = tree.snapshot();

    const alpha = files["docs/tasks/archive/effort/tickets/alpha/architecture.md"];
    const beta = files["docs/tasks/archive/effort/tickets/beta/architecture.md"];
    expect(alpha).toBeDefined();
    expect(beta).toBeDefined();
    expect(alpha).toContain("Alpha arch");
    expect(beta).toContain("Beta arch");
  });

  test("a frontmatter-carrying arch spec obeys the same rule", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: null\ntask: null\n",
      "docs/tasks/maps/effort/map.md":
        "---\nkind: map\nslug: effort\ntitle: Effort\nstatus: active\ntasks: []\n---\n",
      "docs/tasks/archive/alpha/task.md":
        "---\nkind: task\ntype: feature\nslug: alpha\ntitle: Alpha\nmap: effort\nstatus: done\nblocked_by: []\n---\n",
      "docs/tasks/archive/alpha/arch-spec.md":
        "---\nkind: arch spec\ntitle: Alpha arch\n---\n\n# Alpha\n",
      "docs/tasks/archive/beta/task.md":
        "---\nkind: task\ntype: feature\nslug: beta\ntitle: Beta\nmap: effort\nstatus: done\nblocked_by: []\n---\n",
      "docs/tasks/archive/beta/arch-spec.md":
        "---\nkind: arch spec\ntitle: Beta arch\n---\n\n# Beta\n",
    });
    migrate(tree);
    const files = tree.snapshot();
    expect(files["docs/tasks/archive/effort/tickets/alpha/architecture.md"]).toContain("Alpha");
    expect(files["docs/tasks/archive/effort/tickets/beta/architecture.md"]).toContain("Beta");
  });

  test("a multi-arch-spec effort is idempotent", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: null\ntask: null\n",
      "docs/tasks/maps/effort/map.md":
        "---\nkind: map\nslug: effort\ntitle: Effort\nstatus: active\ntasks: []\n---\n",
      "docs/tasks/archive/alpha/task.md":
        "---\nkind: task\ntype: feature\nslug: alpha\ntitle: Alpha\nmap: effort\nstatus: done\nblocked_by: []\n---\n",
      "docs/tasks/archive/alpha/arch-spec.md":
        "---\nkind: arch spec\ntitle: Alpha arch\n---\n\n# Alpha\n",
      "docs/tasks/archive/beta/task.md":
        "---\nkind: task\ntype: feature\nslug: beta\ntitle: Beta\nmap: effort\nstatus: done\nblocked_by: []\n---\n",
      "docs/tasks/archive/beta/arch-spec.md":
        "---\nkind: arch spec\ntitle: Beta arch\n---\n\n# Beta\n",
    });
    migrate(tree);
    const before = tree.snapshot();
    const second = migrate(tree);
    expect(second.noop).toBe(true);
    expect(second.changes).toEqual([]);
    expect(tree.snapshot()).toEqual(before);
  });

  test("a single-effort arch spec still lands at the effort root", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: null\ntask: null\n",
      "docs/tasks/maps/effort/map.md":
        "---\nkind: map\nslug: effort\ntitle: Effort\nstatus: active\ntasks: []\n---\n",
      "docs/tasks/solo/task.md":
        "---\nkind: task\ntype: feature\nslug: solo\ntitle: Solo\nmap: effort\nstatus: ready\nblocked_by: []\n---\n",
      "docs/tasks/solo/arch-spec.md": "# Solo arch\n",
    });
    migrate(tree);
    expect(tree.snapshot()["docs/tasks/effort/architecture.md"]).toContain("Solo arch");
  });

  test("no destination is claimed by two different sources", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: null\ntask: null\n",
      "docs/tasks/maps/effort/map.md":
        "---\nkind: map\nslug: effort\ntitle: Effort\nstatus: active\ntasks: []\n---\n",
      "docs/tasks/archive/alpha/task.md":
        "---\nkind: task\ntype: feature\nslug: alpha\ntitle: Alpha\nmap: effort\nstatus: done\nblocked_by: []\n---\n",
      "docs/tasks/archive/alpha/spec.md": "# Alpha spec\n",
      "docs/tasks/archive/beta/task.md":
        "---\nkind: task\ntype: feature\nslug: beta\ntitle: Beta\nmap: effort\nstatus: done\nblocked_by: []\n---\n",
      "docs/tasks/archive/beta/spec.md": "# Beta spec\n",
    });
    const report = migrate(tree);
    const destinations = report.changes.map((c) => c.path);
    expect(new Set(destinations).size).toBe(destinations.length);
  });

  test("a destination claimed by two different sources is reported, never overwritten", () => {
    // With slugs derived for map-subtree artifacts, a flat task and a
    // map-subtree task of the same effort and slug compute one destination.
    // The second write used to silently replace the first (data loss); the
    // collision must surface as a needs-human item instead, with both
    // sources preserved.
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: effort\ntask: null\n",
      "docs/tasks/maps/effort/map.md":
        "---\nkind: map\nslug: effort\ntitle: Effort\nstatus: active\ntasks: []\n---\n",
      "docs/tasks/alpha/task.md":
        "---\nkind: task\ntype: feature\nslug: alpha\ntitle: Alpha flat\nmap: effort\n" +
        "status: done\nblocked_by: []\n---\n\nflat body\n",
      "docs/tasks/maps/effort/tasks/alpha/task.md":
        "---\nkind: task\ntype: feature\nslug: alpha\ntitle: Alpha map\nmap: effort\n" +
        "status: done\nblocked_by: []\n---\n\nmap body\n",
    });
    const report = migrate(tree);
    const files = tree.snapshot();

    // The first claimant lands; the later one is left in place, not lost.
    expect(files["docs/tasks/effort/tickets/alpha/ticket.md"]).toContain("flat body");
    expect(files["docs/tasks/maps/effort/tasks/alpha/task.md"]).toContain("map body");
    expect(files["docs/tasks/alpha/task.md"]).toBeUndefined();

    const collision = report.needsHuman.find((h) => h.kind === "destination-collision");
    expect(collision).toBeDefined();
    expect(collision?.path).toBe("docs/tasks/effort/tickets/alpha/ticket.md");
    expect(collision?.detail).toContain("docs/tasks/maps/effort/tasks/alpha/task.md");
    expect(collision?.detail).toContain("docs/tasks/alpha/task.md");

    // A re-run stages nothing and re-reports the unresolved collision.
    const second = migrate(tree);
    const after = tree.snapshot();
    expect(second.noop).toBe(true);
    expect(second.changes).toEqual([]);
    expect(after["docs/tasks/effort/tickets/alpha/ticket.md"]).toContain("flat body");
    expect(after["docs/tasks/maps/effort/tasks/alpha/task.md"]).toContain("map body");
    expect(second.needsHuman.some((h) => h.kind === "destination-collision")).toBe(true);
  });
});

describe("migrate: map subtrees with tickets", () => {
  test("every ticket of a live map keeps its own directory", () => {
    // The regression: a live `maps/<map>/tickets/<slug>/` subtree yielded a
    // null slug, so every ticket interpolated into `tickets/null/` and only
    // the last write survived. Reported from a downstream repo where 12
    // tickets collapsed to one file.
    const tree = port({
      "docs/tasks/state.yaml": "slice: null\nschema_version: 3\nmap: phase1\ntask: null\n",
      "docs/tasks/maps/phase1/map.md":
        "---\nkind: map\nslug: phase1\ntitle: Phase one\nstatus: active\ntasks: []\n---\n",
      "docs/tasks/maps/phase1/tickets/a/ticket.md":
        "---\nkind: ticket\ntype: feature\nslug: a\ntitle: Ticket A\nmap: phase1\n" +
        "status: ready\nblocked_by: []\n---\n\nbody of ticket a\n",
      "docs/tasks/maps/phase1/tickets/b/ticket.md":
        "---\nkind: ticket\ntype: bug\nslug: b\ntitle: Ticket B\nmap: phase1\n" +
        "status: done\nblocked_by: []\n---\n\nbody of ticket b\n",
    });
    const report = migrate(tree);
    const files = tree.snapshot();

    expect(files["docs/tasks/phase1/tickets/a/ticket.md"]).toContain("body of ticket a");
    expect(files["docs/tasks/phase1/tickets/b/ticket.md"]).toContain("body of ticket b");
    expect(files["docs/tasks/phase1/tickets/null/ticket.md"]).toBeUndefined();
    expect(files["docs/tasks/maps/phase1/tickets/a/ticket.md"]).toBeUndefined();
    expect(files["docs/tasks/maps/phase1/tickets/b/ticket.md"]).toBeUndefined();

    // The collapse's report symptom: one destination line per ticket.
    const destinations = report.changes.filter((c) => c.action === "move").map((c) => c.path);
    expect(new Set(destinations).size).toBe(destinations.length);
  });

  test("an aux file beside a map-subtree ticket moves with it", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: phase1\ntask: null\n",
      "docs/tasks/maps/phase1/map.md":
        "---\nkind: map\nslug: phase1\ntitle: Phase one\nstatus: active\ntasks: []\n---\n",
      "docs/tasks/maps/phase1/tickets/a/ticket.md":
        "---\nkind: ticket\ntype: feature\nslug: a\ntitle: Ticket A\nmap: phase1\n" +
        "status: ready\nblocked_by: []\n---\n\nbody of ticket a\n",
      "docs/tasks/maps/phase1/tickets/a/findings.md":
        "---\nkind: finding\ntask: a\nmap: phase1\ntitle: Findings A\n---\n\nfindings of a\n",
    });
    migrate(tree);
    const files = tree.snapshot();

    expect(files["docs/tasks/phase1/tickets/a/ticket.md"]).toContain("body of ticket a");
    expect(files["docs/tasks/phase1/tickets/a/findings.md"]).toContain("findings of a");
  });

  test("every ticket of an archived map keeps its own directory", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: null\ntask: null\n",
      "docs/tasks/maps/archive/phase1/map.md":
        "---\nkind: map\nslug: phase1\ntitle: Phase one\nstatus: done\ntasks: []\n---\n",
      "docs/tasks/maps/archive/phase1/tickets/a/ticket.md":
        "---\nkind: ticket\ntype: feature\nslug: a\ntitle: Ticket A\nmap: phase1\n" +
        "status: done\nblocked_by: []\n---\n\nbody of ticket a\n",
    });
    migrate(tree);
    const files = tree.snapshot();

    expect(files["docs/tasks/archive/phase1/tickets/a/ticket.md"]).toContain("body of ticket a");
    expect(files["docs/tasks/archive/phase1/tickets/null/ticket.md"]).toBeUndefined();
  });

  test("a ticket whose slug cannot be derived is reported and left in place", () => {
    // A ticket sitting directly under a live map (no tickets/<slug>/
    // container) has no derivable slug. It must be reported for human eyes,
    // never interpolated into a `null` path segment.
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: phase1\ntask: null\n",
      "docs/tasks/maps/phase1/map.md":
        "---\nkind: map\nslug: phase1\ntitle: Phase one\nstatus: active\ntasks: []\n---\n",
      "docs/tasks/maps/phase1/ticket.md":
        "---\nkind: ticket\ntype: feature\nslug: stray\ntitle: Stray\nmap: phase1\n" +
        "status: ready\nblocked_by: []\n---\n\nstray body\n",
    });
    const report = migrate(tree);
    const files = tree.snapshot();

    expect(files["docs/tasks/maps/phase1/ticket.md"]).toContain("stray body");
    expect(
      Object.keys(files).filter((p) => p.split("/").includes("null")),
    ).toEqual([]);
    const item = report.needsHuman.find(
      (h) => h.kind === "no-slug" && h.path === "docs/tasks/maps/phase1/ticket.md",
    );
    expect(item).toBeDefined();
  });

  test("a second run over the migrated tree is a no-op", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: phase1\ntask: null\n",
      "docs/tasks/maps/phase1/map.md":
        "---\nkind: map\nslug: phase1\ntitle: Phase one\nstatus: active\ntasks: []\n---\n",
      "docs/tasks/maps/phase1/tickets/a/ticket.md":
        "---\nkind: ticket\ntype: feature\nslug: a\ntitle: Ticket A\nmap: phase1\n" +
        "status: ready\nblocked_by: []\n---\n\nbody of ticket a\n",
      "docs/tasks/maps/phase1/tickets/b/ticket.md":
        "---\nkind: ticket\ntype: bug\nslug: b\ntitle: Ticket B\nmap: phase1\n" +
        "status: done\nblocked_by: []\n---\n\nbody of ticket b\n",
    });
    const first = migrate(tree);
    expect(first.noop).toBe(false);
    const before = tree.snapshot();
    const second = migrate(tree);
    expect(second.noop).toBe(true);
    expect(second.changes).toEqual([]);
    expect(tree.snapshot()).toEqual(before);
  });
});

describe("migrate: scope", () => {
  test("markdown outside docs/tasks is never touched or reported", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: null\ntask: null\n",
      "docs/ideas/note.md": "# Idea\n\nno frontmatter, outside the bundle\n",
      "docs/ideas/broken.md": "---\nbad: [yaml\n---\n",
      "README.md": "# readme\n",
    });
    const report = migrate(tree);
    const files = tree.snapshot();
    expect(files["docs/ideas/note.md"]).toBe("# Idea\n\nno frontmatter, outside the bundle\n");
    expect(files["docs/ideas/broken.md"]).toBe("---\nbad: [yaml\n---\n");
    expect(files["README.md"]).toBe("# readme\n");
    expect(report.needsHuman.filter((h) => !h.path.startsWith("docs/tasks/"))).toEqual([]);
    expect(report.changes.filter((c) => !c.path.startsWith("docs/tasks/"))).toEqual([]);
  });
});

describe("migrate: unparseable frontmatter", () => {
  test("a file whose frontmatter will not parse is reported, not rewritten", () => {
    // A title with an unquoted ': ' makes the YAML invalid. The migration
    // must not guess: it reports the file and leaves it byte-identical.
    const broken =
      "---\nkind: task\ntype: feature\nslug: broken\ntitle: Fix: the thing\n" +
      "map: effort\nstatus: ready\nblocked_by: []\n---\n\nbody\n";
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: effort\ntask: null\n",
      "docs/tasks/maps/effort/map.md":
        "---\nkind: map\nslug: effort\ntitle: Effort\nstatus: active\ntasks: []\n---\n",
      "docs/tasks/broken/task.md": broken,
    });
    const report = migrate(tree);
    expect(tree.snapshot()["docs/tasks/broken/task.md"]).toBe(broken);
    const item = report.needsHuman.find((h) => h.kind === "unparseable");
    expect(item).toBeDefined();
    expect(item!.path).toBe("docs/tasks/broken/task.md");
  });
});

describe("migrate: free-form aux notes", () => {
  test("a note beside a ticket is backfilled and moved with it", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: effort\ntask: null\n",
      "docs/tasks/maps/effort/map.md":
        "---\nkind: map\nslug: effort\ntitle: Effort\nstatus: active\ntasks: []\n---\n",
      "docs/tasks/alpha/task.md":
        "---\nkind: task\ntype: feature\nslug: alpha\ntitle: Alpha\nmap: effort\nstatus: done\nblocked_by: []\n---\n",
      "docs/tasks/alpha/limitations.md": "# Limitations\n\nknown gaps\n",
    });
    migrate(tree);
    const files = tree.snapshot();
    const note = files["docs/tasks/effort/tickets/alpha/limitations.md"];
    expect(note).toBeDefined();
    expect(note).toContain("known gaps");
    const data = parse(note).data;
    expect(typeof data.type).toBe("string");
    expect(data.type).not.toBe("");
    expect(data.title).toBe("Limitations");
    expect(files["docs/tasks/alpha/limitations.md"]).toBeUndefined();
  });

  test("every non-slice markdown in the migrated tree carries a non-empty type", () => {
    const tree = port({ ...V3_FILES });
    migrate(tree);
    for (const [path, content] of Object.entries(tree.snapshot())) {
      if (!path.endsWith(".md")) continue;
      // Legacy slice docs are reported and left untouched by design.
      if (path.split("/").includes("slices")) continue;
      const data = parse(content).data;
      expect(typeof data.type, `${path} has no type`).toBe("string");
      expect(data.type, `${path} has an empty type`).not.toBe("");
    }
  });
});

describe("migrate: map-level aux files", () => {
  test("a handoff beside the map moves with the effort", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: effort\ntask: null\n",
      "docs/tasks/maps/effort/map.md":
        "---\nkind: map\nslug: effort\ntitle: Effort\nstatus: active\ntasks: []\n---\n",
      "docs/tasks/maps/effort/handoff.md": "# Handoff\n\nnotes\n",
    });
    migrate(tree);
    const files = tree.snapshot();
    expect(files["docs/tasks/effort/map.md"]).toBeDefined();
    expect(files["docs/tasks/effort/handoff.md"]).toContain("# Handoff");
    expect(files["docs/tasks/maps/effort/handoff.md"]).toBeUndefined();
  });

  test("the maps subtree dies entirely, including its placeholder files", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: null\ntask: null\n",
      "docs/tasks/maps/live/map.md":
        "---\nkind: map\nslug: live\ntitle: Live\nstatus: active\ntasks: []\n---\n",
      "docs/tasks/maps/archive/.gitkeep": "",
    });
    migrate(tree);
    const files = tree.snapshot();
    expect(Object.keys(files).filter((p) => p.includes("/maps/"))).toEqual([]);
  });

  test("the maps subtree is empty after the migration", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: null\ntask: null\n",
      "docs/tasks/maps/live/map.md":
        "---\nkind: map\nslug: live\ntitle: Live\nstatus: active\ntasks: []\n---\n",
      "docs/tasks/maps/live/notes.md": "# Notes\n",
      "docs/tasks/maps/archive/old/map.md":
        "---\nkind: map\nslug: old\ntitle: Old\nstatus: done\ntasks: []\n---\n",
      "docs/tasks/maps/archive/old/extra.md": "# Extra\n",
    });
    migrate(tree);
    const files = tree.snapshot();
    expect(Object.keys(files).filter((p) => p.includes("/maps/"))).toEqual([]);
    expect(files["docs/tasks/live/notes.md"]).toContain("# Notes");
    expect(files["docs/tasks/archive/old/extra.md"]).toContain("# Extra");
  });
});

describe("migrate: the dead pointer", () => {
  test("a surviving task-overview pointer is reported, not rewritten", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: null\ntask: null\n",
      "docs/tasks/notes.md": "# Notes\n\nRun /skill:task-overview to begin.\n",
    });
    const report = migrate(tree);
    const item = report.needsHuman.find((h) => h.kind === "dead-pointer");
    expect(item).toBeDefined();
    expect(item!.detail).toContain("task-workflow-overview");
    // Reported, not rewritten: the artifact's own prose is not the
    // migration's to edit.
    expect(tree.snapshot()["docs/tasks/notes.md"]).toContain("/skill:task-overview");
  });
});

describe("migrate: bundle files", () => {
  test("out-of-scope/README.md becomes index.md with frontmatter", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: null\ntask: null\n",
      "docs/tasks/out-of-scope/README.md": "# Rejected\n\nreasons\n",
    });
    migrate(tree);
    const files = tree.snapshot();
    expect(files["docs/tasks/out-of-scope/README.md"]).toBeUndefined();
    const index = files["docs/tasks/out-of-scope/index.md"];
    expect(index).toBeDefined();
    expect(index).toContain("reasons");
    expect(parse(index).data.type).toBe("out-of-scope note");
  });

  test("the CHANGELOG gains conformant frontmatter and keeps its body", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 3\nmap: null\ntask: null\n",
      "docs/tasks/CHANGELOG.md": "# Task Changelog\n\n## 3.0.0\n\nstuff\n",
    });
    migrate(tree);
    const changelog = tree.snapshot()["docs/tasks/CHANGELOG.md"];
    expect(parse(changelog).data.type).toBe("changelog");
    expect(changelog).toContain("## 3.0.0");
    expect(changelog).toContain("stuff");
  });
});

/** A v4 tree: the effort-grouped layout with the legacy arch-spec pair. */
const V4_FILES: Record<string, string> = {
  "docs/tasks/state.yaml": "schema_version: 4\nmap: my-effort\ntask: my-ticket\n",
  "docs/tasks/my-effort/map.md":
    "---\ntype: map\ntitle: My effort\nstatus: stable\n---\n\n# My effort\n\n## Out of scope\n\nnot this\n",
  "docs/tasks/my-effort/spec.md":
    "---\ntype: spec\ntitle: Spec\nstatus: stable\n---\n\n# Spec\n\n## Out of scope\n\nspec keeps its own\n",
  "docs/tasks/my-effort/arch-spec.md":
    "---\ntype: arch spec\ntitle: Architecture\nstatus: stable\n---\n\n# Architecture\n",
  "docs/tasks/my-effort/tickets/my-ticket/ticket.md":
    "---\ntype: ticket\nsubtype: feature\ntitle: My ticket\nstatus: stable\nworkflow_state: ready\n---\n\nbody\n",
};

describe("migrate: schema 5", () => {
  test("a v4 tree reaches schema 5 in one hop: state.yaml carries schema_version: 5", () => {
    const tree = port({ ...V4_FILES });
    const report = migrate(tree);

    expect(report.from).toBe(4);
    expect(report.to).toBe(5);
    expect(report.noop).toBe(false);
    const state = parseYamlFileForTest(tree.snapshot()["docs/tasks/state.yaml"]);
    expect(state).toEqual({ schema_version: 5, map: "my-effort", task: "my-ticket" });
  });
  test("type: arch spec becomes type: architecture, arch-spec.md becomes architecture.md", () => {
    const tree = port({ ...V4_FILES });
    const report = migrate(tree);
    const files = tree.snapshot();

    expect(files["docs/tasks/my-effort/arch-spec.md"]).toBeUndefined();
    const arch = files["docs/tasks/my-effort/architecture.md"];
    expect(arch).toBeDefined();
    const data = fm(arch!);
    expect(data.type).toBe("architecture");
    expect(data.title).toBe("Architecture");
    expect(arch).toContain("# Architecture");
    const move = report.changes.find((c) => c.path === "docs/tasks/my-effort/architecture.md");
    expect(move?.action).toBe("move");
    expect(move?.from).toBe("docs/tasks/my-effort/arch-spec.md");
  });
  test("the map body renames Out of scope to Non-goals and adds the facts placeholder", () => {
    const tree = port({ ...V4_FILES });
    migrate(tree);
    const map = tree.snapshot()["docs/tasks/my-effort/map.md"]!;
    const doc = parse(map);

    // The legacy heading is gone; its content moved under the canonical name.
    expect(map).not.toContain("## Out of scope");
    expect(readMapSection(doc.body, "Non-goals")).toEqual(["not this"]);
    // The facts section is added as an empty placeholder when missing, so a
    // gate refusal names missing content, not a missing section.
    expect(readMapSection(doc.body, "Non-negotiable facts")).toEqual([]);
    // The frontmatter is untouched by the body reshape.
    expect(doc.data.type).toBe("map");
    expect(doc.data.title).toBe("My effort");
  });

  test("a schema-5 map that already carries both sections is left byte-identical", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 5\nmap: e\ntask: null\n",
      "docs/tasks/e/map.md":
        "---\ntype: map\ntitle: E\nstatus: stable\n---\n\n# E\n\n## Non-goals\n\nnot that\n\n## Non-negotiable facts\n\n**Success test.** ships\n",
    });
    migrate(tree);
    const afterFirst = tree.snapshot();
    const second = migrate(tree);
    expect(second.noop).toBe(true);
    expect(second.changes).toEqual([]);
    expect(tree.snapshot()).toEqual(afterFirst);
  });

  test("a spec body keeps its own Out of scope section: the rename is map-only", () => {
    const tree = port({ ...V4_FILES });
    migrate(tree);
    const spec = tree.snapshot()["docs/tasks/my-effort/spec.md"]!;
    expect(spec).toContain("## Out of scope");
    expect(spec).toContain("spec keeps its own");
  });
  test("the renames cover archived trees", () => {
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 4\nmap: null\ntask: null\n",
      "docs/tasks/archive/old-effort/map.md":
        "---\ntype: map\ntitle: Old\nstatus: deprecated\nworkflow_state: done\n---\n\n# Old\n\n## Out of scope\n\npast scope\n",
      "docs/tasks/archive/old-effort/arch-spec.md":
        "---\ntype: arch spec\ntitle: Old architecture\nstatus: deprecated\n---\n\n# Old architecture\n",
    });
    migrate(tree);
    const files = tree.snapshot();

    expect(files["docs/tasks/archive/old-effort/arch-spec.md"]).toBeUndefined();
    expect(fm(files["docs/tasks/archive/old-effort/architecture.md"]!).type).toBe("architecture");
    const mapDoc = parse(files["docs/tasks/archive/old-effort/map.md"]!);
    expect(mapDoc.body).not.toContain("## Out of scope");
    expect(readMapSection(mapDoc.body, "Non-goals")).toEqual(["past scope"]);
    expect(readMapSection(mapDoc.body, "Non-negotiable facts")).toEqual([]);
  });

  test("every older vintage reaches schema 5 in one hop", () => {
    // The legacy shape is shared; only the state file's vintage differs.
    const legacy: Record<string, string> = {
      "docs/tasks/maps/legacy-map/map.md":
        "---\nkind: map\nslug: legacy-map\ntitle: Legacy\nstatus: active\ntasks: []\n---\n\n## Out of scope\n\nold scope\n",
      "docs/tasks/legacy-task/task.md":
        "---\nkind: task\ntype: feature\nslug: legacy-task\ntitle: Legacy task\nmap: legacy-map\nstatus: ready\nblocked_by: []\n---\n",
      "docs/tasks/legacy-task/arch-spec.md": "# Legacy arch\n",
    };
    const vintages: Array<[string, string]> = [
      ["unversioned", "map: legacy-map\ntask: legacy-task\n"],
      ["v1", "active:\n  map: legacy-map\n  task: legacy-task\n"],
      ["v2", "schema_version: 2\nmap: legacy-map\ntask: legacy-task\n"],
      ["v3", "schema_version: 3\nmap: legacy-map\ntask: legacy-task\nslice: null\n"],
    ];
    for (const [name, state] of vintages) {
      const tree = port({ "docs/tasks/state.yaml": state, ...legacy });
      const report = migrate(tree); // one call: no second pass, no intermediate stop
      const files = tree.snapshot();

      expect(report.to, name).toBe(5);
      expect(
        parseYamlFileForTest(files["docs/tasks/state.yaml"]),
        name,
      ).toEqual({ schema_version: 5, map: "legacy-map", task: "legacy-task" });
      expect(fm(files["docs/tasks/legacy-map/architecture.md"]!).type, name).toBe("architecture");
      expect(files["docs/tasks/legacy-task/arch-spec.md"], name).toBeUndefined();
      const mapDoc = parse(files["docs/tasks/legacy-map/map.md"]!);
      expect(readMapSection(mapDoc.body, "Non-goals"), name).toEqual(["old scope"]);
      expect(readMapSection(mapDoc.body, "Non-negotiable facts"), name).toEqual([]);
    }
  });

  test("docs/bugs/ is untouched: a static archive, not a live substrate", () => {
    const bugs: Record<string, string> = {
      "docs/bugs/README.md": "# Bugs\n\nstatic archive\n",
      "docs/bugs/2026-01-lost-writes/report.md":
        "---\ntype: bug report\ntitle: Lost writes\n---\n\nbody\n",
    };
    const tree = port({ ...V4_FILES, ...bugs });
    const report = migrate(tree);
    const files = tree.snapshot();

    expect(files["docs/bugs/README.md"]).toBe(bugs["docs/bugs/README.md"]);
    expect(files["docs/bugs/2026-01-lost-writes/report.md"]).toBe(
      bugs["docs/bugs/2026-01-lost-writes/report.md"],
    );
    expect(report.changes.filter((c) => c.path.startsWith("docs/bugs/"))).toEqual([]);
    expect(report.needsHuman.filter((h) => h.path.startsWith("docs/bugs/"))).toEqual([]);
  });

  test("a second run over the migrated v5 tree is a no-op with byte-stable output", () => {
    const tree = port({ ...V4_FILES });
    migrate(tree);
    const afterFirst = tree.snapshot();

    const second = migrate(tree);
    expect(second.noop).toBe(true);
    expect(second.changes).toEqual([]);
    expect(tree.snapshot()).toEqual(afterFirst);
  });

  test("a mid-hop failure leaves the tree byte-identical", () => {
    for (const n of [1, 2, 3]) {
      const tree = port({ ...V4_FILES });
      const before = tree.snapshot();
      expect(() => migrate(tree, { failAfterWrites: n })).toThrow();
      expect(tree.snapshot()).toEqual(before);
    }
  });

  test("an interrupted v4-to-5 hop resumes to the same end state", () => {
    const uninterrupted = port({ ...V4_FILES });
    migrate(uninterrupted);
    const expected = uninterrupted.snapshot();

    const interrupted = port({ ...V4_FILES });
    expect(() => migrate(interrupted, { failAfterWrites: 1 })).toThrow();
    const resumed = migrate(interrupted);
    expect(resumed.noop).toBe(false);
    expect(interrupted.snapshot()).toEqual(expected);
  });

  test("a v5-stamped tree reports its vintage as 5", () => {
    // detectVintage's version-5 branch: the stamp reads back through the
    // report on a tree that is already schema 5.
    const tree = port({
      "docs/tasks/state.yaml": "schema_version: 5\nmap: e\ntask: null\n",
      "docs/tasks/e/map.md":
        "---\ntype: map\ntitle: E\nstatus: stable\n---\n\n## Non-goals\n\nx\n\n## Non-negotiable facts\n\ny\n",
    });
    const report = migrate(tree);
    expect(report.from).toBe(5);
    expect(report.to).toBe(5);
  });
});

describe("migrate: dry run", () => {
  test("stages nothing and reports the plan", () => {
    const tree = port({ ...V3_FILES });
    const before = tree.snapshot();
    const report = migrate(tree, { dryRun: true });
    expect(report.changes.length).toBeGreaterThan(0);
    expect(tree.snapshot()).toEqual(before);
  });
});
