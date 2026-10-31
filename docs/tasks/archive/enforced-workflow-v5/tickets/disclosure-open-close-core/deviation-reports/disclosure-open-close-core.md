---
type: deviation report
title: Deviation report for disclosure-open-close-core
status: stable
---

## Deviation report: disclosure-open-close-core

### API surface changes
- **Planned:** The arch spec's contract for ticket 8: `tw_open`, `tw_close`,
  `tw_next`; gated registration (`exposure: "direct"`, `defaultActive:
  false`); the discriminated union on `skill`; the symmetric exclusivity
  table; the two-state declared set; the nested-open integration test;
  telemetry absorption. Contract: `tw_open` refuses duplicates and
  conflicts; `tw_close` names its skill and removes only unneeded tools;
  `tw_next` is always declared.
- **Actual:** Delivered as specified. The engine lives in a new pure module
  `src/disclosure.ts` (the arch spec allows "modules it imports under
  `src/`"): `SKILL_REGISTRY` (toolsets plus the symmetric `conflicts`
  table), `openSkillsIn`/`signatureToolOf` (open-set derivation),
  `buildOpenParameters` (the union), `validateOpenArgs` (runtime backstop),
  `duplicateReason`/`conflictReason`, and the `ALWAYS_DECLARED`/`CLOSER`
  constants. `src/pi.ts` gains the three structured tools
  (`tw_open`/`tw_close`/`tw_next` with TypeBox schemas and structured
  outcomes), the gated registration, and the transcript restore on
  resume/fork. Diff: `src/disclosure.ts` +193, `src/pi.ts` +240,
  tests +577 across five files.
- **Impact:** Additive for dependents. Two notes for downstream tickets:
  (1) `SKILL_REGISTRY` is deliberately provisional; opener-gate-and-toolsets
  (ticket 9) replaces the per-skill toolsets with the real phase-to-toolset
  table and owns `legal_next` on refusals (see below), and
  skill-creator-nested-toolset (ticket 14) replaces the provisional
  `skill-creator` entry (today `["tw_show"]`). (2) Every registry entry
  needs a private signature tool (a tool no other skill's toolset
  contains), because the open set is derived from the active tool set;
  `signatureToolOf` throws at first use if an entry breaks the rule, so a
  future toolset edit that erases a skill's privacy fails loudly instead of
  silently corrupting the open-set derivation.

### Abstraction usage
- Used/was specified: yes. All `pi.registerTool` calls stay in `src/pi.ts`
  (the single extension entry); `src/disclosure.ts` is pure data and pure
  functions, no file I/O. Persistence follows the spec's decision: the
  declared set is driven by `setActiveTools` and the transcript is the
  persistence source, so the open set is derived from the active set rather
  than stored separately; the two can never disagree and `/tree`, resume,
  and fork restore for free. The nested-open integration test extends
  `tests/integration/harness.ts` on the faux provider as the spec names;
  tool-level tests drive `createTools()` with a fake active-set context.

### Out-of-scope changes
- **`tests/integration/harness.ts` gained three options** (`persisted`,
  `sessionManager`, `sessionStartReason`) and returns the `sessionManager`.
  The resume criterion needs a file-backed session reopened with reason
  `resume`, which the harness could not express. Additive; existing
  call sites unchanged.
