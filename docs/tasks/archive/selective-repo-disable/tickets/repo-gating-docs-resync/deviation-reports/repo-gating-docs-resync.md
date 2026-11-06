---
type: deviation report
title: Deviation report for repo-gating-docs-resync
status: stable
---

## Deviation report: repo-gating-docs-resync

Reviewed against `docs/tasks/selective-repo-disable/architecture.md` (the
settled facts, the docs seam, and the per-ticket contract
"repo-gating-docs-resync delivers") and the ticket doc's acceptance criteria,
comparing `main..ticket/repo-gating-docs-resync` (019c482..336677b, three
commits; five files: `docs/repo-gating.md`, `src/pi.ts`,
`tests/gate-factory.test.ts`, `README.md`,
`skills/engineering/skill-creator/references/target-pi.md`; no `task/`
branch exists, the branch builds directly on main at 019c482). Verification
re-run for this report: gate-factory 46/46 (39 carried from the previous
ticket plus the 7 new doc-content tests); full suite 31 failed | 1345 passed
(1376), failure set matching main's documented node_modules version-skew and
`.venv`-corpus environmental baseline; the pi-subagents claim re-corroborated
against the vendored pi-subagents 0.34.0 source (`buildPiArgs` in
`src/runs/shared/pi-args.ts:137` forwards the tools list as pi's `--tools`,
and no availability assertion exists anywhere in the foreground or background
launch path).

### API surface changes

- **The pi-subagents launch-failure claim: the settled fact was false; the
  ticket's "corrected" arm was taken.**
  - **Planned:** the architecture records as settled fact that "pi-subagents
    refuses to launch a child whose allowlisted tool is unavailable", and the
    ticket verifies the claim against the pi-subagents source, then confirms
    or corrects the entry point's warning wording.
  - **Actual:** verified false, against the vendored source (0.34.0:
    `buildPiArgs` forwards the `tools` list as pi's `--tools`; no
    availability assertion in the launch path) and empirically (pi 1.5.0:
    `pi --tools totally_bogus_tool` exits 0 with an empty tools section; pi
    silently ignores allowlisted names that never register). The real shape:
    the child still launches, the missing tool is absent, and a child's
    `tw_feedback` call fails at call time, so the feedback row is lost, not
    the chain. The session-start warning in `src/pi.ts` no longer says
    "pi-subagents fails a child ... so the ticket chain will not launch"; it
    states the verified shape, keeping the pinned "allowlist" wording and the
    install command. The correction propagated to `README.md`, a new
    "Subagent launch behaviour (verified against the pi-subagents source)"
    section in `docs/repo-gating.md`, the stale comment on
    `GATED_REGISTERED_TOOLS`, and both peer-warning tests (now asserting
    `/still launches/` and `not /will not launch|fails a child/`).
  - **Impact:** no dependent tickets forward (this is the effort's terminal
    ticket). Backward: the architecture's justification line for unconditional
    `tw_feedback` registration ("pi-subagents refuses to launch a child") is
    now known false. The registration decision still stands on its own (10 of
    11 shipped allowlists name `tw_feedback`, and children do launch in gated
    repos), but the close-out CHANGELOG must not repeat the failed-launch
    story, and a user-visible warning changed meaning: from "the ticket chain
    will not launch" to "the chain runs, but each child's `tw_feedback` call
    fails".
- **The resync itself: no deviation.** The doc states the registered surface
  as the previous tickets pinned it: the tool-registration split (passive
  `tw_open`/`tw_close`/`tw_feedback` plus skill-creator's `skill_validate`/
  `skill_scaffold`/`skill_discover` registered inactive plus `notify_user`;
  writers and the dispatcher companions `tw_next`/`tw_request_tool`
  unregistered), the 10-name manifest named explicitly, the `tw_open`
  restriction (offered surface plus runtime refusal in the refused-outcome
  shape), the write lockdown re-keyed to its own "workflow enabled"
  condition, the `/help` limitation re-scoped to the ten, and the
  classification contract re-stated as unchanged. All per the contract's
  "strip set, passive tools, tw_open restriction, lockdown condition,
  re-scoped /help limitation".

