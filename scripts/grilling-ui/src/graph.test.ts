// Seam 1: graphModel(state) — pure render model.
// Parameterized over fixture states including a contradiction and a reference edge.
import { describe, expect, it } from "vitest";
import { graphModel } from "./graph.js";
import type { GrillingState } from "../../grilling-cli/src/state.js";

describe("seam 1 — graphModel pure render model", () => {
  it("empty state returns empty rows, upcoming, edges", () => {
    const state: GrillingState = {
      "page-state": "view",
      questions: [],
      edges: [],
      summary: "",
      rounds: [],
      answers: {},
    };
    const model = graphModel(state);
    expect(model.rows).toEqual([]);
    expect(model.upcoming).toEqual([]);
    expect(model.edges).toEqual([]);
  });

  it("groups questions into rows by round, sorted by round number", () => {
    const state: GrillingState = {
      "page-state": "view",
      questions: [
        { id: "second-question-id-two", title: "Q2", body: "B", rec: "R", round: 2, deps: [], answered: false },
        { id: "first-question-id-one", title: "Q1", body: "B", rec: "R", round: 1, deps: [], answered: false },
        { id: "third-question-id-one", title: "Q3", body: "B", rec: "R", round: 1, deps: [], answered: false },
      ],
      edges: [],
      summary: "",
      rounds: [{ number: 1 }, { number: 2 }],
      answers: {},
    };
    const model = graphModel(state);
    expect(model.rows).toHaveLength(2);
    expect(model.rows[0].round).toBe(1);
    expect(model.rows[1].round).toBe(2);
    // Nodes within a round sorted by id.
    expect(model.rows[0].nodes.map((n) => n.id)).toEqual([
      "first-question-id-one",
      "third-question-id-one",
    ]);
    expect(model.rows[1].nodes.map((n) => n.id)).toEqual(["second-question-id-two"]);
  });

  it("rows include answered flag and rec", () => {
    const state: GrillingState = {
      "page-state": "view",
      questions: [
        { id: "answered-question-one", title: "A", body: "B", rec: "recA", round: 1, deps: [], answered: true },
        { id: "open-question-id-one", title: "O", body: "B", rec: "recO", round: 1, deps: [], answered: false },
      ],
      edges: [],
      summary: "",
      rounds: [{ number: 1 }],
      answers: {},
    };
    const model = graphModel(state);
    const nodes = model.rows[0].nodes;
    const answered = nodes.find((n) => n.id === "answered-question-one")!;
    expect(answered.answered).toBe(true);
    expect(answered.rec).toBe("recA");
    const open = nodes.find((n) => n.id === "open-question-id-one")!;
    expect(open.answered).toBe(false);
  });

  it("upcoming lists blocked questions with their blockers", () => {
    const state: GrillingState = {
      "page-state": "view",
      questions: [
        { id: "answered-dep-one", title: "D1", body: "B", rec: "R", round: 1, deps: [], answered: true },
        { id: "open-dep-two", title: "D2", body: "B", rec: "R", round: 1, deps: [], answered: false },
        { id: "blocked-question-one", title: "BQ", body: "B", rec: "R", round: 2, deps: ["answered-dep-one", "open-dep-two"] },
      ],
      edges: [],
      summary: "",
      rounds: [{ number: 1 }, { number: 2 }],
      answers: {},
    };
    const model = graphModel(state);
    expect(model.upcoming).toHaveLength(1);
    expect(model.upcoming[0].node.id).toBe("blocked-question-one");
    // Only the unanswered dep should appear as a blocker.
    expect(model.upcoming[0].blockedBy).toEqual(["open-dep-two"]);
  });

  it("upcoming does not include unanswered questions with all deps answered (those are frontier)", () => {
    const state: GrillingState = {
      "page-state": "view",
      questions: [
        { id: "answered-dep-one", title: "D1", body: "B", rec: "R", round: 1, deps: [], answered: true },
        { id: "frontier-question-one", title: "FQ", body: "B", rec: "R", round: 2, deps: ["answered-dep-one"], answered: false },
      ],
      edges: [],
      summary: "",
      rounds: [{ number: 1 }, { number: 2 }],
      answers: {},
    };
    const model = graphModel(state);
    expect(model.upcoming).toEqual([]);
  });

  it("upcoming does not include answered questions", () => {
    const state: GrillingState = {
      "page-state": "view",
      questions: [
        { id: "answered-dep-one", title: "D1", body: "B", rec: "R", round: 1, deps: [], answered: true },
        { id: "answered-blocked-one", title: "AB", body: "B", rec: "R", round: 2, deps: ["nonexistent-id-x"], answered: true },
      ],
      edges: [],
      summary: "",
      rounds: [{ number: 1 }, { number: 2 }],
      answers: {},
    };
    const model = graphModel(state);
    expect(model.upcoming).toEqual([]);
  });

  it("edges pass through with correct type including a contradiction and a reference", () => {
    const state: GrillingState = {
      "page-state": "view",
      questions: [
        { id: "source-question-id-one", title: "S", body: "B", rec: "R", round: 1, deps: [], answered: false },
        { id: "target-question-id-two", title: "T", body: "B", rec: "R", round: 1, deps: [], answered: false },
        { id: "ref-target-id-three", title: "RT", body: "B", rec: "R", round: 1, deps: [], answered: false },
      ],
      edges: [
        { id: "dep-edge-id-one", from: "source-question-id-one", to: "target-question-id-two", type: "dep", resolved: false },
        { id: "contra-edge-id-two", from: "source-question-id-one", to: "target-question-id-two", type: "contra", resolved: false },
        { id: "ref-edge-id-three", from: "target-question-id-two", to: "ref-target-id-three", type: "ref", resolved: false },
      ],
      summary: "",
      rounds: [{ number: 1 }],
      answers: {},
    };
    const model = graphModel(state);
    expect(model.edges).toEqual([
      { from: "source-question-id-one", to: "target-question-id-two", type: "dep" },
      { from: "source-question-id-one", to: "target-question-id-two", type: "contra" },
      { from: "target-question-id-two", to: "ref-target-id-three", type: "ref" },
    ]);
  });
});
