/**
 * Resolve hook for running the TypeScript sources directly under Node.
 *
 * The repo's TypeScript uses NodeNext `.js` import specifiers (the compiled
 * output is `.js`). Node's `--experimental-strip-types` strips types but does
 * not rewrite those specifiers back to `.ts`, so a direct run needs this hook
 * to find the source file. It is loaded by `scripts/migrate.mjs` via
 * `--import`; nothing else in the repo depends on it.
 *
 * Self-registering: importing this module installs the hook, so the shim can
 * pass a single `--import <this file>` flag.
 */

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(import.meta.url, pathToFileURL("./"));

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && specifier.endsWith(".js")) {
    try {
      return await nextResolve(specifier.replace(/\.js$/, ".ts"), context);
    } catch {
      /* fall through to the original specifier */
    }
  }
  return nextResolve(specifier, context);
}
