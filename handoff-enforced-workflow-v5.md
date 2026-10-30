# Handoff: enforced-workflow-v5, paused mid-ticket (implement-ticket-skill)

> Written 2026-10-30 ~18:15 CET from the paused session, per the user's
> stop-and-handoff instruction. This file replaces the effort-start handoff.
> Disposable transit document; delete or archive once picked up.

## What this is

The effort `enforced-workflow-v5` (20 implementation tickets over a v4-shaped
workflow package) is paused mid-ticket: **16 of 20 tickets landed and pushed**,
the 17th (`implement-ticket-skill`, size xl) is partially implemented on the
**local branch `ticket/implement-ticket-skill`** (pushed for this handoff),
and the user asked to stop here. A fresh session should finish that ticket,
land it, then run the last three tickets, then the end-of-effort pass.

## Live state (verified, not assumed)

- Repo: `/home/patric/Projects/skills-stricter-workflow`, a git **worktree**
  of `/home/patric/.pi/agent/git/github.com/Y4shin/skills`. The
  `stricter-workflow` branch sits at `4693059` (`docs(ticket): land
  to-spec-rescope`) and is pushed. Working tree clean; HEAD in the worktree is
  on the local `ticket/implement-ticket-skill` branch (created from
  `origin/ticket/implement-ticket-skill`).
- Paths in this document are for this machine. An earlier copy was written on
  `/home/pplattner`; if you are reading that copy, substitute your own clone
  path everywhere.
