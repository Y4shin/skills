/** Barrel export of the prd-tool core (runtime-agnostic; no opencode/Claude deps). */

export * from "./errors";
export * from "./frontmatter";
export * from "./model";
export * as validate from "./validate";
export * as forge from "./forge";
export * as forgejo from "./forgejo";
export * as tracker from "./tracker";
export * as workflow from "./workflow";
export { referenceText } from "./reference";

import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/** Read `docs/prd/profile.md` from the repo root; empty string if missing. */
export function profileText(root: string): string {
  const p = join(root, "docs", "prd", "profile.md");
  if (existsSync(p) && statSync(p).isFile()) return readFileSync(p, "utf-8");
  return "";
}
