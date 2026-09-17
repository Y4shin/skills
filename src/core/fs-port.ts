/**
 * The production `TreePort`: a real filesystem, with an atomic commit.
 *
 * This lives in its own module (not in `migrate-cli.ts`) so tests can drive it
 * against a real directory on disk. The CLI entry point calls `process.exit`,
 * which would kill a test process that imported it.
 *
 * Atomicity is the migration's core non-negotiable ("on any failure leave the
 * tree untouched"), so `commit()` is a genuine all-or-nothing boundary:
 *
 * 1. Every staged write is verified (YAML round-trip) before disk is touched.
 * 2. Every path the commit will touch is snapshotted into an undo journal.
 * 3. Moves, writes, and deletes are applied.
 * 4. On any failure, every touched path is restored from the journal, so the
 *    tree is byte-identical to its pre-commit state.
 *
 * A test double that implements its own atomic swap cannot prove this; only
 * this port, exercised against real disk, can.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";

import { verifyStagedWrite, type TreePort } from "./migrate.js";

/** A TreePort over a real directory, with staged changes and an atomic commit. */
export class FsPort implements TreePort {
  private writes = new Map<string, string>();
  private moves: Array<[string, string]> = [];
  private deletes: string[] = [];
  private root: string;

  constructor(root: string) {
    this.root = root;
  }

  list(): string[] {
    const out: string[] = [];
    const walk = (dir: string): void => {
      if (!existsSync(dir)) return;
      for (const name of readdirSync(dir).sort()) {
        if (name === ".git" || name === "node_modules") continue;
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else out.push(relative(this.root, p).split("\\").join("/"));
      }
    };
    walk(this.root);
    return out;
  }

  read(path: string): string {
    return readFileSync(join(this.root, path), "utf-8");
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

  /**
   * Apply every staged change atomically.
   *
   * Verifies all writes first, snapshots every touched path, applies, and
   * restores from the snapshot on any failure. A throw therefore leaves the
   * tree exactly as it was.
   */
  commit(opts: { failAfterWrites?: number } = {}): void {
    // (1) Verify before touching disk, so a malformed rewrite cannot even
    // begin to land.
    for (const [path, content] of this.writes) verifyStagedWrite(path, content);

    // (2) Snapshot every path this commit may touch. `null` means "did not
    // exist", which is what restore writes back (a removal).
    const touched = new Set<string>();
    for (const [from, to] of this.moves) {
      touched.add(from);
      touched.add(to);
    }
    for (const path of this.writes.keys()) touched.add(path);
    for (const path of this.deletes) touched.add(path);

    const journal = new Map<string, string | null>();
    for (const p of touched) {
      const abs = join(this.root, p);
      journal.set(p, existsSync(abs) ? readFileSync(abs, "utf-8") : null);
    }

    // Directories this commit may create. A failure must remove the ones that
    // did not exist before, or the tree is left with empty scaffolding even
    // though every file was restored.
    const dirsBefore = new Set<string>();
    for (const p of touched) {
      let d = dirname(join(this.root, p));
      while (d.length > this.root.length && d.startsWith(this.root)) {
        if (existsSync(d)) dirsBefore.add(d);
        d = dirname(d);
      }
    }

    let n = 0;
    const bump = (): void => {
      n++;
      if (opts.failAfterWrites !== undefined && n === opts.failAfterWrites) {
        throw new Error(`injected failure at write ${n}`);
      }
    };

    try {
      // Moves first, then writes: a write to a destination path is not
      // clobbered by the move that brings the source there.
      for (const [from, to] of this.moves) {
        bump();
        const absFrom = join(this.root, from);
        const absTo = join(this.root, to);
        if (!existsSync(absFrom)) continue;
        mkdirSync(dirname(absTo), { recursive: true });
        renameSync(absFrom, absTo);
      }
      for (const [path, content] of this.writes) {
        bump();
        const abs = join(this.root, path);
        mkdirSync(dirname(abs), { recursive: true });
        writeFileSync(abs, content, "utf-8");
      }
      for (const path of this.deletes) {
        bump();
        const abs = join(this.root, path);
        if (existsSync(abs)) rmSync(abs, { force: true });
      }
    } catch (e) {
      // (4) Restore in reverse order, so a path that was both moved away and
      // written lands back on its original content.
      for (const [p, original] of [...journal].reverse()) {
        const abs = join(this.root, p);
        try {
          if (original === null) {
            if (existsSync(abs)) rmSync(abs, { force: true });
          } else {
            writeFileSync(abs, original, "utf-8");
          }
        } catch {
          // Best effort: keep restoring the remaining paths so one stubborn
          // path cannot leave the rest half-applied.
        }
      }
      // Remove directories this commit created, deepest first, so a restored
      // tree has no empty scaffolding left behind.
      const created: string[] = [];
      for (const p of touched) {
        let d = dirname(join(this.root, p));
        while (d.length > this.root.length && d.startsWith(this.root)) {
          if (!dirsBefore.has(d) && existsSync(d)) created.push(d);
          d = dirname(d);
        }
      }
      for (const d of [...new Set(created)].sort((a, b) => b.length - a.length)) {
        try {
          if (readdirSync(d).length === 0) rmSync(d, { recursive: true, force: true });
        } catch {
          // Best effort.
        }
      }
      throw e;
    }

    this.writes.clear();
    this.moves = [];
    this.deletes = [];
  }

  rollback(): void {
    this.writes.clear();
    this.moves = [];
    this.deletes = [];
  }
}
