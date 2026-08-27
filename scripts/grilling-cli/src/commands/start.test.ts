import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeKey, resolveKey } from "../key.js";
import { start } from "./start.js";

const TEST_HTML = "<h1>test spa</h1>";

// Helper: kill the server process whose pid is in grilling.pid, then remove the dir.
function cleanupServer(stateDir: string): void {
  try {
    const pidStr = readFileSync(join(stateDir, "grilling.pid"), "utf-8").trim();
    const pid = parseInt(pidStr, 10);
    if (pid > 0) {
      try { process.kill(pid, "SIGTERM"); } catch { /* dead */ }
    }
  } catch { /* no pid file */ }
  rmSync(stateDir, { recursive: true, force: true });
}

describe("seam 4 — start + key indirection", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "grilling-cwd-"));
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  it("start creates a random temp dir with state.json and grilling.pid", async () => {
    const result = await start({ cwd, noOpen: true, html: TEST_HTML });
    expect(result.stateDir).toMatch(new RegExp(`^${tmpdir()}/grilling-`));
    expect(existsSync(join(result.stateDir, "state.json"))).toBe(true);
    expect(existsSync(join(result.stateDir, "grilling.pid"))).toBe(true);
    cleanupServer(result.stateDir);
  });

  it("start writes .grilling.json in CWD mapping key -> dir", async () => {
    const result = await start({ cwd, noOpen: true, html: TEST_HTML });
    const mapPath = join(cwd, ".grilling.json");
    expect(existsSync(mapPath)).toBe(true);
    const map = JSON.parse(readFileSync(mapPath, "utf-8"));
    expect(map[result.key]).toBe(result.stateDir);
    cleanupServer(result.stateDir);
  });

  it("start sets page-state=view", async () => {
    const result = await start({ cwd, noOpen: true, html: TEST_HTML });
    const state = JSON.parse(readFileSync(join(result.stateDir, "state.json"), "utf-8"));
    expect(state["page-state"]).toBe("view");
    cleanupServer(result.stateDir);
  });

  it("start returns url and opened status", async () => {
    const result = await start({ cwd, noOpen: true, html: TEST_HTML });
    expect(result.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    expect(result.opened).toBe(false);
    cleanupServer(result.stateDir);
  });

  it("two parallel starts produce two distinct random dirs", async () => {
    const [a, b] = await Promise.all([
      start({ cwd, noOpen: true, html: TEST_HTML }),
      start({ cwd, noOpen: true, html: TEST_HTML }),
    ]);
    expect(a.stateDir).not.toBe(b.stateDir);
    expect(a.key).not.toBe(b.key);
    cleanupServer(a.stateDir);
    cleanupServer(b.stateDir);
  });

  it("two starts produce two key-map entries", async () => {
    const [a, b] = await Promise.all([
      start({ cwd, noOpen: true, html: TEST_HTML }),
      start({ cwd, noOpen: true, html: TEST_HTML }),
    ]);
    const map = JSON.parse(readFileSync(join(cwd, ".grilling.json"), "utf-8"));
    expect(Object.keys(map)).toHaveLength(2);
    expect(map[a.key]).toBe(a.stateDir);
    expect(map[b.key]).toBe(b.stateDir);
    cleanupServer(a.stateDir);
    cleanupServer(b.stateDir);
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
