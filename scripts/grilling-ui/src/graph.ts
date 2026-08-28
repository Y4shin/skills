// graphModel — PURE render-model function for the SPA.
// Given a GrillingState, returns the structured render model:
//   rows     = questions grouped by round (sorted)
//   upcoming = blocked nodes with their blockers
//   edges    = {from, to, type} passthrough
import type { GrillingState, EdgeType } from "../../grilling-cli/src/state.js";

export interface GraphRow {
  round: number;
  nodes: { id: string; title: string; answered: boolean; rec: string }[];
}

export interface GraphEdge {
  from: string;
  to: string;
  type: EdgeType;
}

export interface UpcomingNode {
  node: { id: string; title: string; rec: string };
  blockedBy: string[];
}

export interface GraphModel {
  rows: GraphRow[];
  upcoming: UpcomingNode[];
  edges: GraphEdge[];
}

/**
 * Compute the graph render model from a state.
 * Pure: no I/O, no side effects, deterministic for the same input.
 */
export function graphModel(state: GrillingState): GraphModel {
  // --- Rows: group questions by round ---
  const roundMap = new Map<number, GraphRow>();
  for (const q of state.questions) {
    let row = roundMap.get(q.round);
    if (!row) {
      row = { round: q.round, nodes: [] };
      roundMap.set(q.round, row);
    }
    row.nodes.push({
      id: q.id,
      title: q.title,
      answered: !!q.answered,
      rec: q.rec,
    });
  }
  const rows = [...roundMap.values()].sort((a, b) => a.round - b.round);
  // Sort nodes within each round by id for deterministic output.
  for (const row of rows) {
    row.nodes.sort((a, b) => a.id.localeCompare(b.id));
  }

  // --- Upcoming: unanswered questions whose deps are NOT all answered ---
  const answeredIds = new Set(
    state.questions.filter((q) => q.answered).map((q) => q.id),
  );
  const upcoming: UpcomingNode[] = [];
  for (const q of state.questions) {
    if (q.answered) continue;
    const unmet = q.deps.filter((d) => !answeredIds.has(d));
    if (unmet.length > 0) {
      upcoming.push({
        node: { id: q.id, title: q.title, rec: q.rec },
        blockedBy: unmet,
      });
    }
  }
  upcoming.sort((a, b) => a.node.id.localeCompare(b.node.id));

  // --- Edges: passthrough with type ---
  const edges: GraphEdge[] = state.edges.map((e) => ({
    from: e.from,
    to: e.to,
    type: e.type,
  }));

  return { rows, upcoming, edges };
}
