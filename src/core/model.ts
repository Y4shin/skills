/**
 * Discover and resolve task-workflow artifacts in a repo's `docs/tasks` tree.
 *
 *   docs/tasks/epics/<slug>/epic.md       kind: epic
 *   docs/tasks/<slug>/task.md             kind: task
 *   docs/tasks/<slug>/slices/<n>-<slug>.md  kind: slice
 *   docs/tasks/archive/<slug>/...            archived task
 *   docs/tasks/epics/archive/<slug>/...      archived epic
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";

import { Document, parse } from "./frontmatter.js";
import { FrontmatterError } from "./errors.js";
import { ResolutionError } from "./errors.js";

export { ResolutionError };

const SLICE_RE = /^(\d+)-(.+)\.md$/;

export function findRoot(start: string): string {
  let dir = resolve(start);
  while (true) {
    if (isDir(join(dir, "docs", "tasks")) || existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(start);
}

export function taskRoot(root: string): string {
  return join(root, "docs", "tasks");
}

function isDir(p: string): boolean {
  try { return statSync(p).isDirectory(); } catch { return false; }
}

function isFile(p: string): boolean {
  try { return statSync(p).isFile(); } catch { return false; }
}

function globChildFiles(base: string, leaf: string): string[] {
  if (!isDir(base)) return [];
  const out: string[] = [];
  for (const name of readdirSync(base).sort()) {
    const f = join(base, name, leaf);
    if (isFile(f)) out.push(f);
  }
  return out;
}

export interface Slice {
  path: string;
  number: number;
  slug: string;
  status: string | null;
}

export class Artifact {
  path: string;
  kind: string; // "epic" | "task" | "slice"
  doc: Document;

  constructor(path: string, kind: string, doc: Document) {
    this.path = path;
    this.kind = kind;
    this.doc = doc;
  }

  get dir(): string {
    return dirname(this.path);
  }

  get slug(): string {
    const s = this.doc.data["slug"];
    return (typeof s === "string" && s) || basename(this.dir);
  }

  get status(): string | null {
    const s = this.doc.data["status"];
    return s === undefined || s === null ? null : (s as string);
  }

  get slicesDir(): string {
    return join(this.dir, "slices");
  }

  sliceFiles(): Slice[] {
    const d = this.slicesDir;
    if (!isDir(d)) return [];
    const out: Slice[] = [];
    for (const name of readdirSync(d).sort()) {
      if (!name.endsWith(".md")) continue;
      const m = SLICE_RE.exec(name);
      if (m) {
        const path = join(d, name);
        let status: string | null = null;
        try {
          const doc = parse(path);
          const s = doc.data["status"];
          status = s === undefined || s === null ? null : (s as string);
        } catch {
          // can't parse — treat as unknown
        }
        out.push({ path, number: parseInt(m[1], 10), slug: m[2], status });
      }
    }
    return out;
  }

  /** List only active (non-archived) slice files — excludes slices/archive/. */
  activeSliceFiles(): Slice[] {
    const d = this.slicesDir;
    if (!isDir(d)) return [];
    const archiveDir = join(d, "archive");
    const out: Slice[] = [];
    for (const name of readdirSync(d).sort()) {
      if (!name.endsWith(".md")) continue;
      // skip archive dir entries
      if (isDir(join(d, name))) continue;
      const m = SLICE_RE.exec(name);
      if (m) {
        const path = join(d, name);
        let status: string | null = null;
        try {
          const doc = parse(path);
          const s = doc.data["status"];
          status = s === undefined || s === null ? null : (s as string);
        } catch {
          // can't parse
        }
        out.push({ path, number: parseInt(m[1], 10), slug: m[2], status });
      }
    }
    return out;
  }
}