- **`tests/integration/session.test.ts` opens a skill before gated tool
  use.** The two-state declared set makes the pre-existing gated-tool
  integration tests (tw_list, tw_show, tw_set, and friends) fail unless the
  session opens the owning skill first; the tests now call an
  `openSkill` helper (and one assertion slices off the opener's calls).
  This is the flip's real consequence for the existing suite, not a
  relaxation: the gated tools still execute, only now behind an open.
- **`tests/plugin.test.ts` and `tests/gate-factory.test.ts`** updated for
  the new tool names and the always-declared registration pin (dispatcher
  pair `defaultActive: true`, every other workflow tool `exposure:
  "direct"`, `defaultActive: false`).
- Nothing else: no skill prose touched (the per-skill telemetry prose is
  removed by the skill-rewrite tickets that own those files), no tree files
  mutated outside the changed files.

### Judgment calls (unpinned by the ticket)
- **Telemetry absorption args:** the opener calls `telemetry_skill_context`
  with `{ skill_name: <skill>, target: <target ?? effort> }` through a
  nested `ctx.executeTool`. The real tool's capture is `skill_name` plus
  `target`; a phase open records the effort as the target (mirroring
  wayfinder's old prose, which recorded the map/effort slug there). The old
  prose's `sliceCount`/`map` attributes are not forwarded: the v5 opener
  has no slice concept and the telemetry backend stays out of scope. The
  absorption is fail-open: an absent or erroring telemetry tool never
  blocks the open.
- **`legal_next` on refusals is deferred to ticket 9.** The arch spec's
  ticket-9 contract says "a refused open activates nothing and returns
  `legal_next`"; this ticket's refusals return `reason` (plus the
  currently-open set in `details.open`) and activate nothing. The
  precondition machinery that knows the legal next calls is ticket 9's
  deliverable, so the field lands with it rather than being invented
  twice.
- **Registry scope:** the pairwise-mutual-exclusion list covers the seven
  phase skills named in the arch spec (including `intake` and
  `setup-workflow`, which have no skills yet); `skill-creator` conflicts
  with nothing (it exists to nest).

### TDD honesty
- Four criteria ran red first ("passing" commits): the opener activating a
  toolset and disclosing the closer, `tw_close` removing only unneeded
  tools, `tw_next`'s prose in both states, and the /tree + resume
  persistence. The rest are characterization pins ("pinned" commits) of
  behavior the minimal implementations already satisfied: duplicate and
  conflict refusals in both orders, the nested open, the union backstop,
  the idle pair and the gated registration, the flip and telemetry
  absorption, and unsearchability before open. The re-run after the prior
  attempt's timeout added only the before-open `tool_search` probe
  (criterion 1's third leg), which pinned green.

### Ticket doc update needed?
- **No.** All nine acceptance criteria are met as written. The notes above
  are recorded here and in the ticket's implementation notes; none is a
  spec-level deviation.

### User attention needed?
- **No.** Scope did not change. The two deferrals (real toolsets and
  `legal_next` to ticket 9, telemetry attributes to the out-of-scope
  backend) are the spec's own ticket boundaries, and the provisional
  registry is shaped so both land as data-table edits.

### Verification snapshot
- `npx vitest run tests/integration/disclosure.test.ts`: 9 passed (flip
  including the before-open search probe, nested skill-creator union and
  close, refusals, /tree, resume, telemetry absorption x3).
- `npx vitest run tests/disclosure.test.ts`: 12 passed (tool-level open,
  close, next contracts).
- Full suite `npx vitest run`: 17 files, 836/836 passed.
- `npx tsc --noEmit`: clean.
- Gate preconditions: no `.work/uncertainty.md` in the ticket directory;
  branch `ticket/disclosure-open-close-core` exists at the land commit.

### Residual risks
- The provisional toolsets are coarser than the final phase toolsets will
  be (ticket 9 owns the real table); a phase opened today sees a reasonable
  but not final toolset. No dependent ticket consumes the provisional
  contents.
- Open-set derivation keys on signature tools, so two skills whose toolsets
  overlap fully cannot both be modeled; the registry cannot express that
  shape. The final per-skill toolsets (tickets 9 and 14) must keep a
  private tool per skill or revisit the derivation; the throw makes the
  constraint visible.
- A provider that sends a flattened union gets the runtime backstop's
  precise refusal, but a provider that drops unknown parameters entirely
  would fail target-carrying opens with the same refusal; observed
  providers in the prototype and tests pass the union as declared.

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Branch ticket/disclosure-open-close-core re-verified after the prior attempt's timeout: 21/21 ticket-level tests (12 tool-level + 9 integration), 836/836 full suite, typecheck clean; all nine ticket criteria confirmed against code and tests, including the before-open tool_search probe added this run; gate preconditions hold (no .work/uncertainty.md, branch ref exists)"
    }
  ],
  "changedFiles": [
    "src/disclosure.ts",
    "src/pi.ts",
    "tests/disclosure.test.ts",
    "tests/gate-factory.test.ts",
    "tests/integration/disclosure.test.ts",
    "tests/integration/harness.ts",
    "tests/integration/session.test.ts",
    "tests/plugin.test.ts",
    "docs/tasks/enforced-workflow-v5/tickets/disclosure-open-close-core/ticket.md",
    "docs/tasks/enforced-workflow-v5/tickets/disclosure-open-close-core/deviation-reports/disclosure-open-close-core.md"
  ],
  "testsAddedOrUpdated": [
    "tests/disclosure.test.ts",
    "tests/integration/disclosure.test.ts",
    "tests/gate-factory.test.ts",
    "tests/integration/session.test.ts",
    "tests/plugin.test.ts"
  ],
  "commandsRun": [
    {
      "command": "npx vitest run tests/integration/disclosure.test.ts",
      "result": "passed",
      "summary": "9/9 integration tests pass, including the new before-open unsearchable probe"
    },
    {
      "command": "npx vitest run",
      "result": "passed",
      "summary": "Full suite: 17 files, 836/836 tests passed"
    },
    {
      "command": "npx tsc --noEmit",
      "result": "passed",
      "summary": "typecheck clean"
    }
  ],
  "validationOutput": [
    "tests/integration/disclosure.test.ts: 9 passed (9)",
    "npx vitest run: 17 files, 836 passed (836)",
    "tsc --noEmit: exit 0",
    "git: 13 wip commits on ticket/disclosure-open-close-core from landing point 736082f, working tree clean before the land commit, 0 staged files after",
    "gate preconditions: no .work/uncertainty.md; refs/heads/ticket/disclosure-open-close-core resolves"
  ],
  "residualRisks": [
    "The SKILL_REGISTRY toolsets are provisional; opener-gate-and-toolsets (ticket 9) and skill-creator-nested-toolset (ticket 14) replace them, and legal_next on refusals lands with ticket 9's precondition machinery",
    "Open-set derivation keys on per-skill private signature tools; the final toolsets must keep one per skill or the derivation throws (visible, not silent)",
    "Telemetry absorption records skill_name plus target (effort as the phase-open target); the old prose's sliceCount/map attributes are not forwarded and the telemetry backend stays out of scope"
  ],
  "noStagedFiles": true,
  "diffSummary": "vs landing point 736082f: 8 files, +1021/-10 before the land commit. src/disclosure.ts (new): registry, symmetric conflicts, union, runtime validation, open-set derivation. src/pi.ts: tw_open/tw_close/tw_next structured tools, gated registration (dispatcher pair always declared), telemetry absorption, transcript restore on resume/fork. Tests: tool-level contracts, integration flip/nested/persistence/telemetry, harness persistence options, session tests open a skill first, registration pin",
  "reviewFindings": [
    "no blockers"
  ],
  "manualNotes": "Retry of a timeout-interrupted run: the prior attempt left 12 wip commits and a green suite; this run re-verified, added the criterion-1 before-open unsearchable probe (a green pin), and landed. Deferrals worth a look at land time: provisional toolsets and legal_next to ticket 9, telemetry attributes to the out-of-scope backend, both documented and reversible."
}
```
