---
type: task
subtype: grilling
title: Progressive disclosure mechanics
status: stable
workflow_state: done
blocked_by:
- research-pi-tool-disclosure
- prototype-open-close-gating
---

# Progressive disclosure mechanics

## Decision to settle

The concrete disclosure design: the opener and closer surface, what stays
always declared, and how orchestrator agents and subagents behave.

## Parent decisions it depends on

`research-pi-tool-disclosure` and `prototype-open-close-gating` must have
reported before this decision is taken.

## Choices already known

- One `tw_open({ skill, effort })` dispatcher versus per-skill openers such as
  `open_wayfinder`.
- Explicit `tw_close` versus auto-close on the next `tw_open` and at skill end.
- What stays always declared: only `tw_open`, or also a read-only oracle for
  the router.
- Whether orchestrator agents open their own toolset, or rely on the chain's
  per-agent `tools:` allowlists.
- Whether `deferred` plus `tool_search` is acceptable, given that it may let a
  model bypass the skill.

## Recommended starting answer

A single `tw_open({ skill, effort })` dispatcher plus `tw_close`, with at most
one workflow toolset active at a time. Only `tw_open` is always declared. The
router gets a read-only `tw_next` oracle rather than the full query set.
Orchestrator agents open their own toolset; subagents rely on their declared
`tools:` allowlists, since activation is per-agent.

## Downstream work it may create

The whole tool layer, the first step of every workflow skill, and the router's
answer path.

## Settled decisions

### Settled input - the gate is `direct` plus `defaultActive: false`

- Confirmed with the user at the completion gate: this came from the prototype,
  which observed the gated tools absent and unsearchable before `tw_open`,
  callable after it, and absent again after `tw_close` (O1 to O3), and from the
  research (F1: `hidden` cannot be activated at all; F2: `deferred` is reachable
  through `tool_search`, which the O1 decoy demonstrated).

### Q1 - One dispatcher `tw_open`, with a type-safe per-phase parameter contract (settled)

- One dispatcher, not per-skill openers. Prototype-validated, and it does not
  pollute the declared tool set, which saves context.
- Constraint added by the user: the parameter contract is type-safe and
  phase-shaped. A Wayfinder open carries only the effort, because there is no
  target there. A planning-task or ticket open carries the effort and the
  target. No phase passes a meaningless `target`, and no phase omits one it
  needs.
- The detailed representation of that contract is Q7, asked next.

### Q2 - The declared set is a two-state machine, and the opener discloses the closer (settled)

- Cross out the earlier proposal that `tw_close` is always declared. Why close
  something that was never opened?
- Idle state, no skill running: declared = `tw_open` and `tw_next`.
- Working state, a skill is open: declared = the phase's gated tools plus
  `tw_close`. `tw_open` and `tw_next` are removed from the declared set.
- `tw_next` is hidden while working on purpose: the agent should finish or
  close the current work before looking at what comes next.
- Calling `tw_open` while a skill is open always errors, telling the agent to
  close the current skill before starting another. So `tw_open` never replaces
  the active set; it refuses.
- Skill invocations are sequential and never nested. The user confirmed there
  is no nesting.
- `tw_close` is the explicit last step of every workflow skill, and `tw_open`
  is the explicit first step.
- Consequence: one state bit, "a skill is open", switches the declared set
  between the two states. `tw_close` while idle is not declared and errors,
  and recovery from an interrupted run is simply `tw_close`, which stays declared
  throughout the working state.

### Q3 - The closer is explicit and the opener refuses while open (settled)

- `tw_close` is always the explicit last step of a skill.
- `tw_open` does not replace the active set. It refuses with "close the current
  skill first".
- No harness auto-close exists: there is no skill-end event, and
  `before_agent_start` fires on every prompt (F8).

### Q4 - The skill run opens; subagents rely on their `tools:` allowlists (settled, residual fog)

- The skill run (the orchestrator) calls the opener. Subagents never open; they
  run as separate processes and rely on their declared `tools:` allowlists, and
  activation never leaks between parent and child (F5). In-process forks inherit
  the branch's loadout and then diverge.