function discoverFromDir(root: string, leaf: string, kind: string, skipEpicsDir = false): Artifact[] {
  const base = taskRoot(root);
  if (!isDir(base)) return [];
  const out: Artifact[] = [];
  for (const name of readdirSync(base).sort()) {
    if (name === "epics" || name === "archive" || name === "state.yaml" || name === "CHANGELOG.md") continue;
    const f = join(base, name, leaf);
    if (isFile(f)) {
      if (skipEpicsDir && basename(dirname(dirname(f))) === "epics") continue;
      let doc: Document;
      try { doc = parse(f); } catch (e) {
        if (e instanceof FrontmatterError) continue;
        throw e;
      }
      out.push(new Artifact(f, (doc.data["kind"] as string) ?? kind, doc));
    }
  }
  return out;
}

export function discoverEpics(root: string): Artifact[] {
  const base = join(taskRoot(root), "epics");
  const out: Artifact[] = [];
  for (const f of globChildFiles(base, "epic.md")) {
    // Skip archive
    if (f.includes("/archive/")) continue;
    let doc: Document;
    try { doc = parse(f); } catch (e) {
      if (e instanceof FrontmatterError) continue;
      throw e;
    }
    out.push(new Artifact(f, (doc.data["kind"] as string) ?? "epic", doc));
  }
  return out;
}

export function discoverArchivedEpics(root: string): Artifact[] {
  const base = join(taskRoot(root), "epics", "archive");
  const out: Artifact[] = [];
  for (const f of globChildFiles(base, "epic.md")) {
    let doc: Document;
    try { doc = parse(f); } catch (e) {
      if (e instanceof FrontmatterError) continue;
      throw e;
    }
    out.push(new Artifact(f, (doc.data["kind"] as string) ?? "epic", doc));
  }
  return out;
}

export function discoverTasks(root: string): Artifact[] {
  return discoverFromDir(root, "task.md", "task", true);
}

export function discoverArchivedTasks(root: string): Artifact[] {
  const base = join(taskRoot(root), "archive");
  if (!isDir(base)) return [];
  const out: Artifact[] = [];
  for (const name of readdirSync(base).sort()) {
    const f = join(base, name, "task.md");
    if (isFile(f)) {
      let doc: Document;
      try { doc = parse(f); } catch (e) {
        if (e instanceof FrontmatterError) continue;
        throw e;
      }
      out.push(new Artifact(f, (doc.data["kind"] as string) ?? "task", doc));
    }
  }
  return out;
}

export function discoverAll(root: string): Artifact[] {
  return [...discoverEpics(root), ...discoverTasks(root)];
}

function asIssue(selector: string): number | null {
  const s = selector.replace(/^#+/, "");
  return /^\d+$/.test(s) ? parseInt(s, 10) : null;
}

export function resolveArtifact(
  root: string,
  selector: string,
  want?: "epic" | "task",
): Artifact {
  const candidates = want === "epic" ? discoverEpics(root) : want === "task" ? discoverTasks(root) : discoverAll(root);

  // 1) explicit path
  const p = isAbsolute(selector) ? selector : join(process.cwd(), selector);
  if (existsSync(selector) || existsSync(p)) {
    const sel = existsSync(selector) ? selector : p;
    let target: string;
    if (isDir(sel)) {
      target = isFile(join(sel, "epic.md")) ? join(sel, "epic.md") : join(sel, "task.md");
    } else {
      target = sel;
    }
    target = resolve(target);
    for (const a of candidates) {
      if (resolve(a.path) === target) return a;
    }
    throw new ResolutionError(`'${selector}' is not a recognised artifact under ${taskRoot(root)}`);
  }

  // 2) slug
  const hits = candidates.filter(a => a.slug === selector || basename(a.dir) === selector);

  if (hits.length === 0) throw new ResolutionError(`no ${want ?? "artifact"} matches '${selector}'`);
  if (hits.length > 1) {
    throw new ResolutionError(`'${selector}' is ambiguous — matches: ${hits.map(a => a.path).join(", ")}`);
  }
  return hits[0];
}

export function relPath(root: string, p: string): string {
  return relative(root, p).split("\\").join("/");
}

/** Check if the task-workflow is initialized. */
export function isInitialized(root: string): boolean {
  return isDir(taskRoot(root));
}
