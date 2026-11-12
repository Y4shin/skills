/**
 * The spawn block: no implementation sub-agent starts off its ticket branch.
 *
 * A dispatch of an implementation agent commits on the ticket branch, so the
 * guard refuses the spawn when the checkout is anywhere else. It covers the two
 * surfaces a spawn arrives on:
 *
 * - the outer `subagent` call, where the identity is the agent name for a
 *   direct dispatch and the chain's `args` (`effort`, `ticket`) for a workflow
 *   launch, which names the ticket and not the child;
 * - the per-child `subagent_launch` call, where a workflow child's `args` never
 *   reach a handler, so the identity is a step key that embeds the slug.
 *
 * The predicate is the resolver's, not a second one: the required branch comes
 * from the profile row, and the pass-or-refuse rule is `decideFromBrief`, so a
 * spawn refusal and a phase refusal cannot disagree. What the profile gates is
 * what the guard gates: an agent row with no branch, an agent the profile does
 * not name, and a call carrying no ticket identity all pass untouched.
 */

import {
  decideFromBrief,
  phaseBrief,
  readCheckout,
  ticketBrief,
  unreadableCheckout,
  type BriefDeps,
  type GateDecision,
  type GitRun,
  type PhaseBrief,
} from "./git-profile.js";
import { isObject, text } from "./shape.js";

/**
 * The separator a workflow step key uses between the step name and the ticket
 * slug: `tdd.one`. The workflow runtime accepts only letters, digits, `.`, `_`
 * and `-` in a key, starting with a letter or digit, so a separator like `@` or
 * `:` fails the run before any child starts. A dot reads well, is legal in a
 * key, and is legal in a filename on every platform.
 */
export const KEY_SEPARATOR = ".";

/** What a spawn call says about the work it starts. */
export interface SpawnIdentity {
  /** The agent the call names; "" for a workflow launch, which names none. */
  agent: string;
  /** The effort slug the call carries; "" when it carries none. */
  effort: string;
  /** The ticket slug the call carries; "" when it carries none. */
  ticket: string;
}

/** The ticket slug a workflow step key embeds, or "" when the key embeds none. */
export function ticketFromKey(key: unknown): string {
  if (typeof key !== "string") return "";
  const at = key.lastIndexOf(KEY_SEPARATOR);
  return at < 0 ? "" : key.slice(at + 1).trim();
}

/**
 * The identity a spawn call carries, or null when the call is not a spawn at
 * all. A field the call leaves out is "", never a guess: the caller decides
 * whether an empty identity is enough to gate on.
 */
export function spawnIdentity(toolName: string, input: Record<string, unknown>): SpawnIdentity | null {
  if (toolName === "subagent") {
    const args = isObject(input.args) ? input.args : {};
    return { agent: text(input.agent), effort: text(args.effort), ticket: text(args.ticket) };
  }
  if (toolName === "subagent_launch") {
    return { agent: text(input.agent), effort: "", ticket: ticketFromKey(input.key) };
  }
  return null;
}

/** Whether one tool call is a spawn call, as opposed to any other tool. */
export function isSpawnCall(toolName: string): boolean {
  return toolName === "subagent" || toolName === "subagent_launch";
}

/** What the guard decided about one spawn. */
export interface SpawnDecision {
  /** The agent the call named; "" for a workflow launch. */
  agent: string;
  /** The branch the spawn requires, resolved from the profile. */
  branch: string;
  /** The branch the checkout is on; null when it is detached. */
  currentBranch: string | null;
  /** The profile that answered, after any fallback. */
  profile: string;
  /** Diagnostics from reading the settings and the profile. */
  diagnostics: string[];
}

/** The seams the guard reads through: settings, profiles, and the checkout. */
export interface SpawnGuardDeps extends BriefDeps {
  git?: GitRun;
}

