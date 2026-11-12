/**
 * The tool support module: the tool record's types, the definition helpers every family
 * builds its tools with, and the plumbing two or more families read.
 *
 * The file I/O lives here because every family's tools read the artifact tree through it:
 * the root walk, the artifact resolver, the scan memo, and the state readers. A helper
 * that only one family uses stays in that family's module.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve as resolvePath } from "node:path";
import { type TSchema } from "typebox";
import YAML from "yaml";
import { parse, type Document } from "../core/frontmatter.js";
import { decodeText } from "../core/encoding.js";
import { fromFrontmatter, findAnomalies, TYPE_LEAF, TYPE_LEAVES, type Artifact, type Anomaly } from "../core/art.js";
import { type EffortGraph } from "../core/graph.js";
import { toObject, fromObject, freshState, type WorkflowState } from "../core/state.js";
import { FrontmatterError, ResolutionError } from "../core/err.js";
import { feedbackCall } from "../core/feedback.js";
import { type GitRun } from "../core/git-profile.js";

// ─── File system helpers ──────────────────────────────────────────────────────

export function findRoot(start: string): string {
  let dir = resolvePath(start);
  while (true) {
    if (existsSync(join(dir, "docs", "tasks")) || existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return resolvePath(start);
}

export function taskRoot(root: string): string {
  return join(root, "docs", "tasks");
}

export function isDir(p: string): boolean {
  try { return statSync(p).isDirectory(); } catch { return false; }
}

export function isFile(p: string): boolean {
  try { return statSync(p).isFile(); } catch { return false; }
}

/**
 * Read a text file through the encoding seam.
 *
 * Every file this extension reads can have been written by a human, and on
 * Windows that often means a UTF-8 byte-order mark or UTF-16LE from
 * PowerShell. Decoding the bytes rather than assuming UTF-8 keeps those files
 * readable instead of turning them into replacement characters.
 */
export function readText(p: string): string {
  return decodeText(readFileSync(p));
}

export function readYaml(p: string): unknown {
  return YAML.parse(readText(p));
}

/** The frontmatter title of an artifact file, or null when it has none. */
export function readArtifactTitle(path: string): string | null {
  if (!isFile(path)) return null;
  try {
    const title = parse(readText(path)).data.title;
    return typeof title === "string" && title.trim() !== "" ? title : null;
  } catch {
    return null;
  }
}

function writeYaml(p: string, data: unknown): void {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, YAML.stringify(data, { sortMapEntries: false, indentSeq: false, lineWidth: 0 }), "utf-8");
}

// ─── Artifact resolution ──────────────────────────────────────────────────────

export function isInitialized(root: string): boolean {
  return isDir(taskRoot(root));
}

export function listSubdirs(base: string, skip: Set<string> = new Set()): string[] {
  if (!isDir(base)) return [];
  return readdirSync(base).sort().filter((n) => isDir(join(base, n)) && !skip.has(n));
}

