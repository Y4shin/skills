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
}

/**
 * The skill registry.
 *
 * The toolsets are provisional: opener-gate-and-toolsets owns the real
 * per-skill table (and skill-creator-nested-toolset the real skill-creator
 * toolset). The provisional entries keep every existing workflow tool
 * reachable and give each skill a private tool, which the open-set
 * derivation requires to stay exact (see signatureToolOf).
 */
export const SKILL_REGISTRY: SkillEntry[] = [
  {
    name: "intake",
    takesTarget: false,
    toolset: ["tw_state", "tw_state_set"],
    conflicts: ["setup-workflow", "wayfinder", "to-spec", "to-tickets", "implement-ticket", "finalize-effort"],
  },
  {
    name: "setup-workflow",
    takesTarget: false,
    toolset: ["tw_context", "tw_get", "tw_list"],
    conflicts: ["intake", "wayfinder", "to-spec", "to-tickets", "implement-ticket", "finalize-effort"],
  },
  {
    name: "wayfinder",
    takesTarget: false,
    toolset: ["tw_list", "tw_frontier", "tw_dependency_levels", "tw_get"],
    conflicts: ["intake", "setup-workflow", "to-spec", "to-tickets", "implement-ticket", "finalize-effort"],
  },
  {
    name: "to-spec",
    takesTarget: false,
    // tw_set's replacement, swapped in the same commit that removed tw_set:
    // without a private tool here the first open-set derivation throws (see
    // signatureToolOf). Provisional; opener-gate-and-toolsets replaces the
    // whole table.
    toolset: ["tw_get", "tw_list", "tw_write_section", "tw_finalize_map"],
    conflicts: ["intake", "setup-workflow", "wayfinder", "to-tickets", "implement-ticket", "finalize-effort"],
  },
  {
    name: "to-tickets",
    takesTarget: false,
    toolset: ["tw_get", "tw_list", "tw_map_finalizable"],
    conflicts: ["intake", "setup-workflow", "wayfinder", "to-spec", "implement-ticket", "finalize-effort"],
  },
  {
    name: "implement-ticket",
    takesTarget: true,
    toolset: ["tw_get", "tw_list", "tw_resolve_uncertainty"],
    conflicts: ["intake", "setup-workflow", "wayfinder", "to-spec", "to-tickets", "finalize-effort"],
  },
  {
    name: "finalize-effort",
    takesTarget: false,
    toolset: ["tw_get", "tw_list", "tw_finalizable"],
    conflicts: ["intake", "setup-workflow", "wayfinder", "to-spec", "to-tickets", "implement-ticket"],
  },
  {
    name: "skill-creator",
    takesTarget: false,
    // Provisional: skill-creator-nested-toolset replaces this with the
    // toolset built from the bundled scripts.
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
  if (entry.takesTarget && (typeof args.target !== "string" || args.target.trim() === "")) {
    throw new Error(`opening '${entry.name}' requires a non-empty target`);
  }
  if (!entry.takesTarget && args.target !== undefined) {
    throw new Error(`'${entry.name}' takes no target: an open there carries only the effort`);
  }
}
