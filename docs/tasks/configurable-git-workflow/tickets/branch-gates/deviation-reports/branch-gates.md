---
type: deviation report
title: Deviation report for branch-gates
status: stable
---

## Deviation report: branch-gates

Reviewed at `ticket/branch-gates` against `task/branch-gates` (6 commits) against
the architecture document's per-ticket contract 2 ("A refusing gate on the two
branch-bearing phases") and the ticket's eight acceptance criteria. I re-ran the
suite and both typechecks in this checkout: `npx vitest run` is 26 files, 1441
tests, all passing (1428 before this ticket, so the 13 new tests are the whole
delta); `npx tsc --noEmit` and `npx tsc -p tsconfig.test.json` are clean. Nothing
is staged; the only working-tree change is the orchestrator's `docs/tasks/state.yaml`
edit, which this ticket does not author.

### API surface changes

**1. Where the gate sits: one generic branch gate in `tw_open`.**

- **Planned:** contract 2 says "the gate decision wiring for `implement-ticket` and
  `finalize-effort`"; the Guards section says "a phase with a branch template
  refuses to open unless the checkout matches it".
- **Actual:** a single `branchGate(ctx, entry, args)` helper in `src/pi.ts` (~line
  1523), called from `tw_open` after `phaseGate`, for every registry entry whose
  resolved brief carries a branch. Under the bundled `default` profile that is
  exactly the two phases, because no other phase row carries `branch`; under an
  operator profile it is whichever phases carry one. No phase name appears in the
  gate.
- **Impact:** tickets 3 and 4 should describe the rule as "a phase the profile
  gives a branch", not as an enumeration of two phases, or the prose will
  contradict a custom profile. Nothing else in `src/` or `tests/` reads the new
  fields.

**2. `tw_open`'s result and details payload grew.**

- **Planned:** "the open refuses on a mismatched checkout with the required branch
  and the step that creates it"; "the open and close results carry the profile's
  instruction text".
- **Actual:** details now always carry `required_branch` (`null` when the phase
  needs none), `profile`, and `diagnostics`, on both the pass and the refusal
  paths. The result text gains the opening instructions on a pass and a
  `Diagnostics:` line whenever the settings/profile/checkout read reported
  anything. `tw_close` details gain `diagnostics`, and its text gains the closing
  instructions plus the same `Diagnostics:` line. On a clean pass with the bundled
  `default` profile (whose instruction fields are empty by design) the text is
  byte-identical to before apart from the instructions themselves.
- **Impact:** additive only; every existing opener assertion still passes. A later
  ticket that wants the branch in the open result has it without another read.

**3. The git seam: `GitRun` returns stdout, and it fails open when it cannot run.**

- **Planned:** "a way to run a git command against the session's directory and
  return its output", "injected the way the existing opener tests inject their
  fakes"; contract: "the open refuses on a mismatched checkout".
- **Actual:** `export type GitRun = (args: string[]) => Promise<string>` on
  `ToolContext.git`, plus `readCheckout(git)` in `src/core/git-profile.ts` running
  exactly `rev-parse --abbrev-ref HEAD`. The extension wires it at `src/pi.ts:4018`
  to `pi.exec("git", args, { cwd: ctx.cwd })`, throwing on a non-zero exit so the
  read is a rejection rather than a code the gate has to inspect. A detached
  checkout answers `HEAD` and refuses as "no branch (a detached HEAD)"; an absent
  seam or a failing git **passes the open** with a diagnostic in
  `details.diagnostics` and a `Diagnostics:` line in the text.
- **Impact:** this is the sharpest deviation in the ticket. Criterion 2's wording
  ("refuses unless the checkout is the resolved effort branch") and contract 2's
  wording hold only when the seam answers; a session whose exec is missing, or a
  `git` that fails, opens the implementation phase on an unverified checkout with
  a note. It mirrors the repo gate's fail-open treatment of unreadable settings,
  and the implementer reports the fail-closed variant as a one-line change. Ticket
  3 inherits the question: if its spawn guard copies this convention, nothing
  enforces the ticket branch either. Also note the seam returns bare stdout, so
  ticket 3 cannot read an exit code through it.

**4. Three resolver exports beyond the planned two functions.**

- **Planned:** "one module exporting a function that returns a phase brief and one
  that returns a gate decision".
