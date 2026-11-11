---
type: changelog
title: Task Changelog
---
# Task Changelog

# task-workflow

## 4.0.0

### Major Changes

- 5816b6b: The v4 tool-surface overhaul: the tool family is renamed to the `tw_` prefix
  (`tw_show`, `tw_get`, `tw_set`, `tw_list`, `tw_frontier`,
  `tw_dependency_levels`, `tw_finalizable`, `tw_map_finalizable`, `tw_state`,
  `tw_state_set`, `tw_context`) and the registered surface shrinks to exactly
  those 11 tools plus `notify_user`. Removed: `tw_resolve`, `tw_assert_kind`,
  `tw_map_tasks`, `tw_map_tick`, `tw_slices`, `tw_set_slices`, the guidelines
  feature (`get_guidelines`/`list_guidelines` and the system-prompt injection;
  standards are read directly from repo files), and the slice machinery (skills
  read standards files directly; chains are per-ticket over the effort
  frontier). The schema reference (`tw_context`) now tells the v4 truth: the
  effort-grouped `docs/tasks/` tree with decision tasks and implementation
  tickets, OKF frontmatter, `workflow_state` alongside `status`, and the
  state file with lossless round-trips. `setup-workflow` migrates any vintage
  to `schema_version: 4` in one idempotent, resumable hop. All 29 promoted
  skills now have human-facing docs pages under `docs/<bucket>/`.

### Minor Changes

- 7b55637: New `eval-review` skill: multi-criterion review of Inspect-based eval suites
  for the pi harness (contract validity, outcome grading, isolation and
  baseline-vs-treatment soundness, scorer integrity, with optional
  simulated-user integrity and trial/saturation axes), plus a single-pass
  run-triage mode classifying failures as scorer bug, skill defect, or spec
  mismatch. Companion to the planned `eval-creator`.

### Patch Changes

- f00215d: Migration fix: the schema 3 to 4 migration collapsed every ticket of a live `maps/<map>/tickets/<slug>/` subtree onto one `tickets/null/ticket.md` destination (a downstream repo lost 11 of 12 tickets, recovered from git). Map-subtree slugs are now derived from the directory after the `tickets/`/`tasks/` container (live and archived map subtrees alike), a slugless task or ticket is reported as a `no-slug` needs-human item and left in place instead of interpolated, and every staging site claims its destination first so a second source becomes a `destination-collision` needs-human item rather than a silent overwrite. Red-first regressions cover the two-ticket fixture, aux anchoring, the archived-map subtree, the slugless ticket, the deliberate two-source collision, and re-run idempotence.

## 3.0.0

### Major Changes

- a4db0a0: Largely adopt Matt Pocock's skills repo way (v2.10.0 to v3.0.0).

  Reorganized skills into engineering/productivity/misc/in-progress/deprecated
  buckets with promotion rules. Retired report-bug (into deprecated/) and
  dropped grilling-with-ui (+ its CLI/UI scripts and eval harness). Added 12
  skills adapted from Matt: prototype, research, resolving-merge-conflicts,
  wizard, handoff, to-questionnaire, teach, writing-for-agents, triage,
  grill-me, to-spec, to-tickets. Rewired implement-task to dispatch to utility
  skills and borrowed implement-spec graph/concurrency language. Scaffolded
  repo-root CONTEXT.md, docs/adr/, AGENTS.md, docs/agents/, and
  docs/tasks/out-of-scope/. Reshaped wayfinder to decisions-only (strict
  two-phase: wayfinder produces planning decisions, to-spec/to-tickets create
  implementation tasks). Rewrote task-overview to ask-matt-style intent router
  with phase-boundary guidance. Re-aligned grilling, code-review, tdd, and
  domain-modeling to Matt's current text. Adopted changesets versioning
  (integrated into release.sh). Enforced no-em-dashes prose rule repo-wide.
  Bumped schema_version to 3.

### Minor Changes

- 6454ce7: Add the multi-criterion skill-reviewer (agents/skill-reviewer.md) + the
  skill-review skill, wired into skill-creator phase 7. Adds a 'Cut meta-level
  narrative' core principle. 28 promoted skills.













## 2026-11-11, Make the close-out push follow the policy and enforce the closing gate (close-out-fidelity)

The effort close's push step now follows the profile's policy instead of an
unconditional command: the brief renders a push step that names a push only when
the policy is `always` and the phase carries a branch, and an explicit "none"
sentence otherwise, with `flat` never pushing. The implementation phase's close-out
defers to that line, and a prose guard bans a hand-written push anywhere in the
phase files, worker agents, or chain scripts. The closing branch gate is now
enforced: closing a phase whose profile row carries one from the wrong checkout
refuses in the same shape and wording as an open refusal, before any state changes,
and the close takes the effort and ticket it needs to resolve the template.

## 2026-11-11, Refuse rather than pass when the checkout cannot be read (guard-fail-closed)

The branch guards now fail closed. When the checkout cannot be read, because the
git seam is absent or the command fails, opening a branch-bearing phase is refused
in the openers' existing shape and a profile-gated spawn is blocked with a reason,
instead of passing with a diagnostic or a notification. A readable but wrong branch
and a detached checkout behave as before. One shared helper words the refusal for
both the opener and the spawn guard so they cannot disagree, the underlying cause
stays in the diagnostics, and the git-workflows page names the `flat` profile as
the option for a directory that is not a git checkout.

## 2026-11-11, Ship the user-invoked release skill (release-skill)

A new `release` skill ships as a promoted, user-invoked skill, so the model cannot
start a release on its own. It previews the pending changesets through the plan
tool, reports the entries, versions, and changelog sections, applies only after
confirmation, reports the apply's own answer rather than the preview, and then
follows the repository's own release document as prose. A missing manifest or
changeset config is reported with its reason and nothing is created, and an empty
plan is reported as nothing to release with no bump and no consumed entry. The
skill owns no branch operations and never stages a changeset to force a release.
Its eight promoted-set surfaces are wired, including both skill-count pins.

## 2026-11-11, Rewire the phase prose, worker agents, and chain to the profiles (workflow-prose)

The workflow's prose no longer states a branch model. Each phase states its branch
step and the gate that follows it, the five worker agents expect their branch to be
already checked out, and the chain merges a ticket branch into the effort branch
using names and a merge flag it is handed. The effort close lands the effort branch
on the trunk with the profile's flag, or prints the pull-request instruction when a
repository declares that it cannot merge locally. A new prose guard test reads every
phase file, resource, chain script, and worker agent and fails on a branch literal,
an interpolation, a template placeholder, a trunk name, or a merge flag, so the
hardcoded model cannot creep back. A new docs page covers the two profiles, the
three settings keys, and the refusal behaviour. The change also caught a data
defect: the bundled profile's merge value lacked its dashes.

## 2026-11-11, Turn pending changesets into a version bump and a changelog through tools (release-mechanics)

Pending changesets now become a version bump and a root changelog through two
tools, with the changesets command line tool not installed. The plan tool reports
the pending entries, the versions they produce, and the changelog section text,
and writes nothing; the apply tool bumps the manifest, inserts the section, and
removes the consumed entries, recomputing the plan rather than trusting one handed
back. Both go through the same seam as authoring, so workspace and config reading
are shared, and the changelog renders through the standalone changelog package
whatever specifier a repository's config names. An empty plan, a missing manifest,
and a missing changeset config are distinct named refusals rather than silent
no-ops. The changesets libraries and the workspace reader became runtime
dependencies; the command line tool stays a dev dependency, and a test fails if the
seam imports a module that is not declared.

## 2026-11-11, Propose changesets before writing, and keep the dedupe honest (changeset-proposal-and-dedupe)

Effort close now proposes its changeset entries before writing any. A dry-run mode
on the writer runs the same workspace read, config read, validation, generic
fallback, and dedupe as a real write and stops before touching the filesystem, so
the operator sees the entries and what was already staged before anything lands.
The staged-entry read now distinguishes "nothing staged" from "could not read",
so one malformed file refuses the write instead of silently emptying the dedupe set
and letting a duplicate generic entry through. Package validation includes a
monorepo's root package, and the effort close's prose and report resource state the
propose, confirm, write flow.

## 2026-11-11, Block implementation agent spawns on the wrong ticket branch (spawn-block)

The implementation chain now refuses to start from the wrong checkout. One
profile-driven guard decides at both the outer dispatch and the per-child launch,
using the same resolver as the phase gate so a spawn refusal and a phase refusal
cannot disagree: the outer call names the gated agent and the ticket, and the
per-child call reads the ticket from a step key that embeds the slug. A refusal
names the current and required branches in the workflow's existing shape and blocks
that step while the session continues, and an unreadable checkout passes with a
notification rather than blocking on a missing fact. Nothing enumerates the five
agents in code, so `flat` blocks nothing and a future profile decides its own set.

## 2026-11-11, Refuse the two branch-bearing phases from the wrong branch (branch-gates)

