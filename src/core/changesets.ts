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

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { getPackages, type Package, type Packages } from "@manypkg/get-packages";
import { applyReleasePlan } from "@changesets/apply-release-plan";
import { assembleReleasePlan } from "@changesets/assemble-release-plan";
import changelogGit from "@changesets/changelog-git";
import { validateConfig } from "@changesets/config";
import { getCommitsThatAddFiles } from "@changesets/git";
import { readChangesets } from "@changesets/read";
import { writeChangeset } from "@changesets/write";
import type {
  Changeset,
  ComprehensiveRelease,
  Config,
  NewChangeset,
  NewChangesetWithCommit,
  ReleasePlan,
} from "@changesets/types";

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
  /**
   * The discriminant: this outcome is a proposal, and carries no written files.
   * A caller tells the two changeset outcomes apart by this field, so reading
   * `written` off a proposal is a compile error rather than an assertion.
   */
  kind: "proposal";
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
    kind: "proposal",
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
 * Resolve one proposal: the workspace, the config, the entries themselves, and
 * the dedupe against what is already staged, in that order, so a refusal
 * leaves the proposal empty.
 */
async function resolveProposal(cwd: string, changes: ChangesetEntry[]): Promise<ResolvedProposal> {
  const read = await readWorkspace(cwd);
  if (read.refusal !== null || read.workspace === null) return refusedProposal(read.refusal!, read.diagnostics);
  const workspace = read.workspace;
  const config = await readChangesetConfig(workspace);
  if (config.refusal !== null) return refusedProposal(config.refusal, config.diagnostics);
  const requested = resolveEntries(changes, workspace);
  if (requested.refusal !== null) return refusedProposal(requested.refusal, config.diagnostics);

  const staged = await readStagedEntries(workspace);
  // A staged set that cannot be read is a refusal, not an empty set: the dedupe
  // is the only thing standing between the operator and a duplicate entry, and
  // a blind dedupe writes the second copy of exactly what it could not see.
  if (staged.refusal !== null) {
    return refusedProposal(staged.refusal, [...config.diagnostics, ...staged.diagnostics]);
  }
  const entries: ChangesetEntry[] = [];
  const skipped: ChangesetEntry[] = [];
  for (const entry of requested.entries) {
    // Dedupe against what is staged and against what this call already
    // accepted: one change is one entry, however often it is named.
    const duplicate =
      staged.entries.some((other) => identical(other, entry)) || entries.some((other) => identical(other, entry));
    if (duplicate) skipped.push(entry);
    else entries.push(entry);
  }
  return {
    kind: "proposal",
    refusal: null,
    workspace,
    entries,
    skipped,
    generic: requested.generic,
    diagnostics: [...config.diagnostics, ...staged.diagnostics],
  };
}

/** What a call resolves to before the dedupe: the entries, or the refusal. */
export interface EntryResolution {
  refusal: ChangesetsRefusal | null;
  entries: ChangesetEntry[];
  /** True when the generic patch answered for an effort with nothing observable. */
  generic: boolean;
}

/**
 * The entries a call would write, before the dedupe: the request as given, or
 * the generic patch when the effort names nothing observable.
 *
 * The generic entry is built here and validated with the same rule as an
 * explicit one. It used to be built after validation and so was the one entry
 * exempt from the workspace check; building it first makes the check total.
 */
export function resolveEntries(changes: ChangesetEntry[], workspace: Workspace): EntryResolution {
  if (changes.length > 0) {
    const invalid = validateEntries(changes, workspace);
    return invalid === null
      ? { refusal: null, entries: changes, generic: false }
      : { refusal: invalid, entries: [], generic: false };
  }
  if (workspace.root === null) {
    return {
      refusal: {
        code: "no-root-package",
        reason: `the workspace at ${workspace.rootDir} has no root package name, so no generic patch can be proposed`,
      },
      entries: [],
      generic: true,
    };
  }
  const generic: ChangesetEntry = { package: workspace.root, level: "patch", summary: GENERIC_SUMMARY };
  const invalid = validateEntries([generic], workspace);
  return invalid === null
    ? { refusal: null, entries: [generic], generic: true }
    : { refusal: invalid, entries: [], generic: true };
}

/** A proposal that writes nothing, carrying the refusal and what the reads noted. */
function refusedProposal(refusal: ChangesetsRefusal, diagnostics: string[]): ResolvedProposal {
  return { kind: "proposal", refusal, workspace: null, entries: [], skipped: [], generic: false, diagnostics };
}

