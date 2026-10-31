---
type: ticket
subtype: bug
title: Give the effort close a living-architecture reconcile
status: stable
workflow_state: ready
blocked_by: []
size: m
---

## What to build

Close the hole whole-effort review finding F1 describes: after the last ticket
lands, no phase owns the living architecture document. `implement-ticket` holds
`tw_write_architecture` and runs the reconcile in its end-of-effort pass
(`src/disclosure.ts:195-201`), but every reconcile precedes the final landing,
and `finalize-effort` declares no architecture writer (`src/disclosure.ts:211-226`),
so the phase that closes the effort cannot correct the design record. The five
post-landing fix commits (`a94609f`, `512ab59`, `6f057f4`, `18d56e9`, `e5eeb0f`)
were therefore never reconciled and
`docs/tasks/enforced-workflow-v5/arch-spec.md:325-326` still claims
`finalize-effort` runs one pass and that there is no second advisory review.

Decide and implement one shape, recording the decision in the ticket note:

- preferred: the close owns the reconcile. Disclose `tw_write_architecture` to
  `finalize-effort`, add a step to `skills/engineering/finalize-effort/SKILL.md`
  that reconciles the architecture against the shipped tree before the holistic
  review, and state in the skill that this reconciles the record without fixing
  code. The two informational rules in the skill stay as they are.
- alternative: the close is explicitly not the owner, and the skill states that
  a landing after the last ticket's chain leaves the architecture stale until a
  later ticket chain reconciles it. If this is chosen, the skill must name the
  remedy, because a close that archives a stale record with no stated remedy is
  the defect.

The selected shape must respect one constraint the ticket tree already has: for
a schema-4 effort the v5 writer refuses the legacy `arch-spec.md`
(`src/pi.ts:1836-1841`), so the step either works on a migrated tree or states
that the migration is the human prerequisite.

## Acceptance criteria

- [ ] `finalize-effort`'s toolset and SKILL.md agree on who reconciles the
      architecture at the close.
- [ ] A test in `tests/` pins the new contract (the registry change, or the
      skill step, whichever shape is chosen).
- [ ] `docs/engineering/finalize-effort.md` is re-synced to the same contract.
- [ ] Both typechecks and `npx vitest run` are green.
