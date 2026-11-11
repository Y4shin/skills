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

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { getPackages, type Packages } from "@manypkg/get-packages";
import { validateConfig } from "@changesets/config";
import { readChangesets } from "@changesets/read";
import { writeChangeset } from "@changesets/write";
import type { Changeset, Config, NewChangeset } from "@changesets/types";

/** The three bump levels a changeset names. */
export const CHANGE_LEVELS = ["patch", "minor", "major"] as const;

export type ChangeLevel = (typeof CHANGE_LEVELS)[number];

/** The entry an effort with nothing a user can observe proposes instead. */
export const GENERIC_SUMMARY = "Performance and stability improvements.";

/** One changeset entry, as the effort close proposes it. */
export interface ChangesetEntry {
  /** The workspace package the entry versions. */
  package: string;
  /** The bump level. */
  level: ChangeLevel;
  /** The entry body: what a user of the package or product can observe. */
  summary: string;
}

/** What an effort proposes, once the generic fallback and the dedupe have run. */
export interface Proposal {
  /** The refusal, or null when the proposal stands. */
  refusal: ChangesetsRefusal | null;
  /** The entries still to write: the proposal minus what is already staged. */
  entries: ChangesetEntry[];
  /** Proposed entries dropped because an identical one is already staged. */
  skipped: ChangesetEntry[];
  /** True when the generic patch answered for an effort with nothing observable. */
  generic: boolean;
  /** Non-fatal notes from the workspace or the config read. */
  diagnostics: string[];
}

/**
 * Propose the entries an effort's close should write.
 *
 * An effort with nothing a user can observe proposes the generic performance
 * and stability patch. Either way the proposal is deduped against what is
 * already staged: an identical entry is not repeated, because a second copy
 * would version the package twice for one change.
 *
 * Nothing here writes: the effort close prints the proposal and the operator
 * confirms it before `writeEntries` runs.
 */
export async function proposeEntries(
  cwd: string,
  request: { changes: ChangesetEntry[] },
): Promise<Proposal> {
  const resolved = await resolveProposal(cwd, request.changes);
  return {
    refusal: resolved.refusal,
    entries: resolved.entries,
    skipped: resolved.skipped,
    generic: resolved.generic,
    diagnostics: resolved.diagnostics,
  };
}

/** A proposal plus the workspace it was resolved against, for the write path. */
interface ResolvedProposal extends Proposal {
  workspace: Workspace | null;
}

/**
 * Resolve one proposal: the workspace, the config, the validation, the generic
 * fallback, and the dedupe against what is already staged, in that order, so a
 * refusal leaves the proposal empty.
 */
async function resolveProposal(cwd: string, changes: ChangesetEntry[]): Promise<ResolvedProposal> {
  const read = await readWorkspace(cwd);
  if (read.refusal !== null || read.workspace === null) return refusedProposal(read.refusal!, read.diagnostics);
  const workspace = read.workspace;
  const config = await readChangesetConfig(workspace);
  if (config.refusal !== null) return refusedProposal(config.refusal, config.diagnostics);
  const invalid = validateEntries(changes, workspace);
  if (invalid !== null) return refusedProposal(invalid, config.diagnostics);

  const generic = changes.length === 0;
  let requested = changes;
  if (generic) {
    if (workspace.root === null) {
      return refusedProposal(
        {
          code: "no-root-package",
          reason: `the workspace at ${workspace.rootDir} has no root package name, so no generic patch can be proposed`,
        },
        config.diagnostics,
      );
    }
    requested = [{ package: workspace.root, level: "patch", summary: GENERIC_SUMMARY }];
  }

  const staged = await readStagedEntries(workspace);
  const entries: ChangesetEntry[] = [];
  const skipped: ChangesetEntry[] = [];
  for (const entry of requested) {
    if (staged.entries.some((other) => identical(other, entry))) skipped.push(entry);
    else entries.push(entry);
  }
  return {
    refusal: null,
    workspace,
    entries,
    skipped,
    generic,
    diagnostics: [...config.diagnostics, ...staged.diagnostics],
  };
}

/** A proposal that writes nothing, carrying the refusal and what the reads noted. */
function refusedProposal(refusal: ChangesetsRefusal, diagnostics: string[]): ResolvedProposal {
  return { refusal, workspace: null, entries: [], skipped: [], generic: false, diagnostics };
}

/** True when two entries would write the same changeset. */
function identical(a: ChangesetEntry, b: ChangesetEntry): boolean {
  return a.package === b.package && a.level === b.level && a.summary.trim() === b.summary.trim();
}

/** What is already staged in `.changeset/`, plus what reading it had to report. */
export interface StagedRead {
  entries: ChangesetEntry[];
  diagnostics: string[];
}

/**
 * Read the pending changesets as entries, one per release they name.
 *
 * An unreadable staged entry is a diagnostic, not a refusal: the dedupe can
 * only be as good as the tree it reads, and the release path reports the real
 * problem when it consumes the file.
 */
