#!/usr/bin/env node
// THROWAWAY PROTOTYPE for architecture-fitting/tasks/diff-update-roundtrip.
// Question: can the settled schema carry a complete reviewed diff whose
// clean update is a mechanical, verifiable removal of review markup, while
// preserving unchanged content and agent-authored assignments and using
// only clean HEAD for code analysis?
//
// Round 2 amendments from operator review:
// - every AU reference is fully qualified (root/sub-unit), everywhere;
// - strict partitioning: a subdivided AU owns no code directly; its
//   sub-AUs tile its scope as disjoint sets, visibly (coverage + gaps).

import { execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync, copyFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";

const ROOT = import.meta.dirname;
const TMP = join(ROOT, "tmp");
const ART = join(ROOT, "artifacts");
const REPO = join(TMP, "fixture-repo");
const WT = join(TMP, "wt-head");
const ARCH = join(REPO, "docs", "architecture");
const ARCH_BAK = join(REPO, "docs", "architecture.bak");
const DIFF_DIR = join(TMP, "arch-diff");
const REVIEWED_DIR = join(TMP, "arch-reviewed");
const CLEAN_DIR = join(TMP, "arch-clean");
const DIFF_DIR_DIRTY = join(TMP, "arch-diff-dirty");

const report = [];
const failures = [];
function check(name, ok, detail) {
  const line = `${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`;
  report.push(line);
  if (!ok) failures.push(name);
}
function log(msg) { console.log(msg); }
function sh(cmd, cwd) {
  return execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}
function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// ─── Mini front matter: flat keys, JSON one-liners for structured values ────

function parseDoc(path) {
  const text = readFileSync(path, "utf8");
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!m) throw new Error(`no front matter in ${path}`);
  const data = {};
  for (const line of m[1].split("\n")) {
    const kv = /^(\w+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const [, k, v] = kv;
    if (v === "") data[k] = null;
    else if (v.startsWith("[") || v.startsWith("{")) data[k] = JSON.parse(v);
    else data[k] = v;
  }
  return { data, body: m[2], path };
}
function renderDoc(data, body) {
  const lines = ["---"];
  for (const [k, v] of Object.entries(data)) {
    if (v === null || v === undefined) lines.push(`${k}: `);
    else if (typeof v === "object") lines.push(`${k}: ${JSON.stringify(v)}`);
    else lines.push(`${k}: ${v}`);
  }
  lines.push("---", "");
  return lines.join("\n") + body;
}
function sections(body) {
  const parts = [];
  let cur = { heading: null, text: "" };
  for (const line of body.split("\n")) {
    const h = /^## (.+)$/.exec(line);
    if (h) { parts.push(cur); cur = { heading: h[1], text: "" }; }
    else cur.text += line + "\n";
  }
  parts.push(cur);
  return parts.filter((p) => p.heading !== null || p.text.trim() !== "");
}
function sectionMap(body) {
  const map = new Map();
  for (const p of sections(body)) if (p.heading) map.set(p.heading, p.text);
  return map;
}
function authoredSections(body) {
  return sections(body).filter((p) => p.heading && !["Observed", "Diagram", "Diff summary"].includes(p.heading))
    .map((p) => `## ${p.heading}\n${p.text.replace(/^> Review note:.*\n/gm, "").trim()}`).join("\n");
}
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function replaceSection(body, heading, newText) {
  const re = new RegExp(`(## ${escapeRegex(heading)}\\n\\n)[\\s\\S]*?(?=\\n## |$)`);
  return body.replace(re, `$1${newText}`);
}
function insertSectionBefore(body, before, heading, text) {
  const re = new RegExp(`\\n(## ${escapeRegex(before)}\\n)`);
  if (re.test(body)) return body.replace(re, `\n## ${heading}\n\n${text}\n\n$1`);
  return body + `\n## ${heading}\n\n${text}\n`;
}

// ─── Units: fully qualified names and the strict partition descent ─────────

// The parent field holds the parent's fully qualified name. A unit's fqn is
// parentFqn/id for children, id for root units. References (parent,
// declared_relationships targets, prose, diagrams) all use fqns.
function annotate(units) {
  for (const u of units) u.fqn = u.data.parent ? `${u.data.parent}/${u.data.id}` : u.data.id;
  const byFqn = new Map(units.map((u) => [u.fqn, u]));
  for (const u of units) u.children = units.filter((c) => c.data.parent === u.fqn);
  return byFqn;
}
function topFqn(u) {
  let cur = u;
  while (cur.data.parent) cur = cur.parentUnit;
  return cur.fqn;
}
function dirOf(relPath) { return relPath.slice(0, relPath.lastIndexOf("/")); }
// Strict partition descent: start at the matching root unit, then descend
// into children while any exist. A subdivided unit never owns code directly;
// a file matching a subdivided unit's scope but no child is a GAP.
function descent(unitsByFqnOrUnits, relPath) {
  const units = Array.isArray(unitsByFqnOrUnits) ? unitsByFqnOrUnits : [...unitsByFqnOrUnits.values()];
  const isGo = relPath.endsWith(".go");
  const selectorMatch = (sel) => {
    if (sel.form === "path-prefix" && !isGo) return (dirOf(relPath) + "/").startsWith(sel.value + "/") || dirOf(relPath) === sel.value.replace(/\/$/, "");
    if (sel.form === "go-import-path" && isGo) return dirOf(relPath) === sel.value || dirOf(relPath).startsWith(sel.value + "/");
    return false;
  };
  const best = (list) => {
    let bestU = null, bestLen = -1;
    for (const u of list) {
      for (const sel of u.data.selectors || []) {
        if (selectorMatch(sel) && sel.value.length > bestLen) { bestU = u; bestLen = sel.value.length; }
      }
    }
    return bestU;
  };
  const path = [];
  let cur = best(units.filter((u) => !u.data.parent));
  while (cur) {
    path.push(cur);
    if (cur.children.length === 0) return { owner: cur, path, gap: null };
    const next = best(cur.children);
    if (!next) return { owner: null, path, gap: cur };
    cur = next;
  }
  return { owner: null, path: [], gap: null };
}
function analyze(units, rootDir) {
  annotate(units);
  for (const u of units) if (u.data.parent && !units.some((p) => p.fqn === u.data.parent)) {
    throw new Error(`unit ${u.data.id} references unknown parent ${u.data.parent}`);
  }
  for (const u of units) u.parentUnit = units.find((p) => p.fqn === u.data.parent);
  const files = walk(rootDir).filter((f) => f.endsWith(".ts") || f.endsWith(".go"));
  const owned = new Map(); // fqn -> Set(relPath)
  const scopeFiles = new Map(); // fqn -> Set(relPath) (every file that descended through the unit)
  const gaps = new Map(); // fqn -> Set(relPath) (files that stopped at a subdivided unit with no matching child)
  const rootUncovered = [];
  const edges = new Map(); // "srcFqn->dstFqn" -> [{ loc }]
  const langs = { typescript: { files: 0, owned: 0 }, go: { files: 0, owned: 0 } };
  let references = 0;
  let resolved = 0;
  const ownerOf = (relPath) => descent(units, relPath).owner;
  const whatOf = (line, isGo, goPath) => {
    if (isGo) return `uses ${goPath.split("/").pop()}`;
    const named = /import\s+(?:type\s+)?\{([^}]+)\}/.exec(line);
    if (named) return `imports ${named[1].split(",")[0].trim()}`;
    const def = /import\s+([A-Za-z_$][\w$]*)\s+from/.exec(line);
    if (def) return `uses ${def[1]}`;
    return "references";
  };
  for (const f of files) {
    const relPath = relative(rootDir, f).split("\\").join("/");
    const isGo = relPath.endsWith(".go");
    const lang = isGo ? "go" : "typescript";
    langs[lang].files += 1;
    const d = descent(units, relPath);
    for (const p of d.path) {
      if (!scopeFiles.has(p.fqn)) scopeFiles.set(p.fqn, new Set());
      scopeFiles.get(p.fqn).add(relPath);
    }
    if (d.gap) {
      if (!gaps.has(d.gap.fqn)) gaps.set(d.gap.fqn, new Set());
      gaps.get(d.gap.fqn).add(relPath);
    }
    if (d.owner) {
      langs[lang].owned += 1;
      if (!owned.has(d.owner.fqn)) owned.set(d.owner.fqn, new Set());
      owned.get(d.owner.fqn).add(relPath);
    } else if (!d.gap) {
      rootUncovered.push(relPath);
    }
    const lines = readFileSync(f, "utf8").split("\n");
    lines.forEach((line, i) => {
      let targetDir = null;
      if (!isGo) {
        const m = /from\s+["']([^"']+)["']/.exec(line);
        if (m) {
          references += 1;
          const fromDir = dirOf(relPath);
          const segs = [...fromDir.split("/"), ...m[1].split("/")];
          const out = [];
          for (const s of segs) {
            if (s === "." || s === "") continue;
            if (s === "..") out.pop();
            else out.push(s);
          }
          targetDir = out.join("/");
        }
      } else {
        const m = /"example\.com\/app\/(internal\/[^"]+)"/.exec(line);
        if (m) { references += 1; targetDir = m[1]; }
      }
      if (targetDir !== null) {
        const target = ownerOf(`${targetDir}/x${isGo ? ".go" : ".ts"}`);
        const src = d.owner;
        if (target && src && target.fqn !== src.fqn) {
          const key = `${src.fqn}->${target.fqn}`;
          if (!edges.has(key)) edges.set(key, []);
          edges.get(key).push({ loc: `${relPath}:${i + 1}`, what: whatOf(line, isGo, targetDir) });
          resolved += 1;
        }
      }
    });
  }
  return { owned, scopeFiles, gaps, rootUncovered, edges, langs, references, resolved, units };
}
function observedText(u, an) {
  const lines = [];
  for (const [key, locs] of an.edges) {
    const [src, dst] = key.split("->");
    if (src !== u.fqn) continue;
    lines.push(`- depends on ${dst}: ${locs.length} reference${locs.length > 1 ? "s" : ""} (${locs.slice(0, 3).map((x) => x.loc).join(", ")}, ${locs[0].what})`);
  }
  if (lines.length === 0) lines.push(`- no outgoing dependency on another unit (coverage complete)`);
  if (u.children.length > 0) {
    lines.push(`- no direct ownership: subdivided into ${u.children.map((c) => c.fqn).join(", ")}`);
    const scope = an.scopeFiles.get(u.fqn) || new Set();
    const gapSet = an.gaps.get(u.fqn) || new Set();
    lines.push(`- scope files: ${scope.size}, owned by sub-units: ${scope.size - gapSet.size}, gaps: ${gapSet.size ? [...gapSet].join(", ") : "none"}`);
  } else {
    lines.push(`- owned files: ${an.owned.get(u.fqn)?.size || 0}`);
  }
  return lines.join("\n") + "\n";
}

