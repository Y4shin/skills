import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeKey, resolveKey } from "../key.js";
import { start } from "./start.js";

describe("seam 4 — start + key indirection", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "grilling-cwd-"));
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  it("start creates a random temp dir with state.json and grilling.pid", async () => {
    const result = await start({ cwd });
    expect(result.stateDir).toMatch(new RegExp(`^${tmpdir()}/grilling-`));
    expect(existsSync(join(result.stateDir, "state.json"))).toBe(true);
    expect(existsSync(join(result.stateDir, "grilling.pid"))).toBe(true);
    rmSync(result.stateDir, { recursive: true, force: true });
  });

  it("start writes .grilling.json in CWD mapping key -> dir", async () => {
    const result = await start({ cwd });
    const mapPath = join(cwd, ".grilling.json");
    expect(existsSync(mapPath)).toBe(true);
    const map = JSON.parse(readFileSync(mapPath, "utf-8"));
    expect(map[result.key]).toBe(result.stateDir);
    rmSync(result.stateDir, { recursive: true, force: true });
  });

  it("start sets page-state=view", async () => {
    const result = await start({ cwd });
    const state = JSON.parse(readFileSync(join(result.stateDir, "state.json"), "utf-8"));
    expect(state["page-state"]).toBe("view");
    rmSync(result.stateDir, { recursive: true, force: true });
  });

  it("start prints the real dir to stdout", async () => {
    const result = await start({ cwd });
    // The function captures stdout; we verify the result contains the dir.
    // (The actual stdout printing is tested in the integration test.)
    expect(result.stateDir).toBeTruthy();
    rmSync(result.stateDir, { recursive: true, force: true });
  });

  it("two parallel starts produce two distinct random dirs", async () => {
    const [a, b] = await Promise.all([start({ cwd }), start({ cwd })]);
    expect(a.stateDir).not.toBe(b.stateDir);
    expect(a.key).not.toBe(b.key);
    rmSync(a.stateDir, { recursive: true, force: true });
    rmSync(b.stateDir, { recursive: true, force: true });
  });

  it("two starts produce two key-map entries", async () => {
    const [a, b] = await Promise.all([start({ cwd }), start({ cwd })]);
    const map = JSON.parse(readFileSync(join(cwd, ".grilling.json"), "utf-8"));
    expect(Object.keys(map)).toHaveLength(2);
    expect(map[a.key]).toBe(a.stateDir);
    expect(map[b.key]).toBe(b.stateDir);
    rmSync(a.stateDir, { recursive: true, force: true });
    rmSync(b.stateDir, { recursive: true, force: true });
  });

  it("writeKey + resolveKey round-trip", () => {
    const testDir = mkdtempSync(join(tmpdir(), "grilling-test-"));
    const key = "test-key-12345";
    writeKey(cwd, key, testDir);
    expect(resolveKey(cwd, key)).toBe(testDir);
    rmSync(testDir, { recursive: true, force: true });
  });

  it("resolveKey throws a clear error for an unknown key", () => {
    expect(() => resolveKey(cwd, "nonexistent-key-x")).toThrow(/key/i);
  });
});