- The user's note: subagents are probably more complicated than this, and they
  accept trying the allowlist route first. Residual fog: whether a chain child
  ever needs a toolset of its own, and how that would be scoped.

### Q5 - Skills do not declare `allowed-tools` (settled)

- No skill declares `allowed-tools`. Activation alone is the disclosure
  mechanism, and the field is inert in this build (F7), so declaring it would
  be a claim that does nothing.
- If a human-readable toolset listing is wanted, it belongs in the skill's own
  resource, not in inert frontmatter.

## Frontier for round 2

Q6 (do delegated discipline skills open their own toolset) and Q7 (the exact
representation of the type-safe per-phase parameter contract).

### Q6 (amended) - Nested openers are supported; phases are exclusive and duplicates are refused (settled)

- The user reversed the round 1 answer that only phase skills open. Discipline
  skills may have toolsets of their own, so nested skill openers are supported.
- The open set is a set of open skills; its exact structure is Q9. The
  declared set is `tw_open`, `tw_next`, `tw_close` once at least one skill is
  open, plus the union of the open skills' toolsets.
- `tw_open` rules:
  - refuse if the same skill is already open, so there are never two instances
    of one skill;
  - refuse a phase skill while a different phase skill is open, telling the
    agent to close the current phase first, so phase skills are mutually
    exclusive and every phase transition requires a close;
  - allow nesting a discipline inside a phase, and one discipline inside
    another.
- `tw_close({ skill })` names what it closes. It closes that skill and removes
  only the tools no other open skill still needs; the other open skills stay
  open. It refuses if the named skill is not open.
- The user's reasoning: with nesting, "close the outer skill first" is wrong,
  so the close must say what it closes. What stays off the table is two
  instances of the same skill, and two phases at once.
- This amends Q2 and Q3: `tw_open` no longer refuses merely because some skill
  is open, and `tw_close` is per-skill rather than one global close. Q2's
  "idle versus working" pair becomes "empty open-set versus non-empty".

### Q7 - Use the discriminated union, verified by run (settled)

- The user accepted the discriminated union conditional on models handling a
  union-typed tool schema. Verified with a throwaway probe: a tool whose
  `parameters` are `Type.Union([...])` with two members was called correctly by
  two bounded headless runs (`pi -ne -ns -np -nc --no-session -e <ext> -p ...`).
  The ticket prompt produced `{"phase":"ticket","effort":"e1","target":"t1"}`
  and the wayfinder prompt produced `{"phase":"wayfinder","effort":"e2"}`, with
  no stray `target`. Two of two samples, so weak but positive in the spirit of
  the prototype's U4 note.
- pi accepts any `TSchema` for `parameters`
  (`ToolDefinition<TParams extends TSchema>`), so registration is not a risk.
- The probe's schema:

  ```ts
  parameters: Type.Union([
    Type.Object({ phase: Type.Literal("wayfinder"), effort: Type.String() }),
    Type.Object({ phase: Type.Literal("ticket"), effort: Type.String(), target: Type.String() }),
  ]),
  ```

- Runtime validation stays as the backstop for a provider that flattens the
  union. The probe is deleted after recording; the snippet above reproduces it.
- The discriminant's name is queued for Q9, because discipline skills may also
  open, which makes the operand a skill rather than a phase.

### Q8 - `tw_next` stays declared and answers in short prose (settled, amends Q2)

- The user reversed the round 1 decision to hide `tw_next` while a skill is
  open. `tw_next` stays declared in every state and never errors.
- Outside a skill it returns a small piece of prose describing what to do next.
- Inside a skill it returns prose saying the agent is currently inside that
  skill and should invoke `tw_next` only from outside a skill, instead of
  returning the frontier.
- Rationale: the router needs its read path at all times, and prose is friendlier
  than an error. This supersedes Q2's "current effort, ready frontier, legal
  next calls" answer shape, which was structured rather than prose.

#### Q8 amendment - the in-skill prose must not suggest abandoning the skill (settled)

