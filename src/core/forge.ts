/**
 * Forge helper: detect the issue/PR provider and emit the provider-correct
 * command snippet for a requested key.
 *
 * An **epic is a milestone** (not an issue): a child PRD issue joins its epic by
 * being assigned that milestone, and slices block their PRD issue via native
 * dependencies. Three providers: `gh` (GitHub), `fgj` (Forgejo/Codeberg/Gitea,
 * routed through the bundled native REST client), and `local` (the built-in
 * tracker, for a git repo with no recognised host).
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse as parseToml } from "smol-toml";

import { NotAGitRepo, UnknownForge } from "./errors";

export { NotAGitRepo, UnknownForge };

// Keys grouped exactly as the old `forge_detect.sh keys` printed them.
export const KEY_GROUPS: ReadonlyArray<ReadonlyArray<string>> = [
  ["git_type", "owner", "repo", "auth_check"],
  ["cmd_get_issue", "cmd_create_issue", "cmd_list_issues", "cmd_comment", "cmd_close_issue"],
  ["cmd_edit_labels", "cmd_edit_issue", "cmd_create_pr", "ensure_labels"],
  ["cmd_create_milestone", "cmd_close_milestone", "cmd_add_dependency", "ownership_note"],
];
export const KEYS: ReadonlySet<string> = new Set(KEY_GROUPS.flat());

// Tracker labels provisioned idempotently by `ensure_labels` (name, hex colour).
// An epic is a *milestone*, not an issue, so there is no `epic` label.
export const LABELS: ReadonlyArray<[string, string]> = [
  ["kind:feature", "1d76db"],
  ["kind:capability", "0e8a16"],
  ["prd", "5319e7"],
  ["mode:hitl", "fbca04"],
  ["mode:afk", "c2e0c6"],
  ["status:todo", "ededed"],
  ["status:in-progress", "0052cc"],
  ["status:needs-review", "d93f0b"],
  ["status:done", "0e8a16"],
];

/**
 * Absolute command to re-invoke this very tool, computed from the running
 * artifact's own path. Embedded in every command snippet so the model runs an
 * absolute path in the Bash tool. Recomputed each run, so it survives plugin
 * updates.
 */
function computePrdTool(): string {
  const argv1 = process.argv[1];
  let real = argv1 ?? "prd-tool.js";
  try {
    if (argv1) real = realpathSync(argv1);
  } catch {
    /* keep argv1 */
  }
  return `node "${real}"`;
}

export const PRD_TOOL = computePrdTool();

export const VALID_PROVIDERS = new Set(["gh", "fgj", "local"]);

/**
 * Git / filesystem touch-points, grouped on a mutable object so tests can stub
 * them (the analogue of Python's `patch.object(forge, "_is_git_repo", ...)`).
 */
export const io = {
  isGitRepo(): boolean {
    const r = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { encoding: "utf-8" });
    if (r.error) return false;
    return r.status === 0;
  },
  remoteUrl(): string {
    const r = spawnSync("git", ["remote", "get-url", "origin"], { encoding: "utf-8" });
    if (r.error || r.stdout == null) return "";
    return r.stdout.trim();
  },
  repoRoot(): string | null {
    const r = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf-8" });
    if (r.error || r.status !== 0 || r.stdout == null) return null;
    return r.stdout.trim();
  },
};

function readPrdrc(): Record<string, string> | null {
  const root = io.repoRoot();
  if (root === null) return null;
  const rc = join(root, ".prdrc");
  if (!existsSync(rc) || !statSync(rc).isFile()) return null;
  let data: unknown;
  try {
    data = parseToml(readFileSync(rc, "utf-8"));
  } catch {
    return null;
  }
  const forgeSection = (data as Record<string, unknown>)?.["forge"];
  if (typeof forgeSection !== "object" || forgeSection === null || Array.isArray(forgeSection)) {
    return null;
  }
  const section = forgeSection as Record<string, unknown>;
  const provider = section["provider"];
  if (provider === undefined || provider === null) return null;
  if (typeof provider !== "string" || !VALID_PROVIDERS.has(provider)) return null;
  const result: Record<string, string> = { provider };
  for (const key of ["owner", "repo"]) {
    const val = section[key];
    if (typeof val === "string" && val) result[key] = val;
  }
  return result;
}

export class Forge {
  provider: string; // "gh" | "fgj" | "local"
  owner: string;
  repo: string;

  constructor(provider: string, owner: string, repo: string) {
    this.provider = provider;
    this.owner = owner;
    this.repo = repo;
  }

  pick(gh: string, fgj: string): string {
    return this.provider === "gh" ? gh : fgj;
  }
}