- Landed today (each on its own `task/<slug>` branch, `stricter-workflow`
  fast-forwarded and pushed after each): `intake-skill` (tip `9eed462`;
  includes a clean merge of main's `d75332b`), `to-spec-rescope`
  (tip `4693059`). Last full-suite green: **1099/1099 across 18 files**,
  typecheck clean (the to-spec-rescope verify step). No linter exists in the
  repo; that is normal, not a defect.
- In flight: `ticket/implement-ticket-skill` at `5c388aa`, five commits on
  top of `4693059` (two wip commits plus three handoff-doc commits):
  - `75d4f1f` (criterion 1+2): `implement-ticket` exists as a model-invoked
    skill opening through `tw_open`; missing/unstable architecture refused,
    never drafted. This commit is big — it also folds in the killed first
    attempt's arrangement: the full move of resources and
    `scripts/ticket-chain.js`+`end-of-effort.js` under
    `skills/engineering/implement-ticket/`, both retirements
    (`implement-task`, `finalize-task` → `skills/deprecated/`), and the
    rewiring of `package.json` `pi.skills`, both READMEs, docs pages, agent
    definitions, and `docs/workflow-flows.md` (47 files total across the
    branch, ~1240 insertions).
  - `ab38efd` (criterion 3): frontier, level loop, and concurrency are the
    stated behavior; planning routes back to wayfinder.
- The state pointer `docs/tasks/state.yaml` on this branch reads
  `task: to-spec-rescope` (the dispatcher's later edit was discarded by some
  worker git call; it is cosmetic — nothing in the chain reads it — but set it
  via `tw_state_set task <slug>` or an equivalent one-line edit before each
  dispatch, per convention; the land step's `git add docs/tasks/` commits it).
- Remaining tickets after this one: `overview-doctor-rescope` (size m),
  `finalize-effort-skill` (size l), `docs-resync` (size l, blocked by all
  others). Then the end-of-effort pass.

## Immediate next step

**Re-dispatch the tdd step for `implement-ticket-skill`, budget 90 minutes
(+50%, third attempt), continuing from the committed state.** Do NOT restart
from a clean slate — criteria 1-3 are committed; the branch and its
arrangement are the prior attempts' work.

The exact invocation shape that worked (this session's direct dispatch;
see "why not the chain script" below):

```
subagent({
  async: true,
  cwd: "/home/patric/Projects/skills-stricter-workflow",
  // no model override on this machine: omit `model` to inherit the
  // default (deepseek/deepseek-flash per ~/.pi/agent/settings.json)
  agent: "tdd-worker",
  options: {
    skill: "tdd",
    timeoutMs: 5400000,
    gate: "test ! -f docs/tasks/enforced-workflow-v5/tickets/implement-ticket-skill/.work/uncertainty.md && git rev-parse --verify refs/heads/ticket/implement-ticket-skill"
  },
  task: <featureTddTask composition from the chain script — see below>
})
```

The task text is the chain script's own `featureTddTask()` composition:
`Implement ticket "implement-ticket-skill" for effort "enforced-workflow-v5".`
plus the ticket doc path, the arch spec pointer
`docs/tasks/enforced-workflow-v5/arch-spec.md` (**not** `architecture.md` —
this effort is v4-mode and its real file is `arch-spec.md`; the moved script's
composed pointer says `architecture.md`, which does not exist in this tree),
the uncertainty anchor, and the carried constraints + a PRIOR ATTEMPT pointer.
The original session's artifact ids (`4f77a8ea-*`) do not exist on this
machine, so recompose the pointer from the ticket doc plus arch-spec entry 17:
name the existing `ticket/implement-ticket-skill` branch, say criteria 1-3 are
committed, and tell the worker not to `git checkout -b` but to build on the
checked-out tree.

Remaining acceptance criteria to implement (from the ticket doc):
inline close-out (CI gate, knowledge harvest, changelog through
`tw_write_changelog`, done-marking, close-out, merge — the human never runs
`/skill:finalize-task`); the one-owner `workflow_state: done` rule; whatever
retirement wiring is still missing; `tests/skills.test.ts`,
`tests/skill-rewire.test.ts`, and the chain tests green.

Then verify + deviation in parallel, then land — the compositions, gates,
and the land-repair pattern are all described below.

## Why not the chain script (read this first)

The chain script moved to
`skills/engineering/implement-ticket/scripts/ticket-chain.js` (return shapes
unchanged; it now composes an `architecture.md` pointer — see the v4-mode
caveat above). It still works, BUT under **pi-subagents 0.84** (the globally
installed version this session's harness loaded, at
`~/.pi/agent/npm/node_modules/pi-subagents`) two things break chains:

1. **The gate child is a coin flip.** Roughly half the time it emits ONLY
   the acceptance-report fence as its final message (no `VERDICT: PASS`
   first line), the acceptance layer strips the block, and the chain's
   `verdict()` check reads empty output → `failed: "gate"` even though the
   preconditions passed in substance (observed 4 consecutive substance
   passes, 2 clean + 2 fence-only). Re-rolling the chain just re-rolls the
   coin.
2. **The deviation step always fails its envelope** (fork-context child
   inherits the parent session's virtual model `requesty-routed/glm-5.3`
   instead of the launch override → `model_verification_failed`), aborting
   the chain before land even though the deviation report is written and
   clean.

The worked alternative (used successfully for `intake-skill` and
`to-spec-rescope`): **dispatch the chain's steps directly**, using the
script's own task compositions (`featureTddTask`, `verifyTask`,
`deviationTask`, `landTask` — identity + pointers only, never author worker
procedure) and its host gates via `options.gate`. Put `timeoutMs` inside
`options` (milliseconds): async workflows have **no default parent deadline**,
so always set one. Version facts as verified on this machine: the globally
installed pi-subagents is `0.84.0`, and the repo's `node_modules` holds
`0.34.0` (the earlier "0.76 runs clean end-to-end" note is stale; do not count
on that path, use the direct dispatch).

## The other failure modes this session hit (all real)

- **Killed chains leave STAGED files; children refuse to launch over a dirty
  index** ("Acceptance rejected: Staged files present"). Repair: `git reset`
  (unstage only, working tree keeps everything), then re-dispatch. Unstaged
  modifications and untracked files are tolerated by children; a staged
  index is not.
- **Timeouts killed healthy chains twice** (60m budget both times). The
  work survives because the tdd-worker commits per criterion; every retry
  resumes from the last green checkpoint — pass a PRIOR ATTEMPT pointer that
  names the existing branch (tell it NOT to `git checkout -b`) and tells it
  to re-use the working tree.
- **The acceptance layer requires every child's FINAL message to end with a
  fenced JSON block tagged `acceptance-report`** (the parser reads only the
  final message, not output files). Include that line in task texts.
- **Land-repair pattern** (after the deviation envelope failure): dispatch
  one `land-worker` child with `landTask`'s composition (ticket doc + TDD
  output path + verify output path, pointing at the retention-managed
  outputs under `~/.pi/agent/sessions/<session-dir>/subagent-artifacts/`),
  plus a state pointer naming the uncommitted dirt to fold into the docs
  commit (typically: the deviation report the deviation child wrote
  uncommitted, and the `state.yaml` pointer edit). The land-worker creates
  `task/<slug>` off the previous landing tip, merges, deletes the ticket
  branch, appends the implementation note, commits. It may decide to merge
  `main` in if main diverged (it did for intake-skill; clean, benign).
- After each landing: `git checkout stricter-workflow && git merge --ff-only
  task/<slug> && git push origin stricter-workflow`. Landing branches stay
  local unless asked.

## Operational rules the user set (this effort)

- Push discipline: push after milestones and at minimum when pausing; the
  per-ticket `task/*` landing branches stay local unless asked.
- The user reads compact status summaries; per-ticket detail is durable in
  the child outputs and ticket docs, not in chat.
- Model override: none is in force on this machine. `requesty/sference/glm-5.3-flash`
  was a one-session choice on another host and is not configured here, so
  workers inherit the session default (`deepseek/deepseek-flash`). Re-introduce
  an override only if rate limits actually bite.

