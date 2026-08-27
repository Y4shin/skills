// Start command — creates a random temp dir, writes state.json + grilling.pid,
// writes .grilling.json key map in CWD, prints the real dir to stdout.
import { createStateDir, loadState } from "../state.js";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { writeKey } from "../key.js";

export interface StartInput {
  cwd: string;
}

export interface StartResult {
  stateDir: string;
  key: string;
}

export async function start(input: StartInput): Promise<StartResult> {
  const stateDir = createStateDir();

  // Write a placeholder grilling.pid (slice 3 replaces with real server pid).
  writeFileSync(join(stateDir, "grilling.pid"), "0\n", "utf-8");

  // Generate a random key for the .grilling.json map.
  const key = randomBytes(8).toString("hex");
  writeKey(input.cwd, key, stateDir);

  // Verify the initial state is valid (page-state=view).
  const state = loadState(stateDir);
  if (state["page-state"] !== "view") {
    throw new Error("Internal error: initial state should be 'view'");
  }

  // Print the real dir to stdout (for the human's benefit).
  process.stdout.write(stateDir + "\n");

  return { stateDir, key };
}
