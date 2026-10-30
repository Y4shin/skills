---
type: ticket
subtype: feature
title: Every grilling session delegates to the grilling skill
status: stable
workflow_state: ready
blocked_by: [wayfinder-reconcile-and-passes, implement-ticket-skill]
size: m
---

## What to build

The canonical grilling method lives in the `grilling` skill alone. The
resources and routers that restate the old one-question-at-a-time method, or
deny that a standalone `grilling` skill exists, are corrected.

Concretely:

- The planning grilling resource that survives under
  `implement-ticket`/`wayfinder` keeps creating the task document and stops
  describing how questions are asked; it delegates to the `grilling` skill.
- The router text that says grilling has "no standalone skill" is corrected
  (it lived in `implement-task/SKILL.md`; the successor files must be right).
- `improve-codebase-architecture/SKILL.md` delegates its grilling session to
  the `grilling` skill instead of restating the method.

The round-based frontier method is the one method: ask the whole frontier at
once, numbered, each with a recommended answer, then wait.

## Acceptance criteria

- [ ] No resource restates the one-question-at-a-time method; each grilling
      step delegates to the `grilling` skill by name.
- [ ] No router denies that a standalone `grilling` skill exists.
- [ ] `improve-codebase-architecture` delegates rather than restates.
- [ ] `tests/skill-rewire.test.ts` asserts the delegation and passes.

## Blocked by

- wayfinder-reconcile-and-passes (the planning grilling resource reaches its
  final location and shape there).
- implement-ticket-skill (the successor router and ticket resources must
  exist before their grilling text can be corrected).
## Implementation notes

# Implementation note: grilling-delegation-fix

Landed by the tdd-worker on `ticket/grilling-delegation-fix`.

- The spec-side re-sync of the archival architecture content, already
   migrated to `arch-spec.md` by to-tickets-architecture, is recorded here so
   the docs-resync coherence pass does not repeat it. The delegation decision
   now lives in the arch spec and in `spec.md`'s archival content; the
   `grilling` section of each names the round-based frontier method with the
   `grilling` skill as its only home, and the router correction is recorded in
   the arch spec's per-ticket contract (entry 12) and in `spec.md`'s
   "Every grilling session delegates to the `grilling` skill" decision.
- `improve-codebase-architecture` was corrected in both the skill and its
   docs page; `implement-task/SKILL.md` already delegated grilling (the
   prior ticket's work) and only its docs page needed the same wording
   narrowed away from "one question at a time".
- The prose seam (`tests/skill-rewire.test.ts`) now pins the delegation in
   both files, and `tests/skills.test.ts` pins the router correction.
