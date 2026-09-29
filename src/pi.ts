/**
 * task-workflow v2 — single extension entry point.
 *
 * Registers tw_* tools for artifact operations on the docs/tasks/ planning
 * tree, plus lifecycle hooks for pi-subagents and pi-telemetry checks.
 *
 * Principles:
 * - One file, one extension. No split entry points.
 * - Core modules are pure data (no file I/O).
 * - All file I/O is in this file.
 * - Algorithms belong in tools, not in skill prose.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI, BeforeAgentStartEvent, BeforeAgentStartEventResult, ExtensionContext, InputEvent, InputEventResult } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import YAML from "yaml";

import { parse, dump, type Document, type FrontmatterData } from "./core/frontmatter.js";
import { fromFrontmatter, findAnomalies, dependencyLevels, TYPE_LEAF, TYPE_LEAVES, type Artifact, type WorkItemInfo, type Anomaly } from "./core/art.js";
import {
  effortGraphs,
  effortFrontier,
  effortLevels,
  effortFinalizable,
  effortGroupOf,
  liveFrontier,
  itemFinalizable,
  type EffortGraph,
  type ScanIndexLike,
} from "./core/graph.js";
import { toObject, fromObject, freshState, isPointerName, POINTER_NAMES, type WorkflowState } from "./core/state.js";
import { FrontmatterError, ResolutionError } from "./core/err.js";
import { resolveGate, type ResolveGateResult } from "./core/repo-gate.js";

// ─── Gated skill names (shared by strip + invocation gate) ─────────────────────

const FALLBACK_GATED_SKILL_NAMES = [
  "task-workflow-overview",
  "setup-workflow",
  "wayfinder",
  "implement-task",
  "finalize-task",
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

function parseArtifactFile(path: string): { art: Artifact; doc: Document } {
  const text = readFileSync(path, "utf-8");
  const doc = parse(text);
  const art = fromFrontmatter(doc.data, slugDirFor(path));
  art.path = path;
  return { art, doc };
}

/**
 * The slug a file's location implies: its directory name, except under a
 * container directory (tasks/, tickets/, slices/, ...) where the file's own
 * name carries the slug.
 */
const CONTAINER_DIRS = new Set(["tasks", "tickets", "slices", "deviation-reports", "archive", "maps"]);

function slugDirFor(path: string): string {
  const parent = basename(dirname(path));
  if (!CONTAINER_DIRS.has(parent)) return parent;
  // A container leaf carries the slug in its own name, without the
  // `<n>-` ordering prefix the slice convention uses.
  return basename(path).replace(/\.md$/, "").replace(/^\d+-/, "");
}

function walkMarkdown(dir: string, out: string[]): void {
  if (!isDir(dir)) return;
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith(".")) continue;
    const p = join(dir, name);
    if (isDir(p)) walkMarkdown(p, out);
    else if (isFile(p) && name.endsWith(".md")) out.push(p);
  }
}

interface ScanHit { path: string; art: Artifact; doc: Document }

/** Every artifact on disk, live and archived, in both shapes. */
function scanArtifacts(root: string): ScanHit[] {
  const files: string[] = [];
  walkMarkdown(taskRoot(root), files);
  const hits: ScanHit[] = [];
  for (const p of files) {
    try {
      const { art, doc } = parseArtifactFile(p);
      hits.push({ path: p, art, doc });
    } catch { /* not an artifact: skip, never fatal */ }
  }
  return hits;
}

/** Preference order when one slug matches several artifact types. */
const TYPE_PRIORITY = TYPE_LEAVES.map(([type]) => type);

function typeRank(type: string): number {
  const i = TYPE_PRIORITY.indexOf(type);
  return i === -1 ? TYPE_PRIORITY.length : i;
}

/** The files a directory selector may stand for, in preference order. */
const DIRECTORY_LEAVES = TYPE_LEAVES.map(([, file]) => file);

/**
 * Pick the file a directory selector stands for. When a wanted type is given,
 * only that type's leaf is considered, so `want: "spec"` on a directory that
 * holds both `map.md` and `spec.md` selects the spec instead of erroring.
 */
function directoryLeaf(dir: string, want?: string): string | null {
  const leaves = want && TYPE_LEAF[want] ? [TYPE_LEAF[want]] : DIRECTORY_LEAVES;
  return leaves.map((leaf) => join(dir, leaf)).find(isFile) ?? null;
}

