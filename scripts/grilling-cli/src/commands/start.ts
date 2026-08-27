// Start command — creates a random temp dir, writes state.json + grilling.pid,
// writes .grilling.json key map in CWD, starts the detached HTTP server,
// writes the real pid, prints <url>\nopened: <bool>, and auto-opens the
// browser via xdg-open unless --no-open.
import { createStateDir } from "../state.js";
import { writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { writeKey } from "../key.js";
import { startServer, openBrowser } from "../server.js";

export interface StartInput {
  cwd: string;
  noOpen?: boolean;
  html: string;
}

export interface StartResult {
  stateDir: string;
  key: string;
  url: string;
  opened: boolean;
}

export async function start(input: StartInput): Promise<StartResult> {
  const stateDir = createStateDir();

  // Generate a random key for the .grilling.json map.
  const key = randomBytes(8).toString("hex");
  writeKey(input.cwd, key, stateDir);

  // Start the detached server (writes real pid + server.port).
  const { url, pid } = await startServer({ stateDir, html: input.html });

  // Auto-open the browser unless --no-open.
  let opened = false;
  if (!input.noOpen) {
    opened = openBrowser(url);
  }

  // Print <url>\nopened: <bool> to stdout.
  process.stdout.write(`${url}\nopened: ${opened}\n`);

  return { stateDir, key, url, opened };
}
