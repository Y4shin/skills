/**
 * Disclosure core: the open/close engine behind tw_open, tw_close, and
 * tw_next.
 *
 * Pure data and pure functions: the skill registry (toolsets, symmetric
 * exclusivity), the declared-set computation, and the open-set derivation
 * from the active tool set. All file I/O and pi wiring live in src/pi.ts.
 *
 * The declared set is two-state (idle declares the dispatcher pair; a
 * working state declares the open skills' toolsets plus the closer), the
 * open set is a set closed by name (not a stack), and exclusivity is a
 * symmetric data table, so adding a skill is a table entry.
 */

import { Type, type TSchema } from "typebox";

/** Tools declared in every state, independent of the open set. */
export const ALWAYS_DECLARED = ["tw_open", "tw_next"] as const;

/** The closer: registered gated, disclosed by the opener, never declared idle. */
export const CLOSER = "tw_close";

/** Every tool the open/close engine itself manages. */
export const OPEN_CLOSE_TOOLS = [...ALWAYS_DECLARED, CLOSER] as const;

export interface SkillEntry {
  name: string;
  /** True when the open carries a target (a ticket open); false when effort-only. */
  takesTarget: boolean;
  /** The gated tools this skill discloses when opened. */
  toolset: string[];
  /** Skills that cannot be open at the same time as this one. */
  conflicts: string[];
  /**
   * Which phase precondition the opener evaluates before activating the
   * toolset. "none": no tree precondition (the front door, setup, and nested
   * disciplines). "effort": the named effort must be a live effort.
   * Phase-specific gates name their own kind ("spec-ready",
   * "implementation"). The evaluation lives in src/pi.ts, computed from the
   * artifact tree; this field is the registry's skill-to-precondition row.
   */
  gate: "none" | "effort" | "spec-ready" | "implementation";
}

/**
 * The skill registry: one table, skill to toolset plus skill to gate. It is
 * the single source of the phase toolsets and of the opener's preconditions
 * (which gate applies); the gate evaluation itself reads the artifact tree in
 * src/pi.ts through the art.ts/graph.ts seams. The toolsets below disclose
 * every registered workflow tool exactly where the workflow uses it, and
 * every entry keeps one private signature tool, which the open-set
 * derivation requires (see signatureToolOf).
 */
export const SKILL_REGISTRY: SkillEntry[] = [
  {
    name: "intake",
    takesTarget: false,
    gate: "none",
    // The front door: it surveys existing efforts for duplicates and links,
    // creates the effort, and adds the bug ticket a bug report becomes.
    // tw_state_set is its signature tool.
    toolset: ["tw_state", "tw_state_set", "tw_list", "tw_get", "tw_add_ticket"],
    conflicts: ["setup-workflow", "wayfinder", "to-spec", "to-tickets", "implement-ticket", "finalize-effort"],
  },
  {
    name: "setup-workflow",
    takesTarget: false,
    gate: "none",
    // Bootstrap and migration: it reads the tree and the artifact schema and
    // runs the migration CLI through the shell. tw_context is its signature
    // tool.
    toolset: ["tw_context", "tw_get", "tw_list"],
    conflicts: ["intake", "wayfinder", "to-spec", "to-tickets", "implement-ticket", "finalize-effort"],
  },
  {
    name: "wayfinder",
    takesTarget: false,
    gate: "effort",
    // The planning phase: works the planning frontier, writes results back
    // through the map-section writer, marks planning tasks done and blocked,
    // records deferred work in the out-of-scope KB, and runs the reconcile,
    // which sets ready_for_spec through tw_finalize_map. tw_write_section is
    // its signature tool.
    toolset: [
      "tw_write_section",
      "tw_finalize_map",
      "tw_frontier",
      "tw_mark_done",
      "tw_mark_blocked",
      "tw_record_out_of_scope",
      "tw_get",
      "tw_list",
    ],
    conflicts: ["intake", "setup-workflow", "to-spec", "to-tickets", "implement-ticket", "finalize-effort"],
  },
  {
    name: "to-spec",
    takesTarget: false,
    // The spec phase's only gate is the flag: the producer (the Wayfinder
    // reconcile, through tw_finalize_map) owns the check, the consumer owns
    // only the flag.
    gate: "spec-ready",
    // The spec phase: synthesizes the specification from the settled record
    // and writes it through the spec writer. tw_write_spec is its signature
    // tool.
    toolset: ["tw_write_spec", "tw_get", "tw_list"],
    conflicts: ["intake", "setup-workflow", "wayfinder", "to-tickets", "implement-ticket", "finalize-effort"],
  },
  {
    name: "to-tickets",
    takesTarget: false,
    gate: "effort",
    // The ticket-graph phase: creates tickets, splits oversized ones, wires
    // and verifies the dependency levels, and reads the settled spec and map.
    // tw_map_finalizable rides as the entry's private tool (the open-set
    // derivation needs one no other entry contains) until the architecture
    // writer lands in to-tickets-architecture and becomes the natural
    // signature.
    toolset: ["tw_add_ticket", "tw_split_ticket", "tw_dependency_levels", "tw_map_finalizable", "tw_get", "tw_list"],
    conflicts: ["intake", "setup-workflow", "wayfinder", "to-spec", "implement-ticket", "finalize-effort"],
  },
  {
    name: "implement-ticket",
    takesTarget: true,
    // The implementation gate: the effort's work state (ticket generation ran,
    // work remains), the architecture document, and the target ticket's
    // readiness.
    gate: "implementation",
    // The implementation phase: owns the ticket frontier and levels, creates
    // and splits tickets, marks tickets done (after the changelog entry),
    // resolves uncertainties, and writes the per-ticket changelog entry.
    // tw_write_changelog is its signature tool.
    toolset: [
      "tw_frontier",
      "tw_dependency_levels",
      "tw_add_ticket",
      "tw_split_ticket",
      "tw_mark_done",
      "tw_mark_blocked",
      "tw_write_changelog",
      "tw_resolve_uncertainty",
      "tw_get",
      "tw_list",
    ],
    conflicts: ["intake", "setup-workflow", "wayfinder", "to-spec", "to-tickets", "finalize-effort"],
  },
  {
    name: "finalize-effort",
    takesTarget: false,
    gate: "effort",
    // The effort close: runs the holistic review, triages findings into
    // tickets in the current effort, and performs the archive move. The
    // archive precondition (no undispositioned findings) lives in the archive
    // tool, not here: a refused archive still has the triage tools declared,
    // so the triage can complete inside the open phase.
    // tw_archive_effort is its signature tool.
    toolset: ["tw_add_ticket", "tw_finalizable", "tw_archive_effort", "tw_get", "tw_list"],
    conflicts: ["intake", "setup-workflow", "wayfinder", "to-spec", "to-tickets", "implement-ticket"],
  },
  {
    name: "skill-creator",
    takesTarget: false,
    gate: "none",
    // Provisional until skill-creator-nested-toolset registers the bundled
    // scripts and replaces this entry: tw_show keeps the private signature
    // tool the open-set derivation requires.
    toolset: ["tw_show"],
    conflicts: [],
  },
];