/** Resolve a slug or path to an artifact file path and its frontmatter document. */
function resolveArt(root: string, selector: string, want?: string): ScanHit {
  // (1) An explicit path, or a path-like selector, resolved directly.
  let target = "";
  if (existsSync(selector)) target = resolvePath(selector);
  else if (existsSync(join(process.cwd(), selector))) target = resolvePath(process.cwd(), selector);
  else if (isAbsolute(selector) && existsSync(selector)) target = resolvePath(selector);
  else if (existsSync(join(root, selector))) target = resolvePath(root, selector);

  if (target) {
    if (isDir(target)) {
      const leaf = directoryLeaf(target, want);
      if (leaf === null) {
        throw new ResolutionError(
          want ? `no ${want} in directory '${selector}'` : `'${selector}' is not a recognised artifact`,
        );
      }
      target = leaf;
    }
    if (!isFile(target)) throw new ResolutionError(`'${selector}' is not a recognised artifact`);
    let parsed: { art: Artifact; doc: Document };
    try {
      parsed = parseArtifactFile(target);
    } catch (e) {
      if (e instanceof FrontmatterError) throw new ResolutionError(`'${selector}' is not a recognised artifact`);
      throw e;
    }
    if (want && parsed.art.type !== want) {
      throw new ResolutionError(`'${selector}' has type '${parsed.art.type}', not '${want}'`);
    }
    return { path: target, art: parsed.art, doc: parsed.doc };
  }

  // (2) A slug match against the index, honoring the wanted type first.
  const bySlug = scanArtifacts(root).filter(
    (h) => h.art.slug === selector || basename(dirname(h.path)) === selector,
  );
  const candidates = want ? bySlug.filter((h) => h.art.type === want) : bySlug;

  if (candidates.length === 0) {
    if (want && bySlug.length > 0) {
      const best = [...bySlug].sort((a, b) => typeRank(a.art.type) - typeRank(b.art.type))[0];
      throw new ResolutionError(`'${selector}' has type '${best.art.type}', not '${want}'`);
    }
    throw new ResolutionError(`no ${want ?? "artifact"} matches '${selector}'`);
  }

  const byType = new Map<string, ScanHit[]>();
  for (const hit of candidates) {
    if (!byType.has(hit.art.type)) byType.set(hit.art.type, []);
    byType.get(hit.art.type)!.push(hit);
  }
  for (const group of byType.values()) {
    if (group.length > 1) {
      throw new ResolutionError(
        `'${selector}' is ambiguous: matches multiple artifacts: ${group.map((g) => g.path).join(", ")}`,
      );
    }
  }

  return [...candidates].sort((a, b) => typeRank(a.art.type) - typeRank(b.art.type))[0];
}

