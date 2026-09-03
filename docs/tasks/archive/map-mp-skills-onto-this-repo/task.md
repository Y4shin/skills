---
kind: task
type: grilling
slug: map-mp-skills-onto-this-repo
title: Map Matt's current skills/concepts onto this repo and decide, per conflict, which version wins (Matt's by default) and what we keep that Matt's lacks
map: adopt-mp-skills-way
status: done
blocked_by:
- mp-skills-current-state-report
completed_at: 2026-09-03T19:10:00Z
---

# map-mp-skills-onto-this-repo, grilling

## Decision to settle

Given the current-state report (`mp-skills-current-state-report/findings.md`)
and the live Matt clone it keeps, decide, for every skill, concept, and
convention where Matt's repo and this repo differ, which version wins, and
what we keep that Matt's repo does not have.

The posture is **largely adopt Matt's way**: on conflict, Matt's wins by
default; we keep our version only when we have a concrete, stated reason to.
This is stronger than the prior `compare-to-mp-skills` fusion posture and
supersedes it for anything still in conflict.

The output is a decision table / design tree that grilling #2 (the migration
plan) and downstream implementation tasks consume as the target state.

## Parent decisions it depends on

- **Conflict default = Matt's wins** (entry grilling Q1, settled). This
  grilling applies it per-item; it does not re-ask the default.
- **Extraction scope = skills + concepts only** (entry grilling Q2:
  settled). Conflicts about CI/build tooling are out of scope.
- The current-state report must be complete (blocked_by). This grilling does
  not re-derive Matt's inventory; it reasons over the report and re-opens
  clone files only to settle a specific conflict.

## Choices already known

From the prior `compare-to-mp-skills` map + `compare-to-mp-skills.md`, items
already adopted under the fusion posture and shipped as skills in this repo:
grilling, domain-modeling, codebase-design, code-review, diagnosing-bugs, the
`tdd` reference skill, improve-codebase-architecture, task-workflow-doctor.
The current-state report's "already-adopted check" tells us which of these
still match Matt's current version vs have diverged.

## Decisions settled in this grilling (round 1)

- **Planning model (Q1): ADOPT MATT'S STRICT TWO-PHASE.** Wayfinder produces
  decisions only (research/prototype/grilling/manual tasks); we reintroduce a
  spec→tickets step that creates the feature/bug implementation tasks;
  implement-task executes them. Adapted to our `docs/tasks/` substrate, not a
  tracker. Replaces our dynamic-growth map (planning + execution in one graph,
  return-to-Wayfinder escape hatch). This is the single highest-leverage
  decision; it reshapes the whole workflow spine. Rejected: keep dynamic growth
  (our tested strength, but the user chose largely-adopt). Consequence:
  wayfinder no longer creates feature/bug tasks directly; a new to-spec/
  to-tickets pair (or our adapted equivalent) does. The `return-to-Wayfinder`
  escape hatch is replaced by Matt's "hand off, don't build" boundary.
