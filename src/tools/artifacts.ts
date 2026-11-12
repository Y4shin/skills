/**
 * The read-only artifact inspectors: the show, get, and list tools, the two
 * finalizable checks, the dependency-level and frontier readers, and the context
 * reader. Nothing in this family writes.
 */

import { existsSync, statSync } from "node:fs";
import { join, resolve as resolvePath } from "node:path";
import { dependencyLevels, type Artifact, type WorkItemInfo, type Anomaly } from "../core/art.js";
import { effortGraphs, effortFrontier, effortLevels, effortFinalizable, effortGroupOf, liveFrontier, itemFinalizable, type EffortGraph } from "../core/graph.js";
import { ResolutionError } from "../core/err.js";
import { OptBool, OptStr, Str, Tool, def, findRoot, graphForPath, isDir, isFile, isInitialized, listSubdirs, parseArtifactFile, readText, resolveArt, scanMemo, taskRoot } from "./support.js";

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

// ─── Context helpers ───────────────────────────────────────────────────────────

function profileText(root: string): string {
  const p = join(root, "docs", "tasks", "profile.md");
  if (existsSync(p) && statSync(p).isFile()) return readText(p);
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
    "A spec has no workflow_state. Its architecture content becomes archival once the architecture document exists.",
    "",
    "### Architecture (`docs/tasks/<effort>/architecture.md`)",
    "type: architecture | title: <text> | status: draft (while writing) | stable (when published).",
    "The living design record: to-tickets creates it, and every later correction goes through its writer.",
    "",
    "### Review (`docs/tasks/<effort>/review.md`, `end-of-effort-review.md`)",
    "type: review | title: <text> | dispositioned: true | false | pass: end-of-effort (advisory only) |",
    "  reconcile: done | none | unavailable (finalize review only).",
    "The archive gate reads the finalize review's dispositioned flag and requires its reconcile record.",
    "",
    "### Auxiliary artifacts",
    "type: arch spec (legacy, pre-migration) | findings | deviation report | changelog | out-of-scope note |",
    "  title: <text> | status: draft | stable | deprecated.",
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

export const tw_show: Tool = def(
  "Show artifact frontmatter (map, planning task, or ticket).",
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
);

export const tw_get: Tool = def(
  "Print a single frontmatter field of an artifact.",
  { selector: Str("Slug or path"), field: Str("Field name") },
  async (p, ctx) => {
    const root = findRoot(ctx.directory);
    const { doc } = resolveArt(root, p.selector);
    return doc.data[p.field] === undefined ? "" : String(doc.data[p.field]);
  },
);

export const tw_list: Tool = def(
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
);

export const tw_finalizable: Tool = def(
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
);

export const tw_dependency_levels: Tool = def(
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
);

export const tw_frontier: Tool = def(
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
);

export const tw_map_finalizable: Tool = def(
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
);

export const tw_context: Tool = def(
  "Return project context: artifact schema + optional profile.",
  {},
  async (_p, ctx) => {
    const root = findRoot(ctx.directory);
    const profile = profileText(root);
    const schema = artifactSchemaRef();
    return profile ? `${schema}\n\n---\n\n## Project profile\n\n${profile}` : schema;
  },
);
