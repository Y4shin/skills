/**
 * The version 4 migration.
 *
 * One transformation takes any repo from any current state (fresh,
 * unversioned, v1 nested state, v2, v3, flat or maps-subtree layouts, and
 * archived trees) to the version 4 tree.
 *
 * Pure over a TreePort: the transformation never touches node:fs directly.
 * All I/O goes through the port, which is what makes failure injection and
 * in-memory fixture tests possible.
 *
 * Every destination is claimed by exactly one source: a second source
 * mapping to a claimed destination is reported for human eyes instead of
 * silently overwriting the earlier write.
 *
 * The real v4 model is imported (fromFrontmatter, validateCombination,
 * TYPE_LEAVES, TYPE_LEAF from core/art.ts; fromObject / toObject /
 * freshState from core/state.ts), so the layout and type tables stay in one
 * place and the migration cannot drift from the tools.
 */

import YAML from "yaml";
import { parse, dump, type FrontmatterData } from "./frontmatter.js";
import {
  fromFrontmatter,
  validateCombination,
  TYPE_LEAVES,
  TYPE_LEAF,
  TASK_SUBTYPES,
  KNOWN_TYPES,
} from "./art.js";
import { fromObject, toObject, freshState } from "./state.js";

/** Every file under the tree root, as repo-relative POSIX paths. */
export interface TreePort {
  list(): string[];
  read(path: string): string;
  /** Stage a write. Nothing reaches disk until commit(). */
  stageWrite(path: string, content: string): void;
  /** Stage a move (git mv semantics: history-preserving where possible). */
  stageMove(from: string, to: string): void;
  /** Stage a delete. */
  stageDelete(path: string): void;
  /**
   * Apply every staged change atomically. Validates that every staged write
   * round-trips through YAML before writing a single byte, and throws if any
   * fails or when the injected failure point is reached.
   */
  commit(opts: { failAfterWrites?: number }): void;
  /** Discard staged changes. */
  rollback(): void;
}

export interface MigrateOptions {
  /** Simulate: compute and report, stage nothing. */
  dryRun?: boolean;
  /** Resume marker path; absent means start fresh. */
  progressPath?: string;
  /** Test hook: throw when the Nth staged write would commit. */
  failAfterWrites?: number;
}

export interface Change {
  action: "add" | "move" | "rewrite" | "delete";
  path: string;
  /** For moves, the source path. */
  from?: string;
  /** One sentence, human-readable. */
  detail: string;
}

export interface HumanItem {
  kind:
    | "slice-dir"
    | "vendored-tree"
    | "unresolvable-ref"
    | "dead-pointer"
    | "unparseable"
    | "normalized-combination"
    | "no-slug"
    | "destination-collision";
  path: string;
  detail: string;
}

export interface MigrateReport {
  /** Detected schema_version (0 = unversioned). */
  from: number;
  to: 4;
  changes: Change[];
  needsHuman: HumanItem[];
  /** True when the tree is already v4 (idempotence). */
  noop: boolean;
}

const TASK_ROOT = "docs/tasks";
const STATE_PATH = `${TASK_ROOT}/state.yaml`;
const INDEX_PATH = `${TASK_ROOT}/index.md`;
const CHANGELOG_PATH = `${TASK_ROOT}/CHANGELOG.md`;
const ARCHIVE = `${TASK_ROOT}/archive`;
const MAPS = `${TASK_ROOT}/maps`;
const DEFAULT_PROGRESS_PATH = `${TASK_ROOT}/.migration-progress`;

/** The OKF version the bundle carries. */
export const OKF_VERSION = "0.2";

// ─── Small helpers ────────────────────────────────────────────────────────────

