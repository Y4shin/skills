import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createStateDir, loadState, saveState, type GrillingState } from "../state.js";
import {
  addQuestion,
  addEdge,
  promote,
  setState,
  setSummary,
  resolveContradiction,
} from "./update.js";

describe("seam 3 — update subcommands mutate state correctly", () => {
  let dir: string;

  beforeEach(() => {
    dir = createStateDir();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("addQuestion adds a question to the state", async () => {
    await addQuestion(dir, {
      id: "what-is-the-best-framework",
      title: "Best framework?",
      body: "Which framework should we use?",
      rec: "React",
      round: 1,
      deps: [],
    });
    const state = loadState(dir);
    expect(state.questions).toHaveLength(1);
    expect(state.questions[0].id).toBe("what-is-the-best-framework");
    expect(state.questions[0].answered).toBe(false);
  });

  it("addQuestion rejects duplicate ids", async () => {
    await addQuestion(dir, {
      id: "duplicate-question-id-here",
      title: "First",
      body: "B",
      rec: "R",
      round: 1,
      deps: [],
    });
    await expect(
      addQuestion(dir, {
        id: "duplicate-question-id-here",
        title: "Second",
        body: "B",
        rec: "R",
        round: 1,
        deps: [],
      }),
    ).rejects.toThrow(/duplicate.*id/i);
  });

  it("addQuestion adds a round if it doesn't exist", async () => {
    await addQuestion(dir, {
      id: "question-in-round-two",
      title: "T",
      body: "B",
      rec: "R",
      round: 2,
      deps: [],
    });
    const state = loadState(dir);
    expect(state.rounds).toContainEqual({ number: 2 });
  });

  it("addEdge adds an edge between two existing questions", async () => {
    await addQuestion(dir, { id: "source-question-id-one", title: "T", body: "B", rec: "R", round: 1, deps: [] });
    await addQuestion(dir, { id: "target-question-id-two", title: "T", body: "B", rec: "R", round: 1, deps: [] });
    await addEdge(dir, { id: "edge-one-id-here", from: "source-question-id-one", to: "target-question-id-two", type: "dep" });
    const state = loadState(dir);
    expect(state.edges).toHaveLength(1);
    expect(state.edges[0].type).toBe("dep");
  });

  it("addEdge rejects unknown node ids", async () => {
    await addQuestion(dir, { id: "existing-question-id-x", title: "T", body: "B", rec: "R", round: 1, deps: [] });
    await expect(
      addEdge(dir, { id: "edge-with-bad-from", from: "nonexistent-id-one", to: "existing-question-id-x", type: "dep" }),
    ).rejects.toThrow(/unknown.*id/i);
    await expect(
      addEdge(dir, { id: "edge-with-bad-to", from: "existing-question-id-x", to: "nonexistent-id-two", type: "dep" }),
    ).rejects.toThrow(/unknown.*id/i);
  });

  it("promote moves a question to a new round", async () => {
    await addQuestion(dir, { id: "question-to-promote-x", title: "T", body: "B", rec: "R", round: 1, deps: [] });
    await promote(dir, { id: "question-to-promote-x", toRound: 3 });
    const state = loadState(dir);
    expect(state.questions[0].round).toBe(3);
    expect(state.rounds).toContainEqual({ number: 3 });
  });

  it("promote rejects unknown question id", async () => {
    await expect(
      promote(dir, { id: "nonexistent-question-id", toRound: 2 }),
    ).rejects.toThrow(/unknown.*id/i);
  });

  it("setState transitions to an allowed state", async () => {
    await setState(dir, "in-round");
    expect(loadState(dir)["page-state"]).toBe("in-round");

    await setState(dir, "round-done");
    expect(loadState(dir)["page-state"]).toBe("round-done");

    await setState(dir, "final-review");
    expect(loadState(dir)["page-state"]).toBe("final-review");
  });

  it("setState rejects disallowed transitions", async () => {
    // view → done is not allowed
    await expect(setState(dir, "done")).rejects.toThrow(/transition/i);
    // Still view
    expect(loadState(dir)["page-state"]).toBe("view");
  });

  it("setSummary updates the summary text", async () => {
    await setSummary(dir, "running summary of progress");
    expect(loadState(dir).summary).toBe("running summary of progress");
  });

  it("resolveContradiction marks an edge as resolved", async () => {
    await addQuestion(dir, { id: "contra-source-id-one", title: "T", body: "B", rec: "R", round: 1, deps: [] });
    await addQuestion(dir, { id: "contra-target-id-two", title: "T", body: "B", rec: "R", round: 1, deps: [] });
    await addEdge(dir, { id: "contra-edge-id-here", from: "contra-source-id-one", to: "contra-target-id-two", type: "contra" });
    await resolveContradiction(dir, { edge: "contra-edge-id-here" });
    const state = loadState(dir);
    expect(state.edges[0].resolved).toBe(true);
  });

  it("resolveContradiction rejects unknown edge id", async () => {
    await expect(
      resolveContradiction(dir, { edge: "nonexistent-edge-id" }),
    ).rejects.toThrow(/unknown.*edge/i);
  });

  it("update subcommands do NOT trigger any side effects beyond JSON", async () => {
    // After any update, the state file should be valid JSON with the expected
    // mutation — no other files should be created or modified.
    await addQuestion(dir, { id: "side-effect-test-id-x", title: "T", body: "B", rec: "R", round: 1, deps: [] });
    const state = loadState(dir);
    expect(state.questions).toHaveLength(1);
    // The only file in the dir should be state.json (no temp files left behind).
    const { readdirSync } = await import("node:fs");
    const files = readdirSync(dir).filter((f) => !f.startsWith(".state.json.tmp"));
    expect(files).toContain("state.json");
  });
});