- The user's concern: if the agent calls `tw_next` by accident mid-work, prose
  that says "close the current skill" could make it abandon the skill context
  and break its own run.
- So the inside-a-skill answer is "first finish what you are doing, then call me
  again", and it must not suggest closing the skill now.
- The outside-a-skill answer is unchanged: short prose about what to do next.

## Frontier for round 3

Q9 (the discriminant's name and the open-set rule) and Q10 (whether a
discipline may open with no phase under it).

### Q9 - The discriminant is `skill`, and the open set is a set closed by name (settled)

- Because disciplines may open too, the operand identifies a skill. The
  discriminant is named `skill`, which supersedes the earlier recommendation to
  name it `phase`.
- The gate classifies each skill internally as phase-owning or discipline. Two
  phase skills conflict; two disciplines do not; and no skill may be open twice.
- The open set is a set closed by name, not a strict LIFO stack, matching "you
  say which skill you are closing". Opening a nested discipline never requires
  closing the phase.
- Rejected: keeping `phase` as the name and treating a discipline as a phase
  value, which conflates two different things; a strict LIFO stack, which
  contradicts closing by name.

#### Q9 amendment - Exclusivity is a symmetric data table, not a classification (settled)

- Replace the internal phase-versus-discipline classification with a declared
  mutual-exclusivity table over every skill the opener supports: a map from
  skill to the list of skills it conflicts with, and the relation is symmetric
  (if A lists B, B lists A).
- `tw_open` refuses for two reasons only: the skill is already open (no
  duplicates), or it conflicts with a skill that is currently open.
- Rationale: the rule is data, not code. Adding a future skill is a table entry,
  and symmetry makes the conflict check order-independent.
- Consequence: the table is the single place that says which phases may not
  overlap; `grill-implement-task-split` and `grill-skill-surface` fill in the
  entries for the implementation phases and any tool-owning skill.

### Q10 - Disciplines are procedure, not tool owners, so the standalone-open case is empty (settled)

- The user's clarification: a discipline like `grilling` should not have tools
  attached to it at all. It is a procedure to follow. If a grilling session
  needs tools to manage state, the calling skill provides them and says so, for
  example "call the grilling skill and use these tools to maintain your state".
- Therefore the standalone-discipline case does not exist in the current
  inventory, and the question of what a discipline opens with is moot.
- Consequence: in practice the open set is always at most one skill, because
  only phase-owning skills open. The nested capability from Q6 still exists on
  paper; Q11 asks whether to keep it.

## Frontier for round 4

Q11 (keep the nested-open capability, or enforce one open skill at a time).

### Q11 - Keep the nested-open capability; skill-creator justifies it (settled)

- Keep nesting. The user's first instinct, that no current skill needs it, was
  wrong when checked: `skill-creator` bundles three Node scripts in
  `skills/engineering/skill-creator/scripts/` (`validate_skill.mjs`,
  `scaffold_skill.mjs`, `discover_skill.mjs`, referenced from `SKILL.md:308-327`)
  that should probably become tool calls. That makes `skill-creator` a skill
  with its own toolset, and it can be nested inside another skill. Grilling was
  a bad example: the grilling procedure owns no tools.
- `skill-review` has no scripts of its own; it only checks reference integrity,
  so it is not a second case.
- Refines Q10: a discipline owns no tools merely to manage state, but a skill
  may own tools when it has a real tooling surface. So the rule is general: any
  skill may open a toolset, and the symmetric exclusivity table (the Q9
  amendment) governs which openers may overlap.
- Consequence for `grill-skill-surface`: turning the skill-creator scripts into
  tools, and defining the toolset they disclose, is that task's work.

## Frontier empty

Q1 to Q11 are settled. No decision in this task remains open.

## Human confirmation

- The user confirmed the Q1 to Q11 summary as the shared understanding, with
  three clarifications recorded above: the `direct` plus `defaultActive: false`
  gate is confirmed as prototype- and research-derived, exclusivity becomes a
  symmetric data table (the Q9 amendment), and the in-skill `tw_next` prose must
  not suggest abandoning the skill (the Q8 amendment). The planning task is done
  on that basis.
