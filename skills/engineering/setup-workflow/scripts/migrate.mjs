#!/usr/bin/env node
/**
 * Shim that spawns the migration CLI (`src/migrate-cli.ts`) with the repo
 * root as argv, and exits with the CLI's code.
 *
 * Node 22.6+ strips TypeScript types natively. The repo's sources use
 * NodeNext `.js` import specifiers, so the shim also loads `ts-resolve.mjs`,
 * a resolve hook that points those specifiers back at the `.ts` sources. The
 * shim reports a clear error naming the required Node version when the spawn
 * fails.
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..", "..");
const cli = join(repoRoot, "src", "migrate-cli.ts");
const resolveHook = join(here, "ts-resolve.mjs");

const args = process.argv.slice(2);
const rootIndex = args.indexOf("--root");
const root = rootIndex === -1 ? process.cwd() : args[rootIndex + 1];
const passthrough = args.filter(
  (a, i) => a !== "--root" && (rootIndex === -1 || i !== rootIndex + 1),
);

const result = spawnSync(
  process.execPath,
  [
    "--experimental-strip-types",
    "--import",
    resolveHook,
    cli,
    "--root",
    root,
    ...passthrough,
  ],
  { cwd: root, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] },
);

if (result.error) {
  process.stderr.write(
    `migrate.mjs: failed to spawn the migration CLI (${result.error.message}). ` +
      `The migration needs Node 22.6 or newer for --experimental-strip-types.\n`,
  );
  process.exit(1);
}

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