/** What one tool call does to a spawn: block it, and why, or pass it untouched. */
export type SpawnVerdict =
  | { pass: true; diagnostics: string[] }
  | { pass: false; reason: string; decision: SpawnDecision };

/**
 * Judge one tool call.
 *
 * `{ pass: true }` covers every call the guard does not enforce: another tool,
 * an agent the profile gives no branch, and a spawn with no ticket identity to
 * resolve a branch from. A spawn the profile does gate is blocked unless the
 * checkout is on the required branch, with the refusal naming the branch the
 * checkout is on, the branch to create, and what to do next. A checkout the
 * seam cannot read is blocked the same way, naming what could not be read, so a
 * guard that cannot confirm the branch never waves the spawn through.
 */
export async function spawnVerdict(
  cwd: string,
  toolName: string,
  input: Record<string, unknown>,
  deps: SpawnGuardDeps = {},
): Promise<SpawnVerdict> {
  const identity = spawnIdentity(toolName, input);
  if (identity === null) return { pass: true, diagnostics: [] };

  // A named agent answers from its own row; a workflow launch names no agent,
  // so the profile's ticket branch answers for the ticket the launch carries.
  const brief = requiredBrief(cwd, identity, deps);
  if (brief === null || brief.branch === null) {
    return { pass: true, diagnostics: brief?.diagnostics ?? [] };
  }

  const checkout = await readCheckout(deps.git);
  if (checkout.diagnostic !== null) {
    // The checkout was never read, so the ticket branch was never confirmed:
    // the spawn is blocked, in the same shape as a wrong branch, because a
    // guard that cannot read the checkout cannot clear the condition it guards.
    const unreadable = unreadableCheckout(
      identity.agent === "" ? "the chain" : identity.agent,
      brief.branch,
      checkout.diagnostic,
    );
    const diagnostics = [...brief.diagnostics, checkout.diagnostic];
    return {
      pass: false,
      reason: `Refused: ${unreadable.reason}. Legal next: ${unreadable.recovery}, then dispatch again.`,
      decision: {
        agent: identity.agent,
        branch: brief.branch,
        currentBranch: null,
        profile: brief.profile,
        diagnostics,
      },
    };
  }

  const decision = decideFromBrief(brief, identity.agent === "" ? "the chain" : identity.agent, checkout.branch);
  if (decision.pass) return { pass: true, diagnostics: decision.diagnostics };
  return {
    pass: false,
    reason: blockReason(decision),
    decision: {
      agent: identity.agent,
      branch: decision.branch!,
      currentBranch: decision.currentBranch,
      profile: decision.profile,
      diagnostics: decision.diagnostics,
    },
  };
}

/**
 * The profile row a spawn is judged by, or null when the call carries no
 * identity a row can be resolved from. An agent the profile does not name
 * resolves an empty branch, so it passes with the rest of the ungated.
 */
function requiredBrief(cwd: string, identity: SpawnIdentity, deps: SpawnGuardDeps): PhaseBrief | null {
  if (identity.agent !== "") {
    return phaseBrief(
      cwd,
      {
        name: identity.agent,
        effort: identity.effort,
        ...(identity.ticket === "" ? {} : { ticket: identity.ticket }),
      },
      deps,
    );
  }
  if (identity.ticket !== "") {
    return ticketBrief(cwd, { name: "the chain", effort: identity.effort, ticket: identity.ticket }, deps);
  }
  return null;
}

/**
 * The reason a blocked spawn carries: the openers' refusal shape, so a model
 * that hits it performs the step and dispatches again instead of improvising.
 * The base comes from the same resolution the step text uses, so the branch it
 * names to create is the branch the phase creates.
 */
function blockReason(decision: GateDecision): string {
  const create =
    decision.base === null
      ? `create and check out ${decision.branch}`
      : `create and check out ${decision.branch} off ${decision.base}`;
  return `Refused: ${decision.reason}. Legal next: ${create}, then dispatch again.`;
}
