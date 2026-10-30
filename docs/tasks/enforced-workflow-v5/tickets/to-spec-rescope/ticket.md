---
type: ticket
subtype: feature
title: to-spec drops the seam interview and gates on ready_for_spec
status: stable
workflow_state: done
blocked_by: [planning-transition-tools, disclosure-open-close-core, opener-gate-and-toolsets]
size: m
---

## What to build

`to-spec` synthesizes the specification from the settled record and no longer
runs a seam or architecture interview. The duplicate interview is gone; the
architecture is `to-tickets`' output, and the spec's architecture content is
what planning already settled.

The phase gates on exactly one thing: `ready_for_spec`. The check lives in
the `to-spec` opener, never in the skill's prose. A run that finished every
planning task but skipped the Wayfinder reconcile is refused with a pointer
back to Wayfinder, so the mistake is reported at the phase that owns it.

The spec still carries the problem, the solution, the stories, the settled
implementation decisions, the testing decisions, and out of scope, and it
writes them through `tw_write_spec`.

## Acceptance criteria

- [ ] `to-spec` no longer runs a seam or architecture interview.
- [ ] The phase opens only when `ready_for_spec` is true; otherwise it is
      refused with a pointer to Wayfinder.
- [ ] The gate is in the opener, not in the skill's prose.
- [ ] The spec is written through `tw_write_spec` and keeps its full section
      set.
- [ ] `spec.md` gains the archival note only for the architecture content it
      hands off; nothing is deleted.
- [ ] `tests/skills.test.ts` is green.

## Blocked by

- planning-transition-tools (`ready_for_spec` and the map sections).
- disclosure-open-close-core (the skill opens through `tw_open`).
- opener-gate-and-toolsets (the to-spec gate).

## Implementation notes

- Landed on `task/to-spec-rescope` from `ticket/to-spec-rescope` (commit
  13aac06, one commit: the SKILL.md rewrite, the docs-page re-sync, and the
  8-test describe block in `tests/skills.test.ts`).
- Divergence: `docs/engineering/to-spec.md` was re-synced in the same commit
  per the AGENTS.md docs-page mandate; the rescope of the docs page is a
  consequence of the same criterion (no seam interview anywhere a human
  reads).
- The `ready_for_spec` gate itself lives in the opener (`src/pi.ts`) and was
  already landed upstream by `opener-gate-and-toolsets`; this ticket's
  surface was the prose rescope, the `tw_write_spec` writer contract, and
  the full section set.
- The dispatcher's `docs/tasks/state.yaml` task-pointer edit and the
  deviation report at
  `deviation-reports/to-spec-rescope.md` are folded into the landing docs
  commit.
- Full suite green at landing: 18 files, 1099 tests; typecheck clean. No
  linter is configured in this repo (typecheck is the static gate).