/** True when two entries would write the same changeset. */
function identical(a: ChangesetEntry, b: ChangesetEntry): boolean {
  return a.package === b.package && a.level === b.level && a.summary.trim() === b.summary.trim();
}

/** What is already staged in `.changeset/`, plus what reading it had to report. */
export interface StagedRead {
  entries: ChangesetEntry[];
  /**
   * The refusal, or null when the read answered. An empty `entries` with a null
   * refusal means nothing is staged; a refusal means the staged set exists and
   * could not be read, which is a different thing.
   */
  refusal: ChangesetsRefusal | null;
  diagnostics: string[];
}

/**
 * Read the pending changesets as entries, one per release they name.
 *
 * The two answers are kept apart: a repository with nothing staged returns no
 * entries and no refusal, while a staged set the library cannot parse is a
 * named refusal. The library parses every file at once, so one malformed entry
 * costs the whole set, and a dedupe that read that as "nothing staged" would
 * write a second copy of an entry the tree already carries.
 */
export async function readStagedEntries(workspace: Workspace): Promise<StagedRead> {
  const read = await readPending(workspace);
  if (read.refusal !== null) return { entries: [], refusal: read.refusal, diagnostics: [] };
  const entries: ChangesetEntry[] = [];
  for (const changeset of read.changesets) {
    for (const release of changeset.releases) {
      // A release type outside the three levels cannot match what an effort
      // proposes, so it is not part of the dedupe set.
      if (!CHANGE_LEVELS.includes(release.type as ChangeLevel)) continue;
      entries.push({ package: release.name, level: release.type as ChangeLevel, summary: changeset.summary });
    }
  }
  return { entries, refusal: null, diagnostics: [] };
}

/** What is pending in `.changeset/`, or the reason the set cannot be read. */
export interface PendingRead {
  changesets: NewChangeset[];
  /** The refusal, or null when the read answered. */
  refusal: ChangesetsRefusal | null;
}

/**
 * Read the pending changesets as the library sees them.
 *
 * One read serves both paths: the authoring dedupe wants the entries
 * flattened, and the release plan wants the changesets whole, so the refusal
 * for a set the library cannot parse is mapped in one place.
 */
export async function readPending(workspace: Workspace): Promise<PendingRead> {
  try {
    return { changesets: await readChangesets(workspace.rootDir), refusal: null };
  } catch (e) {
    // The library's message quotes the offending content but never names the
    // file, so the refusal names the directory and the changeset files in it:
    // the operator has to edit one of them, and this is the shortest honest
    // path from the message to the file.
    const dir = join(workspace.rootDir, ".changeset");
    const detail = (e as Error).message.replace(/\s+/g, " ").trim();
    return {
      changesets: [],
      refusal: {
        code: "unreadable-staged",
        reason: `the changesets in ${dir} could not be read${stagedFiles(dir)}: ${detail}`,
      },
    };
  }
}

/**
 * The changeset files a directory holds, rendered for a refusal, or the empty
 * string when the listing cannot be read either. A directory listing is not a
 * parse: it only gives the operator the set of files to look at.
 */
function stagedFiles(dir: string): string {
  try {
    const files = readdirSync(dir)
      .filter((file) => file.endsWith(".md"))
      .sort();
    return files.length > 0 ? ` (the changeset files there are ${files.join(", ")})` : "";
  } catch {
    return "";
  }
}