// ─── Mermaid: fully qualified labels; declared solid, side channel red,
//     unused yellow or orange; tier classes in diffs ────────────────────────

const TIER_STYLE = {
  "fix or optimization": "fill:#e2e3e5",
  feature: "fill:#fff3cd",
  "structural-import": "fill:#ffe5b4",
  structural: "fill:#f8d7da",
  new: "fill:#d1e7dd",
  removed: "fill:#ced4da",
};
function slug(s) { return s.replace(/[^a-z0-9]+/gi, "-"); }
function mermaidFor(nodes, ctx, an, opts = {}) {
  // nodes: units to draw (fully qualified labels, tier as a second line in
  // diffs). ctx: full annotated unit set. Root diagrams (opts.root) roll
  // sub-unit edges up to their root AU; unit diagrams draw the children and
  // their cross-boundary edges with fully qualified ghost targets. Edge
  // labels: declared relationships carry a few-word label; observed-but-
  // undeclared edges are prefixed [ND] with what is actually there; declared-
  // but-unobserved edges are prefixed [U] with what it should have been.
  const ids = new Set(nodes.map((u) => u.fqn));
  const root = !!opts.root;
  const mapId = (fqn) => (root ? topFqn(ctx.find((u) => u.fqn === fqn) || { data: { parent: null }, fqn }) : fqn);
  const tierOf = opts.tierOf || (() => null);
  const lines = [];
  const drawn = new Set();
  const node = (fqn, ghost) => {
    if (drawn.has(fqn)) return;
    drawn.add(fqn);
    const tier = tierOf(fqn);
    const label = tier && !ghost ? `${fqn}<br/>${tier}` : fqn;
    lines.push(`  ${slug(fqn)}["${label}"]`);
    if (tier && !ghost) lines.push(`  class ${slug(fqn)} tier-${slug(tier)}`);
  };
  const declaredRel = (s, d) => {
    for (const u of ctx) {
      if (mapId(u.fqn) !== s) continue;
      for (const r of u.data.declared_relationships || []) {
        if (mapId(r.target) === d) return r;
      }
    }
    return null;
  };
  const edgeLines = [];
  const linkStyles = [];
  let edgeIndex = 0;
  const addEdge = (a, b, kind, label) => {
    const key = `${a}|${b}|${kind}|${label}`;
    if (edgeLines.some((l) => l.key === key)) return;
    let line;
    if (kind === "side-channel") line = `  ${slug(a)} -.->|"[ND] ${label}"| ${slug(b)}`;
    else if (kind === "unused") line = `  ${slug(a)} -->|"[U] ${label}"| ${slug(b)}`;
    else line = `  ${slug(a)} -->|"${label}"| ${slug(b)}`;
    if (kind === "side-channel") linkStyles.push(`  linkStyle ${edgeIndex} stroke:#c0392b`);
    if (kind === "unused") linkStyles.push(`  linkStyle ${edgeIndex} stroke:#e67e22`);
    edgeLines.push({ key, line });
    edgeIndex += 1;
  };
  for (const u of nodes) node(u.fqn);
  for (const [key, locs] of an.edges) {
    const [src, dst] = key.split("->");
    const s = mapId(src);
    const d = mapId(dst);
    if (!ids.has(s) || s === d) continue;
    node(d, !ids.has(d));
    const rel = declaredRel(s, d);
    if (rel) addEdge(s, d, "plain", rel.label || "depends");
    else addEdge(s, d, "side-channel", locs[0].what);
  }
  for (const u of ctx) {
    const s = root ? topFqn(u) : (ids.has(u.fqn) ? u.fqn : null);
    if (s === null || !ids.has(s)) continue;
    for (const rel of u.data.declared_relationships || []) {
      const d = root ? topFqn(ctx.find((x) => x.fqn === rel.target) || u) : rel.target;
      if (s === d) continue;
      const observed = [...an.edges.keys()].some((k) => mapId(k.split("->")[0]) === s && mapId(k.split("->")[1]) === d);
      if (!observed) { node(d, !ids.has(d)); addEdge(s, d, "unused", rel.label || "declared"); }
    }
  }
  const all = [
    '%%{init: {"flowchart": {"nodeSpacing": 70, "rankSpacing": 110}}}%%',
    "graph TD", ...lines, ...edgeLines.map((e) => e.line), ...linkStyles,
  ];
  if (opts.tierOf) for (const [tier, fill] of Object.entries(TIER_STYLE)) all.push(`  classDef tier-${slug(tier)} ${fill}`);
  return "```mermaid\n" + all.join("\n") + "\n```\n";
}
function stripTierMermaid(fenced) {
  return fenced
    .split("\n")
    .filter((l) => !/^  classDef tier-/.test(l) && !/^  class \S+ tier-/.test(l))
    .map((l) => l.replace(/<br\/>(fix or optimization|feature|structural-import|structural|new|removed)/g, "").replace(/"~~([^"~]+)~~"/g, '"$1"'))
    .join("\n");
}