- **Actual:** `src/core/git-profile.ts` now also exports
  `decideFromBrief(brief, name, currentBranch)` (the pure half `gateDecision` is
  now a two-line wrapper over, so ticket 1's signatures and behaviour are intact),
  `readCheckout(git)` with its `CheckoutRead`, and `phaseText(cwd, name, deps)`
  with its `PhaseText`. `phaseText` exists because `tw_close` has no effort to
  resolve a branch with and needs only the profile row.
- **Impact:** ticket 3 can reuse `readCheckout` unchanged (`(git) => Promise<string>`,
  no `ToolContext` required) and either resolver function; it must build its own
  `GitRun` from `pi.exec`, because the exec adapter lives inline inside the
  factory closure and is not exported, so a second copy is the likely outcome
  unless it is factored out. Ticket 4 touches none of this.

**5. A second `ToolContext` seam: `profilesDir`.**

- **Planned:** "profile files are read from the package's own directory through a
  seam the tests replace with fixtures" (the architecture does not say where the
  seam lives).
- **Actual:** `ToolContext.profilesDir?: string`, threaded into the resolver by
  `tw_open`, `tw_close`, and (retroactively) `tw_phase_brief`, so a gate and a
  brief in one session always read the same profile. The real extension context
  never sets it; tests inject a fixture directory.
- **Impact:** this is why criterion 6 is testable at all, since the bundled
  `default` profile ships empty instruction text. Ticket 3 can use the same field
  if it needs fixture profiles.

**6. `Tool.executionMode` is a new field on the internal tool shape.**

- **Planned:** "Opening and closing run in sequential execution mode"; criterion 7,
  "Both openers declare sequential execution mode."
- **Actual:** `executionMode?: "sequential"` on the internal `Tool` and on
  `defStructured`'s options, forwarded to `pi.registerTool` only when set (spread
  of a conditional, so no other tool grows the key). Set on `tw_open` and
  `tw_close`. The criterion's "both openers" is read as the two tools, since one
  `tw_open` opens both branch-bearing phases; the tests assert it on both
  definitions and on what the real factory registers. The harness type
  `ToolExecutionMode` already exists, so this is an existing abstraction wired
  through, not a new concept.
- **Impact:** none on dependent tickets.

**7. Ordering of the gates is fixed and unspecified by the ticket.**

- **Planned:** nothing says whether the tree precondition or the branch gate runs
  first.
- **Actual:** `phaseGate` (tree) first, then `branchGate`. A wrong-branch open with
  a missing target refuses on the missing target, and only then on the branch.
- **Impact:** a dependent ticket that asserts on refusal order inherits this
  ordering; the reviewer flagged it as the only open question in the diff, and it
  keeps every existing refusal assertion pinned by the suite.

### Abstraction usage

- **Used/was specified: yes**, with two abstentions. The gate reuses the opener
  registry and its refusal vocabulary (`refusedOuttext`, `legalNext`), the
  resolver instead of re-reading settings, `readGitSettings` and its diagnostics
  instead of a new settings reader, the fake-context test pattern, and the
  harness's own `ToolExecutionMode`. The abstentions: the profile's `closeGate`
  stays unenforced (see below), and the architecture's testing-seam summary
  ("those run against a temporary git repository through the injected seam") was
  not followed, because the ticket's criterion asks for a fake git seam and a fake
  context, which is what shipped.

### Out-of-scope changes

- **Additions:**
  - `decideFromBrief`, `readCheckout`, `phaseText` exports in
    `src/core/git-profile.ts`.
  - `ToolContext.git` and `ToolContext.profilesDir`.
  - `Tool.executionMode` plus its passthrough in `defStructured` and `factory`.
  - `required_branch`, `profile`, and `diagnostics` in `tw_open`'s details;
    `diagnostics` in `tw_close`'s.
  - `tw_phase_brief` now honours `profilesDir`, a one-line touch outside the
    ticket's surface, made so briefs and gates cannot read different profiles.
- **Removals:** none.
- **Explicitly not done:**
  - `closeGate` is unenforced. The profile carries it, `default.json` sets it for
    both phases, and `phaseBrief` reports it, but no ticket in this effort names a
    closing branch gate, so the close delivers closing instructions and nothing
    else. It is data waiting for a consumer.
  - The architecture's "each under 2000 characters so compaction does not swallow
    them" bound on instruction text is neither validated nor tested anywhere in
    `src/`. It is a profile-authoring expectation, so it belongs to ticket 1 or to
    the docs page in ticket 4.
  - No test drives a real `git` process or a temporary repository; the wiring test
    goes through a stub `ExtensionAPI` and asserts the exact `pi.exec` call and
    `cwd`.

### Ticket doc update needed?

**Yes.** Append to `## Implementation notes`:

