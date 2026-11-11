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

import { getPackages, type Packages } from "@manypkg/get-packages";
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
 * Every entry is validated against the workspace before anything is written, so
 * a refused call writes no file at all: a half-written batch of entries is
 * worse than none, because the operator confirmed a set and got part of it.
 *
 * Formatting is forced off: the config's default value is "auto", which spawns
 * a formatter, and a formatter failure leaves a half-applied tree. The library
 * writes the file, so the bytes are the command line tool's own.
 */
export async function writeEntries(
  cwd: string,
  request: { entries: ChangesetEntry[] },
): Promise<WriteOutcome> {
  const read = await readWorkspace(cwd);
  if (read.refusal !== null) return refused(read.refusal, read.diagnostics);
  const workspace = read.packages;
  const invalid = validateEntries(request.entries, workspace);
  if (invalid !== null) return refused(invalid, read.diagnostics);

  const written: string[] = [];
  for (const entry of request.entries) {
    const changeset: Changeset = {
      summary: entry.summary,
      releases: [{ name: entry.package, type: entry.level }],
    };
    const id = await writeChangeset(changeset, workspace.rootDir, { format: false });
    written.push(join(workspace.rootDir, ".changeset", `${id}.md`));
  }
  return {
    refusal: null,
    written,
    entries: request.entries,
    skipped: [],
    generic: false,
    diagnostics: read.diagnostics,
  };
}

/** A write that wrote nothing, carrying the refusal and what the reads noted. */
function refused(refusal: ChangesetsRefusal, diagnostics: string[]): WriteOutcome {
  return { refusal, written: [], entries: [], skipped: [], generic: false, diagnostics };
}

/** The workspace a repository versions: its package names and its own manifest. */
export interface Workspace {
  /** The workspace root, the directory `.changeset/` lives in. */
  rootDir: string;
  /** Every package name the workspace holds, the root package included. */
  packages: string[];
  /** The root package's name, or null when the root declares none. */
  root: string | null;
}

/** The workspace, or the reason it could not be read. */
export interface WorkspaceRead {
  refusal: ChangesetsRefusal | null;
  packages: Workspace;
  diagnostics: string[];
}

/**
 * Read the workspace through the workspace reader.
 *
 * A repository without a readable manifest is a named refusal: an entry's
 * package name can only be validated against the workspace, so no workspace
 * means no entry.
 */
export async function readWorkspace(cwd: string): Promise<WorkspaceRead> {
  let packages: Packages;
  try {
    packages = await getPackages(cwd);
  } catch (e) {
    return {
      refusal: { code: "no-workspace", reason: `no workspace could be read from ${cwd}: ${(e as Error).message}` },
      packages: { rootDir: cwd, packages: [], root: null },
      diagnostics: [],
    };
  }
  const names = packages.packages.map((entry) => entry.packageJson.name);
  return {
    refusal: null,
    packages: {
      rootDir: packages.rootDir,
      packages: names,
      root: packages.rootPackage?.packageJson.name ?? null,
    },
    diagnostics: [],
  };
}

/**
 * The first reason one of the entries cannot be written, or null when every
 * entry names a workspace package and a real level.
 */
function validateEntries(entries: ChangesetEntry[], workspace: Workspace): ChangesetsRefusal | null {
  for (const entry of entries) {
    if (!CHANGE_LEVELS.includes(entry.level)) {
      return {
        code: "invalid-level",
        reason: `'${String(entry.level)}' is not a changeset level: use ${CHANGE_LEVELS.join(", ")}`,
      };
    }
    if (!workspace.packages.includes(entry.package)) {
      return {
        code: "unknown-package",
        reason:
          `'${entry.package}' is not a package in this workspace for entry '${entry.summary}'` +
          `: the workspace packages are ${workspace.packages.join(", ")}`,
      };
    }
  }
  return null;
}