// ─── Fixture repository ────────────────────────────────────────────────────

function commit(repo, msg) {
  sh("git add -A", repo);
  sh(`git -c user.email=proto@example.com -c user.name=prototype commit -q -m ${JSON.stringify(msg)}`, repo);
}
function fixtureBase() {
  const f = (p, c) => write(join(REPO, p), c);
  f("go.mod", "module example.com/app\n\ngo 1.22\n");
  f("src/cli/main.ts", 'import { findRecords } from "../db/store";\n\nexport function main(args: string[]) {\n  return findRecords(args[0]);\n}\n');
  f("src/db/store.ts", 'import type { RecordRow } from "./records";\n\nexport function findRecords(q: string): RecordRow[] {\n  return q ? [] : [];\n}\n');
  f("src/db/records.ts", "export interface RecordRow { id: string; }\n");
  f("src/db/legacy.ts", "export function legacyQuery(q: string) { return q; }\n");
  f("src/core/model.ts", "export function buildModel(rows: unknown[]) { return { rows }; }\n");
  f("src/core/parsers/index.ts", 'import { findRecords } from "../../db/store";\n\nexport function parse(input: string) {\n  return findRecords(input);\n}\n');
  f("src/core/parsers/legacy.ts", "export function legacyParse(s: string) { return s; }\n");
  f("src/util/format.ts", "export function fmt(s: string) { return s.trim(); }\n");
  f("internal/db/store.go", "package db\n\ntype Store struct{ Path string }\n");
  f("internal/db/legacy.go", "package db\n\nfunc LegacyLookup(id string) string { return id }\n");
  sh("git init -q -b main", REPO);
  commit(REPO, "C0: base fixtures");
  return sh("git rev-parse HEAD", REPO);
}
function fixtureMutate() {
  const f = (p, c) => write(join(REPO, p), c);
  rmSync(join(REPO, "src/core/parsers"), { recursive: true });
  rmSync(join(REPO, "internal/db/legacy.go"));
  rmSync(join(REPO, "src/db/legacy.ts"));
  f("src/cli/main.ts", 'import { buildModel } from "../core/model";\n\nexport function main(args: string[]) {\n  return buildModel([args[0]]);\n}\n');
  f("src/db/replication/replicator.ts", 'import type { RecordRow } from "../records";\n\nexport function replicate(rows: RecordRow[]) { return rows; }\n');
  f("src/db/replication/config.ts", "export const replConfig = { intervalMs: 1000 };\n");
  f("src/db/schema/mapping.ts", 'import { fmt } from "../../util/format";\nimport { mapTable } from "./types";\n\nexport const mapping = mapTable(fmt("records"));\n');
  f("src/db/schema/types.ts", "export function mapTable(name: string) { return { name }; }\n");
  f("internal/db/schema/schema.go", "package schema\n\ntype Mapping struct{ Table string }\n");
  commit(REPO, "C2: fixture changes (replication and schema modules, cli import switch, parsers and legacy removal)");
  return sh("git rev-parse HEAD", REPO);
}

// ─── Base architecture (per the settled schema, strictly partitioned) ──────

function unitDoc(id, parent, selectors, declared, intendedApi, prose) {
  const data = { type: "unit", id, parent, selectors, declared_relationships: declared, intended_api: intendedApi };
  let body = `# ${id}\n\n## Responsibility\n\n${prose.responsibility}\n\n## Boundary\n\n${prose.boundary}\n\n## Rationale\n\n${prose.rationale}\n`;
  for (const rel of declared) {
    body += `\n## Relationship: ${rel.target} (${rel.kind})\n\n${rel.note || `Depends on ${rel.target}.`}\n`;
  }
  return { data, body };
}
function writeBaseArchitecture(baseSha) {
  const units = [
    unitDoc("database", null,
      [{ form: "path-prefix", value: "src/db" }, { form: "go-import-path", value: "internal/db" }],
      [{ target: "core", kind: "depends-on", label: "uses domain model", note: "The database layer may use the shared domain model." }],
      ["record store interface"],
      { responsibility: "Own persistence and querying of records, in TypeScript and Go.",
        boundary: "No CLI parsing, no domain policy. Callers reach it through the record store interface.",
        rationale: "One write path for records keeps replication and queries coherent." }),
    unitDoc("cli", null,
      [{ form: "path-prefix", value: "src/cli" }],
      [{ target: "database", kind: "depends-on", label: "reads records", note: "The CLI reads records through the database unit." }],
      ["main entry point"],
      { responsibility: "Parse arguments and orchestrate one run.",
        boundary: "No business logic, no direct storage access beyond declared dependencies.",
        rationale: "A thin shell keeps the entry point replaceable." }),
    unitDoc("core", null,
      [{ form: "path-prefix", value: "src/core" }], [], ["buildModel"],
      { responsibility: "Shared domain model and input handling.",
        boundary: "No persistence, no CLI.",
        rationale: "A shared vocabulary prevents duplicated record handling." }),
    unitDoc("model", "core",
      [{ form: "path-prefix", value: "src/core" }], [], ["buildModel"],
      { responsibility: "The domain model types and builders.",
        boundary: "Everything in core outside the parsers sub-unit.",
        rationale: "The remaining scope of core once parsers was carved out." }),
    unitDoc("parsers", "core",
      [{ form: "path-prefix", value: "src/core/parsers" }], [], ["parse"],
      { responsibility: "Parse raw input for the core domain model.",
        boundary: "Only core/parsers output feeds the domain model.",
        rationale: "Isolates input syntax from the domain model." }),
    unitDoc("util", null,
      [{ form: "path-prefix", value: "src/util" }], [], ["fmt"],
      { responsibility: "Small formatting helpers.",
        boundary: "Depends on nothing.",
        rationale: "Keeps trivia out of the domain units." }),
  ];
  const an = analyze(units, REPO);
  const place = (u) => {
    const hasChildren = u.children.length > 0;
    const rel = hasChildren ? `${u.fqn}/index.md` : u.data.parent ? `${u.fqn}.md` : `${u.fqn}.md`;
    let b = u.body + `\n## Observed\n\n${observedText(u, an)}`;
    if (hasChildren) {
      b += `\n## Diagram\n\n${mermaidFor(u.children, units, an)}\n`;
    }
    write(join(ARCH, rel), renderDoc(u.data, b));
  };
  for (const u of units) place(u);
  const rootUnits = units.filter((u) => !u.data.parent);
  const rootData = {
    type: "architecture", version: 1, described_commit: baseSha,
    providers: [
      { language: "typescript", provider: "native-ts", tier: "native-semantic", provider_version: "5.9.2", grammar_version: null,
        inventory: { in_scope: an.langs.typescript.files, owned: an.langs.typescript.owned, unowned: an.langs.go.unowned + an.langs.typescript.files - an.langs.typescript.owned },
        dependencies: { references: an.references, resolved: an.resolved, unresolved: an.references - an.resolved } },
      { language: "go", provider: "tree-sitter", tier: "exact-syntax", provider_version: "0.24.4", grammar_version: "go-v0.23.4",
        inventory: { in_scope: an.langs.go.files, owned: an.langs.go.owned, unowned: an.langs.go.files - an.langs.go.owned },
        dependencies: { references: 0, resolved: 0, unresolved: 0 } },
    ],
    replacement_history: [],
  };
  write(join(ARCH, "index.md"), renderDoc(rootData,
    `# Architecture\n\n## Overview\n\nRoot units: the CLI reads through core, the database unit owns persistence, util holds trivia. The database unit declares a dependency on core that no code uses yet, and the core/parsers sub-unit reaches into the database unit undeclared.\n\n## Diagram\n\n${mermaidFor(rootUnits, units, an, { root: true })}\n## Units\n\n${rootUnits.map((u) => `- ${u.fqn}${u.children.length ? "\n" + u.children.map((c) => `  - ${c.fqn}`).join("\n") : ""}`).join("\n")}\n`));
  commit(REPO, "C1: fit base architecture (described_commit: C0)");
}

