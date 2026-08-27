// Get command — returns (subsets of) the state to the agent.
// NEVER exposes the real dir path in its output.
import { loadState, type GrillingState } from "../state.js";

export type Subset =
  | "answers"
  | "summary"
  | "frontier"
  | "questions"
  | "edges"
  | "state";

export async function get(dir: string, subset?: string): Promise<string> {
  const state = loadState(dir);
  const result = extractSubset(state, subset);
  return JSON.stringify(result, null, 2);
}

function extractSubset(state: GrillingState, subset?: string): unknown {
  if (!subset) {
    // Full state — but strip nothing; the state file does NOT contain the dir path.
    return state;
  }

  const s = subset as Subset;
  switch (s) {
    case "answers":
      return state.answers ?? {};
    case "summary":
      return { summary: state.summary };
    case "questions":
      return { questions: state.questions };
    case "edges":
      return { edges: state.edges };
    case "frontier":
      return { frontier: computeFrontier(state) };
    case "state":
      return { "page-state": state["page-state"] };
    default:
      throw new Error(
        `Invalid subset "${subset}". Valid subsets: state, questions, edges, answers, summary, frontier`,
      );
  }
}

export function computeFrontier(state: GrillingState): GrillingState["questions"] {
  // The frontier = unanswered questions whose dependencies are all answered.
  const answeredIds = new Set(
    state.questions.filter((q) => q.answered).map((q) => q.id),
  );
  return state.questions.filter(
    (q) =>
      !q.answered &&
      q.deps.every((dep) => answeredIds.has(dep)),
  );
}