function taskInfoFromPath(path: string): WorkItemInfo | null {
  try {
    const { art } = parseArtifactFile(path);
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
  const { doc } = parseArtifactFile(mapPath);
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

// ─── Scan layer ────────────────────────────────────────────────────────────────

interface ScanIndex { hits: ScanHit[]; anomalies: Anomaly[] }

/** One scan of the tree plus one anomaly pass over everything it found. */
function scanIndex(root: string): ScanIndex {
  const hits = scanArtifacts(root);
  return { hits, anomalies: findAnomalies(hits.map((h) => h.art)) };
}

/**
 * A per-invocation memo: each tool invocation scans once and every graph
 * helper it calls reads the same index. No invalidation machinery, since the
 * memo never outlives the `execute` call that created it.
 */
function scanMemo(root: string): () => ScanIndex {
  let cached: ScanIndex | null = null;
  return () => (cached ??= scanIndex(root));
}

/** The effort graph a resolved artifact path belongs to, or null. */
function graphForPath(graphs: Map<string, EffortGraph>, path: string): EffortGraph | null {
  for (const g of graphs.values()) {
    for (const a of [g.map, g.spec, ...g.tasks, ...g.tickets, ...g.deprecated]) {
      if (a?.path === path) return g;
    }
  }
  return null;
}

/**
 * True when the effort has scanned tasks or tickets, so the scan is the
 * source of truth. A v3 map whose children live in flat task dirs has none,
 * and its legacy array-based path is what must serve it.
 */
function hasScanChildren(graph: EffortGraph | null): boolean {
  if (graph === null) return false;
  return graph.tasks.length + graph.tickets.length + graph.deprecated.length > 0;
}

/** True when the selector names the maps scope: the tasks root or `maps/`. */
function isMapsScope(root: string, selector: string): boolean {
  const wanted = new Set([resolvePath(taskRoot(root)), resolvePath(join(taskRoot(root), "maps"))]);
  for (const candidate of [selector, join(process.cwd(), selector), join(root, selector)]) {
    try {
      if (existsSync(candidate) && isDir(candidate) && wanted.has(resolvePath(candidate))) return true;
    } catch { /* not a resolvable path */ }
  }
  return false;
}

/** Append the formatted anomaly block, or return the text unchanged. */
function withAnomalies(text: string, anomalies: Anomaly[]): string {
  if (anomalies.length === 0) return text;
  return `${text}\n\n## Anomalies\n\n${anomalies.map((a) => `- [${a.kind}] ${a.detail}`).join("\n")}`;
}

/**
 * Append the deprecated block. Deprecated artifacts count as done and sit out
 * of the graph, so the report is how they stay visible instead of silently
 * disappearing.
 */
function withDeprecated(text: string, deprecated: Artifact[]): string {
  if (deprecated.length === 0) return text;
  const lines = deprecated.map((a) => `- ${a.slug} (${a.type})`);
  return `${text}\n\n## Deprecated (out of the graph)\n\n${lines.join("\n")}`;
}

// ─── State helpers ─────────────────────────────────────────────────────────────

function loadState(root: string): WorkflowState {
  const sp = join(taskRoot(root), "state.yaml");
  if (!existsSync(sp)) return freshState();
  try { return fromObject(readYaml(sp)); } catch { return freshState(); }
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
    "Every non-reserved `.md` under `docs/tasks/` carries parseable YAML frontmatter with a non-empty `type`.",
    "Unknown keys and unknown values are tolerated.",
    "",
    "### The flow",
    "",
    "wayfinder decision tasks, then to-spec (writes `spec.md`), then to-tickets (generates implementation tickets).",
    "Tasks and tickets are graph nodes; the map is the effort index.",
    "",
    "### Task (`docs/tasks/<effort>/tasks/<task>/task.md`)",
    "type: task | subtype: research | prototype | grilling | manual | title: <text> |",
    "  status: draft | stable | deprecated | workflow_state: todo | ready | in-progress | blocked | done |",
    "  blocked_by: [<slug>, ...] | mode: human (optional)",
    "",
    "### Ticket (`docs/tasks/<effort>/tickets/<ticket>/ticket.md`)",
    "type: ticket | subtype: feature | bug | title: <text> |",
    "  status: draft | stable | deprecated | workflow_state: todo | ready | in-progress | blocked | done |",
    "  blocked_by: [<slug>, ...] | mode: human (optional) | size: s | m | l | xl (optional, absent means m)",
    "",
    "### Map (`docs/tasks/<effort>/map.md`)",
    "type: map | title: <text> | status: draft | stable | deprecated |",
    "  blocked_by: [<effort-slug>, ...] holding feature-to-feature edges.",
    "A map has no workflow_state: effort done-ness is derived by scanning its tasks and tickets.",
    "",
    "### Spec (`docs/tasks/<effort>/spec.md`)",
    "type: spec | title: <text> | status: draft (while writing) | stable (when published).",
    "A spec has no workflow_state.",
    "",
    "### Auxiliary artifacts",
    "type: arch spec | findings | deviation report | changelog | out-of-scope note | title: <text> | status: draft | stable | deprecated.",
    "Auxiliary artifacts have no workflow_state.",
    "",
    "### Lifecycle vocabularies",
    "status: draft | stable | deprecated",
    "workflow_state: todo | ready | in-progress | blocked | done",
    "Done-ness gates on workflow_state: done. A deprecated artifact counts as done and sits out of the graph.",
    "",
    "### Conformance rules",
    "status draft pairs only with workflow_state todo; status deprecated pairs only with workflow_state done;",
    "status stable pairs with anything. An absent status means stable.",
    "blocked_by edges are kind-scoped (tasks to tasks, tickets to tickets) and effort-scoped;",
    "a map's blocked_by carries feature-to-feature edges.",
    "An effort is finalizable when every task and ticket is done and, if a spec exists, at least one ticket exists.",
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
    tw_show: def(
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

    tw_get: def(
      "Print a single frontmatter field of an artifact.",
      { selector: Str("Slug or path"), field: Str("Field name") },
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        const { doc } = resolveArt(root, p.selector);
        return doc.data[p.field] === undefined ? "" : String(doc.data[p.field]);
      },
    ),

    tw_set: def(
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

    tw_list: def(
      "List artifacts (maps, specs, tasks, tickets). Excludes archived by default.",
      {
        kind: { type: "string" as const, optional: true, enum: ["map", "task", "ticket", "spec"] },
        status: OptStr("Status filter"),
        workflow_state: OptStr("Workflow state filter"),
        effort: OptStr("Effort slug filter"),
        json: OptBool,
      },
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        if (!isInitialized(root)) return "(no docs/tasks directory)";
        // The scan layer reads both shapes; the archived subtree is the only
        // location tw_list hides.
        let hits = scanMemo(root)().hits.filter(
          (h) => !h.path.split(/[\\/]/).includes("archive"),
        );
        if (p.kind) hits = hits.filter((h) => h.art.type === p.kind);
        if (p.status) hits = hits.filter((h) => h.art.status === p.status);
        if (p.workflow_state) hits = hits.filter((h) => h.art.workflow_state === p.workflow_state);
        if (p.effort) hits = hits.filter((h) => effortGroupOf(h.art) === p.effort);

        if (p.json) {
          return JSON.stringify(
            hits.map((h) => ({
              slug: h.art.slug,
              type: h.art.type,
              subtype: h.art.subtype,
              status: h.art.status,
              workflow_state: h.art.workflow_state,
              effort: effortGroupOf(h.art),
              path: h.path,
            })),
            null, 2,
          );
        }
        const rows = hits.map((h) => {
          const kind = h.art.subtype ? `${h.art.type}/${h.art.subtype}` : h.art.type;
          const state = h.art.workflow_state ?? h.art.status;
          return `${h.art.slug} (${kind})${state ? ` [${state}]` : ""}`;
        });
        return rows.join("\n") || "(empty)";
      },
    ),

    tw_finalizable: def(
      "Check an artifact is ready to finalize (workflow_state done).",
      { selector: Str("Task or ticket slug or path") },
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        const { art } = resolveArt(root, p.selector);
        const reason = itemFinalizable(art);
        if (reason !== null) throw new Error(reason);
        const index = scanMemo(root)();
        const graph = graphForPath(effortGraphs(index), art.path ?? "");
        return withAnomalies("ready to finalize", graph?.anomalies ?? []);
      },
    ),

    tw_dependency_levels: def(
      "Compute BFS dependency levels from an effort map's scan.",
      { selector: Str("Map slug") },
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        const resolved = resolveArt(root, p.selector);
        if (resolved.art.type !== "map") throw new ResolutionError(`'${p.selector}' must resolve to a map`);
        const index = scanMemo(root)();
        const graph = graphForPath(effortGraphs(index), resolved.path);
        if (hasScanChildren(graph)) {
          const levels = effortLevels(graph!);
          const deprecated = graph!.deprecated.map((a) => ({ slug: a.slug, type: a.type }));
          return JSON.stringify({ ...levels, deprecated, anomalies: graph!.anomalies }, null, 2);
        }
        // v3 fallback: the map's own array is the graph.
        const children = mapChildInfos(root, resolved.path);
        const remaining = children.filter((item) => item.status !== "done");
        const levels = dependencyLevels(remaining);
        return JSON.stringify({ levels, remaining_count: remaining.length, done_count: children.length - remaining.length }, null, 2);
      },
    ),

    tw_frontier: def(
      "List the ready edge of an effort's graph: unfinished tasks and tickets whose blockers are done.",
      { selector: Str("Map slug or path, or the tasks root for the effort frontier"), json: OptBool },
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        const index = scanMemo(root)();
        const graphs = effortGraphs(index);
        // The maps scope: the cross-effort frontier.
        if (isMapsScope(root, p.selector)) {
          const efforts = liveFrontier(index);
          if (p.json) {
            return JSON.stringify(
              efforts.map((g) => ({
                slug: g.slug,
                frontier: effortFrontier(g).map((a) => ({ slug: a.slug, type: a.type })),
                deprecated: g.deprecated.map((a) => ({ slug: a.slug, type: a.type })),
                anomalies: g.anomalies,
              })),
              null, 2,
            );
          }
          const text = efforts.length === 0
            ? "(empty frontier)"
            : efforts.map((g) => {
                const items = effortFrontier(g);
                const lines = items.length === 0
                  ? [`${g.slug}: (empty frontier)`]
                  : [`${g.slug}:`, ...items.map((a) => `  ${a.slug} (${a.type})`)];
                return withDeprecated(withAnomalies(lines.join("\n"), g.anomalies), g.deprecated);
              }).join("\n");
          return text;
        }

        const resolved = resolveArt(root, p.selector, "map");
        const graph = graphForPath(graphs, resolved.path);
        if (hasScanChildren(graph)) {
          const frontier = effortFrontier(graph!);
          if (p.json) {
            return JSON.stringify({ frontier, deprecated: graph!.deprecated, anomalies: graph!.anomalies }, null, 2);
          }
          const text = frontier.length === 0
            ? "(empty frontier)"
            : frontier.map((a) => `${a.slug} (${a.type})`).join("\n");
          return withDeprecated(withAnomalies(text, graph!.anomalies), graph!.deprecated);
        }

        // v3 fallback: the map's own array, resolved through the legacy path.
        const children = mapChildInfos(root, resolved.path);
        const done = new Set(children.filter((item) => item.status === "done").map((item) => item.slug));
        const frontier = children.filter((item) => item.status !== "done" && item.blocked_by.every((blocker) => done.has(blocker)));
        if (p.json) return JSON.stringify(frontier, null, 2);
        return frontier.length === 0 ? "(empty frontier)" : frontier.map((item) => `${item.slug}${item.type ? ` (${item.type})` : ""}`).join("\n");
      },
    ),

    tw_map_finalizable: def(
      "Check every task and ticket of an effort is done (and, with a spec, that tickets exist).",
      { selector: Str("Map slug or path") },
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        const resolved = resolveArt(root, p.selector, "map");
        const index = scanMemo(root)();
        const graph = graphForPath(effortGraphs(index), resolved.path);
        if (hasScanChildren(graph)) {
          const reason = effortFinalizable(graph!);
          if (reason !== null) throw new Error(reason);
          return withDeprecated(
            withAnomalies("ready to finalize: all children done", graph!.anomalies),
            graph!.deprecated,
          );
        }
        // v3 fallback: the map's own array is the source of truth.
        const tasks = Array.isArray(resolved.doc.data["tasks"]) ? resolved.doc.data["tasks"] : [];
        const undone = tasks.filter((t: any) => !t.done).map((t: any) => t.slug || "?");
        if (undone.length === 0) return "ready to finalize: all children done";
        throw new Error(`unfinished children: ${undone.join(", ")}`);
      },
    ),

    tw_state: def(
      "Show the current workflow state (map and task pointers) from state.yaml.",
      {},
      async (_p, ctx) => {
        const root = findRoot(ctx.directory);
        const s = loadState(root);
        return [
          `map:  ${s.map ?? "(none)"}`,
          `task: ${s.task ?? "(none)"}`,
        ].join("\n");
      },
    ),

    tw_state_set: def(
      `Set a workflow state field (${POINTER_NAMES.join(" or ")}). Use 'null' to clear.`,
      { field: Str(`Field: ${POINTER_NAMES.map((n) => `'${n}'`).join(" or ")}`), value: Str("New value (or 'null')") },
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        const allowed = POINTER_NAMES.map((n) => `'${n}'`).join(" or ");
        if (!isPointerName(p.field)) {
          throw new Error(`unknown field '${p.field}': use ${allowed}`);
        }
        if (p.value === "None") {
          throw new Error(`invalid pointer value 'None': use 'null' to clear '${p.field}'`);
        }
        if (!isInitialized(root)) mkdirSync(taskRoot(root), { recursive: true });
        const s = loadState(root);
        const v = p.value === "null" ? null : p.value;
        if (p.field === "map") s.map = v;
        else s.task = v;
        saveState(root, s);
        return `${p.field} = ${v ?? "null"}`;
      },
    ),

    tw_context: def(
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
        label: name.replace(/^tw_/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
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

  pi.on("session_start", async (_event, ctx) => {
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

  if (gate.active) {
    pi.on("before_agent_start", stripSkills);
    pi.on("input", gateSkillInvocation);
  }

}
