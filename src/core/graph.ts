/**
 * Effort graph: pure computation over scanned artifacts.
 *
 * No file I/O (same rule as art.ts). The scan layer in pi.ts hands over a
 * view of its index; every function here reads only the artifacts it is
 * given.
 *
 * Semantics (per the effort spec's Graph semantics section):
 * - Done-ness gates on `workflow_state: done` only. Deprecated tasks and
 *   tickets count as done and sit out of the graph, collected into
 *   `deprecated` so they are reported rather than silently dropped.
 * - `blocked_by` edges are kind-scoped (tasks to tasks, tickets to tickets)
 *   and effort-scoped. The map carries feature-to-feature edges.
 * - Frontiers and levels are computed per kind within an effort.
 */

import { dependencyLevels, effortDirOf, effortKeyOf, type Anomaly, type Artifact, type WorkItemInfo } from "./art.js";

export interface EffortGraph {
  /** The effort's anchor slug: map slug, else the effort directory name. */
  slug: string;
  map: Artifact | null;
  spec: Artifact | null;
  tasks: Artifact[];
  tickets: Artifact[];
  deprecated: Artifact[];
  anomalies: Anomaly[];
}

/** Loose coupling: the scan layer hands over this view of its index. */
export interface ScanIndexLike {
  hits: ReadonlyArray<{ path: string; art: Artifact }>;
  anomalies: Anomaly[];
}

/**
 * The grouping key for an artifact.
 *
 * `effortKeyOf` scopes every map into one bucket on purpose (a map's
 * `blocked_by` targets are other efforts' maps), so a map groups by the
 * effort directory its path names instead: a map is its effort's anchor and
 * must land with the effort's own tasks and tickets.
 */
function groupKeyOf(art: Artifact): string {
  if (art.type === "map" && art.path) {
    const dir = effortDirOf(art.path);
    if (dir !== null) return `dir:${dir}`;
  }
  return effortKeyOf(art);
}

/** The human-readable effort slug a grouping key stands for. */
function slugFromKey(key: string): string {
  const body = key.replace(/^(dir|map|maps):/, "");
  const parts = body.split("/").filter((p) => p !== "");
  return parts.length === 0 ? "" : parts[parts.length - 1];
}

function isDeprecated(art: Artifact): boolean {
  return art.status === "deprecated";
}

function isDone(art: Artifact): boolean {
  return art.workflow_state === "done" || isDeprecated(art);
}

/** Group scanned hits into effort graphs, keyed by effort scope. */
export function effortGraphs(index: ScanIndexLike): Map<string, EffortGraph> {
  const groups = new Map<string, Artifact[]>();
  for (const hit of index.hits) {
    const key = groupKeyOf(hit.art);
    const bucket = groups.get(key);
    if (bucket) bucket.push(hit.art);
    else groups.set(key, [hit.art]);
  }

  // A map whose slug names an effort that also has its own group folds into
  // that group. The slug fallback covers a v3 map whose children carry a
  // `map:` field instead of living in the effort directory.
  for (const [key, arts] of [...groups]) {
    if (!key.startsWith("dir:")) continue;
    if (!arts.every((a) => a.type === "map")) continue;
    const slug = slugFromKey(key);
    const target = groups.get(`map:${slug}`);
    if (target) {
      target.push(...arts);
      groups.delete(key);
    }
  }

  const graphs = new Map<string, EffortGraph>();
  for (const [key, arts] of groups) {
    graphs.set(key, buildGraph(slugFromKey(key), arts, index.anomalies));
  }
  return graphs;
}

function buildGraph(slug: string, arts: Artifact[], anomalies: Anomaly[]): EffortGraph {
  const map = arts.find((a) => a.type === "map") ?? null;
  const spec = arts.find((a) => a.type === "spec") ?? null;
  const items = arts.filter((a) => a.type === "task" || a.type === "ticket");

  const slugs = new Set(arts.map((a) => a.slug));
  const paths = new Set(arts.map((a) => a.path).filter((p): p is string => typeof p === "string"));
  const own = anomalies.filter((an) => slugs.has(an.artifact) || paths.has(an.artifact));

  return {
    slug: map?.slug ?? spec?.slug ?? slug,
    map,
    spec,
    tasks: items.filter((a) => a.type === "task" && !isDeprecated(a)),
    tickets: items.filter((a) => a.type === "ticket" && !isDeprecated(a)),
    deprecated: items.filter(isDeprecated),
    anomalies: own,
  };
}

