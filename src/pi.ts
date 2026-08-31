/**
 * task-workflow v2 — single extension entry point.
 *
 * Registers task_* tools for artifact operations on the docs/tasks/ planning
 * tree, plus lifecycle hooks for coding guidelines and pi-subagents checks.
 *
 * Principles:
 * - One file, one extension. No split entry points.
 * - Core modules are pure data (no file I/O).
 * - All file I/O is in this file.
 * - Algorithms belong in tools, not in skill prose.
 * - Slice resolution works (fixed from v1 FEEDBACK).
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve as resolvePath } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI, BeforeAgentStartEvent, BeforeAgentStartEventResult, ExtensionContext, InputEvent, InputEventResult } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import YAML from "yaml";

import { parse, dump, type Document, type FrontmatterData } from "./core/frontmatter.js";
import { fromFrontmatter, sliceInfoFrom, dependencyLevels, type Artifact, type ArtifactKind, type SliceInfo, type WorkItemInfo } from "./core/art.js";
import { toObject, fromObject, type WorkflowState } from "./core/state.js";
import { FrontmatterError, ResolutionError } from "./core/err.js";
import { resolveGate, type ResolveGateResult } from "./core/repo-gate.js";

// ─── Gated skill names (shared by strip + invocation gate) ─────────────────────

const FALLBACK_GATED_SKILL_NAMES = [
  "task-overview",
  "onboard-workflow",
  "wayfinder",
  "implement-task",
  "finalize-task",
  "report-bug",
];

function loadGatedSkillNames(): { names: string[]; diagnostics: string[] } {
  const diagnostics: string[] = [];
  try {
    const pkgPath = resolvePath(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "package.json",
    );
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as Record<string, unknown>;
    const piSection = pkg.pi as Record<string, unknown> | undefined;
    const skills = piSection?.skills;
    if (Array.isArray(skills) && skills.every((s) => typeof s === "string")) {
      return { names: (skills as string[]).map((s) => basename(s)), diagnostics };
    }
    diagnostics.push(
      "skill-strip: package.json pi.skills is missing or not an array of strings; using fallback list",
    );
  } catch (e) {
    diagnostics.push(
      `skill-strip: failed to read package.json pi.skills: ${(e as Error).message}; using fallback list`,
    );
  }
  return { names: FALLBACK_GATED_SKILL_NAMES, diagnostics };
}

const { names: GATED_SKILL_NAMES, diagnostics: SKILL_NAME_DIAGNOSTICS } = loadGatedSkillNames();

/**
 * Block explicit `/skill:<gated-name>` invocations in a work repo. The input
 * event fires before `_expandSkillCommand`, so returning `{ action: "handled" }`
 * prevents the skill from being loaded. Non-gated `/skill:` inputs and all
 * other input pass through unchanged.
 */
async function gateSkillInvocation(
  event: InputEvent,
  ctx: ExtensionContext,
): Promise<InputEventResult> {
  const text = event.text;
  if (!text.startsWith("/skill:")) {
    return { action: "continue" };
  }
  const spaceIndex = text.indexOf(" ");
  const name = text.slice(7, spaceIndex === -1 ? undefined : spaceIndex);
  if (!name) {
    return { action: "continue" };
  }
  if (GATED_SKILL_NAMES.includes(name)) {
    ctx.ui.notify(
      `task-workflow is gated in this work repo; not loading ${name}`,
      "warning",
    );
    return { action: "handled" };
  }
  return { action: "continue" };
}

/**
 * Strip the gated workflow skills from the system prompt's `<available_skills>`
 * block when running in a work repo. If the block becomes empty, drop the whole
 * block including its preamble. If the prompt lacks an `<available_skills>`
 * block, log a diagnostic and return the prompt unchanged.
 */
async function stripSkills(
  event: BeforeAgentStartEvent,
  ctx: ExtensionContext,
): Promise<BeforeAgentStartEventResult> {
  const prompt = event.systemPrompt;
  const blockOpen = "<available_skills>";
  const blockClose = "</available_skills>";
  const blockStart = prompt.indexOf(blockOpen);
  if (blockStart === -1) {
    ctx.ui.notify(
      "skill-strip: expected an <available_skills> block, found none; format may have changed",
      "warning",
    );
    return { systemPrompt: prompt };
  }
  const blockEnd = prompt.indexOf(blockClose, blockStart);
  if (blockEnd === -1) {
    ctx.ui.notify(
      "skill-strip: expected a closing </available_skills> tag; format may have changed",
      "warning",
    );
    return { systemPrompt: prompt };
  }
  const blockEndAfter = blockEnd + blockClose.length;
  const beforeBlock = prompt.slice(0, blockStart);
  const inner = prompt.slice(blockStart + blockOpen.length, blockEnd);
  const afterBlock = prompt.slice(blockEndAfter);

  const gatedSet = new Set(GATED_SKILL_NAMES);
  let remainingSkillCount = 0;
  const strippedInner = inner.replace(/<skill>([\s\S]*?)<\/skill>/g, (match, content) => {
    const nameMatch = content.match(/<name>([\s\S]*?)<\/name>/);
    const name = nameMatch ? nameMatch[1].trim() : "";
    if (gatedSet.has(name)) {
      return "";
    }
    remainingSkillCount++;
    return match;
  });

  if (remainingSkillCount === 0) {
    // Drop the whole block plus its preamble.
    const lines = beforeBlock.split("\n");
    let preambleLineIndex = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].includes("The following skills")) {
        preambleLineIndex = i;
        break;
      }
    }
    if (preambleLineIndex === -1) {
      return { systemPrompt: beforeBlock + afterBlock };
    }
    const preambleLineStart =
      preambleLineIndex === 0
        ? 0
        : lines.slice(0, preambleLineIndex).join("\n").length + 1;
    let blankRunLength = 0;
    for (let i = preambleLineStart - 1; i >= 0 && prompt[i] === "\n"; i--) {
      blankRunLength++;
    }
    const sectionStart = preambleLineStart - blankRunLength;
    return { systemPrompt: prompt.slice(0, sectionStart) + afterBlock };
  }

  return {
    systemPrompt: beforeBlock + blockOpen + strippedInner + blockClose + afterBlock,
  };
}

