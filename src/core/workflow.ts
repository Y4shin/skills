/**
 * Workflow versioning for the prd-workflow.
 *
 * The convention version is recorded in `docs/prd/.workflow-version` (a bare
 * integer). **Absence means version 0**, the legacy baseline. `gate` is injected
 * into every operational skill (empty == proceed); `initInstructions` /
 * `migrateInstructions` are the bodies the init / update skills inject.
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { PRD_TOOL as TOOL } from "./forge";

// Bump this when a new set of conventions ships, and add a Migration below.
export const CURRENT_VERSION = 2;

export function versionFile(root: string): string {
  return join(root, "docs", "prd", ".workflow-version");
}

export function hasVersionFile(root: string): boolean {
  const p = versionFile(root);
  return existsSync(p) && statSync(p).isFile();
}

export function readVersion(root: string): number {
  if (!hasVersionFile(root)) return 0;
  const raw = readFileSync(versionFile(root), "utf-8").trim();
  const n = Number.parseInt(raw, 10);
  return raw !== "" && /^[+-]?\d+$/.test(raw) && Number.isFinite(n) ? n : 0;
}

export function writeVersion(root: string, n: number): string {
  const p = versionFile(root);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, `${n}\n`, "utf-8");
  return p;
}

// --------------------------------------------------------------------- gate

function refuse(reason: string, remedy: string): string {
  return (
    `> [!STOP] prd-workflow version check failed — ${reason}\n` +
    `> **Do not run any prd-workflow steps and take no other action.** ${remedy}`
  );
}

/** Instruction injected into operational skills. Empty string == proceed. */
export function gate(root: string): string {
  if (!hasVersionFile(root)) {
    return refuse(
      "this repo has no docs/prd/.workflow-version file (uninitialized).",
      "If the prd-workflow has never been used here, tell the user to run " +
        "`/prd-workflow:init-prd-workflow` (starts at the current version); if it has prior " +
        "data to carry forward, `/prd-workflow:update-prd-workflow` (migrates from v0). " +
        "Then retry.",
    );
  }
  const v = readVersion(root);
  if (v < CURRENT_VERSION) {
    return refuse(
      `repo is at workflow v${v}; this tool expects v${CURRENT_VERSION}.`,
      "Tell the user to run `/prd-workflow:update-prd-workflow` to migrate, then retry.",
    );
  }
  if (v > CURRENT_VERSION) {
    return refuse(
      `repo is at workflow v${v}, newer than this tool (v${CURRENT_VERSION}).`,
      "The plugin is out of date — tell the user to update the prd-workflow plugin.",
    );
  }
  return ""; // current: print nothing, do not pollute context
}

// ------------------------------------------------------------------- noop text

function noop(state: string): string {
  return (
    `✓ prd-workflow ${state} No migration or initialization is needed — ` +
    "**this is a no-op. Do not create or modify any files and take no action.** " +
    "Just tell the user there is nothing to do."
  );
}

// --------------------------------------------------------------------- init

export function initInstructions(root: string): string {
  if (hasVersionFile(root)) {
    const v = readVersion(root);
    if (v === CURRENT_VERSION) return noop(`is already initialized at v${v}.`);
    return (
      `This repo already has a version file (v${v}) — it has been used before, so init ` +
      `does not apply. To move to v${CURRENT_VERSION}, tell the user to run ` +
      "`/prd-workflow:update-prd-workflow` instead. **Do nothing else here.**"
    );
  }
  return (
    `Initialize the prd-workflow at the current version — run exactly:\n\n` +
    `    ${TOOL} workflow-version set ${CURRENT_VERSION}\n\n` +
    `Then confirm to the user that the prd-workflow is initialized at ` +
    `v${CURRENT_VERSION}. Do nothing else.`
  );
}

// ------------------------------------------------------------------ migrate

interface Migration {
  target: number;
  summary: string;
  body: string;
}

