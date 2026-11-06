---
type: deviation report
title: Deviation report for tw-open-gated-restriction
status: stable
---

## Deviation report: tw-open-gated-restriction

Reviewed against `docs/tasks/selective-repo-disable/architecture.md` (the
settled restriction bullet, the opener seam, and the per-ticket contract
"tw-open-gated-restriction exports") and the ticket doc's acceptance criteria,
comparing `main..ticket/tw-open-gated-restriction` (head e1c8dfa, 4 wip
commits; `src/disclosure.ts`, `src/pi.ts`, `tests/gate-factory.test.ts` only;
no `task/` branch exists, the branch builds directly on main at df0926e,
which carries both prerequisite tickets). Verification re-run for this
report: gate-factory 39/39; full suite 31 failed | 1338 passed (1369), every
failure in the documented version-skew or `.venv`-corpus baseline (main
re-run in a clean worktree: the 29 version-skew failures identical, and the
2 extra corpus-scan failures are untracked `.venv` pollution in this
directory, not branch state); `tsc --noEmit` 5 errors and
`tsc -p tsconfig.test.json` 12 errors, both identical to main's as
file/message lists.

### API surface changes

- **Gated schema narrowing and runtime refusal (no deviation in behavior):**
  - **Planned:** in a gated repo, `tw_open` offers only non-gated registry
    entries in its parameter schema and refuses workflow-skill names at
    runtime with the opener's refused-outcome shape plus a notify in the
    spirit of the skill-invocation gate (AC 1, ticket What to build).
  - **Actual:** `buildOpenParameters(gated)` narrows the offered `skill`
    names via the new `openableWhenGated()` (reads `GATED_SKILL_NAMES`,
    today exactly skill-creator), and the handler refuses manifest names
    first (src/pi.ts:3250), returning `Refused: <reason>. Legal next: tw_open
    skill-creator.` with `details { opened: false, reason, legal_next }` and
    the notify `task-workflow is gated in this work repo; not opening <name>`
    (warning), mirroring the invocation gate's message family and level.
    `tw_close` is untouched. Both dual-state tests pin it.
- **Where the refusal lives (deviation, two spec clauses conflict):**
  - **Planned:** the architecture's opener seam says "`tw_open`'s parameter
    construction (`buildOpenParameters`) and its argument validation are
    where the gated narrowing and refusal land", pointing at
    `validateOpenArgs`.
  - **Actual:** the refusal is the first check in `tw_open`'s execute
    handler, before `validateOpenArgs(p)`. `validateOpenArgs` throws, but
    both the ticket and the architecture's settled text require the
    refused-outcome shape (reason plus `legal_next`), which only a returned
    outcome carries; every existing `validateOpenArgs` refusal is unchanged.
  - **Impact:** the three manifest names with no registry entry
    (task-workflow-overview, task-workflow-doctor, workflow-failure) now get
    the gated refusal in a gated repo instead of the unknown-skill throw.
    That matches the `/skill:` invocation block, which already blocks those
    names, so a gated repo treats all 10 manifest names consistently.
    `repo-gating-docs-resync` should document the refusal as covering the
    whole manifest, not only the 7 registry entries.
- **Narrowing mechanism: the enumerated description list, not a parameter
  enum (deviation from a "preferred"):**
  - **Planned:** the architecture prefers "enumerated narrowing of the
    parameter schema so the model never even sees a hopeless value, with the
    runtime refusal as the belt next to the suspenders".
  - **Actual:** `skill` stays `Type.String`; only its description's
    enumerated "one of ..." list narrows (to `skill-creator`). The schema
    does not formally constrain the value; the runtime refusal enforces the
    surface.
  - **Impact:** none on behavior or dependent tickets. The model never sees
    a gated name in the offered surface (AC 1 as worded), and the refusal
    guarantees the enforced set. The mechanism reason is the repo's own
    record: `buildOpenParameters`' doc comment (a provider-validated union
    short-circuits the opener's refusals that name the legal next call) and
    `docs/testing.md`'s note that tw_open's bare union shipped broken on
    DeepSeek. The spec's "preferred" was written against a mechanism this
    repo documents as broken.
