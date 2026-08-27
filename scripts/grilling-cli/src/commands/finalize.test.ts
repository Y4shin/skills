import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createStateDir, loadState, saveState, type GrillingState } from "../state.js";
import { finalize } from "./finalize.js";
import { addQuestion, addEdge, setState, setSummary } from "./update.js";

describe("seam 7 — finalize coast-clear check + markdown emission", () => {
  let dir: string;
  let cwd: string;

  beforeEach(() => {
    dir = createStateDir();
    cwd = mkdtempSync(join(tmpdir(), "grilling-cwd-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    rmSync(cwd, { recursive: true, force: true });
  });

  it("finalize returns non-zero with 'no questions resolved' for empty grilling", async () => {
    await expect(finalize(dir, cwd)).rejects.toThrow(/no questions resolved/i);
  });

  it("finalize returns non-zero when frontier is non-empty (unanswered questions)", async () => {
    await addQuestion(dir, {
      id: "unanswered-question-one",
      title: "T",
      body: "B",
      rec: "R",
      round: 1,
      deps: [],
    });
    await expect(finalize(dir, cwd)).rejects.toThrow(/frontier|unanswered/i);
  });

  it("finalize returns non-zero when there are unresolved contradictions", async () => {
    await addQuestion(dir, { id: "contra-source-id-one", title: "T", body: "B", rec: "R", round: 1, deps: [] });
    await addQuestion(dir, { id: "contra-target-id-two", title: "T", body: "B", rec: "R", round: 1, deps: [] });
    await addEdge(dir, { id: "unresolved-contra-id", from: "contra-source-id-one", to: "contra-target-id-two", type: "contra" });

    // Mark all questions as answered so the only issue is the unresolved contradiction.
    const state = loadState(dir);
    state.questions.forEach((q) => (q.answered = true));
    await saveState(dir, state);

    await expect(finalize(dir, cwd)).rejects.toThrow(/contradiction|unresolved/i);
  });

  it("finalize emits markdown and exits 0 when coast is clear", async () => {
    // Set up a fully resolved grilling.
    await addQuestion(dir, { id: "resolved-question-one", title: "Q1 Title", body: "Q1 Body", rec: "R1", round: 1, deps: [] });
    await addQuestion(dir, { id: "resolved-question-two", title: "Q2 Title", body: "Q2 Body", rec: "R2", round: 2, deps: ["resolved-question-one"] });
    await addEdge(dir, { id: "edge-dep-one-id", from: "resolved-question-one", to: "resolved-question-two", type: "dep" });
    await setSummary(dir, "Final summary of the grilling");
    await setState(dir, "in-round");
    await setState(dir, "round-done");
    await setState(dir, "final-review");
    await setState(dir, "accepted");
    await setState(dir, "done");

    // Mark all answered with answers set.
    const state = loadState(dir);
    state.questions.forEach((q) => (q.answered = true));
    state.answers = {
      "resolved-question-one": "Answer 1",
      "resolved-question-two": "Answer 2",
    };
    await saveState(dir, state);

    const result = await finalize(dir, cwd);
    expect(result.exitCode).toBe(0);
    expect(result.markdownPath).toBeTruthy();
    expect(existsSync(result.markdownPath)).toBe(true);

    const md = readFileSync(result.markdownPath, "utf-8");
    // Contains the summary sidebar.
    expect(md).toContain("Final summary of the grilling");
    // Contains all Q&A.
    expect(md).toContain("Q1 Title");
    expect(md).toContain("Answer 1");
    expect(md).toContain("Q2 Title");
    expect(md).toContain("Answer 2");
  });

  it("finalize markdown is emitted in the cwd", async () => {
    await addQuestion(dir, { id: "single-question-id-one", title: "Single", body: "B", rec: "R", round: 1, deps: [] });
    const state = loadState(dir);
    state.questions[0].answered = true;
    state.answers = { "single-question-id-one": "Done" };
    state["page-state"] = "done";
    await saveState(dir, state);

    const result = await finalize(dir, cwd);
    // The markdown file should be in cwd, not the state dir.
    expect(result.markdownPath).toContain(cwd);
    expect(result.markdownPath).not.toContain(dir);
  });
});
