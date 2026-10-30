/**
 * Tests for the production filesystem port (`src/core/fs-port.ts`).
 *
 * This is the seam the migration's core non-negotiable lives on: "on any
 * failure leave the tree untouched". The in-memory test double implements its
 * own atomic swap, so it cannot prove the production port is atomic. These
 * tests drive `FsPort` against a real directory on disk, with real
 * `renameSync`/`writeFileSync`/`rmSync` failures, and assert the tree is
 * byte-identical afterwards.
 *
 * `FsPort` lives outside `migrate-cli.ts` precisely so it can be imported here;
 * the CLI entry point calls `process.exit`, which would kill the test process.
 */

import { describe, expect, test } from "vitest";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

import { FsPort } from "../src/core/fs-port.js";
import { migrate } from "../src/core/migrate.js";

function mkTmp(): string {
  const d = join(tmpdir(), "fsport-" + randomBytes(4).toString("hex"));
  mkdirSync(d, { recursive: true });
  return d;
}

/** Every file under `root` with its content, for a byte-level comparison. */
function snapshot(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir).sort()) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else out[relative(root, p).split("\\").join("/")] = readFileSync(p, "utf-8");
    }
  };
  walk(root);
  return out;
}

/**
 * Every directory under `root`, so a restore that leaves empty scaffolding
 * behind is caught. Files alone are not enough: the tree must be exactly as it
 * was, directories included.
 */
function dirSnapshot(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir).sort()) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        out.push(relative(root, p).split("\\").join("/"));
        walk(p);
      }
    }
  };
  walk(root);
  return out;
}

/** A v3 tree: a map under maps/, a flat task, and a v3 state file. */
function seedV3(root: string): void {
  mkdirSync(join(root, "docs/tasks/maps/effort"), { recursive: true });
  mkdirSync(join(root, "docs/tasks/my-task"), { recursive: true });
  writeFileSync(
    join(root, "docs/tasks/maps/effort/map.md"),
    "---\nkind: map\nslug: effort\ntitle: Effort\nstatus: active\ntasks:\n- slug: my-task\n  blocked_by: []\n  done: false\n---\n",
  );
  writeFileSync(
    join(root, "docs/tasks/my-task/task.md"),
    "---\nkind: task\ntype: feature\nslug: my-task\ntitle: My task\nmap: effort\nstatus: ready\nblocked_by: []\nslices: [my-task]\n---\n",
  );
  writeFileSync(join(root, "docs/tasks/state.yaml"), "task: null\nslice: null\nschema_version: 3\n");
}