function posix(p: string): string {
  return p.split("\\").join("/").replace(/^\.\//, "");
}

function basenameOf(p: string): string {
  const i = p.lastIndexOf("/");
  return i === -1 ? p : p.slice(i + 1);
}

function segments(p: string): string[] {
  return posix(p).split("/").filter((s) => s !== "");
}

/** True when `p` is under `prefix` (or is `prefix` itself). */
function under(p: string, prefix: string): boolean {
  return p === prefix || p.startsWith(prefix + "/");
}

function isMarkdown(p: string): boolean {
  return p.endsWith(".md");
}

/** A stable, deterministic ordering for the whole transformation. */
function sorted(paths: Iterable<string>): string[] {
  return [...paths].sort();
}

// ─── YAML helpers ─────────────────────────────────────────────────────────────

function parseYamlFile(text: string): unknown {
  return YAML.parse(text);
}

function stringifyYaml(data: unknown): string {
  return YAML.stringify(data, {
    sortMapEntries: false,
    indentSeq: false,
    lineWidth: 0,
  });
}

/**
 * Serialize a document and verify it round-trips before it is staged.
 *
 * The check is against the source data, not merely self-consistency: a value
 * the frontmatter format cannot represent (a `!!set` tag, which parses to an
 * object but dumps back as a list) is caught here, before the write is
 * staged, so a rewrite that cannot round-trip never reaches the port.
 */
function dumpVerified(path: string, data: FrontmatterData, body: string): string {
  const content = dump({ data, body });
  const reparsed = parse(content).data;
  if (JSON.stringify(reparsed) !== JSON.stringify(data)) {
    throw new Error(
      `staged write to '${path}' does not round-trip through YAML: its frontmatter cannot be represented verbatim`,
    );
  }
  // Conformance: the rewritten frontmatter must parse as a real v4 artifact
  // through the same model the tools use. A rewrite that the model rejects
  // never reaches the port.
  try {
    fromFrontmatter(reparsed, slugFromPath(path));
  } catch (e) {
    throw new Error(
      `staged write to '${path}' is not a conformant v4 artifact: ${(e as Error).message}`,
    );
  }
  return content;
}

/** The slug a destination path implies: the directory that carries it. */
function slugFromPath(path: string): string {
  const parts = segments(path);
  return parts[parts.length - 2] ?? "";
}

/**
 * Verify a staged write before it lands.
 *
 * Markdown must carry parseable YAML frontmatter that is a stable fixpoint
 * (parse, dump, parse again yields the same data); every other file must
 * parse as YAML. The migration's own writes are additionally verified
 * against their source data by `dumpVerified`; this check is the port-level
 * backstop any TreePort can call at its commit boundary.
 */
export function verifyStagedWrite(path: string, content: string): void {
  if (isMarkdown(path)) {
    const doc = parse(content);
    const reparsed = parse(dump(doc));
    if (JSON.stringify(reparsed.data) !== JSON.stringify(doc.data)) {
      throw new Error(
        `staged write to '${path}' does not round-trip through YAML: its frontmatter cannot be represented verbatim`,
      );
    }
    return;
  }
  if (path.endsWith(".yaml") || path.endsWith(".yml")) {
    YAML.parse(content);
  }
}

// ─── Vintage detection ────────────────────────────────────────────────────────

/**
 * The detected vintage of the tree.
 *
 * 0 means unversioned (or fresh, with no docs/tasks at all); 1 is the nested
 * `active:` state block; 2 and 3 are the flat state shapes. The version is
 * read from `schema_version` when present, else inferred from the shape of
 * `state.yaml`.
 */
export function detectVintage(tree: TreePort): number {
  const paths = tree.list().map(posix);
  if (!paths.includes(STATE_PATH)) return 0;
  let raw: unknown;
  try {
    raw = parseYamlFile(tree.read(STATE_PATH));
  } catch (e) {
    throw new Error(`cannot read '${STATE_PATH}': ${(e as Error).message}`);
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(
      `cannot read '${STATE_PATH}': expected a YAML mapping, got ${Array.isArray(raw) ? "a list" : typeof raw}`,
    );
  }
  const obj = raw as Record<string, unknown>;
  const v = obj.schema_version;
  if (typeof v === "number") return v;
  if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
  // No stamp: v1 is recognizable by its nested `active:` block.
  if (obj.active !== undefined) return 1;
  return 0;
}

// ─── Frontmatter shaping ──────────────────────────────────────────────────────

/** The workflow category a v3 artifact carried, mapped to a v4 subtype. */
function subtypeOf(data: FrontmatterData, type: string): string | null {
  // v3 carried the category in `type:` beside `kind:`; v4 carries it in
  // `subtype:`. Only a v3 file (one with `kind:`) may read the old key, so a
  // re-run over an already-v4 file never mistakes its own `type:` for one.
  const raw = data.subtype ?? (data.kind !== undefined ? data.type : undefined);
  if (typeof raw !== "string" || raw.trim() === "") return null;
  // A bare `kind: task, type: task` carries no workflow category.
  if (raw === type) return null;
  return raw;
}

/** The OKF type a v3 artifact carried, mapped to its v4 name. */
function typeOf(data: FrontmatterData): string | null {
  // v3 wrote the artifact kind in `kind:` and the workflow category in
  // `type:`; v4 writes the kind in `type:`. Prefer `kind` when present.
  const raw = data.kind ?? data.type;
  if (typeof raw !== "string" || raw.trim() === "") return null;
  // v3 wrote findings as `kind: finding`; v4's OKF type is the plural.
  if (raw === "finding") return "findings";
  return raw;
}

/**
 * The v4 OKF type for a v3 artifact.
 *
 * v3 wrote every workflow item as `kind: task` and carried the workflow
 * category in `type:`; v4 splits them. A planning category (research,
 * prototype, grilling, manual) stays a `task`; an implementation category
 * (feature, bug) becomes a `ticket`.
 */
function effectiveType(data: FrontmatterData): string | null {
  const kind = typeOf(data);
  if (kind === null) return null;
  if (kind !== "task") return kind;
  const subtype = subtypeOf(data, kind);
  if (subtype !== null && !TASK_CATEGORIES.has(subtype)) return "ticket";
  return "task";
}

/**
 * The OKF status a v3 workflow status maps to.
 *
 * v3 `status` was the workflow state, so it maps onto the v4 pair: a done or
 * archived artifact is deprecated (terminal), a mid-authoring draft stays
 * draft, and everything else is the steady state, stable. This matches the
 * convention the v4 seed tree already uses: an archived effort's map is
 * deprecated and its done ticket is deprecated with workflow_state done.
 */
function okfStatusOf(v3Status: string | null, workflowState: string | null): string {
  if (v3Status === "draft") return "draft";
  if (v3Status === "done" || workflowState === "done") return "deprecated";
  return "stable";
}

/** The workflow_state a v3 status maps to, or null when the type has none. */
function workflowStateOf(v3Status: string | null): string | null {
  switch (v3Status) {
    case "todo":
    case "ready":
    case "in-progress":
    case "blocked":
    case "done":
      return v3Status;
    case "active":
      return "in-progress";
    case "draft":
      return "todo";
    case "proposed":
      return "todo";
    default:
      return null;
  }
}

/**
 * The v4 frontmatter for an artifact, derived from its v3 shape.
 *
 * `kind` to `type`, the old `type` to `subtype`, `slug` and `map` dropped,
 * `status` split into OKF `status` + `workflow_state`, and the legacy
 * `slices:`, `started_at`, `completed_at`, `bug:`, and slice-level `mode`
 * fields stripped. Unknown keys survive verbatim, in their original order,
 * so a re-run over an already-v4 file reproduces it byte for byte.
 */
function shapeFrontmatter(
  data: FrontmatterData,
  type: string,
  needsHuman: HumanItem[],
  path: string,
): FrontmatterData {
  const alreadyV4 = data.kind === undefined;
  const out: FrontmatterData = {};

  const v3Status = typeof data.status === "string" ? data.status : null;
  const hasWorkflow = type === "task" || type === "ticket";

  // The final OKF status / workflow_state pair. A v3 file derives it from its
  // workflow status; an already-v4 file keeps its own pair verbatim, except
  // that an invalid pair is normalized (and recorded) here too, so a
  // hand-edited or partially migrated tree converges.
  let status: string;
  let normalizedState: string | null;
  if (alreadyV4) {
    status = typeof data.status === "string" ? data.status : "stable";
    normalizedState = typeof data.workflow_state === "string" ? data.workflow_state : null;
  } else {
    normalizedState = hasWorkflow ? workflowStateOf(v3Status) : null;
    status = okfStatusOf(v3Status, normalizedState);
  }

  const derived = alreadyV4
    ? status
    : okfStatusOf(v3Status, hasWorkflow ? workflowStateOf(v3Status) : null);
  const derivedState = alreadyV4
    ? normalizedState
    : hasWorkflow
      ? workflowStateOf(v3Status)
      : null;

  if (status === "draft" && normalizedState !== null && normalizedState !== "todo") {
    normalizedState = "todo";
  }
  if (
    status === "deprecated" &&
    normalizedState !== null &&
    normalizedState !== "done"
  ) {
    normalizedState = "done";
  }
  if (validateCombination(status, normalizedState) !== null) status = "stable";
  if (status !== derived || normalizedState !== derivedState) {
    needsHuman.push({
      kind: "normalized-combination",
      path,
      detail: `normalized '${path}': status '${derived}' with workflow_state '${derivedState}' is not a valid OKF pair`,
    });
  }

  for (const [k, v] of Object.entries(data)) {
    if (
      k === "kind" ||
      k === "slug" ||
      k === "map" ||
      k === "slices" ||
      k === "started_at" ||
      k === "completed_at" ||
      k === "bug" ||
      k === "task"
    ) {
      continue;
    }
    // The map's `tasks:` array is deleted: the directory is the registration.
    if (k === "tasks" && type === "map") continue;
    if (k === "mode" && type === "slice") continue;
    if (k === "type") {
      out.type = type;
      continue;
    }
    if (k === "subtype") {
      // Keep an already-v4 file's key position, so a re-run is byte-identical.
      if (alreadyV4) out.subtype = v;
      continue;
    }
    if (k === "status") {
      out.status = status;
      continue;
    }
    if (k === "workflow_state") {
      if (normalizedState !== null) out.workflow_state = normalizedState;
      continue;
    }
    out[k] = v;
  }

  // A file that carried no `type` key at all still needs one.
  if (!("type" in out)) out.type = type;

  const subtype = subtypeOf(data, type);
  if (subtype !== null && !("subtype" in out)) out.subtype = subtype;

  if (!("status" in out)) out.status = status;
  if (normalizedState !== null && !("workflow_state" in out)) {
    out.workflow_state = normalizedState;
  }
  return out;
}

/**
 * Read an artifact's frontmatter and body.
 *
 * Returns null when the file has no frontmatter at all, and a distinct
 * `broken` marker when it has a frontmatter fence but the YAML inside will
 * not parse. The two cases are different: a file with no frontmatter is an
 * aux file to backfill, while a file with unparseable frontmatter is a
 * pre-existing defect the migration must report rather than guess at.
 */
function readDoc(
  tree: TreePort,
  path: string,
): { data: FrontmatterData; body: string } | { broken: true } | null {
  let text: string;
  try {
    text = tree.read(path);
  } catch {
    return null;
  }
  if (!text.startsWith("---")) return null;
  try {
    const doc = parse(text);
    return { data: doc.data, body: doc.body };
  } catch {
    return { broken: true };
  }
}

/** True when readDoc found a frontmatter fence the YAML parser rejects. */
function isBroken(
  doc: ReturnType<typeof readDoc>,
): doc is { broken: true } {
  return doc !== null && "broken" in doc;
}

/** The body of a markdown file: everything after its frontmatter, or the
 * whole file when it carries none. */
function bodyOf(tree: TreePort, path: string): string {
  const doc = readDoc(tree, path);
  if (doc !== null && !isBroken(doc)) return doc.body;
  const text = safeRead(tree, path) ?? "";
  if (text.startsWith("---")) {
    // A frontmatter fence the parser rejects: keep everything after the
    // closing fence so the rewrite does not drop the document's text.
    const lines = text.split("\n");
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") return lines.slice(i + 1).join("\n");
    }
  }
  return text;
}

