/**
 * Artifact model: represents the OKF artifacts in the docs/tasks/ tree.
 *
 * Pure data — no file I/O. The extension manages reading/writing files.
 *
 * Two frontmatter shapes are read:
 * - v4: OKF `type` (the artifact kind) plus `subtype` (the workflow category).
 * - v3: `kind` (the artifact kind) plus `type` (the workflow category).
 * New producers write v4 only; v3 is recognized and mapped, never written.
 */

import type { FrontmatterData } from "./frontmatter.js";

/** The OKF type values this workflow knows. Unknown values are tolerated. */
export const KNOWN_TYPES = [
  "task", "ticket", "map", "spec",
  "findings", "changelog", "out-of-scope note",
  "deviation report", "arch spec",
] as const;
export type KnownType = (typeof KNOWN_TYPES)[number];

/** Workflow category: task subtypes, then ticket subtypes. */
export const TASK_SUBTYPES = ["research", "prototype", "grilling", "manual"] as const;
export const TICKET_SUBTYPES = ["feature", "bug"] as const;

export type OkfStatus = "draft" | "stable" | "deprecated";
export type WorkflowStateValue = "todo" | "ready" | "in-progress" | "blocked" | "done";

export type ArtifactShape = "v3" | "v4";

export interface Artifact {
  /** OKF type. v4 `type:`, or v3 `kind:` mapped. */
  type: string;
  /** Workflow category. v4 `subtype:`, or v3 `type:` mapped. */
  subtype: string | null;
  /** OKF status; absent means stable. */
  status: string | null;
  /** Companion workflow field; absent on spec/map/aux. */
  workflow_state: string | null;
  /** v4: the directory name. v3: the `slug:` field. */
  slug: string;
  title: string | null;
  /** "human" or absent. */
  mode: string | null;
  /** Tickets only; absent means "m". */
  size: string | null;
  /** Kind-scoped, effort-scoped. */
  blocked_by: string[];
  /** Which frontmatter shape was read. */
  shape: ArtifactShape;
  /**
   * The artifact's file path, when the caller knows it. Set by the resolver
   * so location-based anomaly checks can run across a scanned set.
   */
  path?: string;
  /** The raw frontmatter, untouched. */
  data: FrontmatterData;
}

export interface SliceInfo {
  number: number;
  slug: string;
  status: string | null;
  size: string | null;
  blocked_by: string[];
}

/** A dependency-graph node used by maps and the Wayfinder workflow. */
export interface WorkItemInfo {
  slug: string;
  status: string | null;
  type: string | null;
  size: string | null;
  blocked_by: string[];
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String) : [];
}

/**
 * Parse an Artifact from frontmatter data.
 *
 * `dirName` supplies the slug when the frontmatter carries none (the v4
 * Concept-ID convention: the directory name is the slug).
 *
 * A non-empty type (v4 `type`, or v3 `kind`) is required: a file with
 * neither is not an artifact. An unknown type value is tolerated (OKF
 * requires consumers to tolerate unknown values).
 */
export function fromFrontmatter(data: FrontmatterData, dirName?: string): Artifact {
  const v3Kind = str(data.kind);
  const shape: ArtifactShape = v3Kind !== null ? "v3" : "v4";

  const type = v3Kind ?? str(data.type);
  if (type === null) {
    throw new Error(
      "missing 'type' in frontmatter: an artifact needs a non-empty OKF type (v4 'type' or v3 'kind')",
    );
  }

  // v4 `subtype` and v3 `type` are the same field under two names. A v3 file
  // with a `type` equal to its `kind` (a bare `kind: task, type: task`) has no
  // workflow category, so treat that as absent. In v4 the field is read
  // verbatim, since `subtype` is its own key there.
  const subtype = shape === "v4" ? str(data.subtype) : str(data.type);
  const effectiveSubtype = shape === "v3" && subtype === type ? null : subtype;

  return {
    type,
    subtype: effectiveSubtype,
    status: str(data.status),
    workflow_state: str(data.workflow_state),
    slug: str(data.slug) ?? dirName ?? "",
    title: str(data.title),
    mode: str(data.mode),
    size: str(data.size),
    blocked_by: strList(data.blocked_by),
    shape,
    data,
  };
}

/**
 * Check an OKF status against its companion workflow_state.
 *
 * Returns null when the pair is valid, else a human-readable reason.
 * An absent status means stable (OKF omitted-implies-stable). An absent
 * workflow_state has no combination to check.
 */
export function validateCombination(
  status: string | null,
  workflow_state: string | null,
): string | null {
  if (status === null || workflow_state === null) return null;
  if (status === "draft" && workflow_state !== "todo") {
    return `status 'draft' pairs only with workflow_state 'todo', not '${workflow_state}'`;
  }
  if (status === "deprecated" && workflow_state !== "done") {
    return `status 'deprecated' pairs only with workflow_state 'done', not '${workflow_state}'`;
  }
  return null;
}

