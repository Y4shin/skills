/**
 * Git profiles and the phase-brief resolver.
 *
 * A profile is data: a JSON file in `src/profiles/` carrying, per phase, an
 * optional branch template, optional opening and closing instructions, and an
 * optional closing branch gate, plus the merge flag and the push policy; and,
 * per implementation sub-agent, a branch template. The placeholder vocabulary
 * is `{effort}` and `{ticket}`. The trunk is a literal name, so it needs none.
 *
 * This module is the one resolver: it reads the `taskWorkflow.git` settings,
 * loads the selected profile, resolves the templates for one effort and
 * ticket, and answers both questions the workflow asks of it. `phaseBrief`
 * says what a phase needs before it opens; `gateDecision` says whether a
 * checkout may proceed. They share the branch resolution, so the brief and the
 * refusal cannot drift.
 *
 * No profile name appears in a branch of code: the two bundled profiles are
 * selected by a settings key, and a missing file, an unknown name, or a
 * malformed profile is a diagnostic that falls back to `default`.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { readGitSettings, trunkName, type GitSettings, type ReadGateConfigDeps, type TrunkMergeMode } from "./repo-gate.js";

/** The profiles the package ships, selected by `taskWorkflow.git.profile`. */
export const BUNDLED_PROFILES = ["default", "flat"] as const;

/** The profile every failed read falls back to. */
export const FALLBACK_PROFILE = "default";

/** A profile name is a plain name: no separators, so no name resolves as a path. */
const PROFILE_NAME = /^[a-z0-9][a-z0-9-]*$/;

/** One phase's row: every field optional, so an empty row means "nothing required". */
export interface PhaseProfile {
  /** Branch template; absent means the phase requires no branch. */
  branch?: string;
  /** Text delivered when the phase opens. */
  openInstructions?: string;
  /** Text delivered when the phase closes. */
  closeInstructions?: string;
  /** Branch template the phase's close gates on; absent means no closing gate. */
  closeGate?: string;
}

/** One implementation sub-agent's row: a branch template and nothing else. */
export interface AgentProfile {
  branch?: string;
}

/** A loaded profile: the data the resolver answers from. */
export interface GitProfile {
  name: string;
  /** The merge flag the effort close uses; absent means the profile merges nothing locally. */
  merge?: string;
  /** The push policy the effort close follows; absent means the profile pushes nothing. */
  push?: string;
  phases: Record<string, PhaseProfile>;
  agents: Record<string, AgentProfile>;
}

/**
 * The answer when no profile file can be read at all: every field empty, so
 * every phase and every agent resolves unguarded. It is only ever reached with
 * a diagnostic, never silently.
 */
export const EMPTY_PROFILE: GitProfile = { name: "none", phases: {}, agents: {} };

/** The directory the package's own profiles live in. */
export function bundledProfilesDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "profiles");
}

/** The seams the profile loader reads through, both replaceable by tests. */
export interface ProfileDeps {
  /** The directory profiles are read from; the package's own by default. */
  profilesDir?: string;
  readFileSync?: (path: string, encoding: "utf-8") => string;
}

/** A loaded profile plus what reading it had to report. */
export interface LoadedProfile {
  profile: GitProfile;
  diagnostics: string[];
}

/**
 * Load one profile by name, never throwing.
 *
 * An unknown name, a missing file, malformed JSON, or a shape the schema does
 * not allow is a diagnostic that falls back to `default`. When `default`
 * itself cannot be read, the empty profile answers with a diagnostic, so a
 * broken install degrades to "nothing required" instead of a crash.
 */
export function loadProfile(name: string, deps: ProfileDeps = {}): LoadedProfile {
  const dir = deps.profilesDir ?? bundledProfilesDir();
  const diagnostics: string[] = [];
  const clean = typeof name === "string" ? name.trim() : "";
  if (!PROFILE_NAME.test(clean)) {
    diagnostics.push(
      `unknown git profile '${String(name)}': a profile name is lowercase letters, digits, and dashes; ` +
        `using '${FALLBACK_PROFILE}'`,
    );
    return fallbackProfile(dir, deps, diagnostics);
  }
  const profile = readProfile(clean, dir, deps, diagnostics);
  if (profile !== null) return { profile, diagnostics };
  return fallbackProfile(dir, deps, diagnostics);
}

