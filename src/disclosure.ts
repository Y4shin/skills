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

/**
 * Tools declared in every state, independent of the open set. The tool
 * requester rides along because a phase can need a tool its own toolset does
 * not disclose, and asking for it must never depend on having it.
 */
export const ALWAYS_DECLARED = ["tw_open", "tw_next", "tw_request_tool", "tw_close"] as const;

/**
 * The closer: declared in every state too, so a session that lost track of its
 * open set gets a refusal from the tool itself ("'x' is not open") instead of
 * a bare "Tool tw_close not found" from the harness. Its body refuses with the
 * legal next call when nothing is open.
 */
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
   * Phase-specific gates name their own kind ("spec-ready", "tickets-ready",
   * "implementation"). The evaluation lives in src/pi.ts, computed from the
   * artifact tree; this field is the registry's skill-to-precondition row.
   */
  gate: "none" | "effort" | "spec-ready" | "tickets-ready" | "implementation";
}

/**
 * The gated skill manifest: the workflow skills a work repo (gate active)
 * disables, exactly as settled in the selective-repo-disable effort. The
 * prompt strip, the /skill: invocation block, and tw_open's gated restriction
 * all read this one list; there is no runtime derivation and no fallback.
 *
 * It mirrors the registry's workflow entries (every registry skill except
 * skill-creator, the authoring discipline that stays openable in gated
 * repos) plus the three workflow skills that have no registry entry because
 * they own no toolset: task-workflow-overview, task-workflow-doctor, and
 * workflow-failure. The consistency tests in tests/skills.test.ts pin the
 * manifest against package.json's pi.skills basenames and the registry, so a
 * renamed or added skill fails the suite instead of silently changing the
 * strip.
 */
export const GATED_SKILL_NAMES: readonly string[] = [
  "task-workflow-overview",
  "setup-workflow",
  "intake",
  "wayfinder",
  "to-spec",
  "to-tickets",
  "implement-ticket",
  "finalize-effort",
  "task-workflow-doctor",
  "workflow-failure",
];

/**
 * The skill registry: one table, skill to toolset plus skill to gate. It is
 * the single source of the phase toolsets and of the opener's preconditions
 * (which gate applies); the gate evaluation itself reads the artifact tree in
 * src/pi.ts through the art.ts/graph.ts seams. The toolsets below disclose
 * every registered workflow tool exactly where the workflow uses it. A skill
 * is open when every tool of its toolset is active: that is the literal
 * definition, and it lets two phases share a tool (the planning phase and the
 * front door share task creation, for instance) instead of forcing a private
 * tool per entry. `assertDerivableOpenSets` guards the containment property
 * that derivation needs.
 *
 * `tw_feedback` is the one cross-phase tool: the workflow-feedback wrapper is
 * disclosed by every phase, because friction in any phase is worth recording
 * and a phase that cannot declare it cannot report it.
 */
