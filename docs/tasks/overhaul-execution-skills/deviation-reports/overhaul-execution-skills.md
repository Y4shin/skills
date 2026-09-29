---
type: deviation report
title: Deviation report for overhaul-execution-skills
status: stable
---

## Deviation report: overhaul-execution-skills

Verification basis: `git diff task/overhaul-execution-skills..slice/overhaul-execution-skills`
(20 files, +1117/−592), the rewritten prose and agent files read in full, and
a fresh independent run of the gates on the slice branch: `npm test` 767/767
(15 files), `npm run typecheck` exit 0, working tree clean. The two approval
decisions (finalize-task owns the `workflow_state: done` marking; splits
supersede the original with `status: deprecated` plus `workflow_state: done`)
were both followed to the letter. No uncertainty stop fired; the one open
design point (landing-branch chaining) was resolvable from the arch spec's
own semantics and is recorded below as a divergence.

### API surface changes

- **Landing-branch chaining (spec letter corrected).**
  - **Planned:** the arch spec's Branch and artifact model said each
    landing branch `task/<ticket-slug>` is "created off the starting branch
    (typically main)".
  - **Actual:** the first ticket's landing branch is created off the
    starting branch; each subsequent ticket's is created off the branch the
    previous ticket's chain landed on, so a chain sees the code its
    blockers delivered.
  - **Impact:** none negative; this is a correctness improvement the spec's
    letter got wrong. Literal branch-off-main for every ticket would break
    level N+1 chains (the blockers' code is absent) and produce unresolvable
    merges. The arch spec's own dependency-level semantics imply the
    chaining; the prose now states it explicitly.
- **Worktree-isolation paragraph dropped (capability removal by omission).**
  - **Planned:** the arch spec did not mention the old feature pipeline's
    optional per-slice worktree concurrency mode.
  - **Actual:** the paragraph is gone from the rewritten pipeline.
  - **Impact:** the optional per-slice worktree concurrency (parallel
    frontier slices in isolated worktrees) has no v4 successor in the
    rewritten prose: the v4 chain model is sequential per level on a shared
    repo cwd, and the worktree path had no defined v4 landing story
    (per-ticket landing branches). Recorded so the removal is visibly
    deliberate; a future effort would need to design worktree concurrency
    for the branch-chaining model.
- **Telemetry field name kept, semantics re-pointed.**
  - **Planned:** the spec said budgets and frontier semantics move to
    tickets.
  - **Actual:** the wrapper's telemetry prose still passes `sliceCount`
    (the external pi-telemetry extension's field name, which this repo
    cannot rename without extension changes) but defines it as the
    pending-ticket count from `tw_frontier <effort-slug>`; `map` is the
    effort slug.
  - **Impact:** none operationally; the field name is an external
    constraint.
- **`CLAUDE.md` removed from the standards-read list.** The old
  code-reviewer bullet named it beside `AGENTS.md`; the spec's direct-read
  list did not, and `CLAUDE.md` is not a Pi-native convention file.
  Impact: none.
- **Repro location loosened.** v3 pinned the reproduction at
  `docs/tasks/<taskSlug>/repro.md`; the v4 bug chain references the bug doc
  and reproduction from the ticket body, wherever they live. Matches the
  spec's "referenced from the ticket body".

### Abstraction usage

- Used/was specified: yes. The rewritten prose uses the resolver for all
  artifact access (no hardcoded path templates), `tw_frontier` /
  `tw_dependency_levels` / `tw_finalizable` / `tw_map_finalizable` /
  `tw_set` / `tw_state_set` for the graph and state, the budget table keyed
  off `size` with the m default, and the chain pseudocode rebased onto the
  real workflow API (`subagent({ async: true, workflowScript })`,
  `runs.run`, `runs.all`, ok-gate before land) exactly as the spec's
  Branch and artifact model requires. The template-conformance seam
  helpers from the parallel ticket (`extractFrontmatterTemplates`,
  `substituteTemplate`, `assertTemplateConforms`) are reused and extended
  to the arch-spec, deviation-report, and findings templates. No
  reimplementations found; no `src/` changes.

### Out-of-scope changes

None in the diff's content. All 20 changed files are inside the arch spec's
file list; the interface contract for dependents is verified: the touched
prose and agents carry zero `get_guidelines`, zero `ui-noter`, and zero
`impeccable` references (grep sweep, structure tests, corpus tests), only
surviving `tw_*` tools are named, and zero em-dashes appear on added lines
(including the reformatted `// rule: <name>: reason` comment convention in
the tdd-worker, required by the repo rule). The finalize-step renumbering
(the deleted impeccable check leaves Steps 0-8 with no gap) is presentational,
not a scope change. No docs pages were created (backfill-skill-docs-pages
owns them); the repo's own pre-migration v3 task files are untouched.

### Divergence from the slice doc's acceptance criteria

None. All nine criteria are implemented and structure-tested; criterion 8
(the onboarding report's dead pointer) was verified already fixed and
test-covered upstream, correctly requiring no work.

### Task doc update needed?

Yes. The land-worker's implementation note should carry:
- the landing-branch chaining rule (subsequent tickets branch off the
  previous ticket's landing branch, not main), so future chains and the
  coherence pass follow it;
- the worktree-concurrency removal (deliberate, no v4 story);
- the worker-telemetry friction below, for the dead-surface ticket's sweep
  to be aware of.

### User attention needed?

No (scope and API surfaces otherwise match the spec; every divergence above
is disclosed and within the arch spec's intent). One pre-existing
observation worth the record, not introduced by this slice: the tdd-worker's
agent prose instructs `submit_feedback` calls, but its tool allowlist
(`read, write, edit, bash`) has never included the tool, so the
designed-for worker telemetry is silently impossible from that agent (the
implementer worked around it by recording observations in its report). The
same applies to the slice-verifier. This is tool-allowlist drift the
dead-surface ticket or a telemetry follow-up should resolve.
