/**
 * Discover and resolve prd-workflow artifacts in a repo's `docs/prd` tree.
 *
 *   docs/prd/epics/<slug>/epic.md   kind: epic
 *   docs/prd/<slug>/prd.md          kind: prd (one kind — no feature/capability split)
 *   docs/prd/<slug>/slices/<n>-<slug>.md
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
    if (isDir(join(dir, "docs", "prd")) || existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(start);
}

export function prdRoot(root: string): string {
  return join(root, "docs", "prd");
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
}

export class Artifact {
  path: string;
  kind: string; // "epic" | "prd"
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

  /** The PRD's own issue number, or null for epics (epics are milestones). */
  get issue(): number | null {
    const v = this.doc.data["prd_issue"];
    return typeof v === "number" ? v : v == null ? null : (v as number);
  }

  get milestone(): number | null {
    const v = this.doc.data["epic_milestone"];
    return typeof v === "number" ? v : v == null ? null : (v as number);
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
      if (m) out.push({ path: join(d, name), number: parseInt(m[1], 10), slug: m[2] });
    }
    return out;
  }
}

export function discoverEpics(root: string): Artifact[] {
  const base = join(prdRoot(root), "epics");
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

export function discoverPrds(root: string): Artifact[] {
  const base = prdRoot(root);
  const out: Artifact[] = [];
  for (const f of globChildFiles(base, "prd.md")) {
    if (basename(dirname(dirname(f))) === "epics") continue;
    let doc: Document;
    try { doc = parse(f); } catch (e) {
      if (e instanceof FrontmatterError) continue;
      throw e;
    }
    out.push(new Artifact(f, (doc.data["kind"] as string) ?? "prd", doc));
  }
  return out;
}

export function discoverAll(root: string): Artifact[] {
  return [...discoverEpics(root), ...discoverPrds(root)];
}

function asIssue(selector: string): number | null {
  const s = selector.replace(/^#+/, "");
  return /^\d+$/.test(s) ? parseInt(s, 10) : null;
}

export function resolveArtifact(
  root: string,
  selector: string,
  want?: "epic" | "prd",
): Artifact {
  const candidates = want === "epic" ? discoverEpics(root) : want === "prd" ? discoverPrds(root) : discoverAll(root);

  // 1) explicit path
  const p = isAbsolute(selector) ? selector : join(process.cwd(), selector);
  if (existsSync(selector) || existsSync(p)) {
    const sel = existsSync(selector) ? selector : p;
    let target: string;
    if (isDir(sel)) {
      target = isFile(join(sel, "epic.md")) ? join(sel, "epic.md") : join(sel, "prd.md");
    } else {
      target = sel;
    }
    target = resolve(target);
    for (const a of candidates) {
      if (resolve(a.path) === target) return a;
    }
    throw new ResolutionError(`'${selector}' is not a recognised artifact under ${prdRoot(root)}`);
  }

  // 2) issue number or milestone number
  const n = asIssue(selector);
  let hits: Artifact[];
  if (n !== null) {
    hits = candidates.filter(a => a.issue === n || a.milestone === n);
  } else {
    // 3) slug
    hits = candidates.filter(a => a.slug === selector || basename(a.dir) === selector);
  }

  if (hits.length === 0) throw new ResolutionError(`no ${want ?? "artifact"} matches '${selector}'`);
  if (hits.length > 1) {
    throw new ResolutionError(`'${selector}' is ambiguous — matches: ${hits.map(a => a.path).join(", ")}`);
  }
  return hits[0];
}

export function relPath(root: string, p: string): string {
  return relative(root, p).split("\\").join("/");
}

/** Check if the prd-workflow is initialized. */
export function isInitialized(root: string): boolean {
  return isDir(prdRoot(root));
}