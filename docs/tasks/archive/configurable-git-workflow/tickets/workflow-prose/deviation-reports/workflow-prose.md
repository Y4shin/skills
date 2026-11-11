---
type: deviation report
title: Deviation report for workflow-prose
status: stable
---

## Deviation report: workflow-prose

### API surface changes

- **Planned:** `tw_phase_brief` answers for workflow phases only; any other name
  is refused with "'X' is not a workflow phase".
  **Actual:** it also answers for an implementation agent's profile row (kind
  `agent`), and refuses a name that is neither with "is neither a workflow phase
  nor an implementation agent the git profile names". An empty name gets its own
  reason.
  **Impact:** none left in this effort (this ticket is the last consumer of the
  resolver), and neither existing consumer regresses: `spawn-guard.ts` composes
  its refusal from `decision.base`, not from `brief.step`, and the open gate
  reads `gateDecision`. Any later skill that calls the tool inherits the wider
  vocabulary. This is recorded in `architecture.md` under "Corrections recorded
  during implementation", and the architecture's own contract sentence for
  per-ticket 4 does not mention it.

- **Planned:** `PhaseBrief` carries profile, kind, branch, step, base,
  instructions, close gate, merge, push, diagnostics.
  **Actual:** it also carries `trunk: string` and `trunkMerge: TrunkMergeMode`,
  filled for both `phaseBrief` and `ticketBrief`; the tool exposes them as
  `trunk` and `trunk_merge`, and its result text grows a `Merge step:` line when
  the profile carries a merge flag.
  **Impact:** additive, so nothing that reads the brief breaks. It is what lets
  `finalize-effort` name the trunk and choose `local` or `handoff` without
  restating either in prose, which the ticket's close criterion needs.

