---
type: ticket
subtype: feature
title: implement-ticket owns the ticket phase and the inline close-out
status: deprecated
workflow_state: done
blocked_by:
- implementation-transition-tools
- disclosure-open-close-core
- opener-gate-and-toolsets
size: xl
---

## What to build

`implement-ticket`, the model-invoked skill that owns the implementation
phase, replacing the ticket half of `implement-task` and all of
`finalize-task`.

It reads the architecture document rather than drafting one: a missing or
unstable `architecture.md` (or the legacy `arch-spec.md`) is an opener
refusal, never a draft step. It owns the ticket frontier, the dependency
level loop, the per-ticket chain dispatch, the end-of-effort pass, the
failure toolbelt, and the inlined per-ticket close-out.

Ticket concurrency: tickets within one dependency level may run concurrently;
tickets across levels serialize on the level boundary. Running tickets from
different levels at once is out of scope unless the human asks explicitly.

The per-ticket close-out runs inline, in the same autonomous run that lands
the ticket: CI gate, knowledge harvest, changelog write, done-marking,
close-out, and merge to main. The human never waits to type
`/skill:finalize-task`. This phase stays the only thing that sets a ticket's
`workflow_state: done`, so the one-owner rule holds.

Ticket resources and the chain scripts move under `implement-ticket/`. The
duplicate planning resources under `implement-task/resources/` are deleted
(the planning half is Wayfinder's now). `implement-task` and `finalize-task`
are retired to `skills/deprecated/` with their replacements named, and they
leave `package.json` `pi.skills`, the bucket README, and the docs page tree.

## Acceptance criteria

- [ ] `implement-ticket` exists as a model-invoked skill and opens through
      `tw_open`.
- [ ] A missing or unstable architecture document is refused, never drafted.
- [ ] The ticket frontier, the level loop, concurrency within a level, and
      serialization across levels are the skill's stated behavior.
- [ ] The per-ticket close-out (CI gate, knowledge harvest, changelog,
      done-marking, close-out, merge) runs inline in the same run.
- [ ] Only this phase sets a ticket's `workflow_state: done`.
- [ ] Ticket resources and `ticket-chain.js`/`end-of-effort.js` live under
      `implement-ticket/`; the chain return shapes are unchanged.
- [ ] `implement-task` and `finalize-task` are retired with replacements
      named and are absent from `pi.skills`.
- [ ] `tests/skills.test.ts`, `tests/skill-rewire.test.ts`, and the chain
      tests are green.

## Blocked by

- implementation-transition-tools (ticket marking and the changelog writer).
- disclosure-open-close-core (the skill opens through `tw_open`).
- opener-gate-and-toolsets (the implement-ticket gate and toolset).

## Implementation notes

- Landed on `task/implement-ticket-skill` from `ticket/implement-ticket-skill`
  (merged `--no-ff` at 21416d2). The work is 75d4f1f (criteria 1-2 plus the
  move of the ticket resources and chain scripts under `implement-ticket/`,
  the retirement of `implement-task`/`finalize-task`, and the rewiring of
  `pi.skills`, the bucket READMEs, and the docs page tree), ab38efd
  (criterion 3: frontier, level loop, concurrency inside a level, strict
  level barriers), 4ff2988 (four acceptance pins in `tests/skills.test.ts`
  for the model-invoked registration, the script location, and the
  retirement surface), and 21416d2 (the two fixes below).
- Criteria 4-8 were already satisfied by 75d4f1f, so the continuation run
  verified them instead of re-implementing. The net new test code is those
  four pins; they are characterization for landed behavior, and the
  model-invoked pin was proved to bite by a temporary frontmatter mutation.
- The architecture-document refusal (criterion 2) is inherited, not new:
  the gate lives in `src/pi.ts` from `opener-gate-and-toolsets` and `src/`
  carries no diff on this ticket. What this ticket supplies is the prose
  that names it, plus the opener tests.
- Fixed after the deviation report, in 21416d2 (the report's first two
  findings were defects at 4ff2988, not outstanding work):
  - The close-out hardcoded `main` in the CI gate, the final merge, and the
    push, while the branch model thirty lines above already said the landing
    branch comes off the effort's starting branch. On an effort that lands
    anywhere other than `main`, the literal reading merges unfinished work
    into the published branch. The close-out now names `<effort-branch>`,
    defined as the branch the previous ticket landed on, in `SKILL.md`, both
    `autonomous.md` resources, and `report.md`.
  - The async-dispatch callout claimed tickets within a level run
    sequentially on a shared repo cwd, contradicting the level loop and the
    dispatch pseudocode eleven lines away. The claim is gone; concurrency
    inside a level is stated once.
- Still open for the end-of-effort pass (the deviation report's remaining
  findings, none of them blocking this phase):
  - `tw_mark_blocked` is disclosed to the implementation toolset but still
    refuses tickets (`src/pi.ts`), so that toolset carries a tool no artifact
    in the phase can use, and the failure toolbelt has no blocked-marking
    step. The spec deferred the widening, so leaving it disclosed is the one
    option it did not consider.
  - The one-owner rule holds for completion (the changelog precondition) but
    two other writers set `workflow_state: done`: `tw_mark_done` is also
    disclosed to `wayfinder`, and `tw_split_ticket` writes it on the
    superseded original. Neither is a completion path, so the guarantee in
    tickets 18 and 19 should be worded no stronger than the code.
  - Both chain scripts compose `docs/tasks/<effort>/architecture.md` while
    this effort's tree still holds `arch-spec.md` (`migrate-v4-to-v5` has not
    run here), so a dispatch against an unmigrated effort hands its workers a
    dangling path. Return shapes are unchanged, as the contract requires.
  - `FALLBACK_GATED_SKILL_NAMES` in `src/pi.ts` still names the two retired
    skills and omits `implement-ticket`. Pre-existing, untouched by this
    branch, and only reachable when `package.json` cannot be read.
- `handoff-enforced-workflow-v5.md` was already tracked on the landing branch
  and this ticket's branch added four session-pickup commits to it. It landed
  as it stands; trimming session state out of it belongs to the end-of-effort
  / `docs-resync` pass, not to this merge.
- Verification at 21416d2: full suite green (18 files, 1095 tests, down 4 from
  the 1099 baseline through retirement churn only, accounted file by file),
  `tsc --noEmit` clean. No linter is configured in this repo, so typecheck is
  the static gate. `node_modules` was stale (0.80.10 against the lockfile's
  1.0.0) and needed `npm ci` before anything could run.
- The deviation report at `deviation-reports/implement-ticket-skill.md` is
  folded into the landing docs commit. Acceptance checkboxes are left
  unticked, matching every other landed ticket in this effort.