/** The first heading of a markdown body, as a title fallback. */
function titleFromBody(body: string): string | null {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

// ─── Layout classification ────────────────────────────────────────────────────

/**
 * The v3 workflow categories that plan a task rather than implement a ticket.
 * Derived from the model, so a new planning subtype in `art.ts` is classified
 * as a task here instead of being silently misfiled as a ticket.
 */
const TASK_CATEGORIES = new Set<string>(TASK_SUBTYPES);

/**
 * The OKF types that are auxiliary files beside a primary artifact, derived
 * structurally from the model: every known type that is not itself a primary
 * artifact (a task, ticket, map, spec, or arch spec). A new aux type in
 * `art.ts` is therefore picked up automatically instead of drifting.
 */
const PRIMARY_TYPES = new Set<string>(["task", "ticket", "map", "spec", "arch spec"]);
const AUX_TYPES = new Set<string>(KNOWN_TYPES.filter((t) => !PRIMARY_TYPES.has(t)));

/**
 * The effort directory a v3 path belongs to, and whether it is archived.
 *
 * Handles the flat `docs/tasks/<task>/` sprawl, the `docs/tasks/maps/<map>/`
 * subtree, and the `docs/tasks/archive/...` tree.
 */
function vintageLocation(
  path: string,
): { archived: boolean; effort: string | null; slug: string | null } {
  const parts = segments(path);
  const i = parts.indexOf("tasks", parts.indexOf("docs") === 0 ? 1 : 0);
  if (i === -1) return { archived: false, effort: null, slug: null };
  const rest = parts.slice(i + 1);

  // `maps/archive/<map>/...`: an archived map subtree. A map carries its
  // tickets and tasks in `(tickets|tasks)/<slug>/` containers, so the slug
  // is the directory after the container, mirroring the archive branch
  // below.
  if (rest[0] === "maps" && rest[1] === "archive") {
    if ((rest[3] === "tickets" || rest[3] === "tasks") && rest[4] !== undefined) {
      return { archived: true, effort: rest[2] ?? null, slug: rest[4] };
    }
    return { archived: true, effort: rest[2] ?? null, slug: null };
  }
  // `maps/<map>/...`: the live map subtree. A live map holds its tickets
  // and tasks in `(tickets|tasks)/<slug>/` containers the same way, so the
  // slug is the directory after the container. Without it every ticket of
  // the subtree collapsed onto one `tickets/null/` destination and only the
  // last write survived.
  if (rest[0] === "maps") {
    if ((rest[2] === "tickets" || rest[2] === "tasks") && rest[3] !== undefined) {
      return { archived: false, effort: rest[1] ?? null, slug: rest[3] };
    }
    return { archived: false, effort: rest[1] ?? null, slug: null };
  }
  // `archive/<dir>/...`: the v3 archive. For a map the dir is the effort;
  // for a task it is the slug and the effort comes from its `map:` field.
  if (rest[0] === "archive") {
    // Already-v4 archive: `archive/<effort>/<tasks|tickets>/<slug>/...`.
    if ((rest[2] === "tickets" || rest[2] === "tasks") && rest[3] !== undefined) {
      return { archived: true, effort: rest[1] ?? null, slug: rest[3] };
    }
    return { archived: true, effort: null, slug: rest[1] ?? null };
  }
  // `out-of-scope/...` and the bundle's own root files have no effort.
  if (rest[0] === "out-of-scope") {
    return { archived: false, effort: null, slug: null };
  }
  // `<effort>/tickets/<slug>/...` or `<effort>/tasks/<slug>/...`: already v4.
  if ((rest[1] === "tickets" || rest[1] === "tasks") && rest[2] !== undefined) {
    return { archived: false, effort: rest[0] ?? null, slug: rest[2] };
  }
  // `<slug>/...`: the v3 flat task sprawl.
  return { archived: false, effort: null, slug: rest[0] ?? null };
}

/** The effort an artifact's own frontmatter names, when it names one. */
function effortFromFrontmatter(data: FrontmatterData): string | null {
  const m = data.map;
  if (typeof m === "string" && m.trim() !== "") return m;
  return null;
}

// ─── The transformation ───────────────────────────────────────────────────────

interface Plan {
  /** Source path -> destination path, for moves. */
  moves: Array<{ from: string; to: string }>;
  /** Destination path -> new content, for rewrites and adds. */
  writes: Map<string, string>;
  /** Destination path -> the source path that claimed it. Two different
   * sources claiming one destination is a collision: the first claim stands
   * and the rest are reported, so no write is silently overwritten. */
  claims: Map<string, string>;
  /** Paths to remove. */
  deletes: string[];
  /** Paths reported but left in place. */
  needsHuman: HumanItem[];
  changes: Change[];
}

/**
 * Migrate a tree to schema_version 4.
 *
 * Every step is independently idempotent: it detects its own already-applied
 * state and skips. The progress marker is an optimization, not the
 * correctness mechanism.
 */
export function migrate(tree: TreePort, opts: MigrateOptions = {}): MigrateReport {
  const from = detectVintage(tree);
  const progressPath = opts.progressPath ?? DEFAULT_PROGRESS_PATH;
  const allPaths = tree.list().map(posix);

  // Idempotence: an already-v4 tree needs no plan, and every step below
  // detects its own already-applied state and stages nothing. The marker is
  // an optimization, not the correctness mechanism.
  const plan: Plan = {
    moves: [],
    writes: new Map(),
    claims: new Map(),
    deletes: [],
    needsHuman: [],
    changes: [],
  };

  const doneSteps = readProgress(tree, progressPath);

  // Vendored subtrees are computed once, up front, because two steps must
  // agree on them: `reorganize` must not claim their files (it would stage a
  // source that the vendored move also stages, and one of the two would
  // silently no-op), and `reportRest` relocates them.
  const vendoredRoots = findVendoredRoots(tree, allPaths);
  const isVendored = (p: string): boolean => vendoredRoots.some((r) => under(p, r) || p === r);

  // Step 1: reorganize the layout, unify frontmatter, backfill aux files,
  // reshape the archive. One pass over every markdown file in the tree.
  if (!doneSteps.has(1)) {
    reorganize(tree, allPaths.filter((p) => !isVendored(p)), plan);
  }

  // Step 2: rebuild state.yaml.
  if (!doneSteps.has(2)) {
    rebuildState(tree, allPaths, plan, from);
  }

  // Step 3: report the rest: slice dirs, vendored trees, unresolvable refs.
  if (!doneSteps.has(3)) {
    reportRest(tree, allPaths, plan, vendoredRoots);
  }

  // Step 3b: the maps/ subtree dies with the v3 layout, so its placeholder
  // files (a .gitkeep that kept an empty directory in git) go too.
  if (!doneSteps.has(3)) {
    for (const path of allPaths) {
      if (under(path, MAPS) && basenameOf(path) === ".gitkeep") {
        plan.deletes.push(path);
        plan.changes.push({
          action: "delete",
          path,
          detail: `deleted '${path}': the maps/ subtree is gone in v4`,
        });
      }
    }
  }

  // Step 4: write the root index.
  if (!doneSteps.has(4)) {
    writeIndex(tree, plan, allPaths);
  }

  // Step 5: backfill CHANGELOG.md and out-of-scope/README.md.
  if (!doneSteps.has(5)) {
    backfillBundleFiles(tree, allPaths, plan);
  }

  // Step 6: fix the dead pointer in the onboarding report.
  if (!doneSteps.has(6)) {
    fixDeadPointer(tree, allPaths, plan);
  }

  if (opts.dryRun) {
    return {
      from,
      to: 4,
      changes: plan.changes,
      needsHuman: plan.needsHuman,
      noop: from === 4 && plan.changes.length === 0,
    };
  }

  for (const { from: src, to } of plan.moves) tree.stageMove(src, to);
  for (const [path, content] of plan.writes) tree.stageWrite(path, content);
  for (const path of plan.deletes) tree.stageDelete(path);

  // The marker records the steps this run completed. It is staged in the
  // same commit as the changes, so an interruption between the two commits
  // below leaves a marker a re-run reads and skips; every step is
  // independently idempotent, so a marker that goes missing still converges.
  writeProgress(tree, progressPath);

  // The atomicity boundary: verify that every staged write round-trips
  // through YAML before a single byte reaches the port. A malformed rewrite
  // throws here, with the tree untouched.
  try {
    for (const [path, content] of plan.writes) verifyStagedWrite(path, content);
    tree.commit({ failAfterWrites: opts.failAfterWrites });
  } catch (e) {
    // On any failure the tree is left untouched.
    tree.rollback();
    throw e;
  }

  // The marker is deleted on success: a completed migration leaves none.
  tree.stageDelete(progressPath);
  tree.commit({});

  return {
    from,
    to: 4,
    changes: plan.changes,
    needsHuman: plan.needsHuman,
    // "No-op" means the tree was already v4 and nothing was staged. A run
    // that staged nothing on a non-v4 tree (a marker claiming steps that
    // never landed) is not a no-op: the tree is still unmigrated.
    noop: from === 4 && plan.changes.length === 0,
  };
}

function readProgress(tree: TreePort, progressPath: string): Set<number> {
  const paths = tree.list().map(posix);
  if (!paths.includes(progressPath)) return new Set();
  try {
    const text = tree.read(progressPath);
    const nums = text.match(/\d+/g) ?? [];
    return new Set(nums.map(Number));
  } catch {
    return new Set();
  }
}

function writeProgress(tree: TreePort, progressPath: string): void {
  const steps = [1, 2, 3, 4, 5, 6];
  tree.stageWrite(progressPath, steps.join("\n") + "\n");
}

// ─── Step 1: reorganize ───────────────────────────────────────────────────────

/**
 * One pass over every markdown file: classify it, work out its v4 home,
 * stage the move, and stage the reshaped frontmatter.
 *
 * Idempotence: a file already in its v4 home with v4 frontmatter stages
 * nothing.
 */
function reorganize(
  tree: TreePort,
  paths: string[],
  plan: Plan,
): void {
  // The migration owns the docs/tasks bundle. Markdown elsewhere in the
  // repo (docs/ideas, docs/adr, the root README) is out of scope: never
  // moved, rewritten, or reported.
  const markdown = sorted(paths.filter((p) => isMarkdown(p) && under(p, TASK_ROOT)));
  const legacySliceDirs = new Set<string>();

  // First pass: classify every primary artifact, so an aux file can be
  // placed beside the artifact it belongs to.
  const placement = new Map<string, { effort: string; container: string; archived: boolean }>();
  const archSpecCount = new Map<string, number>();
  // Effort roots that a map or spec anchors, for map-level aux files.
  const effortRoots = new Map<string, { effort: string; archived: boolean }>();
  for (const path of markdown) {
    const loc = vintageLocation(path);
    const doc = readDoc(tree, path);
    if (doc === null || isBroken(doc)) continue;
    const type = effectiveType(doc.data);
    if (type !== "task" && type !== "ticket") {
      // A map or spec anchors its effort root, so an aux file beside it has
      // a home even when no task or ticket shares the directory.
      if (type === "map" || type === "spec") {
        const effort = loc.effort ?? effortFromFrontmatter(doc.data) ?? loc.slug ?? "";
        if (effort !== "") effortRoots.set(placeKey(loc), { effort, archived: loc.archived });
      }
      continue;
    }
    const effort = loc.effort ?? effortFromFrontmatter(doc.data) ?? loc.slug ?? "";
    if (effort === "") continue;
    const container = type === "task" ? "tasks" : "tickets";
    placement.set(placeKey(loc), {
      effort,
      container,
      archived: loc.archived,
    });
  }
  // How many arch specs each effort root would receive: an effort with one
  // may hoist it to the root, an effort with several must keep each in its
  // own directory or all but one would be silently lost.
  for (const path of markdown) {
    if (basenameOf(path) !== "arch-spec.md") continue;
    const place = placement.get(placeKey(vintageLocation(path)));
    if (place === undefined) continue;
    const rootKey = `${place.archived ? "archive" : "live"}/${place.effort}`;
    archSpecCount.set(rootKey, (archSpecCount.get(rootKey) ?? 0) + 1);
  }

  for (const path of markdown) {
    const loc = vintageLocation(path);

    // Legacy slice docs: reported, never moved or rewritten.
    if (segments(path).includes("slices")) {
      legacySliceDirs.add(path.slice(0, path.lastIndexOf("/")));
      continue;
    }

    // The bundle's own root files are handled by their own steps.
    if (path === INDEX_PATH || path === CHANGELOG_PATH) continue;
    if (under(path, `${TASK_ROOT}/out-of-scope`)) continue;

    const doc = readDoc(tree, path);
    if (isBroken(doc)) {
      // The file has a frontmatter fence the YAML parser rejects. The
      // migration never guesses at a broken document: it reports it and
      // leaves it byte-identical.
      plan.needsHuman.push({
        kind: "unparseable",
        path,
        detail: `'${path}' has frontmatter that does not parse as YAML; fix it by hand and re-run`,
      });
      continue;
    }
    if (doc === null) {
      // A markdown file with no frontmatter: an aux file to backfill.
      const type = auxTypeForPath(path);
      if (type === null) {
        // An unrecognized markdown beside an effort anchor (a handoff, a
        // comparison note, a limitations list) still belongs to that effort:
        // move it with the anchor and give it conformant frontmatter, so the
        // maps/ subtree empties and the bundle stays OKF-conformant.
        const anchor = effortRoots.get(placeKey(loc)) ?? placement.get(placeKey(loc));
        if (anchor !== undefined) {
          const base = anchor.archived ? ARCHIVE : TASK_ROOT;
          const inContainer = "container" in anchor;
          const dest = inContainer
            ? `${base}/${anchor.effort}/${(anchor as { container: string }).container}/${loc.slug ?? ""}/${basenameOf(path)}`
            : `${base}/${anchor.effort}/${basenameOf(path)}`;
          if (claimDest(plan, dest, path)) {
            stageMoveIfNeeded(path, dest, plan);
            plan.writes.set(
              dest,
              dumpVerified(dest, {
                type: "out-of-scope note",
                title:
                  titleFromBody(doc0(tree, path).body) ?? basenameOf(path).replace(/\.md$/, ""),
                status: "stable",
              }, doc0(tree, path).body),
            );
            plan.changes.push({
              action: "move",
              path: dest,
              from: path,
              detail: `moved '${path}' beside its effort at '${dest}' with conformant frontmatter`,
            });
          }
        }
        continue;
      }
      const dest = auxHome(path, loc, placement, archSpecCount);
      const data: FrontmatterData = {
        type,
        title: titleFromBody(doc0(tree, path).body) ?? basenameOf(path).replace(/\.md$/, ""),
        status: "stable",
      };
      if (claimDest(plan, dest, path)) {
        stageMoveIfNeeded(path, dest, plan);
        plan.writes.set(dest, dumpVerified(dest, data, doc0(tree, path).body));
        plan.changes.push({
          action: dest === path ? "rewrite" : "move",
          path: dest,
          from: dest === path ? undefined : path,
          detail: `backfilled frontmatter on '${dest}'`,
        });
      }
      continue;
    }

    const type = effectiveType(doc.data);
    if (type === null) continue;

    const dest = v4Home(path, type, doc.data, loc, placement, archSpecCount, plan.needsHuman);
    if (dest === null) continue;
    if (!claimDest(plan, dest, path)) continue;

    const shaped = shapeFrontmatter(doc.data, type, plan.needsHuman, dest);
    const content = dumpVerified(dest, shaped, doc.body);
    stageMoveIfNeeded(path, dest, plan);
    if (content !== safeRead(tree, path) || dest !== path) {
      plan.writes.set(dest, content);
      plan.changes.push({
        action: dest === path ? "rewrite" : "move",
        path: dest,
        from: dest === path ? undefined : path,
        detail:
          dest === path
            ? `unified frontmatter on '${dest}'`
            : `moved '${path}' to '${dest}' and unified its frontmatter`,
      });
    }
  }

  for (const dir of sorted(legacySliceDirs)) {
    plan.needsHuman.push({
      kind: "slice-dir",
      path: dir,
      detail: `legacy slice directory '${dir}' is reported and left in place (v4 dropped slice support)`,
    });
  }
}

function doc0(tree: TreePort, path: string): { data: FrontmatterData; body: string } {
  try {
    return parse(tree.read(path));
  } catch {
    return { data: {}, body: tree.read(path) };
  }
}

function safeRead(tree: TreePort, path: string): string | null {
  try {
    return tree.read(path);
  } catch {
    return null;
  }
}

/** The key an aux file and its primary artifact share. */
function placeKey(loc: { archived: boolean; slug: string | null }): string {
  return `${loc.archived ? "archive/" : ""}${loc.slug ?? ""}`;
}

/**
 * The v4 home for an aux file (spec, arch spec, findings, deviation report).
 *
 * An aux file sits beside the artifact it belongs to. `arch-spec.md` is the
 * exception: it is shared by an effort's whole ticket chain, so it lives at
 * the effort root. That move is only safe when the effort has exactly one
 * arch spec; when several exist (a v3 archive can hold several tasks per
 * effort, each with its own), collapsing them would silently lose all but
 * one, so each keeps its own directory instead.
 */
function auxDest(
  path: string,
  file: string,
  loc: { archived: boolean; effort: string | null; slug: string | null },
  place: { effort: string; container: string; archived: boolean },
  archSpecCount: Map<string, number>,
): string {
  const base = place.archived ? ARCHIVE : TASK_ROOT;
  const rootKey = `${place.archived ? "archive" : "live"}/${place.effort}`;
  if (file === "arch-spec.md" && (archSpecCount.get(rootKey) ?? 0) === 1) {
    return `${base}/${place.effort}/arch-spec.md`;
  }
  const containerDir = segments(path).includes("deviation-reports")
    ? "deviation-reports/"
    : "";
  return `${base}/${place.effort}/${place.container}/${loc.slug ?? ""}/${containerDir}${file}`;
}

/** The aux-file destination for a frontmatter-less markdown file. */
function auxHome(
  path: string,
  loc: { archived: boolean; effort: string | null; slug: string | null },
  placement: Map<string, { effort: string; container: string; archived: boolean }>,
  archSpecCount: Map<string, number>,
): string {
  const place = placement.get(placeKey(loc));
  if (place !== undefined) {
    return auxDest(path, basenameOf(path), loc, place, archSpecCount);
  }
  // No primary artifact to sit beside: keep the file where it is.
  return path;
}

/**
 * The OKF type an aux filename implies, or null.
 *
 * The type-to-filename mapping for the primary artifacts comes from
 * `TYPE_LEAF` (the model's single source), so the migration cannot drift
 * from the tools. `findings.md` and `CHANGELOG.md` are aux files the model
 * does not name, so they are listed here.
 */
function auxTypeForFilename(file: string): string | null {
  for (const [type, name] of TYPE_LEAVES) {
    if (name === file) return type;
  }
  if (file === "findings.md") return "findings";
  if (file === "CHANGELOG.md") return "changelog";
  return null;
}

/**
 * The OKF type an aux file's path implies, or null.
 *
 * A file under `deviation-reports/` is a deviation report whatever its own
 * name; every other aux file is recognized by its filename.
 */
function auxTypeForPath(path: string): string | null {
  if (segments(path).includes("deviation-reports")) return "deviation report";
  return auxTypeForFilename(basenameOf(path));
}

/** The v4 home for an artifact, or null when it has no home. */
function v4Home(
  path: string,
  type: string,
  data: FrontmatterData,
  loc: { archived: boolean; effort: string | null; slug: string | null },
  placement: Map<string, { effort: string; container: string; archived: boolean }>,
  archSpecCount: Map<string, number>,
  needsHuman: HumanItem[],
): string | null {
  const base = loc.archived ? ARCHIVE : TASK_ROOT;
  const slug = loc.slug;

  if (type === "map") {
    const effort = loc.effort ?? effortFromFrontmatter(data) ?? (slug ?? "");
    if (effort === "") return null;
    return `${base}/${effort}/map.md`;
  }
  if (type === "spec") {
    const effort = loc.effort ?? effortFromFrontmatter(data) ?? (slug ?? "");
    if (effort === "") return null;
    return `${base}/${effort}/spec.md`;
  }
  if (type === "arch spec") {
    const effort = loc.effort ?? effortFromFrontmatter(data) ?? (slug ?? "");
    if (effort === "") return null;
    // Shared by the effort's whole chain, so it lives at the effort root,
    // unless several arch specs share that effort (then each keeps its own
    // directory so none is lost).
    const place = placement.get(placeKey(loc));
    if (place !== undefined) {
      return auxDest(path, "arch-spec.md", loc, place, archSpecCount);
    }
    return `${base}/${effort}/arch-spec.md`;
  }
  if (type === "task" || type === "ticket") {
    const effort = loc.effort ?? effortFromFrontmatter(data) ?? (slug ?? "");
    if (effort === "") return null;
    if (slug === null) {
      // Never interpolate: a null slug in the template below becomes the
      // literal text `null`, and every slugless artifact of an effort would
      // collapse onto one `tickets/null/` destination. Report and skip, the
      // same bail-out the empty-effort guard above performs.
      needsHuman.push({
        kind: "no-slug",
        path,
        detail: `'${path}' is a ${type} whose slug cannot be derived from its path; it is left in place`,
      });
      return null;
    }
    const container = type === "task" ? "tasks" : "tickets";
    const leaf = TYPE_LEAF[type] ?? `${type}.md`;
    return `${base}/${effort}/${container}/${slug}/${leaf}`;
  }
  if (AUX_TYPES.has(type)) {
    // An aux file sits beside the artifact it belongs to.
    return auxHome(path, loc, placement, archSpecCount);
  }
  return null;
}

function stageMoveIfNeeded(from: string, to: string, plan: Plan): void {
  if (from === to) return;
  plan.moves.push({ from, to });
}

/**
 * Claim a destination for a source.
 *
 * The first claim stands. A later, different source is reported for human
 * eyes and stages nothing: a would-be silent overwrite (the collapse that
 * loses every earlier file) becomes a needs-human item instead. This is the
 * backstop for any future destination bug: it can surface as a report, but
 * never again as silent data loss.
 */
function claimDest(plan: Plan, dest: string, source: string): boolean {
  const claimed = plan.claims.get(dest);
  if (claimed === undefined || claimed === source) {
    plan.claims.set(dest, source);
    return true;
  }
  plan.needsHuman.push({
    kind: "destination-collision",
    path: dest,
    detail: `'${source}' would also land at '${dest}', already claimed by '${claimed}'; '${source}' is left in place`,
  });
  return false;
}

// ─── Step 2: rebuild state.yaml ───────────────────────────────────────────────

/**
 * Rebuild `state.yaml` as `{schema_version: 4, map, task}` with real nulls.
 *
 * The `map` pointer is seeded from the old `map` pointer (or the v1 `active`
 * block), and the legacy `slice` key is dropped. Unknown keys the state module
 * does not model are dropped too: v4 owns the shape.
 */
function rebuildState(tree: TreePort, paths: string[], plan: Plan, from: number): void {
  const state = freshState();
  if (paths.includes(STATE_PATH)) {
    try {
      const parsed = fromObject(parseYamlFile(tree.read(STATE_PATH)));
      state.map = parsed.map;
      state.task = parsed.task;
    } catch {
      /* a corrupt state file rebuilds empty */
    }
  }
  // The state module owns the shape: `toObject` puts the modeled pointers in
  // place, and the migration is the only writer of the stamp.
  const obj: Record<string, unknown> = { schema_version: 4, ...toObject(state) };
  const content = stringifyYaml(obj);
  if (safeRead(tree, STATE_PATH) !== content) {
    if (claimDest(plan, STATE_PATH, STATE_PATH)) {
      plan.writes.set(STATE_PATH, content);
      plan.changes.push({
        action: "rewrite",
        path: STATE_PATH,
        detail: `rebuilt state.yaml at schema_version 4 (from vintage ${from})`,
      });
    }
  }
}

// ─── Step 3: report the rest ──────────────────────────────────────────────────

/**
 * A vendored non-OKF tree: a self-contained directory subtree under the bundle
 * holding foreign markdown (no OKF `type`/`kind`), such as a clone of an
 * external skills repo kept for reference.
 *
 * The rule is general rather than name-based, so any repo's vendored clone is
 * caught. It is also deliberately conservative, because a false positive
 * relocates a user's own notes out of the bundle:
 *
 * - A subtree must hold **zero valid OKF artifacts**. A task directory with a
 *   couple of frontmatter-less aux files is normal (the migration backfills
 *   them), whereas a vendored clone contains nothing this workflow owns.
 * - A subtree must look like a *tree*, not a folder of loose notes: either it
 *   has its own nested subdirectory, or it holds enough non-OKF markdown files
 *   to be a real corpus. Two flat notes are backfilled, not relocated.
 * - Effort roots and recognized artifact containers (`tasks/`, `tickets/`,
 *   `slices/`, `deviation-reports/`, `archive/`) are never vendored.
 */
const ARTIFACT_CONTAINERS = new Set(["tasks", "tickets", "slices", "deviation-reports", "archive"]);

/** Non-OKF markdown files that make a flat directory a real corpus. */
const VENDORED_FILE_THRESHOLD = 5;

/** True when a markdown file's frontmatter is not a valid OKF artifact. */
function isNonOkfMarkdown(text: string): boolean {
  try {
    fromFrontmatter(parse(text).data);
    return false;
  } catch {
    return true;
  }
}

/**
 * True when the directory ending at `parts[i - 1]` is an effort directory
 * rather than a nested subdirectory: `docs/tasks/<effort>` in the live layout,
 * or `docs/tasks/{archive,maps}/<effort>` in the v3 ones. A vendored clone
 * lives *inside* an effort, never as the effort itself.
 */
function isEffortDir(parts: string[], i: number): boolean {
  if (i === 3) return true;
  if (i === 4) {
    const afterBundle = parts[2] ?? "";
    return afterBundle === "archive" || afterBundle === "maps";
  }
  return false;
}

/** The vendored subtrees found under the bundle, shallowest first. */
function findVendoredRoots(tree: TreePort, paths: string[]): string[] {
  // Per candidate directory subtree: how many non-OKF markdown files it holds,
  // whether it holds any valid artifact, and whether it has its own nested
  // subdirectory (the structural signal of a tree rather than loose notes).
  const nonOkf = new Map<string, number>();
  const hasArtifact = new Set<string>();
  const hasNestedDir = new Set<string>();

  for (const path of sorted(paths.filter(isMarkdown))) {
    if (!under(path, TASK_ROOT)) continue;
    const text = safeRead(tree, path);
    if (text === null) continue;
    const foreign = isNonOkfMarkdown(text);
    const parts = segments(path);
    // `i` is the segment count of the candidate directory. Depth 3 is the
    // first level below the bundle (an effort dir, so excluded), which is what
    // keeps an effort root from being mistaken for a vendored clone inside it.
    for (let i = 3; i < parts.length; i++) {
      const last = parts[i - 1] ?? "";
      if (ARTIFACT_CONTAINERS.has(last)) continue;
      if (isEffortDir(parts, i)) continue;
      const dir = parts.slice(0, i).join("/");
      if (!under(dir, TASK_ROOT)) continue;
      if (foreign) nonOkf.set(dir, (nonOkf.get(dir) ?? 0) + 1);
      else hasArtifact.add(dir);
      // A markdown file at least two levels below the candidate root means the
      // candidate contains a nested directory of its own.
      if (parts.length - 1 >= i + 1) hasNestedDir.add(dir);
    }
  }

  // A candidate is vendored when it holds at least two non-OKF markdown files,
  // holds no valid artifact, looks like a tree (nested directory or a real
  // corpus), and no ancestor of it is already vendored (keep the shallowest
  // root).
  const roots: string[] = [];
  for (const [dir, count] of [...nonOkf.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (count < 2) continue;
    if (!hasNestedDir.has(dir) && count < VENDORED_FILE_THRESHOLD) continue;
    if (hasArtifact.has(dir)) continue;
    if (roots.some((r) => under(dir, r))) continue;
    roots.push(dir);
  }
  return roots;
}

/**
 * The destination for a vendored tree: outside the bundle, namespaced by its
 * containing effort so two efforts with a same-named clone cannot collide and
 * silently overwrite each other.
 */
function vendoredDest(root: string): string {
  const parts = segments(root);
  // `docs/tasks/<effort>/...` (effort at index 2) or
  // `docs/tasks/{archive,maps}/<effort>/...` (effort at index 3).
  const afterBundle = parts[2] ?? "";
  const effort = afterBundle === "archive" || afterBundle === "maps" ? parts[3] : parts[2];
  const name = basenameOf(root);
  return effort === undefined || effort === name ? `docs/vendored/${name}` : `docs/vendored/${effort}/${name}`;
}

function reportRest(tree: TreePort, paths: string[], plan: Plan, vendoredRoots: string[]): void {
  // Vendored trees: a non-OKF subtree inside the bundle. It moves outside the
  // bundle with a pointer left behind.
  const vendored = new Set<string>(vendoredRoots);
  for (const root of sorted(vendored)) {
    const dest = vendoredDest(root);
    plan.needsHuman.push({
      kind: "vendored-tree",
      path: root,
      detail: `vendored tree '${root}' moves outside the bundle to '${dest}' with a pointer left behind`,
    });
    // Only move sources this step actually owns. `reorganize` claims every
    // non-vendored markdown file, so a file inside a vendored subtree must be
    // excluded there; asserting it here keeps a double-claim from silently
    // no-opping the relocation.
    const claimed = new Set(plan.moves.map((m) => m.from));
    for (const path of sorted(paths.filter((p) => under(p, root)))) {
      if (claimed.has(path)) {
        throw new Error(
          `internal error: '${path}' is staged by two steps (reorganize and the vendored move); refusing to plan an ambiguous migration`,
        );
      }
      plan.moves.push({ from: path, to: path.replace(root, dest) });
      plan.changes.push({
        action: "move",
        path: path.replace(root, dest),
        from: path,
        detail: `moved vendored file '${path}' outside the bundle`,
      });
    }
    const pointer = `${dirnameOf(root)}/${basenameOf(root)}.pointer.md`;
    if (claimDest(plan, pointer, root)) {
      plan.writes.set(
        pointer,
        dumpVerified(
          pointer,
          {
            type: "out-of-scope note",
            title: `Vendored tree moved: ${basenameOf(root)}`,
            status: "stable",
          },
          `\nThe vendored tree formerly at \`${root}\` now lives at \`${dest}\`.\n`,
        ),
      );
      plan.changes.push({
        action: "add",
        path: pointer,
        detail: `left a pointer at '${pointer}' naming the vendored tree's new home`,
      });
    }
  }

  // Unresolvable blocked_by references: reported, never dropped silently.
  const provided = new Set<string>();
  for (const path of paths) {
    if (!isMarkdown(path)) continue;
    const doc = readDoc(tree, path);
    if (doc === null || isBroken(doc)) continue;
    const slug = slugOf(path);
    if (slug !== null) provided.add(slug);
  }
  for (const path of sorted(paths.filter(isMarkdown))) {
    const doc = readDoc(tree, path);
    if (doc === null || isBroken(doc)) continue;
    const blocked = doc.data.blocked_by;
    if (!Array.isArray(blocked)) continue;
    for (const target of blocked.map(String)) {
      if (provided.has(target)) continue;
      plan.needsHuman.push({
        kind: "unresolvable-ref",
        path,
        detail: `'${path}' is blocked by '${target}', which no artifact in the tree provides`,
      });
    }
  }
}

/** The slug a path implies: its directory name, or the leaf's own name. */
function slugOf(path: string): string | null {
  const parts = segments(path);
  const file = basenameOf(path);
  if (file === "task.md" || file === "ticket.md" || file === "map.md") {
    return parts[parts.length - 2] ?? null;
  }
  return null;
}

function dirnameOf(p: string): string {
  const i = p.lastIndexOf("/");
  return i === -1 ? "" : p.slice(0, i);
}

// ─── Step 4: the root index ───────────────────────────────────────────────────

/**
 * Write `docs/tasks/index.md` carrying `okf_version: "0.2"` and a listing of
 * the tree.
 *
 * The listing is derived from the tree's final shape (each source path mapped
 * through the planned moves), so a re-run over the migrated tree computes the
 * same listing and stages nothing.
 */
function writeIndex(tree: TreePort, plan: Plan, paths: string[]): void {
  const moved = new Map(plan.moves.map((m) => [m.from, m.to]));
  const deleted = new Set(plan.deletes);
  // The index must describe the FINAL tree, not the pre-migration one, or a
  // second run (which reads the migrated tree) computes a different listing
  // and idempotence breaks. So the path set is: every surviving original path
  // at its destination, plus every file this plan adds.
  const finalPaths = [
    ...paths.filter((p) => !deleted.has(p)).map((p) => moved.get(p) ?? p),
    ...plan.writes.keys(),
  ];

  const live = new Set<string>();
  const archived = new Set<string>();
  for (const path of finalPaths) {
    // Placeholder files (.gitkeep) and non-artifact files are not efforts.
    const file = basenameOf(path);
    if (file.startsWith(".") || !file.endsWith(".md")) continue;
    const parts = segments(path);
    const i = parts.indexOf("tasks", parts.indexOf("docs") === 0 ? 1 : 0);
    if (i === -1) continue;
    const rest = parts.slice(i + 1);
    const first = rest[0];
    if (first === undefined) continue;
    if (first === "out-of-scope") continue;
    if (first === "archive") {
      // `archive/<effort>/...` is an archived effort. The legacy
      // `archive/<slug>/...` shape has already moved by this point, so a
      // remaining second segment is the effort.
      if (rest[1] !== undefined && rest.length > 2) archived.add(rest[1]);
      continue;
    }
    if (first === "maps") {
      if (rest[1] === "archive") {
        if (rest[2] !== undefined) archived.add(rest[2]);
      } else if (rest[1] !== undefined) {
        live.add(rest[1]);
      }
      continue;
    }
    if (rest.length === 1) continue;
    live.add(first);
  }

  const lines = ["", "# docs/tasks", ""];
  lines.push("## Live", "");
  if (live.size === 0) lines.push("(none)", "");
  else {
    for (const effort of sorted(live)) lines.push(`- ${effort}`);
    lines.push("");
  }
  lines.push("## Archived", "");
  if (archived.size === 0) lines.push("(none)", "");
  else {
    for (const effort of sorted(archived)) lines.push(`- ${effort}`);
    lines.push("");
  }
  const body = lines.join("\n");

  const data: FrontmatterData = {
    type: "index",
    okf_version: OKF_VERSION,
    title: "docs/tasks",
  };
  const content = dumpVerified(INDEX_PATH, data, body);
  if (safeRead(tree, INDEX_PATH) === content) return;
  if (claimDest(plan, INDEX_PATH, INDEX_PATH)) {
    plan.writes.set(INDEX_PATH, content);
    plan.changes.push({
      action: "add",
      path: INDEX_PATH,
      detail: `wrote '${INDEX_PATH}' with okf_version "${OKF_VERSION}" and the tree listing`,
    });
  }
}

// ─── Step 5: bundle files ─────────────────────────────────────────────────────

/** Backfill CHANGELOG.md and out-of-scope/README.md (which becomes index.md). */
function backfillBundleFiles(tree: TreePort, paths: string[], plan: Plan): void {
  if (paths.includes(CHANGELOG_PATH)) {
    const body = bodyOf(tree, CHANGELOG_PATH) || "\n# Task Changelog\n";
    const data: FrontmatterData = { type: "changelog", title: "Task Changelog" };
    const content = dumpVerified(CHANGELOG_PATH, data, body);
    if (safeRead(tree, CHANGELOG_PATH) !== content) {
      if (claimDest(plan, CHANGELOG_PATH, CHANGELOG_PATH)) {
        plan.writes.set(CHANGELOG_PATH, content);
        plan.changes.push({
          action: "rewrite",
          path: CHANGELOG_PATH,
          detail: `backfilled frontmatter on '${CHANGELOG_PATH}'`,
        });
      }
    }
  } else {
    const data: FrontmatterData = { type: "changelog", title: "Task Changelog" };
    if (claimDest(plan, CHANGELOG_PATH, CHANGELOG_PATH)) {
      plan.writes.set(CHANGELOG_PATH, dumpVerified(CHANGELOG_PATH, data, "\n# Task Changelog\n"));
      plan.changes.push({
        action: "add",
        path: CHANGELOG_PATH,
        detail: `created '${CHANGELOG_PATH}' with conformant frontmatter`,
      });
    }
  }

  const oosReadme = `${TASK_ROOT}/out-of-scope/README.md`;
  const oosIndex = `${TASK_ROOT}/out-of-scope/index.md`;
  if (paths.includes(oosReadme)) {
    const body = bodyOf(tree, oosReadme) || "\n# out-of-scope\n";
    const data: FrontmatterData = {
      type: "out-of-scope note",
      title: "out-of-scope",
      status: "stable",
    };
    if (claimDest(plan, oosIndex, oosReadme)) {
      plan.moves.push({ from: oosReadme, to: oosIndex });
      plan.writes.set(oosIndex, dumpVerified(oosIndex, data, body));
      plan.changes.push({
        action: "move",
        path: oosIndex,
        from: oosReadme,
        detail: `moved '${oosReadme}' to '${oosIndex}' with conformant frontmatter`,
      });
    }
  }
}

// ─── Step 6: the dead pointer ─────────────────────────────────────────────────

/**
 * Report the dead `/skill:task-overview` pointer wherever it survives in the
 * tree.
 *
 * The pointer's home is the onboarding report, which is the setup-workflow
 * skill's own text; that fix is a prose change in the skill, not a tree
 * rewrite. Rewriting a live or archived document's prose here would silently
 * edit artifact content the migration does not own, so the migration reports
 * each surviving occurrence for human eyes instead.
 */
function fixDeadPointer(tree: TreePort, paths: string[], plan: Plan): void {
  for (const path of sorted(paths.filter(isMarkdown))) {
    if (!under(path, TASK_ROOT)) continue;
    const text = safeRead(tree, path);
    if (text === null) continue;
    if (!text.includes("/skill:task-overview")) continue;
    plan.needsHuman.push({
      kind: "dead-pointer",
      path,
      detail: `'${path}' still names the retired '/skill:task-overview'; the live skill is '/skill:task-workflow-overview'`,
    });
  }
}