export interface Anomaly {
  kind: "invalid-combination" | "missing-type" | "orphan" | "missing-blocked-by-target";
  /** Slug, or path when the slug is unknown. */
  artifact: string;
  /** One sentence, actionable. */
  detail: string;
}

/** Shape checks that need only one artifact. */
export function validateArtifact(art: Artifact): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const label = art.slug || art.path || "(unknown)";

  if (art.type.trim() === "") {
    anomalies.push({
      kind: "missing-type",
      artifact: label,
      detail: `artifact '${label}' has no non-empty OKF type`,
    });
  }

  const reason = validateCombination(art.status, art.workflow_state);
  if (reason !== null) {
    anomalies.push({
      kind: "invalid-combination",
      artifact: label,
      detail: `artifact '${label}' has an invalid status/workflow_state pair: ${reason}`,
    });
  }

  return anomalies;
}

// ─── Location-derived checks ──────────────────────────────────────────────────

/** Split a path into its non-empty segments. */
function pathParts(path: string): string[] {
  return path.split(/[\\/]/).filter((p) => p !== "");
}

/** The final path segment (the filename). */
function basenameOf(path: string): string {
  return pathParts(path).pop() ?? "";
}

/**
 * The effort directory an artifact path belongs to, or null.
 *
 * Shape-aware, so two artifacts are siblings only when they really share an
 * effort:
 * - v4 effort-grouped: `docs/tasks/<effort>/...` -> `<effort>`.
 * - v3 archived: `docs/tasks/archive/<effort>/...` -> `archive/<effort>`, so
 *   archived efforts stay distinct instead of collapsing into one bucket.
 * - v3 maps subtree: `docs/tasks/maps/<map>/...` -> `maps/<map>`, so each map
 *   is its own scope instead of collapsing into one bucket.
 * - v3 flat task: `docs/tasks/<task>/...` -> `<task>` (its own effort).
 */
function effortDirOf(path: string): string | null {
  const parts = pathParts(path);
  let marker = -1;
  for (let i = 0; i < parts.length - 1; i++) {
    if (parts[i] === "docs" && parts[i + 1] === "tasks") {
      marker = i + 1;
      break;
    }
  }
  if (marker === -1) marker = parts.indexOf("tasks");
  if (marker === -1) return null;

  const first = parts[marker + 1];
  if (first === undefined) return null;

  if (first === "archive") {
    const archived = parts[marker + 2];
    return archived === undefined ? "archive" : `archive/${archived}`;
  }
  if (first === "maps") {
    const map = parts[marker + 2];
    return map === undefined ? "maps" : `maps/${map}`;
  }
  return first;
}

/**
 * The filename each artifact type lives in, in directory-selector preference
 * order. This is the single source of the type-to-filename mapping: the
 * model's location check and the resolver's directory/priority logic all
 * derive from it, so the layout cannot drift between them.
 *
 * `task.md` is deliberately absent: it is both the v3 flat-task filename and
 * the v4 decision-task filename, so on its own it implies no type.
 */
export const TYPE_LEAVES: readonly (readonly [type: string, file: string])[] = [
  ["map", "map.md"],
  ["ticket", "ticket.md"],
  ["task", "task.md"],
  ["spec", "spec.md"],
  ["arch spec", "arch-spec.md"],
];

/** Type to filename, derived from TYPE_LEAVES. */
export const TYPE_LEAF: Record<string, string> = Object.fromEntries(TYPE_LEAVES);

/**
 * The type a filename implies, or null when the filename is type-neutral.
 *
 * `task.md` is neutral in the v3 shape (its only artifact filename) but in the
 * v4 effort-grouped layout it sits under `tasks/`, where it does imply `task`.
 * The path is consulted so the v4 case is caught without flagging every v3
 * task as an orphan.
 */
function typeForFilename(file: string, path: string): string | null {
  if (file === "task.md") {
    return isV4TaskPath(path) ? "task" : null;
  }
  for (const [type, name] of TYPE_LEAVES) {
    if (file === name) return type;
  }
  return null;
}

/**
 * True for the v4 `docs/tasks/<effort>/tasks/<task>/task.md` shape. Anchored
 * on the `docs/tasks` pair and then requiring `tasks` as the segment directly
 * after the effort, so a task directory that happens to be named `tasks` does
 * not confuse the check.
 */
function isV4TaskPath(path: string): boolean {
  const parts = pathParts(path);
  let marker = -1;
  for (let i = 0; i < parts.length - 1; i++) {
    if (parts[i] === "docs" && parts[i + 1] === "tasks") {
      marker = i + 1;
      break;
    }
  }
  if (marker === -1) return false;
  // docs/tasks/<effort>/tasks/<task-dir>/task.md
  return parts[marker + 2] === "tasks" && parts.length >= marker + 5;
}

