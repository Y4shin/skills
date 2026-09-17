/**
 * Migration CLI: a thin argv wrapper around `migrate()` with a node:fs
 * TreePort.
 *
 * Invoked by `skills/engineering/setup-workflow/scripts/migrate.mjs`, which
 * spawns `node --experimental-strip-types src/migrate-cli.ts`.
 *
 * Usage: migrate-cli [--dry-run] [--root <dir>]
 * The repo root defaults to the current working directory.
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

import { migrate, type MigrateReport, type TreePort } from "./core/migrate.js";

/** A TreePort over a real directory, with staged writes and an atomic commit. */
class FsPort implements TreePort {
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
   * Apply every staged change. Nothing reaches disk until every staged write
   * has been verified, so a malformed rewrite throws with the tree untouched.
   */
  commit(): void {
    // Moves first, then writes: a write to a destination path is not
    // clobbered by the move that brings the source there.
    for (const [from, to] of this.moves) {
      const absFrom = join(this.root, from);
      const absTo = join(this.root, to);
      if (!existsSync(absFrom)) continue;
      mkdirSync(dirname(absTo), { recursive: true });
      renameSync(absFrom, absTo);
    }
    for (const [path, content] of this.writes) {
      const abs = join(this.root, path);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, content, "utf-8");
    }
    for (const path of this.deletes) {
      const abs = join(this.root, path);
      if (existsSync(abs)) rmSync(abs, { force: true });
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

function render(report: MigrateReport, dryRun: boolean): string {
  const lines: string[] = [];
  if (report.noop) {
    lines.push("already on schema_version 4, nothing to do.");
    return lines.join("\n");
  }
  lines.push(
    `${dryRun ? "dry run: would migrate" : "migrated"} from schema_version ${report.from} to ${report.to}`,
  );
  lines.push("");
  lines.push(`${report.changes.length} change(s):`);
  for (const c of report.changes) {
    lines.push(`  ${c.action} ${c.path}: ${c.detail}`);
  }
  if (report.needsHuman.length > 0) {
    lines.push("");
    lines.push(`${report.needsHuman.length} item(s) needing human eyes:`);
    for (const h of report.needsHuman) {
      lines.push(`  ${h.kind} ${h.path}: ${h.detail}`);
    }
  }
  return lines.join("\n");
}

function main(argv: string[]): number {
  const dryRun = argv.includes("--dry-run");
  const rootIndex = argv.indexOf("--root");
  const root = rootIndex === -1 ? process.cwd() : argv[rootIndex + 1];

  try {
    const port = new FsPort(root);
    const report = migrate(port, { dryRun });
    process.stdout.write(render(report, dryRun) + "\n");
    return 0;
  } catch (e) {
    process.stderr.write(`migration failed: ${(e as Error).message}\n`);
    return 1;
  }
}

process.exit(main(process.argv.slice(2)));