### Abstraction usage

- Used/was specified: yes.
  - The doc describes the registered surface the prior tickets' tests pin
    rather than re-deriving it, and the seven new doc-content tests read
    `docs/repo-gating.md` at the docs seam next to the two pre-existing
    doc-content tests, extending the gate-factory file instead of inventing a
    second fixture style.
  - The warning correction is surgical: the test-pinned strings ("allowlist",
    the install command) survive; only the false sentence changed shape.
  - The doc absorbed the previous ticket's handed-forward notes in
    substance: the refusal covers the whole manifest (including the three
    names with no registry entry), and the two rough-edge candidates (an
    unknown non-manifest name reveals the 8-entry registry list;
    `tw_close`'s idle hint is imprecise in gated repos) landed as
    known-limitation notes.
  - The Background section now cites both the archived gate effort map and
    this effort's `architecture.md` as the two design records.

### Out-of-scope changes

- `src/pi.ts`: beyond the mandated warning rewrite, the stale comment on
  `GATED_REGISTERED_TOOLS` ("which pi-subagents checks at launch") was
  corrected with the verified behavior and version. Comment-only; no
  behavior change beyond the warning string.
- `tests/gate-factory.test.ts`: seven new doc-content tests pin the resynced
  narrative. The arch contract said verifiability comes from "the doc matches
  the registered surface that ticket two and three's tests pin"; the
  implementation added its own pinning tests instead, consistent with the
  file's existing doc-content test convention. Both pre-existing peer-warning
  tests were re-pinned to the corrected shape.
- `README.md`: the peer-package paragraph ("pi-subagents fails a child ...
  the chain stops at its first gate") and the "Work repos" paragraph ("It
  disables itself") corrected, and the `/help` limitation re-scoped (AC4: no
  other repo documentation contradicts the resynced gate).
- `skills/engineering/skill-creator/references/target-pi.md`: the "The repo
  gate" section no longer claims skill-creator inherits the gating or that a
  produced skill "will not load in work repos"; excluding a skill from work
  repos is now described as a settled manifest change (also AC4).
- Nothing removed; no CHANGELOG entry (the arch spec places it at ticket
  close-out); `docs/tasks/state.yaml` was left modified and uncommitted by
  the orchestrator's tracker pointer, not part of the ticket's commits.

### Ticket doc update needed?

Yes. The ticket has no `## Implementation notes` section yet; create it and
append:

- The verification outcome and its direction: the claim was false
  (pi-subagents 0.34.0 does no launch-time allowlist check; pi silently
  ignores unknown `--tools` names; empirically `pi --tools totally_bogus_tool`
  exits 0 with an empty tools section), so the correction arm was taken; the
  real cost is the feedback row, not the launch.
- The files touched beyond `docs/repo-gating.md` and why (AC3: `src/pi.ts`
  warning plus comment; AC4: `README.md`, `target-pi.md`; tests: both
  peer-warning tests re-pinned, seven doc-content tests added).
- The two rough edges landed as known-limitation notes, and the refusal is
  documented as covering the whole manifest, both handed forward from
  `tw-open-gated-restriction`.
- Verification baseline: gate-factory 46/46; full suite 31 failures
  byte-identical to main's environmental baseline; typecheck error sets
  identical to main's skew baseline except one pre-existing error's line
  shift (3719 to 3721, from two added comment lines in `src/pi.ts`).
- Residual for close-out: the effort's own planning records still state the
  pre-verification claim (`map.md` hedges it as "asserted by this package,
  not yet verified"; `tasks/tool-use-inventory/task.md` states it flat);
  decide whether to annotate them or leave them as historical records.

### User attention needed?

Yes, narrowly: the ticket's narrative reads as a docs-only resync, but the
verified fact was false, so a user-visible session-start warning changed
meaning (from "the ticket chain will not launch" to "the chain runs, but
each child's `tw_feedback` call fails"), and the same correction landed in
`README.md` and the skill-creator reference. The architecture doc carries a
settled fact now known false; the close-out CHANGELOG entry should state the
corrected shape, and the unconditional-`tw_feedback` rationale should be
re-read without the failed-launch justification.
