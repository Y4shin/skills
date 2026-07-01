/**
 * Build the prd-tool artifacts from the single TypeScript source:
 *
 *   dist/prd-tool.js   — self-contained CLI (node shebang; runs under node or bun)
 *   dist/plugin.js     — opencode plugin registering the native prd_* tools
 *
 * and distribute them:
 *   - copy the CLI into the Claude plugin (plugins/prd-workflow/scripts/)
 *   - generate the opencode command overlay (plugins/prd-workflow-opencode/)
 *
 * Run with `npm run build` (plain node — no TS toolchain needed for the build).
 */

import { build } from "esbuild";
import YAML from "yaml";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, "dist");
const CLAUDE = join(ROOT, "plugins", "prd-workflow");
const OPENCODE = join(ROOT, "plugins", "prd-workflow-opencode");
const SKILLS_DIR = join(CLAUDE, "skills");
const REFERENCE = join(CLAUDE, "references", "artifacts.md");

const referenceText = readFileSync(REFERENCE, "utf-8");

// Make a real `require` available in the ESM bundle so esbuild's __require shim
// delegates to it (some deps, e.g. `yaml`, do a dynamic `require("process")`).
const CREATE_REQUIRE =
  "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);";

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

async function buildCli() {
  const outfile = join(DIST, "prd-tool.js");
  await build({
    entryPoints: [join(ROOT, "src", "cli.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node18",
    outfile,
    banner: { js: `#!/usr/bin/env node\n${CREATE_REQUIRE}` },
    define: { __REFERENCE__: JSON.stringify(referenceText) },
    legalComments: "none",
  });
  chmodSync(outfile, 0o755);
  const kb = (readFileSync(outfile).length / 1024).toFixed(0);
  log(`wrote dist/prd-tool.js  (${kb} KiB)`);
  return outfile;
}

async function buildPlugin() {
  const entry = join(ROOT, "src", "plugin.ts");
  if (!existsSync(entry)) return null;
  const outfile = join(DIST, "plugin.js");
  await build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node18",
    outfile,
    // NOTE: do NOT mark @opencode-ai/plugin external. Its `tool` export is just
    // an identity function whose only dep is zod, so bundling it stays tiny —
    // and it makes the plugin self-contained. When the plugin is installed as a
    // symlink (e.g. Home Manager / Nix store), Node resolves bare imports from
    // the file's REAL path, which has no node_modules, so an external import of
    // @opencode-ai/plugin fails to load and none of the prd_* tools register.
    banner: { js: CREATE_REQUIRE },
    define: { __REFERENCE__: JSON.stringify(referenceText) },
    legalComments: "none",
  });
  const kb = (readFileSync(outfile).length / 1024).toFixed(0);
  log(`wrote dist/plugin.js  (${kb} KiB)`);
  return outfile;
}

function copyInto(dir, name, src) {
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, name);
  copyFileSync(src, dest);
  return dest;
}

// ---- opencode command overlay generation ------------------------------------

// The Claude SKILL.md injects `node "${CLAUDE_SKILL_DIR}/../../scripts/prd-tool.js"`.
// In an opencode command the path is project-root-relative (opencode runs !`…`
// from the project root), so it becomes `.opencode/scripts/prd-tool.js`.
const TOOL_RE = /\$\{CLAUDE_SKILL_DIR\}\/\.\.\/\.\.\/scripts\/prd-tool\.js/g;
const OPENCODE_CLI = ".opencode/scripts/prd-tool.js";

// Default model per command, by workflow tier. opencode reads `model` from a
// command's frontmatter; commands left unlisted inherit the session model, so
// the routine tier is the implicit default. Edit these to taste.
const TIER_MODEL = {
  heavy: "openrouter/deepseek/deepseek-v4-pro", // hardest reasoning / spec authoring / TDD coding
  medium: "openrouter/deepseek/deepseek-v4-flash", // decomposition, slicing, analysis, finalize synthesis
  routine: "openrouter/deepseek/deepseek-v4-flash", // mechanical, tool-driven bookkeeping
};
const COMMAND_TIER = {
  "grill-me": "heavy",
  "create-feature-prd": "heavy",
  "create-capability-prd": "heavy",
  "implement-issue": "heavy",
  "create-epic": "medium",
  "epic-to-prds": "medium",
  "feature-prd-to-issues": "medium",
  "capability-prd-to-issues": "medium",
  "analyse-issue": "medium",
  "finalize-prd": "medium",
  // unlisted (adopt-prd, finalize-epic, init/update-prd-workflow, …) → routine
};
const modelForCommand = (name) => TIER_MODEL[COMMAND_TIER[name] ?? "routine"];

