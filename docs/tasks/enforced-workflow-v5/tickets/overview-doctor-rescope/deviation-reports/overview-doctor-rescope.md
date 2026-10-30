---
type: deviation report
title: Deviation report for overview-doctor-rescope
status: stable
---

## Deviation report: overview-doctor-rescope

### API surface changes

- **Planned:** `task-workflow-overview` "must name every user-reachable skill
  and reflect the v5 surface (`intake`, `wayfinder`, `to-spec`, `to-tickets`,
  `implement-ticket`, `finalize-effort`, `setup-workflow`)". Its fast track
  points at `tw_next`; its explainer stays layered. `task-workflow-doctor`
  narrows to four scopes (legacy or unversioned tree, missing scaffolding, a
  failed migration, an opener refusal) and its resources for retired
  substrates are removed or repointed.
- **Actual:** the fast track is the first layer and names `tw_next`, and the
  explainer is layered fast track, short version, main flow, and the linked
  `PHASE-BOUNDARIES.md` deep layer, so those criteria are met. On coverage,
  the implementer resolved "every user-reachable skill" to exactly the seven
  v5 phase skills and pinned that reading in a new test constant,
  `USER_REACHABLE_V5` (`tests/skills.test.ts:2909`), asserting each appears as
  `/skill:<name>` in both `SKILL.md` and `docs/engineering/task-workflow-overview.md`.
  Measured against `package.json` `pi.skills`, the previous overview named
  `/skill:skill-review` (1 reference), `/skill:eval-review` (1), and
  `/skill:handoff` (3); the new one names none of the first two anywhere, and
  keeps `handoff` only inside the deep-layer `PHASE-BOUNDARIES.md`. `code-review`,
  `skill-creator`, and `tdd` were already unnamed before this ticket and stay
  unnamed.
- **Impact:** on `docs-resync` and on any later router resync. If "user-reachable"
  carries the meaning it has in `AGENTS.md` (a model-invoked skill is reachable
  as `/skill:<name>`), then the router is now narrower than the ticket's wording
  and the new test cements the narrower reading, so a later ticket cannot widen
  it without editing that constant. If the intended meaning is "the phase skills
  the router routes over", the delivered behavior is correct and the ticket
  doc's first sentence is what needs tightening.

### Abstraction usage

- Used/was specified: yes. The doctor routes rather than fixes, sends every
  tree, state, and scaffold symptom to `setup-workflow`'s own branches instead
  of duplicating them, and names the opener's `legal_next` as the route for a
  refusal instead of inventing a workaround. The backup branch the new
  `failed-migration.md` tells the human to restore
  (`migrate/schema-<from>-to-5`) is the one `setup-workflow/SKILL.md:107`
  actually creates, so the resource routes onto real behavior. The refusal
  shapes in `opener-refusal.md` match the real `phaseGate` reasons in
  `src/pi.ts` (unknown effort `:1099`, missing target `:1084`, blocked `:1225`,
  done `:1205`, not ready `:1009`, spec with no tickets `:1042`, missing or
  unstable architecture `:1062` and `:1073`).

### Out-of-scope changes

- Two doctor resources were added that the ticket does not name:
  `resources/failed-migration.md` and `resources/opener-refusal.md`. Both are
  required by the mandated scopes ("a failed migration", "routing when an
  opener refuses") and had no existing home, so this is additive, not a scope
  change.
- `resources/missing-bugs-dirs.md` was deleted rather than repointed. The
  ticket allows either ("removed or repointed"), and a repo-wide check finds
  no live reference to the deleted file (only archived effort docs and the new
  negative assertion at `tests/skills.test.ts:3032`).
- The overview's main flow was rewritten from the old three-step narrative with
  branches into a six-phase v5 arc. The old flow advertised a `/skill:handoff`
  out and back bridge around `/skill:prototype`; that detour is gone from the
  main flow, and `handoff` is no longer reachable from the explainer's top two
  layers. `prototype`, `research`, and `grilling` remain listed as standalone
  skills.
- Both docs pages (`docs/engineering/task-workflow-overview.md`,
  `docs/engineering/task-workflow-doctor.md`) were re-synced, which the
  project mandate requires and the ticket does not name.
- Accuracy defect, minor: `resources/opener-refusal.md` presents a table row
  for "undispositioned findings on archive" among the refusal shapes, but that
  refusal is a thrown error from `tw_archive_effort` (`src/pi.ts:2114`), not a
  `tw_open` result. It carries no `opened: false` and no `legal_next`, so the
  resource's own premise ("The refusal carries a `reason` and a `legal_next`
  list") does not hold for that row. Every other row is a genuine opener
  refusal.

### Ticket doc update needed?

Yes. Append to `## Implementation notes`: the `USER_REACHABLE_V5` reading (the
seven phase skills, pinned in the new test constant) and the two names that
dropped out of the router as a result (`skill-review`, `eval-review`); the two
added doctor resources and the deleted `missing-bugs-dirs.md`; the main-flow
rewrite and the removal of the handoff and prototype bridge from it; and the
`opener-refusal.md` archive-row inaccuracy, since it is a one-line fix someone
will otherwise re-find.

### User attention needed?

Yes, for the coverage interpretation only. The delivered ticket is coherent and
its tests pass (536 tests green across `tests/skills.test.ts` and
`tests/skill-rewire.test.ts`), but whether the router should still name
`skill-review` and `eval-review` is a product decision the ticket wording leaves
open, and the new test constant makes the current answer sticky.
