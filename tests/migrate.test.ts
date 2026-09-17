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

    const arch = fm(files["docs/tasks/task-tools-overhaul/arch-spec.md"]);
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
    expect(state).toEqual({ schema_version: 4, map: "my-map", task: "my-task" });
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
    expect(state).toEqual({ schema_version: 4, map: null, task: null });
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
    expect(state).toEqual({ schema_version: 4, map: "m", task: null });
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

describe("migrate: the root index", () => {
  test("carries okf_version 0.2 and lists the tree", () => {
    const tree = port({ ...V3_FILES });
    migrate(tree);
    const content = tree.snapshot()["docs/tasks/index.md"];
    const doc = parse(content);
    expect(doc.data.okf_version).toBe("0.2");
    expect(doc.data.type).toBe("index");
    expect(doc.body).toContain("task-tools-overhaul");
    expect(doc.body).toContain("old-map");
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

    expect(files["docs/vendored/matt-skills/README.md"]).toBe("# vendored\n");
    expect(files["docs/vendored/matt-skills/skills/tdd/SKILL.md"]).toBe("# tdd\n");
    expect(files["docs/tasks/archive/report/matt-skills/README.md"]).toBeUndefined();

    const pointer = files["docs/tasks/archive/report/matt-skills.pointer.md"];
    expect(pointer).toBeDefined();
    expect(parse(pointer).data.type).toBe("out-of-scope note");
    expect(pointer).toContain("docs/vendored/matt-skills");

    const item = report.needsHuman.find((h) => h.kind === "vendored-tree");
    expect(item).toBeDefined();
    expect(item!.path).toContain("matt-skills");
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

describe("migrate: dry run", () => {
  test("stages nothing and reports the plan", () => {
    const tree = port({ ...V3_FILES });
    const before = tree.snapshot();
    const report = migrate(tree, { dryRun: true });
    expect(report.changes.length).toBeGreaterThan(0);
    expect(tree.snapshot()).toEqual(before);
  });
});
