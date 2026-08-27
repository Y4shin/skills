import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createStateDir, saveState, type GrillingState } from "../state.js";
import { get } from "./get.js";

describe("seam 5 — get returns subsets, never exposes real dir", () => {
  let dir: string;

  beforeEach(() => {
    dir = createStateDir();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("get with no subset returns the full state", async () => {
    const output = await get(dir);
    const parsed = JSON.parse(output);
    expect(parsed["page-state"]).toBe("view");
    expect(parsed.questions).toEqual([]);
    expect(parsed.edges).toEqual([]);
    expect(parsed.summary).toBe("");
  });

  it("get answers returns only the answers object", async () => {
    const state: GrillingState = {
      "page-state": "view",
      questions: [{ id: "test-question-id-one", title: "T", body: "B", rec: "R", round: 1, deps: [], answered: true }],
      edges: [],
      summary: "some summary",
      rounds: [{ number: 1 }],
      answers: { "test-question-id-one": "the answer is yes" },
    };
    await saveState(dir, state);
    const output = await get(dir, "answers");
    const parsed = JSON.parse(output);
    expect(parsed).toEqual({ "test-question-id-one": "the answer is yes" });
  });

  it("get summary returns only the summary text", async () => {
    const state: GrillingState = {
      "page-state": "view",
      questions: [],
      edges: [],
      summary: "running summary here",
      rounds: [],
      answers: {},
    };
    await saveState(dir, state);
    const output = await get(dir, "summary");
    const parsed = JSON.parse(output);
    expect(parsed).toEqual({ summary: "running summary here" });
  });

  it("get frontier returns only the frontier questions", async () => {
    const state: GrillingState = {
      "page-state": "view",
      questions: [
        { id: "answered-question-one", title: "T", body: "B", rec: "R", round: 1, deps: [], answered: true },
        { id: "unanswered-question-x", title: "T", body: "B", rec: "R", round: 1, deps: [], answered: false },
      ],
      edges: [],
      summary: "",
      rounds: [{ number: 1 }],
      answers: {},
    };
    await saveState(dir, state);
    const output = await get(dir, "frontier");
    const parsed = JSON.parse(output);
    expect(parsed.frontier).toHaveLength(1);
    expect(parsed.frontier[0].id).toBe("unanswered-question-x");
  });

  it("get questions returns only the questions array", async () => {
    const state: GrillingState = {
      "page-state": "view",
      questions: [{ id: "q-one-two-three-four", title: "T", body: "B", rec: "R", round: 1, deps: [], answered: false }],
      edges: [],
      summary: "",
      rounds: [],
      answers: {},
    };
    await saveState(dir, state);
    const output = await get(dir, "questions");
    const parsed = JSON.parse(output);
    expect(parsed.questions).toHaveLength(1);
    expect(parsed.questions[0].id).toBe("q-one-two-three-four");
  });

  it("get state-dir never appears in output", async () => {
    const output = await get(dir);
    expect(output).not.toContain(dir);
    expect(output).not.toContain("state-dir");
    expect(output).not.toContain(tmpdir());
  });

  it("get with invalid subset returns a clear error", async () => {
    await expect(get(dir, "bogus-subset")).rejects.toThrow(/subset|invalid/i);
  });
});