The implementation phase and the effort close now refuse to open from the wrong
checkout. One generic gate compares the checkout with the branch the git profile
resolves for that phase, so under the bundled `default` profile those are the two
guarded phases and under an operator profile it is whichever phases carry a
branch. The refusal names the current branch, the required branch, and the step
that creates it, in the workflow's existing shape, and nothing latches, so
creating the branch and retrying passes. The profile's opening and closing
instruction text now arrives through the open and close results, and both openers
run in sequential execution mode so a close cannot race a sibling call. A git
execution seam in the tool context keeps every gate test free of a repository.

## 2026-11-11, Propose and write changesets at effort close (changeset-authoring)

Effort close can now write the changeset entries a release consumes. One module
wraps the changesets library set: it reads the workspace and the changeset
config, reads what is already staged, proposes entries, and writes them with
formatting disabled so no formatter runs and the bytes are the library's own. A
new `tw_write_changesets` tool is the named writer, disclosed to the effort close
only, and refusals render in the workflow's existing shape. An effort with nothing
user-visible proposes a generic performance and stability patch, deduped against
what is already staged. Two gaps are recorded for a follow-up: the proposal has no
pre-write surface yet, and the dedupe cannot see staged entries when one of them
is malformed.

## 2026-11-11, Resolve git settings and profiles into phase briefs (profile-data-and-phase-briefs)

Git behaviour now comes from data instead of prose. A repository's
`taskWorkflow.git` settings (profile, trunk, trunk merge mode) and the two
bundled profiles resolve through one resolver into a phase brief: the branch a
phase must be on, the step that creates it, and the instruction text. A new
read-only `tw_phase_brief` tool reports that brief before a phase opens, and the
same resolution produces the gate refusal, so the two cannot drift. The `default`
profile names an effort branch for the implementation and close phases and a
ticket branch for the five implementation agents; `flat` names nothing. Malformed
settings, a missing profile, and an unknown profile name each diagnose and fall
back rather than throw. The specification's `trunk` snippet turned out to repeat a
JSON key, so the operator-approved shape is `{ develop: false | string, main:
string }`.

## 2026-11-06, Vendor the pr skill into the promoted set (vendor-pr-skill)

Vendors the upstream `pr` skill (mattpocock/skills, itself credited to Dex Horthy's show-me at Humanlayer) into the promoted engineering bucket, byte-close: frontmatter intact (verbatim trigger description, credits block), body unchanged except the house preamble that the reference-coverage-suite test seam forces onto every promoted skill. Wires all nine promoted-set surfaces in one change: the manifest at 32 with both count pins, the migration target, both READMEs' Model-invoked groups, the four-section docs page carrying the full provenance chain, the router's Standalone bullet and Actions row, the structure-test file-list entry, and a minor changeset. Suite green (23 files, 1362 tests; both typechecks clean). A fresh install now auto-invokes `pr` when its agent writes a PR body.

## 2026-11-06, State the pi-subagents 0.84.0 child-tool availability shape in the warning and docs (subagent-availability-resync)

The pi-subagents launch-behaviour record is corrected to the verified 0.84.0 shape: every plain name in an agent's tools allowlist is a required child tool, and a child whose required tool never registers fails its run at agent start with "requested unavailable child tools" instead of launching. The session-start pi-telemetry warning, its companion comment, the repo-gating doc section, the README install paragraph and the skill-creator reference now state this consequence and say to install pi-telemetry before dispatching the shipped chains (10 of 11 agent allowlists name its submit_feedback tool). Both peer-warning tests and the doc-content launch test are re-pinned to the corrected wording, with one new doc-content test covering the README and reference; the full suite is green (1376 of 1376) with both typechecks clean. The record stays version-pinned with a re-verify-on-upgrade note.

## 2026-11-06, Re-sync docs/repo-gating.md to the narrowed gate (repo-gating-docs-resync)

docs/repo-gating.md now describes the narrowed gate as the implementation tickets pinned it: the 10-name gated skill manifest, the passive tools (tw_open, tw_close, tw_feedback) with tw_open restricted to non-gated skills, the skill-creator tools staying registered through the disclosure, notify_user in both states, the write lockdown keyed on its own workflow-enabled condition, and the /help limitation re-scoped to the ten; the disableOnRepo / per-repo-enable classification contract is unchanged. The pi-subagents launch-failure claim was verified against that package's source and corrected: a child whose allowlisted tool is unavailable still launches (no launch-time allowlist check exists), the missing tool is simply absent, and the real cost is the child's failed tw_feedback call; the session-start warning, README, and the skill-creator reference now state this verified shape, and seven doc-content tests pin the resynced narrative.

## 2026-11-06, Restrict tw_open to non-gated skills in gated repos (tw-open-gated-restriction)

In a gated work repo, tw_open now offers only the non-gated registry entries (today exactly skill-creator) in its parameter description and refuses any of the 10 workflow-skill names at runtime with the opener's refused-outcome shape (reason plus legal next, plus a best-effort notify), so a gated repo treats the whole manifest consistently and skill-creator opens with its full toolset exactly as in an ungated repo. The refusal deliberately lands in the execute handler rather than argument validation, because validation throws and cannot carry the refused-outcome shape; the narrowing deliberately edits the description's enumerated list rather than the parameter type, because a provider-validated union short-circuits shaped refusals (the DeepSeek breakage class this repo documents). A derivation-soundness test proves the passive gated active set can never open a workflow phase. The ungated shape is unchanged; the suite is green relative to the proven main baseline.

## 2026-11-06, Split tool registration by gate state and re-key the write lockdown (gated-tool-registration)

Tool registration is now a pure function of the gate state: a gated work repo registers exactly tw_open, tw_close, tw_feedback, the three skill-creator tools (inactive, as today) and notify_user, while an ungated repo keeps the full surface unchanged. The docs/tasks write lockdown and the transcript declared-set replay moved behind a new explicit workflowEnabled(gate) predicate instead of the raw gate boolean; refusal wording and the two exempt segments are untouched. The stale "gated five" factory fixture was replaced by dual gate-state exact-set tests bound to the landed skill manifest. Deliberate reading recorded: the session-start peer-extension warnings (pi-subagents, pi-telemetry) now fire in gated repos too, inverting one previously pinned test; the revert is one handler plus one test if that reading is ever judged wrong. The suite is green relative to the proven main baseline (identical failure and typecheck error sets).

## 2026-11-06, Static manifest of the 10 gated workflow skills (gated-skill-manifest)

The 10 gated workflow-skill names now live in one exported manifest (`GATED_SKILL_NAMES` in `src/disclosure.ts`, directly above `SKILL_REGISTRY`); the prompt-strip and `/skill:` invocation-block handlers read it, and the runtime derivation plus its stale 8-name fallback are gone. A three-part consistency test pins the manifest against `package.json` `pi.skills` basenames and the registry complement (exactly `skill-creator`), so a renamed or added skill fails the test instead of silently changing the strip. In gated repos the strip and invocation block now cover only the 10 workflow skills, so generic skills stay in the prompt and invocable in work repos; ungated repos behave exactly as before. The suite is green relative to the proven `main` baseline: failure and typecheck error sets are identical, with six new passing tests.

## 2026-11-02, Remove the migration CLI from the package (remove-migration-cli)

The package now ships exactly one migration executor, the disclosed `tw_migrate` tool. The three CLI files (the argv wrapper, the spawn shim, and its TypeScript resolve hook) are deleted, together with the four spawn-based shim tests whose coverage already lived in the tool tests; comment headers and the doctor skill's failure-cause wording were reworded so no living file names the removed CLI (dated changelog entries and archives keep their historical mentions, per the repo's exemption classes). Three permanent structure guards now pin the removal executably, following the repo's corpus-sweep prior art. Suite green: 22 files, 1299 tests.

## 2026-11-02, Reroute the migrate branch through the tool, with the branch choreography (reroute-migrate-branch)

The migrate branch of `/skill:setup-workflow` now opens its phase and calls the disclosed `tw_migrate` tool, never a shell command, with the six-step branch choreography explicit: record the integration branch, create the migration branch from it, run the tool and the test suite and the commit there, fast-forward the integration branch (explicit user approval first outside `main`/`master`), delete the migration branch, and close the phase at the end. The dry-run prose became the tool parameter. The skill's docs page and both upgrade resources name the tool as the executor; the onboard and no-op branches are byte-identical (pinned by a green-on-arrival regression test). Structure tests were rewritten around the new executor while keeping the safety-theme pins. Suite green: 22 files, 1300 tests.

## 2026-11-02, Add tw_migrate to the registered surface (tw-migrate-tool)

The migration executor moved into the registered tool surface: `tw_migrate` is disclosed by the `setup-workflow` phase opener (withdrawn on close, absent from the idle default set) and runs the untouched `migrate()` core in-process over the production filesystem port, never spawning a Node child, so the installed-copy type-stripping refusal cannot recur. The CLI's report rendering moved verbatim into a shared module the tool imports (the still-shipped wrapper imports it transitionally until `remove-migration-cli` deletes it). The glossary's Migration entry now names `tw_migrate` as the executor instead of saying "not a tool in the registered surface". Nine new tests pin disclosure and the executor seam through the public tool factory over fixture trees, with golden report literals captured from the CLI before the redirect plus a spawn guard; four registered-surface test tables and one `tw_request_tool` refusal scenario were re-scenariod for the larger toolset. Suite green: 22 files, 1295 tests.

