# Upgrade 2 to 3: the largely-adopt-Matt adoption

> This resource encodes the **proven** 9-step migration from schema_version 2
> (the flat-skills layout, dynamic-growth wayfinder) to schema_version 3 (the
> bucket layout, strict two-phase planning, Matt-adopted skills, repo-root
> docs, changesets, no-em-dashes). It is distilled from the actual run on this
> repo (the `adopt-mp-skills-way` map, `run-adoption-migration` task).
>
> **Source of truth:** `docs/tasks/run-adoption-migration/slices/
> 9-changesets-prose-finalize.md`, section "What the migration actually did."
> This resource encodes what the migration ACTUALLY did, including 6
> deviations from the theoretical design. Future repos on schema 2 run this
> resource to reach schema 3.

## Before you start

- Create a backup branch: `git checkout -b migrate/schema-2-to-3`.
- Read `docs/tasks/state.yaml` and confirm `schema_version: 2` (or no
  `schema_version` field, which means pre-schema and should be treated as 2).
- Run `npm test` to establish a green baseline.

## Step 1: Reorganize skills/ into buckets

**Traces to:** grilling #1 Q3 (buckets + promotion).

Move all skills from the flat `skills/` layout into bucket folders:
`engineering/` (promoted, daily code work), `productivity/` (promoted,
non-code), `misc/` (kept, not promoted), `in-progress/` (beta, not
promoted), `deprecated/` (retired, not promoted).

- `git mv` each skill directory into its bucket. Use Matt's bucket
  assignment: workflow + discipline skills in `engineering/`, general
  tools in `productivity/`, retired skills in `deprecated/`.
- Update `package.json` `pi.skills` to list only promoted skills, using
  bucketed paths (`./skills/engineering/<name>`, `./skills/productivity/<name>`).
  Non-promoted skills are kept but absent from `pi.skills`.
- Create 5 bucket `README.md` files: `engineering/` and `productivity/`
  group entries into **User-invoked** and **Model-invoked**;
  `misc/`, `in-progress/`, `deprecated/` use a flat list.
- Update all live `skills/<name>` path references: `tests/skills.test.ts`
  (`SKILL_FILES` array + manifest assertions), `src/pi.ts` (gated skill
  list + comments), `agents/code-reviewer.md`, `docs/testing.md`, and skill
  self-references (wayfinder, report-bug, implement-task resources). Use
  `git mv` to preserve history. Archived task docs are historical snapshots;
  leave them.
- Remove any stray built artifacts left at the old top-level path (e.g.
  a gitignored `grilling-cli.mjs` left behind by `git mv`).

**Deviation from design:** none. Mechanical `git mv` + path-reference update.

## Step 2: Retire and drop

**Traces to:** grilling #1 Q12 (triage retires report-bug), Q15 (grill-me
replaces grilling-with-ui).

- Move `report-bug` from `engineering/` to `deprecated/` (content preserved,
  not deleted). Add a note in `deprecated/README.md` naming `triage` as the
  replacement.
- Drop `grilling-with-ui` entirely (not deprecated; removed from `skills/`).
  It is replaced by `grill-me` (added in step 4).
- Remove `scripts/grilling-cli/`, `scripts/grilling-ui/` (the CLI + UI that
  grilling-with-ui drove).
- Remove `scripts/eval/` (the eval harness that drove grilling-with-ui's
  CLI; no longer load-bearing without it). **Deviation:** the eval harness
  drop was not in the original design; it surfaced as a real dependency
  when grilling-with-ui was removed.
- Remove `scripts/bundler.test.ts`, `scripts/build.ts` (built the CLI
  bundle).
- Remove `@sveltejs/vite-plugin-svelte`, `svelte`,
  `vite-plugin-singlefile` devDeps from `package.json` (only used by
  grilling-ui).
- Remove the dead grilling-CLI path-protection handler from `src/pi.ts`
  (and its `tmpdir` import if nothing else uses it).
- Update `tests/skill-rewire.test.ts`: drop grilling-with-ui-specific
  seams; keep text-based grilling seams.
- Update `tests/gate-factory.test.ts`: remove `report-bug` from the gated
  skill list (retired); update "gated six" to "gated five" in test names.
- Remove stale assertions that reference retired skills (e.g.
  `task-overview routes report a bug to /skill:report-bug`).

## Step 3: Add utility skills

**Traces to:** grilling #1 Q8 (adopt all 7 standalones), Q14 (openai.yaml
concept-not-file).

Add 7 skills adapted from Matt Pocock's repo to Pi:

