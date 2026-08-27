// Refresh command — stub (no server yet). Validates the state dir and exits.
// Slice 3 makes this signal the real server via the .pid.
import { loadState } from "../state.js";
import { existsSync } from "node:fs";
import { join } from "node:path";

export async function refresh(dir: string): Promise<void> {
  // Validate the state dir exists and has valid state.
  if (!existsSync(join(dir, "state.json"))) {
    throw new Error(`Invalid state dir: no state.json found in ${dir}`);
  }
  // Loading validates the JSON schema.
  loadState(dir);
  // No server to signal in this slice — stub.
}
