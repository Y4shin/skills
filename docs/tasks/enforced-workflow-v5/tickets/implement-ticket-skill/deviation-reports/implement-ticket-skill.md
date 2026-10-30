---
type: deviation report
title: Deviation report for implement-ticket-skill
status: stable
---

## Deviation report: implement-ticket-skill

### API surface changes

- **Planned:** ticket concurrency is "tickets within one dependency level may
  run concurrently; tickets across levels serialize on the level boundary"
  (`ticket.md`, arch-spec entry 17, `SKILL.md:53`).
- **Actual:** `SKILL.md:53` and
  `resources/feature/autonomous.md:66,92,120` state concurrency, but the same
  resource's async-dispatch note (`resources/feature/autonomous.md:42-43`)
  says the opposite: "tickets within a level run sequentially on a shared repo
  cwd, so there is no parallel work meanwhile." The two statements sit eleven
  lines apart in one file.
- **Impact:** on ticket 19 (`overview-doctor-rescope`) and ticket 20
  (`docs-resync`) only as prose they must not propagate, and on the
  end-of-effort coherence pass, which should settle the contradiction. No code
  depends on it, so the ambiguity costs a correct read, not a bad write.

- **Planned:** the landing branch is "the branch the previous ticket's chain
  landed on (the effort's starting branch, typically main)"
  (`resources/feature/autonomous.md:55`), and `end-of-effort.js` takes that
  branch as `startingBranch`.
- **Actual:** the close-out hardcodes `main` in the CI-gate merge
  (`SKILL.md:171`, `feature/autonomous.md:184`, `bug/autonomous.md:94`), the
  final merge (`feature/autonomous.md:216-222`, `bug/autonomous.md:130-133`),
  and the push (`feature/autonomous.md:225`, `bug/autonomous.md:135`).
- **Impact:** this effort lands on `stricter-workflow`, not `main`, so a
  close-out followed literally would merge every ticket into `main`. Ticket 18
  (`finalize-effort-skill`) already carries the `startingBranch` concept and
  should get the same parameter threaded through the close-out.

- **Planned:** arch-spec entry 17 says the toolset discloses `tw_mark_blocked`,
  and that this ticket widens its scope "if the prose has implement-ticket
  block a ticket".
- **Actual:** the registry discloses it (`src/disclosure.ts:159`), the tool
  still refuses tickets (`src/pi.ts:2033-2050`, "tickets (this marks planning
  tasks)"), and the prose never invokes it anywhere in
  `skills/engineering/implement-ticket/`.
- **Impact:** the implementation toolset exposes a tool that refuses every
  artifact reachable from that phase. The conditional in the contract was not
  triggered, so this is compliant, but it leaves dead surface and gives the
  failure toolbelt no blocked-marking step.

- **Planned:** "Only this phase sets a ticket's `workflow_state: done`"
  (acceptance criterion 5).
- **Actual:** the changelog precondition (`src/pi.ts:699-720`) does make this
  phase the only *completer*, but two other writers exist. `tw_mark_done` is
  also disclosed to `wayfinder` (`src/disclosure.ts:98`) and resolves a ticket
  when the changelog already references it; `tw_split_ticket` writes
  `workflow_state: done` on the superseded original (`src/pi.ts:1967-1971`)
  and is disclosed to `to-tickets` (`src/disclosure.ts:117-140`).
- **Impact:** tickets 18 and 19 must not document a stronger guarantee than
  the code gives. The split path is a retirement, not a completion, so the
  practical risk is small; the wayfinder path depends on a changelog entry
  that only this phase can create.

- **Planned:** entry 17 exports the moved chain scripts with their return
  shapes unchanged.
- **Actual:** both scripts compose `docs/tasks/<effort>/architecture.md`
  (`ticket-chain.js` `featureTddTask`/`deviationTask`, `end-of-effort.js`
  `specTask`/`coherenceTask`). This effort's document is still `arch-spec.md`
  because `migrate-v4-to-v5` has not run here, so the composed pointer
  resolves to nothing in this tree. Return shapes did not change: the
  `end-of-effort.js` and `ticket-chain.js` diffs are comments, prose pointers,
  and the renamed arch pointer only.
- **Impact:** every chain dispatched against an unmigrated effort hands its
  workers a dangling path. The agent definitions name the legacy file
  alongside it, so the workers recover; it still forced a hand-corrected
  dispatch for this very ticket.

### Abstraction usage

- Used/was specified: **yes**. The skill opens through `tw_open` against the
  `implementation` gate (`src/disclosure.ts:141-161`), works the frontier
  through `tw_frontier` / `tw_dependency_levels`, writes the changelog through
  `tw_write_changelog`, marks done through `tw_mark_done`, splits through
  `tw_split_ticket`, resolves uncertainties through `tw_resolve_uncertainty`,
  and dispatches the pre-canned chain scripts. No new abstraction was
  invented.
- The architecture gate (missing or unstable document refused, never drafted)
  is `src/pi.ts:1058-1090`, landed by `opener-gate-and-toolsets`. This ticket
  added only the prose that names it: `git diff 4693059..HEAD -- src/` is
  empty. Criterion 2 therefore holds by inheritance, not by new code.

### Out-of-scope changes

- `CONTEXT.md`, `docs/workflow-flows.md`, top-level `README.md`,
  `docs/testing.md`, and several `docs/engineering/` pages were revised to v5
  vocabulary. Ticket 20 (`docs-resync`) owns exactly those files, so this
  narrows its remaining work rather than conflicting with it, and the
  end-of-effort incoherence list should not list them again as drift.
- Six `agents/*.md` definitions reworded from "arch spec" to "the
  architecture document". Expected retirement wiring.
- The planning resources the ticket says to delete under
  `implement-task/resources/` were already gone before this ticket
  (`wayfinder-reconcile-and-passes` removed them), so no deletion happened
  here.
- `skills/deprecated/finalize-task/` keeps `resources/report.md` while
  `skills/deprecated/implement-task/` keeps none. Cosmetic asymmetry.
- `FALLBACK_GATED_SKILL_NAMES` (`src/pi.ts:53-58`) still names
  `implement-task` and `finalize-task` and omits `implement-ticket`. This is
  pre-existing and untouched by the branch (`src/` has no diff), it only fires
  when `package.json` cannot be read, and it is unrepaired retirement wiring.
- Four handoff commits (`e8d3b60`, `43792a7`, `5c388aa`, `12eab06`) ride on
  the ticket branch. The handoff is disposable transit and should be dropped
  or archived at landing rather than shipped into the landing branch.

### Ticket doc update needed?

**Yes.** Append to `## Implementation notes`:

- Criteria 4-8 were already satisfied by `75d4f1f`; this continuation verified
  instead of re-implementing, and the net code change is four acceptance pins
  in `tests/skills.test.ts` (`4ff2988`).
- The concurrency contract contradicts itself inside
  `resources/feature/autonomous.md` and needs one statement, not two.
- The close-out hardcodes `main`; this effort lands on `stricter-workflow`.
- `tw_mark_blocked` is disclosed to a phase that cannot use it.
- The scripts compose `architecture.md` in a tree that still has
  `arch-spec.md`.

### User attention needed?

**Yes**, on two points:

1. The concurrency contradiction and the hardcoded `main` are behavioral
   contract defects that tickets 18 and 20 inherit. They are cheap to fix now
   and expensive to leave as inherited prose.
2. `tw_mark_blocked` in the implementation toolset is a design decision the
   spec deliberately deferred: widen the tool to accept tickets, or drop it
   from the toolset. Leaving it disclosed is the one option the spec did not
   consider.