export const SKILL_REGISTRY: SkillEntry[] = [
  {
    name: "intake",
    takesTarget: false,
    gate: "none",
    // The front door: it surveys existing efforts for duplicates and links,
    // creates the effort (tw_create_effort: the map, with the two canonical
    // sections seeded empty), adds the one non-negotiables grilling task
    // (tw_add_task), and adds the bug ticket a bug report becomes
    // (tw_add_ticket). tw_create_effort is its signature tool.
    toolset: [
      "tw_create_effort",
      "tw_add_task",
      "tw_add_ticket",
      "tw_state",
      "tw_state_set",
      "tw_list",
      "tw_get",
      "tw_feedback",
    ],
    conflicts: ["setup-workflow", "wayfinder", "to-spec", "to-tickets", "implement-ticket", "finalize-effort"],
  },
  {
    name: "setup-workflow",
    takesTarget: false,
    gate: "none",
    // Bootstrap and migration: it reads the tree and the artifact schema and
    // runs the migration through the disclosed tool (tw_migrate, the
    // in-process executor over the found tree root). tw_context is its
    // signature tool.
    toolset: ["tw_context", "tw_migrate", "tw_get", "tw_list", "tw_feedback"],
    conflicts: ["intake", "wayfinder", "to-spec", "to-tickets", "implement-ticket", "finalize-effort"],
  },
  {
    name: "wayfinder",
    takesTarget: false,
    gate: "effort",
    // The planning phase: creates planning tasks (its Boundary names task
    // creation, and the reconcile promotes each fog line into one), works the
    // planning frontier, writes results back through the map-section writer,
    // marks planning tasks done and blocked, records deferred work in the
    // out-of-scope KB, and runs the reconcile, which sets ready_for_spec
    // through tw_finalize_map. tw_add_task is disclosed for exactly that,
    // including its blocked_by edges at creation, so a graph never needs a
    // second wiring pass; feature and bug creation stays to-tickets'.
    // tw_state_set and tw_dependency_levels are disclosed
    // because the phase sets the state pointers and layers the effort itself,
    // and tw_state because a phase that writes a pointer must be able to read
    // both back.
    // tw_show is disclosed because the overview's read-only table (which
    // cannot open anything itself: task-workflow-overview has no registry
    // entry) routes its artifact read to this phase, and the reconcile reads
    // the recorded artifacts behind it.
    toolset: [
      "tw_write_section",
      "tw_add_task",
      "tw_write_task_note",
      "tw_finalize_map",
      "tw_frontier",
      "tw_dependency_levels",
      "tw_mark_done",
      "tw_mark_blocked",
      "tw_record_out_of_scope",
      "tw_state",
      "tw_state_set",
      "tw_show",
      "tw_get",
      "tw_list",
      "tw_feedback",
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
    toolset: ["tw_write_spec", "tw_get", "tw_list", "tw_feedback"],
    conflicts: ["intake", "setup-workflow", "wayfinder", "to-tickets", "implement-ticket", "finalize-effort"],
  },
  {
    name: "to-tickets",
    takesTarget: false,
    // The ticket-graph phase consumes a published spec, so the gate is
    // tickets-ready: a live effort with a stable spec.md. Without it the
    // phase that reads the spec could open before the spec existed.
    gate: "tickets-ready",
    // The ticket-graph phase: produces the living architecture document and
    // the ticket graph from the settled spec. Creates tickets in dependency
    // order (tw_add_ticket validates blocked_by at creation), splits
    // oversized ones, verifies the dependency levels, and writes the
    // architecture through its writer. tw_write_architecture is its
    // signature tool: to-tickets-architecture rotated it here from the
    // interim tw_map_finalizable when the writer landed; tw_map_finalizable
    // stays disclosed as the graph-state read check.
    toolset: [
      "tw_write_architecture",
      "tw_add_ticket",
      "tw_split_ticket",
      "tw_dependency_levels",
      "tw_frontier",
      "tw_map_finalizable",
      "tw_get",
      "tw_list",
      "tw_feedback",
    ],
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
    // tw_write_changelog is its signature tool. tw_finalizable,
    // tw_state, and tw_state_set are disclosed because the close-out checks
    // finalizability and reads then moves the state pointer. tw_context stays
    // setup-workflow's, so the CI command is read from the repo rather than
    // through that profile.
    // tw_mark_blocked is not disclosed here: it marks planning tasks and
    // refuses tickets, so it stays in wayfinder's toolset only.
    // tw_write_ticket_note is disclosed because this phase performs the
    // landing that writes the ticket doc's implementation notes; the landing
    // worker calls it by name (a subagent reaches a gated tool through its
    // own tools allowlist, never through this opener).
    toolset: [
      "tw_frontier",
      "tw_dependency_levels",
      "tw_add_ticket",
      "tw_split_ticket",
      "tw_mark_done",
      "tw_write_changelog",
      "tw_resolve_uncertainty",
      "tw_finalizable",
      "tw_state",
      "tw_state_set",
      "tw_get",
      "tw_list",
      "tw_write_ticket_note",
      // The end-of-effort pass runs inside this phase: its architecture
      // reconcile must be recorded (the reconciler child cannot reach the
      // writer), and its advisory review needs a home in the effort tree.
      "tw_write_architecture",
      "tw_write_review",
      "tw_feedback",
    ],
    conflicts: ["intake", "setup-workflow", "wayfinder", "to-spec", "to-tickets", "finalize-effort"],
  },
  {
    name: "finalize-effort",
    takesTarget: false,
    gate: "effort",
    // The effort close: runs the holistic review and writes it through
    // tw_write_review, triages findings into tickets in the current effort or
    // an accepted follow-up, and performs the archive move. The archive
    // precondition (no undispositioned findings) lives in the archive tool,
    // not here: a refused archive still has the triage tools declared, so the
    // triage can complete inside the open phase.
    // tw_archive_effort is its signature tool; tw_write_review is the review
    // artifact's only writer. tw_create_effort is disclosed here because an
    // accepted follow-up is created inside this phase, and intake (the other
    // discloser) is mutually exclusive with it. tw_write_architecture is
    // disclosed because the close reconciles the living architecture against
    // what actually landed: no earlier reconcile can see the last landing.
    toolset: [
      "tw_archive_effort",
      "tw_finalizable",
      "tw_write_review",
      "tw_write_architecture",
      "tw_add_ticket",
      "tw_create_effort",
      "tw_get",
      "tw_list",
      "tw_feedback",
    ],
    conflicts: ["intake", "setup-workflow", "wayfinder", "to-spec", "to-tickets", "implement-ticket"],
  },
  {
    name: "skill-creator",
    takesTarget: false,
    gate: "none",
    // The skill-authoring discipline, the one tool-owning discipline: it
    // nests inside any open phase and discloses its bundled scripts wrapped
    // as registered tools (skill_validate, skill_scaffold, skill_discover in
    // src/pi.ts, each running its bundled script directly, no shell), plus
    // the tree read parked here. The signature tool the open-set derivation
    // keys on is the first of its private tools, a script tool
    // (skill_validate): tw_show is a shared artifact read, disclosed to
    // wayfinder as well, so it is not this entry's private tool.
    toolset: ["tw_show", "skill_validate", "skill_scaffold", "skill_discover", "tw_feedback"],
    conflicts: [],
  },
];

/** The registry entry for a skill name, or undefined. */
export function skillEntry(name: string): SkillEntry | undefined {
  return SKILL_REGISTRY.find((s) => s.name === name);
}

/**
 * A tool only this skill's toolset contains, or undefined when every tool it
 * declares is shared. Kept for the uniqueness claims a test makes about one
 * writer; the open-set derivation does not need it.
 */
export function privateToolOf(entry: SkillEntry, tables: readonly SkillEntry[] = SKILL_REGISTRY): string | undefined {
  return entry.toolset.find(
    (tool) => !tables.some((other) => other.name !== entry.name && other.toolset.includes(tool)),
  );
}

/**
 * The containment property the open-set derivation needs, checked once per
 * process at the first derivation.
 *
 * A skill derives as open when every tool of its toolset is active. That is
 * exact only while no toolset sits inside another skill's toolset, and no
 * toolset sits inside the union of two skills that can be open at the same
 * time (which includes the nested discipline, whose `conflicts` list is
 * empty). Either shape would make a closed skill look open, so this refuses
 * loudly rather than deriving a wrong open set.
 */
export function assertDerivableOpenSets(tables: readonly SkillEntry[] = SKILL_REGISTRY): void {
  const covers = (outer: Iterable<string>, inner: readonly string[]): boolean => {
    const set = new Set(outer);
    return inner.every((tool) => set.has(tool));
  };
  for (const skill of tables) {
    for (const other of tables) {
      if (other.name !== skill.name && covers(other.toolset, skill.toolset)) {
        throw new Error(
          `disclosure registry: '${other.name}' declares every tool of '${skill.name}', so the open-set ` +
            `derivation cannot tell them apart`,
        );
      }
    }
    for (let i = 0; i < tables.length; i++) {
      for (let k = i + 1; k < tables.length; k++) {
        const a = tables[i];
        const b = tables[k];
        if (a.name === skill.name || b.name === skill.name) continue;
        if (a.conflicts.includes(b.name) || b.conflicts.includes(a.name)) continue;
        if (covers([...a.toolset, ...b.toolset], skill.toolset)) {
          throw new Error(
            `disclosure registry: '${a.name}' and '${b.name}' can be open together, and together they declare ` +
              `every tool of '${skill.name}', so the derivation cannot tell them apart`,
          );
        }
      }
    }
  }
}

/** Memo: the containment guard runs once, at the first derivation. */
let registryChecked = false;

/**
 * The open skills implied by an active tool set. Stateless on purpose: the
 * declared set is restored from the session transcript across /tree, resume,
 * and fork, so deriving the open set from it inherits that persistence for
 * free and the two can never disagree.
 */
export function openSkillsIn(active: Iterable<string>): Set<string> {
  if (!registryChecked) {
    assertDerivableOpenSets();
    registryChecked = true;
  }
  const names = new Set(active);
  for (const tool of OPEN_CLOSE_TOOLS) names.delete(tool);
  const open = new Set<string>();
  for (const skill of SKILL_REGISTRY) {
    if (skill.toolset.every((tool) => names.has(tool))) open.add(skill.name);
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
 * The registry entries a gated (work) repo keeps openable: those whose names
 * are not in the gated manifest. Today exactly skill-creator, the authoring
 * discipline. The opener's schema and its gated refusal both read this, so
 * the offered surface and the enforced surface cannot drift.
 */
export function openableWhenGated(): SkillEntry[] {
  return SKILL_REGISTRY.filter((s) => !GATED_SKILL_NAMES.includes(s.name));
}

/**
 * The gated-name refusal's reason, in the opener's own refusal language: a
 * workflow skill does not open in a work repo, whatever its phase gate would
 * say about the tree.
 */
export function gatedReason(skill: string): string {
  return `task-workflow is gated in this work repo: '${skill}' is a workflow skill and does not open here`;
}

/**
 * The opener's parameter contract: a plain object with the skill, the effort,
 * and an optional target. It is deliberately NOT a discriminated union on
 * `skill`: a provider validates the union before the handler runs, so a
 * missing target or an unknown skill came back as a TypeBox constant mismatch
 * instead of the opener's own refusal naming the legal next call. The handler
 * validates the shape at runtime (validateOpenArgs) and the phase gate decides
 * whether a target is required, so every refusal reads.
 *
 * `gated` narrows the offered skill names to the non-gated registry entries
 * (a work repo keeps only skill-creator openable), so the model never sees a
 * hopeless value in the schema; the runtime refusal of a gated name stays the
 * belt next to these suspenders.
 */
export function buildOpenParameters(gated: boolean = false): TSchema {
  const entries = gated ? openableWhenGated() : SKILL_REGISTRY;
  const openable = entries.map((s) => s.name).join(", ");
  return Type.Object({
    skill: Type.String({ description: `The workflow skill to open: one of ${openable}` }),
    effort: Type.String({ description: "The effort the skill works in" }),
    target: Type.Optional(
      Type.String({ description: "The item the skill works on; required only by a ticket open" }),
    ),
  }) as TSchema;
}

/**
 * Runtime validation backing the parameters up, and the place the opener's
 * argument-shape refusals live: an unknown skill names the openable set, a
 * stray target names the skill that takes none. A missing target is not here:
 * the phase gate owns that refusal, because it names the phase's legal next
 * calls.
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
