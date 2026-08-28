// Update subcommands — the 6 bootstrap commands as pure functions.
// Each mutates state.json atomically and does NOT trigger any re-render.
import { loadState, saveState, type GrillingState, type PageState } from "../state.js";
import { assertTransition } from "../transitions.js";

export interface AddQuestionInput {
  id: string;
  title: string;
  body: string;
  rec: string;
  round: number;
  deps: string[];
}

export async function addQuestion(dir: string, input: AddQuestionInput): Promise<void> {
  const state = loadState(dir);
  if (state.questions.some((q) => q.id === input.id)) {
    throw new Error(`Duplicate question id: "${input.id}" already exists`);
  }
  state.questions.push({
    id: input.id,
    title: input.title,
    body: input.body,
    rec: input.rec,
    round: input.round,
    deps: input.deps,
    answered: false,
  });
  if (!state.rounds.some((r) => r.number === input.round)) {
    state.rounds.push({ number: input.round });
  }
  await saveState(dir, state);
}

export interface AddEdgeInput {
  id: string;
  from: string;
  to: string;
  type: "dep" | "contra" | "ref";
}

export async function addEdge(dir: string, input: AddEdgeInput): Promise<void> {
  const state = loadState(dir);
  const knownIds = new Set(state.questions.map((q) => q.id));
  if (!knownIds.has(input.from)) {
    throw new Error(`Unknown node id: "${input.from}" does not match any question`);
  }
  if (!knownIds.has(input.to)) {
    throw new Error(`Unknown node id: "${input.to}" does not match any question`);
  }
  state.edges.push({
    id: input.id,
    from: input.from,
    to: input.to,
    type: input.type,
    resolved: false,
  });
  await saveState(dir, state);
}

export interface PromoteInput {
  id: string;
  toRound: number;
}

export async function promote(dir: string, input: PromoteInput): Promise<void> {
  const state = loadState(dir);
  const question = state.questions.find((q) => q.id === input.id);
  if (!question) {
    throw new Error(`Unknown question id: "${input.id}" not found`);
  }
  question.round = input.toRound;
  if (!state.rounds.some((r) => r.number === input.toRound)) {
    state.rounds.push({ number: input.toRound });
  }
  await saveState(dir, state);
}

export async function setState(dir: string, target: PageState): Promise<void> {
  const state = loadState(dir);
  assertTransition(state["page-state"], target);
  state["page-state"] = target;
  await saveState(dir, state);
}

export async function setSummary(dir: string, text: string): Promise<void> {
  const state = loadState(dir);
  state.summary = text;
  await saveState(dir, state);
}

export interface ResolveContradictionInput {
  edge: string;
}

export async function resolveContradiction(dir: string, input: ResolveContradictionInput): Promise<void> {
  const state = loadState(dir);
  const edge = state.edges.find((e) => e.id === input.edge);
  if (!edge) {
    throw new Error(`Unknown edge id: "${input.edge}" not found`);
  }
  edge.resolved = true;
  await saveState(dir, state);
}

// ── Discovered commands (from the eval harness, slice 5) ──────────────────────
// These were surfaced by running non-interactive pi grilling sessions against
// the CLI and recording the operations the agent needed but did not exist.
// See docs/tasks/build-grilling-visualizer/eval-results.md.

/**
 * update answer --id <qid> --value <text>
 * Records a user's answer to a question. Sets state.answers[qid], marks the
 * question answered, and (if currently in-round) transitions in-round → round-done.
 * This lets an agent/eval driver submit answers without the browser's POST /submit.
 */
export interface AnswerInput {
  id: string;
  value: string;
}

export async function answer(dir: string, input: AnswerInput): Promise<void> {
  const state = loadState(dir);
  const question = state.questions.find((q) => q.id === input.id);
  if (!question) {
    throw new Error(`Unknown question id: "${input.id}" not found`);
  }
  question.answered = true;
  state.answers[input.id] = input.value;
  // If we are in-round, transition to round-done (mirrors the browser POST /submit).
  if (state["page-state"] === "in-round") {
    assertTransition(state["page-state"], "round-done");
    state["page-state"] = "round-done";
  }
  await saveState(dir, state);
}

/**
 * update set-deps --id <qid> --deps <ids>
 * Rewrites a question's dependency list and recomputes the frontier. Surfaces
 * because add-question stores --deps verbatim while normalizing the id, which
 * can poison the frontier; this lets the driver correct it.
 */
export interface SetDepsInput {
  id: string;
  deps: string[];
}

export async function setDeps(dir: string, input: SetDepsInput): Promise<void> {
  const state = loadState(dir);
  const question = state.questions.find((q) => q.id === input.id);
  if (!question) {
    throw new Error(`Unknown question id: "${input.id}" not found`);
  }
  const knownIds = new Set(state.questions.map((q) => q.id));
  for (const dep of input.deps) {
    if (dep && !knownIds.has(dep)) {
      throw new Error(`Unknown dep id: "${dep}" does not match any question`);
    }
  }
  question.deps = input.deps;
  await saveState(dir, state);
}

/**
 * update accept — record the user's final-review acceptance. Transitions
 * final-review → accepted (guarded). The CLI analogue of the human verdict.
 */
export async function accept(dir: string): Promise<void> {
  const state = loadState(dir);
  assertTransition(state["page-state"], "accepted");
  state["page-state"] = "accepted";
  await saveState(dir, state);
}

/**
 * update reject --feedback <text> — record the user's final-review rejection.
 * Transitions final-review → rejected → in-round (per D9t), capturing the
 * rejection feedback so the agent can address the gap.
 */
export interface RejectInput {
  feedback: string;
}

export async function reject(dir: string, input: RejectInput): Promise<void> {
  const state = loadState(dir);
  assertTransition(state["page-state"], "rejected");
  state["page-state"] = "rejected";
  // Per the transition table, rejected → in-round so the agent resumes grilling.
  assertTransition("rejected", "in-round");
  state["page-state"] = "in-round";
  // Record the rejection feedback in the summary so the agent sees the gap.
  const feedbackLine = `\n\n[REJECTION FEEDBACK]: ${input.feedback}\n`;
  state.summary = (state.summary || "") + feedbackLine;
  await saveState(dir, state);
}
