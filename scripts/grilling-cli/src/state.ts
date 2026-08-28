// State module — random temp dir, atomic load/save, schema + validation.
// This is the JSON state contract consumed by later slices (server/SPA, eval).
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

// --- Schema types ---

export type PageState =
  | "view"
  | "in-round"
  | "round-done"
  | "final-review"
  | "accepted"
  | "rejected"
  | "done";

export const PAGE_STATES: PageState[] = [
  "view",
  "in-round",
  "round-done",
  "final-review",
  "accepted",
  "rejected",
  "done",
];

export interface Question {
  id: string;
  title: string;
  body: string;
  rec: string;
  round: number;
  deps: string[];
  answered?: boolean;
}

export type EdgeType = "dep" | "contra" | "ref";

export interface Edge {
  id: string;
  from: string;
  to: string;
  type: EdgeType;
  resolved?: boolean;
}

export interface Round {
  number: number;
}

export interface GrillingState {
  "page-state": PageState;
  questions: Question[];
  edges: Edge[];
  summary: string;
  rounds: Round[];
  answers?: Record<string, string>;
}

const STATE_FILE = "state.json";

// --- Validation ---

export function validateState(state: unknown): asserts state is GrillingState {
  if (typeof state !== "object" || state === null) {
    throw new Error("Invalid state: expected an object");
  }
  const s = state as Record<string, unknown>;

  if (!PAGE_STATES.includes(s["page-state"] as PageState)) {
    throw new Error(
      `Invalid state: page-state must be one of ${PAGE_STATES.join(", ")}, got: ${String(s["page-state"])}`,
    );
  }

  if (!Array.isArray(s.questions)) {
    throw new Error("Invalid state: questions must be an array");
  }
  if (!Array.isArray(s.edges)) {
    throw new Error("Invalid state: edges must be an array");
  }
  if (typeof s.summary !== "string") {
    throw new Error("Invalid state: summary must be a string");
  }
  if (!Array.isArray(s.rounds)) {
    throw new Error("Invalid state: rounds must be an array");
  }
  if (s.answers !== undefined && typeof s.answers !== "object") {
    throw new Error("Invalid state: answers must be an object or undefined");
  }
}

// --- Dir creation ---

export function createStateDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "grilling-"));
  const initial: GrillingState = {
    "page-state": "view",
    questions: [],
    edges: [],
    summary: "",
    rounds: [],
    answers: {},
  };
  writeFileSync(join(dir, STATE_FILE), JSON.stringify(initial, null, 2), "utf-8");
  return dir;
}

// --- Load / Save (atomic) ---

export function loadState(dir: string): GrillingState {
  const raw = readFileSync(join(dir, STATE_FILE), "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `Failed to parse state.json in ${dir}: corrupt or partial JSON`,
    );
  }
  validateState(parsed);
  return parsed;
}

export async function saveState(dir: string, state: GrillingState): Promise<void> {
  validateState(state);
  const data = JSON.stringify(state, null, 2);
  const targetPath = join(dir, STATE_FILE);
  // Atomic write: write to a temp file in the same directory, then rename.
  const tempPath = join(dir, `.state.json.tmp.${randomBytes(8).toString("hex")}`);
  await writeFile(tempPath, data, "utf-8");
  await rename(tempPath, targetPath);
}
