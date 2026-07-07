/**
 * Forge detection: identify the issue tracker provider from the `origin` remote
 * and emit provider-correct command snippets.
 *
 * Three providers:
 *   gh    — GitHub (via the `gh` CLI)
 *   fgj   — Forgejo/Codeberg/Gitea (via bundled REST client)
 *   local — built-in file-based tracker (no remote)
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse as parseToml } from "smol-toml";

import { NotAGitRepo, UnknownForge } from "./errors.js";

export { NotAGitRepo, UnknownForge };

export const VALID_PROVIDERS = new Set(["gh", "fgj", "local"]);

/** Git/filesystem touch-points (testable via mutation). */
export const io = {
  isGitRepo(): boolean {
    const r = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { encoding: "utf-8" });
    return !r.error && r.status === 0;
  },
  remoteUrl(): string {
    const r = spawnSync("git", ["remote", "get-url", "origin"], { encoding: "utf-8" });
    return r.error || r.stdout == null ? "" : r.stdout.trim();
  },
  repoRoot(): string | null {
    const r = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf-8" });
    return r.error || r.status !== 0 || r.stdout == null ? null : r.stdout.trim();
  },
};

function readPrdrc(): Record<string, string> | null {
  const root = io.repoRoot();
  if (root === null) return null;
  const rc = join(root, ".prdrc");
  if (!existsSync(rc) || !statSync(rc).isFile()) return null;
  try {
    const data = parseToml(readFileSync(rc, "utf-8")) as Record<string, unknown>;
    const forge = data?.["forge"] as Record<string, unknown> | undefined;
    if (!forge || typeof forge !== "object") return null;
    const provider = forge["provider"];
    if (typeof provider !== "string" || !VALID_PROVIDERS.has(provider)) return null;
    return {
      provider,
      owner: (typeof forge["owner"] === "string" ? forge["owner"] : undefined) ?? "",
      repo: (typeof forge["repo"] === "string" ? forge["repo"] : undefined) ?? "",
    };
  } catch {
    return null;
  }
}

export class Forge {
  provider: string;
  owner: string;
  repo: string;

  constructor(provider: string, owner: string, repo: string) {
    this.provider = provider;
    this.owner = owner;
    this.repo = repo;
  }

  pick<T>(gh: T, fgj: T): T {
    return this.provider === "gh" ? gh : fgj;
  }
}

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

  if (!remote.trim()) return new Forge("local", "-", "-");

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

/** Labels provisioned idempotently. */
export const LABELS: ReadonlyArray<[string, string]> = [
  ["prd", "5319e7"],
  ["kind:prd", "1d76db"],
  ["mode:hitl", "fbca04"],
  ["mode:afk", "c2e0c6"],
  ["status:todo", "ededed"],
  ["status:in-progress", "0052cc"],
  ["status:done", "0e8a16"],
];

export function forgeSnippet(f: Forge, key: string): string {
  if (key === "git_type") return f.provider;
  if (key === "owner") return f.owner;
  if (key === "repo") return f.repo;
  if (key === "auth_check") return f.pick("gh auth status", "forgejo auth-check");
  if (key === "ownership_note") {
    return f.pick(
      "GitHub: an epic is a milestone; child PRD issues join it via `gh issue create --milestone`; slices block their PRD issue via native dependencies.",
      "Forgejo: an epic is a milestone; child PRD issues join it via `forgejo create --milestone`; slices block via native dependencies.",
    );
  }
  if (key === "ensure_labels") {
    if (f.provider === "fgj") return `prd-tool forgejo ensure-labels --owner ${f.owner} --repo ${f.repo}`;
    return LABELS.map(([n, c]) => `gh label create '${n}' --color ${c} --force`).join("\n");
  }

  const ghCmd = ghSnippet(key);
  const fgjCmd = fgjSnippet(key);
  const localCmd = localSnippet(key);

  if (f.provider === "local") return localCmd;
  return f.pick(ghCmd, fgjCmd);
}