// ─── File system helpers ──────────────────────────────────────────────────────

const SLICE_RE = /^(\d+)-(.+)\.md$/;

function findRoot(start: string): string {
  let dir = resolvePath(start);
  while (true) {
    if (existsSync(join(dir, "docs", "tasks")) || existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return resolvePath(start);
}

function taskRoot(root: string): string {
  return join(root, "docs", "tasks");
}

function isDir(p: string): boolean {
  try { return statSync(p).isDirectory(); } catch { return false; }
}

function isFile(p: string): boolean {
  try { return statSync(p).isFile(); } catch { return false; }
}

function readYaml(p: string): unknown {
  return YAML.parse(readFileSync(p, "utf-8"));
}

function writeYaml(p: string, data: unknown): void {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, YAML.stringify(data, { sortMapEntries: false, indentSeq: false, lineWidth: 0 }), "utf-8");
}

// ─── Artifact resolution ──────────────────────────────────────────────────────

function isInitialized(root: string): boolean {
  return isDir(taskRoot(root));
}

function listSubdirs(base: string, skip: Set<string> = new Set()): string[] {
  if (!isDir(base)) return [];
  return readdirSync(base).sort().filter((n) => isDir(join(base, n)) && !skip.has(n));
}

function parseArtifactFile(path: string, kind: ArtifactKind): { art: Artifact; doc: Document } {
  const text = readFileSync(path, "utf-8");
  const doc = parse(text);
  const art = fromFrontmatter(doc.data);
  return { art, doc };
}

/** Resolve a slug or path to an artifact file path and its frontmatter document. */
function resolveArt(root: string, selector: string, want?: ArtifactKind): { path: string; doc: Document; art: Artifact } {
  const base = taskRoot(root);

  // Try as explicit path
  let target = "";
  if (existsSync(selector)) target = resolvePath(selector);
  else if (existsSync(join(process.cwd(), selector))) target = resolvePath(process.cwd(), selector);
  else if (isAbsolute(selector) && existsSync(selector)) target = resolvePath(selector);

  if (target) {
    if (isDir(target)) {
      const ep = join(target, "map.md");
      const tp = join(target, "task.md");
      target = isFile(ep) ? ep : isFile(tp) ? tp : target;
    }
    if (isFile(target)) {
      try {
        const { art, doc } = parseArtifactFile(target, want ?? "slice" as ArtifactKind);
        if (want && art.kind !== want) throw new ResolutionError(`'${selector}' has kind '${art.kind}', not '${want}'`);
        return { path: target, doc, art };
      } catch (e) {
        if (e instanceof FrontmatterError) throw new ResolutionError(`'${selector}' is not a recognised artifact`);
        throw e;
      }
    }
    throw new ResolutionError(`'${selector}' is not a recognised artifact`);
  }

  // Try as slug: scan maps, tasks, then slices
  const candidates: { path: string; art: Artifact; doc: Document }[] = [];
  const scanFile = (p: string) => {
    if (!isFile(p)) return;
    try {
      const { art, doc } = parseArtifactFile(p, "task" as ArtifactKind);
      candidates.push({ path: p, art, doc });
    } catch { /* skip unparseable */ }
  };

  // Scan maps
  for (const sub of listSubdirs(join(base, "maps"))) {
    scanFile(join(base, "maps", sub, "map.md"));
  }

  // Scan tasks
  const taskDirs = listSubdirs(base, new Set(["maps", "archive", "state.yaml", "CHANGELOG.md"]));
  for (const sub of taskDirs) {
    scanFile(join(base, sub, "task.md"));
  }

  // Filter by slug
  const hits = candidates.filter((c) => c.art.slug === selector || basename(dirname(c.path)) === selector);

  // If not found and want allows slices, scan slices
  if (hits.length === 0 && want !== "map" && want !== "task") {
    // Try with active task context from state.yaml
    const statePath = join(base, "state.yaml");
    let activeTask: string | null = null;
    if (existsSync(statePath)) {
      try {
        const parsed = readYaml(statePath) as any;
        activeTask = parsed?.task ?? null;
      } catch { /* ignore */ }
    }
    if (activeTask) {
      const slicesDir = join(base, activeTask, "slices");
      if (isDir(slicesDir)) {
        for (const name of readdirSync(slicesDir).sort()) {
          const m = name.match(SLICE_RE);
          if (!m) continue;
          const sp = join(slicesDir, name);
          try {
            const { art: sliceArt, doc: sliceDoc } = parseArtifactFile(sp, "slice" as ArtifactKind);
            if (sliceArt.slug === selector || name === selector) {
              return { path: sp, doc: sliceDoc, art: sliceArt };
            }
          } catch { /* skip */ }
        }
      }
    }
    // Full scan as fallback
    for (const sub of taskDirs) {
      const slicesDir = join(base, sub, "slices");
      if (!isDir(slicesDir)) continue;
      for (const name of readdirSync(slicesDir).sort()) {
        if (name === "archive" || !name.match(SLICE_RE)) continue;
        const sp = join(slicesDir, name);
        try {
          const { art: sliceArt, doc: sliceDoc } = parseArtifactFile(sp, "slice" as ArtifactKind);
          if (sliceArt.slug === selector || name === selector) {
            hits.push({ path: sp, art: sliceArt, doc: sliceDoc });
          }
        } catch { /* skip */ }
      }
    }
  }

  if (hits.length === 0) throw new ResolutionError(`no ${want ?? "artifact"} matches '${selector}'`);
  if (hits.length > 1) throw new ResolutionError(`'${selector}' is ambiguous — matches multiple artifacts`);
  return hits[0];
}

function activeSlices(root: string, taskSlug: string): { number: number; slug: string; path: string; status: string | null }[] {
  const sd = join(taskRoot(root), taskSlug, "slices");
  if (!isDir(sd)) return [];
  const out: { number: number; slug: string; path: string; status: string | null }[] = [];
  for (const name of readdirSync(sd).sort()) {
    if (name === "archive" || name.startsWith(".")) continue;
    const m = name.match(SLICE_RE);
    if (!m) continue;
    const path = join(sd, name);
    try {
      const { art } = parseArtifactFile(path, "slice" as ArtifactKind);
      out.push({ number: parseInt(m[1], 10), slug: m[2], path, status: art.status });
    } catch { /* skip */ }
  }
  return out;
}

function taskInfoFromPath(path: string): WorkItemInfo | null {
  try {
    const { art } = parseArtifactFile(path, "task");
    const blocked = art.data.blocked_by;
    return {
      slug: art.slug,
      status: art.status,
      type: typeof art.data.type === "string" ? art.data.type : null,
      size: typeof art.data.size === "string" ? art.data.size : null,
      blocked_by: Array.isArray(blocked) ? blocked.map(String) : [],
    };
  } catch {
    return null;
  }
}

function taskPathForSlug(root: string, slug: string): string | null {
  const base = taskRoot(root);
  const candidates = [join(base, slug, "task.md")];
  for (const sub of listSubdirs(base, new Set(["maps", "archive"]))) {
    candidates.push(join(base, sub, "task.md"));
  }
  for (const p of candidates) if (isFile(p)) {
    const info = taskInfoFromPath(p);
    if (info?.slug === slug) return p;
  }
  return null;
}

function mapChildInfos(root: string, mapPath: string): WorkItemInfo[] {
  const { doc } = parseArtifactFile(mapPath, "map");
  const children = Array.isArray(doc.data.tasks) ? doc.data.tasks : [];
  const out: WorkItemInfo[] = [];
  for (const child of children) {
    if (typeof child === "string") {
      const p = taskPathForSlug(root, child);
      const info = p ? taskInfoFromPath(p) : null;
      if (info) out.push(info);
      continue;
    }
    if (!child || typeof child !== "object") continue;
    const slug = String((child as any).slug ?? "");
    if (!slug) continue;
    const p = taskPathForSlug(root, slug);
    const info = p ? taskInfoFromPath(p) : null;
    if (info) {
      const listedBlocked = (child as any).blocked_by;
      if (Array.isArray(listedBlocked) && listedBlocked.length > 0) info.blocked_by = listedBlocked.map(String);
      if ((child as any).done === true && info.status !== "done") info.status = "done";
      out.push(info);
    }
  }
  return out;
}

// ─── State helpers ─────────────────────────────────────────────────────────────

function loadState(root: string): WorkflowState {
  const sp = join(taskRoot(root), "state.yaml");
  if (!existsSync(sp)) return { task: null, slice: null };
  try { return fromObject(readYaml(sp)); } catch { return { task: null, slice: null }; }
}

function saveState(root: string, state: WorkflowState): void {
  writeYaml(join(taskRoot(root), "state.yaml"), toObject(state));
}

// ─── Context helpers ───────────────────────────────────────────────────────────

function profileText(root: string): string {
  const p = join(root, "docs", "tasks", "profile.md");
  if (existsSync(p) && statSync(p).isFile()) return readFileSync(p, "utf-8");
  return "";
}

function artifactSchemaRef(): string {
  return [
    "## Frontmatter schema",
    "",
    "### Task (task.md)",
    "kind: task | slug: <kebab> | title: <text> | type: research | prototype | grilling | manual | feature | bug |",
    "  map: <slug> | blocked_by: [<slug>, ...] | status: proposed | blocked | ready | in-progress | done |",
    "  size: s | m | l | xl | started_at: <ISO> | completed_at: <ISO>",
    "",
    "### Legacy Slice (slices/<n>-<slug>.md)",
    "kind: slice | slug: <kebab> | title: <text> | task: ../task.md |",
    "  mode: hitl | afk | status: todo | in-progress | done |",
    "  size: s | m | l | xl | blocked_by: [<slug>, ...] |",
    "  started_at: <ISO> | completed_at: <ISO>",
    "",
    "### Map (map.md)",
    "kind: map | slug: <kebab> | title: <text> |",
    "  tasks: [{slug, blocked_by, done}, ...] | status: draft | active | done |",
    "  started_at: <ISO> | completed_at: <ISO>",
    "",
    "The map and task bodies are the specification; there is no separate ticket-generation phase.",
  ].join("\n");
}

// ─── Tool factory ──────────────────────────────────────────────────────────────

interface Tool {
  description: string;
  args: Record<string, unknown>;
  execute(args: Record<string, any>, ctx: { directory: string }): Promise<string>;
}

function def(description: string, args: Record<string, unknown>, exec: (args: any, ctx: any) => Promise<string>): Tool {
  return { description, args, execute: exec };
}

const Str = (d: string) => ({ type: "string" as const, description: d });
const OptStr = (d: string) => ({ type: "string" as const, optional: true as const, description: d });
const Bool = (d: string) => ({ type: "boolean" as const, description: d });
const OptBool = { type: "boolean" as const, optional: true as const };

export function createTools(): Record<string, Tool> {
  return {
    task_show: def(
      "Show artifact frontmatter (map, task, or slice).",
      { selector: Str("Slug or path"), json: OptBool },
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        const { art, doc } = resolveArt(root, p.selector);
        if (p.json) return JSON.stringify(art, null, 2);
        return Object.entries(doc.data).map(([k, v]) => {
          if (Array.isArray(v)) return `${k}: ${JSON.stringify(v)}`;
          return `${k}: ${String(v)}`;
        }).join("\n");
      },
    ),

    task_get: def(
      "Print a single frontmatter field of an artifact.",
      { selector: Str("Slug or path"), field: Str("Field name") },
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        const { doc } = resolveArt(root, p.selector);
        return doc.data[p.field] === undefined ? "" : String(doc.data[p.field]);
      },
    ),

    task_set: def(
      "Set a scalar frontmatter field (auto-typed: int, bool, null, string).",
      { selector: Str("Slug or path"), field: Str("Field name"), value: Str("New value") },
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        const { path, doc } = resolveArt(root, p.selector);
        let v: unknown = p.value;
        const lc = p.value.toLowerCase();
        if (lc === "true") v = true;
        else if (lc === "false") v = false;
        else if (lc === "null") v = null;
        else if (/^-?\d+$/.test(p.value)) v = parseInt(p.value, 10);
        else if (/^-?\d+\.\d+$/.test(p.value)) v = parseFloat(p.value);
        doc.data[p.field] = v;
        writeFileSync(path, dump(doc), "utf-8");
        return `${p.field} = ${p.value}`;
      },
    ),

    task_set_slices: def(
      "Set a task's `slices:` list to the given slice slugs.",
      { selector: Str("Task slug or path"), slugs: { type: "array" as const, items: Str("Slice slug") } },
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        const { path, doc } = resolveArt(root, p.selector, "task");
        doc.data["slices"] = p.slugs as string[];
        writeFileSync(path, dump(doc), "utf-8");
        return `slices: [${(doc.data["slices"] as string[]).join(", ")}]`;
      },
    ),

    task_resolve: def(
      "Resolve a slug or path to the artifact's file path.",
      { selector: Str("Slug or path"), kind: OptStr("map, task, or slice") },
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        return resolveArt(root, p.selector, p.kind as ArtifactKind | undefined).path;
      },
    ),

    task_assert_kind: def(
      "Assert an artifact's kind (map/task/slice). Fails on mismatch.",
      { selector: Str("Slug or path"), kind: { type: "string" as const, enum: ["map", "task", "slice"] } },
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        const { art } = resolveArt(root, p.selector);
        if (art.kind !== p.kind) throw new Error(`'${p.selector}' has kind '${art.kind}', not '${p.kind}'.`);
        return `kind: ${p.kind} — OK`;
      },
    ),

    task_list: def(
      "List artifacts. Excludes archived by default.",
      {
        kind: { type: "string" as const, optional: true, enum: ["map", "task"] },
        status: OptStr("Status filter"),
        map: OptStr("Map slug filter"),
        json: OptBool,
      },
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        if (!isInitialized(root)) return "(no docs/tasks directory)";
        const base = taskRoot(root);
        const arts: { slug: string; kind: string; status: string | null; map?: string }[] = [];

        const scanDir = (dir: string, leaf: string, kind: string) => {
          for (const sub of listSubdirs(dir)) {
            const f = join(dir, sub, leaf);
            if (!isFile(f)) continue;
            try {
              const { art } = parseArtifactFile(f, kind as ArtifactKind);
              const map = art.data.map as string | undefined;
              arts.push({ slug: art.slug, kind: art.kind, status: art.status, map });
            } catch { /* skip */ }
          }
        };

        if (p.kind !== "task") scanDir(join(base, "maps"), "map.md", "map");
        if (p.kind !== "map") scanDir(base, "task.md", "task");

        let filtered = arts;
        if (p.status) filtered = filtered.filter((a) => a.status === p.status);
        if (p.map) filtered = filtered.filter((a) => a.map === p.map);

        if (p.json) return JSON.stringify(filtered, null, 2);
        return filtered.map((a) => `${a.slug} (${a.kind})${a.status ? ` [${a.status}]` : ""}`).join("\n") || "(empty)";
      },
    ),

    task_slices: def(
      "List a task's active (non-archived) slice docs.",
      { selector: Str("Task slug or path"), json: OptBool },
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        const { art } = resolveArt(root, p.selector, "task");
        const slices = activeSlices(root, art.slug);
        if (p.json) return JSON.stringify(slices, null, 2);
        return slices.length === 0 ? "(no open slices)" : slices.map((s) => `${s.number} — ${s.slug}${s.status ? ` [${s.status}]` : ""}`).join("\n");
      },
    ),

    task_finalizable: def(
      "Check a task is ready to finalize (no active slice docs).",
      { selector: Str("Task slug or path") },
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        const { art } = resolveArt(root, p.selector, "task");
        const slices = activeSlices(root, art.slug);
        if (slices.length === 0) return "ready to finalize";
        throw new Error(`task '${art.slug}' has ${slices.length} open slice(s): ${slices.map((s) => `${s.number}`).join(", ")}`);
      },
    ),

    task_dependency_levels: def(
      "Compute BFS dependency levels from a map's unfinished tasks or a legacy task's remaining slices.",
      { selector: Str("Map or task slug") },
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        const resolved = resolveArt(root, p.selector);
        if (resolved.art.kind === "map") {
          const children = mapChildInfos(root, resolved.path);
          const remaining = children.filter((item) => item.status !== "done");
          const levels = dependencyLevels(remaining);
          return JSON.stringify({ levels, remaining_count: remaining.length, done_count: children.length - remaining.length }, null, 2);
        }
        if (resolved.art.kind !== "task") throw new ResolutionError(`'${p.selector}' must resolve to a map or task`);
        const rawSlices = activeSlices(root, resolved.art.slug);
        const remaining = rawSlices.filter((s) => s.status !== "done");
        const done = rawSlices.filter((s) => s.status === "done");
        const slicesInfo: SliceInfo[] = remaining.map((s) => {
          const sp = join(dirname(resolved.path), "slices", `${s.number}-${s.slug}.md`);
          try {
            const parsed = parse(readFileSync(sp, "utf-8"));
            return sliceInfoFrom(`${s.number}-${s.slug}.md`, parsed.data);
          } catch {
            return { number: s.number, slug: s.slug, status: s.status, size: null, blocked_by: [] };
          }
        });
        const levels = dependencyLevels(slicesInfo);
        return JSON.stringify({ levels, remaining_count: remaining.length, done_count: done.length }, null, 2);
      },
    ),

    task_frontier: def(
      "List a map's unfinished tasks whose blockers are complete.",
      { selector: Str("Map slug or path"), json: OptBool },
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        const resolved = resolveArt(root, p.selector, "map");
        const children = mapChildInfos(root, resolved.path);
        const done = new Set(children.filter((item) => item.status === "done").map((item) => item.slug));
        const frontier = children.filter((item) => item.status !== "done" && item.blocked_by.every((blocker) => done.has(blocker)));
        if (p.json) return JSON.stringify(frontier, null, 2);
        return frontier.length === 0 ? "(empty frontier)" : frontier.map((item) => `${item.slug}${item.type ? ` (${item.type})` : ""}`).join("\n");
      },
    ),

    task_map_tasks: def(
      "List a map's planned child tasks with their done state.",
      { selector: Str("Map slug or path"), json: OptBool },
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        const { doc } = resolveArt(root, p.selector, "map");
        const tasks = doc.data["tasks"];
        if (!Array.isArray(tasks)) return "(no child tasks planned yet)";
        const lines = tasks.map((t: any) => `${t.slug}${t.done ? " ✓" : ""}${t.blocked_by?.length ? ` blocked_by: ${t.blocked_by.join(", ")}` : ""}`);
        return p.json ? JSON.stringify(tasks, null, 2) : lines.join("\n");
      },
    ),

    task_map_tick: def(
      "Mark a map's child task as finalized (done: true).",
      { selector: Str("Map slug or path"), task_slug: Str("Child task slug") },
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        const { path, doc } = resolveArt(root, p.selector, "map");
        const tasks = Array.isArray(doc.data["tasks"]) ? [...doc.data["tasks"]] : [];
        for (const c of tasks) {
          if ((c as any).slug === p.task_slug) {
            (c as any).done = true;
            doc.data["tasks"] = tasks;
            writeFileSync(path, dump(doc), "utf-8");
            return `${p.task_slug} → done`;
          }
        }
        throw new Error(`no task '${p.task_slug}' in map`);
      },
    ),

    task_map_finalizable: def(
      "Check every child task of a map is finalized.",
      { selector: Str("Map slug or path") },
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        const { doc } = resolveArt(root, p.selector, "map");
        const tasks = Array.isArray(doc.data["tasks"]) ? doc.data["tasks"] : [];
        const undone = tasks.filter((t: any) => !t.done).map((t: any) => t.slug || "?");
        if (undone.length === 0) return "ready to finalize — all children done";
        throw new Error(`unfinished children: ${undone.join(", ")}`);
      },
    ),

    task_state: def(
      "Show the current workflow state from state.yaml.",
      {},
      async (_p, ctx) => {
        const root = findRoot(ctx.directory);
        const s = loadState(root);
        return [
          `task:  ${s.task ?? "(none)"}`,
          `slice: ${s.slice ?? "(none)"}`,
        ].join("\n");
      },
    ),

    task_state_set: def(
      "Set a workflow state field (task or slice). Use 'null' to clear.",
      { field: Str("Field: 'task' or 'slice'"), value: Str("New value (or 'null')") },
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        if (!isInitialized(root)) mkdirSync(taskRoot(root), { recursive: true });
        const s = loadState(root);
        const v = p.value === "null" ? null : p.value;
        if (p.field === "task") s.task = v;
        else if (p.field === "slice") s.slice = v;
        else throw new Error(`unknown field '${p.field}' — use 'task' or 'slice'`);
        saveState(root, s);
        return `${p.field} = ${v ?? "null"}`;
      },
    ),

    task_context: def(
      "Return project context: artifact schema + optional profile.",
      {},
      async (_p, ctx) => {
        const root = findRoot(ctx.directory);
        const profile = profileText(root);
        const schema = artifactSchemaRef();
        return profile ? `${schema}\n\n---\n\n## Project profile\n\n${profile}` : schema;
      },
    ),
  };
}