/** Why a changeset call was refused. Every code is a named outcome. */
export type ChangesetsRefusalCode =
  | "no-workspace"
  | "no-config"
  | "invalid-config"
  | "unreadable-staged"
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
  /** The discriminant: this outcome wrote, so `written` is part of it. */
  kind: "write";
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
      kind: "write",
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
    kind: "write",
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
  const members = packages.packages.map((entry) => entry.packageJson.name);
  const root = packages.rootPackage?.packageJson.name ?? null;
  return {
    refusal: null,
    workspace: {
      rootDir: packages.rootDir,
      // The reader's `packages` view leaves the root package out of a monorepo,
      // so a set built from the members alone refuses an entry naming a package
      // the workspace plainly has. The validation set is every package the
      // reader knows about: the members plus the root.
      names: root === null ? members : [...new Set([...members, root])],
      root,
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

// ─── Release: pending entries become a version bump and a changelog ─────────

/** One pending changeset, as the release plan reports it. */
export interface PendingEntry {
  /** The changeset file's name without `.md`: the id the tool would consume. */
  id: string;
  /** The entry body: what a user of the package or product can observe. */
  summary: string;
  /** The packages and levels this one entry releases. */
  releases: Array<{ package: string; level: string }>;
}

/** One package's version bump, the old version and the new one. */
export interface PackageVersion {
  name: string;
  level: ComprehensiveRelease["type"];
  oldVersion: string;
  newVersion: string;
}

/** The changelog section one package's release adds, and the file it lands in. */
export interface ChangelogSection {
  package: string;
  /** The `CHANGELOG.md` the apply writes the section into. */
  file: string;
  /** The section text, exactly as the changelog package renders it. */
  text: string;
}

/** Why a release call was refused. Every code is a named outcome. */
export type ReleaseRefusalCode =
  /** No readable manifest or workspace, so no package can be versioned. */
  | "no-workspace"
  /** The manifest carries no version, so a plan over it is silently empty. */
  | "no-version"
  /** No `.changeset/config.json`: the repository has no changesets setup. */
  | "no-config"
  /** The config is not JSON, or not a config the schema accepts. */
  | "invalid-config"
  /** A pending changeset cannot be parsed. */
  | "unreadable-staged"
  /** A pending changeset names a package the workspace does not have. */
  | "unknown-package"
  /** Reads answered but no release came out of them: nothing pending, or all skipped. */
  | "empty-plan"
  /** The libraries could not assemble a plan from a config they accepted. */
  | "plan-failed";

/** A release refusal: the named outcome plus the reason a caller can print. */
export interface ReleaseRefusal {
  code: ReleaseRefusalCode;
  reason: string;
}

/** What a release call answers: the plan, and why there is none. */
export interface ReleaseRead {
  refusal: ReleaseRefusal | null;
  /** The pending changesets the plan consumes, in id order. */
  entries: PendingEntry[];
  /** The version each package moves to. */
  versions: PackageVersion[];
  /** The changelog section each release adds, before anything is written. */
  changelog: ChangelogSection[];
  /** Non-fatal notes from the workspace or the config read. */
  diagnostics: string[];
}

/** What an apply answers: the plan it applied, plus the files it touched. */
export interface ReleaseWrite extends ReleaseRead {
  /** Files the apply wrote: the manifests and the changelog files. */
  written: string[];
  /** The changeset files the apply consumed and removed. */
  removed: string[];
}

/**
 * Compute the release plan, writing nothing.
 *
 * The plan is the operator's view of the release: the pending entries, the
 * versions they produce, and the section each package's changelog gains. An
 * empty plan is a refusal, never a success: a manifest without a version and a
 * private package under the default config both produce one silently, so the
 * caller has to be told which of them happened.
 */
export async function planRelease(cwd: string): Promise<ReleaseRead> {
  return readOf(await resolveRelease(cwd));
}

/**
 * Apply the release: bump every manifest the plan names, insert each
 * changelog section, and remove the consumed changesets.
 *
 * The plan is recomputed here rather than passed in, so the tree the apply
 * writes is the tree it read: a caller cannot hand back a plan from before an
 * operator edited a changeset.
 */
export async function applyRelease(cwd: string): Promise<ReleaseWrite> {
  const resolved = await resolveRelease(cwd);
  if (
    resolved.refusal !== null ||
    resolved.releasePlan === null ||
    resolved.workspace === null ||
    resolved.config === null
  ) {
    return { ...readOf(resolved), written: [], removed: [] };
  }
  const touched = await applyReleasePlan(
    resolved.releasePlan,
    resolved.workspace.reader,
    resolved.config,
    undefined,
    undefined,
  );
  // One source for both answers: a file the apply reports here and the tree no
  // longer has is the changeset it consumed, and one it still has is a write.
  return {
    ...readOf(resolved),
    written: touched.filter((file) => existsSync(file)),
    removed: touched.filter((file) => !existsSync(file)),
  };
}

/** The plan-shaped half of a resolved release: what both callers report. */
function readOf(resolved: ReleaseRead): ReleaseRead {
  return {
    refusal: resolved.refusal,
    entries: resolved.entries,
    versions: resolved.versions,
    changelog: resolved.changelog,
    diagnostics: resolved.diagnostics,
  };
}

/** A resolved plan plus the state the apply reuses: the reader and the config. */
interface ResolvedRelease extends ReleaseRead {
  workspace: Workspace | null;
  config: Config | null;
  /** The library's own plan, which the apply hands straight to its writer. */
  releasePlan: ReleasePlan | null;
}

/** A release call that writes nothing, carrying the refusal and the notes. */
function refusedRelease(refusal: ReleaseRefusal, diagnostics: string[]): ResolvedRelease {
  return {
    refusal,
    workspace: null,
    config: null,
    releasePlan: null,
    entries: [],
    versions: [],
    changelog: [],
    diagnostics,
  };
}

/**
 * One of the shared reads' refusals, in the release path's own vocabulary. Every
 * code a workspace or config read answers with is in both sets, so this is a
 * carry-over rather than a reinterpretation; the type system cannot see that
 * because the authoring path has two codes the release path cannot produce.
 */
function asReleaseRefusal(refusal: ChangesetsRefusal): ReleaseRefusal {
  return { code: refusal.code as ReleaseRefusalCode, reason: refusal.reason };
}

/**
 * Resolve one release: the workspace, the config, the pending entries, the
 * plan, and the changelog sections, in that order, so a refusal writes nothing
 * and reports the first thing that stopped it.
 */
async function resolveRelease(cwd: string): Promise<ResolvedRelease> {
  const read = await readWorkspace(cwd);
  if (read.workspace === null || read.refusal !== null) {
    return refusedRelease(asReleaseRefusal(read.refusal!), read.diagnostics);
  }
  const workspace = read.workspace;

  const configRead = await readChangesetConfig(workspace);
  if (configRead.config === null || configRead.refusal !== null) {
    return refusedRelease(asReleaseRefusal(configRead.refusal!), configRead.diagnostics);
  }
  // The two forced behaviours live in one place, so the plan and the apply
  // cannot render through different configs.
  const config = releaseConfig(configRead.config);
  const diagnostics = [...configRead.diagnostics];

  const pending = await readPending(workspace);
  if (pending.refusal !== null) return refusedRelease(asReleaseRefusal(pending.refusal), diagnostics);
  if (pending.changesets.length === 0) {
    return refusedRelease(
      {
        code: "empty-plan",
        reason: `no changesets are pending in ${join(workspace.rootDir, ".changeset")}, so there is nothing to release`,
      },
      diagnostics,
    );
  }
  const unknown = unknownPackageRefusal(pending.changesets, workspace);
  if (unknown !== null) return refusedRelease(unknown, diagnostics);

  let releasePlan: ReleasePlan;
  try {
    releasePlan = assembleReleasePlan(pending.changesets, workspace.reader, config, undefined, undefined);
  } catch (e) {
    return refusedRelease(
      { code: "plan-failed", reason: `the changesets libraries could not assemble a release plan: ${oneLine(e)}` },
      diagnostics,
    );
  }
  if (releasePlan.releases.length === 0) {
    return refusedRelease(emptyPlanRefusal(releasePlan, workspace, config), diagnostics);
  }

  return {
    refusal: null,
    workspace,
    config,
    releasePlan,
    entries: releasePlan.changesets.map(pendingEntry),
    versions: releasePlan.releases.map(packageVersion),
    changelog: await changelogSections(releasePlan, workspace, config),
    diagnostics,
  };
}

/** One pending changeset as the plan reports it. */
function pendingEntry(changeset: NewChangeset): PendingEntry {
  return {
    id: changeset.id,
    summary: changeset.summary,
    releases: changeset.releases.map((release) => ({ package: release.name, level: release.type })),
  };
}

/** One release as the plan reports it. */
function packageVersion(release: ComprehensiveRelease): PackageVersion {
  return {
    name: release.name,
    level: release.type,
    oldVersion: release.oldVersion ?? "",
    newVersion: release.newVersion ?? "",
  };
}

/**
 * The repository's config with the two behaviours this package forces.
 *
 * The changelog specifier is replaced with the standalone changelog package's
 * own module, whatever the repository's config names: a config almost always
 * names `@changesets/cli/changelog`, which resolves only where the command
 * line tool is installed, and a repository using this package has not
 * installed it. Importing that tool is not an option either, because import
 * runs its command line. The repository's changelog options are kept.
 *
 * Formatting is forced off. The config's default value is `"auto"`, which
 * spawns a formatter, and a formatter that fails after the apply starts
 * writing leaves a half-applied tree: the manifests and the changelog written,
 * the changeset file still there.
 */
function releaseConfig(config: Config): Config {
  return {
    ...config,
    changelog: [changelogGitSpecifier(), config.changelog === false ? null : (config.changelog[1] ?? null)],
    format: false,
  };
}

/** The standalone changelog package, as the specifier the writer resolves. */
let changelogGitUrl: string | undefined;
function changelogGitSpecifier(): string {
  // Resolved from this module, so it answers wherever the package is
  // installed, and memoized because the resolution is a filesystem walk.
  changelogGitUrl ??= pathToFileURL(createRequire(import.meta.url).resolve("@changesets/changelog-git")).href;
  return changelogGitUrl;
}

/** The bump levels in order, the scale the dependency minimum compares on. */
const BUMP_LEVELS = ["none", "patch", "minor", "major"] as const;

/** Every package the workspace reader knows about, by name. */
function packagesByName(reader: Packages): Map<string, Package> {
  const byName = new Map<string, Package>();
  for (const pkg of reader.packages) byName.set(pkg.packageJson.name, pkg);
  return byName;
}

/**
 * The section each release adds to its package's changelog.
 *
 * The lines are the changelog package's own, and the commit each changeset was
 * added in is read the same way the writer reads it, so the plan and the apply
 * agree on the `- <sha>: ` prefix. The section assembly around those lines is
 * mirrored here because the library does not export its renderer; the fixture
 * comparison pins the result to what the apply writes.
 */
async function changelogSections(
  releasePlan: ReleasePlan,
  workspace: Workspace,
  config: Config,
): Promise<ChangelogSection[]> {
  const byName = packagesByName(workspace.reader);
  const released = releasePlan.releases.flatMap((release) => {
    const pkg = byName.get(release.name);
    return pkg === undefined ? [] : [{ ...release, packageJson: pkg.packageJson, dir: pkg.dir }];
  });
  const commits = await getCommitsThatAddFiles(
    releasePlan.changesets.map((changeset) => `.changeset/${changeset.id}.md`),
    { cwd: workspace.rootDir },
  );
  const changesets: NewChangesetWithCommit[] = releasePlan.changesets.map((changeset, index) => ({
    ...changeset,
    commit: commits[index],
  }));
  const opts = config.changelog === false ? null : (config.changelog[1] ?? null);

  const sections: ChangelogSection[] = [];
  for (const release of released) {
    const text = await changelogEntry(release, released, changesets, opts, config);
    if (text !== null) sections.push({ package: release.name, file: join(release.dir, "CHANGELOG.md"), text });
  }
  return sections;
}

/** A release plus the package it versions: what the changelog lines take. */
type ReleasedPackage = ComprehensiveRelease & Pick<Package, "packageJson" | "dir">;

/**
 * One package's changelog section, rendered as the library renders it: the
 * version heading, then one heading per level with the entry bodies as
 * bullets, then the dependency line for what the bump pulled up.
 */
async function changelogEntry(
  release: ReleasedPackage,
  releases: ReleasedPackage[],
  changesets: NewChangesetWithCommit[],
  opts: Record<string, unknown> | null,
  config: Config,
): Promise<string | null> {
  if (release.type === "none") return null;
  const lines: Record<"major" | "minor" | "patch", string[]> = { major: [], minor: [], patch: [] };
  for (const changeset of changesets) {
    const named = changeset.releases.find((other) => other.name === release.name);
    // A changeset that names the package at one level contributes one line to
    // that level's heading, whatever else the same entry releases.
    if (named !== undefined && named.type !== "none") {
      lines[named.type].push(await changelogGit.getReleaseLine(changeset, named.type, opts));
    }
  }
  const dependents = dependentReleases(release, releases, config);
  const relevant = new Set(dependents.flatMap((dependent) => dependent.changesets));
  lines.patch.push(
    await changelogGit.getDependencyReleaseLine(
      changesets.filter((changeset) => relevant.has(changeset.id)),
      dependents,
      opts,
    ),
  );

  const rendered = [
    `## ${release.newVersion}`,
    versionSection("major", lines.major),
    versionSection("minor", lines.minor),
    versionSection("patch", lines.patch),
  ].filter((line): line is string => line !== undefined);
  if (rendered.length === 1) rendered.push("No changes in this release.");
  return rendered.join("\n\n");
}

/** One level's heading and bullets, or undefined when the level is empty. */
function versionSection(level: "major" | "minor" | "patch", lines: string[]): string | undefined {
  const releaseLines = lines.filter((line) => line);
  if (releaseLines.length === 0) return undefined;
  let content = `### ${level[0].toUpperCase()}${level.slice(1)} Changes`;
  let newLines = 2;
  for (const line of releaseLines) {
    // The library keeps at most one blank line between bullets and two after
    // the heading, counting the newlines the line itself carries.
    newLines += line.match(/^\n*/)?.[0].length ?? 0;
    content += "\n".repeat(Math.min(Math.max(newLines, 1), 2)) + line.trim();
    newLines = line.match(/\n*$/)?.[0].length ?? 0;
  }
  return content;
}

/**
 * The bumped packages this release's manifest depends on.
 *
 * The library's rule is the same shape: a dependency or peer dependency whose
 * new version arrived in this release counts once its bump reaches the
 * config's minimum internal-dependency level. The out-of-range short cut and
 * the peer-dependents option are not mirrored: the default config's minimum is
 * `patch`, so every real bump clears the level and the two agree, and the
 * fixture comparison is what keeps them agreeing.
 */
function dependentReleases(
  release: ReleasedPackage,
  releases: ReleasedPackage[],
  config: Config,
): ReleasedPackage[] {
  return releases.filter((other) => {
    if (other.name === release.name || other.newVersion === undefined) return false;
    const range = release.packageJson.dependencies?.[other.name] ?? release.packageJson.peerDependencies?.[other.name];
    if (range === undefined) return false;
    return BUMP_LEVELS.indexOf(other.type) >= BUMP_LEVELS.indexOf(config.updateInternalDependencies);
  });
}

/**
 * The refusal for a pending entry naming a package the release cannot version.
 *
 * The libraries throw for this one, so it is checked first: a throw from the
 * assembly would be a crash in a tool rather than a named outcome. Two names
 * are unversionable, and they differ in what the operator can do about it: a
 * name the workspace does not have at all, and a monorepo's root package,
 * which the workspace has but a changesets setup does not release. The second
 * is how a generic entry authored against a private root ends up, so its
 * reason names the packages the release does cover.
 */
function unknownPackageRefusal(changesets: NewChangeset[], workspace: Workspace): ReleaseRefusal | null {
  const releasable = workspace.reader.packages.map((pkg) => pkg.packageJson.name);
  for (const changeset of changesets) {
    for (const release of changeset.releases) {
      if (releasable.includes(release.name)) continue;
      return {
        code: "unknown-package",
        reason: workspace.names.includes(release.name)
          ? `changeset '${changeset.id}' names '${release.name}', the workspace's root package, which a ` +
            `monorepo's changesets setup does not version: the packages it versions are ${releasable.join(", ")}`
          : `changeset '${changeset.id}' names '${release.name}', which is not a package in this workspace` +
            `: the workspace packages are ${workspace.names.join(", ")}`,
      };
    }
  }
  return null;
}

/**
 * The refusal for a plan the libraries assembled as empty.
 *
 * A manifest without a version and a private package under the default config
 * both produce this silently, so the reason names the one that happened: the
 * operator's next move differs, and a bare "empty plan" would hide a manifest
 * that cannot be versioned at all.
 */
function emptyPlanRefusal(releasePlan: ReleasePlan, workspace: Workspace, config: Config): ReleaseRefusal {
  const byName = packagesByName(workspace.reader);
  const named = [...new Set(releasePlan.changesets.flatMap((cs) => cs.releases.map((r) => r.name)))];
  const versionless = named.filter((name) => {
    const manifest = byName.get(name)?.packageJson as { version?: string } | undefined;
    return typeof manifest?.version !== "string" || manifest.version === "";
  });
  if (versionless.length > 0) {
    return {
      code: "no-version",
      reason:
        `the release plan is empty: ${versionless.join(", ")} ` +
        `${versionless.length === 1 ? "carries" : "carry"} no version field in ` +
        `${versionless.length === 1 ? "its" : "their"} package.json, so the change cannot be versioned`,
    };
  }
  const skipped = named.map((name) => {
    const manifest = byName.get(name)?.packageJson as { private?: boolean } | undefined;
    if (manifest?.private === true && !config.privatePackages.version) {
      return `${name} is private and this config does not version private packages`;
    }
    if (config.ignore.includes(name)) return `${name} is in the config's ignore list`;
    return `${name} needs no release at this level`;
  });
  return { code: "empty-plan", reason: `the release plan is empty: ${skipped.join("; ")}` };
}

/** An error's message on one line, for a refusal that has to read as one. */
function oneLine(error: unknown): string {
  const message = (error as Error)?.message ?? String(error);
  return message.replace(/\s+/g, " ").trim();
}
