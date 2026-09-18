# Handoff: task-tools-overhaul, tickets published, frontier live

You are continuing the `task-tools-overhaul` effort in this repo
(github.com/Y4shin/skills, branch main). The to-tickets flow is
complete: all eight tickets are published, registered in the map,
and the frontier is live. Everything is committed and pushed unless
noted below.

## Where we are

- The map: `docs/tasks/maps/task-tools-overhaul/map.md`. All three
  research/grilling children are done; the eight implementation
  tickets are registered with `done: false`. "Decisions so far"
  (G1 rounds 1-7) is settled; do not re-litigate it.
- The spec: `docs/tasks/task-tools-overhaul/spec.md`, user-approved
  via `/skill:to-spec`, is the design source for every ticket. Test
  seams approved: (1) tool-contract seam via the registered-tool
  interface against fixture trees, (2) the migration as its own
  tested unit per vintage.
- The to-tickets quiz was answered on 2026-09-16; all four agent
  recommendations were approved: keep ticket 3 (the migration) whole
  and XL; rename-first ordering (ticket 5 before the prose tickets 6
  and 7); guidelines deletion stays in ticket 8 (not merged into 7);
  publish with one legacy slice doc per ticket so today's
  implement-task pipeline can execute each ticket (the
  vacuous-completion trap would otherwise fire, per the R2 audit).
- Every ticket lives at `docs/tasks/<slug>/task.md` plus
  `slices/1-<slug>.md` (v3 frontmatter shape, `mode: afk`, one slice
  per ticket, test plans distilled from acceptance criteria). The
  pipeline enumerates them via `task_slices`; verified before commit:
  `task_slices overhaul-state-module` reports its slice todo.
- Dependency levels (task_dependency_levels task-tools-overhaul):
  1 overhaul-state-module → 2 overhaul-artifact-model →
  3 overhaul-v4-migration → 4 overhaul-graph-tools →
  5 overhaul-tw-rename → 6/7 overhaul-planning-skills ∥
  overhaul-execution-skills (parallel) → 8 overhaul-dead-surface.
  Frontier: overhaul-state-module.
- `task_finalizable` was pinned down while publishing: it is neither
  deleted nor lost. It survives, reworked to a status-based
  predicate in ticket 4, renamed in ticket 5, consumed by finalize
  prose in ticket 7. The spec's survivor/delete lists omit it; the
  decision record (round 1 Q1) is authoritative.

## The immediate next step

Run `/skill:implement-task task-tools-overhaul` (or dispatch ticket
by ticket: `overhaul-state-module` first, then the chain in level
order). implement-task works the frontier: state module first, then
the artifact model, the migration, graph tools, rename, the two
parallel prose tickets, then the deletion ticket last.

Before each dispatch, decide human vs autonomous mode per the
current feature router's prose rules. The tickets carry `mode: afk`
on their slice docs, but the invocation prose governs; for the
rename ticket especially, a human-mode run with the agent doing the
mechanical sweep is fine.

Two user calls embedded in the tickets, surfaced at run time:

1. Ticket 3 does not run the migration against this repo's live
   tree; tests use fixtures. When to flip the live tree is a user
   call (the natural moment: after tickets 6/7 land, before ticket 8
   so the deletion lands on the final tree).
2. Ticket 7's human-mode refusal semantics: when implement-task
   meets a `mode: human` ticket it hard-refuses and hands back with
   the skill invocation; nothing to decide here unless the flow
   snags.

## Caution: the old frontmatter is still current

The tree on disk is STILL v3-era (kind/map/slug/status/blocked_by,
maps/ subtree, flat task dirs, map tasks array). Everything v4 (OKF
types, subtype, workflow_state, effort-grouped layout, tw_ prefix,
ticket.md) is DECIDED but NOT IMPLEMENTED. The published tickets
describe building the new world but use the old shape, deliberately:
fixing the shape is ticket 3's migration, not the publication's job.
Any new prose written before the flip (tickets 5-7) must use the OLD
tool names and the OLD conventions where it touches live artifacts.

`docs/tasks/state.yaml` reads `task: null / slice: null /
schema_version: 3` (hand-restored; the current tool wipes the
version key on every write, the confirmed bug ticket 1 kills).
After any `task_state_set` call, check that file and restore
`schema_version: 3` if the tool dropped it.

## Known in-flight work, not yours to finish

The working tree also carries these before this effort (committed by
user request, still unfinished): the repo-gate refactor
(`src/core/repo-gate.ts` + docs + tests, semantics changed to
enable-authoritative), the handoff skill rewrite, the eval-review
skill (registered in package.json pi.skills, docs pages), and the
pi-harness-evals map (`docs/tasks/maps/pi-harness-evals/`) whose
spec child `docs/tasks/build-eval-creator-skill/spec.md` was never
ticketed. That map's user will run to-tickets on it separately. Do
not absorb it into this effort.

## Suggested skills

- `implement-task` (model-invoked): works the frontier per ticket,
  chain per slice (each ticket has exactly one slice doc).
- `finalize-task` (model-invoked): bookkeeping when a ticket lands
  (map tick, changelog entry, knowledge harvest, archive). NOTE: it
  is only correct on the live v3 tree; the tickets themselves
  migrate the tree in ticket 3.
- `code-review` (model-invoked): the advisory whole-diff review at
  the end of each ticket chain, per implement-task's pipeline.

## Reference docs, by path

- Map (decision record + ticket registry): docs/tasks/maps/task-tools-overhaul/map.md
- G1 rounds: docs/tasks/overhaul-synthesis-grilling/task.md
- Spec: docs/tasks/task-tools-overhaul/spec.md
- R1 inventory: docs/tasks/tool-surface-inventory/findings.md
- R2 usage audit: docs/tasks/workflow-tool-usage-audit/findings.md
- OKF 0.1 → 0.2 spec (external, what v4 complies with):
  https://github.com/GoogleCloudPlatform/open-knowledge-format