- `prototype` (engineering/model): throwaway code answering a design
  question. Companions: `LOGIC.md`, `UI.md`.
- `research` (engineering/model): background agent investigating against
  primary sources, leaves cited Markdown. Distinct from the `research`
  task type.
- `resolving-merge-conflicts` (engineering/model): hunk-by-hunk by intent,
  never `--abort`.
- `wizard` (engineering/model): interactive bash for human-only steps.
  Companion: `template.sh`.
- `handoff` (productivity/user): portable handoff doc.
- `to-questionnaire` (productivity/user): questionnaire for a third party.
- `teach` (productivity/user): multi-session learning. Companions: 4
  FORMAT docs.

Each adaptation: Pi frontmatter only (no `agents/openai.yaml` per Q14), no
em-dashes, telemetry-light, Matt content/structure preserved.

**Deviation:** `validate_skill.mjs` fix: add `disable-model-invocation` and
`argument-hint` to `ALLOWED_KEYS`. The validator was too strict (every
user-invoked skill uses `disable-model-invocation`). The test that codified
the bug (`rejects unknown frontmatter key (disable-model-invocation)`) must
be flipped to assert acceptance. This is a repo-wide validator fix.

## Step 4: Add meta/triage skills

**Traces to:** grilling #1 Q4 (writing-for-agents + keep skill-creator),
Q12 (triage), Q15 (grill-me), Q17 (out-of-scope KB).

Add 3 skills:

- `writing-for-agents` (productivity/model) + companion `SKILL-MECHANICS.md`:
  the prose discipline for writing skills/docs (context pointers,
  information hierarchy, leading words, progressive disclosure, pruning).
  Coexists with `skill-creator` (scaffolding/validation).
- `triage` (engineering/user): issue/PR state machine + agent briefs,
  adapted to `docs/tasks/` + `docs/bugs/` + `docs/tasks/out-of-scope/`
  instead of an issue tracker. Subsumes `report-bug` intake. The
  report-bug spot-fix path is recorded as a decision inside the triage
  skill text. Companions: `AGENT-BRIEF.md`, `OUT-OF-SCOPE.md`.
- `grill-me` (productivity/user): thin wrapper around `grilling` for the
  no-repo case.

## Step 5: Rewire implement-task

**Traces to:** grilling #1 Q8 (wire implement-task), Q11.1 (types scoped by
phase), Q11.7 (borrow implement-spec ideas).

- Add "Skill delegation for planning types" section to `implement-task`
  SKILL.md: `type: research` delegates to the `research` skill;
  `type: prototype` delegates to the `prototype` skill. Decision: task type
  and skill **coexist** (task type is the planning artifact with acceptance
  criteria; skill is the reusable discipline; delegating doesn't replace
  the task doc). Grilling/manual have no standalone skill; run inline.
- Add task-graph/frontier vocabulary + context-pointer communication
  principle to `resources/feature/autonomous.md`. Borrow `implement-spec`'s
  graph/concurrency language (frontier, concurrent implementers, merger
  subagents, single-PR landing) synthesized into our richer pipeline
  (verifier retry, size budgets, failure toolbelt kept).

## Step 6: Scaffold repo-root docs

**Traces to:** grilling #1 Q2 (repo-root docs), Q10 (no-em-dashes), Q17
(out-of-scope KB), grilling #2 R2Q1 (schema_version mechanism).

- Create `AGENTS.md` (Pi-adapted conventions doc: bucket layout, promotion
  rules, invocation split, no-em-dashes, skill-tool convention). Not
  Claude-specific; this is a Pi package.
- Create `CONTEXT.md` (the repo's workflow ubiquitous language: map, task,
  slice, frontier, blocked_by, schema_version, the 6 task types, buckets,
  decision ticket, triage role, etc.). **Scope clarification:** this repo
  IS the workflow package, so its vocabulary is the domain. For downstream
  repos, `CONTEXT.md` holds the project's domain terms instead.
- Create `docs/adr/0001-largely-adopt-mp-skills.md` (seed ADR recording this
  adoption decision + rationale; the 3 ADR criteria: hard-to-reverse,
  surprising, real trade-off).
- Create `docs/agents/README.md` (per-repo config, seeded minimal).
- Create `docs/tasks/out-of-scope/README.md` (the rejected-requests KB;
  explains its purpose).
- Add `schema_version: 2` to `docs/tasks/state.yaml`.

