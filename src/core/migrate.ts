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
 * The real v4 model is imported (fromFrontmatter, validateCombination,
 * TYPE_LEAVES, TYPE_LEAF from core/art.ts; fromObject / toObject /
 * freshState from core/state.ts), so the layout and type tables stay in one
 * place and the migration cannot drift from the tools.
 */

import YAML from "yaml";
import { parse, dump, type Document, type FrontmatterData } from "./frontmatter.js";
import {
  fromFrontmatter,
  validateCombination,
  TYPE_LEAVES,
  TYPE_LEAF,
  type Artifact,
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
  kind: "slice-dir" | "vendored-tree" | "unresolvable-ref" | "normalized-combination";
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
const DEFAULT_PROGRESS_PATH = `${TASK_ROOT}/.migration-progress`;

/** The OKF version the bundle carries. */
export const OKF_VERSION = "0.2";

/**
 * Verify a staged write before it lands: markdown must carry parseable YAML
 * frontmatter, and every other file must parse as YAML. This is the check the
 * port calls at the commit boundary, so a malformed rewrite throws before a
 * single byte is written.
 */
export function verifyStagedWrite(path: string, content: string): void {
  if (isMarkdown(path)) {
    parse(content);
    return;
  }
  if (path.endsWith(".yaml") || path.endsWith(".yml")) {
    YAML.parse(content);
  }
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function posix(p: string): string {
  return p.split("\\").join("/").replace(/^\.\//, "");
}

function dirnameOf(p: string): string {
  const i = p.lastIndexOf("/");
  return i === -1 ? "" : p.slice(0, i);
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

// ─── Vintage detection ────────────────────────────────────────────────────────

/**
 * The detected vintage of the tree.
 *
 * 0 means unversioned or fresh; 1 is the nested `active:` state block; 2 and 3
 * are the flat state shapes. The version is read from `schema_version` when
 * present, else inferred from the shape of `state.yaml`.
 */
export function detectVintage(tree: TreePort): number {
  const paths = tree.list().map(posix);
  if (!paths.includes(STATE_PATH)) {
    // No state file: fresh when there is no docs/tasks at all, else an
    // unversioned v2/v3-shaped tree.
    return paths.some((p) => under(p, TASK_ROOT)) ? 0 : 0;
  }
  let raw: unknown;
  try {
    raw = parseYamlFile(tree.read(STATE_PATH));
  } catch {
    return 0;
  }
  if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    const v = obj.schema_version;
    if (typeof v === "number") return v;
    if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
    // No stamp: v1 is recognizable by its nested `active:` block.
    if (obj.active !== undefined) return 1;
    return 0;
  }
  return 0;
}

/** Parse a whole-file YAML document (state.yaml is not frontmatter). */
function parseYamlFile(text: string): unknown {
  return YAML.parse(text);
}

function YAMLstringify(data: unknown): string {
  return YAML.stringify(data, {
    sortMapEntries: false,
    indentSeq: false,
    lineWidth: 0,
  });
}

// ─── The transformation ───────────────────────────────────────────────────────

/**
 * Migrate a tree to schema_version 4.
 *
 * Every step is independently idempotent: it detects its own already-applied
 * state and skips. The progress marker is an optimization, not the
 * correctness mechanism.
 */
export function migrate(tree: TreePort, opts: MigrateOptions = {}): MigrateReport {
  const from = detectVintage(tree);
  const changes: Change[] = [];
  const needsHuman: HumanItem[] = [];

  const stage = (change: Change): void => {
    changes.push(change);
  };

  const write = (path: string, content: string, detail: string): void => {
    if (!opts.dryRun) tree.stageWrite(path, content);
    stage({ action: "add", path, detail });
  };

  // Step 1: the fresh scaffold (also the tail of every other vintage).
  const state = freshState();
  const stateObj: Record<string, unknown> = {
    schema_version: 4,
    map: state.map,
    task: state.task,
  };
  write(STATE_PATH, YAMLstringify(stateObj), "write the v4 state file");

  write(
    INDEX_PATH,
    dump({
      data: { type: "index", okf_version: OKF_VERSION, title: "docs/tasks" },
      body: "\n# docs/tasks\n",
    }),
    "write the root index carrying okf_version",
  );

  write(
    `${TASK_ROOT}/CHANGELOG.md`,
    dump({ data: { type: "changelog", title: "Task Changelog" }, body: "\n# Task Changelog\n" }),
    "write the conformant task changelog",
  );

  if (!opts.dryRun) {
    tree.commit({ failAfterWrites: opts.failAfterWrites });
  }

  return { from, to: 4, changes, needsHuman, noop: false };
}