// ─── Shared tree helpers ────────────────────────────────────────────────────

function readArchitecture(dir) {
  const root = parseDoc(join(dir, "index.md"));
  const units = walk(dir)
    .filter((f) => f.endsWith(".md") && f !== join(dir, "index.md"))
    .map((f) => parseDoc(f));
  return { root, units };
}
function makeWorktree(repo, path, sha) {
  if (existsSync(path)) sh(`git worktree remove --force ${JSON.stringify(path)}`, repo);
  sh(`git worktree add --detach ${JSON.stringify(path)} ${sha}`, repo);
  return path;
}
function placeUnit(dir, u, allUnits, an) {
  const hasChildren = allUnits.some((x) => x.data.parent === u.fqn && !(x.data.change && x.data.change.op === "removed-unit"));
  let rel = hasChildren ? `${u.fqn}/index.md` : u.data.parent ? `${u.fqn}.md` : `${u.fqn}.md`;
  let body = u.body;
  if (sectionMap(body).has("Observed")) body = replaceSection(body, "Observed", observedText(u, an));
  else body += `\n## Observed\n\n${observedText(u, an)}`;
  write(join(dir, rel), renderDoc(u.data, body));
  return rel;
}
function copyTree(src, dst) {
  for (const f of walk(src)) write(join(dst, relative(src, f)), readFileSync(f, "utf8"));
}

// ─── Diff generation ───────────────────────────────────────────────────────

