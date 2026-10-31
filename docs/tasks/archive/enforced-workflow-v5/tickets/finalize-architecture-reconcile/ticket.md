---
type: ticket
subtype: bug
title: Give the effort close a living-architecture reconcile
status: deprecated
workflow_state: done
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

## Implementation notes

Closed out inline at the effort close, implemented by the operator at `8e4c718` (no chain dispatched).

Outcome of the architecture reconcile: attempted and refused by the tool, recorded rather than edited by hand. `tw_write_architecture enforced-workflow-v5` returned `effort 'enforced-workflow-v5' still holds the legacy architecture shape (docs/tasks/enforced-workflow-v5/arch-spec.md): run the schema-5 migration (it renames arch-spec.md to architecture.md) before using the v5 architecture writer`, and the tree was unchanged afterwards. This is the schema-4 path the delivered SKILL and docs page describe: the close holds the writer, and a legacy `arch-spec.md` keeps the reconcile unavailable until the repo migrates. Consequence for this effort: `arch-spec.md:325-326` still says `finalize-effort` runs one pass with no second advisory review, and lines 671-675 and 797 still describe the archive gate as reading every review artifact's `dispositioned` flag; the review records the same gap as finding F2, informational, because the fix is a planning artifact plus a human `setup-workflow` migration.

Lesson for the next effort: run `setup-workflow`'s migration on this repo's own `docs/tasks/` tree before a close needs to write the architecture, otherwise every schema-4 close can only record the gap. The registry change is pinned by `tests/opener-gate.test.ts`.
