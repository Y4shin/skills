/**
 * task-workflow v2 -- single extension entry point.
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

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI, BeforeAgentStartEvent, BeforeAgentStartEventResult, ExtensionContext, InputEvent, InputEventResult, ToolCallEvent, ToolCallEventResult } from "@earendil-works/pi-coding-agent";
import { getCurrentTools } from "@earendil-works/pi-ai";
import { Type, type TSchema } from "typebox";
import YAML from "yaml";

import { parse, dump, type Document, type FrontmatterData } from "./core/frontmatter.js";
import { fromFrontmatter, findAnomalies, dependencyLevels, TYPE_LEAF, TYPE_LEAVES, readMapSection, writeMapSection, MAP_SECTION_NON_GOALS, MAP_SECTION_NON_NEGOTIABLE_FACTS, type Artifact, type WorkItemInfo, type Anomaly } from "./core/art.js";
import {
  CLOSER,
  buildOpenParameters,
  conflictReason,
  duplicateReason,
  openSkillsIn,
  skillEntry,
  validateOpenArgs,
  type SkillEntry,
} from "./disclosure.js";
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

// ─── Open, close, next ────────────────────────────────────────────────────

/**
 * The open skills implied by the session's active tool set, or an empty set
 * when no active tool set is reachable (a tool execute without a bound
 * session). The derivation is the open/close engine's only state source.
 */
function currentOpenSkills(ctx: ToolContext): Set<string> {
  return openSkillsIn(ctx.getActiveTools?.() ?? []);
}

function requireActiveSet(ctx: ToolContext): { get: () => string[]; set: (names: string[]) => void } {
  if (!ctx.getActiveTools || !ctx.setActiveTools) {
    throw new Error("tw_open and tw_close need a session-bound active tool set");
  }
  return { get: () => ctx.getActiveTools!(), set: (names) => ctx.setActiveTools!(names) };
}

function outcome(text: string, details: Record<string, unknown>): ToolOutcome {
  return { text, details };
}

/**
 * Compute the active set after closing one open skill: the skill's tools that
 * no remaining open skill still needs leave the set, and the closer itself
 * leaves when nothing stays open.
 */
function activeAfterClose(active: string[], closing: SkillEntry, remaining: Set<string>): string[] {
  const stillNeeded = new Set<string>();
  for (const name of remaining) {
    for (const tool of skillEntry(name)?.toolset ?? []) stillNeeded.add(tool);
  }
  const removed = new Set(closing.toolset.filter((tool) => !stillNeeded.has(tool)));
  if (remaining.size === 0) removed.add(CLOSER);
  return active.filter((tool) => !removed.has(tool));
}

/**
 * Record the skill invocation telemetry the per-skill prose used to ask the
 * model for: the opener absorbs the explicit telemetry_skill_context call, so
 * the model never makes one. Best-effort and fail-open: when the telemetry
 * extension is absent (unknown tool) or errors, the open still succeeds.
 */
async function recordSkillTelemetry(
  ctx: ToolContext,
  skill: string,
  effort: string,
  target: string | undefined,
): Promise<void> {
  if (!ctx.executeTool) return;
  try {
    await ctx.executeTool("telemetry_skill_context", {
      skill_name: skill,
      target: target ?? effort,
    });
  } catch {
    // Telemetry is never load-bearing for the open.
  }
}

// ─── Planning transition helpers ────────────────────────────────────────────

/**
 * The v5 named writers write schema-5 shape only. A v3-shape artifact goes
 * through the one-hop migration first: bolting v5 fields onto a v3 file
 * would create a hybrid shape the model does not define.
 */
function requireV4Shape(art: Artifact): void {
  if (art.shape === "v3") {
    throw new Error(`'${art.slug}' is a v3-shape artifact; run the schema-5 migration before using the v5 writers`);
  }
}

/**
 * Clear the map's ready_for_spec flag on a planning write. Only a present
 * `true` is rewritten: absent and explicit false already read false, so the
 * frontmatter keeps its minimal shape. Returns whether the document changed.
 */
function clearReadyForSpec(doc: Document): boolean {
  if (doc.data.ready_for_spec !== true) return false;
  doc.data.ready_for_spec = false;
  return true;
}

// ─── Tool factory ──────────────────────────────────────────────────────────────

interface Tool {
  description: string;
  args: Record<string, unknown>;
  /** Explicit TypeBox parameter schema; replaces the args-record conversion when present. */
  parameters?: TSchema;
  /** Whether registration activates the tool. Only the dispatcher pair is always declared. */
  activeByDefault?: boolean;
  execute(args: Record<string, any>, ctx: ToolContext): Promise<string> | Promise<ToolOutcome>;
}

