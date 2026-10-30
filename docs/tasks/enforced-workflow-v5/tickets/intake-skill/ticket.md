---
type: ticket
subtype: feature
title: intake, the single front door
status: stable
workflow_state: ready
blocked_by: [planning-transition-tools, implementation-transition-tools, disclosure-open-close-core, opener-gate-and-toolsets]
size: l
---

## What to build

The `intake` skill, for both the phase and the skill, replacing `triage`. It
is user-invoked, because starting an effort is a deliberate human act and it
is where the raw request and the stories enter.

Intake always creates an effort: a map plus at least one planning task, the
non-negotiables grilling task that determines the effort's non-goals and its
non-negotiable facts (including the effort-level success test). It seeds
`## Non-goals` and `## Non-negotiable facts` as empty placeholders so a later
gate refusal names missing content rather than a missing section.

Intake's round is its own short round, not a grilling:

- bounded sanity checks: active and archived efforts for a duplicate or
  fold-in target, related efforts for links, feature versus bug
  classification, and a time-boxed reach into the code;
- it records the raw request verbatim, a one-line destination, the actor, the
  classification, three to five stories (or, for a bug, steps, expected versus
  actual, and impact), and optional constraints;
- "don't know" is a valid constraint answer.

Every bug report becomes an effort: the defect is a `subtype: bug`
implementation ticket inside it. Intake decides no simple-versus-full split;
non-goals and the success test belong to Wayfinder.

`triage` is retired: its content moves to `skills/deprecated/triage/` with a
note naming `intake`, and it leaves `package.json` `pi.skills`, the bucket
README, and the docs page tree.

## Acceptance criteria

- [ ] `intake` exists as a user-invoked skill and opens through `tw_open`.
- [ ] One intake run creates an effort with a map and exactly one
      non-negotiables grilling task, through the named transition tools.
- [ ] The recorded facts are the raw request, destination, actor,
      classification, three to five stories (or the bug fields), and optional
      constraints.
- [ ] The duplicate and link checks are bounded and time-boxed.
- [ ] A bug request creates a `subtype: bug` implementation ticket inside the
      effort.
- [ ] `triage` is retired to `skills/deprecated/` with its replacement named
      and is absent from `pi.skills`.
- [ ] `tests/skills.test.ts` and `tests/skill-rewire.test.ts` are green.

## Blocked by

- planning-transition-tools (the map and the grilling task are written through
  the section writer and the ticket/task creators).
- implementation-transition-tools (a bug intake creates an implementation
  ticket through `tw_add_ticket`).
- disclosure-open-close-core (the skill opens through `tw_open`).
- opener-gate-and-toolsets (the intake gate and toolset).

## Implementation notes

- Landed on `ticket/intake-skill` (4 wip commits on top of 5c20a70); full
  suite 1087 green, typecheck clean.
- Two creation tools landed as part of this ticket (the carried constraint
  names this ticket as their owner, keeping one private signature tool per
  registry entry):
  - `tw_create_effort`: the named effort/map creation tool. Writes the map
    through the frontmatter seam, seeds `## Non-goals` and
    `## Non-negotiable facts` as empty placeholders, registers the effort in
    the root index's `## Live` list (sorted; creating `docs/tasks/index.md`
    when the tree has none), and refuses an unsafe slug, an existing live
    effort, and a stray directory under `docs/tasks/` that holds no map.
    It is intake's private signature tool in `SKILL_REGISTRY` (rotated from
    the interim `tw_state_set`).
  - `tw_add_task`: the named planning-task creator (the counterpart of
    `tw_add_ticket`). Writes type: task with a planning subtype,
    status: stable, workflow_state: ready, and an empty `blocked_by` (a
    task is created before its edges are known). Refuses an unsafe or
    duplicate slug (a slug that collides with any artifact of the effort,
    including tickets), a subtype outside the planning set, an invalid
    mode, and an effort with no map. It is disclosed to intake only; ticket
    10 (`wayfinder-reconcile-and-passes`) has landed without it, so wayfinder's
    task-creation prose still describes by-hand creation that the write
    guard now blocks - the registry toolset for wayfinder gains
    `tw_add_task` only when its prose moves to the tool (coherence-pass
    input, not a contract change here).
- The registry toolset for intake is now `tw_create_effort`, `tw_add_task`,
  `tw_add_ticket`, `tw_state`, `tw_state_set`, `tw_list`, `tw_get`.
  `tests/opener-gate.test.ts`'s toolset pin was updated accordingly; that
  pin table is the ticket-owned table the arch spec's entry-15 landed note
  assigns to this ticket.
- Intake prose: bounded sanity checks (duplicate/fold-in over active and
  archived efforts, link check, feature-versus-bug classification, and a
  time-boxed code reach), the intake facts (raw request verbatim,
  one-line destination, actor, classification, three to five stories or
  the bug reproduction fields, optional constraints with "don't know" as a
  valid answer), the named-tools creation order, the no-rejection door,
  and the Wayfinder hand-off. No opener precondition restated, no literal
  `ready_for_spec` token.
- `triage` retired to `skills/deprecated/triage/` as a compatibility
  redirect naming `intake`; its reference docs (AGENT-BRIEF, OUT-OF-SCOPE)
  and its report resource were not carried over. Absent from `pi.skills`,
  the bucket README, and the docs page tree (`docs/engineering/triage.md`
  deleted; `docs/engineering/intake.md` added with the four sections).
- `task-workflow-overview` re-synced per the standing rule (a user-reachable
  skill was added and another retired): the triage on-ramp and the bug-queue
  grep are replaced by the intake on-ramp; `docs/bugs/` no longer appears
  as a live bug list. `docs/engineering/grilling.md` and
  `docs/engineering/domain-modeling.md` repointed away from triage.
  `CONTEXT.md` still speaks the v4 triage vocabulary; that rescope is
  `docs-resync`'s remit (recorded upstream, unchanged here).
- The no-rejection-path sentence in intake prose deliberately does not
  describe a spot-fix path: every request becomes an effort, so the
  retired `report-bug` spot-fix capability has no successor in the door
  itself (an in-scope trivial fix becomes a bug ticket in its own effort,
  per the every-bug-is-an-effort decision).