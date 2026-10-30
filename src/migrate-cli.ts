/**
 * Migration CLI: a thin argv wrapper around `migrate()` with the production
 * filesystem port.
 *
 * Invoked by `skills/engineering/setup-workflow/scripts/migrate.mjs`, which
 * spawns `node --experimental-strip-types src/migrate-cli.ts`.
 *
 * Usage: migrate-cli [--dry-run] [--root <dir>]
 * The repo root defaults to the current working directory.
 */

import { migrate, type MigrateReport } from "./core/migrate.js";
import { FsPort } from "./core/fs-port.js";

function render(report: MigrateReport, dryRun: boolean): string {
  const lines: string[] = [];
  if (report.noop) {
    lines.push("already on schema_version 5, nothing to do.");
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
