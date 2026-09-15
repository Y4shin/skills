# Handoff: task-tools-overhaul, to-tickets approval is the live step

You are continuing the `task-tools-overhaul` effort in this repo
(github.com/Y4shin/skills, branch main). Everything this session
produced is committed and pushed. The one thing still live: the user
has NOT yet approved the ticket breakdown. Do not publish tickets
until they answer the quiz.

## Where we are

- The map: `docs/tasks/maps/task-tools-overhaul/map.md`. All three
  research/grilling children are done; "Decisions so far" carries the
  complete decision set (G1 rounds 1-7, user-confirmed). Read it first;
  it is settled and must not be re-litigated.
- The decision record: `docs/tasks/overhaul-synthesis-grilling/task.md`
  holds every round with rationale and rejected alternatives. The two
  research findings it consumed:
  `docs/tasks/tool-surface-inventory/findings.md` (851 lines) and
  `docs/tasks/workflow-tool-usage-audit/findings.md` (972 lines).
- The spec: `docs/tasks/task-tools-overhaul/spec.md` (457 lines),
  user-approved via `/skill:to-spec`, synthesizes the decision set.
  Test seams were explicitly approved: (1) tool-contract seam via the
  registered-tool interface against fixture trees, (2) the migration
  as its own testable unit per vintage.

## The immediate next step

The `/skill:to-tickets task-tools-overhaul` run reached step 4 (quiz
the user) and stopped for approval. An 8-ticket breakdown was
presented; the user has not answered. The proposal, compact:

1. state module fix (lossless round-trip, real nulls, map pointer) -
   no blockers
2. v4 artifact model: dual-shape parsing and resolution - blocked by 1
3. the v4 migration (any vintage to new tree) + setup-workflow v4 -
   blocked by 2. Deliberately XL: one contract covers every vintage.
4. scan-based graph tools + honest schema reference (tw_context) -
   blocked by 3
5. rename tool family to tw_ prefix (including soon-to-die tools, so
   deletion stays a pure no-references-remain contract) - blocked by 4
6. planning-side skills to v4 (wayfinder, to-spec, to-tickets,
   doctor conformance symptom, router map) - blocked by 5
7. execution-side skills to v4 (implement-task per-ticket chains,
   mode: human hard-refuse, finalize-task, code-review/tdd standards
   reads, ui-noter removal) - blocked by 5, parallel with 6
8. contract: delete dead surface (task_resolve, task_assert_kind,
   task_map_tasks, task_map_tick, task_slices, task_set_slices,
   get_guidelines, list_guidelines, guidelines hook+machinery) -
   blocked by 6 and 7

Quiz still open with the user: granularity (is 3 too big?), the
rename-before-prose ordering choice (5 before 6/7; alternative is
prose first, rename last), and whether guidelines deletion (8) should
merge with the re-pointing (7). The agent's stated preference:
rename-first, keep 3 whole, keep 8/7 separate.

When the user answers: finish the to-tickets flow (publish all eight
as `docs/tasks/<ticket-slug>/task.md` with the current task frontmatter
shape, register them in the map's tasks array, wire blocked_by in a
second pass) and then the frontier is live for `/skill:implement-task`.

## Caution: the old frontmatter is still current

Belief check, verified before this session ends: the tree on disk is
STILL v3-era (kind/map/slug/status/blocked_by, maps/ subtree, flat
task dirs, map tasks array). Everything v4 (OKF types, subtype,
workflow_state, effort-grouped layout, tw_ prefix, ticket.md) is
DECIDED but NOT IMPLEMENTED. The to-tickets publication must use the
OLD frontmatter shape (the skill's own template does) even though the
tickets describe building the new one. Do not "fix" the shape while
publishing; that is ticket 3's job.

Also live: `docs/tasks/state.yaml` reads
`task: null / slice: null / schema_version: 3` (hand-normalized; the
current tool wipes the version key on every write, which is the
confirmed bug ticket 1 kills). After any `task_state_set` call, check
that file and restore `schema_version: 3` if the tool dropped it.

## Known in-flight work, not yours to finish

The working tree also carried these before this effort (now committed
by user request, still unfinished): the repo-gate refactor
(`src/core/repo-gate.ts` + docs + tests, semantics changed to
enable-authoritative), the handoff skill rewrite, the eval-review
skill (registered in package.json pi.skills, docs pages), and the
pi-harness-evals map (`docs/tasks/maps/pi-harness-evals/`) whose spec
child `docs/tasks/build-eval-creator-skill/spec.md` was never
ticketed. That map's user will run to-tickets on it separately. Do
not absorb it into this effort.

## Suggested skills

- `to-tickets` is USER-INVOKED: the remaining step of the current flow
  needs the human to answer the quiz, then the agent finishes
  publication per the skill's step 5.
- `implement-task` (model-invoked): once tickets are published, it
  works the frontier per ticket.
- `finalize-task` (model-invoked): bookkeeping when a ticket lands.
- `code-review` (model-invoked): the advisory whole-diff review at the
  end of each ticket chain, per implement-task's pipeline.

## Reference docs, by path

- Map (decision record): docs/tasks/maps/task-tools-overhaul/map.md
- G1 rounds: docs/tasks/overhaul-synthesis-grilling/task.md
- Spec: docs/tasks/task-tools-overhaul/spec.md
- R1 inventory: docs/tasks/tool-surface-inventory/findings.md
- R2 usage audit: docs/tasks/workflow-tool-usage-audit/findings.md
- OKF 0.2 spec (external, what v4 complies with):
  https://github.com/GoogleCloudPlatform/open-knowledge-format
