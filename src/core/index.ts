/** Barrel export of the task-workflow core (runtime-agnostic). */

export * from "./errors.js";
export * from "./frontmatter.js";
export * from "./model.js";
export * as state from "./state.js";
export * as forge from "./forge.js";
export * as forgejo from "./forgejo.js";
export * as tracker from "./tracker.js";

import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export function profileText(root: string): string {
  const p = join(root, "docs", "tasks", "profile.md");
  if (existsSync(p) && statSync(p).isFile()) return readFileSync(p, "utf-8");
  return "";
}