## 2026-11-02, Reference coverage tests (reference-coverage-suite)

Made the workflow-failure reference contract load-bearing: five mechanical coverage tests in the existing structural suite assert the canonical sentence verbatim on every promoted SKILL.md (with workflow-failure the sole, explicitly asserted exemption) and every agents/ profile, plus existence and dual referencing of the WORKFLOW-INTERNALS.md resource. The covered set derives from the package manifest and directory scans, so future skills and profiles are auto-covered; failures name the offending file. Suite now 1309 passed, 0 failed; the effort's docs-complete success state is fully wired.

## 2026-11-02, Thread the reference sentence through skills and agent profiles (thread-reference-everywhere)

Threaded the canonical workflow-failure reference sentence verbatim through all 40 promoted surfaces: 29 SKILL.md files across both buckets (excluding the two design exclusions) and all 11 agents/ subagent profiles. Placement follows one rule, directly after the operator-communication preamble or in the first prose slot of the body, with exactly two added lines per file and zero other edits. Every skill and chain worker an agent loads now names the same escalation route when the workflow misbehaves, ahead of the mechanical coverage suite that makes it load-bearing.

## 2026-11-02, Write the workflow internals reference (workflow-internals-reference)

Shipped WORKFLOW-INTERNALS.md under task-workflow-overview: the agent-facing internals reference carrying the big picture, the ASCII artifact tree, mermaid flow charts for the main flow and the phase-gate state machine, the tw_* tools by disclosure scope, the refusal shapes and their legal routes, and the escalation ladder in brief. The overview SKILL.md now links the resource, carries the router row for /skill:workflow-failure, and holds the canonical reference sentence. The previously designed-red router test is green again; the full suite stands at 1304 passed, 0 failed.

## 2026-11-02, Create the workflow-failure skill (create-workflow-failure-skill)

Created the promoted, model-invoked engineering skill `workflow-failure`, the single owner of the workflow escalation ladder: act on a refusal's own reason and legal_next, reorient from the internals reference or route to task-workflow-doctor, record the snag with tw_feedback, then stop and escalate with the five-part completion report that ends the run. Hand-editing the tree, skipping a gate, and invented workarounds are forbidden at every rung. Shipped with full convention sync (package skill list, READMEs, four-section docs page, CONTEXT.md glossary, migration target, changeset) and structural tests. The agent-facing fallback for stuck runs now exists; the escalation ladders it documents land in the remaining tickets of the effort.

## 2026-11-01, Validate advisory review disposition targets (advisory-disposition-target-check)

`tw_write_review` now validates every disposition target in both review passes. The finalize pass already refused a `ticket` disposition naming no ticket in the effort and a `follow-up` naming no live effort stamped `origin_effort`; the advisory pass, where the finalize triage records its dispositions of the end-of-effort findings, did not. A typo'd or invented slug therefore recorded "ticketed to X" for a ticket that never existed, and because `tw_archive_effort` deliberately skips `pass: end-of-effort` artifacts, the effort still archived with a dangling pointer and the finding was silently stranded.

The check is now one `validateReviewTargets` helper called from both branches, so the two passes cannot drift apart again. The existing finalize refusals keep their message, and `tests/lifecycle-hardening.test.ts` gains a case for the advisory pass. Both typechecks and `npx vitest run` were green after the landing.

## 2026-11-01, Give the effort close a living-architecture reconcile (finalize-architecture-reconcile)

The effort close now owns the living architecture document. `finalize-effort` discloses `tw_write_architecture` and its SKILL gains a "Reconcile the living architecture first" step, which reads the deviation reports, the ticket notes, and the diff and records the corrected document before the holistic review; the docs page states the same contract. The gap it closes: every end-of-effort reconcile runs inside a ticket chain, so nothing reconciled a landing made after the last ticket, and this effort's own five post-landing fix commits left `arch-spec.md` describing behaviour the tooling no longer had.

The reconcile stays read-only toward code, and the two informational triage rules are unchanged. On a schema-4 tree the v5 writer refuses the legacy `arch-spec.md` (it refuses the legacy shape rather than creating a second architecture document beside it), so the SKILL and the docs page say that a schema-4 effort records the stale document as a gap until the repo migrates; this tree took that path and the outcome is recorded in the ticket note.

`tests/opener-gate.test.ts` pins the registry entry. Both typechecks and `npx vitest run` were green after the landing.

## 2026-10-31, Reconcile the end-of-effort review findings against the shipped v5 (end-of-effort-reconciliation)
The effort's whole-effort review left twenty findings no ticket owned; six were fixed at `8e1080c` and this ticket closes the rest. The write lockdown now covers the workflow's own writes instead of contradicting them: `isTaskTreePath` exempts `**/.work/**` and `**/deviation-reports/**` (scratch and evidence beside an artifact, neither of them an artifact type) with path traversal still refused, `lockdownReason` names both exemptions and the named writer a refused write should reroute to, and `tw_write_ticket_note` becomes the only writer of a ticket doc's `## Implementation notes`. Ticket concurrency is documented as what it is: one ticket at a time in level order, levels as strict barriers, because no worktree isolation exists and two chains in one tree would race on `git switch`, with worktree isolation recorded as the next effort's seed. The overview's read-only table routes each row to the phase that declares the tool, `tw_show` is disclosed to `wayfinder` and stays in `skill-creator` with its signature rotated to `skill_validate`, and an invariant fails if a phase carries `tw_state_set` without `tw_state`. The retired bug substrate leaves live instructions: the bug-closure step and both resource copies are gone, `code-review` reads a `docs/bugs/` path as an archive only, and `setup-workflow` stops scaffolding it. Three unsupported claims are amended in the spec and the arch spec (the `ready_for_spec` auto-clear now names the writers that exist, the one-owner rule names wayfinder's planning half and `tw_split_ticket`'s supersede, and the report templates name the nine run-ending skills), plus the stale claim that `docs-resync` was the final ticket. Both duplicated writers collapse into `writeEffortRootArtifact` and `writeTasksIndex`, which fixes the index sort drift, and the triplicated close-out becomes one sequence the two resources point at. The doctor narrows to a missing `CONTEXT.md` and a missing `docs/tasks/` and drops the five resources that no longer have a scope. `tsconfig.test.json` and a `typecheck:tests` script join the CI protocol, exposing and fixing 36 test-stub type errors the old single-config gate never saw; the em-dash guard covers the corpus with the historical-record exemptions its comment had promised; `.changeset/` holds one major entry for v5 instead of four describing the retired `implement-task`; `docs/workflow-flows.md`, the stale handoff, and "decision task" are gone. An isolated probe with this package as the only loaded package then found a blocker the suite could not: `tw_open`'s TypeBox union serialized to a bare `anyOf` with no top-level `type`, which DeepSeek and OpenAI reject, and since `tw_open` is declared in every state that failed each request rather than one call; `buildOpenParameters` now declares `type: "object"` beside the union, and two pins require every registered tool's schema to be object-shaped at the top level and `tw_open` to keep its per-skill `anyOf`. One correction landed after the merge: an agent's `tools:` allowlist does not load the extension that registers a tool, so the landing worker composes the note and the phase writes it through the named tool, and a policy invariant forbids any agent from naming a `tw_*` tool, which keeps every `docs/tasks/**` write independent of which packages a child session happens to load. 1182 tests green, both typechecks clean.

## 2026-10-31, Documentation re-sync against the implemented v5 (docs-resync)
The effort's final ticket audits the shipped prose against the shipped v5 and fixes what drifted. `CONTEXT.md` is rebuilt from the v4 language (`slice`, `maps/`, `triage`, `docs/bugs/` as a live substrate, `schema_version: 4`) into 29 glossary entries with `_Avoid_` lines, a rebuilt `## Relationships`, and a `## Flagged ambiguities` section, covering the effort and its front door, the two graph kinds and their kind-scoped `blocked_by`, the frontier and dependency levels per kind, the specification, the living architecture document, the review artifact and its dispositions, `origin_effort` as provenance on the child, the archive, the state pointers, and the invocation model. The top-level `README.md` loses its pre-v5 claims ("3 agents instead of 7", "6 skills instead of 10", "Legacy slice resolution preserved") for a section describing what v5 enforces, its install block stops advertising the retired bug substrate, and its workflow section tells the intake to finalize-effort arc with setup-workflow once per repo. Both bucket READMEs are corrected: `setup-workflow` moves to user-invoked where it belongs, the `report-bug` link goes (the skill is deprecated and not promoted), the missing model-invoked engineering and productivity skills appear, and the `adopt-mp-skills-way` note is removed. Ten tests pin the result and every one derives its truth rather than restating it: the README inventories from `package.json` `pi.skills` plus each `SKILL.md`'s `disable-model-invocation`, `pi.skills` from `docs/migration-target.yaml`'s `promoted_skills`, and `CONTEXT.md` from its own `**Term**:` entries plus a retired-vocabulary blocklist that exempts the `Migration` entry. The deviation report raised four items, all resolved here: the "names every user-reachable skill" criterion is answered for the full promoted set rather than user-invoked only, so the overview router gains `/skill:tdd`, `/skill:code-review`, and `/skill:skill-creator` and its "Vocabulary underneath" section becomes "References underneath"; `skills/deprecated/README.md` stops retiring `report-bug` in favor of the retired `triage` and names `intake`; `docs/agents/README.md` drops the `triage-labels.md` bullet, a config surface with no producer; and `docs/repo-gating.md` drops a stale `pi 0.80.10` version pin. Three sites are deferred with the report's agreement: `docs/workflow-flows.md` as a whole-document v4 rewrite, "decision task" in the overview pinned by a landed v4 test, and the `docs/bugs/` instructions inside `implement-ticket` and `code-review` as behavioral prose. 1145 tests green, typecheck clean.