export function parseArtifactFile(path: string): { art: Artifact; doc: Document } {
  const text = readText(path);
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

export interface ScanHit { path: string; art: Artifact; doc: Document }

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
export function directoryLeaf(dir: string, want?: string): string | null {
  const leaves = want && TYPE_LEAF[want] ? [TYPE_LEAF[want]] : DIRECTORY_LEAVES;
  return leaves.map((leaf) => join(dir, leaf)).find(isFile) ?? null;
}

/** Resolve a slug or path to an artifact file path and its frontmatter document. */
export function resolveArt(root: string, selector: string, want?: string): ScanHit {
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

// ─── Scan layer ────────────────────────────────────────────────────────────────

export interface ScanIndex { hits: ScanHit[]; anomalies: Anomaly[] }

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
export function scanMemo(root: string): () => ScanIndex {
  let cached: ScanIndex | null = null;
  return () => (cached ??= scanIndex(root));
}

/** The effort graph a resolved artifact path belongs to, or null. */
export function graphForPath(graphs: Map<string, EffortGraph>, path: string): EffortGraph | null {
  for (const g of graphs.values()) {
    for (const a of [g.map, g.spec, ...g.tasks, ...g.tickets, ...g.deprecated]) {
      if (a?.path === path) return g;
    }
  }
  return null;
}

// ─── State helpers ─────────────────────────────────────────────────────────────

export function loadState(root: string): WorkflowState {
  const sp = join(taskRoot(root), "state.yaml");
  if (!existsSync(sp)) return freshState();
  try { return fromObject(readYaml(sp)); } catch { return freshState(); }
}

export function saveState(root: string, state: WorkflowState): void {
  writeYaml(join(taskRoot(root), "state.yaml"), toObject(state));
}

export function outcome(text: string, details: Record<string, unknown>): ToolOutcome {
  return { text, details };
}

// ─── Planning transition helpers ────────────────────────────────────────────

/**
 * The v5 named writers write schema-5 shape only. A v3-shape artifact goes
 * through the one-hop migration first: bolting v5 fields onto a v3 file
 * would create a hybrid shape the model does not define.
 */
export function requireV4Shape(art: Artifact): void {
  if (art.shape === "v3") {
    throw new Error(`'${art.slug}' is a v3-shape artifact; run the schema-5 migration before using the v5 writers`);
  }
}

/**
 * Clear the map's ready_for_spec flag on a planning write. Only a present
 * `true` is rewritten: absent and explicit false already read false, so the
 * frontmatter keeps its minimal shape. Returns whether the document changed.
 */
export function clearReadyForSpec(doc: Document): boolean {
  if (doc.data.ready_for_spec !== true) return false;
  doc.data.ready_for_spec = false;
  return true;
}

/**
 * The live effort directory a selector names, or null. The selector may be
 * the effort slug, an effort-directory path, or a path to an artifact inside
 * the effort (its map resolves it). The resolved directory must sit inside
 * the task tree, so a traversal selector names no effort.
 */
export function liveEffortDir(root: string, selector: string): string | null {
  const candidates = [resolvePath(taskRoot(root), selector)];
  try {
    candidates.push(dirname(resolveArt(root, selector, "map").path));
  } catch { /* not a map selector */ }
  for (const candidate of candidates) {
    const rel = relPosix(taskRoot(root), candidate);
    if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) continue;
    // An archived effort is not live: its directory sits under archive/.
    const first = rel.split(/[\\/]/)[0];
    if (first === "archive") continue;
    if (isDir(candidate)) return candidate;
  }
  return null;
}

/**
 * Normalize a whole-body write: trimmed content wrapped in single blank
 * margins, so a dumped document reads with one blank line after the opening
 * fence and ends with exactly one newline.
 */
export function normalizedBody(content: string): string {
  return `\n${content.trim()}\n`;
}

/**
 * The POSIX form of `relative(from, to)`.
 *
 * Artifact paths are POSIX everywhere else in the package: frontmatter, the
 * docs, the skills, and the tree model all write `docs/tasks/<effort>/...`.
 * A Windows host would otherwise put `docs\tasks\...` into tool results and
 * error messages, which the model then pastes into path arguments and compares
 * against prose. The result is identical on every platform, so a message is
 * never host-shaped.
 */
export function relPosix(from: string, to: string): string {
  return relative(from, to).split("\\").join("/");
}

export function isInside(dir: string, path: string): boolean {
  const rel = relPosix(dir, path);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

// ─── Tool factory ──────────────────────────────────────────────────────────────

export interface Tool {
  description: string;
  args: Record<string, unknown>;
  /** Explicit TypeBox parameter schema; replaces the args-record conversion when present. */
  parameters?: TSchema;
  /**
   * Whether registration activates the tool. The always-declared set
   * (`ALWAYS_DECLARED`: tw_open, tw_next, tw_request_tool, tw_close,
   * tw_phase_brief, and the release pair) needs no opener; every other tool is
   * activated by one, and a gated repo registers the opener and the closer
   * only.
   */
  activeByDefault?: boolean;
  /**
   * The tool's execution mode when registered. "sequential" opts the tool out
   * of the harness's parallel tool batch, so a sibling call in the same
   * message cannot run before or after it: the openers need it, because an
   * open activates tools and a close releases them.
   */
  executionMode?: "sequential";
  execute(args: Record<string, any>, ctx: ToolContext): Promise<string> | Promise<ToolOutcome>;
}

/** A tool result: text for the model plus structured details. */
interface ToolOutcome {
  text: string;
  details: Record<string, unknown>;
}

/** What a tool execute gets: the directory plus, when a session is bound, the active tool set. */
export interface ToolContext {
  directory: string;
  getActiveTools?(): string[];
  setActiveTools?(toolNames: string[]): void;
  executeTool?(name: string, args: unknown): Promise<unknown>;
  /**
   * The tools `executeTool` can call, as the session reports them. Their
   * `parameters` schema is how a nested call adapts to the installed version
   * of a sibling extension's tool (see `feedbackCall`).
   */
  tools?: readonly ToolInfo[];
  /** True when the session has dialog-capable UI (interactive or RPC mode). */
  hasUI?: boolean;
  /**
   * Run one git command against the session directory and return its stdout.
   * The branch gates read the checkout through it, so every gate test runs
   * without a repository; the session wires it to the harness's exec.
   */
  git?: GitRun;
  /**
   * The directory the git profiles are read from: the package's own by
   * default. The seam the profile fixtures are injected through.
   */
  profilesDir?: string;
  /** Put a yes/no question to the operator. Absent when the session has no UI. */
  confirm?(title: string, message: string): Promise<boolean>;
  /** Best-effort operator notification, wired from the session UI when present. */
  notify?(message: string, level: "info" | "warning" | "error"): void;
}

interface ToolInfo {
  name: string;
  parameters?: unknown;
}

export function def(description: string, args: Record<string, unknown>, exec: (args: any, ctx: any) => Promise<string>): Tool {
  return { description, args, execute: exec };
}

/** Like def, for tools with an explicit TypeBox parameter schema and structured results. */
export function defStructured(
  description: string,
  parameters: TSchema,
  exec: (args: any, ctx: ToolContext) => Promise<ToolOutcome>,
  options: { activeByDefault?: boolean; executionMode?: "sequential" } = {},
): Tool {
  return {
    description,
    args: {},
    parameters,
    activeByDefault: options.activeByDefault,
    executionMode: options.executionMode,
    execute: exec,
  };
}

export const Str = (d: string) => ({ type: "string" as const, description: d });

export const OptStr = (d: string) => ({ type: "string" as const, optional: true as const, description: d });

const Bool = (d: string) => ({ type: "boolean" as const, description: d });

export const OptBool = { type: "boolean" as const, optional: true as const };

export const OptStrArray = (d: string) => ({
  type: "array" as const,
  optional: true as const,
  items: { type: "string" as const, description: d },
});

/**
 * Render a refusal the way every tw_open refusal reads: the reason, then the
 * legal next calls. A refusal with no legal next (a duplicate open: the work
 * is already open) states the reason alone.
 */
export function refusedOuttext(reason: string, legalNext: string[]): string {
  return legalNext.length > 0
    ? `Refused: ${reason}. Legal next: ${legalNext.join("; ")}.`
    : `Refused: ${reason}.`;
}

/**
 * The pi-telemetry tool `tw_feedback` routes to. Named once: the adaptation to
 * its parameter schema (with or without `source`) is what the wrapper exists
 * for, so the name is not spelled out at the call site too.
 */
const FEEDBACK_TOOL = "submit_feedback";

/**
 * Send one workflow-feedback row through the pi-telemetry `submit_feedback`
 * tool, adapting to the installed version's parameters. Throws with the
 * store's own reason when the row was not recorded.
 */
export async function sendWorkflowFeedback(
  ctx: ToolContext,
  kind: string,
  data: unknown,
): Promise<{ namespaced: boolean; args: Record<string, unknown> }> {
  if (!ctx.executeTool) {
    throw new Error(
      "workflow feedback needs a session-bound tool executor; the pi-telemetry `submit_feedback` tool cannot be reached",
    );
  }
  // The sibling tool is inspected, not assumed: the installed version may
  // predate the `source` parameter, and the row has to be labelled correctly
  // under either shape. `ctx.tools` can omit a callable tool (a session's
  // custom tools are not in it), so an absent entry is not a rejection: it
  // only means the shape cannot be read, and a failure from the call itself
  // is where a missing store is diagnosed.
  const target = ctx.tools?.find((tool) => tool.name === FEEDBACK_TOOL);
  const call = feedbackCall(kind, data, target?.parameters);
  const result = (await ctx.executeTool(FEEDBACK_TOOL, call.args)) as
    | { isError?: boolean; content?: Array<{ text?: string }> }
    | undefined;
  if (result?.isError) {
    const detail = (result.content ?? [])
      .map((part) => part.text ?? "")
      .filter((text) => text !== "")
      .join(" ");
    const unlisted = ctx.tools !== undefined && target === undefined;
    throw new Error(
      `the workflow feedback was not recorded: ${detail === "" ? "no reason given" : detail}` +
        (unlisted
          ? ". pi-telemetry is not installed, so nothing stores feedback; " +
            "install it with: pi install npm:@y4shin/pi-telemetry"
          : ""),
    );
  }
  return { namespaced: call.namespaced, args: call.args };
}
