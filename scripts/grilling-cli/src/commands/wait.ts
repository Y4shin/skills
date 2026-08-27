// Wait command — polls state.json until page-state matches target or timeout.
// Simple poll loop (no long-polling/event loop).
// Under GRILLING_EVAL=1, returns immediately with a "hand back to user" message
// (non-interactive eval mode — the agent should not block waiting for a human).
import { loadState, type PageState } from "../state.js";

const POLL_INTERVAL_MS = 100;

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function isEvalMode(): boolean {
  return process.env.GRILLING_EVAL === "1";
}

export async function wait(
  dir: string,
  target: PageState,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<number> {
  // Eval mode: return immediately with a "hand back to user" message.
  if (isEvalMode()) {
    process.stdout.write(
      `[eval] wait returning immediately — hand back to the user (target was "${target}").\n`,
    );
    return 0;
  }

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const state = loadState(dir);
      if (state["page-state"] === target) {
        return 0;
      }
    } catch {
      // State might be mid-write (atomic rename should prevent this, but
      // be defensive). Just continue polling.
    }
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(
    `Timeout: waited ${timeoutMs}ms for page-state to reach "${target}" but it did not match.`,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { DEFAULT_TIMEOUT_MS };
