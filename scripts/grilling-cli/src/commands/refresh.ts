// Refresh command — signals the server to re-render / re-read the current JSON.
// Writes a refresh.flag file (timestamp) that the server/SPA can observe, and
// sends SIGHUP to the server process (if a real pid exists in grilling.pid).
import { loadState } from "../state.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { kill } from "node:os";

export async function refresh(dir: string): Promise<void> {
  // Validate the state dir exists and has valid state.
  if (!existsSync(join(dir, "state.json"))) {
    throw new Error(`Invalid state dir: no state.json found in ${dir}`);
  }
  // Loading validates the JSON schema.
  loadState(dir);

  // Write a refresh flag file (timestamp) as the signal artifact.
  writeFileSync(join(dir, "refresh.flag"), String(Date.now()), "utf-8");

  // If a real server pid exists, send SIGHUP to trigger re-read.
  const pidFile = join(dir, "grilling.pid");
  if (existsSync(pidFile)) {
    const pidStr = readFileSync(pidFile, "utf-8").trim();
    const pid = parseInt(pidStr, 10);
    if (pid > 0) {
      try {
        kill(pid, "SIGHUP");
      } catch {
        // Process may be dead or not ours — ignore.
      }
    }
  }
}
