/**
 * Build the prd-workflow artifacts:
 *   dist/cli.js      — minimal CLI for opencode command !`...` injections
 *   dist/plugin.js   — opencode plugin registering the native prd_* tools
 *
 * And generate the opencode overlay:
 *   opencode-overlay/command/<name>.md    — per-step command files
 *   opencode-overlay/skill/<name>/SKILL.md — overview skill
 *   opencode-overlay/scripts/prd-tool.js  — the CLI bundle
 *   opencode-overlay/plugin/prd-workflow.js — the plugin bundle
 */

import { build } from "esbuild";
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
const SKILLS_DIR = join(ROOT, "skills");
const OPENCODE = join(ROOT, "opencode-overlay");

const CREATE_REQUIRE =
  "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);";

function log(msg) { process.stdout.write(`${msg}\n`); }

async function buildCli() {
  const outfile = join(DIST, "cli.js");
  await build({
    entryPoints: [join(ROOT, "src", "cli.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node18",
    outfile,
    banner: { js: `#!/usr/bin/env node\n${CREATE_REQUIRE}` },
    legalComments: "none",
  });
  chmodSync(outfile, 0o755);
  const kb = (readFileSync(outfile).length / 1024).toFixed(0);
  log(`wrote dist/cli.js  (${kb} KiB)`);
  return outfile;
}

async function buildPlugin() {
  const entry = join(ROOT, "src", "opencode", "plugin.ts");
  if (!existsSync(entry)) return null;
  const outfile = join(DIST, "plugin.js");
  await build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node18",
    outfile,
    banner: { js: CREATE_REQUIRE },
    legalComments: "none",
    external: ["@opencode-ai/plugin"],
  });
  const kb = (readFileSync(outfile).length / 1024).toFixed(0);
  log(`wrote dist/plugin.js  (${kb} KiB)`);
  return outfile;
}

function copyInto(dir, name, src) {
  mkdirSync(dir, { recursive: true });
  copyFileSync(src, join(dir, name));
}

// ─── opencode command generation ────────────────────────────────────────────────

function skillToCommand(text, model) {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!m) throw new Error("SKILL.md missing frontmatter");
  const fm = m[1];
  let body = m[2];

  // Extract description (rewrite /skill: → /)
  const descRe = /^description:\s*(.*)$/m;
  const descMatch = descRe.exec(fm);
  const description = descMatch ? descMatch[1].trim().replace(/\/skill:/g, "/") : "";

  // Rewrite skill references in body (/skill:xxx → /xxx)
  body = body.replace(/\/skill:/g, "/");

  // Build frontmatter
  const fmLines = [];
  if (description) fmLines.push(`description: ${description}`);
  if (model) fmLines.push(`model: ${model}`);
  const fmBlock = fmLines.length ? `---\n${fmLines.join("\n")}\n---\n` : "---\n---\n";

  return `${fmBlock}\n${body}`;
}

function generateOverlay(cliBundle, pluginBundle) {
  // Commands
  const cmdDir = join(OPENCODE, "command");
  rmSync(cmdDir, { recursive: true, force: true });
  mkdirSync(cmdDir, { recursive: true });

  // Skip the overview skill — it's a skill, not a command
  let n = 0;
  for (const name of readdirSync(SKILLS_DIR).sort()) {
    if (name === "prd-workflow-overview") continue;
    const skillFile = join(SKILLS_DIR, name, "SKILL.md");
    if (!existsSync(skillFile)) continue;
    const text = readFileSync(skillFile, "utf-8");
    const cmd = skillToCommand(text, null);
    writeFileSync(join(cmdDir, `${name}.md`), cmd);
    n++;
  }
  log(`generated ${n} opencode command file(s)`);

  // Overview skill
  const skillSrc = join(SKILLS_DIR, "prd-workflow-overview", "SKILL.md");
  if (existsSync(skillSrc)) {
    const skillDest = join(OPENCODE, "skill", "prd-workflow-overview", "SKILL.md");
    mkdirSync(dirname(skillDest), { recursive: true });
    copyFileSync(skillSrc, skillDest);
    log("copied prd-workflow-overview skill into opencode overlay");
  }

  // CLI + plugin
  copyInto(join(OPENCODE, "scripts"), "prd-tool.js", cliBundle);
  chmodSync(join(OPENCODE, "scripts", "prd-tool.js"), 0o755);
  if (pluginBundle) {
    copyInto(join(OPENCODE, "plugin"), "prd-workflow.js", pluginBundle);
    log("copied CLI + plugin into the opencode overlay");
  } else {
    log("copied CLI into the opencode overlay (plugin not built)");
  }
}

// ─── main ───────────────────────────────────────────────────────────────────────

mkdirSync(DIST, { recursive: true });
const cliBundle = await buildCli();
const pluginBundle = await buildPlugin();
generateOverlay(cliBundle, pluginBundle);
log("build complete.");