export async function readStagedEntries(workspace: Workspace): Promise<StagedRead> {
  let staged: NewChangeset[];
  try {
    staged = await readChangesets(workspace.rootDir);
  } catch (e) {
    return { entries: [], diagnostics: [`the staged changesets could not be read: ${(e as Error).message}`] };
  }
  const entries: ChangesetEntry[] = [];
  for (const changeset of staged) {
    for (const release of changeset.releases) {
      // A release type outside the three levels cannot match what an effort
      // proposes, so it is not part of the dedupe set.
      if (!CHANGE_LEVELS.includes(release.type as ChangeLevel)) continue;
      entries.push({ package: release.name, level: release.type as ChangeLevel, summary: changeset.summary });
    }
  }
  return { entries, diagnostics: [] };
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
 * Write the entries this effort proposes, under `.changeset/`.
 *
 * An empty request proposes the generic patch, and any entry identical to one
 * already staged is dropped. Every entry is validated against the workspace
 * before anything is written, so a refused call writes no file at all: a
 * half-written batch of entries is worse than none, because the operator
 * confirmed a set and got part of it.
 *
 * Formatting is forced off: the config's default value is "auto", which spawns
 * a formatter, and a formatter failure leaves a half-applied tree. The library
 * writes the file, so the bytes are the command line tool's own.
 */
export async function writeEntries(
  cwd: string,
  request: { entries: ChangesetEntry[] },
): Promise<WriteOutcome> {
  const resolved = await resolveProposal(cwd, request.entries);
  if (resolved.refusal !== null || resolved.workspace === null) {
    return {
      refusal: resolved.refusal,
      written: [],
      entries: [],
      skipped: resolved.skipped,
      generic: resolved.generic,
      diagnostics: resolved.diagnostics,
    };
  }
  const workspace = resolved.workspace;
  const written: string[] = [];
  for (const entry of resolved.entries) {
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
    entries: resolved.entries,
    skipped: resolved.skipped,
    generic: resolved.generic,
    diagnostics: resolved.diagnostics,
  };
}

/** The workspace a repository versions: its package names and its own manifest. */
export interface Workspace {
  /** The workspace root, the directory `.changeset/` lives in. */
  rootDir: string;
  /** Every package name the workspace holds, the root package included. */
  names: string[];
  /** The root package's name, or null when the root declares none. */
  root: string | null;
  /** The reader's own view: the library calls that version a workspace take it. */
  reader: Packages;
}

/** The workspace, or the reason it could not be read. */
export interface WorkspaceRead {
  refusal: ChangesetsRefusal | null;
  workspace: Workspace | null;
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
      workspace: null,
      diagnostics: [],
    };
  }
  return {
    refusal: null,
    workspace: {
      rootDir: packages.rootDir,
      names: packages.packages.map((entry) => entry.packageJson.name),
      root: packages.rootPackage?.packageJson.name ?? null,
      reader: packages,
    },
    diagnostics: [],
  };
}

/** The config a repository's changesets setup carries, or the reason it has none. */
export interface ConfigRead {
  refusal: ChangesetsRefusal | null;
  config: Config | null;
  diagnostics: string[];
}

/**
 * Read `.changeset/config.json` from the workspace root.
 *
 * A missing file is a refusal, never a fallback to the library's built-in
 * default: the default would author and version a repository that has no
 * changesets setup at all, and its changelog specifier points at the command
 * line tool this package deliberately does not depend on.
 */
export async function readChangesetConfig(workspace: Workspace): Promise<ConfigRead> {
  const path = join(workspace.rootDir, ".changeset", "config.json");
  if (!existsSync(path)) {
    return {
      refusal: {
        code: "no-config",
        reason: `this repository has no changeset config at ${path}, so there is nothing to author changesets against`,
      },
      config: null,
      diagnostics: [],
    };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf-8"));
  } catch (e) {
    return {
      refusal: { code: "invalid-config", reason: `${path} is not readable JSON: ${(e as Error).message}` },
      config: null,
      diagnostics: [],
    };
  }
  const parsed = validateConfig(raw, workspace.reader);
  if (parsed.errors !== undefined) {
    return {
      refusal: {
        code: "invalid-config",
        reason: `${path} is not a valid changeset config: ${parsed.errors.join("; ")}`,
      },
      config: null,
      diagnostics: parsed.warnings,
    };
  }
  return { refusal: null, config: parsed.config, diagnostics: parsed.warnings };
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
    if (!workspace.names.includes(entry.package)) {
      return {
        code: "unknown-package",
        reason:
          `'${entry.package}' is not a package in this workspace for entry '${entry.summary}'` +
          `: the workspace packages are ${workspace.names.join(", ")}`,
      };
    }
  }
  return null;
}