function ghSnippet(key: string): string {
  const table: Record<string, string> = {
    cmd_get_issue: "gh issue view <n> --json number,title,body,labels,state",
    cmd_create_issue: `gh issue create --title "<t>" --body-file <f> --label <l> --milestone "<M>"`,
    cmd_list_issues: "gh issue list --label <l> --json number,title,state",
    cmd_comment: `gh issue comment <n> --body "<text>"`,
    cmd_close_issue: `gh issue close <n> --comment "<text>"`,
    cmd_edit_labels: "gh issue edit <n> --add-label <a> --remove-label <r>",
    cmd_edit_issue: `gh issue edit <n> --title "<t>" --body-file <f> --add-label <a> --remove-label <r>`,
    cmd_create_pr: `gh pr create --base main --head <branch> --title "<t>" --body-file <f>`,
    cmd_create_milestone: `gh api --method POST "repos/${placeholderOwner()}/${placeholderRepo()}/milestones" -f title="<epic-title>" --jq .number`,
    cmd_close_milestone: `gh api --method PATCH "repos/${placeholderOwner()}/${placeholderRepo()}/milestones/<ms#>" -f state=closed`,
    cmd_add_dependency: [
      `blocker_id=$(gh api "repos/${placeholderOwner()}/${placeholderRepo()}/issues/<blocker#>" --jq .id)`,
      `gh api --method POST "repos/${placeholderOwner()}/${placeholderRepo()}/issues/<issue#>/dependencies/blocked_by" -H "X-GitHub-Api-Version: 2026-03-10" -F issue_id="$blocker_id"`,
    ].join("\n"),
  };
  return table[key] ?? `unknown key '${key}'`;
}

function fgjSnippet(key: string): string {
  const table: Record<string, string> = {
    cmd_get_issue: `prd-tool forgejo view <n> --json`,
    cmd_create_issue: `prd-tool forgejo create --title "<t>" --body-file <f> --label <l> --milestone "<M>"`,
    cmd_list_issues: `prd-tool forgejo list --label <l> --json`,
    cmd_comment: `prd-tool forgejo comment <n> --body "<text>"`,
    cmd_close_issue: `prd-tool forgejo close <n> --comment "<text>"`,
    cmd_edit_labels: `prd-tool forgejo edit <n> --add-label <a> --remove-label <r>`,
    cmd_edit_issue: `prd-tool forgejo edit <n> --title "<t>" --body-file <f> --add-label <a> --remove-label <r>`,
    cmd_create_pr: `prd-tool forgejo create-pr --base main --head <branch> --title "<t>" --body-file <f>`,
    cmd_create_milestone: `prd-tool forgejo milestone create "<epic-title>"`,
    cmd_close_milestone: `prd-tool forgejo milestone close <ms#>`,
    cmd_add_dependency: `prd-tool forgejo dep <issue#> --blocked-by <blocker#>`,
  };
  return table[key] ?? `unknown key '${key}'`;
}

function localSnippet(key: string): string {
  const t = "prd-tool";
  const table: Record<string, string> = {
    cmd_get_issue: `${t} tracker view <n> --json`,
    cmd_create_issue: `${t} tracker create --title "<t>" --body-file <f> --label <l> --milestone "<M>"`,
    cmd_list_issues: `${t} tracker list --label <l> --json`,
    cmd_comment: `${t} tracker comment <n> --body "<text>"`,
    cmd_close_issue: `${t} tracker close <n> --comment "<text>"`,
    cmd_edit_labels: `${t} tracker edit <n> --add-label <a> --remove-label <r>`,
    cmd_edit_issue: `${t} tracker edit <n> --title "<t>" --body-file <f> --add-label <a> --remove-label <r>`,
    cmd_create_pr: "git checkout main\ngit merge --no-ff prd/<prd-slug> -m \"Merge PRD <prd-slug> — Closes #<prd-issue>\"\ngit branch -d prd/<prd-slug>",
    ensure_labels: `${t} tracker ensure-labels`,
    cmd_create_milestone: `${t} tracker milestone create "<epic-title>"`,
    cmd_close_milestone: `${t} tracker milestone close <ms#>`,
    cmd_add_dependency: `${t} tracker dep <issue#> --blocked-by <blocker#>`,
    ownership_note: "Local tracker (docs/prd/tracker.json): an epic is a milestone; a PRD issue joins it via --milestone; slices block the PRD via blocked_by edges. Same branch workflow, no remote.",
  };
  return table[key] ?? `unknown key '${key}'`;
}

function placeholderOwner(): string {
  try {
    const f = detect();
    return f.owner !== "-" ? f.owner : "OWNER";
  } catch {
    return "OWNER";
  }
}

function placeholderRepo(): string {
  try {
    const f = detect();
    return f.repo !== "-" ? f.repo : "REPO";
  } catch {
    return "REPO";
  }
}