/**
 * Repo-gate detection core.
 *
 * Pure module that decides whether the current repository is a "work" repo
 * (gate active) or a "personal" repo (gate inactive) based on the remote
 * origin and configured disableOnRepo patterns.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve as resolvePath } from "node:path";
import { execSync } from "node:child_process";

export interface GateResult {
  active: boolean;
  reason: string;
  diagnostics?: string[];
}

export interface WalkDeps {
  existsSync?: (p: string) => boolean;
}

export interface ReadOriginDeps extends WalkDeps {
  isDir?: (p: string) => boolean;
  readFileSync?: (p: string, encoding: "utf-8") => string;
  execSync?: (command: string, options?: { cwd?: string; encoding?: "utf-8" }) => string;
}

export interface GateConfig {
  disableOnRepo: string[];
  /**
   * Local enable override. `true` forces the package on, `false` forces it
   * off, and `undefined` means no local override, fall back to disableOnRepo
   * patterns. Only read from the project settings file; a global `enable` is
   * ignored (the global side configures patterns, not a default switch).
   */
  enable?: boolean;
  diagnostics: string[];
}

export interface ReadGateConfigDeps extends WalkDeps {
  globalSettingsPath?: string;
  projectSettingsPath?: string;
  readFileSync?: (p: string, encoding: "utf-8") => string;
}

export interface ResolveGateDeps extends ReadOriginDeps, ReadGateConfigDeps {}

export interface ResolveGateResult extends GateResult {
  diagnostics: string[];
}

/**
 * The trunk a repository configures. `develop` is the one key that says both
 * whether there is a develop branch and what it is called: `false` means the
 * repository has no develop branch, a string is that branch's name. The
 * resolved trunk is `trunkName()` below.
 */
export interface TrunkSettings {
  develop: false | string;
  main: string;
}

/** The normalized `taskWorkflow.git` block plus the diagnostics reading it produced. */
export interface GitSettings {
  profile: string;
  trunk: TrunkSettings;
  trunkMerge: TrunkMergeMode;
  diagnostics: string[];
}

/** How close-out lands the effort branch: locally, or as a pull-request handoff. */
export const TRUNK_MERGE_MODES = ["local", "handoff"] as const;
export type TrunkMergeMode = (typeof TRUNK_MERGE_MODES)[number];

/**
 * The built-in git settings, read last: a repository that configures nothing
 * runs `default` on a single `main` trunk that close-out merges into locally.
 */
export const GIT_SETTINGS_DEFAULTS: Omit<GitSettings, "diagnostics"> = {
  profile: "default",
  trunk: { develop: false, main: "main" },
  trunkMerge: "local",
};

/**
 * The branch the effort branch is created off and merged back into: the
 * develop branch when the repository has one, the main branch otherwise.
 */
export function trunkName(trunk: TrunkSettings): string {
  return trunk.develop === false ? trunk.main : trunk.develop;
}

/** Cache origin URL lookups per repo root for the process lifetime. */
const originCache = new Map<string, string | null>();

/**
 * Walk up from `start` to the first directory containing `.git`.
 * Returns the repo root path, or null if no `.git` is found.
 */