function migration0to1(provider: string): string {
  let listEpics: string;
  let makeMs: string;
  let assign: string;
  let closeEpic: string;
  if (provider === "gh") {
    listEpics = "gh issue list --label epic";
    makeMs = 'gh api --method POST "repos/<owner>/<repo>/milestones" -f title="<epic-title>"';
    assign = 'gh issue edit <prd#> --milestone "<epic-title>"';
    closeEpic = 'gh issue close <epic#> --comment "Converted to milestone."';
  } else if (provider === "fgj") {
    listEpics = `${TOOL} forgejo list --label epic`;
    makeMs = `${TOOL} forgejo milestone create "<epic-title>"`;
    assign = `${TOOL} forgejo set-milestone <prd#> "<epic-title>"`;
    closeEpic = `${TOOL} forgejo close <epic#> --comment "Converted to milestone."`;
  } else {
    listEpics = `${TOOL} tracker list --label epic`;
    makeMs = `${TOOL} tracker milestone create "<epic-title>"`;
    assign = `${TOOL} tracker set-milestone <prd#> "<epic-title>"`;
    closeEpic = `${TOOL} tracker close <epic#> --comment "Converted to milestone."`;
  }
  return (
    "An epic is now a **milestone**, not an issue. If this repo has epic *issues* from the " +
    "old model, convert each one (slices already block their PRD via dependencies — no change " +
    "there):\n\n" +
    `1. Find epic issues:\n       ${listEpics}\n` +
    "   (No epics ⇒ nothing to do; this is a no-op.)\n" +
    `2. Create a milestone from the epic's title:\n       ${makeMs}\n` +
    "3. Reassign every child PRD issue of that epic to the milestone (read the children from " +
    `\`prds[].issue\` in epic.md):\n       ${assign}\n` +
    "4. In each `docs/prd/epics/<slug>/epic.md`, replace `epic_issue: <#n>` with " +
    "`epic_milestone: <milestone-id>`.\n" +
    `5. Close the obsolete epic issue:\n       ${closeEpic}`
  );
}

function migration1to2(provider: string): string {
  let create: string;
  if (provider === "gh") {
    create =
      'gh issue create --title "PRD: <prd-slug>" --body "<placeholder>" ' +
      "--label prd --label kind:<kind> --label status:todo --milestone \"<epic-title>\"";
  } else if (provider === "fgj") {
    create =
      `${TOOL} forgejo create --title "PRD: <prd-slug>" --body "<placeholder>" ` +
      "--label prd --label kind:<kind> --label status:todo --milestone \"<epic-title>\"";
  } else {
    create =
      `${TOOL} tracker create --title "PRD: <prd-slug>" --body "<placeholder>" ` +
      "--label prd --label kind:<kind> --label status:todo --milestone \"<epic-title>\"";
  }
  return (
    "PRD issues are now pre-created for the whole epic up front, so the milestone's progress " +
    "reflects every planned PRD — not only the ones already built (which made an epic read " +
    "100% done while PRD issues were still missing). For each epic " +
    "(`docs/prd/epics/<slug>/epic.md`) that has an `epic_milestone:` and a `prds:` plan:\n\n" +
    "1. List its planned children and their issue state:\n" +
    `       ${TOOL} epic prds <epic-slug>\n` +
    "2. For every child whose `issue` is still null, create a placeholder PRD issue assigned " +
    `to the epic milestone (title = the epic's \`title:\`, kind from the plan):\n       ${create}\n` +
    "3. Record each new number:\n" +
    `       ${TOOL} epic set-prd-issue <epic-slug> <prd-slug> <#>\n\n` +
    "Children that already have an issue are left untouched. Repos with no epics are a no-op."
  );
}

function migrations(provider: string): Record<number, Migration> {
  return {
    1: {
      target: 1,
      summary: "an epic is a milestone (not an issue); PRD issues join it, slices block the PRD",
      body: migration0to1(provider),
    },
    2: {
      target: 2,
      summary: "pre-create all PRD issues per epic (placeholders) so milestone progress is accurate",
      body: migration1to2(provider),
    },
  };
}

export function migrateInstructions(root: string, provider: string): string {
  const v = readVersion(root); // 0 when no file exists
  if (v === CURRENT_VERSION) return noop(`is already at v${v}.`);
  if (v > CURRENT_VERSION) return noop(`is at v${v}, newer than this tool (v${CURRENT_VERSION}).`);

  const migs = migrations(provider);
  const steps: string[] = [];
  for (let target = v + 1; target <= CURRENT_VERSION; target++) {
    const m = migs[target];
    if (!m) continue;
    steps.push(`### v${target - 1} → v${target} — ${m.summary}\n\n${m.body}`);
  }
  const body = steps.join("\n\n");
  return (
    `Migrate this repo's prd-workflow from v${v} to v${CURRENT_VERSION}. ` +
    `Perform each step below in order, then record the new version.\n\n` +
    `${body}\n\n` +
    `### Finalize\n\nRecord the new version — run exactly:\n\n` +
    `    ${TOOL} workflow-version set ${CURRENT_VERSION}\n\n` +
    `Then confirm to the user that the repo is now at v${CURRENT_VERSION}.`
  );
}