// Non-destructive note prepended to each command: the artifact operations are
// available as native opencode tools. We don't textually rewrite the inline
// `prd_tool …` references (they sit inside fenced/inline code and still work via
// the `toolpath` shorthand) — we just steer the agent to the native tools.
const NATIVE_TOOLS_NOTE =
  "> **opencode native tools.** This build exposes the artifact-frontmatter operations as\n" +
  "> native tools — **prefer them** over shelling out to the CLI for these: `prd_show`,\n" +
  "> `prd_get`, `prd_set`, `prd_set_slices`, `prd_resolve`, `prd_assert_kind`, `prd_list`,\n" +
  "> `prd_slices`, `prd_finalizable`, `prd_lint`, `prd_epic_prds`, `prd_epic_set_prd_issue`,\n" +
  "> `prd_epic_prd_issue`, `prd_epic_tick`, `prd_epic_finalizable`. The !`…` header\n" +
  "> injections below (workflow-gate, reference, list, profile, forge snippets) still run\n" +
  "> via the bundled CLI — that is by design (a command can't call a tool).\n";

/** Convert one SKILL.md into an opencode command markdown string. */
function skillToCommand(text, model) {
  // Split frontmatter.
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!m) throw new Error("SKILL.md missing frontmatter");
  const fm = m[1];
  let body = m[2];

  // Keep only `description:` from the frontmatter (drop name / allowed-tools).
  const descMatch = /^description:\s*(.*)$/m.exec(fm);
  // Handoffs in the description too: /prd-workflow:<skill> → /<skill>.
  const description = descMatch ? descMatch[1].trim().replace(/\/prd-workflow:/g, "/") : "";

  // Header injections: rewrite the bundled-tool path to the project-relative CLI.
  body = body.replace(TOOL_RE, OPENCODE_CLI);
  // Handoffs: /prd-workflow:<skill> → /<skill>
  body = body.replace(/\/prd-workflow:/g, "/");

  // Serialize the frontmatter via the YAML lib so descriptions containing ':' or
  // quotes are correctly quoted (opencode's YAML parser is strict).
  const fmObj = {};
  if (description) fmObj.description = description;
  if (model) fmObj.model = model;
  const fmBlock = Object.keys(fmObj).length ? YAML.stringify(fmObj).replace(/\n+$/, "") : "";
  const fmOut = `---\n${fmBlock ? fmBlock + "\n" : ""}---\n`;
  return `${fmOut}\n${NATIVE_TOOLS_NOTE}\n${body}`;
}

function generateOverlay(cliBundle, pluginBundle) {
  if (!existsSync(SKILLS_DIR)) return;
  const cmdDir = join(OPENCODE, "command");
  rmSync(cmdDir, { recursive: true, force: true });
  mkdirSync(cmdDir, { recursive: true });

  // The orientation skill is shipped as an opencode *skill* (auto-invokable; static,
  // hand-maintained under skill/), not a command — opencode commands are user-typed and
  // need !`…` injection, which an orientation doc doesn't. Skip it here.
  const SKILL_NOT_COMMAND = new Set(["prd-workflow-overview"]);

  let n = 0;
  for (const name of readdirSync(SKILLS_DIR).sort()) {
    if (SKILL_NOT_COMMAND.has(name)) continue;
    const skill = join(SKILLS_DIR, name, "SKILL.md");
    if (!existsSync(skill)) continue;
    const cmd = skillToCommand(readFileSync(skill, "utf-8"), modelForCommand(name));
    writeFileSync(join(cmdDir, `${name}.md`), cmd);
    n++;
  }
  log(`generated ${n} opencode command file(s) (+ the prd-workflow-overview skill under skill/)`);

  // Ship the CLI (for header injections) and the plugin (native tools).
  copyInto(join(OPENCODE, "scripts"), "prd-tool.js", cliBundle);
  chmodSync(join(OPENCODE, "scripts", "prd-tool.js"), 0o755);
  if (pluginBundle) {
    copyInto(join(OPENCODE, "plugin"), "prd-workflow.js", pluginBundle);
    log("copied CLI + plugin into the opencode overlay");
  } else {
    log("copied CLI into the opencode overlay (plugin not built)");
  }
}

// ---- main -------------------------------------------------------------------

mkdirSync(DIST, { recursive: true });
const cliBundle = await buildCli();
const pluginBundle = await buildPlugin();

// Claude plugin: ship the bundled CLI alongside the skills.
if (existsSync(CLAUDE)) {
  copyInto(join(CLAUDE, "scripts"), "prd-tool.js", cliBundle);
  chmodSync(join(CLAUDE, "scripts", "prd-tool.js"), 0o755);
  log("copied CLI into the Claude plugin (plugins/prd-workflow/scripts/)");
}

generateOverlay(cliBundle, pluginBundle);
log("build complete.");