/** A tool result: text for the model plus structured details. */
interface ToolOutcome {
  text: string;
  details: Record<string, unknown>;
}

/** What a tool execute gets: the directory plus, when a session is bound, the active tool set. */
interface ToolContext {
  directory: string;
  getActiveTools?(): string[];
  setActiveTools?(toolNames: string[]): void;
  executeTool?(name: string, args: unknown): Promise<unknown>;
}

function def(description: string, args: Record<string, unknown>, exec: (args: any, ctx: any) => Promise<string>): Tool {
  return { description, args, execute: exec };
}

/** Like def, for tools with an explicit TypeBox parameter schema and structured results. */
function defStructured(
  description: string,
  parameters: TSchema,
  exec: (args: any, ctx: ToolContext) => Promise<ToolOutcome>,
  options: { activeByDefault?: boolean } = {},
): Tool {
  return { description, args: {}, parameters, activeByDefault: options.activeByDefault, execute: exec };
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

    tw_write_section: def(
      "Write a '##' body section of an effort map: the only writer of the map body. " +
        "Carries '## Non-goals' and '## Non-negotiable facts', whose first line is the bolded effort-level " +
        "success test. Every write clears ready_for_spec, so a post-reconcile map change forces one more " +
        "Wayfinder pass.",
      {
        selector: Str("Map slug or path"),
        section: Str("The '##' heading name, without the marks"),
        content: Str("The section body; an empty string seeds an empty placeholder"),
      },
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        const { path, art, doc } = resolveArt(root, p.selector, "map");
        requireV4Shape(art);
        const section = typeof p.section === "string" ? p.section.trim() : "";
        if (section === "") throw new Error("section name is empty");
        if (/\n/.test(section)) {
          throw new Error(`section name '${section.replace(/\n.*/s, "")}' must be a single '##' heading name`);
        }
        doc.body = writeMapSection(doc.body, section, typeof p.content === "string" ? p.content : "");
        const cleared = clearReadyForSpec(doc);
        writeFileSync(path, dump(doc), "utf-8");
        return `wrote '## ${section}' in ${relative(root, path)}${cleared ? "; ready_for_spec cleared" : ""}`;
      },
    ),

    tw_finalize_map: def(
      "Check an effort map is ready for the spec phase and set ready_for_spec: true: the only setter of the " +
        "flag, and it sets it last. Refuses, naming every missing item, when the planning frontier is not empty, " +
        "'## Non-goals' is missing or empty, or '## Non-negotiable facts' is missing, empty, or does not open " +
        "with the bolded success-test line.",
      { selector: Str("Map slug or path") },
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        const { path, art, doc } = resolveArt(root, p.selector, "map");
        requireV4Shape(art);
        const graph = graphForPath(effortGraphs(scanMemo(root)()), path);
        const missing: string[] = [];
        // The planning frontier is the ready edge of the task kind: the
        // vocabulary splits planning tasks from implementation tickets, and
        // only the planning kind gates the hand-off to the spec phase.
        const frontier = (graph === null ? [] : effortFrontier(graph)).filter((a) => a.type === "task");
        if (frontier.length > 0) {
          missing.push(`the planning frontier is not empty: ${frontier.map((a) => a.slug).join(", ")}`);
        }
        const nonGoals = readMapSection(doc.body, MAP_SECTION_NON_GOALS);
        if (nonGoals === null) missing.push(`the map has no '## ${MAP_SECTION_NON_GOALS}' section`);
        else if (nonGoals.length === 0) missing.push(`'## ${MAP_SECTION_NON_GOALS}' is empty`);
        const facts = readMapSection(doc.body, MAP_SECTION_NON_NEGOTIABLE_FACTS);
        if (facts === null) missing.push(`the map has no '## ${MAP_SECTION_NON_NEGOTIABLE_FACTS}' section`);
        else if (facts.length === 0) missing.push(`'## ${MAP_SECTION_NON_NEGOTIABLE_FACTS}' is empty`);
        else if (!/^\*\*.*\*\*/.test(facts[0].trim())) {
          missing.push(
            `'## ${MAP_SECTION_NON_NEGOTIABLE_FACTS}' does not open with the bolded effort-level success-test line`,
          );
        }
        if (missing.length > 0) {
          throw new Error(
            `cannot finalize the map '${art.slug}'; ${missing.length} check(s) failed:\n- ${missing.join("\n- ")}`,
          );
        }
        // Every check passed: the flag is set last, in the single write.
        doc.data.ready_for_spec = true;
        writeFileSync(path, dump(doc), "utf-8");
        return `map finalized: ready_for_spec = true in ${relative(root, path)}`;
      },
    ),

    tw_resolve_uncertainty: def(
      "Record a ticket's uncertainty resolution: writes the resolution next to the ticket's .work/uncertainty.md, deletes the uncertainty file, and returns the resolution path for the re-run pointer. Refuses when the ticket has no uncertainty file, so it can never serve as a generic writer.",
      { selector: Str("Ticket slug or path"), resolution: Str("The resolution text to record") },
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        if (!p.resolution.trim()) throw new Error("resolution text is empty");
        const { path, art } = resolveArt(root, p.selector, "ticket");
        const workDir = join(dirname(path), ".work");
        const uncertaintyPath = join(workDir, "uncertainty.md");
        if (!isFile(uncertaintyPath)) {
          throw new Error(`no uncertainty to resolve for ticket '${art.slug}': ${relative(root, uncertaintyPath)} does not exist`);
        }
        const resolutionPath = join(workDir, "resolution.md");
        writeFileSync(resolutionPath, `${p.resolution.trim()}\n`, "utf-8");
        rmSync(uncertaintyPath);
        return relative(root, resolutionPath);
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

    // ── disclosure core: the opener, the closer, and the router ──

    tw_open: defStructured(
      "Open a workflow skill: discloses the skill's toolset plus tw_close to the model. " +
        "A wayfinder open carries only the effort; a ticket open carries the effort and the target. " +
        "Refuses a skill that is already open or conflicts with an open skill; a refused open discloses nothing.",
      buildOpenParameters(),
      async (p, ctx) => {
        validateOpenArgs(p);
        const entry = skillEntry(p.skill as string)!;
        const activeSet = requireActiveSet(ctx);
        const active = activeSet.get();
        const open = currentOpenSkills(ctx);
        if (open.has(entry.name)) {
          const reason = duplicateReason(entry.name);
          return outcome(`Refused: ${reason}.`, { opened: false, reason });
        }
        // Exclusivity is a symmetric data table, so the check is
        // order-independent; both directions are consulted for safety.
        const conflicting = [...open].find(
          (name) =>
            entry.conflicts.includes(name) || (skillEntry(name)?.conflicts.includes(entry.name) ?? false),
        );
        if (conflicting !== undefined) {
          const reason = conflictReason(entry.name, conflicting);
          return outcome(`Refused: ${reason}.`, { opened: false, reason, open: [...open] });
        }
        const next = [...new Set([...active, ...entry.toolset, CLOSER])].sort();
        activeSet.set(next);
        const disclosed = next.filter((tool) => !active.includes(tool));
        await recordSkillTelemetry(ctx, entry.name, p.effort as string, p.target as string | undefined);
        return outcome(
          `Opened ${entry.name}: now active ${disclosed.join(", ")}.`,
          { opened: true, skill: entry.name, effort: p.effort, target: p.target, disclosed, active: next },
        );
      },
      { activeByDefault: true },
    ),

    tw_close: defStructured(
      "Close a named open workflow skill, removing the tools no other open skill still needs. " +
        "Other open skills stay open. Refuses when the named skill is not open.",
      Type.Object({ skill: Type.String({ description: "The workflow skill to close" }) }),
      async (p, ctx) => {
        const entry = typeof p.skill === "string" ? skillEntry(p.skill) : undefined;
        if (!entry) {
          return outcome(`Refused: '${String(p.skill)}' is not an openable skill.`, {
            closed: false,
            reason: `'${String(p.skill)}' is not an openable skill`,
          });
        }
        const activeSet = requireActiveSet(ctx);
        const active = activeSet.get();
        const open = currentOpenSkills(ctx);
        if (!open.has(entry.name)) {
          return outcome(`Refused: '${entry.name}' is not open.`, {
            closed: false,
            reason: `'${entry.name}' is not open`,
          });
        }
        const remaining = new Set([...open].filter((name) => name !== entry.name));
        const next = activeAfterClose(active, entry, remaining);
        activeSet.set(next);
        const removed = active.filter((tool) => !next.includes(tool));
        return outcome(
          `Closed ${entry.name}: removed ${removed.length > 0 ? removed.join(", ") : "nothing"}.`,
          { closed: true, skill: entry.name, removed, active: next, open: [...remaining] },
        );
      },
    ),

    tw_next: defStructured(
      "Ask what to do next in the task workflow. Always declared, never errors: outside a skill it " +
        "answers in short prose; inside a skill it says to finish the current work first.",
      Type.Object({}),
      async (_p, ctx) => {
        const open = currentOpenSkills(ctx);
        if (open.size === 0) {
          return outcome(
            "No workflow skill is open. Start the next phase by calling tw_open with the skill to run, " +
              "for example the wayfinder planning phase, or ask the task-workflow-overview skill for the story.",
            { open: [] },
          );
        }
        const names = [...open].sort().join(", ");
        return outcome(
          `You are inside ${names}. Finish the current work first, then call tw_next again from outside the skill.`,
          { open: [...open] },
        );
      },
      { activeByDefault: true },
    ),
  };
}