// ─── Pi extension entry point ──────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  let gate: ResolveGateResult;
  try {
    gate = resolveGate(process.cwd());
  } catch (e) {
    const message = (e as Error).message;
    gate = {
      active: false,
      reason: `gate detection failed: ${message}`,
      diagnostics: [message],
    };
  }
  const tools = createTools();

  if (!gate.active) {
    for (const [name, def] of Object.entries(tools)) {
      const params: Record<string, any> = {};
      for (const [k, v] of Object.entries(def.args)) {
        const vv = v as any;
        if (vv.type === "string") {
          params[k] = vv.enum
            ? Type.Union((vv.enum as string[]).map((e: string) => Type.Literal(e)))
            : Type.String({ description: vv.description ?? "" });
        } else if (vv.type === "boolean") {
          params[k] = Type.Boolean({ description: vv.description ?? "" });
        } else if (vv.type === "array") {
          params[k] = Type.Array(Type.String({ description: vv.items?.description ?? "" }));
        }
        if (vv.optional && params[k]) params[k] = Type.Optional(params[k]);
      }

      pi.registerTool({
        name,
        label: name.replace(/^task_/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        description: def.description,
        parameters: Type.Object(params),
        async execute(_id: string, args: any, _sig: any, _upd: any, ctx: any) {
          const result = await def.execute(args, { directory: ctx.cwd });
          return { content: [{ type: "text", text: result }], details: {} };
        },
      });
    }
  }

  // ── notify_user tool ────────────────────────────────────────────────
  if (!gate.active) {
    pi.registerTool({
      name: "notify_user",
      label: "Notify User",
      description: "Send a notification to the user's configured ntfy platform.",
      parameters: Type.Object({
        title: Type.Optional(Type.String({ description: "Notification title" })),
        message: Type.String({ description: "Message body" }),
        priority: Type.Optional(Type.Union([Type.Literal("low"), Type.Literal("normal"), Type.Literal("high")])),
      }),
      async execute(_id: string, params: any) {
        const cfgPath = join(process.env.HOME || "~", ".unipi", "config", "notify", "config.json");
        if (!existsSync(cfgPath)) {
          return { content: [{ type: "text", text: "No ntfy config found." }], details: { sent: false } };
        }
        try {
          const cfg = JSON.parse(readFileSync(cfgPath, "utf-8"));
          const ntfy = cfg.ntfy;
          if (!ntfy?.enabled || !ntfy?.topic) {
            return { content: [{ type: "text", text: "ntfy not enabled or no topic configured." }], details: { sent: false } };
          }
          const url = `${(ntfy.serverUrl || "https://ntfy.sh").replace(/\/+$/, "")}/${encodeURIComponent(ntfy.topic)}`;
          const headers: Record<string, string> = { "Content-Type": "text/plain" };
          if (ntfy.token) headers["Authorization"] = `Bearer ${ntfy.token}`;
          if (params.title) headers["Title"] = params.title;
          const pMap: Record<string, number> = { low: 2, normal: 3, high: 5 };
          headers["Priority"] = String(pMap[params.priority] ?? 3);
          const resp = await fetch(url, { method: "POST", headers, body: params.message });
          return {
            content: [{ type: "text", text: resp.ok ? "Notification sent." : `Failed (HTTP ${resp.status}).` }],
            details: { sent: resp.ok },
          };
        } catch (e) {
          return { content: [{ type: "text", text: `Notification error: ${(e as Error).message}` }], details: { sent: false } };
        }
      },
    });
  }

  // ── Guidelines tools ──────────────────────────────────────────────────

  // Track discovered guidelines in memory
  type GuidelineEntry = { file: string; content: string; topics: string[]; source: "docs" | "root" };
  let guidelinesCache = new Map<string, GuidelineEntry>();
  let shouldInjectGuidelines = true;

  const EXT_TO_LANG: Record<string, string> = {
    ".ts": "typescript", ".tsx": "typescript", ".js": "javascript", ".py": "python",
    ".rs": "rust", ".go": "go", ".rb": "ruby", ".java": "java", ".kt": "kotlin",
    ".swift": "swift", ".c": "c", ".cpp": "cpp", ".nix": "nix", ".sh": "bash",
    ".md": "markdown", ".json": "json", ".yaml": "yaml", ".yml": "yaml",
  };

  const SKIP_DIRS = new Set(["node_modules", ".git", ".venv", "dist", "build", "coverage", "__pycache__"]);

  // Single source of truth for the 12 Fowler smells is skills/code-review/smells.md.
  // This inlined copy is a fallback floor; keep it in sync with that file.
  const SMELL_BASELINE = `# Smell baseline

Twelve Fowler code smells from _Refactoring_, chapter 3. The Standards axis of \`/code-review\` carries this list as a floor when the repo documents no overriding standard. Each smell is a labelled heuristic — "possible Feature Envy" — never a hard violation.

## Mysterious Name

**What it is:** a function, variable, type, or module whose name does not reveal what it does or holds.

**How to fix:** rename it so the intent is honest and obvious. If no honest name comes to mind, the underlying design is probably still murky — clarify the responsibility first.

## Duplicated Code

**What it is:** the same logical shape appears in more than one hunk or file in the change.

**How to fix:** extract the shared shape into a single place and call it from both sites.

## Feature Envy

**What it is:** a function or method reaches into another object's data more than it uses its own.

**How to fix:** move the behaviour onto the object whose data it envies.

## Data Clumps

**What it is:** the same few fields or parameters keep travelling together, as if they want to become one type.

**How to fix:** bundle them into a single small type and pass that around instead of the loose fields.

## Primitive Obsession

**What it is:** a primitive or string is used to represent a domain concept that deserves its own type.

**How to fix:** give the concept its own small value type or enum so the domain meaning is explicit.

## Repeated Switches

**What it is:** the same \`switch\` or \`if\`-cascade on the same type recurs across the change.

**How to fix:** replace the repeated dispatch with polymorphism, or with one shared map/table both sites use.

## Shotgun Surgery

**What it is:** one logical change forces scattered edits across many files in the diff.

**How to fix:** gather the pieces that change together into one module so the next change has a single home.

## Divergent Change

**What it is:** one file or module is edited for several unrelated reasons.

**How to fix:** split responsibilities so each module changes for only one reason.

## Speculative Generality

**What it is:** abstractions, parameters, or hooks are added for needs the spec does not have.

**How to fix:** delete the unused generality and inline back to the concrete case. Reintroduce abstraction only when a real need appears.

## Message Chains

**What it is:** a caller walks a long chain such as \`a.b().c().d()\`, coupling itself to the intermediate structure.

**How to fix:** hide the walk behind a single method on the object the caller already knows.

## Middle Man

**What it is:** a class or function that mostly just delegates onward without adding value.

**How to fix:** remove the middleman and call the real target directly.

## Refused Bequest

**What it is:** a subclass or implementer ignores or overrides most of what it inherits.

**How to fix:** drop the inheritance and use composition instead.`;

  function discoverGuidelines(cwd: string) {
    const cache = new Map<string, GuidelineEntry>();
    const docsDir = join(cwd, "docs");

    if (existsSync(docsDir)) {
      try {
        for (const entry of readdirSync(docsDir)) {
          const full = join(docsDir, entry);
          try {
            if (!statSync(full).isFile()) continue;
            const lower = entry.toLowerCase();
            const topics: string[] = [];
            if (lower === "testing.md") topics.push("testing");
            else if (lower.endsWith("-guidelines.md")) topics.push(lower.replace("-guidelines.md", ""));
            else if (lower.endsWith("-conventions.md")) topics.push(lower.replace("-conventions.md", ""));
            else if (lower.endsWith("-practices.md")) topics.push(lower.replace("-practices.md", ""));
            else continue;
            cache.set(entry, { file: entry, content: readFileSync(full, "utf-8"), topics, source: "docs" });
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
    }

    // Repo-root standards files + docs/standards.md. These are intentionally
    // separate from the language/topic docs discovery above.
    for (const file of ["AGENTS.md", "CLAUDE.md", "CONTEXT.md"]) {
      const full = join(cwd, file);
      try {
        if (existsSync(full) && statSync(full).isFile()) {
          cache.set(file, { file, content: readFileSync(full, "utf-8"), topics: ["standards"], source: "root" });
        }
      } catch { /* skip */ }
    }

    const docsStandards = join(docsDir, "standards.md");
    try {
      if (existsSync(docsStandards) && statSync(docsStandards).isFile()) {
        cache.set("docs/standards.md", { file: "standards.md", content: readFileSync(docsStandards, "utf-8"), topics: ["standards"], source: "docs" });
      }
    } catch { /* skip */ }

    return cache;
  }

  function guidelineDisplayPath(g: { file: string; source: "docs" | "root" }): string {
    return g.source === "docs" ? `docs/${g.file}` : g.file;
  }

  // ── Path protection: block writes/edits into the grilling visualizer temp dir ──
  // The grilling CLI (skills/grilling-with-ui/grilling-cli.mjs) hides its state in a
  // random dir under os.tmpdir() prefixed "grilling-". The skill prose forbids
  // the agent from touching it; this handler is a mechanical backstop that
  // blocks `write`/`edit` tool calls whose target path falls inside that dir,
  // even if the agent ignores the instruction.
  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "write" && event.toolName !== "edit") {
      return undefined;
    }
    const path = String(event.input?.path ?? "");
    if (!path) return undefined;
    const tmp = tmpdir();
    // Block any path under os.tmpdir() that contains the grilling- prefix.
    // Covers e.g. /tmp/grilling-<rand>/state.json and the .grilling.json map.
    const isGrillingTemp =
      (path.startsWith(tmp) && path.includes("grilling-")) ||
      path.endsWith(".grilling.json") ||
      path.includes(".grilling.json");
    if (isGrillingTemp) {
      if (ctx.hasUI) {
        ctx.ui.notify(`Blocked write to grilling state path: ${path}`, "warning");
      }
      return { block: true, reason: `Path "${path}" is grilling state — use the grilling CLI, not direct edits.` };
    }
    return undefined;
  });

  pi.on("session_start", async (_event, ctx) => {
    guidelinesCache = discoverGuidelines(ctx.cwd);
    shouldInjectGuidelines = true;
    for (const diagnostic of gate.diagnostics) {
      ctx.ui.notify(`task-workflow gate: ${diagnostic}`, "info");
    }
    for (const diagnostic of SKILL_NAME_DIAGNOSTICS) {
      ctx.ui.notify(`task-workflow: ${diagnostic}`, "warning");
    }
    if (gate.active) {
      ctx.ui.notify(`task-workflow gate active: ${gate.reason}`, "info");
      return;
    }
    // Check required peer extensions
    const tools = pi.getAllTools();
    if (!tools.some((t) => t.name === "subagent")) {
      ctx.ui.notify("pi-subagents is not installed. Install it with: pi install npm:pi-subagents", "warning");
    }
    if (!tools.some((t) => t.name === "submit_feedback")) {
      ctx.ui.notify("pi-telemetry is not installed. Install it with: pi install git:github.com/Y4shin/pi-telemetry@v0.4.0", "warning");
    }
  });

  pi.on("session_compact", async () => { shouldInjectGuidelines = true; });

  if (!gate.active) {
    pi.on("before_agent_start", async (event, _ctx) => {
      if (!shouldInjectGuidelines) return;
      shouldInjectGuidelines = false;
      if (guidelinesCache.size === 0) return;

      const lines = ["## Project coding guidelines", ""];
      lines.push("Available documentation:");
      for (const [, g] of guidelinesCache) {
        lines.push(`- \`${guidelineDisplayPath(g)}\` — topics: ${g.topics.join(", ")}`);
      }
      lines.push("", "Use `get_guidelines(language, topic?)` to fetch detailed guidelines.");
      lines.push("Use `list_guidelines()` to see all available sources.");
      lines.push("", "Abide by any conventions defined in these project files when writing code.");

      return { systemPrompt: event.systemPrompt + "\n\n" + lines.join("\n") };
    });
  }

  if (gate.active) {
    pi.on("before_agent_start", stripSkills);
    pi.on("input", gateSkillInvocation);
  }

  if (!gate.active) {
    pi.registerTool({
      name: "get_guidelines",
      label: "Get Guidelines",
      description: "Fetch coding guidelines for a language or topic.",
      parameters: Type.Object({
        language: Type.Optional(Type.String({ description: "Language filter (e.g. typescript)" })),
        topic: Type.Optional(Type.String({ description: "Topic filter (e.g. mocking)" })),
      }),
      async execute(_id: string, params: any) {
        const results: { file: string; content: string; topics: string[]; source: "docs" | "root" }[] = [];
        for (const [, g] of guidelinesCache) {
          if (params.language) {
            const lang = params.language.toLowerCase();
            if (!g.file.toLowerCase().includes(lang) && !g.topics.some((t) => t.toLowerCase() === lang)) continue;
          }
          if (params.topic) {
            const topic = params.topic.toLowerCase();
            if (!g.topics.some((t) => t.toLowerCase().includes(topic))) continue;
          }
          results.push(g);
        }
        if (results.length === 0) {
          return {
            content: [{
              type: "text",
              text: `# Smell baseline (floor — no repo standards found for this request)\n\n${SMELL_BASELINE}`,
            }],
            details: {},
          };
        }
        return { content: [{ type: "text", text: results.map((r) => `### ${r.file}\n${r.content}`).join("\n\n---\n\n") }], details: {} };
      },
    });
  }

  if (!gate.active) {
    pi.registerTool({
      name: "list_guidelines",
      label: "List Guidelines",
      description: "List available coding guideline sources.",
      parameters: Type.Object({}),
      async execute() {
        if (guidelinesCache.size === 0) {
          const text = [
            "Available coding guideline sources:",
            "  - Smell baseline (Fowler 12) — served as the floor when no repo standards match",
          ].join("\n");
          return { content: [{ type: "text", text }], details: {} };
        }
        const lines = ["Available coding guideline sources:"];
        for (const [, g] of guidelinesCache) {
          lines.push(`  - ${guidelineDisplayPath(g)} (topics: ${g.topics.join(", ")})`);
        }
        return { content: [{ type: "text", text: lines.join("\n") }], details: {} };
      },
    });
  }
}
