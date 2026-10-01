---
title: Eval-creator skill, Inspect-based eval suites for pi skills and extensions
status: stable
type: map
---

## Destination

A user-invoked **`eval-creator`** Agent Skill in this repo's engineering
bucket that lets a human author and run **Inspect-based eval suites that
test pi harness skills and extensions**. Invoked as `/skill:eval-creator`,
it scaffolds a self-contained `evals/` tree in the target repo (small shared
lib: fixture prep, headless pi runner, deterministic scorer inventory, plus
one `@task` file per scenario family) and teaches a contract-first authoring
discipline distilled from the `agent-plugins-evals` prior art.

The eval subject is the **full headless pi session**: a repo fixture plus a
prompt, run with only the under-test resources loaded, scored on the
resulting repo state, transcript, and output. The model is held fixed and
the harness configuration (with vs without the skill or extension under
test) is the experimental variable; an eval may be a performance comparison
or a plain pass/fail capability check ("does this skill do the thing I think
it does?").

Done looks like:

- `skills/engineering/eval-creator/` exists, is user-invoked
  (`disable-model-invocation: true`), and is registered everywhere the repo
  requires: top-level `README.md`, `skills/engineering/README.md`,
  `package.json` `pi.skills`, docs page at
  `docs/engineering/eval-creator.md`, and a route in
  `task-workflow-overview`'s map.
- The scaffold produces a runnable `evals/` tree with **no** `docs/evals.md`
  present, and honors `docs/evals.md` overrides when present (default
  location and behavior overridable per repo).
- A first worked suite for the `code-review` skill runs end to end: a
  fixture diff with planted defects, a headless pi run, deterministic
  scorers (defects named, both Standards and Spec axes present, no source
  edits to the fixture), and a real Inspect log with scores.
- The runner architecture is committed on spike evidence: hermetic
  isolation proven (only under-test skills/extensions plus the pinned model
  load, no system-state pollution) or the design revised accordingly.
- `implement-task` honors a human-implementation frontmatter marker: it
  refuses autonomous subagent dispatch for such tasks/slices and hands off
  to the human with the `/skill:` instruction, so a task whose
  implementation is "run the user-invoked eval skill" cannot be executed
  autonomously by accident.

## Constraints

- The skill ships in this `task-workflow` Pi package: bucket README entry,
  top-level README link, `package.json` `pi.skills` entry, docs page with
  the four required sections, `task-workflow-overview` router update, and
  `tests/skills.test.ts` coverage. No em-dashes in any prose (repo rule).
- User-invoked only; it may delegate to model-invoked skills but never to
  another user-invoked one.
- Eval suites are **self-contained**: runnable without the skill installed,
  no imports from the skill package path, no shared pip package. The
  simulator/classifier ships as copy-paste resource files the eval author
  drops into their eval modules.
- The eval environment is Python (`inspect-ai`) provided via this repo's
  devenv; the repo itself stays Node-canonical and the eval code lives in
  Python.
- Deliberately simpler than `agent-plugins-evals`: no docker, no bridge
  proxy, no Aura/Postgres, no multi-harness matrix. Inspect orchestrates
  and scores; pi runs on the host with its own auth against a temp-dir
  fixture (own-auth + local), model pinned per eval via pi's own config.
  The docker/bridge mode stays documented as a future strict A/B option.
- Deterministic scorers are the default; an LLM judge is used only for
  genuinely semantic properties, via Inspect's model_graded facilities.
  Substring scorers are directional signals, never semantic proof.
- The manual-mode marker is a narrow, documented exception to the
  prose-only human-mode decision recorded in `decide-human-implementation-mode`.

## Decisions so far

- **Eval subject (round 1, Q1).** One sample is a full headless pi session:
  repo fixture plus prompt, scored on transcript, resulting repo state, and
  output. Trigger-only checks and extension unit checks become cheap scorer
  or task families on top of that runner, not separate architectures.
  Anything less would not need evals.
- **Runner architecture (round 2, Q1; COMMITTED by spike 2026-09-11).**
  Own-auth + local, the pattern the prior-art repo explicitly chose (its
  `agents.py` documents rejecting the inspect-swe bridge because the
  harness must use its own auth on the host). The isolation spike
  (`pi-headless-isolation-spike`, done) proved hermetic headless runs:
  `PI_CODING_AGENT_DIR` pointed at a temp agent dir seeded with only
  `auth.json` + `models.json` + a `packages: []`-stripped `settings.json`,
  full `--no-*` disable flags, under-test resources re-added explicitly
  via `--skill`/`-e`, cwd in a fixture outside any repo root, `--no-approve`,
  `--mode json`. A canary extension asserting `systemPromptOptions.skills`
  makes the loaded set provable; planted leaks were detected. Full recipe
  and evidence: `docs/tasks/pi-headless-isolation-spike/findings.md`.
  Bridge + docker remains the documented future alternative for strict
  model pinning. Key sub-findings: `--no-skills` overrides `--approve`
  (project skills need explicit `--skill`), and fixtures must live outside
  any enclosing repo or ancestor `.agents/skills` leaks in.
- **Skill shape and name (round 1 Q3, round 3 Q1).** User-invoked, named
  `eval-creator`, living in `skills/engineering/`. Writing an eval suite is
  deliberate authoring work with real choices; it must not auto-trigger.
- **Location and overrides (round 1, Q4).** Suites live under `evals/` by
  default; a repo may override location and behavior via a `docs/evals.md`
  markdown file the skill can write; the skill works without it; the
  default location is overridable.
- **Experimental semantics (round 1, Q5).** Model held fixed, harness
  configuration is the variable. Evals may be baseline-vs-treatment
  comparisons or pass/fail capability checks; both are first-class.
- **Interactivity (round 2, Q3).** The simulated-user turn loop (heuristic
  terminated-vs-needs-input classifier plus structured user specs holding
  opinions, not instructions; the simulator never decides pass/fail) ships
  as copy-paste resource files, not built-in machinery. Single-shot
  scenarios work out of the box; multi-turn conversational evals (grilling,
  wayfinder) are possible by copying the resources in.
- **First worked suite (round 2, Q4).** `code-review`: a fixture diff with
  planted, known defects; scorers check the review names the defects,
  covers both axes, and makes no source edits. Proves the machinery fast
  with low variance.
- **Manual-mode gate (round 2, Q2).** Marker + prose: a frontmatter marker
  (exact field name to be fixed in to-spec) on a task or slice makes
  `implement-task`'s router hard-refuse autonomous subagent dispatch and
  hand off to the human with the `/skill:` instruction; the slice body
  carries the operative prose as well.
- **Authoring discipline carried over from the prior art's `eval-authoring`
  skill (round 2, Q0 reading).** Task contract first (capability measured,
  outcome that proves it; two domain experts would independently reach the
  same verdict). Grade the outcome, never the path. Check both directions.
  Substring scorers are directional, not semantic; read transcripts before
  trusting a pass. At least 3 trials before conclusions; triage failures
  as scorer bug vs skill defect vs spec mismatch (the last is a product
  decision for the user). Widening a substring until it passes is
  overfitting. Record a reference solution. Saturated evals are regression
  guards; retire or harden them.
- **Review counterpart (2026-09-11, user request).** The user invoked
  skill-creator directly to add a user-facing **`eval-review`** skill as the
  companion to eval-creator, mirroring the skill-creator/skill-review
  pairing. It shipped ahead of eval-creator itself: multi-criterion suite
  review (contract validity, outcome grading, isolation and comparison,
  scorer integrity; optional simulated-user integrity and trial/saturation
  axes) plus a run-triage mode with the three-way failure classification.
  It lives in the engineering bucket, model-invoked (so eval-creator can
  route its post-authoring review to it), registered in the package
  manifest and structure tests (28 to 29), the bucket README, its docs
  page, and the task-workflow-overview router. Its
  `references/isolation-checklist.md` distills the spike's recipe into the
  reviewer-facing checklist. eval-creator's spec records the routing
  decision.
- **Facts established by the opening research (in-session, to be captured by
  `eval-stack-research`).** Inspect's unit is a Task (Dataset + Solver +
  Scorer, optional sandbox), `@task` registration, `eval`/`eval_set`,
  samples carry metadata, custom scorers can run commands and read files,
  logs are browsable and dataframe-able, model_graded covers LLM judging,
  and agent bridges exist for external harnesses (the rejected alternative).
  pi runs headless via `-p` / `--mode json` / `--mode rpc`, supports
  resource-narrowing flags (`--no-extensions`, `--no-skills`,
  `--no-context-files`, `-e <path>`, `--skill <dir>`), custom providers via
  `models.json`, and non-interactive project trust via `--approve` /
  `defaultProjectTrust`.