- The branch gate is implemented once, in `branchGate` inside `tw_open`, and fires
  for any phase whose profile row carries a branch; under `default` that is
  `implement-ticket` and `finalize-effort`. It runs after the tree precondition.
- The checkout is read through `ToolContext.git` (`GitRun`, wired to
  `pi.exec("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd })`) via
  `readCheckout`. A detached `HEAD` refuses as "no branch"; an absent seam or a
  failing git **passes** the open with a diagnostic in the result and details.
- The open's details gained `required_branch`, `profile`, `diagnostics`; the
  close's gained `diagnostics`. Both texts may carry a `Diagnostics:` line.
- `tw_open` and `tw_close` carry `executionMode: "sequential"`, forwarded to
  `pi.registerTool` only when set.
- Resolver additions: `decideFromBrief`, `readCheckout`, `phaseText`. The
  `profilesDir` seam also reaches `tw_phase_brief`.
- `closeGate` remains unenforced; no ticket consumes it.

### User attention needed?

**Yes**, on two points:

1. **The branch gate fails open.** A session that offers no git seam, or whose
   `git` fails, opens the implementation phase on an unverified checkout with a
   diagnostic rather than refusing. That is a deliberate mirror of the repo gate,
   but it means the gate is not an enforcement point in that situation, and
   criterion 2 as written ("refuses unless the checkout is the resolved effort
   branch") holds only when the seam answers. The fail-closed variant is a
   one-line change; decide before ticket 3 copies the convention into the spawn
   guard.
2. **`closeGate` has no consumer.** The profile data and `default.json` both carry
   it and nothing enforces it. Either a ticket takes it or the field is dropped
   before the docs page in ticket 4 documents it as behaviour.

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Deviation report written for branch-gates, comparing the ticket, architecture contract 2, and the 6-commit diff; suite and typechecks re-run (1441 tests, 26 files, both tsc clean); two user-attention findings and one workflow-feedback-worthy spec gap recorded."
    }
  ],
  "changedFiles": [
    "docs/tasks/configurable-git-workflow/tickets/branch-gates/deviation-reports/branch-gates.md"
  ],
  "testsAddedOrUpdated": [],
  "commandsRun": [
    {
      "command": "git diff --stat task/branch-gates..ticket/branch-gates",
      "result": "passed",
      "summary": "src/core/git-profile.ts +102, src/pi.ts +142, tests/branch-gate.test.ts +426 (new)"
    },
    {
      "command": "npx vitest run",
      "result": "passed",
      "summary": "26 files, 1441 tests passed"
    },
    {
      "command": "npx tsc --noEmit && npx tsc -p tsconfig.test.json",
      "result": "passed",
      "summary": "src and test typecheck clean"
    },
    {
      "command": "git status --porcelain=v1",
      "result": "passed",
      "summary": "only the orchestrator's unstaged docs/tasks/state.yaml; nothing staged"
    }
  ],
  "validationOutput": [
    "Test Files 26 passed (26) / Tests 1441 passed (1441) - before this ticket the suite was 1428, so the 13 new tests are the whole delta",
    "npx tsc --noEmit && npx tsc -p tsconfig.test.json: clean",
    "git show of the branchGate helper confirms the gate is generic over profile rows, runs after phaseGate, and fails open on an unreadable checkout"
  ],
  "residualRisks": [
    "The gate fails open when the session offers no git seam or git fails; criterion 2 holds only when the seam answers, and ticket 3 may inherit that convention.",
    "closeGate is carried by the profile and default.json but no ticket enforces it.",
    "The exit-code path of the real pi.exec adapter is only exercised by a stub ExtensionAPI, not a live session."
  ],
  "noStagedFiles": true,
  "diffSummary": "One new deviation report at docs/tasks/configurable-git-workflow/tickets/branch-gates/deviation-reports/branch-gates.md; no source or test files touched.",
  "reviewFindings": [
    "no blockers",
    "note: src/pi.ts~1523 - branchGate is generic over profile rows rather than pinned to the two phases, which is how the default profile resolves and worth telling tickets 3 and 4",
    "note: src/core/git-profile.ts readCheckout - fail-open on an unreadable checkout differs from the ticket's 'refuses unless' wording; flagged as user attention",
    "note: src/profiles/default.json closeGate - populated but unconsumed by any ticket in this effort"
  ],
  "manualNotes": "Written to the authoritative artifact path and mirrored to the in-repo convention path docs/tasks/configurable-git-workflow/tickets/branch-gates/deviation-reports/branch-gates.md, because the run's verification gate checks that file for existence. Both copies are identical."
}
```
