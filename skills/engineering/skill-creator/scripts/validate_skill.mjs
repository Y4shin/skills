#!/usr/bin/env node

// validate_skill.mjs — Validate an Agent Skill directory against the spec.
//
// Usage: node validate_skill.mjs <skill-dir>
//
// Checks:
//   - SKILL.md exists
//   - Frontmatter opens with --- and closes with ---
//   - name: present, matches ^[a-z0-9]+(-[a-z0-9]+)*$, ≤64, no leading/trailing/
//     consecutive hyphens, equals the folder name
//   - description: present, ≤1024, no angle brackets
//   - No unknown frontmatter keys (allowed: name, description, license,
//     compatibility, allowed-tools, metadata)
//
// By-hand fallback: open SKILL.md and confirm by hand that the frontmatter
// opens with ---, has a name in hyphen-case ≤64 == folder name, and a
// description ≤1024 with no angle brackets. Check that every key is one of
// name, description, license, compatibility, allowed-tools, metadata,
  //     disable-model-invocation, argument-hint.

import { readFileSync, existsSync } from "node:fs";
import { join, basename, resolve } from "node:path";
import { parse } from "yaml";

const ALLOWED_KEYS = new Set([
  "name",
  "description",
  "disable-model-invocation",
  "argument-hint",
  "license",
  "compatibility",
  "allowed-tools",
  "metadata",
  "disable-model-invocation",
  "argument-hint",
]);

const NAME_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function fail(msg) {
  process.stderr.write(msg + "\n");
  process.exit(1);
}

function main() {
  const skillDir = process.argv[2];
  if (!skillDir) {
    fail("Usage: node validate_skill.mjs <skill-dir>");
  }

  const resolvedDir = resolve(skillDir);
  const folderName = basename(resolvedDir);
  const skillMdPath = join(resolvedDir, "SKILL.md");

  // Check: SKILL.md exists
  if (!existsSync(skillMdPath)) {
    fail(`Error: SKILL.md not found in ${resolvedDir}`);
  }

  const content = readFileSync(skillMdPath, "utf-8");

  // Check: frontmatter opens with --- and closes with ---
  if (!content.startsWith("---\n") && content !== "---\r\n") {
    fail(`Error: SKILL.md must start with ---`);
  }

  // Find the closing ---
  const closingIdx = content.indexOf("\n---", content.startsWith("---\n") ? 4 : 3);
  if (closingIdx === -1) {
    fail(`Error: SKILL.md frontmatter missing closing ---`);
  }

  const fmRaw = content.slice(
    content.startsWith("---\n") ? 4 : 3,
    closingIdx,
  );
  // Handle \r\n line endings
  const fmContent = fmRaw.replace(/\r\n/g, "\n").trim();

  // Parse frontmatter using the yaml library for robust handling of
  // quoted values, block scalars, and colons inside values.
  let fm;
  try {
    fm = parse(fmContent);
  } catch (e) {
    fail(`Error: invalid frontmatter YAML: ${e.message}`);
  }

  if (typeof fm !== "object" || fm === null) {
    fail(`Error: frontmatter must be a YAML mapping`);
  }

  // Check: no unknown keys
  for (const key of Object.keys(fm)) {
    if (!ALLOWED_KEYS.has(key)) {
      fail(`Error: unknown frontmatter key "${key}". Allowed keys: name, description, license, compatibility, allowed-tools, metadata, disable-model-invocation, argument-hint`);
    }
  }

  // Check: name present and valid
  const name = fm.name;
  if (name === undefined || name === null) {
    fail(`Error: name is required in frontmatter`);
  }
  if (typeof name !== "string") {
    fail(`Error: name must be a string`);
  }
  if (!NAME_REGEX.test(name)) {
    fail(`Error: name "${name}" must match ^[a-z0-9]+(-[a-z0-9]+)*$ (lowercase a-z, 0-9, hyphens; no leading/trailing/consecutive hyphens)`);
  }
  if (name.length > 64) {
    fail(`Error: name "${name}" exceeds 64 characters (got ${name.length})`);
  }
  if (name !== folderName) {
    fail(`Error: name "${name}" does not match folder name "${folderName}"`);
  }

  // Check: description present and valid
  const description = fm.description;
  if (description === undefined || description === null) {
    fail(`Error: description is required in frontmatter`);
  }
  if (typeof description !== "string") {
    fail(`Error: description must be a string`);
  }
  if (description.length === 0) {
    fail(`Error: description must not be empty`);
  }
  if (description.length > 1024) {
    fail(`Error: description exceeds 1024 characters (got ${description.length})`);
  }
  if (description.includes("<") || description.includes(">")) {
    fail(`Error: description must not contain angle brackets (< or >)`);
  }

  // All checks passed
  process.stdout.write("OK\n");
  process.exit(0);
}

main();