/** Load `default` after a failed read, or the empty profile when that fails too. */
function fallbackProfile(dir: string, deps: ProfileDeps, diagnostics: string[]): LoadedProfile {
  const profile = readProfile(FALLBACK_PROFILE, dir, deps, diagnostics);
  if (profile !== null) return { profile, diagnostics };
  diagnostics.push(`no git profile could be read from ${dir}; every phase and agent resolves unguarded`);
  return { profile: EMPTY_PROFILE, diagnostics };
}

/** Read and normalize one profile file, or null when it cannot be used. */
function readProfile(
  name: string,
  dir: string,
  deps: ProfileDeps,
  diagnostics: string[],
): GitProfile | null {
  const read = deps.readFileSync ?? readFileSync;
  const path = join(dir, `${name}.json`);
  let text: string;
  try {
    text = read(path, "utf-8");
  } catch (e) {
    diagnostics.push(`git profile '${name}' is not installed at ${path}: ${(e as Error).message}`);
    return null;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    diagnostics.push(`git profile '${name}' at ${path} is not valid JSON: ${(e as Error).message}`);
    return null;
  }
  return normalizeProfile(name, raw, diagnostics);
}

/**
 * Validate a parsed profile against the schema. Any violation is a diagnostic
 * and makes the profile unusable, so the caller falls back to `default`: a
 * profile whose shape is wrong must never resolve as "nothing required",
 * because that would quietly switch every gate off.
 */
function normalizeProfile(name: string, raw: unknown, diagnostics: string[]): GitProfile | null {
  if (!isObject(raw)) {
    diagnostics.push(`git profile '${name}' is not a JSON object; falling back to '${FALLBACK_PROFILE}'`);
    return null;
  }
  const before = diagnostics.length;
  const phases: Record<string, PhaseProfile> = {};
  for (const [phase, entry] of Object.entries(entriesOf(raw.phases, "phases", name, diagnostics))) {
    phases[phase] = {
      branch: stringField(entry, "branch", `phases.${phase}`, name, diagnostics),
      openInstructions: stringField(entry, "openInstructions", `phases.${phase}`, name, diagnostics),
      closeInstructions: stringField(entry, "closeInstructions", `phases.${phase}`, name, diagnostics),
      closeGate: stringField(entry, "closeGate", `phases.${phase}`, name, diagnostics),
    };
  }
  const agents: Record<string, AgentProfile> = {};
  for (const [agent, entry] of Object.entries(entriesOf(raw.agents, "agents", name, diagnostics))) {
    agents[agent] = { branch: stringField(entry, "branch", `agents.${agent}`, name, diagnostics) };
  }
  const profile: GitProfile = {
    name: stringField(raw, "name", "", name, diagnostics) ?? name,
    merge: stringField(raw, "merge", "", name, diagnostics),
    push: stringField(raw, "push", "", name, diagnostics),
    phases,
    agents,
  };
  if (diagnostics.length > before) {
    diagnostics.push(`git profile '${name}' does not match the schema; falling back to '${FALLBACK_PROFILE}'`);
    return null;
  }
  return profile;
}

/** One profile block's object entries, with a diagnostic for anything else. */
function entriesOf(
  raw: unknown,
  key: string,
  name: string,
  diagnostics: string[],
): Record<string, Record<string, unknown>> {
  if (raw === undefined) return {};
  if (!isObject(raw)) {
    diagnostics.push(`git profile '${name}': '${key}' is not an object, ignored`);
    return {};
  }
  const out: Record<string, Record<string, unknown>> = {};
  for (const [entryName, entry] of Object.entries(raw)) {
    if (!isObject(entry)) {
      diagnostics.push(`git profile '${name}': '${key}.${entryName}' is not an object, ignored`);
      continue;
    }
    out[entryName] = entry;
  }
  return out;
}

