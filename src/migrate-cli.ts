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

import { migrate } from "./core/migrate.js";
import { FsPort } from "./core/fs-port.js";
import { renderMigrationReport } from "./migrate-report.js";

function main(argv: string[]): number {
  const dryRun = argv.includes("--dry-run");
  const rootIndex = argv.indexOf("--root");
  const root = rootIndex === -1 ? process.cwd() : argv[rootIndex + 1];

  try {
    const port = new FsPort(root);
    const report = migrate(port, { dryRun });
    process.stdout.write(renderMigrationReport(report, dryRun) + "\n");
    return 0;
  } catch (e) {
    process.stderr.write(`migration failed: ${(e as Error).message}\n`);
    return 1;
  }
}

process.exit(main(process.argv.slice(2)));
