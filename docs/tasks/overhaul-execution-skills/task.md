---
kind: task
type: feature
slug: overhaul-execution-skills
title: Execution-side skills to v4 (implement-task, finalize-task, standards reads, ui-noter removal)
map: task-tools-overhaul
status: done
blocked_by:
- overhaul-tw-rename
slices:
- overhaul-execution-skills
---

## What to build

The execution side of the flow rewritten for the v4 tree.

Implement-task: the router reads subtype and mode from the
artifact's frontmatter (absent mode means today's prose-driven
routing). The feature and bug pipelines rebase to per-ticket chains
over the effort frontier: the architecture spec lives at the effort
root, shared by the effort's ticket chains; per-ticket budgets come
from the size field (default m); a chain failure's split becomes a
sub-ticket registered in the effort; the dead ui-noter dispatch is
removed (its consumer silently no-ops and zero notes were ever
produced); the land-worker loses its slice-archive duty. A ticket
marked `mode: human` hard-refuses autonomous dispatch: the router
hands it back with the skill invocation for the human to run.

Finalize-task: marks the artifact's own workflow state via the set
tool (no tick, no array), gates archiving on the scan tools,
clears the state pointers (the current item and, when the effort
finalizes, the effort pointer), regenerates the root index on
archive, and drops the note check. The onboarding report's dead
task-overview pointer is fixed in the same effort.

Code review and the tdd workers read standards files directly (repo
root instruction files, standards and testing docs) with no
guidelines tool in the middle; the guidelines feature's deletion
itself lands in the dead-surface ticket.

## Acceptance criteria

- [ ] The implement-task router dispatches on subtype from
      frontmatter; absent subtype defaults to today's behavior.
- [ ] mode: human hard-refuses autonomous dispatch and hands off
      with the skill invocation.
- [ ] Per-ticket chains read their ticket file and the effort-root
      architecture spec; budgets from size (default m).
- [ ] Failure splits become sub-tickets registered in the effort.
- [ ] No ui-noter dispatch remains anywhere in the pipelines.
- [ ] Finalize marks workflow state via the set tool and gates
      archiving on the scan tools; pointers cleared; index
      regenerated; note check gone.
- [ ] Code review and tdd prompts read standards files directly.
- [ ] The onboarding report's dead pointer is fixed.
- [ ] Structure tests cover the removed and re-pointed prose.

## Blocked by

- overhaul-tw-rename (prose is written against final tool names);
      runs parallel with overhaul-planning-skills.

## Implementation notes

### Slice - overhaul-execution-skills (landed)

Landed on `slice/overhaul-execution-skills` (7 commits, merged into
`task/overhaul-execution-skills`). All nine acceptance criteria landed
test-first as structure tests in `tests/skills.test.ts` (51 new/flipped
assertions across 9 describe blocks, plus the template-conformance seam
extended to the arch-spec, deviation-report, and findings templates).
Gates on the merged branch: 767/767 tests (15 files), `tsc --noEmit`
clean; no lint script is configured (typecheck is the designated gate).
Verified independently before landing: same numbers on the slice branch.

What landed: the implement-task wrapper routes on `subtype` from
frontmatter (falls back to `type`, then feature; absent mode keeps today's
prose-driven routing), with effort-frontier dispatch via
`tw_frontier <effort-slug>`; `mode: human` hard-refuses autonomous
dispatch and hands back `/skill:implement-task <slug>`; the feature and
bug pipelines are rebased to per-ticket chains over the effort frontier
(effort-root arch spec at `docs/tasks/<effort>/arch-spec.md`, levels via
`tw_dependency_levels`, strict barriers, budgets keyed off `size` with
the m default, chains on the workflow API with an ok-gate before land);
failure splits become sub-tickets registered in the effort with the
original superseded (`status: deprecated` plus `workflow_state: done`);
the ui-noter dispatch is gone; finalize-task is rewritten to v4
(workflow state via `tw_set`, archiving gated on `tw_finalizable` and
`tw_map_finalizable`, pointers cleared, root index regenerated, note
check gone); code-review and the tdd prompts read standards files
directly with no guidelines tool in the middle; land-worker loses its
archive duty.

Carried forward, in priority order:

1. **Landing-branch chaining rule.** The first ticket's landing branch
   is created off the starting branch; each subsequent ticket's is
   created off the branch the previous ticket's chain landed on, so a
   chain sees the code its blockers delivered. The arch spec's letter
   ("created off the starting branch") is corrected by this rule; future
   chains and the coherence pass must follow it.
2. **Worktree-concurrency removal.** The old feature pipeline's optional
   per-slice worktree isolation mode has no v4 successor: the v4 chain
   model is sequential per level on a shared repo cwd, and the worktree
   path had no defined v4 landing story. The removal is deliberate; a
   future effort would need to design worktree concurrency for the
   branch-chaining model.
3. **Worker-telemetry friction (pre-existing, not introduced here).**
   The tdd-worker and slice-verifier agent prose instruct `submit_feedback`
   calls, but their tool allowlists have never included the tool, so the
   designed-for worker telemetry is silently impossible from those
   agents. The dead-surface ticket or a telemetry follow-up should
   resolve this drift.
4. **Docs pages deferred.** The docs pages for implement-task and
   finalize-task are stale relative to their SKILL.md files until
   `backfill-skill-docs-pages` runs (its criteria already name them);
   the arch spec overrides the repo's re-sync rule for this effort.
5. **Telemetry field name kept, semantics re-pointed.** The wrapper still
   passes `sliceCount` (the external pi-telemetry extension's field name)
   but defines it as the pending-ticket count from
   `tw_frontier <effort-slug>`; `map` is the effort slug.
6. **Smaller deliberate divergences.** Finalize renumbers to Steps 0-8
   after the deleted impeccable-note check; `CLAUDE.md` is dropped from
   the standards-read list (not a Pi-native convention file); the
   tdd-worker's `// rule:` comments are reformatted to
   `// rule: <name>: reason` (no em-dashes repo-wide); the bug chain is a
   lean tdd to slice-verifier to land chain with the bug doc and
   reproduction referenced from the ticket body (wherever they live),
   not pinned to a fixed repro path.

### Finalize harvest

Whole-effort code review (fresh-context, two-axis): merge verdict OK with
notes; no P0s, spec axis complete. The P1s fixed in the landing commits
(`b708f9b`): both pipelines' chain pseudocode rebased onto the real
workflowScript API (keyed `runs.run`, awaited results, `outputReference`
pointers; the retired `as:` labels and `{outputs.x}` interpolation gone),
finalize's effort-finalization self-merge removed (the archive runs on
main, nothing to merge), the CI-gate `tw_context` wording restored, the
bucket-README one-liners re-synced, and the router's implement-task
passage updated (the per-ticket chain and the advisory review).

Transitional note: this ticket finalized against the live v3 tree, so the
marking is doubled deliberately: the v3 `status: done` (which the migration
converts) plus the v4 `workflow_state: done` per the new prose, and the
v3 map array tick (the live tree's registration until the migration
deletes it). The new prose's single-marking semantics apply to v4 trees
post-migration.

Durable testing pattern folded into `docs/testing.md` (Skill prose
testing): pin pseudocode call shapes with regex assertions, plus a
shape-guard test over both pipelines (no retired chain-API shapes, keyed
and awaited calls, the feature file alone fans out with `runs.all`).
