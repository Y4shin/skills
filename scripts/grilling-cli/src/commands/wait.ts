// Wait command — polls state.json until page-state matches target or timeout.
// Simple poll loop (no long-polling/event loop).
import { loadState, type PageState } from "../state.js";

const POLL_INTERVAL_MS = 100;

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export async function wait(
  dir: string,
  target: PageState,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<number> {
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