## 2026-10-31, finalize-effort runs the holistic review, triages findings, and archives (finalize-effort-skill)
`finalize-effort` lands as the model-invoked effort close: one holistic, read-only review of the whole effort, a triage of every finding into an implementation ticket, an accepted follow-up effort, or an explicit informational acceptance, and the archive through the named move. The review writer was deliberately absent from the landed transition tools, so this ticket lands `tw_write_review`, the only writer of `docs/tasks/<effort>/review.md`: it writes `type: review` and is the producer that sets the `dispositioned` flag the landed archive gate already reads, turning it true only when every finding in its `findings` list carries a disposition, so a refused archive still has the triage tools declared and the triage can complete inside the open phase. The cross-effort move is a mode of the same writer rather than a second owner: `follow_up` writes the findings body into the accepted child's `review.md`, one copy and not two, and rewrites the origin's artifact as the disposition record naming the follow-up slug with the flag set, so the origin releases for archive and the trail reads in both directions. The additive `origin_effort` link had no writer either, since the `docs/tasks/` lockdown refuses the built-in write and edit, so `tw_create_effort` gained it as an optional argument validated against a live effort and omitted by default; it stays a map field on the child, so it never enters the frontier or `blocked_by` semantics. `tw_write_review` joins the `finalize-effort` toolset and `tw_archive_effort` is listed first, because `signatureToolOf` returns the first skill-private tool and the derived signature had been `tw_finalizable` while the registry comment claimed the archive move; a test now pins the derived value. The skill ships with `resources/report.md` in the shared five-part shape, a `docs/engineering/finalize-effort.md` page with the four required sections, and its registration in `pi.skills` and both bucket READMEs. The top-level `README.md` had no skill inventory at all, so the promoted-set list, grouped by invocation model and linked to each `SKILL.md`, was created here for this skill to be referenced as the repo mandate requires; `docs-resync` audits it. 1135 tests green, typecheck clean.

## 2026-10-30, task-workflow-overview and task-workflow-doctor re-scoped (overview-doctor-rescope)
The overview is rescoped to the v5 arc: a `tw_next` fast track for the live answer, then a one-paragraph short version, then the main flow, then the linked `PHASE-BOUNDARIES.md` deep layer, so a reader can stop at any depth; the flow now runs intake, wayfinder, to-spec, to-tickets, implement-ticket, finalize-effort, with setup-workflow once per repo, and all seven phase skills appear as invocations. The doctor narrows to what the tools cannot self-diagnose: a legacy or unversioned tree, missing scaffolding, a failed migration, and routing when an opener refuses. Two resources are added for scopes that had no home (`failed-migration.md`, `opener-refusal.md`), `okf-conformance-failure.md` and `missing-tasks-tree.md` are repointed from the v4 to the schema-5 story, and `missing-bugs-dirs.md` is removed because `docs/bugs/` is an archive now with no live failure mode. The deviation report found the rescope reading "every user-reachable skill" as the seven phase skills and silently dropping the `/skill:eval-review` and `/skill:skill-review` on-ramps; both are restored with a test pinning them, and the doctor's `opener-refusal.md` loses an "undispositioned findings on archive" row that is a thrown error from `tw_archive_effort`, not an opener refusal. `/skill:handoff` stays in the deep layer. 1104 tests green, typecheck clean.

## 2026-10-30, implement-ticket owns the ticket phase and the inline close-out (implement-ticket-skill)
`implement-ticket` becomes the model-invoked owner of the implementation phase, replacing the ticket half of `implement-task` and all of `finalize-task`; both retired skills move to `skills/deprecated/` with their replacements named and leave `pi.skills`, the bucket README, and the docs page tree. It reads the architecture document rather than drafting one, so a missing or unstable document is an opener refusal, and it owns the ticket frontier, the dependency-level loop with concurrency inside a level and strict barriers across levels, the per-ticket chain dispatch, the failure toolbelt, and the end-of-effort pass. The per-ticket close-out runs inline in the same autonomous run: CI gate, knowledge harvest, changelog through `tw_write_changelog`, `tw_mark_done`, `tw_finalizable`, and merge, which keeps this phase the only thing that sets a ticket's `workflow_state: done`. The ticket resources and `ticket-chain.js`/`end-of-effort.js` move under `implement-ticket/` with the chain return shapes unchanged. Two defects the deviation report raised were fixed before landing: the close-out hardcoded `main` in the CI gate, the final merge, and the push, and now names `<effort-branch>`, the branch the previous ticket landed on, across `SKILL.md`, both `autonomous.md` resources, and `report.md`; and the async-dispatch callout no longer claims tickets within a level run sequentially, which contradicted the level loop and the ticket's third criterion. Criteria 4 to 8 were already satisfied by the first commit, so the continuation verified them and added four acceptance pins for the model-invoked registration, the script location, and the retirement surface. 1095 tests green, typecheck clean.

## 2026-10-30, to-spec drops the seam interview and gates on ready_for_spec (to-spec-rescope)
`to-spec` no longer runs a seam interview: the `ready_for_spec` gate in the opener, landed upstream by `opener-gate-and-toolsets`, refuses the open with a pointer back to Wayfinder while the flag is false, and the prose was rescoped to match, so no human-facing surface still asks for a seam conversation. The ticket's surface was the `SKILL.md` rewrite, the `tw_write_spec` writer contract, and the full section set, and `docs/engineering/to-spec.md` was re-synced in the same commit per the docs-page mandate, since the page's rescope is a consequence of the same criterion. Eight tests in `tests/skills.test.ts` pin the surface. 1099 tests green, typecheck clean.

## 2026-10-30, intake, the single front door (intake-skill)
`intake` lands as the user-invoked single front door for a new effort, replacing `triage`, because starting an effort is a deliberate human act and it is where the raw request and the stories enter. Two creation tools landed with it, which the carried constraint assigned to this ticket to keep one private signature tool per registry entry: `tw_create_effort` writes the map through the frontmatter seam, seeds empty `## Non-goals` and `## Non-negotiable facts` placeholders, registers the effort in the root index's `## Live` list (sorted, creating `docs/tasks/index.md` when the tree has none), and refuses an unsafe slug, an existing live effort, and a stray directory under `docs/tasks/` that holds no map. The landing also folded in main's run-watchdog changeset. 1091 tests green, typecheck clean.

## 2026-10-30, skill-creator bundles its scripts as a disclosed nested toolset (skill-creator-nested-toolset)
The three bundled `skill-creator` scripts become registered tools: `skill_validate`, `skill_scaffold`, and `skill_discover` are added in `createTools()`, each running its bundled `.mjs` directly through `spawnSync` with no shell and the session directory as cwd, and a nonzero exit fails with the script's own message. They are registered gated (`exposure: "direct"`, `defaultActive: false`), so they are declared only while the skill is open, and the disclosure registry entry for `skill-creator` now nests them beside `tw_show`. Eight new tool-seam tests in `tests/skill-creator-scripts.test.ts` pin the seam, and the 22 CLI-seam tests prove the bundled scripts still work from their bundled location. 1060 tests green, typecheck clean.

## 2026-10-30, Per-skill report resources and the shared completion-report shape (skill-report-resources)
Nine per-skill report resources land under `skills/engineering/{wayfinder,to-spec,to-tickets,implement-task,finalize-task,triage,setup-workflow,task-workflow-overview,task-workflow-doctor}/resources/report.md`, each carrying the fixed five-part order (what is now true, what needs the human, what to run next, what is broken or blocked, one pointer to the detail) as its only sections, tuned per skill, with the failure and escalation variant stated in each intro and the never-inline plus simplified-technical-English rules at the end. A `## Report` pointer section in each of the nine `SKILL.md` files keeps the shape out of the skill bodies, so no `SKILL.md` restates it inline.