**Deviation:** CONTEXT.md scope was clarified mid-run (from "domain-only,
omit workflow mechanics" to "full workflow glossary since this repo is the
workflow package").

## Step 7: Add planning handoff skills + reshape wayfinder

**Traces to:** grilling #1 Q1 (strict two-phase), Q5 (to-spec/to-tickets on
docs/tasks/), Q7 (router keeps name).

- Add `to-spec` (engineering/user): synthesizes conversation/map into
  `docs/tasks/<slug>/spec.md`; no interview.
- Add `to-tickets` (engineering/user): breaks spec into tracer-bullet
  feature/bug tasks with `blocked_by` edges; uses our `task_*` tools +
  the map's tasks array; includes the wide-refactor expand-contract
  exception.
- Reshape `wayfinder` to decisions-only: remove `## Dynamic growth` and
  `return-to-Wayfinder` escape hatch; add "hand off, don't build" boundary;
  wayfinder now creates only research/prototype/grilling/manual tasks;
  feature/bug tasks come from `to-tickets`.
- Rewrite `task-overview` to ask-matt-style intent router (main flow +
  on-ramps + phase boundaries) + companion `PHASE-BOUNDARIES.md`. Name kept.
- Update `tests/skills.test.ts`: flip "## Dynamic growth" assertion to
  "decisions, not deliverables"; update manifest count.

**Deviation:** entry-point question resolved (router uses `grilling` as the
entry point since `grill-with-docs` is not yet a separate skill; references
`grilling` + `domain-modeling` together for now).

## Step 8: Realign 4 skills to Matt's current

**Traces to:** grilling #1 Q13 (re-align 3, grilling consult-first), Q16
(add domain-modeling).

- Re-align `grilling` to Matt's terser form: drop `ask_user_question`
  specificity (plain text from user); keep completion gate + decision-
  recording; adopt Matt's "dispatch a sub-agent for facts, don't block on
  it" refinement; drop canonical-URL line; fix out-of-sync handoff wording
  (now says "wayfinder or to-spec"). **Consult-first:** this step must
  consult the user before rewriting the `grilling` skill text (Q13).
- Re-align `code-review`: spell out 12-smell Fowler baseline + "repo
  overrides" + "always a judgement call" rules.
- Re-align `tdd`: refactor-out-of-loop wording ("Refactoring is not part
  of the loop. It belongs to the review stage").
- Re-align `domain-modeling`: add companion `CONTEXT-FORMAT.md` +
  `ADR-FORMAT.md`, multi-context `CONTEXT-MAP.md` support, 3-criteria
  "offer ADRs sparingly" rule.
- Update test assertions that codified `ask_user_question` + the canonical
  URL.

**Deviation:** grilling was consult-first (user chose to drop
`ask_user_question` specificity but keep completion gate + recording).

## Step 9: Changesets + prose finalize

**Traces to:** grilling #1 Q20 (changesets into release.sh), Q10
(no-em-dashes), grilling #2 R2Q1 (schema_version mechanism).

- Create `.changeset/` with `config.json` (changesets CLI), `README.md`,
  and a seed changeset recording this adoption.
- Add `@changesets/cli` devDep + `changeset`/`version` scripts to
  `package.json`.
- Rewrite `scripts/release.sh` to drive `changeset version` (consumes
  `.changeset/*.md` into `CHANGELOG.md` + bumps version) then publish.
  Integrated, not replaced.
- Em-dash sweep: replace all em-dashes (U+2014) in prose (`SKILL.md`,
  `docs/`, `README.md`, `CHANGELOG.md`, ADRs, companion docs) with
  comma/colon/period/paren/conjunction per Q10. Code comments in
  `src/`/`scripts/` `.mjs` files are out of scope.
- Bump `schema_version` from 2 to 3 in `docs/tasks/state.yaml`.
- Run the full test suite (`npm test` + `npm run typecheck`) and verify
  green.

## Summary of deviations from the designed steps

1. Eval harness dropped with grilling-with-ui (not in the original design;
   surfaced as a real dependency).
2. `validate_skill.mjs` fix (allow `disable-model-invocation` + `argument-
   hint`; the validator was too strict).
3. CONTEXT.md scope clarified mid-run (from domain-only to full workflow
   glossary, since this repo is the workflow package).
4. Router entry point uses grilling (grill-with-docs not yet a separate
   skill).
5. Grilling re-align was consult-first (user chose to drop
   `ask_user_question` specificity but keep completion gate + recording).
6. No new agent definitions were needed (the adopted utility skills don't
   use subagents; the ones that do, like code-review, already had their
   agents defined).
