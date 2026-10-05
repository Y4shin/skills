# Handoff: enforced-workflow-v5, spec done, tickets next

Written to let a fresh session run `/skill:to-tickets` on the
`enforced-workflow-v5` effort. This is a transit document, not the record.
The record is the effort itself.

## Where everything lives

- Effort root: `docs/tasks/enforced-workflow-v5/`
- `map.md` is the destination, the constraints, the full `Decisions so far`
  index, the `## Non-goals`, the `## Non-negotiable facts` (with the success
  test), and an empty `## Fog`. Read it first.
- `spec.md` is `status: stable`. Read it second; it is the implementation
  handoff and it carries the problem, the solution, 65 user stories, the
  settled implementation decisions by pillar, the testing decisions, and out
  of scope.
- `tasks/<slug>/task.md` are the 12 planning tasks, all done, each carrying a
  `Settled decisions` section with the full Q and A. Do not re-ask anything
  recorded there.
- Evidence artifacts: `tasks/research-pi-tool-disclosure/findings.md` and
  `tasks/prototype-open-close-gating/findings.md`.
- Workflow state: `tw_state` reports `map: enforced-workflow-v5`,
  `task: none`.

## Status at this handoff

- Planning is finished: all 12 planning tasks are `workflow_state: done`, the
  planning frontier is empty, and the map's Fog is empty.
- The map was retrofitted to its own v5 shape (rename `## Out of scope` to
  `## Non-goals`, add `## Non-negotiable facts` with the success test), and
  `ready_for_spec: true` was set by hand as a documented bridge because the
  dedicated checking tool does not exist yet (it is v5 work).
- `spec.md` is written and `status: stable`, approved by the human.

## Next step

The human runs `/skill:to-tickets enforced-workflow-v5` (user-invoked; only
the human can start it).

`to-tickets` must produce `docs/tasks/enforced-workflow-v5/architecture.md`
plus the ticket graph. The architecture inlines the spec's architecture
content in full, then adds per-ticket exports, existing abstractions to use,
do-not-reimplement, seams, and interface contracts between tickets. It is the
living document; the spec's architecture content becomes archival once it
exists (add only a note to `spec.md`, delete nothing).

## What the tickets must reflect

Headlines only. All detail is in `spec.md` and the task bodies.

- **Schema 5**: map frontmatter gains `ready_for_spec` (boolean, absent reads
  as false) and optional `origin_effort`; no `simple` field. `type: arch
  spec` and `arch-spec.md` become `architecture` and `architecture.md`. A new
  `type: review` covers `review.md` at the effort root. The map body gains
  `## Non-goals` and `## Non-negotiable facts`. One idempotent migration reuses
  `src/migrate-cli.ts` and `src/core/migrate.ts`; v3 and v4 stay readable; the
  renames cover archives; `docs/bugs/` stays a static archive. This effort
  also updates `docs/migration-target.yaml` and adds
  `skills/engineering/setup-workflow/resources/upgrade-4-to-5.md`.
- **Progressive disclosure**: a skill-scoped `tw_open` with a discriminated
  union on `skill`, a per-skill `tw_close`, and an always-declared `tw_next`
  answering in short prose. Gated tools are `exposure: "direct"` plus
  `defaultActive: false`. Needs `@earendil-works/pi-coding-agent` 1.0.0 (this
  repo resolves 0.80.10). The opener absorbs the explicit
  `telemetry_skill_context` calls; `submit_feedback` stays model-available.
  Nested opens exist on paper and are exercised only by `skill-creator`, whose
  bundled scripts become a disclosed toolset.
- **Gate model**: preconditions live in the extension tools as the single
  source of truth. Free `tw_set` is removed and replaced by named transition
  tools that become the only writers of `docs/tasks/**`. The built-in `write`
  and `edit` are blocked there; the `bash` scan is dropped. Escape hatches stay
  tool-mediated (`tw_resolve_uncertainty`, `tw_split_ticket`,
  `tw_record_out_of_scope`).
- **Skill surface**: add `intake` (replaces `triage`), `finalize-effort`,
  `implement-ticket`; retire `triage`, `finalize-task`, `implement-task`. The
  planning half of `implement-task` is absorbed into `wayfinder`, so there is
  no `plan-task`. `wayfinder` stays user-invoked and takes bounded passes: one
  frontier snapshot, at most one grilling, never rolling into the next
  frontier. `implement-ticket` is model-invoked and owns the ticket frontier,
  the level loop, the chain dispatch, the end-of-effort pass, the failure
  toolbelt, and the inlined per-ticket close-out. `to-spec` and `to-tickets`
  stay user-invoked. `task-workflow-overview` stays a progressively disclosed
  explainer plus a `tw_next` fast track; `task-workflow-doctor` narrows to
  legacy trees, missing scaffolding, failed migrations, and opener-refusal
  routing.
- **Phase skills, pairwise mutually exclusive**: `intake`, `setup-workflow`,
  `wayfinder`, `to-spec`, `to-tickets`, `implement-ticket`, `finalize-effort`.
- **The effort's final ticket is the documentation re-sync**: audit
  `CONTEXT.md`, the top-level `README.md`, `skills/engineering/README.md`,
  `skills/productivity/README.md`, `package.json`'s `pi.skills` array, and the
  `docs/<bucket>/<skill>.md` pages against the implemented v5 and fix what
  drifted. It is blocked by every other ticket. `task-workflow-overview` must
  be re-synced whenever a user-reachable skill is added, renamed, or re-scoped.
- **Testing**: reuse the existing seams (`tests/gate-factory.test.ts`,
  `tests/skills.test.ts`, `tests/skill-rewire.test.ts`,
  `tests/integration/harness.ts` on the `faux` provider). The nested-open
  integration test is the acceptance criterion for disclosure. Migration cases
  extend the existing four non-negotiables.

## Process rules (do not re-derive)

- Grilling runs in rounds, per the `grilling` skill: ask the whole frontier at
  once, numbered, each with a concrete recommended answer, then wait. Never
  run two grilling sessions at once.
- Facts are the agent's job; decisions are the human's.
- Record every decision in the artifact in the user's terms, then verify the
  write before moving on.
- `to-spec` and `to-tickets` are user-invoked. Only the human can start them.
- Every subagent dispatch must be `async: true`.
- No em-dashes anywhere in repo prose.
- The v5 gates and openers do not exist yet, so `to-spec`, `to-tickets`, and
  the ticket pipeline run in v4 mode until the v5 tickets land. Do not assume
  the tool-side refusals are active.
- Do not re-open a planning task. If implementation exposes a genuinely new
  decision, Wayfinder adds a new planning task, it does not edit an old one.

## Suggested skills

- `/skill:to-tickets` (user-invoked, the human types it).
- `grilling` (model-invoked) if a ticket-splitting question needs a decision
  interview.
- `writing-for-agents` (model-invoked) when authoring the new skills' prose.