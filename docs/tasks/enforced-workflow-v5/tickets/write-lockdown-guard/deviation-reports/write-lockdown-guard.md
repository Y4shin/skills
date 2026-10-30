---
type: deviation report
title: Deviation report for write-lockdown-guard
status: stable
---

## Deviation report: write-lockdown-guard

> Retry context: the first attempt's implementation passed verification and
> deviation review, but its land was rolled back (the land step merged into
> the previous landing branch instead of creating `task/write-lockdown-guard`,
> so the chain's land gate refused and the landing branch was reset to
> `960e623`). The ticket branch `7eb62d6` survived intact and the retry run
> re-verified it rather than re-implementing: same five wip commits, same
> diff, all six criteria re-confirmed against code, and the tests re-proven
> live (disabling the handler registration makes 5 guard tests fail; enabled,
> 26/26 pass). The land failure is a workflow event, not a code deviation;
> the deviation content below is unchanged from the first attempt, plus the
> retry notes.

### API surface changes
- **Planned:** per the arch spec's interface contract (entry 4), this ticket
  "exports a `tool_call` guard for `write`/`edit` under `docs/tasks/**`".
  A guard hook, not a named tool: no new `tw_*` surface, no skill prose.
- **Actual:** exactly that was built. `guardTaskTreeWrites` is registered as
  a `tool_call` handler in `src/pi.ts`'s personal-repo branch
  (`if (!gate.active)`), backed by `isTaskTreePath` (relative paths resolved
  against the session cwd, absolute taken as given, both normalized so
  `..` traversal resolves before the containment check; a sibling such as
  `docs/tasks-archive` does not match). The refusal reason names the lockdown
  and points at the matching `tw_*` tool. No tool was added, removed, or
  re-scoped; no export changed. The only surface delta is one more hook
  registration.
- **Impact:** none on dependent tickets. The downstream tickets that interact
  with the guard are `disclosure-open-close-core` and
  `opener-gate-and-toolsets`, and both rely on exactly the property the spec
  named: the guard is a hook, independent of the active tool set, so it
  blocks while their toolsets are open. Nothing they consume changed.

