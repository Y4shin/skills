/**
 * Minimal CLI for prd-workflow context injection in opencode command headers.
 *
 * Subcommands:
 *   workflow-gate    — check if docs/prd/ exists
 *   list [--kind]    — list artifacts
 *   reference        — print artifact schema reference
 *   profile          — print project profile
 *   forge <key>      — provider-specific command snippets
 *   forgejo <cmd>... — Forgejo REST operations
 *
 * All artifact CRUD operations go through the native prd_* tools registered
 * by the pi extension or opencode plugin.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { discoverAll, discoverEpics, discoverPrds, findRoot, isInitialized } from "./core/model.js";
import { forgeSnippet, detect as detectForge, NotAGitRepo, UnknownForge } from "./core/forge.js";
import { profileText } from "./core/index.js";
import { Client as ForgejoClient, ForgejoError } from "./core/forgejo.js";

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: prd-tool <subcommand> [args...]");
    console.error("Subcommands: workflow-gate, list, reference, profile, forge <key>, forgejo <cmd>");
    process.exit(1);
  }

  const cmd = args[0];
  const cwd = process.cwd();

  try {
    switch (cmd) {
      case "workflow-gate":    return workflowGate(cwd);
      case "list":             return listArtifacts(cwd, args.slice(1));
      case "reference":        return printReference();
      case "profile":          return printProfile(cwd);
      case "forge":            return forgeSnippetCmd(args[1] ?? "");
      case "forgejo":          return forgejoCmd(args.slice(1));
      default:
        console.error(`Unknown command: ${cmd}`);
        process.exit(1);
    }
  } catch (e) {
    console.error(String(e instanceof Error ? e.message : String(e)));
    process.exit(1);
  }
}

function workflowGate(cwd: string): void {
  const root = findRoot(cwd);
  if (isInitialized(root)) process.exit(0);
  console.log("> [!STOP] prd-workflow not initialized.\n> Run `/init-prd-workflow` first.");
  process.exit(1);
}

function listArtifacts(cwd: string, extra: string[]): void {
  const root = findRoot(cwd);
  const kindIdx = extra.indexOf("--kind");
  const kind = kindIdx >= 0 && kindIdx + 1 < extra.length ? extra[kindIdx + 1] : null;
  const json = extra.includes("--json");

  let artifacts = kind === "epic" ? discoverEpics(root) : kind === "prd" ? discoverPrds(root) : discoverAll(root);

  if (json) {
    console.log(JSON.stringify(artifacts.map(a => ({
      path: a.path, kind: a.kind, slug: a.slug, status: a.status,
      issue: a.issue, milestone: a.milestone,
    })), null, 2));
    return;
  }

  for (const a of artifacts) {
    const status = a.status ? ` [${a.status}]` : "";
    const issue = a.issue !== null ? ` #${a.issue}` : "";
    const ms = a.milestone !== null ? ` M${a.milestone}` : "";
    console.log(`${a.slug} (${a.kind})${status}${issue}${ms} — ${a.path}`);
  }
}

function printReference(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const paths = [
    join(process.cwd(), "docs", "artifacts.md"),
    join(here, "..", "docs", "artifacts.md"),
    join(here, "..", "..", "docs", "artifacts.md"),
  ];
  for (const p of paths) {
    if (existsSync(p)) { console.log(readFileSync(p, "utf-8").trimEnd()); return; }
  }
  console.log("(reference docs not found)");
}

function printProfile(cwd: string): void {
  const text = profileText(findRoot(cwd));
  console.log(text || "(no profile)");
}

function forgeSnippetCmd(key: string): void {
  if (!key || key === "keys") {
    const keys = ["git_type", "owner", "repo", "auth_check", "ensure_labels",
      "cmd_get_issue", "cmd_create_issue", "cmd_list_issues", "cmd_comment",
      "cmd_close_issue", "cmd_edit_labels", "cmd_edit_issue", "cmd_create_pr",
      "cmd_create_milestone", "cmd_close_milestone", "cmd_add_dependency", "ownership_note"];
    console.log(keys.join("\n"));
    return;
  }
  try {
    const f = detectForge();
    console.log(forgeSnippet(f, key));
  } catch (e) {
    if (e instanceof NotAGitRepo) { console.log("NOT_A_GIT_REPO: run `git init` first."); process.exit(1); }
    if (e instanceof UnknownForge) { console.log(`UNKNOWN_FORGE: remote '${e.remote}' not recognised.`); process.exit(0); }
    throw e;
  }
}

async function forgejoCmd(subargs: string[]): Promise<void> {
  if (subargs.length === 0) {
    console.error("Usage: prd-tool forgejo <cmd> [args...]");
    process.exit(1);
  }

  const c = ForgejoClient.fromRepo();

  // We need to read body from a file for several commands
  function readBody(bodyFile: string | undefined): string {
    if (!bodyFile) return "";
    const p = join(process.cwd(), bodyFile);
    return existsSync(p) ? readFileSync(p, "utf-8") : bodyFile;
  }

  function readTitleFlag(args: string[]): string | null {
    const idx = args.indexOf("--title");
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
  }

  function readBodyFlag(args: string[]): string | null {
    const idx = args.indexOf("--body-file");
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
  }

  function readLabelFlag(args: string[]): string | null {
    const idx = args.indexOf("--label");
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
  }

  function readMilestoneFlag(args: string[]): string | null {
    const idx = args.indexOf("--milestone");
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
  }

  function extractN(args: string[]): number | null {
    for (const a of args) if (/^\d+$/.test(a)) return parseInt(a, 10);
    return null;
  }

  const cmd = subargs[0];
  const rest = subargs.slice(1);

  switch (cmd) {
    case "auth-check": {
      // Just verify the token works by listing a label
      await c.listLabels();
      console.log("authenticated");
      break;
    }
    case "ensure-labels": {
      const created = await c.ensureLabels([
        ["prd", "5319e7"],
        ["kind:prd", "1d76db"],
        ["mode:hitl", "fbca04"],
        ["mode:afk", "c2e0c6"],
        ["status:todo", "ededed"],
        ["status:in-progress", "0052cc"],
        ["status:done", "0e8a16"],
      ]);
      if (created.length) console.log(`created labels: ${created.join(", ")}`);
      else console.log("all labels already exist");
      break;
    }
    case "view": {
      const n = extractN(rest);
      if (n === null) { console.error("usage: forgejo view <n>"); process.exit(1); }
      const issue = await c.getIssue(n);
      console.log(JSON.stringify(issue, null, 2));
      break;
    }
    case "create": {
      const title = readTitleFlag(rest) ?? "(untitled)";
      const body = readBody(readBodyFlag(rest) ?? undefined);
      const labels = readLabelFlag(rest)?.split(",") ?? [];
      const milestone = readMilestoneFlag(rest);
      const issue = await c.createIssue(title, body, labels, milestone);
      console.log(issue.number);
      break;
    }
    case "list": {
      const label = readLabelFlag(rest);
      const issues = await c.listIssues(label);
      console.log(JSON.stringify(issues, null, 2));
      break;
    }
    case "comment": {
      const n = extractN(rest);
      if (n === null) { console.error("usage: forgejo comment <n> --body <text>"); process.exit(1); }
      const body = readBody(readBodyFlag(rest) ?? undefined) || "comment";
      await c.comment(n, body);
      console.log(`commented on #${n}`);
      break;
    }
    case "close": {
      const n = extractN(rest);
      if (n === null) { console.error("usage: forgejo close <n> [--comment <text>]"); process.exit(1); }
      const commentText = readBodyFlag(rest);
      await c.close(n, commentText || null);
      console.log(`closed #${n}`);
      break;
    }
    case "edit": {
      const n = extractN(rest);
      if (n === null) { console.error("usage: forgejo edit <n> [--title <t>] [--body-file <f>]"); process.exit(1); }
      const title = readTitleFlag(rest);
      const body = readBodyFlag(rest) ? readBody(readBodyFlag(rest)!) : undefined;
      await c.updateIssue(n, title, body);
      console.log(`edited #${n}`);
      break;
    }
    case "edit-labels": {
      const n = extractN(rest);
      if (n === null) { console.error("usage: forgejo edit-labels <n> --add-label <a> --remove-label <r>"); process.exit(1); }
      const addIdx = rest.indexOf("--add-label");
      const removeIdx = rest.indexOf("--remove-label");
      const add = addIdx >= 0 && addIdx + 1 < rest.length ? rest[addIdx + 1].split(",") : [];
      const remove = removeIdx >= 0 && removeIdx + 1 < rest.length ? rest[removeIdx + 1].split(",") : [];
      await c.editLabels(n, add, remove);
      console.log(`edited labels on #${n}`);
      break;
    }
    case "create-pr": {
      const headIdx = rest.indexOf("--head");
      const baseIdx = rest.indexOf("--base");
      const title = readTitleFlag(rest) ?? "(untitled)";
      const head = headIdx >= 0 && headIdx + 1 < rest.length ? rest[headIdx + 1] : "";
      const base = baseIdx >= 0 && baseIdx + 1 < rest.length ? rest[baseIdx + 1] : "main";
      const body = readBody(readBodyFlag(rest) ?? undefined);
      const pr = await c.createPr(head, base, title, body);
      console.log(pr.html_url || `PR #${pr.number}`);
      break;
    }
    case "milestone": {
      const sub = rest[0];
      const titleIdx = rest.indexOf("--title") >= 0 ? rest.indexOf("--title") + 1 : -1;
      if (sub === "create" && titleIdx >= 0 && titleIdx < rest.length) {
        const mid = await c.ensureMilestone(rest[titleIdx]);
        console.log(mid);
      } else if (sub === "close") {
        const n = extractN(rest.slice(1));
        if (n) { await c.closeMilestone(n); console.log(`closed milestone #${n}`); }
        else { console.error("usage: forgejo milestone close <n>"); process.exit(1); }
      } else {
        console.error("usage: forgejo milestone create \"<title>\" | forgejo milestone close <n>");
        process.exit(1);
      }
      break;
    }
    case "dep": {
      const n = extractN(rest);
      const blockerIdx = rest.indexOf("--blocked-by");
      const blocker = blockerIdx >= 0 && blockerIdx + 1 < rest.length ? parseInt(rest[blockerIdx + 1], 10) : null;
      if (n === null || blocker === null) { console.error("usage: forgejo dep <n> --blocked-by <blocker>"); process.exit(1); }
      await c.addDependency(n, blocker);
      console.log(`#${blocker} now blocks #${n}`);
      break;
    }
    case "set-milestone": {
      const n = extractN(rest);
      const msName = rest.filter(a => !/^\d+$/.test(a) && a !== "--milestone" && a !== rest[rest.indexOf("--milestone") + 1]).join(" ") || rest[rest.indexOf("--milestone") + 1] || "";
      if (n === null || !msName) { console.error("usage: forgejo set-milestone <n> --milestone <title>"); process.exit(1); }
      const mid = await c.setMilestone(n, msName);
      console.log(`#${n} → milestone #${mid}`);
      break;
    }
    default:
      console.error(`unknown forgejo command: ${cmd}`);
      process.exit(1);
  }
}

main();