/** One string field of a profile object, or undefined with a diagnostic. */
function stringField(
  source: Record<string, unknown>,
  key: string,
  where: string,
  name: string,
  diagnostics: string[],
): string | undefined {
  const value = source[key];
  if (value === undefined) return undefined;
  if (typeof value === "string") return value;
  diagnostics.push(`git profile '${name}': '${where === "" ? key : `${where}.${key}`}' is not a string, ignored`);
  return undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ─── The resolver ───────────────────────────────────────────────────────────

/** What a brief or a gate decision is asked about. */
export interface BriefRequest {
  /** The phase (a workflow skill name) or the implementation sub-agent. */
  name: string;
  /** The effort the phase works in, resolved into `{effort}`. */
  effort: string;
  /** The ticket slug, resolved into `{ticket}`; only a ticket-shaped row needs one. */
  ticket?: string;
}

/** The seams a brief reads through: settings paths and the profile directory. */
export interface BriefDeps extends ReadGateConfigDeps, ProfileDeps {}

/** What a phase (or agent) needs before it acts. */
export interface PhaseBrief {
  /** The profile that answered, after any fallback. */
  profile: string;
  /** Whether the name is a profile phase, a profile agent, or neither. */
  kind: "phase" | "agent" | "unknown";
  /** The required branch, resolved; null when the profile names none. */
  branch: string | null;
  /** The step that produces the branch, generated from the template; null when there is none. */
  step: string | null;
  /**
   * What the required branch is created off: the trunk for an effort-level
   * template, the effort branch for a ticket-level one. Null when the profile
   * requires no branch. It is resolved beside `step`, so the step and a
   * spawn refusal cannot disagree about the base.
   */
  base: string | null;
  /** The phase's opening instruction text; "" when the profile carries none. */
  openInstructions: string;
  /** The phase's closing instruction text; "" when the profile carries none. */
  closeInstructions: string;
  /** The branch the phase's close gates on, resolved; null when there is none. */
  closeGate: string | null;
  /** The profile's merge flag, or null. */
  merge: string | null;
  /** The profile's push policy, or null. */
  push: string | null;
  /** The trunk the effort close merges into, resolved from the settings. */
  trunk: string;
  /** Whether the effort close merges locally or hands off to a pull request. */
  trunkMerge: TrunkMergeMode;
  /** Diagnostics from reading the settings and the profile. */
  diagnostics: string[];
}

/**
 * Resolve one phase's (or agent's) brief for one effort.
 *
 * The brief is the required branch, the step that creates it, and the phase's
 * instruction text, all read from the selected profile. A phase the profile
 * does not mention, or a profile that carries no branch for it, resolves
 * nothing: `branch` and `step` are null and the phase simply opens.
 */
export function phaseBrief(cwd: string, request: BriefRequest, deps: BriefDeps = {}): PhaseBrief {
  const diagnostics: string[] = [];
  const settings = readGitSettings(cwd, deps);
  diagnostics.push(...settings.diagnostics);
  const loaded = loadProfile(settings.profile, deps);
  diagnostics.push(...loaded.diagnostics);
  const profile = loaded.profile;

  const phase = profile.phases[request.name];
  const agent = phase === undefined ? profile.agents[request.name] : undefined;
  const row = phase ?? agent;
  const kind: PhaseBrief["kind"] = phase !== undefined ? "phase" : agent !== undefined ? "agent" : "unknown";
  const branch = resolveTemplate(row?.branch, request, diagnostics);
  const base = branch === null ? null : branchBase(row!.branch!, request, settings, profile);
  // The step names who performs it. A phase creates its own branch and then
  // opens; an agent's row carries the step the phase performs before it
  // dispatches that agent, because the agent itself expects the branch to be
  // checked out already.
  const step = branch === null ? null : branchStep(branch, base, kind, request.name);

  return {
    profile: profile.name,
    kind,
    branch,
    step,
    base,
    openInstructions: phase?.openInstructions ?? "",
    closeInstructions: phase?.closeInstructions ?? "",
    closeGate: phase === undefined ? null : resolveTemplate(phase.closeGate, request, diagnostics),
    merge: profile.merge ?? null,
    push: profile.push ?? null,
    trunk: trunkName(settings.trunk),
    trunkMerge: settings.trunkMerge,
    diagnostics,
  };
}

/**
 * What produces a required branch, phrased for the caller that performs it: a
 * phase creates its branch and then opens, while a sub-agent's branch is
 * created by the phase that dispatches it.
 */
function branchStep(branch: string, base: string | null, kind: PhaseBrief["kind"], name: string): string {
  const create = base === null ? `create and check out ${branch}` : `create and check out ${branch} off ${base}`;
  return kind === "agent" ? `${create}, then dispatch ${name}` : `${create}, then open ${name}`;
}

/**
 * What a required branch is created off: a template naming the ticket sits on
 * top of the effort level, so its base is the effort branch the profile also
 * carries; an effort-level template sits on the trunk.
 */
function branchBase(
  template: string,
  request: BriefRequest,
  settings: GitSettings,
  profile: GitProfile,
): string {
  return isTicketTemplate(template)
    ? effortBranchOf(profile, request) ?? "the effort branch"
    : `the trunk (${trunkName(settings.trunk)})`;
}

/** True when a template names the ticket level rather than the effort level. */
function isTicketTemplate(template: string): boolean {
  return template.includes("{ticket}") && !template.includes("{effort}");
}

/**
 * The profile's own effort-branch template, resolved, when it carries one. A
 * caller that has no effort slug (a workflow child's launch carries only the
 * ticket) resolves nothing, so the base reads as "the effort branch" instead
 * of a branch named `effort/`.
 */
function effortBranchOf(profile: GitProfile, request: BriefRequest): string | null {
  if (request.effort.trim() === "") return null;
  const template = Object.values(profile.phases).find(
    (row) => row.branch !== undefined && row.branch.includes("{effort}") && !isTicketTemplate(row.branch),
  )?.branch;
  return template === undefined ? null : resolveTemplate(template, { ...request, ticket: "" }, []);
}

/**
 * Resolve one branch template for this effort and ticket. A template that
 * needs a ticket the caller did not give resolves nothing, with a diagnostic:
 * a literal `{ticket}` never reaches a branch name.
 */
function resolveTemplate(
  template: string | undefined,
  request: BriefRequest,
  diagnostics: string[],
): string | null {
  if (template === undefined || template.trim() === "") return null;
  const ticket = request.ticket?.trim() ?? "";
  if (template.includes("{ticket}") && ticket === "") {
    diagnostics.push(
      `the git profile's branch template '${template}' needs a ticket slug, and none was given for '${request.name}'`,
    );
    return null;
  }
  return template.replaceAll("{effort}", request.effort.trim()).replaceAll("{ticket}", ticket);
}

/**
 * The brief for a ticket's own work, without a named agent.
 *
 * A workflow launch names the ticket and not the child that will run, so the
 * guard cannot ask an agent's row: it asks the profile for the branch its
 * ticket-scoped rows require. The first agent row carrying a ticket template
 * answers, because a ticket's work happens on one branch; the answer rides the
 * `PhaseBrief` shape so the guard's predicate is one function, not two.
 */
export function ticketBrief(cwd: string, request: BriefRequest, deps: BriefDeps = {}): PhaseBrief {
  const diagnostics: string[] = [];
  const settings = readGitSettings(cwd, deps);
  diagnostics.push(...settings.diagnostics);
  const loaded = loadProfile(settings.profile, deps);
  diagnostics.push(...loaded.diagnostics);
  const profile = loaded.profile;
  const template = Object.values(profile.agents).find((row) => row.branch?.includes("{ticket}"))?.branch;
  const branch = resolveTemplate(template, request, diagnostics);
  const base = branch === null ? null : branchBase(template!, request, settings, profile);
  return {
    profile: profile.name,
    kind: "agent",
    branch,
    // A sub-agent never creates its own branch: the phase it is dispatched
    // from already checked it out, so the step names that phase's action.
    step: branch === null ? null : branchStep(branch, base, "agent", request.name),
    base,
    openInstructions: "",
    closeInstructions: "",
    closeGate: null,
    merge: profile.merge ?? null,
    push: profile.push ?? null,
    trunk: trunkName(settings.trunk),
    trunkMerge: settings.trunkMerge,
    diagnostics,
  };
}

/** The checkout a gate decision is asked about. */
export interface GateRequest extends BriefRequest {
  /** The branch checked out now, or null when the checkout is detached or unknown. */
  currentBranch: string | null;
}

/** Whether a checkout may proceed, and the refusal that says what to do when it may not. */
export interface GateDecision {
  pass: boolean;
  /** The profile that answered, after any fallback. */
  profile: string;
  /** The required branch, resolved; null when the profile gates nothing here. */
  branch: string | null;
  /** The branch the checkout is on, as given. */
  currentBranch: string | null;
  /** The step that produces the required branch, for the refusal's legal next call. */
  step: string | null;
  /** What the required branch is created off; null when the profile gates nothing here. */
  base: string | null;
  /** Why the checkout is refused; "" when it passes. */
  reason: string;
  /** Diagnostics from reading the settings and the profile. */
  diagnostics: string[];
}

/**
 * Decide whether this checkout may proceed for the named phase or agent.
 *
 * A profile that requires no branch always passes. Otherwise the checkout must
 * be on the resolved branch; anything else is a refusal naming the branch the
 * checkout is on and the branch to create, so the caller can perform the step
 * and retry. Nothing is latched.
 */
export function gateDecision(cwd: string, request: GateRequest, deps: BriefDeps = {}): GateDecision {
  return decideFromBrief(phaseBrief(cwd, request, deps), request.name, request.currentBranch);
}

/**
 * The decision half of `gateDecision`, over an already-resolved brief: the
 * opener resolves one brief and asks two questions of it (what did the profile
 * carry, may this checkout proceed), so neither question re-reads the settings.
 *
 * The same rule as `gateDecision`: no required branch passes, the required
 * branch passes, anything else is a refusal naming both branches. Nothing is
 * latched.
 */
export function decideFromBrief(
  brief: PhaseBrief,
  name: string,
  currentBranch: string | null,
): GateDecision {
  const current = currentBranch?.trim() ? currentBranch.trim() : null;
  const shared = {
    profile: brief.profile,
    branch: brief.branch,
    currentBranch: current,
    step: brief.step,
    base: brief.base,
    diagnostics: brief.diagnostics,
  };
  if (brief.branch === null || current === brief.branch) {
    return { pass: true, reason: "", ...shared };
  }
  return {
    pass: false,
    reason:
      `the checkout is on ${current === null ? "no branch (a detached HEAD)" : `'${current}'`}, ` +
      `but '${name}' requires '${brief.branch}'`,
    ...shared,
  };
}

// ─── The git seam, and the text an open or close reports ─────────────────────

/**
 * Run one git command against the session directory and return its stdout.
 * The tool context supplies it, so the gates and their tests never need a
 * repository: a fake answers the one read below.
 */
export type GitRun = (args: string[]) => Promise<string>;

/** What reading the checkout produced, and what it could not read. */
export interface CheckoutRead {
  /** The branch checked out now; null when the checkout is detached or unknown. */
  branch: string | null;
  /** Why the checkout could not be read; null on a successful read. */
  diagnostic: string | null;
}

/** The command the branch gate reads the checkout with. */
const CHECKOUT_COMMAND = ["rev-parse", "--abbrev-ref", "HEAD"];

/**
 * Read the checked-out branch through the git seam.
 *
 * A detached checkout answers `HEAD`, which reads as no branch. A seam that is
 * absent or cannot run reports a diagnostic instead of a branch: the gate must
 * not refuse on a checkout it never saw, so the caller passes the open through
 * and says in its result that the gate did not run.
 */
export async function readCheckout(git: GitRun | undefined): Promise<CheckoutRead> {
  if (git === undefined) {
    return {
      branch: null,
      diagnostic: `the session offered no git seam, so the branch gate did not run (${CHECKOUT_COMMAND.join(" ")})`,
    };
  }
  try {
    const out = (await git([...CHECKOUT_COMMAND])).trim();
    return { branch: out === "" || out === "HEAD" ? null : out, diagnostic: null };
  } catch (e) {
    return {
      branch: null,
      diagnostic:
        `the checkout could not be read (git ${CHECKOUT_COMMAND.join(" ")} failed: ${(e as Error).message}), ` +
        `so the branch gate did not run`,
    };
  }
}

/** The instruction text a profile carries for one phase, and the profile that answered. */
export interface PhaseText {
  /** The profile that answered, after any fallback. */
  profile: string;
  /** The text delivered when the phase opens; "" when the profile carries none. */
  open: string;
  /** The text delivered when the phase closes; "" when the profile carries none. */
  close: string;
  /** Diagnostics from reading the settings and the profile. */
  diagnostics: string[];
}

/**
 * The instruction text for one phase, resolved without a checkout: a close
 * knows the phase it closes and the effort it closes, but reading the checkout
 * is the open's job, so this answers from the profile alone.
 */
export function phaseText(cwd: string, name: string, deps: BriefDeps = {}): PhaseText {
  const diagnostics: string[] = [];
  const settings = readGitSettings(cwd, deps);
  diagnostics.push(...settings.diagnostics);
  const loaded = loadProfile(settings.profile, deps);
  diagnostics.push(...loaded.diagnostics);
  const phase = loaded.profile.phases[name];
  return {
    profile: loaded.profile.name,
    open: phase?.openInstructions ?? "",
    close: phase?.closeInstructions ?? "",
    diagnostics,
  };
}