### Abstraction usage
- Used/was specified: **yes**. The guard lives in `src/pi.ts`, the single
  extension entry, as the arch spec requires ("the new opener, closer, named
  transition tools, guard, and pack/unpack helpers extend this file").
  Path resolution reuses the file's existing `findRoot`/`taskRoot` helpers
  rather than adding a parallel root-finder. Tests live at the pinned seam
  `tests/gate-factory.test.ts`, which the spec names for tool contracts
  ("extend it, do not replace it").

### Out-of-scope changes
- **`docs/repo-gating.md` gained a section** ("Write lockdown on docs/tasks
  (personal repos)"). The ticket required a "residual-risk note in the
  boundary documentation" but pinned no location; the arch spec pins none
  either. The implementer chose `docs/repo-gating.md`, the existing
  enforcement-boundary document the gate tests already treat as the stable
  reference. This is a judgment call, recorded here; if a different home was
  intended, the section moves in one piece. Not a scope change in substance:
  the ticket's criterion 5 is satisfied and pinned by a test asserting its
  stable phrases.
- **Guard scope limited to personal repos.** The ticket and spec do not say
  where the guard registers. The implementer scoped it inside the
  personal-repo branch because the `tw_*` tools it protects exist only
  there and `docs/repo-gating.md` documents that work repos get none of the
  package's active machinery. A deliberate call, not drift; a work-repo
  guard would be a one-line move, but today it would be dead code.
- Nothing else: no skill prose touched, no tree files mutated outside the
  three changed files (`src/pi.ts`, `tests/gate-factory.test.ts`,
  `docs/repo-gating.md`).
- Retry note: the land rollback and branch repair were orchestration-level
  state repairs by the parent, not content changes; no additional files
  were touched by this run.

### TDD honesty
- Only criteria 1 and 5 had genuinely failing-first runs. The tests for
  criteria 2, 3, and 4 passed on their first run because the minimal
  criterion-1 implementation (a containment-based hook) already satisfies
  them; they pin the allow direction, set-independence, and bash passthrough
  against regression rather than driving new code. Criterion 3's "toolset is
  open" is simulated at the factory seam by replacing the stub's active set,
  because `tw_open` and the toolset registry belong to later tickets
  (`disclosure-open-close-core`, `opener-gate-and-toolsets`); those tickets
  get the real version of the proof for free, since the guard is a hook and
  cannot depend on the active set.

### Ticket doc update needed?
- **No.** The ticket's acceptance criteria are all met as written; nothing in
  `## Implementation notes` needs correcting. The two judgment calls above
  (doc location, personal-repo scope) are recorded in this report and in the
  ticket's implementation note if the lander appends one; they are not
  spec-level deviations.

### User attention needed?
- **No.** Scope did not change and no API surface differs from the spec.
  The two judgment calls are narrow, reversible, and documented; neither
  alters what dependent tickets consume.

### Verification snapshot
- `npx vitest run tests/gate-factory.test.ts`: 26 passed (blocked matrix:
  write and edit, relative, absolute, `..`-traversal; allowed matrix:
  `docs/bugs/**` relative and absolute, `src/index.ts`, `README.md`,
  another-repo path, the sibling `docs/tasks-archive/notes.md`;
  toolset-independence; bash passthrough; doc-note assertions).
- Liveness proof: with the handler registration temporarily disabled, 5
  guard tests fail; restored, 26/26 pass. The tests exercise the real
  handler.
- `npm test` (full suite): 15 files, 815/815 passed.
- `npm run typecheck`: clean.
- No bash command-string scan exists anywhere in `src/` (grep-confirmed);
  bash and `read` on the tree pass unblocked.

### Residual risks
- A determined shell command can still mutate `docs/tasks/**` through bash
  (`rm`, `git`, `python -c`); accepted and documented in
  `docs/repo-gating.md` per the ticket, not defended.
- Matching is normalized string containment, not `realpath`: a symlink from
  outside the tree pointing into `docs/tasks` would not be blocked. This
  mirrors how the built-in tools treat the given path.
- Relative paths resolve against the handler's `ctx.cwd`. In pi 1.0.0 both
  are the session cwd; a mid-session divergence would judge a relative path
  against the wrong base, but none is observed.
- Work repos get no guard by the gating contract. If a work repo ever
  carries a `docs/tasks` tree, nothing blocks write/edit there; the
  repo-gating doc records the scope.

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Branch ticket/write-lockdown-guard (7eb62d6) re-verified on retry: 26/26 ticket tests, 815/815 full suite, typecheck clean; all six ticket criteria confirmed against code and tests; gate preconditions hold (no .work/uncertainty.md, branch ref exists)"
    }
  ],
  "changedFiles": [
    "src/pi.ts",
    "tests/gate-factory.test.ts",
    "docs/repo-gating.md"
  ],
  "testsAddedOrUpdated": [
    "tests/gate-factory.test.ts"
  ],
  "commandsRun": [
    {
      "command": "npx vitest run tests/gate-factory.test.ts",
      "result": "passed",
      "summary": "26/26 tests pass on the ticket branch"
    },
    {
      "command": "npx vitest run tests/gate-factory.test.ts (with handler registration disabled)",
      "result": "failed",
      "summary": "Liveness proof: 5 guard tests fail without the handler, proving the tests exercise the real guard"
    },
    {
      "command": "npm test",
      "result": "passed",
      "summary": "Full suite: 15 files, 815/815 tests passed"
    },
    {
      "command": "npm run typecheck",
      "result": "passed",
      "summary": "tsc --noEmit clean"
    }
  ],
  "validationOutput": [
    "tests/gate-factory.test.ts: 26 passed (26)",
    "npm test: 15 files, 815 passed (815)",
    "typecheck: exit 0",
    "git: branch 7eb62d6, merge base with task/schema5-artifact-model = 960e623 (landing HEAD), working tree clean, 0 staged files",
    "gate preconditions: no .work/uncertainty.md; refs/heads/ticket/write-lockdown-guard resolves"
  ],
  "residualRisks": [
    "A determined shell command can still mutate docs/tasks/** through bash; accepted and documented in docs/repo-gating.md per the ticket, not defended",
    "Path matching is normalized string containment, not realpath: a symlink from outside the tree into docs/tasks would not be blocked",
    "Relative paths resolve against ctx.cwd (the session cwd in pi 1.0.0); a mid-session cwd divergence would misjudge relative paths",
    "Work repos get no guard per the repo-gating contract; a work repo carrying a docs/tasks tree would be unguarded"
  ],
  "noStagedFiles": true,
  "diffSummary": "vs landing branch 960e623: 3 files, +224/-1. src/pi.ts: guardTaskTreeWrites/isTaskTreePath tool_call handler registered in the personal-repo branch, no bash scan. tests/gate-factory.test.ts: blocked/allowed matrices, toolset-independence, bash passthrough, doc-note assertions. docs/repo-gating.md: write-lockdown section with the accepted residual risk",
  "reviewFindings": [
    "no blockers"
  ],
  "manualNotes": "Retry of a failed land: the prior implementation was complete and verified, but the land step merged into the previous landing branch instead of creating task/write-lockdown-guard, and the rollback erased the in-repo copy of this deviation report; this run re-created it unchanged plus retry context. Divergences worth a look at land time: the residual-risk note's home (docs/repo-gating.md) and the personal-repo-only guard scope were unpinned judgment calls, both documented and reversible."
}
```
