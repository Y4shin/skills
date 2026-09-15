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
export function readGateConfig(
  cwd: string,
  deps: ReadGateConfigDeps = {},
): GateConfig {
  const diagnostics: string[] = [];
  const readFile = deps.readFileSync ?? readFileSync;
  const exists = deps.existsSync ?? existsSync;

  const globalPath =
    deps.globalSettingsPath ??
    join(
      process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent"),
      "settings.json",
    );

  const root = walkToGitRoot(cwd, { existsSync: exists });
  const projectPath = deps.projectSettingsPath ?? join(root ?? cwd, ".pi", "settings.json");

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
        `invalid regex skipped: "${pattern}" — ${(e as Error).message}`,
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
        `invalid regex skipped: "${pattern}" — ${(e as Error).message}`,
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