## After the remaining tickets

All 20 land, then run the end-of-effort pass:
`skills/engineering/implement-ticket/scripts/end-of-effort.js` (moved there
by this ticket) with `args: { effort: "enforced-workflow-v5", startingBranch:
"2ab1cc9", inconsistencies: <composed from the accumulated deviation
reports>, optionalTests: <per docs/testing.md> }`. The inconsistency list
must include at least (from the deviation reports and the arch spec's open
risks): wayfinder's stale by-hand creation prose (now refused by the write
guard), `CONTEXT.md`'s v4 vocabulary, the onboard branch's `docs/bugs/`
scaffold, v4-sounding prose in `docs/workflow-flows.md`, the doctor/overview
skills, and any API drift the remaining tickets report. `2ab1cc9` is the
pre-effort commit ("docs(effort): add the architecture spec and the v5
ticket graph"). Note: `intake-skill`'s landing folded main's `d75332b` into
the effort, so the end-of-effort diff includes those three small
implement-task prose fixes too.

## Unverified beliefs (treat as beliefs, not facts)

- Criteria 4-8 of `implement-ticket-skill` are NOT started in any committed
  form (belief from commit messages; the two wip commits may contain partial
  groundwork — the big first commit folded an unreviewed killed attempt).
- The suite state on `ticket/implement-ticket-skill` is unknown (last
  verified green was 1099/1099 on the to-spec-rescope landing; the ticket
  branch rewrote large parts of `tests/skills.test.ts`). The next tdd
  continuation runs the suite as its step 4; expect it to surface whatever
  the killed attempts left half-done.
- The cause of the `state.yaml` pointer revert on the ticket branch is
  unknown (some worker's git call discarded the unstaged edit); harmless,
  but expect the pointer to lag.
- The remaining three tickets can be dispatched in the order given without
  additional carries beyond their ticket docs and arch-spec entries 18-20.
- The end-of-effort pass is unexercised on this effort.

## Gotchas learned the hard way (all bit at least once)

- The project directory is a **git worktree**, not a checkout. A land-worker
  once resolved a `git branch -d` failure with `git worktree remove --force`
  and deleted the project directory (twice, per the prior handoff).
  Recovery: from the main repo, `git worktree add
  /home/patric/Projects/skills-stricter-workflow stricter-workflow`, then
  `npm ci` (node_modules do not survive). All refs survive; only the stale
  `docs/tasks/state.yaml` working-tree edit is lost.
- After worktree recreation, a first `npx vitest run` may fail on missing
  node_modules; `npm ci` fixes it (~3 minutes).
- The deviation-reporter sometimes records its note as a separate
  `implementation-notes.md` instead of the ticket doc's
  `## Implementation notes` section; the landing convention is the in-doc
  section — tell the land step to normalize.
- `tw_*` tools resolve the tree from the session cwd; a session started
  outside the repo cannot use them against this repo (they would create a
  bogus `docs/tasks` at the session cwd). Dispatch repo-bound work from
  `cwd: /home/patric/Projects/skills-stricter-workflow`, and for
  one-line `state.yaml` pointer edits fall back to a direct edit (no
  write-guard is active while the repo runs v4 mode).
- `ticket/disclosure-open-close-core` is a stale leftover branch from before
  this effort's landing discipline; ignore it (it predates the landing-branch
  convention and is not checked out anywhere).
- A rate limit on the requesty provider once killed a chain (key fragment
  not repeated here); the model override above is the standing fix.

## Suggested skills

- `implement-task` (model-invoked; its feature resource describes the
  pipeline — but note this effort's own scripts now live under
  `implement-ticket/`, and this handoff's direct-dispatch pattern).
- `task-workflow-doctor` (model-invoked) if the tree looks inconsistent on
  pickup (missing CONTEXT.md, a legacy tree, an opener refusal needing
  routing).

## Reference, do not copy

- Effort tree: `docs/tasks/enforced-workflow-v5/` (map, spec, arch-spec,
  20 ticket dirs, per-ticket deviation reports under
  `tickets/<slug>/deviation-reports/`).
- Arch spec (living contract, reconciled through ticket 16):
  `docs/tasks/enforced-workflow-v5/arch-spec.md` — per-ticket entries 15-20
  cover everything remaining.
- The chain script's task compositions and gates (now the source of truth
  for direct dispatches): `skills/engineering/implement-ticket/scripts/
  ticket-chain.js`.
- Remote: `https://github.com/Y4shin/skills`, branch `stricter-workflow`
  (landing history) plus `ticket/implement-ticket-skill` (this handoff's
  in-flight state).

## Redaction

No secrets in this document. A provider API key id fragment appears in old
session logs and is deliberately not repeated here.
