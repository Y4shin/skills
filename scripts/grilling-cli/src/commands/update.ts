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