- **Planned:** an agent brief carries no step (ticket 1's contract: "a sub-agent
  never creates its own branch ... so the brief carries the base only"), pinned
  by a test asserting `brief.step` is null.
  **Actual:** an agent brief now carries the step its dispatching phase performs,
  "create and check out ticket/x off effort/y, then dispatch tdd-worker". The
  pinning test was updated deliberately.
  **Impact:** the field's meaning changed from "what the caller does" to "what
  the caller does, phrased for who performs it". The one consumer that could
  care, the spawn guard, composes its own sentence and is unaffected; a later
  consumer that assumes `step === null` for an agent would be wrong.

- **Planned:** "the chain's branch assertions move to the resolved ticket branch
  and the effort branch, and the landing-branch step disappears", within "change
  the branch names and the step keys, nothing else".
  **Actual:** the chain takes three new optional args (`branch`, `effortBranch`,
  `merge`), composes both host gates from them, and grows a fallback for a
  profile with no branch (the tdd gate keeps only its uncertainty check; the land
  gate falls back to `test -f <ticketPath>`). `deviationTask` gained a
  `Base branch:` line; `landTask` gained `Your branch (already checked out)`,
  `Merge target`, `Merge flag`, `Delete`. Step keys, step order, and the return
  shape are unchanged, so the step-key clause of the contract has no work to
  describe.
  **Impact:** the chain's arg surface widened from "path, subtype, pointers" to
  carry branch identity, so any caller of `ticket-chain.js` must now resolve the
  profile first. Both resource pipelines and the SKILL.md dispatch block do.

- **Planned:** the profile's merge flag is passed to `git merge` as "the merge
  flag the brief reports".
  **Actual:** the profile stores `"no-ff"` with no leading dashes, the resolver
  passes it through verbatim, the tool prints `Merge step: 'no-ff' into the trunk
  (main)`, the chain writes `Merge flag: no-ff` into the land task, and
  `agents/land-worker.md` composes `git merge <merge flag> <ticket-branch>`.
  Substituting literally yields `git merge no-ff ticket/x`, which git rejects
  ("merge: no-ff - not something we can merge", checked in a scratch repository).
  **Impact:** the `default` profile's land step and the effort close's trunk
  merge are instruction-following failures waiting to happen, on the one path
  this ticket exists to describe. The prose cannot paper over it either: the new
  prose guard forbids `--no-ff` in every phase file and worker agent, so the dash
  form has to reach them from data, either the resolver rendering it (a
  `mergeArg: "--no-ff"` field, or the tool printing the flag with its dashes) or
  the profile value itself changing to `--no-ff`. `flat` is unaffected because it
  carries no flag.

### Abstraction usage

- Used/was specified: **yes**, and the reimplement list was respected. The
  opener refusal vocabulary carries the branch refusal (ticket 2 shipped it; this
  ticket only describes it). `readGitSettings` and `trunkName` are reused rather
  than re-read. One resolver, `phaseBrief` / `ticketBrief` / `decideFromBrief`,
  answers the brief, the open gate and the spawn block, and the new `branchStep`
  helper keeps the brief's step and the refusal's "create and check out" sentence
  on one generator. The chain keeps its named steps, host gates, per-step
  outputs and failure toolbelt; no new tool was registered and no profile name
  appears in a branch of code. The prose guard uses the same text-pinning seam
  the suite already uses.
- Not used, deliberately: the write lockdown and the named writers (this ticket
  writes no artifact through a tool) and the step-key clause (no key carried a
  branch to rename).

### Out-of-scope changes

- Added `docs/git-workflows.md` (109 lines) and shipped it: `package.json`'s
  `files` array plus the README "Where to read next" line. The ticket asked for
  the page but not for the shipping and linking; without both, `npm run test`
  ships a page nobody can find.
- Added `tests/workflow-prose.test.ts`: 16 test declarations, 42 cases once
  `test.each` expands, one per acceptance criterion.
- Edited `agents/code-reviewer.md` (the fixed point comes from the task, not from
  "usually `main` or the landing branch point") and
  `skills/engineering/implement-ticket/scripts/end-of-effort.js` (the combined
  diff's `HEAD` is "the effort branch the tickets landed on"). Both were stale
  references to the removed landing-branch model.
- Edited `docs/engineering/implement-ticket.md` and
  `docs/engineering/finalize-effort.md`, which the AGENTS.md docs mandate
  requires once a skill's behaviour changes.
- Edited `tests/skills.test.ts` in seven places: the chain call-shape pin now
  expects the gates composed from `ticketBranch` / `effortBranch` and asserts
  `refs/heads/task/` is gone, the CI-gate pin is re-worded, the `set -e`
  shell-block pin is re-keyed from `git merge --no-ff` to `set -e` (which now
  also forbids `tw_phase_brief` inside such a block), the tdd-worker, land-worker
  and deviation-reporter pins point at the expectation rather than the literal
  name, the close-out pins expect no landing-branch merge, and `SURVIVING_TOOLS`
  gained `tw_phase_brief`.
- Removed: the close-out's own `git checkout task/<slug>` / merge / branch-delete
  shell block, and with it the phase-owned gate that ran before the ticket
  branch was ever merged. That gate is now the chain's verify gate plus the
  close-out's CI gate on the already-merged effort branch.
- Untouched, correctly: `src/core/spawn-guard.ts`, `src/core/repo-gate.ts`, both
  profile files, and every planning-phase skill (they carried no branch).

### Ticket doc update needed?

**yes.** The ticket doc has no `## Implementation notes` section at all, while
its siblings (`branch-gates`, `spawn-block`, `profile-data-and-phase-briefs`) all
carry one with `### What landed` and `### Lessons`. Append that section with:

- What landed: the brief-and-gate sentence in both branch-bearing skills, the
  five workers' "already checked out" expectation, the three new chain args and
  the gates composed from them, the effort close's `local` / `handoff` landing,
  and `docs/git-workflows.md`.
- The eight divergences the implementation recorded: the agent-name answer from
  `tw_phase_brief`, `trunk` / `trunkMerge` on the brief, the agent brief's step,
  the three chain args, the lost pre-merge gate, `SURVIVING_TOOLS`, the confirmed
  `no-ff` / `always` vocabulary, and the out-of-ticket-file edits.
- Lessons: the merge-flag prefix defect above; that removing the landing branch
  necessarily moves the pre-merge gate later, so a red ticket branch now reaches
  the effort branch and is only caught after the merge; and that under `flat` the
  land host gate degrades to a ticket-doc existence check, so a forgotten merge
  passes silently.
- Note for the phase: `architecture.md` points at a `## Divergence from plan`
  section that none of this effort's ticket docs has; the convention in practice
  is `## Implementation notes` with `### What landed` / `### Lessons`. Record the
  divergences under the heading the other tickets use.

### User attention needed?

**yes**, for three reasons, in order of severity:

1. **The merge flag is not a git flag.** A worker or phase substituting the
   profile's `no-ff` into `git merge <merge flag> <branch>` runs an invalid
   command. This is on the ticket's own landing path and needs a resolver-level
   fix (render the flag with its dashes) plus a test, or the profile value
   changes to `--no-ff` and the vocabulary note from ticket 1 is amended.
2. **The phase-owned pre-merge gate is gone by construction.** No landing branch
   means nothing checks a merged ticket before it reaches the effort branch; the
   guarantee is now the chain's verify gate plus a post-merge CI gate. The ticket
   doc should say so in the operator's terms, since the previous behaviour was a
   deliberate guard.
3. **`flat` degrades the land host gate** to `test -f <ticketPath>`, which the
   chain has already proved, so a land step that does nothing passes. Real, but
   scoped to the profile that asks for no branches.

The API surfaces that moved (`tw_phase_brief`'s vocabulary, `PhaseBrief`'s two
new fields, the chain's three new args) are additive and already recorded in the
architecture, so they are not reasons for attention on their own.
