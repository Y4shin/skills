---
type: deviation report
title: Deviation report for intake-skill
status: stable
---

## Deviation report: intake-skill

### API surface changes
- **Planned:** arch-spec entry 15 plus the carried constraint: intake opens
  through `tw_open` as a no-precondition gate; one run always creates an
  effort (map plus exactly one non-negotiables grilling task) through the
  named transition tools; a bug report becomes a `subtype: bug`
  implementation ticket inside its effort; `triage` retires to
  `skills/deprecated/`. The carried constraint names this ticket as the
  owner of any creation tool intake needs (examples given:
  `tw_add_task`, an effort/map creation tool), extending the registry
  toolset as tools land and keeping one private signature tool per
  registry entry.
- **Actual:** two creation tools landed in `src/pi.ts`, both through the
  frontmatter and scan seams, and the registry toolset extended to match
  (verified in the diff of `5c20a70..ticket/intake-skill`):
  - `tw_create_effort` (intake's private signature tool, rotated from the
    interim `tw_state_set`): writes `docs/tasks/<effort>/map.md` via the
    frontmatter seam with `## Non-goals` and `## Non-negotiable facts`
    seeded as empty placeholders, registers the effort in the root
    index's `## Live` list (sorted, creating `docs/tasks/index.md` when
    the tree has none, reusing the `indexSection`/`indexNames` helpers
    `tw_archive_effort` already carries), and refuses an unsafe slug, an
    existing live effort, and a stray directory under `docs/tasks/` that
    holds no map.
  - `tw_add_task`: the planning-task creator, the counterpart of
    `tw_add_ticket`. Writes `type: task` with a planning subtype
    (`research | prototype | grilling | manual`), `status: stable`,
    `workflow_state: ready`, and an empty `blocked_by`; refuses a slug
    that collides with any artifact of the effort (tickets included),
    a subtype outside the planning set, an invalid mode, and an effort
    with no map. An added task clears the map's ready flag (only a
    present `true` is rewritten), the same auto-clear the landed
    planning writers carry.
  - `tw_add_ticket` was already landed by implementation-transition-tools
    and is reused unchanged for the bug ticket.
  The intake registry toolset in `src/disclosure.ts` is now
  `["tw_create_effort", "tw_add_task", "tw_add_ticket", "tw_state",
  "tw_state_set", "tw_list", "tw_get"]`, and `tests/opener-gate.test.ts`'s
  toolset pin and private-signature-tool proof were updated accordingly.
- **Impact:** no graph-dependent ticket consumes the new tools directly.
  Wayfinder (ticket 10) landed before the creation tools existed, so its
  prose still teaches by-hand map/task creation that the write guard now
  refuses; adding `tw_add_task` (and possibly the map creator) to
  wayfinder's registry toolset and prose is deliberately left as
  coherence-pass input, not done here (the carried constraint assigns
  creation-tool landing to this ticket only). `docs-resync` owns the
  `CONTEXT.md`/README audit against the new front door.

### Abstraction usage
- Used/was specified: yes. Both writers go through the frontmatter seam
  (`parse`/`dump`); the map document is assembled with the existing
  `writeMapSection` and the exported section-name constants; slug and
  mode validation mirror `tw_add_ticket`'s; effort anchoring uses
  `liveEffortDir` and `scanMemo`; v3-shape artifacts are refused through
  the established `requireV4Shape`. No parallel migration, no second
  registry mechanism, no reimplemented graph logic.

### Out-of-scope changes
- Foreign test pins updated where the planned surface change demands it:
  `tests/opener-gate.test.ts` (the intake toolset pin, ten new
  creation-tool contract tests, the signature rotation),
  `tests/plugin.test.ts` and `tests/gate-factory.test.ts` (registered
  tool-name lists), `tests/skill-rewire.test.ts` (WORKFLOW_SKILLS set:
  intake joins, triage leaves), `tests/skills.test.ts` (SKILL_FILES list,
  intake and retirement describe blocks), and
  `tests/integration/session.test.ts` (two faux-provider intake flows:
  feature and bug). None forced a test green against its intent.
- `task-workflow-overview` re-synced per the standing project rule (a
  user-reachable skill was added and another retired): the triage on-ramp
  and the bug-queue grep are replaced by the intake on-ramp; the
  overview's full v5 rescope stays with `overview-doctor-rescope`.
- `improve-codebase-architecture` (prose and docs page) re-pointed its
  hand-off through `/skill:intake`: the spec calls it a pre-intake
  survey, so routing it straight to wayfinder contradicted the v5
  surface once intake landed. Minimal edit; its broader rescope stays
  with `docs-resync`.
- Docs pages: `docs/engineering/intake.md` added with the four mandated
  sections, `docs/engineering/triage.md` deleted,
  `docs/engineering/grilling.md` and `docs/engineering/domain-modeling.md`
  repointed away from the retired skill (one line each), and the
  deprecated bucket README gained the triage entry naming `intake`.
- `triage`'s reference docs (AGENT-BRIEF, OUT-OF-SCOPE) and its report
  resource were not carried to `skills/deprecated/`; the redirect shape
  matches `create-task`'s precedent and the bucket convention.
- `docs/tasks/state.yaml`'s `task:` pointer (the parent dispatcher's
  pre-branch edit) rode the first wip commit; it is the chain's state
  bookkeeping, not this ticket's change.

### Ticket doc update needed?
Yes, already appended on the branch: `## Implementation notes` records
the two creation tools with their contracts, the signature-tool
rotation, the extended registry toolset, the test-surface updates, the
triage retirement detail, and the wayfinder-prose follow-up for the
coherence pass.

### User attention needed?
No. The creation tools are the carried constraint's own instruction
(the ticket doc names both example tools), and the ready-flag
auto-clear is the spec's settled rule for plan-editing writers (an
added planning task is a plan edit). Scope did not change. The one
open thread, wayfinder's stale by-hand creation prose, is recorded in
the ticket notes as coherence-pass input.
