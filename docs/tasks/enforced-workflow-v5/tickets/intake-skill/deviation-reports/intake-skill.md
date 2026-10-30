---
type: deviation report
title: Deviation report for intake-skill
status: stable
---

## Deviation report: intake-skill

### API surface changes

- **Planned:** arch spec entry 15 plus the carried constraints: intake
  opens through `tw_open` as a no-precondition gate; one run creates an
  effort (map plus exactly one non-negotiables grilling task) through named
  tools; the bug intake creates a `subtype: bug` ticket; `triage` retires
  to `skills/deprecated/`. The carried constraint explicitly says to land
  "any creation tool intake needs (e.g. `tw_add_task` or an effort/map
  creation tool)" in this ticket, extending the registry toolset as tools
  land, with one private signature tool per entry.
- **Actual:** two creation tools landed in `src/pi.ts`:
  `tw_create_effort` (the effort/map creation tool: v4-shaped map through
  the frontmatter seam, both canonical sections seeded empty, root-index
  `## Live` registration with the index created when absent, refusals for
  unsafe slug, existing live effort, and a stray un-mapped directory) and
  `tw_add_task` (the planning-task creator: planning subtype enum,
  stable/ready frontmatter, empty `blocked_by`, slug-collision refusals
  against any artifact of the effort). `tw_add_ticket` was already landed
  by implementation-transition-tools and is reused unchanged. The intake
  registry toolset is now `["tw_create_effort", "tw_add_task",
  "tw_add_ticket", "tw_state", "tw_state_set", "tw_list", "tw_get"]`;
  the private signature tool rotated from the interim `tw_state_set` to
  `tw_create_effort`. The open-set derivation stays exact (the pin test
  in `tests/opener-gate.test.ts` proves it for every entry).
- **Impact:** no downstream ticket consumes `tw_create_effort` or
  `tw_add_task` yet. Ticket 10 (wayfinder-reconcile-and-passes) landed
  before them, so wayfinder's prose still says "create the map at ...",
  which the write guard now refuses: adding `tw_add_task` (and possibly
  the map creator) to wayfinder's registry toolset and prose is
  coherence-pass input, deliberately not done here (the arch spec's
  carried constraint assigns creation-tool landing to this ticket, and
  ticket 10's prose rewrite is its own landed scope). `docs-resync`
  audits `CONTEXT.md` (which still defines "triage role" and the
  `docs/bugs/` substrate) and the top-level/bucket READMEs.

### Abstraction usage

- Used/was specified: yes. Both writers go through the frontmatter seam
  (`parse`/`dump`); the map document is assembled with the existing
  `writeMapSection` and the exported section-name constants; the index
  writer reuses the `indexSection`/`indexNames` helpers
  `tw_archive_effort` already carries; slug and mode validation mirror
  `tw_add_ticket`'s; the effort-anchoring uses `liveEffortDir` and
  `scanMemo`. No parallel migration, no second extension entry, no
  reimplemented graph logic.

### Out-of-scope changes

- Foreign test pins updated where the ticket-owned table demands it:
  `tests/opener-gate.test.ts` (the intake toolset pin and the new
  creation-tool describe block), `tests/plugin.test.ts` and
  `tests/gate-factory.test.ts` (the registered-surface name lists), and
  `tests/skill-rewire.test.ts` (the WORKFLOW_SKILLS coverage set: intake
  joins, triage leaves). Every change follows from the planned surface
  change; none forced a test green against its intent.
- `skills/engineering/task-workflow-overview/SKILL.md` re-synced: the
  triage on-ramp and the bug-queue grep line are replaced by the intake
  on-ramp; `docs/bugs/` no longer appears as a live substrate. This is
  the standing project rule ("`task-workflow-overview` is re-synced
  whenever a user-reachable skill is added, renamed, or re-scoped",
  arch spec, finalize-effort section), not ticket-scope creep; the
  overview's full v5 rescope stays with `overview-doctor-rescope`.
- `docs/engineering/grilling.md` and `docs/engineering/domain-modeling.md`
  repointed away from the retired skill (one-line edits, same rule).
- `docs/engineering/triage.md` deleted and `docs/engineering/intake.md`
  added (the docs-page mandate for a promoted skill), plus the deprecated
  bucket README entry naming `intake`.
- `docs/tasks/state.yaml`'s `task:` pointer was already moved to
  `intake-skill` by the dispatcher before this branch started (present as
  an uncommitted change in the working tree); left untouched.

### Ticket doc update needed?

Yes, done at landing: the `## Implementation notes` section records the
two creation tools, the signature-tool rotation, the registry toolset, and
the wayfinder-prose follow-up for the coherence pass.

### User attention needed?

No. The creation-tool shape is the carried constraint's own instruction;
the ticket names both example tool names. The only judgment call is that
intake prose teaches the feature hand-off to `wayfinder` (not `to-spec`),
which follows from the spec's phase flow (wayfinder runs the
non-negotiables grilling task intake creates).
