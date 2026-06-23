/**
 * The bundled PRD/artifact frontmatter reference (references/artifacts.md).
 *
 * When bundled by esbuild, the markdown is inlined via the `__REFERENCE__`
 * define. When running from source (tests / `tsx`), it is read from the
 * canonical file under the plugin tree.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Replaced by esbuild `define` at bundle time; undefined when running from source.
declare const __REFERENCE__: string;

function fromSource(): string {
  // src/core/reference.ts → repo root is three levels up.
  const here = dirname(fileURLToPath(import.meta.url));
  const src = join(here, "..", "..", "plugins", "prd-workflow", "references", "artifacts.md");
  return readFileSync(src, "utf-8");
}

export function referenceText(): string {
  if (typeof __REFERENCE__ !== "undefined") return __REFERENCE__;
  return fromSource();
}