## 2026-10-30, Every grilling session delegates to the grilling skill (grilling-delegation-fix)
Every grilling session now delegates to the `grilling` skill, which is its only home; the round-based frontier method is named in the grilling section of both the arch spec and `spec.md`, and the router correction is recorded in the arch spec's per-ticket contract (entry 12) and in `spec.md`'s decision. The spec-side re-sync of the archival architecture content, already migrated to `arch-spec.md` by `to-tickets-architecture`, is recorded in the implementation notes so the `docs-resync` pass does not repeat it.

## 2026-10-30, to-tickets produces the architecture document and the ticket graph (to-tickets-architecture)
`to-tickets` produces the architecture document through `tw_write_architecture`, a named stable writer with a `publish: true` parameter mirroring `tw_write_spec`, because the landed implementation gate refuses a non-stable architecture document. The writer carries an additive refusal family beyond the ticket's letter, each test-pinned: no spec present, a legacy effort-root `arch-spec.md` accepted as input only and never written to, and a duplicate architecture document elsewhere refused so an effort keeps exactly one living architecture document. The private signature tool rotated to `tw_write_architecture`, and `tw_map_finalizable` stays in the `to-tickets` toolset because removing it would leave a registered tool disclosed by no phase toolset and fail the disclosure invariant. It also produces the v5 ticket graph. Bug-only handling stays prose-level in the skill rather than tool-enforced.

## 2026-10-30, Wayfinder absorbs planning, bounded passes, and the reconcile (wayfinder-reconcile-and-passes)
`wayfinder` absorbs the planning phase and becomes user-invoked: it runs a bounded pass (one `tw_frontier` snapshot, the non-grilling ready tasks, at most one grilling, release, never the next frontier), serializes per kind so two grillings never run at once while research and prototype may run concurrently, writes back per task through `tw_write_section` before `tw_mark_done`, and reconciles on an empty ready frontier with the ready flag set only through `tw_finalize_map`. The map body template moves to schema 5. The four planning resources consolidate under `wayfinder/resources/`, the duplicate `implement-task/resources/` planning files are deleted, the `implement-task/SKILL.md` router and `research/SKILL.md` are repointed, and `grilling.md` keeps the task document while delegating every session to the `grilling` skill. One divergence is recorded: the prose says "the ready flag" rather than the literal `ready_for_spec` token, because the landed opener guard refuses that token in phase-skill prose. 970 tests green, typecheck clean.

## 2026-10-30, Opener-as-gate preconditions and the per-skill toolset registry (opener-gate-and-toolsets)
The registry in `src/disclosure.ts` becomes the single table: skill to toolset, skill to gate kind (`none`, `effort`, `spec-ready`, `implementation`), plus the symmetric conflicts table. Gate evaluation lives only in `phaseGate` in `src/pi.ts`, computed from the real tree through `scanMemo` and the `art.ts`/`graph.ts` seams, so no gate prose remains in the skills. All seven listed refusals return `opened: false` with a reason and a `legal_next`, leaving the toolset closed, and duplicate and conflict refusals carry `legal_next` too, while a legal open activates the phase toolset and returns `details.opened === true`. `to-spec` opens only on `ready_for_spec: true` and otherwise points back to Wayfinder; `implement-ticket` refuses a missing or unstable architecture document. 953 tests green, typecheck clean.

## 2026-10-30, Schema-5 migration target and the upgrade-4-to-5 resource (migration-target-and-upgrade-resource)
The migration target now stamps `schema_version: 5` with no schema-3 claims left, and `setup-workflow` gains `upgrade-4-to-5.md`, a resource following the `upgrade-3-to-4.md` shape and covering the architecture rename, the map body rename, and the `ready_for_spec` and `origin_effort` additions. Six files touched with +446/-167, including the `setup-workflow` skill branch, its docs page, and the script and skills tests. 925 tests green after the merge, typecheck clean.

## 2026-10-30, Implementation transition tools, escapes, changelog, and archive (implementation-transition-tools)
The eight v5 writers land in `src/pi.ts`, one per named transition: `tw_write_spec`, `tw_add_ticket`, `tw_split_ticket`, the ticket half of `tw_mark_done`, `tw_write_changelog`, `tw_mark_blocked`, `tw_record_out_of_scope`, and `tw_archive_effort`, with `tw_resolve_uncertainty` and `tw_state_set` untouched. The write guard now also pins `docs/tasks/CHANGELOG.md`, so the changelog writer is provably its only writer. Fifty new contract tests across eight describes pin the writers one per writer, and the unnamed tools follow the `tw_<verb>_<object>` family. 915 tests green, typecheck clean.

## 2026-10-30, Planning transition tools and the ready_for_spec checking tool (planning-transition-tools)
`tw_set` leaves the registered surface and three planning writers replace it: `tw_write_section`, `tw_finalize_map`, and the planning half of `tw_mark_done`, which carries the write-back precondition and the `ready_for_spec` auto-clear. The section writer accepts any named `##` section so wayfinder write-backs work, the write-back precondition is a slug-token reference in the map body, and planning done-marking also clears `ready_for_spec`; all three are recorded as divergences in the ticket's deviation report. 866 tests green across 17 files, typecheck clean.

## 2026-10-30, Migration v4 to v5, one idempotent hop (migrate-v4-to-v5)
The migration's one hop now targets `schema_version: 5`: `rebuildState` stamps 5, `MigrateReport.to` reports 5, the `arch-spec.md` to `architecture.md` rename covers type and filename in both the live and archived layouts (effort root for the single-document case, an in-place leaf rename when an effort carries several architecture documents so nothing collapses), the map body renames `## Out of scope` to `## Non-goals` and appends a `## Non-negotiable facts` placeholder when missing, and the CLI reports a schema-5 no-op. The reshape is a branch in the one existing engine, reusing the `reorganize` pass, `TreePort` staging, the undo journal, and the YAML-verify-before-lands rule, so idempotence and failure atomicity carry over rather than being re-promised. The tests pinning the v4 stamp moved to schema 5 as the ticket specified, and `detectVintage` needed no new branch because the stamp read already returns 5 for a schema-5 tree.

## 2026-10-30, Progressive disclosure core, the three-way flip, and nested opens (disclosure-open-close-core)
Progressive disclosure lands as a pure module, `src/disclosure.ts`: the skill registry with a symmetric `conflicts` table (adding a skill is a table entry, and the check is order-independent), a discriminated-union parameter builder, `validateOpenArgs` as the runtime backstop for a provider that flattens the union, and `openSkillsIn`, which derives the open set from the active tool set through per-skill private signature tools so the declared set and the open state cannot disagree and transcript persistence is inherited. `src/pi.ts` gains the three structured tools: `tw_open` refuses exactly a duplicate or a conflicting skill and discloses the skill's toolset plus `tw_close`; `tw_close` names its skill and removes only the tools no remaining open skill still needs, dropping itself when the last skill closes; `tw_next` is always declared, never errors, and never suggests closing. Registration is the bypass-free combination (every workflow tool `exposure: "direct"`, `defaultActive: false`, only the dispatcher pair idle), re-asserted from the transcript on resume and fork. Re-verified after a prior attempt hit its script timeout mid-implementation with the suite already green.

## 2026-10-30, Write lockdown on docs/tasks and the dropped bash scan (write-lockdown-guard)
A write lockdown now blocks the built-in `write` and `edit` tools on any path under `docs/tasks/**`: `guardTaskTreeWrites` and `isTaskTreePath` in `src/pi.ts` register a `tool_call` handler inside the personal-repo branch, covering relative, absolute, and `..`-traversal paths and passing everything else through. It is a hook, so it is independent of the active tool set and holds in every phase; `docs/bugs/**` stays writable and the `docs/tasks-archive` lookalike is not caught. No bash command-string scan exists, and the residual risk that a shell command can still mutate the tree is documented in a new section of `docs/repo-gating.md` rather than papered over. `tests/gate-factory.test.ts` grew the blocked and allowed matrices plus a toolset-independence test and bash passthrough. 26/26 ticket tests, 815 full suite, typecheck clean.

## 2026-10-30, Schema-5 artifact model, readers, and map sections (schema5-artifact-model)
The schema-5 additive model delta lands in `src/core/art.ts`: `architecture` and `review` types with `architecture.md` and `review.md` filenames at the effort root, `ready_for_spec` as a strict boolean that reads false when absent, an `origin_effort` map field, and the `MAP_SECTION_NON_GOALS` / `MAP_SECTION_NON_NEGOTIABLE_FACTS` constants with a `readMapSection` reader that aliases `## Out of scope` to non-goals. `src/core/graph.ts` needed no code change, because the two graph behaviors the ticket names (the spec-plus-zero-tickets refusal and no missing-architecture anomaly for bug-only efforts) are already-guaranteed invariants, pinned by new tests in `tests/graph.test.ts` instead of new logic. `ready_for_spec` awareness in frontier and finalizability is deliberately left to `planning-transition-tools` and `to-spec-rescope`, since requiring the flag in `effortFinalizable` would break every v4 map before the migration runs. 809 tests green across 15 files.

