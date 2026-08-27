// Seam 5: finalize stops the server + cleans up the temp dir + .grilling.json
// entry (integration).
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createStateDir, loadState, saveState, type GrillingState } from "../state.js";
import { finalize } from "./finalize.js";
import { writeKey, resolveKey } from "../key.js";

describe("seam 5 — finalize stops server + cleans up", () => {
  let dir: string;
  let cwd: string;

  beforeEach(() => {
    dir = createStateDir();
    cwd = mkdtempSync(join(tmpdir(), "grilling-cwd-"));
  });

  afterEach(() => {
    // finalize should have removed dir; rmSync with force handles if not.
    rmSync(dir, { recursive: true, force: true });
    rmSync(cwd, { recursive: true, force: true });
  });

  function setupCoastClear(): void {
    const state = loadState(dir);
    state.questions = [
      { id: "resolved-question-one", title: "Q1", body: "B", rec: "R", round: 1, deps: [], answered: true },
    ];
    state.answers = { "resolved-question-one": "Answer 1" };
    state["page-state"] = "done";
    state.summary = "Final summary";
    state.rounds = [{ number: 1 }];
    // writeFileSync is synchronous; saveState is async so use direct sync write.
    writeFileSync(join(dir, "state.json"), JSON.stringify(state, null, 2), "utf-8");
  }

  it("finalize removes the temp dir after emitting markdown", async () => {
    setupCoastClear();
    writeKey(cwd, "test-key", dir);

    await finalize(dir, cwd);

    expect(existsSync(dir)).toBe(false);
  });

  it("finalize removes the .grilling.json key entry after emitting markdown", async () => {
    setupCoastClear();
    writeKey(cwd, "test-key", dir);

    await finalize(dir, cwd, "test-key");

    // .grilling.json should no longer contain the key.
    const mapPath = join(cwd, ".grilling.json");
    if (existsSync(mapPath)) {
      const map = JSON.parse(readFileSync(mapPath, "utf-8"));
      expect(map["test-key"]).toBeUndefined();
    }
    // resolveKey should now throw for the removed key.
    expect(() => resolveKey(cwd, "test-key")).toThrow();
  });

  it("finalize kills the server process if a real pid exists in grilling.pid", async () => {
    setupCoastClear();
    writeKey(cwd, "test-key", dir);

    // Spawn a dummy long-running process and write its pid to grilling.pid.
    const { spawn } = await import("node:child_process");
    const child = spawn(process.execPath, ["-e", "setInterval(()=>{}, 1000)"], {
      detached: true,
      stdio: "ignore",
    });
    const pid = child.pid!;
    writeFileSync(join(dir, "grilling.pid"), `${pid}\n`, "utf-8");

    await finalize(dir, cwd, "test-key");

    // The child process should have been killed.
    // Give it a moment to exit, then check if it's still running.
    await new Promise((r) => setTimeout(r, 100));
    let stillAlive = false;
    try {
      // Sending signal 0 checks if the process exists without actually killing.
      process.kill(pid, 0);
      stillAlive = true;
    } catch {
      stillAlive = false;
    }
    expect(stillAlive).toBe(false);
    // Clean up the child if still alive.
    try {
      child.kill("SIGKILL");
    } catch {
      // already dead
    }
  });

  it("finalize still emits markdown before cleanup (markdown exists in cwd)", async () => {
    setupCoastClear();
    writeKey(cwd, "test-key", dir);

    const result = await finalize(dir, cwd, "test-key");

    expect(result.exitCode).toBe(0);
    expect(existsSync(result.markdownPath)).toBe(true);
    const md = readFileSync(result.markdownPath, "utf-8");
    expect(md).toContain("Final summary");
    expect(md).toContain("Answer 1");
  });
});
