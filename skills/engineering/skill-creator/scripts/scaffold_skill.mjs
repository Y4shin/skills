#!/usr/bin/env node

// scaffold_skill.mjs — Scaffold a new Agent Skill directory.
//
// Usage: node scaffold_skill.mjs <name> [--path <dir>] [--resources scripts,references,assets]
//
// Normalizes the name (lowercase, spaces→hyphens, trim), creates the skill
// folder + a SKILL.md template (name + a TODO description), and optionally
// the specified resource subdirectories. Refuses to overwrite an existing
// skill — to UPDATE, edit in place.
//
// By-hand fallback: create the directory manually, write a SKILL.md with
// frontmatter `name: <normalized-name>` and a `description: TODO` placeholder,
// then create any resource subdirs you need.

import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

function fail(msg) {
  process.stderr.write(msg + "\n");
  process.exit(1);
}

function normalizeName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    fail("Usage: node scaffold_skill.mjs <name> [--path <dir>] [--resources scripts,references,assets]");
  }

  const rawName = args[0];
  let targetPath = process.cwd();
  let resources = [];

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--path") {
      targetPath = args[++i];
    } else if (args[i] === "--resources") {
      resources = args[++i].split(",").map((r) => r.trim());
    }
  }

  const normalizedName = normalizeName(rawName);

  if (!normalizedName) {
    fail("Error: name must not be empty after normalization");
  }

  const skillDir = join(resolve(targetPath), normalizedName);

  // Refuse to overwrite an existing skill
  if (existsSync(skillDir)) {
    fail(`Error: skill directory "${skillDir}" already exists. To UPDATE, edit in place.`);
  }

  // Create the skill directory
  mkdirSync(skillDir, { recursive: true });

  // Create resource subdirectories if requested
  for (const resource of resources) {
    const resourceDir = join(skillDir, resource);
    if (!existsSync(resourceDir)) {
      mkdirSync(resourceDir, { recursive: true });
    }
  }

  // Write SKILL.md template
  const skillMdContent = [
    "---",
    `name: ${normalizedName}`,
    "description: TODO",
    "---",
    "",
    `# /${normalizedName}`,
    "",
    "<!-- Replace this TODO description with a trigger-designed description ≤1024 chars. -->",
    "",
  ].join("\n");

  writeFileSync(join(skillDir, "SKILL.md"), skillMdContent);

  process.stdout.write(`Created skill "${normalizedName}" at ${skillDir}\n`);
  process.exit(0);
}

main();