- **Gate-state plumbing and the notify seam (addition the spec did not
  place):**
  - **Planned:** "the restriction lives inside `tw_open`'s own gate", and a
    notify is required, but no seam let a tool execute handler reach the
    operator (the invocation gate's notify uses `ctx.ui.notify` from a
    session-start hook holding the extension context).
  - **Actual:** `createTools(gated = false)` receives the state from the
    factory (`createTools(gate.active)` at src/pi.ts:3684); the schema and
    the refusal closure read that one fact. `ToolContext` gained an optional
    `notify(message, level)` (src/pi.ts:1258), wired best-effort from
    `ctx.ui.notify` in the shared registerTool execute wrapper. Two new
    disclosure exports: `openableWhenGated()` (src/disclosure.ts:397) and
    `gatedReason()` (src/disclosure.ts:406).
  - **Impact:** internal seams only. Existing `createTools()` and
    `buildOpenParameters()` callers keep the ungated default and behave as
    before (tests/plugin.test.ts, tests/skills.test.ts,
    tests/lifecycle-hardening.test.ts, and the `workflowToolNames()` cache at
    src/pi.ts:1662, which feeds only `tw_request_tool`, unregistered in
    gated repos). The notify is best-effort: it fires only when the session
    UI is wired into the tool context; the refused outcome always returns.

### Abstraction usage

- Used/was specified: yes.
  - The restriction consumes the gated manifest from `gated-skill-manifest`
    (`GATED_SKILL_NAMES`) through `openableWhenGated()`; no second keep-list
    exists, and `legal_next` derives from `openableWhenGated()`
    (`["tw_open skill-creator"]` today), so it scales with the kept set.
  - The refusal reuses the opener's own refusal machinery
    (`refusedOuttext`/`outcome` with the same `details` shape as the phase
    gate's refusals), per the spec's existing-abstractions list.
  - The notify mirrors the invocation gate's message family and warning
    level rather than a new wording.
  - The new tests extend the gate-factory stub seam (dual-state factory
    assertions) instead of inventing a second fixture style.

### Out-of-scope changes

- `ToolContext.notify` touches the shared tool-context seam (its wiring runs
  for every registered tool's execute wrapper, though only `tw_open`'s
  refusal calls it). It is the minimal way to deliver the ticket's notify
  requirement, and it is optional and best-effort, but it is broader than
  `tw_open` alone.
- `createTools`' signature changed (exported; backward-compatible default).
  No other tool reads the flag.
- Two new exports on the disclosure module (`openableWhenGated`,
  `gatedReason`) beyond the manifest seam the architecture named.
- Nothing removed. `docs/repo-gating.md` is deliberately untouched (owned by
  `repo-gating-docs-resync`; it still describes the pre-registration-split
  surface). The unstaged `docs/tasks/state.yaml` working-tree change
  (`task: tw-open-gated-restriction`) is run-tracking noise, not part of the
  commit.

### Ticket doc update needed?

Yes. The ticket has no `## Implementation notes` section yet; create it and
append:

- The refusal lands in the handler before all other checks (not inside
  `validateOpenArgs`, which throws), so the three non-registry manifest
  names are gated-refused rather than unknown-skill errors, matching the
  `/skill:` invocation block.
- The schema narrows the description's enumerated list, not the parameter
  type; the runtime refusal enforces (see `docs/testing.md`'s DeepSeek
  union note for why).
- The notify is best-effort via the new optional `ToolContext.notify`,
  wired from the session UI.
- `legal_next` is derived from `openableWhenGated()`, not pinned.
- Residuals for the close-out record: an unknown non-manifest skill name in
  a gated repo still errors with the full 8-name registry list (revealing
  gated names on a hallucinated-name path; candidate known-limitation note
  for `repo-gating-docs-resync`), and `tw_close`'s idle hint ("open a phase
  with tw_open") is imprecise in a gated repo where only skill-creator opens
  (pre-existing message; the ticket explicitly leaves `tw_close` alone).

### User attention needed?

No. Scope and observable behavior match the ticket: the offered surface, the
refusal shape, the notify, skill-creator opening with its toolset, and the
unchanged ungated shape are all as specified, and the derivation-proof test
holds. The deviations above are landing-site and mechanism choices inside
the planned seam, each with a documented reason; the one observable nuance
(non-registry manifest names get the gated refusal instead of a throw) is a
consistency gain, not a scope change.
