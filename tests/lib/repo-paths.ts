/**
 * Repo-relative paths for the corpus sweeps.
 *
 * The sweeps compare a file's path against POSIX literals such as
 * `docs/tasks/CHANGELOG.md` and against exemption sets keyed the same way. On
 * Windows a repo-relative path comes back with backslashes, so every exemption
 * and exclusion silently stopped matching and each guard reported false
 * positives over the very files it means to exempt. That is worse than a
 * failure: a green run on Windows would have meant the retired-vocabulary,
 * old-tool-prefix, dead-surface, and em-dash sweeps were enforcing nothing.
 *
 * Derive the comparison form in one place, so every sweep agrees with every
 * other one on every host.
 */

import { relative } from "node:path";

/** `path` relative to `root` (the repository root by default), in POSIX form. */
export function repoRel(path: string, root: string = process.cwd()): string {
  return relative(root, path).split("\\").join("/");
}
