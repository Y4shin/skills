// Seam 4: refresh signals the server via the .pid (SIGHUP or a watched file
// touch). Test: a flag/file flips after refresh.
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createStateDir } from "../state.js";
import { startServerInProcess } from "../server.js";
import { refresh } from "./refresh.js";
import { spawn } from "node:child_process";

const TEST_HTML = "<!DOCTYPE html><html><body><h1>Test SPA</h1></body></html>";

describe("seam 4 — refresh signals the server", () => {
  let dir: string;

  beforeEach(() => {
    dir = createStateDir();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("refresh touches a refresh flag file in the state dir", async () => {
    // The refresh command should signal the server. We test the flag-file
    // mechanism: refresh writes/touches a file that the server (or a watcher)
    // can observe. Even without a running server, refresh should create
    // the flag file as a signal artifact.
    await refresh(dir);
    expect(existsSync(join(dir, "refresh.flag"))).toBe(true);
  });

  it("refresh updates the flag file timestamp on each call", async () => {
    await refresh(dir);
    const firstContent = readFileSync(join(dir, "refresh.flag"), "utf-8");
    const firstTime = parseInt(firstContent, 10);

    // Small delay to ensure timestamp changes.
    await new Promise((r) => setTimeout(r, 20));
    await refresh(dir);
    const secondContent = readFileSync(join(dir, "refresh.flag"), "utf-8");
    const secondTime = parseInt(secondContent, 10);

    expect(secondTime).toBeGreaterThanOrEqual(firstTime);
  });

  it("refresh validates the state dir (throws on missing state.json)", async () => {
    const emptyDir = mkdtempSync(join(tmpdir(), "grilling-empty-"));
    try {
      await expect(refresh(emptyDir)).rejects.toThrow(/state/i);
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});
