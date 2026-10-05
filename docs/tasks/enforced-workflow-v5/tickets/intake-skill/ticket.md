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