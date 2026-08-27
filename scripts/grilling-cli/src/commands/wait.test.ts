import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createStateDir, saveState, type GrillingState } from "../state.js";
import { wait } from "./wait.js";

describe("seam 6 — wait blocks until state matches or times out", () => {
  let dir: string;

  beforeEach(() => {
    dir = createStateDir();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("wait exits 0 immediately when state already matches", async () => {
    // Fresh state is "view"; wait for "view" should return immediately.
    const exitCode = await wait(dir, "view", 1000);
    expect(exitCode).toBe(0);
  });

  it("wait returns 0 when state transitions to target", async () => {
    // Set up a transition after a short delay.
    const state: GrillingState = {
      "page-state": "view",
      questions: [],
      edges: [],
      summary: "",
      rounds: [],
      answers: {},
    };
    await saveState(dir, state);

    // Simulate external state change after 50ms.
    setTimeout(async () => {
      const updated: GrillingState = {
        ...state,
        "page-state": "in-round",
        questions: [],
        edges: [],
        summary: "",
        rounds: [],
        answers: {},
      };
      await saveState(dir, updated);
    }, 50);

    const exitCode = await wait(dir, "in-round", 5000);
    expect(exitCode).toBe(0);
  });

  it("wait times out with non-zero exit when target never matches", async () => {
    // Fresh state is "view"; wait for "done" with a short timeout.
    await expect(wait(dir, "done", 200)).rejects.toThrow(/timeout/i);
  });

  it("wait timeout message is clear and names the target state", async () => {
    try {
      await wait(dir, "accepted", 200);
      expect.fail("should have timed out");
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toMatch(/timeout/i);
      expect(msg).toContain("accepted");
    }
  });
});
