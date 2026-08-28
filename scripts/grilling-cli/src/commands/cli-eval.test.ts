// Slice 5 — seam 3: the modified CLI `wait` returns immediately under
// GRILLING_EVAL=1, and `start` forces no-open under that flag. The real CLI
// behavior is unaffected when the flag is absent.
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createStateDir, saveState, type GrillingState } from "../state.js";
import { wait } from "./wait.js";
import { start } from "./start.js";

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

describe("seam 3 — modified wait returns immediately under GRILLING_EVAL=1", () => {
  let dir: string;
  const savedEnv = process.env.GRILLING_EVAL;

  beforeEach(() => {
    dir = createStateDir();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    if (savedEnv === undefined) delete process.env.GRILLING_EVAL;
    else process.env.GRILLING_EVAL = savedEnv;
  });

  it("wait returns immediately (does not block) when GRILLING_EVAL=1", async () => {
    process.env.GRILLING_EVAL = "1";
    // State is "view" but we are waiting for "round-done" — in eval mode
    // the wait should return 0 immediately WITHOUT matching the target.
    const t0 = Date.now();
    const exitCode = await wait(dir, "round-done", 30000);
    const elapsed = Date.now() - t0;
    expect(exitCode).toBe(0);
    // Must return in well under the timeout (immediate).
    expect(elapsed).toBeLessThan(1000);
  });

  it("wait in eval mode prints a 'hand back to user' message", async () => {
    process.env.GRILLING_EVAL = "1";
    const captured: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: string) => {
      captured.push(chunk);
      return true;
    };
    try {
      await wait(dir, "accepted", 30000);
    } finally {
      process.stdout.write = origWrite;
    }
    const output = captured.join("");
    expect(output).toMatch(/hand back/i);
    expect(output).toMatch(/user/i);
  });

  it("wait blocks normally (real behavior) when GRILLING_EVAL is absent", async () => {
    delete process.env.GRILLING_EVAL;
    // State is "view", waiting for "done" — should time out quickly.
    await expect(wait(dir, "done", 200)).rejects.toThrow(/timeout/i);
  });

  it("wait blocks normally when GRILLING_EVAL=0", async () => {
    process.env.GRILLING_EVAL = "0";
    await expect(wait(dir, "done", 200)).rejects.toThrow(/timeout/i);
  });
});

describe("seam 3 — start forces no-open under GRILLING_EVAL=1", () => {
  let cwd: string;
  const savedEnv = process.env.GRILLING_EVAL;
  const TEST_HTML = "<h1>eval test</h1>";

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "grilling-eval-cwd-"));
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
    if (savedEnv === undefined) delete process.env.GRILLING_EVAL;
    else process.env.GRILLING_EVAL = savedEnv;
  });

  it("start does not open a browser when GRILLING_EVAL=1 even if noOpen is false", async () => {
    process.env.GRILLING_EVAL = "1";
    // Even with noOpen=false (simulating the agent passing --open), the
    // eval flag must force no-open.
    const result = await start({ cwd, noOpen: false, html: TEST_HTML });
    expect(result.opened).toBe(false);
    cleanupServer(result.stateDir);
  });
});
