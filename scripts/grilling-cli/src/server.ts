// Server module — persistent HTTP server serving the inlined SPA + state API.
// startServer({stateDir, html}) returns {url, pid} in detached mode.
// For tests, createInProcessServer({stateDir, html}) returns the http.Server
// instance + url (NOT detached) so the test can close it.
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";
import { loadState, saveState } from "./state.js";
import { spawn, type ChildProcess } from "node:child_process";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface StartServerInput {
  stateDir: string;
  html: string;
}

export interface StartServerResult {
  url: string;
  pid: number;
}

/**
 * Build the http request handler. Shared between in-process (tests) and
 * detached (production) server startup.
 */
export function createHandler(stateDir: string, html: string) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const method = req.method ?? "GET";
    const url = req.url ?? "/";

    // Simple dispatch on method + path.
    if (method === "GET" && url === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }

    if (method === "GET" && url === "/state") {
      try {
        const state = loadState(stateDir);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(state));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: (e as Error).message }));
      }
      return;
    }

    if (method === "POST" && url === "/submit") {
      try {
        const body = await readBody(req);
        let parsed: { answers?: Record<string, string>; feedback?: string };
        try {
          parsed = JSON.parse(body);
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
          return;
        }
        const state = loadState(stateDir);
        // Merge answers.
        const newAnswers = parsed.answers ?? {};
        const existingAnswers = state.answers ?? {};
        state.answers = { ...existingAnswers, ...newAnswers };
        // Mark submitted answers' questions as answered.
        for (const id of Object.keys(newAnswers)) {
          const q = state.questions.find((q) => q.id === id);
          if (q) q.answered = true;
        }
        // Store feedback in summary if provided (append to summary).
        if (parsed.feedback) {
          state.summary = parsed.feedback;
        }
        // Transition to round-done.
        state["page-state"] = "round-done";
        await saveState(stateDir, state);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, "page-state": "round-done" }));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: (e as Error).message }));
      }
      return;
    }

    // 404 for everything else.
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

/**
 * Start the server in-process (for tests). Returns the Server + url.
 * Does NOT detach — caller is responsible for closing.
 */
export async function startServerInProcess(input: StartServerInput): Promise<{ server: Server; url: string }> {
  const server = createServer(createHandler(input.stateDir, input.html));
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        const url = `http://127.0.0.1:${addr.port}`;
        resolve({ server, url });
      } else {
        reject(new Error("Failed to get server address"));
      }
    });
  });
}

/**
 * Start the detached server. Spawns a child process that runs the server,
 * writes the real pid, and returns {url, pid}.
 */
export async function startServer(input: StartServerInput): Promise<StartServerResult> {
  // Write the server entry script into the state dir, then spawn detached.
  const serverScript = join(input.stateDir, "server-runner.mjs");
  const runnerScript = buildRunnerScript(input.stateDir, input.html);
  writeFileSync(serverScript, runnerScript, "utf-8");

  const child = spawn(process.execPath, [serverScript], {
    detached: true,
    stdio: "ignore",
    env: { ...process.env },
  });

  // Wait for the child to write the port file.
  const portFile = join(input.stateDir, "server.port");
  const pid = child.pid!;

  // Write the pid to grilling.pid.
  writeFileSync(join(input.stateDir, "grilling.pid"), `${pid}\n`, "utf-8");

  // Wait for the port file (child writes it after binding).
  const port = await waitForPortFile(portFile, 5000);
  const url = `http://127.0.0.1:${port}`;

  return { url, pid };
}

function buildRunnerScript(stateDir: string, html: string): string {
  // A standalone .mjs that serves the SPA + state API.
  // It reads/writes state.json directly (no TS imports needed).
  return `#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile, writeFile, rename } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { join } from "node:path";

const stateDir = ${JSON.stringify(stateDir)};
const html = ${JSON.stringify(html)};
const STATE_FILE = join(stateDir, "state.json");

async function loadState() {
  const raw = await readFile(STATE_FILE, "utf-8");
  return JSON.parse(raw);
}

async function saveState(state) {
  const data = JSON.stringify(state, null, 2);
  const tempPath = join(stateDir, ".state.json.tmp." + randomBytes(8).toString("hex"));
  await writeFile(tempPath, data, "utf-8");
  await rename(tempPath, STATE_FILE);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const method = req.method || "GET";
  const url = req.url || "/";

  if (method === "GET" && url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  if (method === "GET" && url === "/state") {
    try {
      const state = await loadState();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(state));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (method === "POST" && url === "/submit") {
    try {
      const body = await readBody(req);
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON body" }));
        return;
      }
      const state = await loadState();
      const newAnswers = parsed.answers || {};
      const existingAnswers = state.answers || {};
      state.answers = { ...existingAnswers, ...newAnswers };
      for (const id of Object.keys(newAnswers)) {
        const q = state.questions.find((q) => q.id === id);
        if (q) q.answered = true;
      }
      if (parsed.feedback) {
        state.summary = parsed.feedback;
      }
      state["page-state"] = "round-done";
      await saveState(state);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, "page-state": "round-done" }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(0, "127.0.0.1", () => {
  const addr = server.address();
  const port = addr.port;
  // Write the port to a file so the parent can read it.
  writeFile(join(stateDir, "server.port"), String(port), "utf-8").catch(() => {});
});

// Handle SIGHUP (refresh signal): just touch a file to acknowledge.
process.on("SIGHUP", () => {
  writeFile(join(stateDir, "refresh.flag"), String(Date.now()), "utf-8").catch(() => {});
});
`;
}

function waitForPortFile(portFile: string, timeoutMs: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const check = () => {
      if (existsSync(portFile)) {
        const port = parseInt(readFileSync(portFile, "utf-8").trim(), 10);
        if (port > 0) {
          resolve(port);
          return;
        }
      }
      if (Date.now() > deadline) {
        reject(new Error("Server failed to start: port file not written in time"));
        return;
      }
      setTimeout(check, 50);
    };
    check();
  });
}

// --- xdg-open: cross-platform browser open ---

export type Platform = "linux" | "darwin" | "win32" | string;

/**
 * Returns the browser-open binary name for the given platform.
 * linux → xdg-open, darwin → open, win32 → start.
 */
export function openBinaryForPlatform(platform: Platform): string {
  switch (platform) {
    case "darwin":
      return "open";
    case "win32":
      return "start";
    case "linux":
      return "xdg-open";
    default:
      return "xdg-open";
  }
}

/**
 * Open a URL in the default browser using the platform-appropriate binary.
 * Returns true if the spawn succeeded, false otherwise.
 * Never throws — xdg-open failure must not crash start.
 */
export function openBrowser(url: string, platform: Platform = process.platform): boolean {
  const binary = openBinaryForPlatform(platform);
  try {
    if (platform === "win32") {
 // 'start' is a cmd builtin on Windows; spawn via cmd.
      spawn("cmd", ["/c", binary, url], { detached: true, stdio: "ignore" });
    } else {
      spawn(binary, [url], { detached: true, stdio: "ignore" }).unref();
    }
    return true;
  } catch {
    return false;
  }
}