/**
 * The effort scope an artifact belongs to, as a comparable key.
 *
 * The two shapes group differently, so the key is shape-aware:
 * - v3: the frontmatter `map:` field is the grouping (v3 flat task dirs each
 *   carry `map: <effort>`), so siblings share a map. Falling back to the
 *   directory keeps a map-less v3 artifact scoped to itself.
 * - v4: placement is the grouping (the `map:` field is dropped), so the key is
 *   the effort directory from the path.
 * - maps are their own scope in every shape: a map's `blocked_by` carries
 *   feature-to-feature edges, so its targets are other efforts' maps by
 *   design. Scoping maps to their own effort would flag every real edge.
 *
 * The prefixes keep the namespaces from colliding.
 */
function effortKeyOf(art: Artifact): string {
  if (art.type === "map") return "maps:";
  if (art.shape === "v3") {
    const m = art.data.map;
    if (typeof m === "string" && m !== "") return `map:${m}`;
  }
  const effort = art.path ? effortDirOf(art.path) : null;
  return effort === null ? "" : `dir:${effort}`;
}

/**
 * Compute the anomalies that need the whole scanned set: orphaned artifacts
 * (type disagrees with location) and blocked_by targets no artifact provides.
 */
export function findAnomalies(artifacts: Artifact[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  for (const art of artifacts) anomalies.push(...validateArtifact(art));

  // Effort directories that provide a map or a spec.
  const effortsWithAnchor = new Set<string>();
  for (const art of artifacts) {
    if (!art.path) continue;
    const effort = effortDirOf(art.path);
    if (effort === null) continue;
    const file = basenameOf(art.path);
    if (file === "map.md" || file === "spec.md") effortsWithAnchor.add(effort);
  }

  for (const art of artifacts) {
    if (!art.path) continue;
    const label = art.slug || art.path;
    const file = basenameOf(art.path);
    const implied = typeForFilename(file, art.path);
    if (implied !== null && implied !== art.type) {
      anomalies.push({
        kind: "orphan",
        artifact: label,
        detail: `artifact '${label}' is in '${file}' but declares type '${art.type}', not '${implied}'`,
      });
      continue;
    }
    if (art.type === "task" || art.type === "ticket") {
      const effort = effortDirOf(art.path);
      // Only the v4 effort-grouped layout requires an anchor. A v3 flat task
      // directory is its own effort and carries no map or spec by design, so
      // checking it there would flag every live v3 task.
      if (art.shape === "v4" && effort !== null && !effortsWithAnchor.has(effort)) {
        anomalies.push({
          kind: "orphan",
          artifact: label,
          detail: `artifact '${label}' sits in effort '${effort}', which has neither a map nor a spec`,
        });
      }
    }
  }

  // blocked_by targets, scoped to the referring artifact's effort.
  const provided = new Map<string, Set<string>>();
  for (const art of artifacts) {
    const key = effortKeyOf(art);
    if (!provided.has(key)) provided.set(key, new Set());
    provided.get(key)!.add(art.slug);
  }
  for (const art of artifacts) {
    const key = effortKeyOf(art);
    const available = provided.get(key) ?? new Set<string>();
    for (const target of art.blocked_by) {
      if (!available.has(target)) {
        const label = art.slug || art.path || "(unknown)";
        anomalies.push({
          kind: "missing-blocked-by-target",
          artifact: label,
          detail: `artifact '${label}' is blocked by '${target}', which no artifact in the same effort provides`,
        });
      }
    }
  }

  return anomalies;
}

/** Parse slice info from filename (<n>-<slug>.md) and frontmatter. */
export function sliceInfoFrom(
  filename: string,
  data: FrontmatterData,
): SliceInfo {
  const m = filename.match(/^(\d+)-(.+)\.md$/);
  if (!m) throw new Error(`invalid slice filename: ${filename}`);

  const blockedRaw = data.blocked_by;
  const blocked_by: string[] = Array.isArray(blockedRaw)
    ? blockedRaw.map(String)
    : [];

  return {
    number: parseInt(m[1], 10),
    slug: m[2],
    status: (data.status as string) ?? null,
    size: (data.size as string) ?? null,
    blocked_by,
  };
}

/** Extract dependency levels from a list of graph nodes using BFS. */
export function dependencyLevels(slices: Array<SliceInfo | WorkItemInfo>): string[][] {
  const bySlug = new Map(slices.map((s) => [s.slug, s]));
  const slugSet = new Set(slices.map((s) => s.slug));

  // Remaining slices to assign
  const remaining = new Set(slices.map((s) => s.slug));
  const levels: string[][] = [];

  while (remaining.size > 0) {
    const level: string[] = [];

    for (const slug of remaining) {
      const s = bySlug.get(slug)!;
      // A slice is ready if all its blockers are either not in the set
      // (already assigned to a previous level) or don't exist
      const blockers = s.blocked_by.filter((b) => slugSet.has(b));
      const ready = blockers.every((b) => !remaining.has(b));
      if (ready) level.push(slug);
    }

    if (level.length === 0) {
      // Circular dependency or orphaned blockers — assign the remaining
      // ones anyway so the process doesn't deadlock
      for (const slug of remaining) level.push(slug);
    }

    for (const slug of level) remaining.delete(slug);
    levels.push(level);
  }

  return levels;
}