## Fog

- Exact frontmatter field name and router mechanics for the
  human-implementation marker (semantics settled: hard override). To be
  fixed in to-spec.
- `docs/evals.md` schema: fields, precedence over defaults, what repos can
  override. To be designed in to-spec.
- Whether v1 ships a helper for LLM-judge scorers or only documents
  Inspect's model_graded path. Default: document only until a real contract
  needs one.
- Repetitions and epochs defaults (at least 3 trials per conclusion), and
  per-scenario cost caps (max turns, message/token limits).
- Where eval logs and results live per repo, and what is gitignored.
- Suite naming convention under `evals/` (default `evals/<target-name>/`).
- Whether multi-turn conversational-skill evals are part of the first
  release or a follow-up; depends on how clean the copy-paste simulator
  resource proves in practice.

## Out of scope

- Docker/bridge runner mode and a container image with pi baked in;
  documented as a future strict A/B option only.
- Aura, Postgres, or any local service dependencies; multi-harness
  matrices (claude, cursor). Evals target pi only.
- Post-hoc analysis of real session telemetry; the existing
  `telemetry-eval-setup`/`telemetry-eval-analyze` skills own that. This
  skill owns controlled experiments; the boundary is deliberate.
- Publishing the shared eval machinery as a pip package (self-contained
  `evals/` chosen instead).
- CI integration of eval suites into pipelines.
- Evaluating skills of harnesses other than pi.
