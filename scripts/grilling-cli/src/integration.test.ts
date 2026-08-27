// End-to-end integration test (seam 8):
// start → add-question ×N → add-edge → promote → set-state in-round →
// (test helper sets answers) → set-state round-done → get shows answers →
// finalize emits markdown.
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const cliMjs = join(repoRoot, "skills", "grilling", "grilling-cli.mjs");

// Ensure the .mjs exists before running integration tests. The bundler
// test removes and rebuilds it; if it runs concurrently, the file may be
// temporarily missing. We build synchronously at module load if needed.
if (!existsSync(cliMjs)) {
  spawnSync(
    process.execPath,
    [join(repoRoot, "node_modules", "vite-node", "vite-node.mjs"), "scripts/build.ts"],
    { cwd: repoRoot, encoding: "utf-8" },
  );
}

function runCli(
  args: string[],
  cwd: string,
): { exitCode: number; stdout: string; stderr: string } {
  // The bundler test removes and rebuilds the .mjs, which races with us.
  // Ensure the file exists before each invocation.
  if (!existsSync(cliMjs)) {
    spawnSync(
      process.execPath,
      [join(repoRoot, "node_modules", "vite-node", "vite-node.mjs"), "scripts/build.ts"],
      { cwd: repoRoot, encoding: "utf-8" },
    );
  }
  let result = spawnSync("node", [cliMjs, ...args], {
    cwd,
    encoding: "utf-8",
  });
  // Retry once if the file was removed mid-spawn (race with bundler test).
  if (
    result.status !== 0 &&
    result.stderr.includes("Cannot find module")
  ) {
    spawnSync(
      process.execPath,
      [join(repoRoot, "node_modules", "vite-node", "vite-node.mjs"), "scripts/build.ts"],
      { cwd: repoRoot, encoding: "utf-8" },
    );
    result = spawnSync("node", [cliMjs, ...args], {
      cwd,
      encoding: "utf-8",
    });
  }
  return {
    exitCode: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

// Extract the state dir from the .grilling.json map (start no longer prints
// just the dir — it prints <url>\nopened: <bool>).
function getStateDir(cwd: string): string {
  const map = JSON.parse(readFileSync(join(cwd, ".grilling.json"), "utf-8"));
  const keys = Object.keys(map);
  expect(keys.length).toBeGreaterThanOrEqual(1);
  return map[keys[0]];
}

function getKey(cwd: string): string {
  const map = JSON.parse(readFileSync(join(cwd, ".grilling.json"), "utf-8"));
  return Object.keys(map)[0];
}

// Kill the server process if a real pid exists, then remove the dir.
function cleanupServer(stateDir: string): void {
  if (stateDir && existsSync(join(stateDir, "grilling.pid"))) {
    try {
      const pid = parseInt(readFileSync(join(stateDir, "grilling.pid"), "utf-8").trim(), 10);
      if (pid > 0) {
        try { process.kill(pid, "SIGTERM"); } catch { /* dead */ }
      }
    } catch { /* no pid file */ }
  }
  rmSync(stateDir, { recursive: true, force: true });
}

describe("seam 8 — end-to-end bash loop (integration)", () => {
  let cwd: string;
  let stateDir: string;

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "grilling-e2e-"));
    stateDir = "";
  });

  afterEach(() => {
    if (stateDir) {
      cleanupServer(stateDir);
    }
    rmSync(cwd, { recursive: true, force: true });
  });

  it("full loop: start → add-question ×2 → add-edge → promote → set-state → answers → get → finalize", () => {
    // 1. start (with --no-open to suppress browser)
    const startResult = runCli(["start", "--no-open"], cwd);
    expect(startResult.exitCode, startResult.stderr).toBe(0);
    // start now prints <url>\nopened: <bool>
    expect(startResult.stdout).toMatch(/^http:\/\/127\.0\.0\.1:\d+/);
    expect(startResult.stdout).toMatch(/opened: false/);

    stateDir = getStateDir(cwd);
    expect(stateDir).toMatch(new RegExp(`^${tmpdir()}/grilling-`));
    expect(existsSync(join(stateDir, "state.json"))).toBe(true);
    expect(existsSync(join(stateDir, "grilling.pid"))).toBe(true);

    const key = getKey(cwd);
    expect(getStateDir(cwd)).toBe(stateDir);

    // 2. add-question ×2
    const aq1 = runCli(
      ["update", "add-question", "--state", key, "--id", "what-framework-to-use", "--title", "Framework?", "--body", "Which framework?", "--rec", "React", "--round", "1", "--deps", ""],
      cwd,
    );
    expect(aq1.exitCode, aq1.stderr).toBe(0);

    const aq2 = runCli(
      ["update", "add-question", "--state", key, "--id", "what-state-lib-to-use", "--title", "State lib?", "--body", "Which state lib?", "--rec", "Zustand", "--round", "2", "--deps", "what-framework-to-use"],
      cwd,
    );
    expect(aq2.exitCode, aq2.stderr).toBe(0);

    // 3. add-edge
    const ae = runCli(
      ["update", "add-edge", "--state", key, "--id", "edge-dep-framework", "--from", "what-framework-to-use", "--to", "what-state-lib-to-use", "--type", "dep"],
      cwd,
    );
    expect(ae.exitCode, ae.stderr).toBe(0);

    // 4. promote
    const promote = runCli(
      ["update", "promote", "--state", key, "--id", "what-framework-to-use", "--to-round", "1"],
      cwd,
    );
    expect(promote.exitCode, promote.stderr).toBe(0);

    // 5. set-state in-round
    const setStateInRound = runCli(
      ["update", "set-state", "--state", key, "in-round"],
      cwd,
    );
    expect(setStateInRound.exitCode, setStateInRound.stderr).toBe(0);

    // 6. Simulate user answers (test helper: edit JSON directly).
    const state = JSON.parse(readFileSync(join(stateDir, "state.json"), "utf-8"));
    state.questions.forEach((q: { id: string; answered: boolean }) => {
      q.answered = true;
    });
    state.answers = {
      "what-framework-to-use": "Use React",
      "what-state-lib-to-use": "Use Zustand",
    };
    writeFileSync(join(stateDir, "state.json"), JSON.stringify(state, null, 2));

    // 7. set-state round-done
    const setStateRoundDone = runCli(
      ["update", "set-state", "--state", key, "round-done"],
      cwd,
    );
    expect(setStateRoundDone.exitCode, setStateRoundDone.stderr).toBe(0);

    // 8. get shows answers
    const getAnswers = runCli(
      ["get", "--state", key, "answers"],
      cwd,
    );
    expect(getAnswers.exitCode, getAnswers.stderr).toBe(0);
    const answers = JSON.parse(getAnswers.stdout);
    expect(answers["what-framework-to-use"]).toBe("Use React");
    expect(answers["what-state-lib-to-use"]).toBe("Use Zustand");

    // 9. get shows state
    const getState = runCli(
      ["get", "--state", key, "state"],
      cwd,
    );
    expect(getState.exitCode, getState.stderr).toBe(0);
    const pageState = JSON.parse(getState.stdout);
    expect(pageState["page-state"]).toBe("round-done");

    // 10. Transition to done so finalize can proceed.
    runCli(["update", "set-state", "--state", key, "final-review"], cwd);
    runCli(["update", "set-state", "--state", key, "accepted"], cwd);
    runCli(["update", "set-state", "--state", key, "done"], cwd);

    // 11. finalize emits markdown (and stops server + cleans up)
    const finalizeResult = runCli(
      ["finalize", "--state", key],
      cwd,
    );
    expect(finalizeResult.exitCode, finalizeResult.stderr).toBe(0);

    // Check that markdown was emitted in cwd.
    const mdFiles = require("node:fs").readdirSync(cwd).filter((f: string) =>
      f.endsWith("-grilling-summary.md"),
    );
    expect(mdFiles.length).toBe(1);
    const md = readFileSync(join(cwd, mdFiles[0]), "utf-8");
    expect(md).toContain("Framework?");
    expect(md).toContain("Use React");
    expect(md).toContain("State lib?");
    expect(md).toContain("Use Zustand");

    // finalize removes the temp dir.
    expect(existsSync(stateDir)).toBe(false);
  });

  it("get never exposes the real dir path", () => {
    // Start
    runCli(["start", "--no-open"], cwd);
    stateDir = getStateDir(cwd);
    const key = getKey(cwd);

    // get full state
    const getFull = runCli(["get", "--state", key], cwd);
    expect(getFull.exitCode).toBe(0);
    expect(getFull.stdout).not.toContain(stateDir);
    expect(getFull.stdout).not.toContain(tmpdir());

    // get with subset
    const getSub = runCli(["get", "--state", key, "questions"], cwd);
    expect(getSub.exitCode).toBe(0);
    expect(getSub.stdout).not.toContain(stateDir);
  });

  it("disallowed state transition exits non-zero with clear error", () => {
    runCli(["start", "--no-open"], cwd);
    stateDir = getStateDir(cwd);
    const key = getKey(cwd);

    // view → done is not allowed
    const result = runCli(
      ["update", "set-state", "--state", key, "done"],
      cwd,
    );
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toMatch(/transition/i);
  });

  it("refresh signals the server and exits 0", () => {
    runCli(["start", "--no-open"], cwd);
    stateDir = getStateDir(cwd);
    const key = getKey(cwd);

    const result = runCli(["refresh", "--state", key], cwd);
    expect(result.exitCode, result.stderr).toBe(0);
    // refresh writes a refresh.flag file.
    expect(existsSync(join(stateDir, "refresh.flag"))).toBe(true);
  });

  it("add-question with duplicate id exits non-zero", () => {
    runCli(["start", "--no-open"], cwd);
    stateDir = getStateDir(cwd);
    const key = getKey(cwd);

    const aq1 = runCli(
      ["update", "add-question", "--state", key, "--id", "duplicate-id-here-now", "--title", "T", "--body", "B", "--rec", "R", "--round", "1", "--deps", ""],
      cwd,
    );
    expect(aq1.exitCode).toBe(0);

    const aq2 = runCli(
      ["update", "add-question", "--state", key, "--id", "duplicate-id-here-now", "--title", "T2", "--body", "B", "--rec", "R", "--round", "1", "--deps", ""],
      cwd,
    );
    expect(aq2.exitCode).not.toBe(0);
    expect(aq2.stderr).toMatch(/duplicate.*id/i);
  });

  it("add-edge with unknown node id exits non-zero", () => {
    runCli(["start", "--no-open"], cwd);
    stateDir = getStateDir(cwd);
    const key = getKey(cwd);

    runCli(
      ["update", "add-question", "--state", key, "--id", "existing-id-one-here", "--title", "T", "--body", "B", "--rec", "R", "--round", "1", "--deps", ""],
      cwd,
    );

    const ae = runCli(
      ["update", "add-edge", "--state", key, "--id", "edge-bad-id-here", "--from", "nonexistent-id-x", "--to", "existing-id-one-here", "--type", "dep"],
      cwd,
    );
    expect(ae.exitCode).not.toBe(0);
    expect(ae.stderr).toMatch(/unknown.*id/i);
  });
});
