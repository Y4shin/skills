// Transitions module — the 7-state machine with enforced transitions.
// Allowed: view→in-round→round-done→{in-round|final-review→{accepted→done|rejected→in-round}}
import type { PageState } from "./state.js";

export { PAGE_STATES } from "./state.js";

const ALLOWED: ReadonlySet<string> = new Set([
  "view→in-round",
  "in-round→round-done",
  "round-done→in-round",
  "round-done→final-review",
  "final-review→accepted",
  "final-review→rejected",
  "accepted→done",
  "rejected→in-round",
]);

export function canTransition(from: PageState, to: PageState): boolean {
  return ALLOWED.has(`${from}→${to}`);
}

export function assertTransition(from: PageState, to: PageState): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid transition: ${from} → ${to} is not allowed. ` +
        `Allowed transitions from ${from}: ` +
        getTransitionsFrom(from).join(", "),
    );
  }
}

function getTransitionsFrom(from: PageState): string[] {
  return [...ALLOWED]
    .filter((t) => t.startsWith(`${from}→`))
    .map((t) => t.split("→")[1]);
}
