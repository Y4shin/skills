---
type: arch spec
title: "Architecture spec: overhaul-execution-skills"
status: stable
---
# Architecture spec: overhaul-execution-skills

Status: approved by the user (2026-09-29). Two decisions were taken in the
approval conversation: (1) finalize-task marks the ticket's
`workflow_state: done` via the set tool (implement-task reports "run
finalize-task"; the marking has one owner); (2) a failure-toolbelt split
supersedes the original ticket (`status: deprecated` plus
`workflow_state: done`, out of the graph, body note naming its sub-tickets;
the sub-tickets inherit its `blocked_by`).

Scope: the implement-task wrapper and its feature/bug pipelines plus the
planning-type resources, finalize-task, the code-review standards step, five
agent definitions, and the structure tests. NOT touched: extension code, the
planning-side skills (landed in overhaul-planning-skills), the guidelines
feature's deletion (overhaul-dead-surface owns it; this ticket re-points
every consumer so that deletion stays pure), docs pages
(backfill-skill-docs-pages owns them).

Carried forward from the parallel ticket (its Implementation notes): the
`tw_list` interface change (`effort`/`workflow_state` filters), the
docs-page deferral, and the template-conformance seam pattern in
`tests/skills.test.ts` (producer prose templates run through the repo's own
conformance engine).

## Branch and artifact model (per-ticket chains)

- **Landing branch** `task/<ticket-slug>` (vocabulary unchanged), created
  off the starting branch (typically main). **Chain working branch**
  `ticket/<ticket-slug>` (renamed from `slice/`; the slice vocabulary is
  dead): the tdd-worker commits checkpoints there; the land-worker merges
  `--no-ff` into the landing branch and deletes it.
- **Effort-root arch spec** `docs/tasks/<effort>/arch-spec.md`, frontmattered
  (`type: arch spec`, `title`, `status: draft` while iterating, `stable`
  once the user approves). It is effort-shared planning output, like the
  map and spec: committed on the starting branch before the first chain
  dispatch, so every ticket branch includes it.
- **Deviation reports** live in the ticket directory
  (`docs/tasks/<effort>/tickets/<ticket>/deviation-reports/`) with
  frontmatter (`type: deviation report`, `title`, `status: stable`):
  producer conformance per the effort spec's user story 47.
- **Budgets** come from the ticket's `size` (absent means m), expressed as
  the workflow `timeoutMs` (the retired chain API's `turnBudget` has no
  current equivalent; the timeout is the honest lever): s 15m, m 30m,
  l 45m, xl 60m; a retry increases by 50 percent.
- **Chain pseudocode rebases onto the real API**: one
  `subagent({ async: true, workflowScript })` per slice chain, with
  `runs.run` for the tdd step, `runs.all` for verify plus deviation, an
  ok-gate before the land step, and output paths bound per step.

## implement-task

### Wrapper (SKILL.md)