/**
 * Resolve the provider + owner/repo from the `origin` remote (or *remote*).
 * A `.prdrc` `[forge]` `provider` takes precedence over URL-based detection.
 */
export function detect(remote?: string): Forge {
  const rc = remote === undefined ? readPrdrc() : null;

  if (remote === undefined) {
    if (!io.isGitRepo()) throw new NotAGitRepo();
    remote = io.remoteUrl();
  }

  let ownerFromRemote: string | null = null;
  let repoFromRemote: string | null = null;
  if (remote.trim()) {
    const path = remote.endsWith(".git") ? remote.slice(0, -4) : remote;
    repoFromRemote = path.split("/").pop() ?? null;
    const rest = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : path;
    const parts = rest.split(/[:/]/);
    ownerFromRemote = parts[parts.length - 1] ?? null;
  }

  if (rc !== null) {
    return new Forge(
      rc["provider"],
      rc["owner"] || ownerFromRemote || "-",
      rc["repo"] || repoFromRemote || "-",
    );
  }

  if (!remote.trim()) {
    return new Forge("local", "-", "-");
  }
  const low = remote.toLowerCase();
  let provider: string;
  if (low.includes("github.com")) {
    provider = "gh";
  } else if (low.includes("codeberg.org") || low.includes("forgejo") || low.includes("gitea")) {
    provider = "fgj";
  } else {
    throw new UnknownForge(remote);
  }
  return new Forge(provider, ownerFromRemote || "-", repoFromRemote || "-");
}

function ensureLabelsSnippet(f: Forge): string {
  if (f.provider === "fgj") return `${PRD_TOOL} forgejo ensure-labels`;
  return LABELS.map(([name, color]) => `gh label create '${name}' --color ${color} --force`).join("\n");
}

function createMilestoneSnippet(f: Forge): string {
  if (f.provider === "gh") {
    return (
      `gh api --method POST "repos/${f.owner}/${f.repo}/milestones" ` +
      `-f title="<epic-title>" --jq .number   # prints the milestone number to record`
    );
  }
  return `${PRD_TOOL} forgejo milestone create "<epic-title>"   # prints the milestone number to record`;
}

function closeMilestoneSnippet(f: Forge): string {
  if (f.provider === "gh") {
    return `gh api --method PATCH "repos/${f.owner}/${f.repo}/milestones/<ms#>" -f state=closed`;
  }
  return `${PRD_TOOL} forgejo milestone close <ms#>`;
}

function addDependencySnippet(f: Forge): string {
  if (f.provider === "gh") {
    return [
      `blocker_id=$(gh api "repos/${f.owner}/${f.repo}/issues/<blocker#>" --jq .id)`,
      `gh api --method POST "repos/${f.owner}/${f.repo}/issues/<issue#>/dependencies/blocked_by" \\`,
      '  -H "X-GitHub-Api-Version: 2026-03-10" -F issue_id="$blocker_id"',
    ].join("\n");
  }
  return `${PRD_TOOL} forgejo dep <issue#> --blocked-by <blocker#>`;
}

function localSnippet(key: string): string {
  const t = PRD_TOOL;
  const table: Record<string, string> = {
    git_type: "local",
    owner: "-",
    repo: "-",
    auth_check: "# local tracker (docs/prd/tracker.json) — no host auth needed",
    cmd_get_issue: `${t} tracker view <n> --json`,
    cmd_create_issue:
      `${t} tracker create --title "<t>" --body-file <f> --label <l> --milestone "<M>"` +
      "   # --milestone (the epic) optional; prints the new #number to record",
    cmd_list_issues: `${t} tracker list --label <l> --json`,
    cmd_comment: `${t} tracker comment <n> --body "<text>"`,
    cmd_close_issue: `${t} tracker close <n> --comment "<text>"`,
    cmd_edit_labels: `${t} tracker edit <n> --add-label <a> --remove-label <r>`,
    cmd_edit_issue: `${t} tracker edit <n> --title "<t>" --body-file <f> --add-label <a> --remove-label <r>`,
    cmd_create_pr:
      "# No git host — there is no PR. Merge the PRD branch into main locally:\n" +
      "git checkout main\n" +
      'git merge --no-ff prd/<prd-slug> -m "Merge PRD <prd-slug> — Closes #<prd-issue>"\n' +
      "git branch -d prd/<prd-slug>",
    ensure_labels: `${t} tracker ensure-labels   # labels are freeform; just initialises the store`,
    cmd_create_milestone: `${t} tracker milestone create "<epic-title>"   # prints the milestone number to record`,
    cmd_close_milestone: `${t} tracker milestone close <ms#>`,
    cmd_add_dependency: `${t} tracker dep <issue#> --blocked-by <blocker#>`,
    ownership_note:
      "Local tracker (docs/prd/tracker.json): an epic is a milestone (tracker milestone); a PRD " +
      "issue joins it via `tracker create --milestone`; slices block the PRD via blocked_by edges " +
      "(tracker dep). Same branch workflow (prd/<slug>, slice/<n>-<slug>), no remote — PRD branch " +
      "merges into main locally at finalize.",
  };
  return table[key];
}