## 2026-10-30, Full dependency update pass, including pi-coding-agent 1.0.0 (bump-dependencies)
The full dependency update pass lands the load-bearing `@earendil-works/pi-coding-agent` at 1.0.3 with the peer range kept open at `*`. The 1.0.x bump hoisted `pi-ai` to the top of `node_modules` and killed the harness's old nested `dist` import, so `tests/integration/harness.ts` imports `@earendil-works/pi-ai/compat` and `@earendil-works/pi-ai` directly and the dependency is declared rather than phantom. `@types/node` stays pinned to `^24.19.1` on purpose, runtime-matched to `devenv.nix`'s `nodejs_24` and the actual v24.21.0 runtime rather than npm-latest 26.x, which would describe a runtime this repo does not run. Major jumps beyond the pi bump (`@changesets/cli` ^3.0.3, `typescript` ^7.0.2, `vitest` ^5.0.3, `pi-subagents` 0.76.0) ride on the green suite plus typecheck as the compatibility proof; 785 tests across 15 files, typecheck clean, `npm ci --dry-run` and `npm ls` clean.

## 2026-10-01, Fix the schema 3 to 4 migration collapsing map-subtree tickets onto tickets/null/ (migrate-null-slug-ticket-collapse)
The live and archived `maps/<map>/(tickets|tasks)/<slug>/` branches of `vintageLocation` returned a null slug, `v4Home` interpolated it into the destination template (JS `${null}` becomes the literal text `null`), and the plan's writes Map silently overwrote earlier writes at the same destination, so every ticket of a live map collapsed onto one `tickets/null/ticket.md` file; a downstream repo lost 11 of 12 tickets and recovered them from git. Fixed in three layers: the map-subtree branches derive the slug from the directory after the container (mirroring the archive branch), `v4Home` reports a `no-slug` needs-human item and leaves the artifact in place instead of interpolating, and every staging site claims its destination first so a second source becomes a `destination-collision` needs-human item (first claim stands, later sources left in place) rather than a silent overwrite. Aux files follow their ticket into its directory again. Red-first regressions in `tests/migrate.test.ts` cover the two-ticket fixture, aux anchoring, the archived-map subtree, the slugless ticket, the deliberate two-source collision, and re-run idempotence; full suite 740/740, typecheck clean.

## 2026-10-01, Eval-stack research and the hermetic isolation spike (pi-harness-evals)
Closed the eval-planning effort whose deliverable was the decision-complete plan for the eval-creator build. eval-stack-research captured the verified Inspect/pi API facts (task anatomy, custom scorers running commands and reading files, model_graded, headless modes, resource-narrowing flags, custom providers via models.json) into a durable findings file; pi-headless-isolation-spike proved hermetic headless pi runs (temp agent dir seeded with only auth/models/a packages-stripped settings, full disable flags, explicit re-adding via --skill and -e, a canary extension proving the loaded set, planted leaks detected) and committed the runner recipe in its findings, which the v4 overhaul's eval-review skill distilled into its isolation checklist. The map's decision set (the full headless session as eval subject, own-auth + local runner, user-invoked eval-creator, suite location and override rules) is synthesized into the live build-eval-creator-skill spec, which stays live as the handoff for the future build; the eval-review companion skill itself shipped earlier. Map and both tasks archived, spec given conformant frontmatter so the scan tools see it.

## 2026-10-01, Backfill human-facing docs pages for promoted skills (backfill-skill-docs-pages)
Created the 27 missing human-facing docs pages for the promoted skills (29 total with the verified `eval-review` and `handoff` pages), each carrying the four sections (`What it does`, `When to reach for it`, `Common questions`, `It's working if`) and v4-true content for the seven overhaul-changed flow skills plus setup-workflow, code-review, and tdd. Five structure-test seams in `tests/skills.test.ts` pin page presence (derived from `package.json` `pi.skills`, never a hardcoded list), section order, no pages for non-promoted buckets, surviving tools only, and the v4 effort path. The advisory two-axis review drove one coherence pass: the implement-task page's chain wording fixed (slice-verifier and deviation-reporter run in parallel behind an ok-gate), the tdd page gained the standards direct reads, and a stale session.test.ts count in docs/testing.md corrected; a major changeset now covers the overhaul's package surface changes. 1 slice, 733 tests green, typecheck clean.

## 2026-09-29, Execution-side skills to v4 (overhaul-execution-skills)
Rewrote the execution side for the v4 tree: implement-task routes on `subtype` from frontmatter (type fallback, feature default), hard-refuses autonomous dispatch for `mode: human` tickets handing back the re-invocation, and runs per-ticket chains over the effort frontier (effort-root frontmattered arch spec, size-keyed workflow budgets defaulting m, splits registered as sub-tickets that supersede the original via deprecated plus done). finalize-task now owns the `workflow_state: done` marking (set tool, then `tw_finalizable` verification), clears the pointers, does no per-ticket move, and when the effort finalizes archives it as a unit with deprecated marking and root-index regeneration; the impeccable-note check and every ui-noter dispatch are gone. Standards are read directly (AGENTS.md, CONTEXT.md, docs/standards.md, docs/testing.md) with `get_guidelines` and `ui-noter` gone from every skill and agent, so overhaul-dead-surface stays a pure deletion. The whole-effort review drove one coherence pass: both pipelines' chain pseudocode rebased onto the real workflowScript API (keyed awaited `runs.run`, `outputReference` pointers), finalize's effort self-merge removed, and the stale one-liners (bucket README, router) re-synced. 1 slice, 767 tests green, typecheck clean.

## 2026-09-29, Planning-side skills to v4 (overhaul-planning-skills)
Rewrote the five planning-side skills for the v4 tree so producers write conformant artifacts by construction: wayfinder maps and decision tasks (v4 frontmatter, no kind/slug/map/tasks fields, state pointers set on create and resume, the root index regenerated on map creation, the four planning resources re-templated and feature/bug planning deleted in favor of `/skill:to-tickets`), to-spec writing a frontmattered effort-root `spec.md` (draft, stable on approval), to-tickets writing v4 `ticket.md` files with no `slices:` field and an honest by-hand contract (the directory is the registration), the doctor's new OKF conformance symptom with detection and per-producer routing, and the router telling the v4 story. The `tw_list` v4 rework (a gap no ticket owned, folded in by user decision) rebuilt the tool on the scan layer with `effort`/`workflow_state` filters and `effortGroupOf` exported from the graph module. A template-conformance seam runs every prose frontmatter template through the repo's own parse/conformance engine, so producer prose cannot drift from the engine's rules. The docs-page deferral is tracked as `backfill-skill-docs-pages` on the map. 1 slice, 716 tests green, typecheck clean, whole-task review OK with notes (the one P1 em-dash and test smells fixed in the landing).

