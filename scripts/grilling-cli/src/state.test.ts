import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createStateDir,
  loadState,
  saveState,
  type GrillingState,
  validateState,
} from "./state.js";

describe("seam 1 — state.ts atomic writes + schema", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "grilling-test-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("createStateDir creates a random dir under os.tmpdir() containing state.json", () => {
    const result = createStateDir();
    expect(result).toMatch(new RegExp(`^${tmpdir()}/grilling-`));
    expect(existsSync(join(result, "state.json"))).toBe(true);

    const state = JSON.parse(readFileSync(join(result, "state.json"), "utf-8"));
    expect(state["page-state"]).toBe("view");
    expect(state.questions).toEqual([]);
    expect(state.edges).toEqual([]);
    expect(state.summary).toBe("");
    expect(state.rounds).toEqual([]);

    rmSync(result, { recursive: true, force: true });
  });

  it("createStateDir produces unique paths on each call", () => {
    const a = createStateDir();
    const b = createStateDir();
    expect(a).not.toBe(b);
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  });

  it("saveState writes valid JSON that can be loaded back", async () => {
    const state: GrillingState = {
      "page-state": "view",
      questions: [],
      edges: [],
      summary: "test summary",
      rounds: [],
      answers: {},
    };
    await saveState(dir, state);
    const loaded = loadState(dir);
    expect(loaded).toEqual(state);
  });

  it("saveState is atomic — no partial file at the target path", async () => {
    const state: GrillingState = {
      "page-state": "view",
      questions: [{ id: "test-question-id", title: "T", body: "B", rec: "R", round: 1, deps: [], answered: false }],
      edges: [],
      summary: "",
      rounds: [{ number: 1 }],
      answers: {},
    };

    // The target file must exist only as a complete, valid JSON after save.
    await saveState(dir, state);

    const targetPath = join(dir, "state.json");
    const content = readFileSync(targetPath, "utf-8");
    // Must be parseable JSON (not a partial write).
    expect(() => JSON.parse(content)).not.toThrow();
    const loaded = loadState(dir);
    expect(loaded.questions).toHaveLength(1);
    expect(loaded.questions[0].id).toBe("test-question-id");
  });

  it("saveState overwrites existing state completely (not appended)", async () => {
    const state1: GrillingState = {
      "page-state": "view",
      questions: [{ id: "aaa-bbb-ccc-ddd-eee", title: "T1", body: "B1", rec: "R1", round: 1, deps: [], answered: false }],
      edges: [],
      summary: "first",
      rounds: [{ number: 1 }],
      answers: {},
    };
    await saveState(dir, state1);

    const state2: GrillingState = {
      "page-state": "in-round",
      questions: [],
      edges: [],
      summary: "second",
      rounds: [],
      answers: {},
    };
    await saveState(dir, state2);

    const loaded = loadState(dir);
    expect(loaded.summary).toBe("second");
    expect(loaded.questions).toEqual([]);
    expect(loaded["page-state"]).toBe("in-round");
  });

  it("loadState throws a clear error on corrupt JSON", () => {
    writeFileSync(join(dir, "state.json"), "{ not valid json");
    expect(() => loadState(dir)).toThrow(/state/i);
  });

  it("validateState rejects invalid page-state values", () => {
    expect(() =>
      validateState({
        "page-state": "bogus",
        questions: [],
        edges: [],
        summary: "",
        rounds: [],
      } as unknown as GrillingState),
    ).toThrow(/page-state/i);
  });

  it("validateState accepts a valid state", () => {
    const state: GrillingState = {
      "page-state": "view",
      questions: [],
      edges: [],
      summary: "",
      rounds: [],
      answers: {},
    };
    expect(() => validateState(state)).not.toThrow();
  });
});