describe("FsPort: staged changes do not land until commit", () => {
  test("staging alone writes nothing", () => {
    const root = mkTmp();
    try {
      seedV3(root);
      const before = snapshot(root);
      const port = new FsPort(root);
      port.stageWrite("docs/tasks/new.md", "---\ntype: findings\ntitle: N\nstatus: stable\n---\n");
      port.stageMove("docs/tasks/my-task/task.md", "docs/tasks/effort/tickets/my-task/ticket.md");
      port.stageDelete("docs/tasks/state.yaml");
      expect(snapshot(root)).toEqual(before);
      port.rollback();
      expect(snapshot(root)).toEqual(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("commit applies moves, writes, and deletes", () => {
    const root = mkTmp();
    try {
      seedV3(root);
      const port = new FsPort(root);
      port.stageMove("docs/tasks/my-task/task.md", "docs/tasks/effort/tickets/my-task/ticket.md");
      port.stageWrite("docs/tasks/index.md", "---\ntype: changelog\ntitle: Index\nstatus: stable\n---\n");
      port.stageDelete("docs/tasks/state.yaml");
      port.commit();
      expect(existsSync(join(root, "docs/tasks/effort/tickets/my-task/ticket.md"))).toBe(true);
      expect(existsSync(join(root, "docs/tasks/my-task/task.md"))).toBe(false);
      expect(existsSync(join(root, "docs/tasks/index.md"))).toBe(true);
      expect(existsSync(join(root, "docs/tasks/state.yaml"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("FsPort: corruption safety on real disk", () => {
  test("an injected failure mid-commit restores the tree byte-identically", () => {
    for (const n of [1, 2, 3, 4]) {
      const root = mkTmp();
      try {
        seedV3(root);
        const before = snapshot(root);
        const dirsBefore = dirSnapshot(root);
        const port = new FsPort(root);
        // Drive the real migration so the staged set is realistic.
        expect(() => migrate(port, { failAfterWrites: n })).toThrow();
        expect(snapshot(root)).toEqual(before);
        // Directories too: a restore that leaves empty scaffolding behind is
        // not "the tree untouched".
        expect(dirSnapshot(root)).toEqual(dirsBefore);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  test("a real I/O failure mid-commit restores the tree byte-identically", () => {
    // The reproduction from the deviation report: a rename fails with EACCES
    // because the destination directory is read-only. The first move has
    // already landed when the second fails, so without a journal the tree is
    // left half-migrated.
    const root = mkTmp();
    try {
      seedV3(root);
      const before = snapshot(root);
      const dirsBefore = dirSnapshot(root);
      // Pre-create the ticket destination read-only so a nested mkdir fails.
      const dest = join(root, "docs/tasks/effort/tickets");
      mkdirSync(dest, { recursive: true });
      const dirsWithDest = dirSnapshot(root);
      chmodSync(dest, 0o500);
      try {
        const port = new FsPort(root);
        expect(() => migrate(port)).toThrow();
      } finally {
        chmodSync(dest, 0o700);
      }
      expect(snapshot(root)).toEqual(before);
      expect(dirSnapshot(root)).toEqual(dirsWithDest);
      expect(dirsWithDest).toContain("docs/tasks/effort/tickets");
      expect(dirsBefore).not.toContain("docs/tasks/effort/tickets");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a malformed staged rewrite throws before anything lands", () => {
    const root = mkTmp();
    try {
      seedV3(root);
      const before = snapshot(root);
      const port = new FsPort(root);
      port.stageWrite("docs/tasks/ok.md", "---\ntype: findings\ntitle: Ok\nstatus: stable\n---\n");
      port.stageWrite("docs/tasks/broken.md", "no frontmatter fence here");
      expect(() => port.commit()).toThrow();
      expect(snapshot(root)).toEqual(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a write to a path that did not exist is removed on restore", () => {
    const root = mkTmp();
    try {
      seedV3(root);
      const before = snapshot(root);
      const port = new FsPort(root);
      port.stageWrite("docs/tasks/created.md", "---\ntype: findings\ntitle: C\nstatus: stable\n---\n");
      expect(() => port.commit({ failAfterWrites: 1 })).toThrow();
      expect(existsSync(join(root, "docs/tasks/created.md"))).toBe(false);
      expect(snapshot(root)).toEqual(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("FsPort: the tree walk tolerates symlink hazards", () => {
  test("a dangling symlink outside the bundle is skipped, not fatal", () => {
    // The reproduction from the live 3-to-4 run: a gitignored experiment
    // tree carries .devenv pointers to ephemeral runtime dirs, and statSync
    // (which follows links) threw ENOENT, killing the whole migration
    // before anything was staged.
    const root = mkTmp();
    try {
      seedV3(root);
      mkdirSync(join(root, "prototype-bundle/.devenv"), { recursive: true });
      symlinkSync(
        "/run/user/1000/nowhere-devenv",
        join(root, "prototype-bundle/.devenv/run"),
      );
      const port = new FsPort(root);
      const paths = port.list();
      expect(paths).toContain("docs/tasks/state.yaml");
      expect(paths).not.toContain("prototype-bundle/.devenv/run");
      // The full migration over the same tree still runs to completion.
      const report = migrate(port);
      expect(report.noop).toBe(false);
      expect(
        readFileSync(join(root, "docs/tasks/state.yaml"), "utf-8"),
      ).toContain("schema_version: 5");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("FsPort: the real migration is idempotent on disk", () => {
  test("a second run over a migrated tree stages nothing", () => {
    const root = mkTmp();
    try {
      seedV3(root);
      const first = migrate(new FsPort(root));
      expect(first.noop).toBe(false);
      const afterFirst = snapshot(root);
      const second = migrate(new FsPort(root));
      expect(second.noop).toBe(true);
      expect(second.changes).toEqual([]);
      expect(snapshot(root)).toEqual(afterFirst);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("the migrated tree is schema 5 on disk", () => {
    const root = mkTmp();
    try {
      seedV3(root);
      migrate(new FsPort(root));
      const state = readFileSync(join(root, "docs/tasks/state.yaml"), "utf-8");
      expect(state).toContain("schema_version: 5");
      expect(existsSync(join(root, "docs/tasks/index.md"))).toBe(true);
      // The task landed under the effort's tickets/ subtree.
      expect(existsSync(join(root, "docs/tasks/effort/tickets/my-task/ticket.md"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
