// Seam 2: server.ts routing — in-process server (not detached).
// GET /state returns JSON; POST /submit writes answers + transitions to round-done;
// GET / returns the HTML string.
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createStateDir, loadState, saveState, type GrillingState } from "./state.js";
import { startServerInProcess } from "./server.js";

const TEST_HTML = "<!DOCTYPE html><html><body><h1>Test SPA</h1></body></html>";

async function fetchUrl(url: string, init?: RequestInit): Promise<{ status: number; body: string }> {
  const res = await fetch(url, init);
  const body = await res.text();
  return { status: res.status, body };
}

describe("seam 2 — server routing (in-process)", () => {
  let dir: string;
  let server: Awaited<ReturnType<typeof startServerInProcess>>["server"];
  let baseUrl: string;

  beforeEach(async () => {
    dir = createStateDir();
    const result = await startServerInProcess({ stateDir: dir, html: TEST_HTML });
    server = result.server;
    baseUrl = result.url;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(dir, { recursive: true, force: true });
  });

  it("GET / returns the inlined HTML string", async () => {
    const { status, body } = await fetchUrl(`${baseUrl}/`);
    expect(status).toBe(200);
    expect(body).toBe(TEST_HTML);
  });

  it("GET /state returns the current JSON state", async () => {
    const { status, body } = await fetchUrl(`${baseUrl}/state`);
    expect(status).toBe(200);
    const parsed = JSON.parse(body);
    expect(parsed["page-state"]).toBe("view");
    expect(parsed.questions).toEqual([]);
  });

  it("GET /state reflects updates to the state file", async () => {
    const state = loadState(dir);
    state.summary = "updated summary";
    await saveState(dir, state);
    const { body } = await fetchUrl(`${baseUrl}/state`);
    const parsed = JSON.parse(body);
    expect(parsed.summary).toBe("updated summary");
  });

  it("POST /submit writes answers and transitions to round-done", async () => {
    // Set up a question to answer.
    const state = loadState(dir);
    state["page-state"] = "in-round";
    state.questions = [
      { id: "test-question-id-one", title: "T", body: "B", rec: "R", round: 1, deps: [], answered: false },
    ];
    await saveState(dir, state);

    const { status, body } = await fetchUrl(`${baseUrl}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: { "test-question-id-one": "the answer is 42" },
        feedback: "round feedback here",
      }),
    });
    expect(status).toBe(200);
    const parsed = JSON.parse(body);
    expect(parsed.ok).toBe(true);
    expect(parsed["page-state"]).toBe("round-done");

    // Verify state was actually written.
    const updated = loadState(dir);
    expect(updated["page-state"]).toBe("round-done");
    expect(updated.answers?.["test-question-id-one"]).toBe("the answer is 42");
    expect(updated.questions[0].answered).toBe(true);
    expect(updated.summary).toBe("round feedback here");
  });

  it("POST /submit with empty answers is allowed (skip round)", async () => {
    const state = loadState(dir);
    state["page-state"] = "in-round";
    await saveState(dir, state);

    const { status, body } = await fetchUrl(`${baseUrl}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: {}, feedback: "" }),
    });
    expect(status).toBe(200);
    const parsed = JSON.parse(body);
    expect(parsed["page-state"]).toBe("round-done");

    const updated = loadState(dir);
    expect(updated["page-state"]).toBe("round-done");
  });

  it("POST /submit merges with existing answers (does not overwrite)", async () => {
    const state = loadState(dir);
    state["page-state"] = "in-round";
    state.questions = [
      { id: "first-question-id-one", title: "T", body: "B", rec: "R", round: 1, deps: [], answered: true },
      { id: "second-question-id-two", title: "T", body: "B", rec: "R", round: 1, deps: [], answered: false },
    ];
    state.answers = { "first-question-id-one": "answer one" };
    await saveState(dir, state);

    await fetchUrl(`${baseUrl}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: { "second-question-id-two": "answer two" },
      }),
    });

    const updated = loadState(dir);
    expect(updated.answers?.["first-question-id-one"]).toBe("answer one");
    expect(updated.answers?.["second-question-id-two"]).toBe("answer two");
  });

  it("unknown route returns 404", async () => {
    const { status } = await fetchUrl(`${baseUrl}/unknown`);
    expect(status).toBe(404);
  });

  it("POST /submit with invalid JSON returns 400", async () => {
    const state = loadState(dir);
    state["page-state"] = "in-round";
    await saveState(dir, state);

    const { status, body } = await fetchUrl(`${baseUrl}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not valid json",
    });
    expect(status).toBe(400);
    const parsed = JSON.parse(body);
    expect(parsed.error).toMatch(/json/i);
  });
});