function generateDiff(sourceDir, outDir, headSha) {
  const { root, units } = readArchitecture(sourceDir);
  annotate(units);
  for (const u of units) u.parentUnit = units.find((p) => p.fqn === u.data.parent);
  const wt = makeWorktree(REPO, WT, "HEAD");
  const an = analyze(units, wt);
  const baseAn = analyze(units, makeWorktree(REPO, join(TMP, "wt-base"), root.data.described_commit));
  const baseFiles = new Set(sh(`git ls-tree -r --name-only ${root.data.described_commit}`, REPO).split("\n").filter(Boolean));

  const subtreeOf = (analysis, u) => {
    const out = new Set();
    for (const [fqn, files] of analysis.owned) {
      if (fqn === u.fqn || fqn.startsWith(u.fqn + "/")) for (const f of files) out.add(f);
    }
    return out;
  };
  const records = {};
  const drop = new Set();
  for (const u of units) {
    const before = subtreeOf(baseAn, u);
    const after = subtreeOf(an, u);
    if (after.size === 0 && u.children.length === 0) { drop.add(u.fqn); continue; }
    const recs = [];
    const added = [...after].filter((f) => !before.has(f));
    const removed = [...before].filter((f) => !after.has(f));
    if (added.length) recs.push({ scope: "ownership", note: `new code fits this unit's scope: ${added.join(", ")}` });
    if (removed.length) recs.push({ scope: "ownership", note: `owned code removed: ${removed.join(", ")}` });
    records[u.fqn] = recs;
  }
  // Sub-unit proposal heuristic (mock): group new files per unit by module
  // name (last path segment) across languages; >= 3 files proposes a
  // sub-unit. Strict partitioning then forces a rest sub-unit covering the
  // remainder of the parent's scope.
  const groups = new Map();
  for (const f of walk(wt)) {
    const rel = relative(wt, f).split("\\").join("/");
    if (!(rel.startsWith("src/") || rel.startsWith("internal/")) || !/\.(ts|go)$/.test(rel)) continue;
    if (baseFiles.has(rel)) continue;
    const d = descent(units, rel);
    const owner = d.owner || d.gap;
    if (!owner) continue;
    const modName = dirOf(rel).split("/").pop();
    const key = `${owner.fqn}:${modName}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(rel);
  }
  const newUnits = [];
  const proposals = [];
  const partitioned = new Set(); // fqns of units gaining their first child
  for (const [key, files] of groups) {
    if (files.length < 3) continue;
    const [parentFqn, modName] = [key.slice(0, key.lastIndexOf(":")), key.slice(key.lastIndexOf(":") + 1)];
    const parent = units.find((u) => u.fqn === parentFqn);
    if (!parent) continue;
    const tsDirs = [...new Set(files.filter((f) => f.endsWith(".ts")).map((f) => dirOf(f)))];
    newUnits.push({
      data: { type: "unit", id: modName, parent: parentFqn, selectors: tsDirs.map((d) => ({ form: "path-prefix", value: d })),
        declared_relationships: [], intended_api: [] },
      body: `# ${modName}\n\n## Responsibility\n\nOwns the ${modName} module inside ${parentFqn}.\n\n## Boundary\n\nPart of ${parentFqn}; no direct consumers outside it.\n\n## Rationale\n\nA distinct module with its own set of files.\n`,
    });
    proposals.push({ id: `promote-${modName}`, unit: parentFqn, note: `promote the new ${modName} module (${files.length} files) to a sub-unit of ${parentFqn}`, status: "open" });
    if (parent.children.length === 0) partitioned.add(parentFqn);
  }
  // Strict partitioning: every parent that gains its first sub-unit also
  // needs a rest sub-unit covering the remainder of its scope.
  for (const parentFqn of partitioned) {
    const parent = units.find((u) => u.fqn === parentFqn);
    const claimed = new Set(newUnits.filter((n) => n.data.parent === parentFqn).flatMap((n) => n.data.selectors.map((s) => s.value)));
    const remaining = [...subtreeOf(an, parent)].filter((f) => !baseFiles.has(f) || ![...claimed].some((c) => dirOf(f).startsWith(c)));
    const preExisting = [...subtreeOf(an, parent)].filter((f) => baseFiles.has(f) && ![...claimed].some((c) => dirOf(f).startsWith(c)));
    const nameSource = (preExisting.length ? preExisting : remaining).sort()[0];
    const restId = nameSource.slice(nameSource.lastIndexOf("/") + 1).replace(/\.(ts|go)$/, "");
    newUnits.push({
      data: { type: "unit", id: restId, parent: parentFqn, selectors: JSON.parse(JSON.stringify(parent.data.selectors)),
        declared_relationships: [], intended_api: [] },
      body: `# ${restId}\n\n## Responsibility\n\nOwns the remainder of ${parentFqn}'s scope after the new sub-units were carved out.\n\n## Boundary\n\nEverything in ${parentFqn} not claimed by the sibling sub-units.\n\n## Rationale\n\nStrict partitioning: sub-units of ${parentFqn} tile its scope as disjoint sets.\n`,
    });
    proposals.push({ id: `partition-${restId}`, unit: parentFqn, note: `strict partitioning requires a rest sub-unit for the remainder of ${parentFqn}'s scope (proposed as ${parentFqn}/${restId})`, status: "open" });
  }
  // Hierarchy records.
  for (const n of newUnits) {
    if (!records[n.data.parent]) records[n.data.parent] = [];
    records[n.data.parent].push({ scope: "hierarchy", note: `gained sub-unit ${n.data.parent}/${n.data.id}` });
  }
  for (const u of units) {
    const lost = u.children.filter((c) => drop.has(c.fqn));
    if (lost.length) records[u.fqn].push({ scope: "hierarchy", note: `lost sub-unit ${lost.map((c) => c.fqn).join(", ")}` });
  }
  // Declared relationship proposals are drafted against the post-promotion
  // unit set (a new sub-unit's imports propose that sub-unit's declaration),
  // labeled from the observed evidence (what is actually there).
  const candidates = [...units.filter((u) => !drop.has(u.fqn)), ...newUnits];
  const anCand = analyze(candidates, wt);
  const proposedRels = new Map();
  for (const [key, locs] of anCand.edges) {
    const [src, dst] = key.split("->");
    const u = anCand.units.find((x) => x.fqn === src);
    if (!u) continue;
    const dstTop = topFqn(anCand.units.find((x) => x.fqn === dst));
    const declared = (u.data.declared_relationships || []).some((r) => r.target === dstTop);
    if (!declared) {
      if (!proposedRels.has(src)) proposedRels.set(src, []);
      if (!proposedRels.get(src).some((r) => r.target === dstTop)) proposedRels.get(src).push({ target: dstTop, kind: "depends-on", label: locs[0].what });
    }
  }
  for (const [src, rels] of proposedRels) {
    if (!records[src]) records[src] = [];
    if (units.some((x) => x.fqn === src)) records[src].push(...rels.map((rel) => ({ field: "declared_relationships", op: "add", value: rel })));
  }
  proposals.push({ id: "merge-core-into-database", note: "cli now depends on core and database; consider merging core into database to simplify the dependency graph", status: "open" });
  const ORDER = ["fix or optimization", "feature", "structural-import", "structural", "new", "removed"];
  const tierFor = (fqn) => {
    if (drop.has(fqn)) return "removed";
    if (newUnits.some((n) => `${n.data.parent}/${n.data.id}` === fqn)) return "new";
    const recs = records[fqn] || [];
    const kinds = recs.map((r) => {
      if (r.field === "declared_relationships") return "structural-import";
      if (r.scope === "hierarchy") return "structural";
      if (r.scope === "ownership" && r.note.startsWith("new code fits")) return "feature";
      return "fix or optimization";
    });
    const idxs = kinds.map((k) => ORDER.indexOf(k));
    return idxs.length ? ORDER[Math.max(...idxs)] : null;
  };

  // Build the complete diff tree: every unit present, changed ones carry a
  // change block; proposed declarations are drafted into the model with a
  // review note; proposed new units are drafted in.
  rmSync(outDir, { recursive: true, force: true });
  const outUnits = [];
  for (const u of units) {
    const data = JSON.parse(JSON.stringify(u.data));
    if (drop.has(u.fqn)) {
      data.change = { category: "removed", op: "removed-unit" };
    } else {
      const recs = [...(records[u.fqn] || [])];
      const rels = proposedRels.get(u.fqn) || [];
      for (const rel of rels) {
        data.declared_relationships = [...(data.declared_relationships || []), rel];
      }
      if (recs.length) data.change = { category: tierFor(u.fqn), records: recs };
    }
    let body = u.body;
    const proposed = proposedRels.get(u.fqn) || [];
    for (const rel of proposed) {
      body = insertSectionBefore(body, "Observed", `Relationship: ${rel.target} (${rel.kind})`,
        `Depends on ${rel.target}.\n\n> Review note: proposed by the diff from the observed import; confirm or remove during review.`);
    }
    outUnits.push({ data, body });
  }
  for (const n of newUnits) {
    const fqn = `${n.data.parent}/${n.data.id}`;
    const rels = proposedRels.get(fqn) || [];
    const data = JSON.parse(JSON.stringify(n.data));
    for (const rel of rels) data.declared_relationships = [...(data.declared_relationships || []), rel];
    let body = n.body;
    for (const rel of rels) {
      body = insertSectionBefore(body, "Observed", `Relationship: ${rel.target} (${rel.kind})`,
        `Depends on ${rel.target}.\n\n> Review note: proposed by the diff from the observed import; confirm or remove during review.`);
    }
    outUnits.push({ data: { ...data, change: { category: "new", op: "added-unit" } }, body });
  }
  annotate(outUnits);
  for (const u of outUnits) u.parentUnit = outUnits.find((p) => p.fqn === u.data.parent);
  const an2 = analyze(outUnits, wt);
  for (const u of outUnits) placeUnit(outDir, u, outUnits, an2);
  const tierOf = (fqn) => outUnits.find((u) => u.fqn === fqn)?.data.change?.category || null;
  for (const u of outUnits) {
    if (u.children.length === 0) continue;
    const rel = `${u.fqn}/index.md`;
    const doc = parseDoc(join(outDir, rel));
    let body = doc.body;
    const fence = mermaidFor(u.children, outUnits, an2, { tierOf });
    if (sectionMap(body).has("Diagram")) body = replaceSection(body, "Diagram", fence.trimEnd() + "\n");
    else body = body.trimEnd() + `\n\n## Diagram\n\n${fence}`;
    write(join(outDir, rel), renderDoc(doc.data, body));
  }
  const rootOut = {
    ...root.data, base_commit: root.data.described_commit, described_commit: headSha, proposals,
    providers: [
      { language: "typescript", provider: "native-ts", tier: "native-semantic", provider_version: "5.9.2", grammar_version: null,
        inventory: { in_scope: an2.langs.typescript.files, owned: an2.langs.typescript.owned, unowned: an2.langs.typescript.files - an2.langs.typescript.owned },
        dependencies: { references: an2.references, resolved: an2.resolved, unresolved: an2.references - an2.resolved } },
      { language: "go", provider: "tree-sitter", tier: "exact-syntax", provider_version: "0.24.4", grammar_version: "go-v0.23.4",
        inventory: { in_scope: an2.langs.go.files, owned: an2.langs.go.owned, unowned: an2.langs.go.files - an2.langs.go.owned },
        dependencies: { references: 0, resolved: 0, unresolved: 0 } },
    ],
  };
  const rootUnits = outUnits.filter((u) => !u.data.parent);
  const rollup = outUnits.filter((u) => !u.data.parent).map((u) => {
    const t = tierOf(u.fqn);
    return `- ${u.fqn}${t ? ` [${t}]` : ""}${u.children.length ? "\n" + u.children.map((c) => `  - ${c.fqn}${tierOf(c.fqn) ? ` [${tierOf(c.fqn)}]` : ""}`).join("\n") : ""}`;
  }).join("\n");
  write(join(outDir, "index.md"), renderDoc(rootOut,
    `# Architecture\n\n## Overview\n\nRoot units: the CLI reads through core, the database unit owns persistence with the new schema and replication modules, util holds trivia. The database unit still declares a dependency on core that no code uses.\n\n## Diagram\n\n${mermaidFor(rootUnits, outUnits, an2, { root: true, tierOf })}\n## Units\n\n${rollup}\n\n## Diff summary\n\n- base commit: ${root.data.described_commit}\n- head commit: ${headSha}\n- tiers: ${outUnits.map((u) => `${u.fqn}=${tierFor(u.fqn) || "unchanged"}`).join(", ")}\n- open proposals: ${proposals.map((p) => p.id).join(", ")}\n`));
  return { outUnits, an: an2, drop, newUnits, tierOf, proposals };
}