/** Every task and ticket of the effort, deprecated ones included. */
function allItems(graph: EffortGraph): Artifact[] {
  return [...graph.tasks, ...graph.tickets, ...graph.deprecated];
}

/** The effort's unfinished work: anything not done and not deprecated. */
function unfinished(graph: EffortGraph): Artifact[] {
  return [...graph.tasks, ...graph.tickets].filter((a) => !isDone(a));
}

/** The slugs of everything the effort counts as done. */
function doneSlugs(graph: EffortGraph): Set<string> {
  return new Set(allItems(graph).filter(isDone).map((a) => a.slug));
}

/**
 * The ready edge of one kind: unfinished items whose same-kind blockers are
 * all done. A blocker outside the kind (or outside the effort) is not a
 * graph edge, so it does not gate readiness.
 */
function kindFrontier(items: Artifact[], done: Set<string>): Artifact[] {
  const inKind = new Set(items.map((a) => a.slug));
  return items.filter(
    (a) => !isDone(a) && a.blocked_by.filter((b) => inKind.has(b)).every((b) => done.has(b)),
  );
}

/** Unfinished tasks or tickets whose kind-scoped blockers are all done. */
export function effortFrontier(graph: EffortGraph): Artifact[] {
  const done = doneSlugs(graph);
  return [
    ...kindFrontier(graph.tasks, done),
    ...kindFrontier(graph.tickets, done),
  ];
}

function levelItems(items: Artifact[]): WorkItemInfo[] {
  return items.map((a) => ({
    slug: a.slug,
    status: a.workflow_state,
    type: a.subtype,
    size: a.size,
    blocked_by: a.blocked_by,
  }));
}

/** BFS levels over unfinished items, tasks and tickets leveled independently. */
export function effortLevels(graph: EffortGraph): {
  tasks: string[][];
  tickets: string[][];
  remaining_count: number;
  done_count: number;
} {
  const openTasks = graph.tasks.filter((a) => !isDone(a));
  const openTickets = graph.tickets.filter((a) => !isDone(a));
  return {
    tasks: dependencyLevels(levelItems(openTasks)),
    tickets: dependencyLevels(levelItems(openTickets)),
    remaining_count: openTasks.length + openTickets.length,
    done_count: allItems(graph).length - openTasks.length - openTickets.length,
  };
}

/** Every ticket of the effort, deprecated ones included: ticket generation ran. */
function ticketCount(graph: EffortGraph): number {
  return graph.tickets.length + graph.deprecated.filter((a) => a.type === "ticket").length;
}

/** Null when finalizable, else a human-readable reason. */
export function effortFinalizable(graph: EffortGraph): string | null {
  const open = unfinished(graph);
  if (open.length > 0) {
    return `effort '${graph.slug}' has ${open.length} unfinished item(s): ${open.map((a) => a.slug).join(", ")}`;
  }
  if (graph.spec !== null && ticketCount(graph) === 0) {
    return `effort '${graph.slug}' has a spec but no tickets: ticket generation has not run`;
  }
  return null;
}

/** True when every task and ticket of the effort is done, or its map is deprecated. */
function effortIsDone(graph: EffortGraph): boolean {
  if (graph.map !== null && isDeprecated(graph.map)) return true;
  return unfinished(graph).length === 0;
}

/** Live efforts whose map-level blockers are all done. */
export function liveFrontier(index: ScanIndexLike): EffortGraph[] {
  const graphs = [...effortGraphs(index).values()];
  const bySlug = new Map(graphs.map((g) => [g.slug, g]));
  return graphs.filter((g) => {
    if (g.map !== null && isDeprecated(g.map)) return false;
    if (unfinished(g).length === 0) return false;
    const blockers = g.map?.blocked_by ?? [];
    return blockers.every((b) => {
      const blocker = bySlug.get(b);
      // A blocker outside the scan is not a live edge: the effort is ready.
      return blocker === undefined || effortIsDone(blocker);
    });
  });
}

/** Null when finalizable, else a human-readable reason. Status-based. */
export function itemFinalizable(art: Artifact): string | null {
  if (art.workflow_state === "done") return null;
  if (art.workflow_state === null) {
    return `artifact '${art.slug}' has no workflow_state; finalizable requires workflow_state 'done'`;
  }
  return `artifact '${art.slug}' has workflow_state '${art.workflow_state}', not 'done'`;
}
