/**
 * skill-creator's bundled script wrappers: the three disclosed tools that run the
 * skill-authoring scripts directly, and the runner they share.
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Type } from "typebox";
import { OptStr, OptStrArray, Str, Tool, def, defStructured, outcome } from "./support.js";

// ─── skill-creator's bundled scripts (the disclosed nested toolset) ────────

/**
 * Where skill-creator's bundled scripts live: skills/engineering/skill-creator
 * /scripts in the package, resolved from this module so the wrapper tools run
 * them from any session directory.
 */
const SKILL_SCRIPTS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "skills",
  "engineering",
  "skill-creator",
  "scripts",
);

/**
 * Run one of skill-creator's bundled scripts directly (no shell): the script
 * path plus arguments, with the session directory as the working directory so
 * relative arguments resolve the way the caller means them. Exit 0 returns the
 * trimmed stdout; a nonzero exit fails with the script's own message, so a
 * validation or refusal surfaces with its reason.
 */
function runSkillScript(script: string, args: string[], cwd: string): string {
  const result = spawnSync(process.execPath, [join(SKILL_SCRIPTS_DIR, script), ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 30_000,
  });
  if (result.error !== undefined) {
    throw new Error(`${script} failed to run: ${result.error.message}`);
  }
  const out = (result.stdout ?? "").trim();
  const err = (result.stderr ?? "").trim();
  if (result.status !== 0) {
    throw new Error(err !== "" ? err : `${script} exited ${result.status ?? "on a signal"}`);
  }
  return out;
}

// ── skill-creator's disclosed nested toolset ────────────────────────
//
// The skill-authoring discipline is the one tool-owning discipline: its
// bundled scripts are wrapped as registered tools, disclosed when the
// skill opens nested inside a phase. Each tool runs its bundled script
// directly (no shell) with the session directory as the working
// directory, so the discipline calls the tool instead of shelling out.

export const skill_validate: Tool = def(
  "Validate a skill directory against the Agent Skills spec: runs the bundled validate_skill.mjs. " +
    "Checks the SKILL.md frontmatter (a hyphen-case name of 64 characters or fewer equal to the folder, " +
    "a description of 1024 characters or fewer with no angle brackets, only allowed keys). Returns 'OK' " +
    "on pass; fails with the first error otherwise.",
  { skillDir: Str("Path to the skill directory (relative to the session directory, or absolute)") },
  async (p, ctx) => runSkillScript("validate_skill.mjs", [String(p.skillDir ?? "")], ctx.directory),
);

export const skill_scaffold: Tool = def(
  "Scaffold a new skill: runs the bundled scaffold_skill.mjs. Normalizes the name, creates the folder " +
    "plus a SKILL.md template, and optionally the resource subdirectories. Refuses to overwrite an " +
    "existing skill: to UPDATE, edit in place.",
  {
    name: Str("The skill name (normalized: lowercase, spaces to hyphens, no doubled or edge hyphens)"),
    path: OptStr("Target directory (default: the session directory)"),
    resources: OptStrArray("Resource subdirectories to create, e.g. ['scripts', 'references']"),
  },
  async (p, ctx) => {
    const args = [String(p.name ?? "")];
    if (typeof p.path === "string" && p.path.trim() !== "") args.push("--path", p.path);
    if (Array.isArray(p.resources) && p.resources.length > 0) args.push("--resources", p.resources.join(","));
    return runSkillScript("scaffold_skill.mjs", args, ctx.directory);
  },
);

export const skill_discover: Tool = defStructured(
  "Discover existing skills matching an intent: runs the bundled discover_skill.mjs. Ranks the skills " +
    "in the skills directory by name and description overlap; candidates at or above the threshold " +
    "carry the UPDATE over create hint. Run it before creating a new skill.",
  Type.Object({
    intent: Type.String({ description: "What the new skill should cover, in the user's words" }),
    skillsDir: Type.Optional(
      Type.String({ description: "Directory whose immediate subdirectories hold skills (default: the session directory's skills directory)" }),
    ),
    threshold: Type.Optional(Type.Number({ description: "Minimum score for a candidate (default 0.4)" })),
    json: Type.Optional(Type.Boolean({ description: "Return the ranked candidates as JSON" })),
  }),
  async (p, ctx) => {
    const skillsDir =
      typeof p.skillsDir === "string" && p.skillsDir.trim() !== "" ? p.skillsDir : join(ctx.directory, "skills");
    const args = [String(p.intent ?? ""), "--skills-dir", skillsDir];
    if (typeof p.threshold === "number" && Number.isFinite(p.threshold)) {
      args.push("--threshold", String(p.threshold));
    }
    if (p.json === true) args.push("--json");
    return outcome(runSkillScript("discover_skill.mjs", args, ctx.directory), {});
  },
);