- Reads `subtype` from frontmatter (falls back to `type`, then `feature`;
  legacy artifacts keep today's behavior). Reads `mode`.
- `mode: human` **hard-refuses autonomous dispatch**: the router responds
  that the ticket is human-owned and hands back the re-invocation for the
  human to run (invoke `/skill:implement-task <slug>` saying the human will
  implement it, entering the human-mode protocol). It never dispatches
  chains for a marked ticket.
- Path-agnostic selectors: the resolver finds `ticket.md` and `task.md` in
  both shapes; no hardcoded `docs/tasks/<slug>/task.md` template.
- Frontier mode: `tw_frontier <effort-slug>`, routing each item by subtype;
  the wayfinder reassessment call keeps the effort slug.

### resources/feature/autonomous.md (full rebase)

- Step 0: read the ticket (subtype, mode, size) via the resolver; pending
  tickets are the effort frontier (`tw_frontier <effort-slug>`). If none:
  report and suggest `/skill:finalize-task`.
- Step 1: the effort-root arch spec, user-approved, frontmattered, covering
  every pending ticket (exports, abstractions to use, do-not-reimplement,
  seams, per-ticket interface contracts). Committed on the starting branch
  before the first chain dispatch.
- Step 2: per-ticket chains per dependency level
  (`tw_dependency_levels <effort-slug>`); tickets within a level run
  sequentially (shared repo cwd); levels are strict barriers. Chain:
  `tdd-worker` then `slice-verifier` in parallel with `deviation-reporter`,
  gated, then `land-worker`. The ui-noter dispatch and all
  impeccable-note reporting are **gone** (decided upstream; the agent never
  existed).
- Failure toolbelt: diagnose first; split the ticket into sub-tickets
  registered in the effort (`docs/tasks/<effort>/tickets/<sub>/ticket.md`,
  v4 frontmatter, inherited subtype, size from the diagnosis, `blocked_by`
  inheriting the original's edges and chaining between subs); the original
  is superseded (`status: deprecated`, `workflow_state: done`, body note
  naming its subs). Retry +50 percent on the second failure; escalate
  after two retries. The parent never implements.
- Advisory whole-effort code review after all chains land, then the
  coherence pass (same rules as today), then the report ("run
  `/skill:finalize-task`"; the ticket's `workflow_state` stays unfinished
  until finalize marks it).
- Uncertainty path: `docs/tasks/<effort>/tickets/<ticket>/.work/uncertainty.md`.

### resources/feature/human.md and resources/bug/human.md

Protocol shape kept (architecture approval, per-unit handoff, read-only
verifier-first verification, findings approval gate, separate landing,
collaborative refactoring). Re-pointed: slice vocabulary to ticket, the
arch spec at the effort root, ordering via `tw_dependency_levels
<effort-slug>`.

### resources/bug/autonomous.md

Lean per-ticket chain (`tdd-worker` then `slice-verifier` then
`land-worker`, gated). The bug doc and reproduction are referenced from
the ticket body (the `bug:` frontmatter field is killed). Budgets,
splits-as-sub-tickets, and the toolbelt as above; no deviation-reporter
(unchanged); the workflowScript API; the advisory bug-fix review kept.

### Planning resources (research, prototype, grilling, manual)

Light v4 touch: findings captured in the task directory
(`docs/tasks/<effort>/tasks/<task>/findings.md`) with `type: findings`
frontmatter; done-marking via `tw_set <slug> workflow_state done`; effort
vocabulary; no other behavior change.

### code-review SKILL.md

The standards step reads repo files directly: `AGENTS.md`, `CONTEXT.md`,
`docs/standards.md` (when present), `docs/testing.md`, plus the smell
baseline at `skills/engineering/code-review/smells.md`. No guidelines
tool in the middle. Spec sources re-pointed: feature tickets read the
ticket doc plus the effort-root arch spec; bug tickets read the bug doc
plus its reproduction.

## finalize-task (v4 rewrite)

- Step 0: prerequisites (the ticket resolves; implement-task reported its
  chains landed).
- Step 1: CI gate, unchanged (`git checkout task/<ticket>`, merge main,
  run the project's CI; fix-forward on red).
- Step 2: the impeccable-note check is **deleted** (decided upstream).
- Step 3: harvest; deviation reports from the ticket directory; fold
  durable knowledge into `docs/` and the ticket doc's Implementation notes.
- Step 4: changelog entry, unchanged.
- Step 5: deviation to effort; compare delivered scope against the ticket;
  update the effort's map doc when needed (no array exists to tick).
- Step 6: bug closure for `subtype: bug` tickets; the bug slug comes from
  the ticket body's reference (the `bug:` field is killed); the rest of
  the closure flow is unchanged (status fixed, fix_commit, root cause,
  archive).
- Step 7: per-ticket close-out. Mark the ticket `workflow_state: done` via
  `tw_set` (the decision above; "no tick, no array"), then verify with
  `tw_finalizable <ticket>` (which also surfaces the effort graph's
  anomalies). Clear the current item (`tw_state_set task null`; the
  `slice` field no longer exists in the state setter and is not called).
  Merge `task/<ticket>` into main, delete the branch, push. **No per-ticket
  git mv**: the ticket stays in the live effort (moving one ticket out
  would split the effort's graph scope and trip the spec-plus-zero-tickets
  rule; the effort archives as a unit).
- Step 8: effort finalization when `tw_map_finalizable <effort>` returns
  ready: mark the map and its done items `status: deprecated` (the
  archived-effort convention the migration seeds; `workflow_state` stays
  `done`), `git mv docs/tasks/<effort>/ docs/tasks/archive/<effort>/`,
  regenerate the root index (the effort moves from `## Live` to
  `## Archived`, sorted), clear both pointers (`tw_state_set task null`
  and `tw_state_set map null`), commit, merge, push.
- Step 9: report, including map status.
- The onboarding report's dead `task-overview` pointer is already fixed
  and test-covered; verified, no work.

## Agents

- **tdd-worker**: tools become `read, write, edit, bash`; standards are
  read directly (`AGENTS.md`, `CONTEXT.md`, `docs/standards.md`,
  `docs/testing.md`); the arch spec is at the effort root; the working
  branch is `ticket/<slug>` off the landing branch; "slice doc" becomes
  the ticket doc (its test plan and acceptance criteria); the uncertainty
  path is the ticket dir's `.work/`.
- **slice-verifier**: verifies a ticket's implementation on its branch
  (name unchanged; the vocabulary sweep is deferred); the test command
  comes from the ticket doc's test plan or the arch-spec seams; the full
  suite stays the landing gate.
- **land-worker**: loses the slice-archive duty and the task-done and
  state.yaml marking (finalize owns both); merges `ticket/<slug>` into
  `task/<slug>`, deletes the working branch, appends implementation notes
  to the ticket doc, commits. The no-source-edits rule is kept.
- **deviation-reporter**: writes frontmattered reports
  (`type: deviation report`, `title`, `status: stable`) to the ticket
  directory; the diff is `git diff task/<ticket>..ticket/<ticket>`.
- **code-reviewer**: the standards reviewer bullet reads files directly;
  `get_guidelines` leaves the tools list; spec-source paths go v4.
- **architecture-scout**: `get_guidelines` leaves the tools list (its
  prose already reads `CONTEXT.md` and `docs/adr/` directly).

## Tests (tests/skills.test.ts)

Flips of invalidated assertions:

- The per-slice human-mode assertions become per-ticket (handoff,
  no-code-before-handoff, next-unit progression, multiple-units coverage).
- The ui-noter and impeccable-note references are asserted absent from the
  pipelines and finalize-task.
- `get_guidelines` is asserted absent from every re-pointed file
  (code-review SKILL.md, the two autonomous resources, the five agent
  files).
- The finalize note check is asserted gone.

New assertions:

- The wrapper reads `subtype` with `type` fallback and defaults feature;
  dispatch names research, prototype, grilling, manual, feature, bug.
- The `mode: human` refusal rule (the router refuses autonomous dispatch
  and hands back the re-invocation).
- The budget table keys off `size` with the default m.
- The failure toolbelt registers sub-tickets in the effort (and the
  superseded original's deprecated-plus-done pair).
- The chain steps name the effort frontier tool, the size budget table,
  and the effort-root arch spec.
- Finalize: the set-tool marking, the `tw_finalizable` verification, the
  scan-tool gating, the pointer clears, the root-index regeneration, no
  per-ticket move.
- Direct standards reads named in the code-review step and the tdd-worker
  prompt.

Template-conformance seam extension: the arch-spec template
(`type: arch spec`) and the deviation-report template
(`type: deviation report`) are extracted and run through the repo's
conformance engine like the planning templates.

## Existing abstractions to use

- The resolver (slug or path, both shapes) for all artifact access; no
  new path templates.
- `tw_frontier`, `tw_dependency_levels`, `tw_finalizable`,
  `tw_map_finalizable`, `tw_set`, `tw_state_set` for the graph and state.
- The template-conformance seam helpers in `tests/skills.test.ts`
  (extract, substitute, conform; the planning ticket's pattern).

## Do NOT reimplement

- No extension code changes; no planning-side skill changes.
- No guidelines deletion (only the consumer re-pointing).
- No docs pages for the touched skills (backfill-skill-docs-pages owns
  them; its acceptance criteria already name implement-task and
  finalize-task).
- No agent renames (slice-verifier keeps its name; the vocabulary sweep
  is deferred).
- No migration of this repo's own tree.

## Interface contract for dependents

- overhaul-dead-surface: after this ticket, the package's prose and agents
  carry zero `get_guidelines` and zero ui-noter references, so the
  deletion stays a pure no-references-remain pass.
- backfill-skill-docs-pages: implement-task and finalize-task pages.
- The chain prompts and agent files reference only surviving tools.
