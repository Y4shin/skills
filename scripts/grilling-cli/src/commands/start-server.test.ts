// Start command — extended: starts the server, writes real pid, prints
// <url>\nopened: <bool>, auto-opens via xdg-open unless --no-open.
// Tests cover the extended start() function interface.
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { start } from "./start.js";

describe("seam — start extended with server + xdg-open", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "grilling-cwd-"));
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  it("start returns {stateDir, key, url, opened} when server starts", async () => {
    const result = await start({ cwd, noOpen: true, html: "<h1>test</h1>" });
    expect(result.stateDir).toMatch(new RegExp(`^${tmpdir()}/grilling-`));
    expect(result.key).toBeTruthy();
    expect(result.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    expect(result.opened).toBe(false);

    // grilling.pid should contain a real pid (not 0).
    const pidContent = readFileSync(join(result.stateDir, "grilling.pid"), "utf-8").trim();
    const pid = parseInt(pidContent, 10);
    expect(pid).toBeGreaterThan(0);

    // Clean up: kill the server process.
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // already dead
    }
    rmSync(result.stateDir, { recursive: true, force: true });
  });

  it("start with noOpen=true does not open the browser (opened=false)", async () => {
    const result = await start({ cwd, noOpen: true, html: "<h1>test</h1>" });
    expect(result.opened).toBe(false);

    const pid = parseInt(readFileSync(join(result.stateDir, "grilling.pid"), "utf-8").trim(), 10);
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // already dead
    }
    rmSync(result.stateDir, { recursive: true, force: true });
  });

  it("start writes the server URL to the state dir (server.port file)", async () => {
    const result = await start({ cwd, noOpen: true, html: "<h1>test</h1>" });
    expect(existsSync(join(result.stateDir, "server.port"))).toBe(true);
    const port = parseInt(readFileSync(join(result.stateDir, "server.port"), "utf-8").trim(), 10);
    expect(port).toBeGreaterThan(0);

    const pid = parseInt(readFileSync(join(result.stateDir, "grilling.pid"), "utf-8").trim(), 10);
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // already dead
    }
    rmSync(result.stateDir, { recursive: true, force: true });
  });

  it("start writes .grilling.json mapping key to dir", async () => {
    const result = await start({ cwd, noOpen: true, html: "<h1>test</h1>" });
    const map = JSON.parse(readFileSync(join(cwd, ".grilling.json"), "utf-8"));
    expect(map[result.key]).toBe(result.stateDir);

    const pid = parseInt(readFileSync(join(result.stateDir, "grilling.pid"), "utf-8").trim(), 10);
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // already dead
    }
    rmSync(result.stateDir, { recursive: true, force: true });
  });

  it("start sets page-state=view", async () => {
    const result = await start({ cwd, noOpen: true, html: "<h1>test</h1>" });
    const state = JSON.parse(readFileSync(join(result.stateDir, "state.json"), "utf-8"));
    expect(state["page-state"]).toBe("view");

    const pid = parseInt(readFileSync(join(result.stateDir, "grilling.pid"), "utf-8").trim(), 10);
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // already dead
    }
    rmSync(result.stateDir, { recursive: true, force: true });
  });
});
