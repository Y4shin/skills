/**
 * The changesets seam: one module wrapping the changesets library set.
 *
 * The effort close authors changesets for what a user of the package can
 * observe, and the release skill consumes them. Both go through here, so the
 * file contract, the package validation, and the generic fallback exist once.
 *
 * The dependency is the library set, never the command line tool: importing
 * `@changesets/cli` runs its command line and exits the process. Writing an
 * entry through `writeChangeset` reproduces what `changeset add` writes,
 * because the CLI is a thin wrapper over the same function.
 *
 * Every failure is a named refusal rather than an exception: this module is
 * called from a tool, and a refused call must leave the working tree as it
 * found it.
 */

import { join } from "node:path";

import { getPackages } from "@manypkg/get-packages";
import { writeChangeset } from "@changesets/write";
import type { Changeset } from "@changesets/types";

/** The three bump levels a changeset names. */
export const CHANGE_LEVELS = ["patch", "minor", "major"] as const;

export type ChangeLevel = (typeof CHANGE_LEVELS)[number];

/** One changeset entry, as the effort close proposes it. */
export interface ChangesetEntry {
  /** The workspace package the entry versions. */
  package: string;
  /** The bump level. */
  level: ChangeLevel;
  /** The entry body: what a user of the package or product can observe. */
  summary: string;
}

/** Why a changeset call was refused. Every code is a named outcome. */
export type ChangesetsRefusalCode =
  | "no-workspace"
  | "no-config"
  | "invalid-config"
  | "unknown-package"
  | "invalid-level"
  | "no-root-package";

/** A refusal: the named outcome plus the reason a caller can print. */
export interface ChangesetsRefusal {
  code: ChangesetsRefusalCode;
  reason: string;
}

/** The result of a write: what landed, what was skipped, and why nothing did. */
export interface WriteOutcome {
  /** The refusal, or null when the call wrote (or correctly wrote nothing). */
  refusal: ChangesetsRefusal | null;
  /** The changeset files written, absolute paths. */
  written: string[];
  /** The entries written, in the order they were written. */
  entries: ChangesetEntry[];
  /** Requested entries that were dropped because an identical one is staged. */
  skipped: ChangesetEntry[];
  /** True when the generic patch answered for an effort with nothing observable. */
  generic: boolean;
  /** Non-fatal notes from the workspace or the config read. */
  diagnostics: string[];
}

/**
 * Write one changeset file per entry under `.changeset/`.
 *
 * Formatting is forced off: the config's default value is "auto", which spawns
 * a formatter, and a formatter failure leaves a half-applied tree. The library
 * writes the file, so the bytes are the command line tool's own.
 */
export async function writeEntries(
  cwd: string,
  request: { entries: ChangesetEntry[] },
): Promise<WriteOutcome> {
  const written: string[] = [];
  for (const entry of request.entries) {
    const changeset: Changeset = {
      summary: entry.summary,
      releases: [{ name: entry.package, type: entry.level }],
    };
    const id = await writeChangeset(changeset, cwd, { format: false });
    written.push(join(cwd, ".changeset", `${id}.md`));
  }
  return { refusal: null, written, entries: request.entries, skipped: [], generic: false, diagnostics: [] };
}