/** The registry entry for a skill name, or undefined. */
export function skillEntry(name: string): SkillEntry | undefined {
  return SKILL_REGISTRY.find((s) => s.name === name);
}

/**
 * A tool only this skill's toolset contains. The open-set derivation keys on
 * signature tools, so a skill is open exactly when its signature tool is
 * active; that keeps the derivation exact even when toolsets share tools.
 * Every skill must have one: the first derivation over a registry that
 * breaks the rule throws and names the skill, so the gap cannot pass
 * silently.
 */
export function signatureToolOf(entry: SkillEntry): string {
  const others = new Set<string>();
  for (const skill of SKILL_REGISTRY) {
    if (skill.name === entry.name) continue;
    for (const tool of skill.toolset) others.add(tool);
  }
  const signature = entry.toolset.find((tool) => !others.has(tool));
  if (signature === undefined) {
    throw new Error(
      `disclosure registry: skill '${entry.name}' has no private tool; ` +
        `every skill's toolset needs a tool no other skill's toolset contains`,
    );
  }
  return signature;
}

/**
 * The open skills implied by an active tool set. Stateless on purpose: the
 * declared set is restored from the session transcript across /tree, resume,
 * and fork, so deriving the open set from it inherits that persistence for
 * free and the two can never disagree.
 */
export function openSkillsIn(active: Iterable<string>): Set<string> {
  const names = new Set(active);
  for (const tool of OPEN_CLOSE_TOOLS) names.delete(tool);
  const open = new Set<string>();
  for (const skill of SKILL_REGISTRY) {
    if (names.has(signatureToolOf(skill))) open.add(skill.name);
  }
  return open;
}

/** Every refusal the opener can produce names the reason the call failed. */
export function duplicateReason(skill: string): string {
  return `'${skill}' is already open`;
}

export function conflictReason(skill: string, openSkill: string): string {
  return `'${skill}' conflicts with the open skill '${openSkill}'; close it first`;
}

/**
 * The opener's parameter contract: a discriminated union on `skill`. An
 * effort-only open carries the effort; a target-carrying open (a ticket
 * open) carries the effort and the target. No phase passes a meaningless
 * target and no phase omits one it needs.
 */
export function buildOpenParameters(): TSchema {
  return Type.Union(
    SKILL_REGISTRY.map((entry) =>
      Type.Object({
        skill: Type.Literal(entry.name, { description: "The workflow skill to open" }),
        effort: Type.String({ description: "The effort the skill works in" }),
        ...(entry.takesTarget
          ? { target: Type.String({ description: "The item the skill works on" }) }
          : {}),
      }),
    ),
  );
}

/**
 * Runtime validation backing the union up, for a provider that flattens it
 * (TypeBox object schemas allow extra keys, so a flattened call can match a
 * union member it does not belong to). Throws with the precise mismatch.
 */
export function validateOpenArgs(args: { skill?: unknown; effort?: unknown; target?: unknown }): void {
  const entry = typeof args.skill === "string" ? skillEntry(args.skill) : undefined;
  if (!entry) {
    throw new Error(
      `unknown skill '${String(args.skill)}': openable skills are ${SKILL_REGISTRY.map((s) => s.name).join(", ")}`,
    );
  }
  if (typeof args.effort !== "string" || args.effort.trim() === "") {
    throw new Error(`opening '${entry.name}' requires a non-empty effort`);
  }
  // A missing target is the implementation gate's refusal (it returns the
  // reason plus the legal next calls and leaves the toolset closed), not a
  // thrown validation error; only the stray-target case is argument-shape
  // validation here.
  if (!entry.takesTarget && args.target !== undefined) {
    throw new Error(`'${entry.name}' takes no target: an open there carries only the effort`);
  }
}