## 2026-09-18, Rename the tool family to the tw_ prefix (overhaul-tw-rename)
Renamed all 17 registered tool identifiers from the `task_` prefix to `tw_` in one mechanical pass: `src/pi.ts` registrations and label derivation, the seven skills that name tools, the four test files, and every living doc (`README.md`, `CONTEXT.md`, `docs/testing.md`, `docs/migration-target.yaml`, `rewrite-plan.md`, the live `docs/tasks/` tree). The soon-to-die tools renamed with the family so `overhaul-dead-surface` stays a pure no-references-remain deletion. A new corpus assertion in `tests/skills.test.ts` walks the package and fails on any old-prefix reference outside an explicit historical-record exemption set, guarding the wildcard form too, which makes the acceptance grep non-regressable. Two sweep defects found at verification (the arch-spec's own rename table and dated changelog entries eaten by the sweep) were fixed by restoring the records and defining the exemption class up front. 1 slice, 667 tests green, typecheck clean, prefix-only diff on every touched line.

## 2026-09-18, Scan-based graph tools and an honest schema reference (overhaul-graph-tools)
Rebuilt the graph tools on directory scans of each artifact's own frontmatter: `src/core/graph.ts` computes frontiers, per-kind dependency levels (task chains and ticket chains independently), and finalizability from the new `EffortGraph`, with the spec-plus-zero-tickets rule killing the false-finalizable class and every anomaly class (orphan, missing `blocked_by` target, invalid status pair, deprecated-as-done) reported instead of silently dropped. `task_finalizable` is now status-based (`workflow_state: done`, with a v3 fallback to legacy `status: done` so the unmigrated live tree keeps finalizing), and the `task_context` schema reference was rewritten in full for v4: the two-phase flow including ticket generation, every artifact type with its fields, the conformance rules, `mode` and `size`, no slice block, no killed fields. The scan-based path also retires the archived-done-child frontier bug: children resolved from disk, never from the map array, so archived done children keep their dependents unblocked. A whole-task review drove one coherence pass: schema-invalid fixture pairs replaced, the deprecated set now reported by every graph tool (not only the frontier), and the task/arch-spec records re-synced with the landed code. 1 slice, 664 tests green, typecheck clean.

## 2026-09-17, One v4 migration from any vintage, plus setup-workflow v4 (overhaul-v4-migration)
Added the single migration that takes a repo's `docs/tasks/` tree from any vintage (fresh, unversioned, v1 nested state, v2, v3, flat, maps-subtree, archived) to the v4 effort-grouped OKF bundle. It is a tested unit (`src/core/migrate.ts`) that imports the real v4 model rather than re-encoding the layout tables, with every filesystem operation behind a `TreePort` so failure injection and in-memory fixtures are possible; `setup-workflow` invokes it through a CLI shim and now keys its fresh/migrate/no-op detection on `schema_version: 4`. The non-negotiables are real, not promised: every staged rewrite is YAML-verified before a byte lands, `commit()` snapshots every touched path into an undo journal and restores it on any failure (files and directories), a second run is a no-op, and an interrupted run resumes. Two whole-task reviews drove two coherence passes that fixed defects the chain's own tests missed: corruption safety was proven only for the in-memory test double while the production port had no undo at all (reproduced with a real EACCES failure on a fixture, never on live data), idempotence broke whenever the tree held a vendored clone, one source could be staged to two destinations so the vendored relocation silently no-opped, and the vendored rule was name-based and could relocate a user's own notes. 1 slice, 616 tests green.

## 2026-09-17, v4 artifact model: dual-shape frontmatter parsing and resolution (overhaul-artifact-model)
Added the version 4 artifact model and a scan-based resolver that reads both tree shapes. `Artifact` now carries the OKF `type`, the workflow `subtype`, `status` with its companion `workflow_state`, `mode`, `size`, and a `shape` marker; the old `kind` field is gone, and a v3 file's `kind`/`type` map onto `type`/`subtype` so old artifacts keep parsing. `validateCombination` enforces the allowed status pairs (draft only with todo, deprecated only with done, stable with any), and `findAnomalies` surfaces invalid combinations, orphans, and missing `blocked_by` targets as data for the graph tools. The resolver honors the wanted type on every branch, fixing the audited bug where a wanted kind was ignored on the slug branch and a map lookup could return a task; it also resolves spec-only and arch-spec-only effort directories, aux files, and both the live and archived layouts. Two whole-task reviews drove two coherence passes: the orphan check now catches both type/location mismatch directions, effort scoping is shape-aware (v3 by frontmatter `map:`, v4 by effort directory, maps as their own scope so real feature-to-feature edges are not false positives), and the layout tables are unified in one model constant. 1 slice, 537 tests green, live-tree anomaly stream at zero over 118 artifacts.

## 2026-09-17, State module v4: lossless round-trip, real nulls, map and task pointers (overhaul-state-module)
Moved `docs/tasks/state.yaml` to the v4 contract: `WorkflowState` is now `{ map, task, rest }`, where `rest` is the lossless bag of every key the module does not model, so `schema_version`, a legacy `slice` key, and a v1 `active` block survive every read-modify-write verbatim. This kills the demonstrated live bug where `task_state_set` silently deleted the `schema_version` key `setup-workflow` keys its migration detection on. `task_state_set` accepts exactly `map` and `task` (anything else is rejected with an error naming both), `task_state` shows both pointers, nulls serialize as real YAML null instead of the string `"None"`, and the module never stamps `schema_version` (the migration owns the 3-to-4 flip). 1 slice, 471 tests green, typecheck clean.

## 2026-09-03, Largely adopt Matt Pocock's skills repo way (adopt-mp-skills-way)

Reorganized skills into engineering/productivity/misc/in-progress/deprecated buckets with promotion rules; adopted Matt's strict two-phase planning (wayfinder = decisions only -> to-spec -> to-tickets -> implement-task); added 12 skills (prototype, research, resolving-merge-conflicts, wizard, handoff, to-questionnaire, teach, writing-for-agents, triage, grill-me, to-spec, to-tickets); retired report-bug + grilling-with-ui; re-aligned grilling/code-review/tdd/domain-modeling to Matt's current; rewired implement-task with implement-spec graph/concurrency language; scaffolded repo-root AGENTS.md + CONTEXT.md + docs/adr/ + docs/agents/ + docs/tasks/out-of-scope/; integrated changesets into release.sh; no-em-dashes sweep; built the reusable setup-workflow migration skill + upgrade-2-to-3 resource + docs/migration-target.yaml distilled from the proven run. 434 tests green, schema_version 3.

## 2026-09-03, Complete the compare-to-mp-skills map
The initiative is complete: this repo's workflow is now a fusion of mp-skills' breadth/composability and our automation depth/structural enforcement, delivered across 13 tasks. New model-invoked skills shipped: `/tdd` (test-quality reference + companion `tests.md`/`mocking.md`), `/code-review` (two-axis review), `/codebase-design` (architecture mapping), `/domain-modeling` (concept/invariant modeling), `/grilling` (Matt Pocock's canonical design-tree protocol, text + visualizer variants), `/improve-codebase-architecture` (read-only scout + offline HTML report with vendored Tailwind/Mermaid), `/diagnosing-bugs` (6-phase debugging), and `/task-workflow-doctor` (workflow diagnosis). The tdd-worker was narrowed to RED→GREEN with refactor moved to implement-task Step 3; the four sub-agents + telemetry + task-type system + dependency graph were preserved. Deferred by design (open fog, not silently dropped): the remaining utility skills (`wait-what` exists; `to-questionnaire`/`teach`/`wizard`/`resolving-merge-conflicts`/`handoff`), a low-priority `bug_list`/`bug_queue` tool, and auto-generation of human-facing docs. Wayfinder resume confirmed no new work sprang up.

## 2026-09-03, Complete the portable-skill-authoring map
The initiative is complete: a reusable `skill-creator` Agent Skill ships in this `task-workflow` Pi package, authored through a 4-task graph (support-script grilling → bundle-template prototype → build the skill → fold the templates in). `skill-creator` is spec-pure (frontmatter `name`+`description` only), capability-conditional (not brand-conditional), and carries a Node/TS helper-script trio (`validate_skill` with the `compatibility` bug-fix, `scaffold_skill`, `discover_skill`, each with by-hand fallbacks) + 6 one-level-deep references, including per-language support-script files with the verified, copy-pasteable bundle templates (Python `zipapp`, JS/TS esbuild with the `createRequire` namespace-alias banner) and the verified 17-slot default-stack tables (all picks pass at the Python 3.10 / Node 20 LTS floor). Registered in `package.json` (`pi.skills` →17) + `tests/skills.test.ts` + `tests/skill-creator-scripts.test.ts` (22 cases); dogfood + official `skills-ref` v0.1.5 both pass; 602/602 tests green across the two feature tasks.

## 2026-09-03, Fold the bundle templates + verified stack into the support-script references (fold-bundle-templates-into-refs)
Folded the concrete bundle templates + verified 17-slot default-stack tables from the `bundle-script-template` prototype into `skills/skill-creator/references/support-scripts-python.md` (the `zipapp`/stdlib 3-step build sequence + Python stack table) and `support-scripts-js-ts.md` (the esbuild programmatic-API build with the conditional `createRequire` namespace-alias banner + JS/TS stack table + three API gotchas: `diff_match_patch` lowercase class, `tinyexec` `exec`/`x` not `execa`, the createRequire collision + namespace-alias fix). Resolved the stale "template comes later" pointer in the shared `support-scripts.md` to point at the per-language files. The floor stays Python 3.10 / Node 20 LTS (a minimum-compatibility target, not a recommendation); no library re-pick (all 17 pass at the floor). This completes the `portable-skill-authoring` map: the `skill-creator` skill now carries verified, copy-pasteable bundle templates + the verified default stack. 1 slice, 602/602 green.

## 2026-09-03, Build the skill-creator Agent Skill (build-skill-creator-skill)
Added `skill-creator`, a reusable Agent Skill that helps an agent create, review, update, and make-portable other Agent Skills. Spec-pure frontmatter (only `name`+`description`); capability-conditional model (filesystem/bash-exec/network-MCP/harness-extensions) keyed on target-agent capabilities, not brands; 8-phase authoring workflow; produced-skill frontmatter guidance; a Node/TS helper-script trio (`validate_skill`/`scaffold_skill`/`discover_skill`, each with a by-hand fallback) with a bug-fix over sentient-agi's validator (accepts the spec-allowed `compatibility` field); 6 one-level-deep references (live-spec digest, Pi-target, shared + per-language support-script backbone seeded from the `support-script-conventions` grilling Q1–Q7). Registered in `package.json` (`pi.skills` →17) + `tests/skills.test.ts`; 22 vitest cases for the scripts; dogfood + official `skills-ref` v0.1.5 both pass; 602/602 tests green. The concrete bundle templates are deliberately deferred to the `fold-bundle-templates-into-refs` follow-up (blocked on this task). 6 slices, zero deviations across all deviation reports.

## 2026-08-28, Complete the grilling-visualizer map
The initiative is complete: a detached grilling CLI + inlined Svelte SPA renders a live design-tree graph (rounds, 5-word-id nodes, dependency/contradiction/reference edges, summary sidebar, per-round answers), with a hidden temp-dir state file, CLI-enforced 7-state machine, and xdg-open auto-open across 3 platforms. The grilling skill + wayfinder resource drive it end-to-end, and an eval harness confirmed the full 11-command `update` surface (6 bootstrap + 5 discovered: answer, set-deps, accept, reject, stop). 5 slices landed; 566 tests green; typecheck clean.

## 2026-08-28, Grilling visualizer: detached CLI + browser SPA + skill rewire + eval (build-grilling-visualizer)
Built a detached grilling CLI (`skills/grilling/grilling-cli.mjs`) that drives a persistent local HTTP server serving an inlined Svelte 5 SPA, a live graph of the design tree (rows=rounds, 5-word-id nodes, black/red/gray dependency/contradiction/reference edges, upcoming section, summary sidebar, per-round answer inputs), with a hidden random temp-dir state file, the 7-state machine enforced in the CLI, and xdg-open auto-open across 3 platforms. Rewired the grilling SKILL.md + wayfinder resource to drive it end-to-end. An eval harness (3 synthetic scenarios, non-interactive pi, `GRILLING_EVAL=1` eval mode, 2-clean-in-a-row iteration) discovered 5 missing `update` commands (answer, set-deps, accept, reject, stop) beyond the 6 bootstrap, folded into the CLI + skill; all 3 scenarios converge 2-clean-in-a-row, confirming the 11-command surface is complete. A `/impeccable typeset` pass established base type roles on the SPA shell. 5 slices, 566 tests green, typecheck clean.

## 2026-08-27, Fix finalize-task Step 7 set -e tool/binary confusion (finalize-task-set-e-tool-confusion)
`finalize-task` Step 7 mixed Pi tool calls (`task_map_tick`, `task_state_set`) into the same shell block as `git` commands, so an agent running it under `set -e` aborted mid-archive at `task_state_set` (exit 127, command not found) and had to recover manually on every finalize touching `docs/tasks/state.yaml`. Split the tool calls out of the shell block into clearly-labeled Pi-tool steps, and kept the `git` archive/merge sequence in its own `set -e`-safe shell block. Added a regression assertion in `tests/skills.test.ts` that the Step 7 `git merge --no-ff` block no longer contains Pi tool calls; full devenv suite passes 324/324 (pre-existing integration-harness failure excluded).

## 2026-08-26, Build the codebase architecture improvement survey (build-improve-architecture-skill)
Added the read-only architecture scout and `/improve-codebase-architecture` survey with vendored offline HTML reporting, candidate selection, optional grilling, ADR awareness, and Wayfinder handoff. Full devenv test suite passes 339/339.

## 2026-08-26, Build the domain-modeling reference skill (build-domain-modeling-skill)
Added and registered a Pi-native `/domain-modeling` skill covering concepts, relationships, invariants, ownership, terminology, and lifecycle/state modeling. Added structure and cross-reference coverage; the full devenv test suite passes 321/321.

## 2026-08-26, Build the reusable grilling reference skill (build-grilling-skill)
Added and registered a Pi-native `/grilling` skill based on Matt Pocock's canonical design-tree and round/frontier template, adapted for Pi interaction and Wayfinder handoffs. Added protocol structure coverage; the full devenv test suite passes 315/315.

## 2026-08-26, Build the codebase-design reference skill (build-codebase-design-skill)
Added and registered a Pi-native `/codebase-design` skill covering architecture exploration, boundaries, dependencies, reuse, and deletion-test reasoning. Added structure and cross-reference coverage; the full devenv test suite passes 308/308.

## 2026-08-26, Fix integration harness AuthStorage API compatibility (fix-integration-harness-auth-storage)
Updated the integration harness to use the installed Pi API's `ModelRuntime` with in-memory credentials. The focused integration tests and full devenv suite now pass: 302/302. Closed and archived the follow-up bug report.

## 2026-08-26, Add human-owned implementation mode with read-only verification (build-human-implementation-mode)
Added permissive human/manual routing for feature and bug workflows, collaborative planning and consent gates, read-only verifier-first checks, approval-gated landing, and collaborative refactoring guidance. Added a reproducible devenv shell; targeted structure tests reached 139/139. Full integration verification remains blocked by the pre-existing AuthStorage API mismatch, tracked in `fix-integration-harness-auth-storage`.

## 2026-08-26, Complete the human-implementation-mode map
The initiative is complete: feature and bug implementation now support permissive human/manual routing, collaborative planning gates, read-only fast-fail verification, approval-gated landing, and collaborative refactoring. A devenv shell provides the test environment, and the remaining Pi `AuthStorage` harness incompatibility is tracked as `fix-integration-harness-auth-storage`.

## 2026-08-25, Build the /diagnosing-bugs skill and wire it into the bug pipeline (build-diagnosing-bugs-skill)
Added a model-invoked `/diagnosing-bugs` skill with the 6-phase debugging
discipline adapted from mp-skills (Phase 1 build-a-feedback-loop
**non-skippable** with 10 construction ways + a red-capable completion
criterion; Phases 2–6 skippable with a recorded reason; redact rule;
Phase 6 no-correct-seam handoff to wayfinder / `/improve-codebase-architecture`
with no auto-spawn). Wired it into the bug pipeline: `bug.md`'s tdd-worker
dispatch now passes `skill: "diagnosing-bugs"` + an explicit "You are on a
`type: bug` task" instruction line, and `agents/tdd-worker.md` gained a
path-agnostic routing line. Registered in `package.json` `pi.skills` (9→10);
114/114 structure tests green.

## 2026-08-25, Build the task-workflow-doctor skill (build-task-workflow-doctor-skill)
Added a model-invoked `task-workflow-doctor` skill that diagnoses common
task-workflow issues (missing `docs/tasks/` tree, `state.yaml`, `docs/bugs/`,
`docs/dev-env.md`, `docs/testing.md`, `CONTEXT.md`, `docs/adr/`, or a
misconfigured `package.json` manifest) and routes to the owning skill:
primarily `/skill:onboard-workflow`, rather than auto-fixing. Backed by 8
per-issue resource files and a symptom→artifact→route table; the not-a-fixer
contract (`diagnoses` + `routes` + `onboard-workflow` reference) is locked by
xref assertions in `tests/skills.test.ts`. Registered in `package.json`
`pi.skills` (length 8→9); 106/106 structure tests green.

## 2026-08-24, Build the /code-review skill, code-reviewer agent, and get_guidelines extension (build-code-review-skill)
Added a model-invoked `/code-review` skill (two-axis: Standards + Spec) with
the 12-smell Fowler baseline as a companion doc, plus a `code-reviewer` fanout
agent that spawns parallel read-only Standards and Spec reviewers and
aggregates side by side (never merged, no single winner). Extended our own
`get_guidelines` tool to discover repo-root standards files
(`AGENTS.md`/`CLAUDE.md`/`CONTEXT.md`/`docs/standards.md`) and surface the
smell baseline as a floor when no repo standards match. Wired the review into
implement-task's feature path (before Step 3 coherence refactor) and bug path
(after the single chain), advisory, feeds findings to the refactor, does not
gate. Refactor home stays at implement-task Step 3. 105/105 structure+guidelines
tests green; 16 pre-existing session.test.ts failures reproduce on main.

## 2026-08-24, Build the /tdd reference skill and wire it into the TDD pipeline (build-tdd-reference-skill)
Added a model-invoked `/tdd` reference skill (`SKILL.md` + `tests.md` +
`mocking.md`) defining test quality, what a good test is, seams, anti-patterns,
loop rules, alongside the existing `tdd-worker` agent. The agent loop
narrowed to RED→GREEN; refactoring moved to implement-task's Step 3 coherence
pass. Seams are agreed in the arch spec (features) or the repro (bugs). The
skill is delivered to the fresh-context worker via the `skill:` subagent param.
The slice-verifier stays pass/fail; test-quality-in-review is deferred to the
`code-review-evaluation` sibling. First skill in this repo with companion
reference docs. 89/89 structure tests green; 16 pre-existing session.test.ts
failures reproduce on main and are unrelated.

## 2026-07-30, Bug workflow (report, track, fix) (bug-workflow)
Added a bug path to the workflow: new `report-bug` skill (en-bloc capture,
dev-env.md-governed reproduction into repro.md, trivial spot-fix or
promotion to a `type: bug` task), implement-task split into a
type-dispatching wrapper with `resources/feature.md` + lean
`resources/bug.md`, finalize-task bug closure, and onboarding/routing
support. Both implement-task resources gained the failure toolbelt
(split-first, retry-bigger, escalate; parent never implements). 171/171
tests green.

## 2026-08-24, Gate task-workflow resources by repo (gate-skills-by-repo)
Auto-disable all task-workflow resources (task_* + notify_user + guidelines
tools, before_agent_start injection, skill auto-advertising, and explicit
/skill:<name>) in work repos based on the git origin remote, with zero
per-repo config. Global `taskWorkflow.disableOnRepo` regex list + per-project
`taskWorkflow.enable` override; detection in a new pure `src/core/repo-gate.ts`
module. One known limitation: the six skills still show on /help in a work
repo (pi 0.80.10 has no subtractive hook); explicit /skill: is blocked via the
input event instead. 227/227 tests green (pre-existing integration-harness
failure unrelated).