- **Repo-root docs (Q2): ADOPT ALL THREE.** Root `CONTEXT.md` (domain
  glossary), `docs/adr/` (repo ADRs), and a Pi-adapted agent-conventions doc
  (Matt's is `CLAUDE.md`/`AGENTS.md`; ours adapts to Pi, not Claude-specific).
  These are Matt's most-praised techniques for reducing verbosity and recording
  hard-to-reverse decisions. Rejected: none / CONTEXT+ADRs only (loses
  conventions home). Consequence: repos using this workflow now need these on
  disk; `onboard-workflow` (or its successor) must scaffold them; the
  migration skill must add them.
- **Skill layout (Q3): ADOPT BUCKETS + PROMOTION.** Reorganize `skills/`
  into `engineering/`/`productivity/`/`misc/`/`in-progress/`/`deprecated/`.
  Only `engineering/` + `productivity/` ship (in `package.json` `pi.skills`
  list) and get human-facing docs pages. `misc/`/`in-progress/`/`deprecated/`
  are kept but not shipped. Gives us a staging area for beta skills (this map
  will produce new ones) and a `deprecated/` home (we currently retire skills
  by deleting them, e.g. `create-task`). Cost: reorg + a docs-page obligation per
  promoted skill. Rejected: keep flat list (no staging area); buckets-no-gate
  (grouping without the staging benefit). Consequence: every shipped skill
  needs a `docs/<bucket>/<name>.md` page; the migration must move skills into
  buckets and trim the `pi.skills` list to promoted only.

## Decisions settled in this grilling (round 2)

- **Spec/ticket step (Q5): ADOPT BOTH, AS docs/tasks.** Reintroduce Matt's
  two-step handoff on our substrate: a new `to-spec` skill synthesizes the
  conversation/map into `docs/tasks/<slug>/spec.md`; a new `to-tickets` skill
  breaks it into tracer-bullet feature/bug tasks with `blocked_by` edges, stored
  as `docs/tasks/<slug>/task.md` files. `implement-task` executes them. Mirrors
  Matt's flow on our `docs/tasks/` substrate instead of an issue tracker.
  Rejected: collapse to one step (loses the spec as a reviewable artifact); no
  spec/ticket step (contradicts Q1). Consequence: two new skills (`to-spec`,
  `to-tickets`); `implement-task` consumes the tickets they produce; wayfinder
  no longer creates feature/bug tasks (Q1), `to-tickets` does.
- **Onboarding/setup (Q6): EXTEND onboard-workflow.** One skill scaffolds
  everything a repo now needs: the existing `docs/tasks/`, `state.yaml`,
  `CHANGELOG.md`, `docs/testing.md`, `docs/dev-env.md` PLUS the new Q2 repo-root
  docs (`CONTEXT.md`, `docs/adr/`, `docs/agents/`, agent-conventions doc).
  Single entry point. Rejected: split into onboard + new setup (two setup
  skills, more friction); replace with new setup skill (loses the known name).
  Consequence: `onboard-workflow` grows to scaffold the full new layout; the
  migration skill and `onboard-workflow` will share the on-disk-scaffold
  knowledge (relevant to grilling #2's create-vs-reuse).
- **Router (Q7): ADOPT ask-matt-STYLE BEHAVIOR, KEEP task-workflow-overview NAME.**
  Our `task-workflow-overview` becomes Matt's `ask-matt`-style router: maps user
  intent to skills/flows with phase-boundary guidance, not just routing to
  `task_*` tools/actions. Keep the existing name (users know it). Rejected:
  rename to ask-matt (loses known name); keep ours as-is (loses the intent→flow
  mapping + phase boundaries); layer a second router (two router-adjacent
  skills). Consequence: `task-workflow-overview` is rewritten to the
  ask-matt-style router; its companion `PHASE-BOUNDARIES.md` is adopted.

## Decisions settled in this grilling (round 3)

- **Utility skills (Q8): ADOPT ALL SEVEN + WIRE implement-task.** Adopt Matt's
  standalone utility skills, adapted to Pi: `prototype` (throwaway code
  answering a question), `research` (background-agent skill that leaves cited
  Markdown, distinct from our existing `research` *task type*),
  `resolving-merge-conflicts` (hunk-by-hunk by intent, never `--abort`),
  `wizard` (interactive bash for human-only steps), `handoff` (portable handoff
  doc), `to-questionnaire` (questionnaire for a third party), `teach`
  (multi-session learning). PLUS: `implement-task` is wired to dispatch to
  these skills for tasks of those types where applicable (e.g. a `prototype`
  task type dispatches to the `prototype` skill; a `research` task type
  dispatches to the `research` skill), if still applicable under the new
  two-phase model (Q1). Rejected: none (largely-adopt). Consequence: seven new
  skills; `implement-task`'s per-type dispatch grows; the `prototype`/`research`
  *task types* may converge with the new *skills* (decide in implementation).
- **Human docs pages (Q9): ADOPT, ADAPTED.** Every promoted skill gets a
  `docs/<bucket>/<name>.md` page with the 4-section frame (What it does, When
  to reach for it, Common questions, It's working if). Adapted: no aihero.dev
  publish site, so links are repo-relative and we drop publish-specific rules
  (absolute-links, install-widget). Rejected: no docs pages (maintenance burden
  without a publish site, but the user chose adopt). Consequence: every
  promoted skill needs a docs page; a docs-page template/convention lives in our
  adapted `.agents/writing-docs.md`; the migration must create pages for
  existing promoted skills.
- **Prose rule (Q10): ADOPT NO-EM-DASHES.** Ban em-dashes in all repo prose
  (`SKILL.md`, docs, `README`, `CHANGELOG`, ADRs). Rewrite with comma/colon/
  period/parens/conjunction. Recorded in our agent-conventions doc (the Q2
  Pi-adapted conventions doc). Rejected: no prose rule. Consequence: a prose
  pass over existing skills/docs; the migration includes an em-dash sweep.

## Decisions settled in this grilling (round 4)

- **Triage (Q12): ADOPT triage, RETIRE report-bug.** Adopt Matt's `triage`
  skill (state machine moving issues/PRs through triage roles + agent-ready
  briefs), adapted to `docs/tasks/` + `docs/bugs/` instead of a tracker.
  Retire `report-bug` (triage subsumes intake). Rejected: keep report-bug only
  (different substrate); adopt triage alongside report-bug (two overlapping
  intake skills). Consequence: `triage` replaces `report-bug`; the migration
  moves `docs/bugs/` handling from `report-bug` to `triage`; the
  `report-bug` spot-fix path must survive inside `triage` or be explicitly
  dropped (decide in implementation).
- **Re-align diverged (Q13): RE-ALIGN ALL THREE, GRILLING CONSULT FIRST.**
  Re-align `grilling`, `code-review`, and `tdd` to Matt's current text, with
  Pi-native bits kept (`ask_user_question`, vendored CDN). SPECIFICALLY: the
  `grilling` re-alignment MUST be consulted on with the user before applying
  (do not just rewrite it). `code-review` and `tdd` re-align directly. Rejected:
  re-align subset; keep ours. Consequence: three skill rewrites; the `grilling`
  one is gated on a follow-up consultation (a sub-decision this grilling leaves
  open, to resolve during implementation or a follow-up grilling round).
- **Keep-as-ours (Q11): IN PROGRESS.** The user asked to visit each of the
  seven items individually (the six structural strengths PLUS `implement-task`
  as a 7th item). Visited in round 4b; decisions recorded there.

## Decisions settled in this grilling (round 4b, keep-as-ours, visited)

- **Q11.1 Task type system: KEEP 6 TYPES, SCOPED BY PHASE.** Keep all 6 types
  (research/prototype/grilling/manual/feature/bug), but scope which types
  appear in which phase per Q1: planning tasks (research/prototype/grilling/
  manual) come from wayfinder; implementation tasks (feature/bug) come from
  `to-tickets`. A feature/bug task from `to-tickets` is not re-typed as
  research. Fact confirmed: in Matt's repo, wayfinder decision tickets and
  `to-tickets` implementation tickets are the same artifact (issues on a
  tracker), differing by label; he has no separate storage. We keep our richer
  6-type dispatch but redistribute the types across the two phases. Rejected:
  re-open toward Matt's 4 types (loses per-type execution resources).
- **Q11.2 Dependency graph + task_* tools: KEEP AS OURS.** Keep
  `task_dependency_levels` + `task_frontier` (BFS) on the `docs/tasks/`
  substrate. Reason: Matt uses tracker-native blocking; we have no tracker, and
  the `task_*` tools have no Matt equivalent. Graph mechanics stay; Q1 changes
  who creates feature/bug tasks (`to-tickets`, not wayfinder). Rejected:
  text-based blocking (loses the tooling).
- **Q11.3 Finalization pipeline: KEEP, INCORPORATE HUMAN CHANGELOG, DROP CI
  GATE.** Keep `finalize-task` but: (a) incorporate the human changelog (Matt
  keeps a human/changesets-maintained changelog alongside the automated one);
  (b) DROP the CI gate (Step 1). Keep knowledge harvest, bug closure, archive,
  map finalization. Reason: Matt has no finalization step and no CI gate; the
  user chose to keep our automation depth but drop the CI gate toward Matt's
  implicit finish and add the human changelog. Rejected: keep fully as-is; re-open
  fully toward implicit. Consequence: `finalize-task` Step 1 (CI gate) removed;
  a human-changelog step added; the rest stays.
- **Q11.4 Failure toolbelt + parent-never-implements: KEEP AS OURS.** Keep
  the 4-level toolbelt (diagnose, split, retry +50%, escalate) + the
  parent-never-implements hard rule. Reason: Matt has no structured failure
  recovery; our toolbelt is load-bearing automation safety with no Matt
  equivalent. Rejected: re-open toward Matt's implicit errors.
- **Q11.5 Sub-agents: KEEP + EXTEND.** Keep our 6 defined sub-agents (tdd-worker,
  slice-verifier, deviation-reporter, land-worker, architecture-scout,
  code-reviewer) with YAML frontmatter, tool allowlists, context isolation.
  EXTEND: wherever an adopted skill uses a subagent we don't define yet (e.g.
  Matt's `code-review` runs two parallel sub-agents; `improve-codebase-
  architecture` runs a scout subagent; `research` runs a background agent), add a
  formal agent definition to `agents/`. Reason: Matt references sub-agents but
  has no formal definitions; we formalize. Rejected: drop toward Matt's inline
  ad-hoc (loses allowlists/isolation). Consequence: new agent definitions added
  as skills are adopted; the migration accounts for them.
- **Q11.6 Telemetry: KEEP AS OURS.** Keep `telemetry_skill_context` +
  `submit_feedback` wiring across every skill and agent. Reason: Matt has no
  telemetry; this is a map constraint (maintain or extend, never remove) and
  has no Matt equivalent. Rejected: re-open toward none (contradicts the
  constraint). New adopted skills get telemetry wired in.
- **Q11.7 implement-task: RE-OPEN, BORROW implement-spec IDEAS.** Keep our
  `implement-task` but borrow Matt's `implement-spec` (in-progress) ideas:
  explicit task-graph + concurrent-implementer language, merger subagents,
  maximum-concurrency frontier execution, single-PR landing. Synthesize into
  our richer pipeline (we keep verifier retry, size budgets, failure toolbelt
  integration). Reason: our `implement-task` is strictly richer than Matt's
  thin `implement` + `implement-spec`, but `implement-spec`'s explicit
  graph/concurrency vocabulary is worth borrowing. Rejected: keep fully as-is;
  replace with Matt's thin implement. Consequence: `implement-task` gains
  implement-spec-style graph/concurrency language; the rewrite is an
  implementation task.

## Decisions settled in this grilling (round 5, smaller axes)

- **agents/openai.yaml (Q14): CONCEPT YES, FILE NO.** Adopt the *concept*
  (keep invocation policy in sync across representations; user-invoked in
  both or neither) but NOT the file. In Pi, frontmatter (`name`, `description`,
  `disable-model-invocation`) already carries what `openai.yaml` carries for
  Codex (`display_name`, `short_description`, `policy`). The file is
  Codex-specific; we are Pi-native. Largely-adopt applies to the convention,
  not the harness-specific file. Rejected: adopt the file (adds a per-skill
  file we don't need on Pi); out of scope entirely (loses the sync concept).
  Consequence: our frontmatter stays the single representation; the
  user/model-invoked split is kept in sync via frontmatter alone.
- **grill-me (Q15): ADOPT, DROP grilling-with-ui.** Adopt Matt's `grill-me`
  (stateless interview, no repo needed) as a thin user-invoked wrapper around
  `grilling` for the no-repo case. DROP our `grilling-with-ui`
  (browser-visualized grilling), it is a divergence from Matt with no Matt
  equivalent, and the user chose to standardize on Matt's plain-text interview.
  Rejected: keep grilling-with-ui (a keep-ours with no stated reason survives
  under largely-adopt only if justified; the user dropped it). Consequence:
  `grill-me` added; `grilling-with-ui` and its CLI/UI (`scripts/grilling-cli`,
  `scripts/grilling-ui`) are removed; the migration accounts for the removal.
- **domain-modeling re-align (Q16): RE-ALIGN TO MATT'S CURRENT.** Fold
  `domain-modeling` into the Q13 re-align set: add companion docs
  (`CONTEXT-FORMAT.md`, `ADR-FORMAT.md`), multi-context `CONTEXT-MAP.md`
  support, and the 3-criteria 'offer ADRs sparingly' rule. Rejected: keep ours
  as-is (missing companion docs + CONTEXT-MAP). Consequence: `domain-modeling`
  rewritten + 2 companion docs; re-align set is now 4 skills (grilling,
  code-review, tdd, domain-modeling); grilling still consult-first per Q13.
- **.out-of-scope/ KB (Q17): ADOPT, UNDER docs/tasks/out-of-scope/.** Adopt
  Matt's rejected-requests KB as part of `triage` (Q12). Each file documents
  one rejected request + the reason; `triage` checks it for prior rejection
  before grilling, so the same 'no' isn't re-debated. Place it at
  `docs/tasks/out-of-scope/` (NOT repo root, per user). Rejected: don't adopt
  (no durable home for rejections); repo root (user chose docs/tasks/).
  Consequence: `docs/tasks/out-of-scope/` added to the on-disk scaffold;
  `onboard-workflow` (Q6) and the migration create it; `triage` reads it.

## Decisions settled in this grilling (round 6, disposition of remaining Matt skills + changesets)

- **in-progress/ skills (Q18): DON'T ADOPT, EXCEPT claude-handoff AS INSPIRATION.**
  Do not adopt `loop-me`, `writing-beats`/`writing-fragments`/`writing-shape`,
  `retro`, `setup-ts-deep-modules` as skills. Reason: writing-flow skills are
  out of scope for a task-workflow package; `claude-handoff` is Claude-specific
  (but see below); `retro` is a stub; `setup-ts-deep-modules` is tooling-specific;
  `loop-me` overlaps `wayfinder`/`grill-me`. `implement-spec` is already folded
  into Q11.7. EXCEPTION: look at `claude-handoff` to **inspire our own
  `handoff` skill** (Q8 adopted `handoff`; claude-handoff's background-agent
  mechanism, e.g. seeding a fresh background agent with a handoff summary, is
  worth borrowing into our `handoff` even though we don't adopt the
  Claude-specific skill itself). Rejected: adopt all into in-progress/ (adds
  skills we may never use). Consequence: no new in-progress skills; the `handoff`
  skill (Q8) may borrow claude-handoff's bg-agent seeding pattern.
- **misc/ skills (Q19): DON'T ADOPT ANY.** Don't adopt `git-guardrails-claude-
  code`, `migrate-to-shoehorn`, `scaffold-exercises`, `setup-pre-commit`.
  Reason: `git-guardrails` is Claude-specific; the other three are Matt's
  project-specific tooling (shoehorn migration, exercise scaffolding, Husky
  setup) unrelated to a task-workflow package. Matt keeps them misc/, not
  promoted. Rejected: adopt setup-pre-commit (useful but out of scope for this
  package); adopt all. Consequence: our `misc/` bucket starts empty (or holds
  only future non-promoted skills of ours).
- **Changesets (Q20): ADOPT, INTEGRATE INTO release.sh.** Adopt changesets
  (`.changeset/` + the changeset workflow) for versioning + per-change
  changelog entries, but integrate it into our existing `scripts/release.sh`
  rather than replacing it: `release.sh` runs the changeset versioning/
  generation and then publishes the new version. Rejected: keep `release.sh` as-is
  (loses changesets' per-change changelog); out of scope (changesets is a
  versioning convention, not CI/build machinery); replace `release.sh` entirely.
  Consequence: `.changeset/` added; `scripts/release.sh` updated to drive
  changesets; `package.json` gains changeset scripts; the migration adds the
  changeset scaffold and rewires release.

## Choices already known

From the prior `compare-to-mp-skills` map + `compare-to-mp-skills.md`, items
already adopted under the fusion posture and shipped as skills in this repo:
grilling, domain-modeling, codebase-design, code-review, diagnosing-bugs, the
`tdd` reference skill, improve-codebase-architecture, task-workflow-doctor.
The current-state report's "already-adopted check" tells us which of these
still match Matt's current version vs have diverged.

Candidate conflict axes the grilling must visit (non-exhaustive, extend
from the report):

- **Planning model:** Matt's strict "plan first (decisions, not deliverables),
  execute second" vs our dynamic-growth map (planning + execution tasks in
  one graph, return-to-Wayfinder escape hatch). Under largely-adopt, do we
  move toward Matt's strict two-phase (wayfinder produces only decisions; a
  separate spec/ticket step feeds implement)?
- **Spec/ticket handoff:** Matt has `/to-spec` → `/to-tickets`; we eliminated
  it ("map and task docs ARE the spec"). Do we re-introduce a spec/ticket
  step?
- **Router skill:** Matt's `ask-matt` intent-router vs our
  `task-workflow-overview`. Keep ours, adopt his, or merge?
- **Onboarding/setup:** Matt's `setup-matt-pocock-skills` (issue tracker +
  label config + `docs/agents/`) vs our `onboard-workflow`
  (`docs/tasks/`, state.yaml, testing.md, dev-env.md). What does a repo using
  the new setup need on disk?
- **Human-facing docs:** Matt ships `docs/engineering/*.md` +
  `docs/productivity/*.md` (4-section template, published at aihero.dev); we
  ship none. Adopt?
- **Repo-root docs:** Matt has `.agents/adr/` + `CONTEXT.md`; we have neither.
  Adopt?
- **Utility skills we deferred:** `/handoff`, `/wizard`,
  `/resolving-merge-conflicts`, `/wait-what`, `/teach`, `/to-questionnaire`,
  `/research`, `/prototype`, `/triage`. Under largely-adopt, which now come
  in?
- **Keep-as-ours items** (no Matt equivalent, survive trivially): task type
  system, dependency graph / `task_*` tools, finalization pipeline, failure
  toolbelt, sub-agent architecture, telemetry, Pi extension. The grilling
  should *confirm* each is truly keep-as-ours and record the concrete reason,
  since the default is Matt's-wins and "no equivalent" is the reason to keep.
- **Already-adopted-but-diverged:** for any shipped skill where the report
  says our version diverged from Matt's current, decide: re-align to Matt,
  keep our divergence with a stated reason, or merge.

## Recommended starting answer

Run the grilling in rounds over the report's conflict axes. For each axis:

1. State the conflict in the user's terms (Matt's way = X, our way = Y,
   prior fusion decision = Z if any).
2. Recommend **adopt Matt's way** unless a concrete keep-ours reason surfaces
   during the round (apply the settled default).
3. Record the decision, the rejected alternative, the keep-ours reason (if
   any), and the downstream consequence.

Seed the first round with the highest-leverage axes (planning model,
spec/ticket handoff, onboarding/setup, repo-root docs) because they reshape
what a repo needs on disk, which is exactly what the migration skill must
move. Defer utility-skill adoption and already-adopted-but-diverged items to
later rounds once the structural axes are settled.

## What downstream work the answer may create

- The decision table becomes the **target state** for grilling #2
  (`design-migration-skill`) and for implementation tasks.
- Some decisions will surface new work precise enough to state, e.g.
  "re-introduce a spec/ticket step", "adopt `ask-matt` router", "add
  repo-root CONTEXT.md + ADRs". These are graduated from the map's Fog into
  tasks during this grilling or handed to Wayfinder, **not** created ad hoc
  here.
- If the grilling finds the current-state report missing a conflict axis, it
  returns to the research task with a specific gap, it does not improvise.
- The set of "keep-as-ours, here is the concrete reason" entries becomes the
  migration skill's preserve-list (things the migration must not touch).

## Grilling summary, target state (frontier empty)

All conflict axes visited across 6 rounds (Q1-Q20). Shared understanding
reached under the **largely-adopt** posture (Matt's wins by default; keep-ours
only with a concrete reason). This is the target state for grilling #2
(`design-migration-skill`) and implementation.

### Workflow spine (the big reshape)
- **Q1 Planning model:** ADOPT Matt's strict two-phase. Wayfinder produces
  **decisions only** (research/prototype/grilling/manual tasks); new
  `to-spec` + `to-tickets` create the feature/bug implementation tasks;
  `implement-task` executes. Replaces our dynamic-growth map + return-to-
  Wayfinder escape hatch.
- **Q5 Spec/ticket step:** ADOPT BOTH, on `docs/tasks/` substrate. `to-spec`
  writes `docs/tasks/<slug>/spec.md`; `to-tickets` writes tracer-bullet
  feature/bug tasks with `blocked_by` edges; `implement-task` executes.
- **Q7 Router:** `task-workflow-overview` rewritten to `ask-matt`-style intent
  router + phase boundaries; name kept. Companion `PHASE-BOUNDARIES.md` adopted.
- **Q11.7 implement-task:** KEEP ours + borrow `implement-spec`'s task-graph /
  concurrent-implementer / merger-subagent / max-concurrency language.
- **Q11.1 Task type system:** KEEP 6 types, **scoped by phase**, planning types
  (research/prototype/grilling/manual) from wayfinder; implementation types
  (feature/bug) from `to-tickets`.

### Repo layout & docs
- **Q2 Repo-root docs:** ADOPT all three, root `CONTEXT.md` (glossary),
  `docs/adr/` (ADRs), Pi-adapted agent-conventions doc (not CLAUDE.md-specific).
- **Q3 Skill layout:** ADOPT buckets + promotion (`engineering`/`productivity`
  ship + get docs pages; `misc`/`in-progress`/`deprecated` kept, not shipped).
- **Q9 Human docs pages:** ADOPT, adapted, `docs/<bucket>/<name>.md` per
  promoted skill, 4-section frame, repo-relative links (no aihero.dev publish).
- **Q17 out-of-scope KB:** ADOPT at `docs/tasks/out-of-scope/` (not repo root).
- **Q6 Onboarding:** EXTEND `onboard-workflow` to scaffold the full new layout
  (old docs/tasks/ scaffold + new Q2/Q17 repo-root docs).
- **Q10 Prose rule:** ADOPT no-em-dashes repo-wide.

### Skills to ADD (adapted to Pi)
- **Q8 Utilities:** `prototype`, `research` (bg-agent skill, distinct from the
  task type), `resolving-merge-conflicts`, `wizard`, `handoff`,
  `to-questionnaire`, `teach`. `implement-task` wired to dispatch to these for
  matching task types where applicable under Q1.
- **Q4 writing-for-agents:** ADOPT + KEEP `skill-creator` (coexist: prose
  discipline vs scaffolding/validation).
- **Q12 triage:** ADOPT, RETIRE `report-bug` (triage subsumes intake; spot-fix
  path must survive inside triage or be explicitly dropped).
- **Q15 grill-me:** ADOPT, DROP `grilling-with-ui` (and its CLI/UI scripts).
- **Q18 in-progress:** none adopted; `claude-handoff` used only as inspiration
  for our `handoff` skill's bg-agent seeding.
- **Q19 misc:** none adopted.

### Skills to RE-ALIGN to Matt's current (4)
- **Q13/Q16:** `grilling` (CONSULT USER FIRST), `code-review` (12-smell
  baseline), `tdd` (refactor-out-of-loop), `domain-modeling` (companion
  CONTEXT-FORMAT/ADR-FORMAT + CONTEXT-MAP + 3-criteria ADR). Pi-native bits kept.

### Keep-as-ours (with concrete reason)
- **Q11.2** dependency graph + `task_*` tools (no Matt equivalent; no tracker).
- **Q11.3** finalization pipeline, MODIFIED: incorporate human changelog, DROP
  CI gate; keep harvest, bug closure, archive, map finalization.
- **Q11.4** failure toolbelt + parent-never-implements (no Matt equivalent).
- **Q11.5** sub-agents KEEP + EXTEND (add formal defs for new adopted skills'
  subagents, e.g. code-review's parallel reviewers, research's bg agent).
- **Q11.6** telemetry (map constraint; no Matt equivalent).
- Pi extension / `src/pi.ts` / repo-gate (foundational; no Matt equivalent).

### Conventions & tooling
- **Q14 openai.yaml:** concept yes (sync invocation policy), file no (Pi frontmatter suffices).
- **Q20 changesets:** ADOPT, integrated INTO `scripts/release.sh` (not
  replacing it); `.changeset/` added.
- Skill-tool invocation wording ("Call the Skill tool with `<name>`") adopted
  where operative; user-invoked skills phrased as human instructions.

### Gated / left open
- `grilling` re-align is consult-first (Q13), a sub-decision to resolve during
  implementation or a follow-up grilling round, not silently rewritten.
- Whether the `prototype`/`research` *task types* converge with the new
  *skills* of the same name (decide in implementation).
- Whether the `report-bug` spot-fix path survives inside `triage` or is
  dropped (decide in implementation).