// ─── Review simulation ─────────────────────────────────────────────────────

function applyReview(reviewedDir) {
  // Localized assignment: the proposed schema sub-unit missed the Go module;
  // the operator extends it during review.
  // Rejection: the operator rejects schema's drafted depends-on util (schema
  // must format internally), removing the declaration, its prose section,
  // and its change record, leaving the observed edge undeclared ([ND]).
  const schemaPath = join(reviewedDir, "database", "schema.md");
  const schema = parseDoc(schemaPath);
  schema.data.selectors = [...schema.data.selectors, { form: "go-import-path", value: "internal/db/schema" }];
  schema.data.declared_relationships = (schema.data.declared_relationships || []).filter((r) => r.target !== "util");
  if (schema.data.change && schema.data.change.records) {
    schema.data.change.records = schema.data.change.records.filter((r) => !(r.field === "declared_relationships" && r.value.target === "util"));
  }
  schema.body = schema.body.replace(/\n## Relationship: util \(depends-on\)\n[\s\S]*?(?=\n## |$)/, "\n");
  schema.body += `> Review note: the Go module belongs here too, added during review.\n`;
  schema.body += `> Review note: rejected the drafted depends-on util; schema formats internally.\n`;
  write(schemaPath, renderDoc(schema.data, schema.body));
  // Refresh the Observed bookkeeping and re-render the diagrams under the
  // reviewed unit set (review happens in the diff operation's context, which
  // may analyze; update may not).
  const { units } = readArchitecture(reviewedDir);
  const anR = analyze(units, WT);
  const tierOfR = (fqn) => units.find((u) => u.fqn === fqn)?.data.change?.category || null;
  for (const u of anR.units) {
    const hasChildren = u.children.length > 0;
    const rel = hasChildren ? `${u.fqn}/index.md` : `${u.fqn}.md`;
    const doc = parseDoc(join(reviewedDir, rel));
    let body = doc.body;
    if (sectionMap(body).has("Observed")) body = replaceSection(body, "Observed", observedText(u, anR));
    if (hasChildren) {
      const fence = mermaidFor(u.children, units, anR, { tierOf: tierOfR });
      body = replaceSection(body, "Diagram", fence.trimEnd() + "\n");
    }
    write(join(reviewedDir, rel), renderDoc(doc.data, body));
  }
  // Root diagram re-render plus proposal dispositions: promote and
  // partition accepted (with the Go adjustment), merge deferred.
  const rootDoc = parseDoc(join(reviewedDir, "index.md"));
  const rootUnitsR = units.filter((u) => !u.data.parent);
  const rootFence = mermaidFor(rootUnitsR, units, anR, { root: true, tierOf: tierOfR });
  rootDoc.body = replaceSection(rootDoc.body, "Diagram", rootFence.trimEnd() + "\n");
  rootDoc.data.proposals = rootDoc.data.proposals.map((p) =>
    p.id === "merge-core-into-database"
      ? { ...p, status: "deferred", operator_note: "keep core separate; revisit after replication stabilizes" }
      : { ...p, status: "accepted", operator_note: p.id === "promote-schema" ? "accepted with the Go module added to the sub-unit" : "accepted as required by strict partitioning" });
  write(join(reviewedDir, "index.md"), renderDoc(rootDoc.data, rootDoc.body));
}

// ─── Update: mechanical removal of the review layer ────────────────────────

function update(reviewedDir, outDir, headSha, when) {
  const { root, units } = readArchitecture(reviewedDir);
  const open = (root.data.proposals || []).filter((p) => p.status === "open");
  if (open.length) throw new Error(`update refuses: open proposals remain: ${open.map((p) => p.id).join(", ")}`);
  const keep = units.filter((u) => !(u.data.change && u.data.change.op === "removed-unit"));
  for (const u of keep) {
    for (const rel of u.data.declared_relationships || []) {
      const heading = `Relationship: ${rel.target} (${rel.kind})`;
      if (!sectionMap(u.body).has(heading)) {
        throw new Error(`update refuses: ${u.fqn} declares ${rel.target} without prose section "${heading}"`);
      }
    }
  }
  rmSync(outDir, { recursive: true, force: true });
  annotate(keep);
  const survivingChildren = (fqn) => keep.filter((u) => u.data.parent === fqn);
  for (const u of keep) {
    const data = { ...u.data };
    delete data.change;
    const hasChildren = survivingChildren(u.fqn).length > 0;
    const rel = hasChildren ? `${u.fqn}/index.md` : `${u.fqn}.md`;
    let body = u.body
      .replace(/^> Review note:.*\n/gm, "")
      .replace(/\n{3,}/g, "\n\n");
    if (sectionMap(body).has("Diagram")) {
      const children = survivingChildren(u.fqn);
      if (children.length === 0) {
        body = body.replace(/\n## Diagram\n\n```mermaid[\s\S]*?```\n/, "\n");
      } else {
        const m = /## Diagram\n\n(```mermaid\n[\s\S]*?```\n)/.exec(body);
        if (m) body = replaceSection(body, "Diagram", stripTierMermaid(m[1]).trimEnd() + "\n");
      }
    }
    // The Observed tiling enumeration is tree-derived, so update rewrites it
    // from the surviving children; edges and counts stay verbatim. (Degenerate
    // case left to the spec: a parent whose children were ALL removed.)
    const kids = survivingChildren(u.fqn);
    if (kids.length > 0) {
      body = body.replace(/- no direct ownership: subdivided into [^\n]*/,
        `- no direct ownership: subdivided into ${kids.map((c) => c.fqn).join(", ")}`);
    }
    write(join(outDir, rel), renderDoc(data, body));
  }
  const rootOut = { ...root.data };
  delete rootOut.base_commit;
  delete rootOut.proposals;
  rootOut.described_commit = headSha;
  rootOut.replacement_history = [...(root.data.replacement_history || []), { from_commit: root.data.base_commit, to_commit: headSha, at: when }];
  const rootBody = root.body
    .replace(/^> Review note:.*\n/gm, "")
    .replace(/\n## Diff summary\n[\s\S]*$/, "\n")
    .replace(/## Diagram\n\n(```mermaid\n[\s\S]*?```\n)/, (_, mm) => `## Diagram\n\n${stripTierMermaid(mm)}`)
    .replace(/^- (\S+) \[[^\]]+\](.*)$/gm, "- $1$2");
  const rollup = keep.filter((u) => !u.data.parent).map((u) => {
    const children = survivingChildren(u.fqn);
    return `- ${u.fqn}${children.length ? "\n" + children.map((c) => `  - ${c.fqn}`).join("\n") : ""}`;
  }).join("\n");
  const cleanedRollup = rootBody.replace(/## Units\n\n[\s\S]*?(\n\n## |$)/, `## Units\n\n${rollup}\n`);
  write(join(outDir, "index.md"), renderDoc(rootOut, cleanedRollup));
  return { rootOut, keep };
}

// ─── Main ──────────────────────────────────────────────────────────────────

rmSync(TMP, { recursive: true, force: true });
rmSync(ART, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

log("== Building fixture repository");
const baseSha = fixtureBase();
log(`   base commit C0: ${baseSha}`);
writeBaseArchitecture(baseSha);
const headSha = fixtureMutate();
log(`   head commit C2: ${headSha}`);
sh(`git diff ${baseSha}..${headSha} -- src internal > ${JSON.stringify(join(TMP, "code-changes.diff"))}`, REPO);

log("== Generating the complete highlighted diff");
const diffState = generateDiff(ARCH, DIFF_DIR, headSha);
log(`   tiers: ${diffState.outUnits.map((u) => `${u.fqn}=${diffState.tierOf(u.fqn) || "unchanged"}`).join(", ")}`);

log("== Demonstrating the update gate (unreviewed diff must be refused)");
let gateRefused = false;
try { update(DIFF_DIR, join(TMP, "arch-gate"), headSha, new Date().toISOString()); }
catch (e) { gateRefused = /open proposals remain/.test(e.message); }
check("G1 update refuses a diff with open proposals", gateRefused);

log("== Simulating operator review (localized assignment accepted, broader proposal deferred)");
copyTree(DIFF_DIR, REVIEWED_DIR);
applyReview(REVIEWED_DIR);

log("== Proving update consumes only the reviewed diff (original moved away)");
if (existsSync(ARCH_BAK)) rmSync(ARCH_BAK, { recursive: true, force: true });
sh(`mv ${JSON.stringify(ARCH)} ${JSON.stringify(ARCH_BAK)}`, REPO);
const when = new Date().toISOString();
let cleanState;
try { cleanState = update(REVIEWED_DIR, CLEAN_DIR, headSha, when); }
finally { sh(`mv ${JSON.stringify(ARCH_BAK)} ${JSON.stringify(ARCH)}`, REPO); }
log(`   clean units: ${cleanState.keep.map((u) => u.fqn).join(", ")}`);

// ─── Verification ─────────────────────────────────────────────────────────

log("== Verifying");
const base = readArchitecture(ARCH);
const clean = readArchitecture(CLEAN_DIR);
const reviewed = readArchitecture(REVIEWED_DIR);
annotate(base.units); for (const u of base.units) u.parentUnit = base.units.find((p) => p.fqn === u.data.parent);
annotate(clean.units); for (const u of clean.units) u.parentUnit = clean.units.find((p) => p.fqn === u.data.parent);
annotate(reviewed.units); for (const u of reviewed.units) u.parentUnit = reviewed.units.find((p) => p.fqn === u.data.parent);
const byFqn = (arch) => new Map(arch.units.map((u) => [u.fqn, u]));
const baseU = byFqn(base), cleanU = byFqn(clean), reviewedU = byFqn(reviewed);

let v1 = true;
const v1d = [];
for (const id of ["database", "core", "util", "core/model"]) {
  if (authoredSections(baseU.get(id).body) !== authoredSections(cleanU.get(id).body)) { v1 = false; v1d.push(id); }
}
const cliBase = authoredSections(baseU.get("cli").body);
const cliClean = authoredSections(cleanU.get("cli").body);
if (!(cliClean.startsWith(cliBase) && cliClean.slice(cliBase.length).trim() === "## Relationship: core (depends-on)\nDepends on core.")) {
  v1 = false; v1d.push("cli");
}
check("V1 authored prose preserved (database, core, util, core/model exactly; cli gains only the reviewed relationship section)", v1, v1d.join(","));

check("V1b authored prose in clean equals the reviewed diff's authored prose (update altered nothing)",
  clean.units.every((u) => authoredSections(u.body) === authoredSections(reviewedU.get(u.fqn).body)));

let v2 = true;
for (const id of ["database", "cli", "core", "util", "core/model"]) {
  if (JSON.stringify(baseU.get(id).data.selectors) !== JSON.stringify(cleanU.get(id).data.selectors)) v2 = false;
}
check("V2 fitted assignments (selectors) unchanged for pre-existing units", v2);

const wtVerify = makeWorktree(REPO, join(TMP, "wt-verify"), "HEAD");
const reviewedUnits = reviewed.units.filter((u) => !(u.data.change && u.data.change.op === "removed-unit"));
const anVerify = analyze(reviewedUnits, wtVerify);
let v3 = true;
const v3d = [];
for (const u of clean.units) {
  const want = observedText(u, anVerify).trim();
  const got = (sectionMap(u.body).get("Observed") || "").trim();
  if (want !== got) { v3 = false; v3d.push(u.fqn); }
}
check("V3 observed sections in clean == analysis of HEAD over the reviewed unit set (edges, owned files, tiling)", v3, v3d.join(","));

let v4 = true;
const v4hits = [];
for (const f of walk(CLEAN_DIR).filter((x) => x.endsWith(".md"))) {
  const text = readFileSync(f, "utf8");
  for (const marker of ["change: ", "base_commit:", "proposals:", "category", "tier-", "Review note", "Diff summary", "promote-", "partition-", "merge-core"]) {
    if (text.includes(marker)) { v4 = false; v4hits.push(`${relative(CLEAN_DIR, f)}: ${marker}`); }
  }
}
check("V4 no review markup remains in the clean architecture", v4, v4hits.slice(0, 4).join("; "));

check("V5 update consumed only the reviewed diff (original architecture was moved away during update)",
  existsSync(ARCH) && existsSync(join(CLEAN_DIR, "index.md")));

check("V6 core/parsers removed, database/schema present with the reviewed Go selector, database/store present, util byte-identical",
  !cleanU.has("core/parsers") &&
  JSON.stringify(cleanU.get("database/schema").data.selectors) === JSON.stringify([
    { form: "path-prefix", value: "src/db/schema" },
    { form: "go-import-path", value: "internal/db/schema" },
  ]) &&
  cleanU.has("database/store") &&
  readFileSync(join(ARCH, "util.md"), "utf8") === readFileSync(join(CLEAN_DIR, "util.md"), "utf8"));

const r = clean.root.data;
check("V7 root provenance (described_commit = HEAD, base_commit gone, replacement entry recorded)",
  r.described_commit === headSha && r.base_commit === undefined &&
  JSON.stringify(r.replacement_history) === JSON.stringify([{ from_commit: baseSha, to_commit: headSha, at: when }]));

const cliDeclared = cleanU.get("cli").data.declared_relationships.map((x) => x.target).sort();
check("V8 clean keeps the reviewed declared relationships (cli: core and database; database unchanged; schema's drafted util rejected)",
  JSON.stringify(cliDeclared) === JSON.stringify(["core", "database"]) &&
  JSON.stringify(cleanU.get("database").data.declared_relationships) === JSON.stringify(baseU.get("database").data.declared_relationships) &&
  (cleanU.get("database/schema").data.declared_relationships || []).length === 0 &&
  sectionMap(cleanU.get("cli").body).has("Relationship: core (depends-on)"));

// V9: dirty working tree run
log("== Dirty working tree run");
write(join(REPO, "src/cli/main.ts"), 'import { fmt } from "../util/format";\n' + readFileSync(join(REPO, "src/cli/main.ts"), "utf8"));
write(join(REPO, "src/db/scratch.ts"), "export const scratch = 1;\n");
const porcelainBefore = sh("git status --porcelain", REPO);
generateDiff(ARCH, DIFF_DIR_DIRTY, headSha);
const porcelainAfter = sh("git status --porcelain", REPO);
const wtHead = sh(`git -C ${JSON.stringify(WT)} rev-parse HEAD`, ".");
let detached = true;
try { sh(`git -C ${JSON.stringify(WT)} symbolic-ref -q HEAD`, "."); detached = false; } catch { }
const sameOutput = (() => {
  const a = walk(DIFF_DIR).map((f) => relative(DIFF_DIR, f)).sort();
  const b = walk(DIFF_DIR_DIRTY).map((f) => relative(DIFF_DIR_DIRTY, f)).sort();
  if (JSON.stringify(a) !== JSON.stringify(b)) return false;
  return a.every((rel) => readFileSync(join(DIFF_DIR, rel), "utf8") === readFileSync(join(DIFF_DIR_DIRTY, rel), "utf8"));
})();
check("V9 dirty run: detached worktree at HEAD, original tree and index unchanged, identical diff output",
  porcelainBefore === porcelainAfter && wtHead === headSha && detached && sameOutput);
execSync(`git -C ${JSON.stringify(REPO)} checkout -- src/cli/main.ts`);
rmSync(join(REPO, "src/db/scratch.ts"));

let v10 = true;
const v10d = [];
for (const u of base.units) if (!reviewedU.has(u.fqn)) { v10 = false; v10d.push(`${u.fqn} missing from diff`); }
if (reviewedU.get("util").data.change) { v10 = false; v10d.push("util carries a change block"); }
if (!reviewedU.get("database").data.change) { v10 = false; v10d.push("database has no change block"); }
check("V10 diff is complete (all base units present; util unchanged without a change block, database changed)", v10, v10d.join(","));

// V11: strict partition invariants hold in base, reviewed, and clean.
const partitionOk = (arch, dir, label) => {
  const an = analyze(arch.units, dir);
  const gapTotal = [...an.gaps.values()].reduce((n, s) => n + s.size, 0);
  const subdividedOwning = an.units.filter((u) => u.children.length > 0 && (an.owned.get(u.fqn) || new Set()).size > 0);
  return gapTotal === 0 && an.rootUncovered.length === 0 && subdividedOwning.length === 0
    ? { ok: true }
    : { ok: false, detail: `${label}: gaps ${gapTotal}, root uncovered ${an.rootUncovered.length}, subdivided owning directly ${subdividedOwning.map((u) => u.fqn).join(",")}` };
};
const p1 = partitionOk(base, REPO, "base");
const p2 = partitionOk(reviewed, WT, "reviewed");
const p3 = partitionOk(clean, wtVerify, "clean");
check("V11 strict partitioning holds in base, reviewed, and clean (no gaps, full root coverage, subdivided units own nothing directly)",
  p1.ok && p2.ok && p3.ok, [p1, p2, p3].filter((p) => !p.ok).map((p) => p.detail).join("; "));

// V12: negative control, removing a rest sub-unit must surface as a visible gap.
const brokenUnits = base.units.filter((u) => u.fqn !== "core/model").map((u) => ({ data: JSON.parse(JSON.stringify(u.data)), body: u.body }));
const anBroken = analyze(brokenUnits, REPO);
const brokenGaps = [...anBroken.gaps.values()].reduce((n, s) => n + s.size, 0);
const coreObserved = observedText(anBroken.units.find((u) => u.fqn === "core"), anBroken);
check("V12 negative control: without core/model the gap is visible (1 gap, core's Observed names src/core/model.ts)",
  brokenGaps === 1 && coreObserved.includes("gaps: src/core/model.ts"));

// V13: diagram conventions: spacing directive, few-word edge labels, [U]/[ND]
// prefixes with descriptions, tier second lines in diffs, stripped in clean.
const diagOf = (p) => readFileSync(p, "utf8");
const d1 = diagOf(join(DIFF_DIR, "index.md"));
const d2 = diagOf(join(ARCH, "index.md"));
const d3 = diagOf(join(CLEAN_DIR, "index.md"));
const d4 = diagOf(join(DIFF_DIR, "database", "index.md"));
const d5 = diagOf(join(REVIEWED_DIR, "database", "index.md"));
check("V13 diagram conventions: spacing, few-word edge labels, [U]/[ND] prefixed descriptions, tier second lines in diff only",
  d1.includes('"nodeSpacing": 70, "rankSpacing": 110') &&
  d1.includes('cli["cli<br/>structural-import"]') &&
  d1.includes('-->|"imports buildModel"| core') &&
  d1.includes('-->|"[U] reads records"| database') &&
  d1.includes('-->|"[U] uses domain model"| core') &&
  d1.includes('-->|"imports fmt"| util') &&
  d2.includes('-->|"reads records"| database') &&
  d2.includes('-.->|"[ND] imports findRecords"| database') &&
  d2.includes('-->|"[U] uses domain model"| core') &&
  d4.includes('database-schema["database/schema<br/>new"]') &&
  d5.includes('-.->|"[ND] imports fmt"| util') &&
  d3.includes('-.->|"[ND] imports fmt"| util') &&
  d3.includes('[U] uses domain model') &&
  !d3.includes("<br/>") &&
  !d3.includes("tier-"));

// V14: no duplicated section headings anywhere (a replaceSection misuse
// doubled ## Diagram headings during development; this pins the fix).
let v14 = true;
const v14d = [];
for (const dir of [ARCH, DIFF_DIR, REVIEWED_DIR, CLEAN_DIR]) {
  for (const f of walk(dir).filter((x) => x.endsWith(".md"))) {
    const seen = new Set();
    for (const p of sections(parseDoc(f).body)) {
      if (!p.heading) continue;
      if (seen.has(p.heading)) { v14 = false; v14d.push(`${relative(TMP, f)}: ${p.heading}`); }
      seen.add(p.heading);
    }
  }
}
check("V14 no duplicated section headings in any architecture file (base, diff, reviewed, clean)", v14, v14d.slice(0, 3).join("; "));

// ─── Artifacts and report ─────────────────────────────────────────────────

copyTree(ARCH, join(ART, "01-base-architecture"));
copyFileSync(join(TMP, "code-changes.diff"), join(ART, "02-code-changes.diff"));
copyTree(DIFF_DIR, join(ART, "03-diff-architecture"));
copyTree(REVIEWED_DIR, join(ART, "04-reviewed-diff-architecture"));
copyTree(CLEAN_DIR, join(ART, "05-clean-architecture"));
write(join(ART, "06-verification-report.txt"), report.join("\n") + "\n");
write(join(ART, "07-dirty-run-report.txt"),
  `porcelain before:\n${porcelainBefore}\n\nporcelain after:\n${porcelainAfter}\n\ndetached worktree at HEAD: ${detached} (${wtHead})\nidentical diff output: ${sameOutput}\n`);

log("");
log("== Verification report ==");
for (const line of report) log("   " + line);
log("");
if (failures.length) {
  log(`FAILURES: ${failures.join(", ")}`);
  process.exit(1);
}
log("All checks passed.");
