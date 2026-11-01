/**
 * Shared paths and small helpers for the offline eval harness.
 *
 * Operator-only tooling. Nothing here is loaded by pi, referenced by a skill,
 * or published: `evals/` is absent from `package.json`'s `files` and `pi`
 * blocks on purpose, so the agent cannot reach it on its own.
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const EVALS_DIR = import.meta.dirname.replace(/\/lib$/, "");
export const REPO_ROOT = join(EVALS_DIR, "..");

/**
 * Outputs and the spend ledger live outside the repo on purpose: the corpus
 * holds transcripts, and this repo runs hygiene checks over its own files.
 * Override with `--out`, or with `EVAL_OUT_DIR` for the whole run.
 */
export const AGENT_DIR = process.env.PI_AGENT_DIR ?? join(homedir(), ".pi", "agent");
export const OUT_DIR = process.env.EVAL_OUT_DIR ?? join(AGENT_DIR, "evals");
export const SESSIONS_DIR = process.env.PI_SESSIONS_DIR ?? join(AGENT_DIR, "sessions");
export const TELEMETRY_DB = process.env.PI_TELEMETRY_DB ?? join(homedir(), ".pi", "telemetry.db");
export const MODELS_STORE = join(AGENT_DIR, "models-store.json");
export const AUTH_FILE = join(AGENT_DIR, "auth.json");

/** The shipped guide, so the benchmark grades against what actually ships. */
export const GUIDE_PATH = join(
  REPO_ROOT,
  "skills",
  "productivity",
  "operator-communication",
  "SKILL.md",
);

export function parseArgs(argv: string[]): { flags: Map<string, string | true>; rest: string[] } {
  const flags = new Map<string, string | true>();
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      rest.push(arg);
      continue;
    }
    const name = arg.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      flags.set(name, true);
    } else {
      flags.set(name, next);
      i++;
    }
  }
  return { flags, rest };
}

export function flagString(flags: Map<string, string | true>, name: string): string | undefined {
  const value = flags.get(name);
  return typeof value === "string" ? value : undefined;
}

export function flagNumber(flags: Map<string, string | true>, name: string, fallback: number): number {
  const raw = flagString(flags, name);
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function flagBool(flags: Map<string, string | true>, name: string): boolean {
  return flags.has(name);
}

export function requirePath(path: string, what: string): string {
  if (!existsSync(path)) {
    console.error(`missing ${what}: ${path}`);
    process.exit(2);
  }
  return path;
}

export function shortHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Run `fn` over `items` with at most `limit` in flight, preserving order. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

export function readJsonl<T>(path: string): T[] {
  const text = readFileSync(requirePath(path, "jsonl input"), "utf-8");
  const rows: T[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    rows.push(JSON.parse(trimmed) as T);
  }
  return rows;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