// ─── Write lockdown guard ──────────────────────────────────────────────────

/**
 * The reason a blocked write or edit carries: it names the lockdown and the
 * legal alternative, so a model that hits it can reroute to a tw_* tool.
 */
function lockdownReason(toolName: string, path: string): string {
  return (
    `write lockdown: '${path}' is under docs/tasks/, which only the named tw_* tools may write; ` +
    `the built-in ${toolName} is refused on that tree. Use the matching tw_* tool for this change.`
  );
}

/**
 * True when the target path sits inside the session repo's docs/tasks tree.
 * Relative paths resolve against the session cwd, absolute paths are taken
 * as given; both are normalized before the containment check, so `..`
 * traversal cannot slip past and a sibling directory such as
 * `docs/tasks-archive` does not match.
 */
function isTaskTreePath(path: string, cwd: string): boolean {
  const resolved = resolvePath(cwd, path);
  const tree = taskRoot(findRoot(cwd));
  const rel = relative(tree, resolved);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

/**
 * The tool_call guard: refuses the built-in write and edit on docs/tasks/**,
 * so the named tw_* tools are the only writers of the tree. It is a hook,
 * not a declared tool, so it is independent of the active tool set and
 * blocks in every phase, including while a skill toolset is open. Reading
 * the tree (read, bash) stays allowed, and no command-string scanning
 * exists: a shell command cannot be gated soundly, so the residual risk
 * that bash mutates the tree is accepted and documented in
 * docs/repo-gating.md.
 */
async function guardTaskTreeWrites(
  event: ToolCallEvent,
  ctx: ExtensionContext,
): Promise<ToolCallEventResult | undefined> {
  if (event.toolName !== "write" && event.toolName !== "edit") return undefined;
  const path = event.input.path;
  if (typeof path !== "string" || path.trim() === "") return undefined;
  if (!isTaskTreePath(path, ctx.cwd)) return undefined;
  return { block: true, reason: lockdownReason(event.toolName, path) };
}

/**
 * Re-assert the declared tool set the session transcript records, so the open
 * state survives resume and fork on the branch. The transcript is the
 * persistence source: pi restores it on /tree navigation; on resume and fork
 * the host rebuilds the loadout from registration defaults instead, so the
 * extension replays the transcript's current declarations here, before any
 * prompt can record a diff that would overwrite them.
 */
async function restoreDeclaredSetFromTranscript(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  reason: string,
): Promise<void> {
  if (reason !== "resume" && reason !== "fork") return;
  const names = getCurrentTools(ctx.sessionManager.buildSessionProjection().messages).map((t) => t.name);
  const live = new Set(pi.getActiveTools());
  if (names.length === live.size && names.every((name) => live.has(name))) return;
  pi.setActiveTools(names);
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
        parameters: def.parameters ?? Type.Object(params),
        // The bypass-free gate: every workflow tool is direct and inactive
        // by default, activated only by the opener, except the dispatcher
        // pair (tw_open, tw_next), which is declared in every state.
        exposure: "direct",
        defaultActive: def.activeByDefault ?? false,
        async execute(_id: string, args: any, _sig: any, _upd: any, ctx: any) {
          const result = await def.execute(args, {
            directory: ctx.cwd,
            getActiveTools: () => pi.getActiveTools(),
            setActiveTools: (toolNames: string[]) => pi.setActiveTools(toolNames),
            ...(ctx.executeTool ? { executeTool: (n: string, a: unknown) => ctx.executeTool(n, a) } : {}),
          });
          if (typeof result === "string") {
            return { content: [{ type: "text", text: result }], details: {} };
          }
          return { content: [{ type: "text", text: result.text }], details: result.details };
        },
      });
    }

    // Write lockdown: the built-in write and edit are refused on
    // docs/tasks/**; the named tw_* tools are the only writers of the tree.
    // A tool_call hook, so it runs in every phase regardless of the active
    // tool set.
    pi.on("tool_call", guardTaskTreeWrites);
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

  pi.on("session_start", async (event, ctx) => {
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
    // Persistence: replay the transcript's declared tool set on resume and
    // fork, so the open state survives them.
    await restoreDeclaredSetFromTranscript(pi, ctx, event.reason);
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