export function walkToGitRoot(
  start: string,
  deps: WalkDeps = {},
): string | null {
  const exists = deps.existsSync ?? existsSync;
  let dir = resolvePath(start);
  while (true) {
    if (exists(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Normalize a git remote URL to a lowercased `host/org/repo` string.
 *
 * Handles:
 * - SSH:  git@github.com:QNCGmbH/openai.git
 * - HTTPS: https://github.com/QNCGmbH/openai.git
 * - SSH with scheme and port: ssh://git@github.com:22/QNCGmbH/x.git
 * - URLs without `.git`
 * - Uppercase hosts
 */
export function normalizeRemote(origin: string): string {
  let rest = origin.trim();

  // Strip scheme:// (e.g. https://, ssh://)
  const schemeIdx = rest.indexOf("://");
  if (schemeIdx !== -1) {
    rest = rest.slice(schemeIdx + 3);
  }

  // Strip user@ prefix
  const atIdx = rest.indexOf("@");
  if (atIdx !== -1) {
    rest = rest.slice(atIdx + 1);
  }

  // Strip port if present (host:port/...). A port is digits only.
  const firstSlash = rest.indexOf("/");
  const portColon = rest.indexOf(":");
  if (
    portColon !== -1 &&
    (firstSlash === -1 || portColon < firstSlash)
  ) {
    const afterColon =
      firstSlash === -1 ? rest.slice(portColon + 1) : rest.slice(portColon + 1, firstSlash);
    if (/^\d+$/.test(afterColon)) {
      rest = rest.slice(0, portColon) + (firstSlash === -1 ? "" : rest.slice(firstSlash));
    }
  }

  // Collapse host:path colon (SSH form) to host/path
  const colonIdx = rest.indexOf(":");
  if (colonIdx !== -1) {
    rest = rest.slice(0, colonIdx) + "/" + rest.slice(colonIdx + 1);
  }

  // Strip trailing .git and trailing slashes
  rest = rest.replace(/\.git$/i, "").replace(/\/$/, "");

  // Lowercase host only (first segment)
  const parts = rest.split("/");
  if (parts.length > 0) {
    parts[0] = parts[0].toLowerCase();
  }
  return parts.join("/");
}

/**
 * Read the `origin` remote URL for the repository containing `cwd`.
 *
 * - Walks up to `.git`.
 * - If `.git` is a directory, parses `.git/config` for `[remote "origin"]`.
 * - If `.git` is a gitfile, falls back to `git remote get-url origin`
 *   (not implemented in this slice).
 * - Caches results per repo root.
 * - Returns null if no `.git` or no origin remote.
 */
export function readOriginRemote(
  cwd: string,
  deps: ReadOriginDeps = {},
): string | null {
  const root = walkToGitRoot(cwd, deps);
  if (!root) return null;

  // Avoid cache pollution when callers inject test seams.
  const hasCustomDeps =
    deps.existsSync !== undefined ||
    deps.isDir !== undefined ||
    deps.readFileSync !== undefined ||
    deps.execSync !== undefined;

  if (!hasCustomDeps) {
    const cached = originCache.get(root);
    if (cached !== undefined) return cached;
  }

  const exists = deps.existsSync ?? existsSync;
  const gitPath = join(root, ".git");
  const isDirectory = deps.isDir ?? ((p: string) => statSync(p).isDirectory());

  let origin: string | null = null;

  if (isDirectory(gitPath)) {
    const read = deps.readFileSync ?? readFileSync;
    origin = parseOriginFromConfig(join(gitPath, "config"), read);
  } else {
    // Git worktree: .git is a file pointing elsewhere. Fall back to git CLI.
    const run =
      deps.execSync ??
      ((cmd, opts) =>
        execSync(cmd, opts as Parameters<typeof execSync>[1]) as string);
    origin = readOriginFromGitCli(root, run);
  }

  if (!hasCustomDeps) {
    originCache.set(root, origin);
  }
  return origin;
}

function readOriginFromGitCli(
  root: string,
  execSyncImpl: (command: string, options?: { cwd?: string; encoding?: "utf-8" }) => string,
): string | null {
  try {
    const out = execSyncImpl("git remote get-url origin", {
      cwd: root,
      encoding: "utf-8",
    });
    const url = out.trim();
    return url.length > 0 ? url : null;
  } catch {
    return null;
  }
}

function parseOriginFromConfig(
  configPath: string,
  readFileSyncImpl: (p: string, encoding: "utf-8") => string,
): string | null {
  try {
    const text = readFileSyncImpl(configPath, "utf-8");
    const lines = text.split(/\r?\n/);
    let inOrigin = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '[remote "origin"]') {
        inOrigin = true;
        continue;
      }
      if (inOrigin) {
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          // Moved into a new section without finding url
          break;
        }
        const urlMatch = trimmed.match(/^url\s*=\s*(.+)$/);
        if (urlMatch) {
          return urlMatch[1].trim();
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Read gate configuration from global and project settings files.
 *
 * Reads:
 *   global:  $PI_CODING_AGENT_DIR/settings.json  or  ~/.pi/agent/settings.json
 *   project: <repo-root>/.pi/settings.json
 *
 * disableOnRepo patterns are read from the global file only. The local enable
 * override (force-on / force-off) is read from the project file only. Missing
 * or unreadable files are treated as empty (fail-open). The returned
 * `diagnostics` array records malformed JSON or invalid shape, but this
 * function never throws.
 */
/**
 * The two settings paths every reader uses: the global file beside the agent
 * dir, and the project file under the repository root. One resolution, so the
 * repo gate and the git settings block can never disagree on where settings
 * live.
 */
function settingsPaths(
  cwd: string,
  deps: ReadGateConfigDeps,
  exists: (p: string) => boolean,
): { globalPath: string; projectPath: string } {
  const globalPath =
    deps.globalSettingsPath ??
    join(
      process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent"),
      "settings.json",
    );
  const root = walkToGitRoot(cwd, { existsSync: exists });
  const projectPath = deps.projectSettingsPath ?? join(root ?? cwd, ".pi", "settings.json");
  return { globalPath, projectPath };
}

export function readGateConfig(
  cwd: string,
  deps: ReadGateConfigDeps = {},
): GateConfig {
  const diagnostics: string[] = [];
  const readFile = deps.readFileSync ?? readFileSync;
  const exists = deps.existsSync ?? existsSync;

  const { globalPath, projectPath } = settingsPaths(cwd, deps, exists);

  const globalSettings = readSettingsJson(globalPath, readFile, diagnostics);
  const projectSettings = readSettingsJson(projectPath, readFile, diagnostics);

  const globalTaskWorkflow = getTaskWorkflow(globalSettings);
  const projectTaskWorkflow = getTaskWorkflow(projectSettings);

  // disableOnRepo is global-only (patterns live on the personal/global side).
  // enable is project-only (a local override of the global pattern verdict).
  let disableOnRepo: string[] = [];
  if (globalTaskWorkflow && "disableOnRepo" in globalTaskWorkflow) {
    const value = globalTaskWorkflow.disableOnRepo;
    if (Array.isArray(value)) {
      disableOnRepo = validateRegexArray(value, diagnostics);
    } else {
      diagnostics.push(
        `taskWorkflow.disableOnRepo is not an array in global settings, using []`,
      );
    }
  }

  let enable: boolean | undefined;
  if (projectTaskWorkflow && "enable" in projectTaskWorkflow) {
    const value = projectTaskWorkflow.enable;
    if (typeof value === "boolean") {
      enable = value;
    } else {
      diagnostics.push(
        `taskWorkflow.enable is not a boolean in project settings, ignoring`,
      );
    }
  }

  return { disableOnRepo, enable, diagnostics };
}

/**
 * Read the `taskWorkflow.git` block from the global and project settings.
 *
 * The project file overrides the global file key by key (trunk merges per
 * branch name as well), and the built-in defaults come last. An unknown value
 * for any key is a diagnostic that falls back to the default, so a repository
 * with a typo runs the documented behaviour instead of crashing. Never throws.
 */
export function readGitSettings(
  cwd: string,
  deps: ReadGateConfigDeps = {},
): GitSettings {
  const diagnostics: string[] = [];
  const readFile = deps.readFileSync ?? readFileSync;
  const exists = deps.existsSync ?? existsSync;
  const { globalPath, projectPath } = settingsPaths(cwd, deps, exists);

  const globalGit = gitBlockOf(readSettingsJson(globalPath, readFile, diagnostics), "global", diagnostics);
  const projectGit = gitBlockOf(readSettingsJson(projectPath, readFile, diagnostics), "project", diagnostics);

  const profile = pickSetting({
    key: "profile",
    path: "profile",
    project: projectGit,
    global: globalGit,
    fallback: GIT_SETTINGS_DEFAULTS.profile,
    valid: (value) => (typeof value === "string" && value.trim() !== "" ? value.trim() : null),
    diagnostics,
  });

  const trunkMerge = pickSetting({
    key: "trunkMerge",
    path: "trunkMerge",
    project: projectGit,
    global: globalGit,
    fallback: GIT_SETTINGS_DEFAULTS.trunkMerge,
    valid: (value) =>
      typeof value === "string" && (TRUNK_MERGE_MODES as readonly string[]).includes(value)
        ? (value as TrunkMergeMode)
        : null,
    diagnostics,
  });

  const projectTrunk = trunkBlockOf(projectGit.trunk, "project", diagnostics);
  const globalTrunk = trunkBlockOf(globalGit.trunk, "global", diagnostics);
  const trunk: TrunkSettings = {
    develop: pickSetting({
      key: "develop",
      path: "trunk.develop",
      project: projectTrunk,
      global: globalTrunk,
      fallback: GIT_SETTINGS_DEFAULTS.trunk.develop,
      // `false` means no develop branch; a non-empty string is that branch's
      // name. `true`, an empty string, or any other type is a diagnostic.
      valid: (value) =>
        value === false ? false : typeof value === "string" && value.trim() !== "" ? value.trim() : null,
      diagnostics,
    }),
    main: pickSetting({
      key: "main",
      path: "trunk.main",
      project: projectTrunk,
      global: globalTrunk,
      fallback: GIT_SETTINGS_DEFAULTS.trunk.main,
      valid: (value) => (typeof value === "string" && value.trim() !== "" ? value.trim() : null),
      diagnostics,
    }),
  };

  return { profile, trunk, trunkMerge, diagnostics };
}

/**
 * The `git` block of one settings file, or an empty block. A `git` key that is
 * not an object is a diagnostic, not a crash: the block reads as absent.
 */
function gitBlockOf(
  settings: Record<string, unknown> | null,
  scope: "global" | "project",
  diagnostics: string[],
): Record<string, unknown> {
  const taskWorkflow = getTaskWorkflow(settings);
  if (!taskWorkflow || !("git" in taskWorkflow)) return {};
  const git = taskWorkflow.git;
  if (git && typeof git === "object" && !Array.isArray(git)) return git as Record<string, unknown>;
  diagnostics.push(`taskWorkflow.git is not an object in ${scope} settings, using defaults`);
  return {};
}

/** One trunk block of one settings file, or an empty block. */
function trunkBlockOf(
  raw: unknown,
  scope: "global" | "project",
  diagnostics: string[],
): Record<string, unknown> {
  if (raw === undefined) return {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  diagnostics.push(`taskWorkflow.git.trunk is not an object in ${scope} settings, using defaults`);
  return {};
}

/**
 * One settings key, project over global over the built-in default. The first
 * scope that carries the key decides: a valid value wins, an invalid one is a
 * diagnostic and the built-in default, exactly as the repo gate treats a
 * malformed pattern list.
 */
function pickSetting<T>(o: {
  key: string;
  path: string;
  project: Record<string, unknown>;
  global: Record<string, unknown>;
  fallback: T;
  valid: (value: unknown) => T | null;
  diagnostics: string[];
}): T {
  const scopes: Array<["project" | "global", Record<string, unknown>]> = [
    ["project", o.project],
    ["global", o.global],
  ];
  for (const [scope, block] of scopes) {
    if (!(o.key in block)) continue;
    const value = o.valid(block[o.key]);
    if (value !== null) return value;
    o.diagnostics.push(
      `taskWorkflow.git.${o.path} has an unknown value ${JSON.stringify(block[o.key])} in ${scope} settings, ` +
        `using ${JSON.stringify(o.fallback)}`,
    );
    return o.fallback;
  }
  return o.fallback;
}

function readSettingsJson(
  path: string,
  readFile: (p: string, encoding: "utf-8") => string,
  diagnostics: string[],
): Record<string, unknown> | null {
  try {
    const content = readFile(path, "utf-8");
    return JSON.parse(content) as Record<string, unknown>;
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      diagnostics.push(`failed to read settings ${path}: ${(e as Error).message}`);
    }
    return null;
  }
}

function getTaskWorkflow(
  settings: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!settings) return null;
  const taskWorkflow = settings.taskWorkflow;
  if (taskWorkflow && typeof taskWorkflow === "object" && !Array.isArray(taskWorkflow)) {
    return taskWorkflow as Record<string, unknown>;
  }
  return null;
}

function validateRegexArray(
  patterns: unknown[],
  diagnostics: string[],
): string[] {
  const valid: string[] = [];
  for (const pattern of patterns) {
    if (typeof pattern !== "string") {
      diagnostics.push(`non-string disableOnRepo entry skipped: ${JSON.stringify(pattern)}`);
      continue;
    }
    try {
      new RegExp(pattern);
      valid.push(pattern);
    } catch (e) {
      diagnostics.push(
        `invalid regex skipped: "${pattern}": ${(e as Error).message}`,
      );
    }
  }
  return valid;
}

/**
 * Convenience entry point: read origin and config, then apply the gate
 * truth table.
 *
 * Returns `{ active, reason, diagnostics }`, merging any config diagnostics
 * with diagnostics from `isWorkRepo`. Never throws.
 */
export function resolveGate(
  cwd: string,
  deps: ResolveGateDeps = {},
): ResolveGateResult {
  const origin = readOriginRemote(cwd, deps);
  const config = readGateConfig(cwd, deps);
  const decision = isWorkRepo(origin, config.disableOnRepo, config.enable);
  const diagnostics = [
    ...(config.diagnostics ?? []),
    ...(decision.diagnostics ?? []),
  ];
  return {
    active: decision.active,
    reason: decision.reason,
    diagnostics,
  };
}

/**
 * Decide whether the gate is active for the given normalized origin,
 * disableOnRepo patterns, and local enable override.
 *
 * `enable` is authoritative and means what it says:
 *   - `true`  -> gate inactive (package forced on), patterns ignored
 *   - `false` -> gate active (package forced off), patterns ignored
 *   - undefined -> fall back to disableOnRepo patterns: a match gates the
 *     repo (work repo), a non-match loads it (personal repo).
 *
 * Truth table:
 *
 * | enable     | patterns match | active | meaning                       |
 * | ---------- | ------------- | ------ | ----------------------------- |
 * | true       | *             | false  | forced on locally             |
 * | false      | *             | true   | forced off locally            |
 * | undefined  | yes           | true   | work repo (auto-gated)        |
 * | undefined  | no            | false  | personal repo (auto-loaded)  |
 * | undefined  | (empty)       | false  | gate disabled globally        |
 */
export function isWorkRepo(
  origin: string | null,
  patterns: string[],
  enable?: boolean,
): GateResult {
  if (enable === true) {
    return { active: false, reason: "forced on locally (project.enable=true)" };
  }
  if (enable === false) {
    return { active: true, reason: "forced off locally (project.enable=false)" };
  }

  if (patterns.length === 0) {
    return { active: false, reason: "no disableOnRepo patterns" };
  }

  const diagnostics: string[] = [];
  let normalized: string | null = null;
  if (origin && origin.trim().length > 0) {
    normalized = normalizeRemote(origin);
  }

  let matches = false;
  for (const pattern of patterns) {
    try {
      const re = new RegExp(pattern);
      if (normalized !== null && re.test(normalized)) {
        matches = true;
        break;
      }
    } catch (e) {
      diagnostics.push(
        `invalid regex skipped: "${pattern}": ${(e as Error).message}`,
      );
    }
  }

  if (matches) {
    return {
      active: true,
      reason: "work repo matched disableOnRepo pattern",
      diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    };
  }

  return {
    active: false,
    reason: "personal repo (no disableOnRepo match)",
    diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
  };
}
