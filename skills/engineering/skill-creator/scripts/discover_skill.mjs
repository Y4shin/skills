#!/usr/bin/env node

// discover_skill.mjs — Discover existing skills matching an intent.
//
// Usage: node discover_skill.mjs "<intent>" --skills-dir <dir> [--threshold 0.4] [--json]
//
// Scans immediate subdirectories of <dir> for SKILL.md, parses name +
// description, and ranks them by name similarity + token overlap (overlap
// coefficient on the smaller set). Prints candidates scoring ≥ threshold,
// with an "UPDATE over create" hint.
//
// By-hand fallback: list the skills directory, read each SKILL.md frontmatter,
// and judge by name + description relevance to your intent. Prefer updating
// an existing skill over creating a duplicate.

import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

function fail(msg) {
  process.stderr.write(msg + "\n");
  process.exit(1);
}

function tokenize(text) {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 0),
  );
}

function overlapCoefficient(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  const smaller = setA.size <= setB.size ? setA : setB;
  const larger = setA.size <= setB.size ? setB : setA;
  let intersection = 0;
  for (const item of smaller) {
    if (larger.has(item)) intersection++;
  }
  return intersection / smaller.size;
}

function nameSimilarity(intent, skillName) {
  // Simple substring-based name similarity
  const intentLower = intent.toLowerCase();
  const nameLower = skillName.toLowerCase();
  if (intentLower.includes(nameLower) || nameLower.includes(intentLower)) {
    return 0.8;
  }
  // Check token overlap between intent and name
  const intentTokens = tokenize(intent);
  const nameTokens = tokenize(skillName);
  return overlapCoefficient(intentTokens, nameTokens);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    fail('Usage: node discover_skill.mjs "<intent>" --skills-dir <dir> [--threshold 0.4] [--json]');
  }

  const intent = args[0];
  let skillsDir = null;
  let threshold = 0.4;
  let jsonOutput = false;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--skills-dir") {
      skillsDir = args[++i];
    } else if (args[i] === "--threshold") {
      threshold = parseFloat(args[++i]);
    } else if (args[i] === "--json") {
      jsonOutput = true;
    }
  }

  if (!skillsDir) {
    fail("Error: --skills-dir is required");
  }

  if (!existsSync(skillsDir)) {
    fail(`Error: skills directory "${skillsDir}" not found`);
  }

  const intentTokens = tokenize(intent);
  const candidates = [];

  // Scan immediate subdirectories
  const entries = readdirSync(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillMdPath = join(skillsDir, entry.name, "SKILL.md");
    if (!existsSync(skillMdPath)) continue;

    const content = readFileSync(skillMdPath, "utf-8");
    if (!content.startsWith("---\n")) continue;

    const closingIdx = content.indexOf("\n---", 4);
    if (closingIdx === -1) continue;

    const fmRaw = content.slice(4, closingIdx).replace(/\r\n/g, "\n").trim();
    let fm;
    try {
      fm = parse(fmRaw);
    } catch {
      continue;
    }
    if (typeof fm !== "object" || fm === null) continue;

    const name = fm.name;
    const description = fm.description;
    if (!name || !description) continue;

    // Compute score: combination of name similarity and description token overlap
    const nameScore = nameSimilarity(intent, name);
    const descTokens = tokenize(description);
    const descOverlap = overlapCoefficient(intentTokens, descTokens);

    // Weighted combination: name similarity matters more
    const score = nameScore * 0.5 + descOverlap * 0.5;

    if (score >= threshold) {
      candidates.push({
        name,
        description,
        score: Math.round(score * 100) / 100,
        path: join(skillsDir, entry.name),
      });
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  if (jsonOutput) {
    process.stdout.write(JSON.stringify(candidates, null, 2) + "\n");
  } else {
    if (candidates.length === 0) {
      process.stdout.write("No matching skills found. Consider creating a new skill.\n");
    } else {
      process.stdout.write("Matching skills (UPDATE over create):\n");
      for (const c of candidates) {
        process.stdout.write(`  ${c.name} (score: ${c.score}) — UPDATE over create\n`);
        process.stdout.write(`    ${c.description}\n`);
        process.stdout.write(`    ${c.path}\n`);
      }
    }
  }

  process.exit(0);
}

main();