function snippet(f: Forge, key: string): string {
  if (f.provider === "local") return localSnippet(key);
  const p = (gh: string, fgj: string) => f.pick(gh, fgj);
  switch (key) {
    case "git_type":
      return f.provider;
    case "owner":
      return f.owner;
    case "repo":
      return f.repo;
    case "auth_check":
      return p("gh auth status", `${PRD_TOOL} forgejo auth-check`);
    case "cmd_get_issue":
      return p(
        "gh issue view <n> --json number,title,body,labels,state",
        `${PRD_TOOL} forgejo view <n> --json`,
      );
    case "cmd_create_issue":
      return p(
        'gh issue create --title "<t>" --body-file <f> --label <l> --milestone "<M>"',
        `${PRD_TOOL} forgejo create --title "<t>" --body-file <f> --label <l> --milestone "<M>"`,
      );
    case "cmd_list_issues":
      return p(
        "gh issue list --label <l> --json number,title,state",
        `${PRD_TOOL} forgejo list --label <l> --json`,
      );
    case "cmd_comment":
      return p('gh issue comment <n> --body "<text>"', `${PRD_TOOL} forgejo comment <n> --body "<text>"`);
    case "cmd_close_issue":
      return p('gh issue close <n> --comment "<text>"', `${PRD_TOOL} forgejo close <n> --comment "<text>"`);
    case "cmd_edit_labels":
      return p(
        "gh issue edit <n> --add-label <a> --remove-label <r>",
        `${PRD_TOOL} forgejo edit <n> --add-label <a> --remove-label <r>`,
      );
    case "cmd_edit_issue":
      return p(
        'gh issue edit <n> --title "<t>" --body-file <f> --add-label <a> --remove-label <r>',
        `${PRD_TOOL} forgejo edit <n> --title "<t>" --body-file <f> --add-label <a> --remove-label <r>`,
      );
    case "cmd_create_pr":
      return p(
        'gh pr create --base main --head <branch> --title "<t>" --body-file <f>',
        `${PRD_TOOL} forgejo create-pr --base main --head <branch> --title "<t>" --body-file <f>`,
      );
    case "ensure_labels":
      return ensureLabelsSnippet(f);
    case "cmd_create_milestone":
      return createMilestoneSnippet(f);
    case "cmd_close_milestone":
      return closeMilestoneSnippet(f);
    case "cmd_add_dependency":
      return addDependencySnippet(f);
    case "ownership_note":
      return p(
        "GitHub: an epic is a milestone; each child PRD issue joins it via " +
          "`gh issue create --milestone`; slices block their PRD issue via native dependencies " +
          "(gh api). No epic issue, no sub-issues.",
        "Forgejo: an epic is a native milestone; each child PRD issue joins it via " +
          "`forgejo create --milestone`; slices block their PRD issue via native dependencies. " +
          "No epic issue, no sub-issues. All ops go through `prd_tool forgejo` (REST API) — the " +
          "fgj CLI isn't used.",
      );
    default:
      throw new Error(`KeyError: ${key}`);
  }
}

export function keysListing(): string {
  return KEY_GROUPS.map((group) => group.join(" ")).join("\n");
}

/** Return `[text, exitCode]` for *key*. */
export function render(key: string): [string, number] {
  if (key === "keys") return [keysListing(), 0];
  if (!KEYS.has(key)) return [`unknown key '${key}' — run 'forge keys' for the list`, 65];
  let f: Forge;
  try {
    f = detect();
  } catch (e) {
    if (e instanceof NotAGitRepo) {
      return [
        "NOT_A_GIT_REPO: this directory is not a git repository. " +
          "Initialise one with `git init` before running the prd-workflow.",
        1,
      ];
    }
    if (e instanceof UnknownForge) {
      return [
        `UNKNOWN_FORGE: cannot tell provider from remote '${e.remote}' — ` +
          "ask the user which CLI to use.",
        0,
      ];
    }
    throw e;
  }
  return [snippet(f, key), 0];
}
