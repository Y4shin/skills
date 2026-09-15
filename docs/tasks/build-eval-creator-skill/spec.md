# Spec: eval-creator skill

> Map `pi-harness-evals`. Synthesizes the map's settled decisions, the
> isolation spike's findings, and the eval-stack-research findings into the
> spec for the `build-eval-creator-skill` feature. Grounded in
> `docs/tasks/pi-headless-isolation-spike/findings.md` (committed runner
> recipe) and `docs/tasks/eval-stack-research/findings.md` (verified API
> facts).

## Problem Statement

When a user writes a new skill or extension for the pi harness (their own or
a package's), they currently have no systematic way to find out whether it
actually works before shipping it: whether it triggers when it should, does
the thing it claims to do, and improves outcomes rather than degrading them.
Manual eyeballing of a single run is anecdotal; unit-testing a skill's prose
is impossible; and the one place this was done properly before (the
`agent-plugins-evals` project) required a bespoke, elaborate setup nobody
would rebuild per skill. So new skills and extensions ship unvalidated, and
regressions in them are noticed only in daily use, after the fact.

## Solution

A user-invoked **`eval-creator`** skill, shipped in this package's
engineering bucket, that authors and runs Inspect-based eval suites which
test pi skills and extensions. Invoked as `/skill:eval-creator`, it scaffolds
a self-contained `evals/` tree in the target repo and then coaches the user
through authoring scenario families against it. The eval subject is the full
headless pi session: a repo fixture plus a prompt, run with only the
under-test resources loaded (proven hermetic by the isolation spike), scored
deterministically on the resulting repo state, transcript, and output. The
model is held fixed and the harness configuration (with vs. without the
under-test skill or extension) is the experimental variable; a suite may be
a baseline-vs-treatment comparison or a plain pass/fail capability check
("does this skill do the thing I think it does?").

The skill is deliberately simpler than the prior art: Inspect orchestrates
and scores; pi runs on the host with its own auth against a temp-dir
fixture; no docker, no bridge, no service dependencies.

## User Stories

1. As a skill author, I want to type `/skill:eval-creator` when I finish
   drafting a new skill, so that I can validate it before I ship it.
2. As a skill author, I want the skill to scaffold a self-contained
   `evals/` tree with a small shared lib (fixture prep, hermetic pi runner,
   deterministic scorer inventory), so that my repo's evals are runnable
   without the skill installed.
3. As a skill author, I want the scaffold to include a smoke eval that runs
   against a mock model, so that I can verify the machinery works before
   spending API credits.
4. As a skill author, I want the eval runner to load only the skill under
   test (plus the pinned model) into the headless pi session, so that
   results are not polluted by my system state.
5. As a skill author, I want the runner's isolation to be assertable via a
   canary report of what pi actually loaded, so that a leak is caught as a
   failing check rather than silently contaminating results.
6. As a skill author, I want to write scenarios against a repo fixture (a
   temp copy with a known starting state), so that scorers can check
   concrete end states (files created, tests passing, git clean).
7. As a skill author, I want a deterministic scorer inventory (output
   contains/omits, file exists/contains, command succeeds, git-no-diff,
   transcript facts), so that most scenarios need no custom scorer code.
8. As a skill author, I want to add an LLM-judge only when a contract
   property is genuinely semantic, so that graders stay honest and cheap
   where determinism suffices.
9. As a skill author, I want the skill to teach contract-first authoring
   (capability measured, outcome that proves it, two experts agree), so
   that my scenarios measure the thing I care about rather than the path
   the agent happened to take.
10. As a skill author, I want the skill to teach outcome-grading over
    path-grading, so that valid approaches the eval designer did not
    anticipate are not punished.
11. As a skill author, I want the skill to teach checking both directions
    (a case where the behavior should occur and a nearby case where it
    should not), so that my eval is not one-sided.
12. As a skill author, I want the skill to teach the substring-scorer trap
    (a word appearing in a rejection still passes a contains-check), so
    that a pass for the wrong reason is caught by reading the transcript.
13. As a skill author, I want the skill to teach the 3-trial rule and the
    scorer-bug/skill-defect/spec-mismatch triage, so that a failing run is
    diagnosed instead of blindly widened until it passes.
14. As a skill author, I want the skill to teach recording a reference
    solution, so that zero percent across trials reads as a broken task
    spec rather than an incapable agent.
15. As a skill author, I want the skill to teach the saturation policy
    (100 percent evals become regression guards; capability signal lives
    below 100), so that I do not keep interpreting a saturated score as
    progress.
16. As a skill author, I want baseline-vs-treatment built into the runner
    API (same recipe minus the under-test resource), so that "did my skill
    help?" is one flag, not a second suite.
17. As a skill author, I want conversational-skill evals to be possible by
    copying simulated-user resources into my eval modules, so that I can
    eval grilling-style skills without the harness shipping multi-turn
    machinery.
18. As a simulated-user resource consumer, I want the resources to carry
    the prior art's discipline (structured user specs with opinions not
    instructions, a heuristic terminated-vs-needs-input classifier, the
    simulator never deciding pass/fail), so that multi-turn scenarios stay
    honest.
19. As a repo owner, I want to override the eval tree location and suite
    behavior via a `docs/evals.md` file, so that my repo's conventions win
    over the skill's defaults.
20. As a repo owner, I want the skill to work with no `docs/evals.md`
    present, so that I get sane defaults with zero configuration.
21. As a repo owner, I want the scaffold to create a uv project for the
    evals if uv is available and the repo has none, so that the Python
    environment is reproducible without me hand-rolling it.
22. As a package maintainer (this repo), I want `eval-creator` registered
    everywhere the repo requires (bucket README, top-level README,
    package manifest, docs page, router), so that it ships and routes
    correctly like every other promoted skill.
23. As a user of the workflow, I want the task router to refuse autonomous
    subagent dispatch for tasks/slices marked for human implementation and
    hand off to me with the `/skill:` instruction, so that a task whose
    implementation is "run the user-invoked eval skill" cannot be
    executed autonomously by accident.
24. As a user resuming work later, I want the map's decisions and the
    spike's recipe recorded in durable findings files, so that the spec
    does not re-litigate them.

## Implementation Decisions

- **Skill shape**: user-invoked skill in the engineering bucket
  (`disable-model-invocation: true`), created via the skill-creator skill's
  pipeline (which applies its own authoring discipline and adversarial
  review). Name: `eval-creator`.
- **Registration**: the skill lands in the engineering bucket README
  (User-invoked group), the top-level README's promoted-skills list (name
  linked to its SKILL.md), the package manifest's skill list (28 entries
  become 29), the docs page at `docs/engineering/eval-creator.md` with the
  four required sections, and a route in the task-workflow-overview
  router's map.
- **Scaffold shape**: on first invocation in a repo, the skill scaffolds a
  self-contained `evals/` tree: a small shared Python lib (fixture prep,
  hermetic pi runner, scorer inventory), one `@task` module per scenario
  family, a fixtures area, and a smoke eval runnable against a mock model.
  Suites import nothing from the skill package; they are runnable without
  the skill installed.
- **Hermetic runner recipe** (from the isolation spike, recipe r2):
  redirected agent dir seeded with exactly auth, provider catalog, and a
  stripped settings file (packages empty); full resource-discovery
  disable flags; under-test resources re-added explicitly via the skill
  and extension flags; fixture cwd outside any repo root; project-local
  files ignored; JSON event stream mode. A canary extension loaded in both
  arms asserts the loaded resource set; the canary is subtracted from
  asserts. The recipe is parameterized, never re-derived per scenario.
- **Completion and error detection** (from the stack research): parse the
  JSON event stream; completion is the agent-end event, model errors
  surface as an error stop reason inside the event stream while the
  process still exits 0, and configuration failures exit 1 with stderr.
  The runner therefore inspects stop reason and error message, never
  trusting exit codes alone. Multi-turn scenarios chain via the session-id
  flag; single-shot scenarios need no session handling.
- **Scorer discipline**: deterministic scorers are the default; an LLM
  judge is added only for genuinely semantic properties, via Inspect's
  model-graded facilities. The scorer inventory covers output text,
  fixture files (including glob variants), command execution, git
  cleanliness, and transcript facts. Scorer factories use the
  factory-decorator form required by the installed Inspect version.
- **uv project**: the scaffold creates a uv project for the evals (and
  pins the runtime plus `inspect-ai`) when uv is available and the repo
  has no existing uv/Python project; the skill itself follows the same
  guideline when it needs a Python environment. Repos with an existing
  Python project integrate instead of creating a parallel one.
- **`docs/evals.md` overrides**: the skill works without it (defaults);
  when present, it can override the eval tree location and suite
  behavior. Its schema is deliberately minimal for v1 (location
  overrides and behavior flags), with the schema documented in the
  scaffold's README.
- **Manual-mode gate**: a frontmatter marker on tasks/slices makes the
  task router hard-refuse autonomous subagent dispatch and hand off to the
  human with the `/skill:` name; the slice body also carries the operative
  prose instruction. Exact field name and router mechanics are fixed
  during implementation; the semantics (hard override, human handoff) are
  settled by the map decision.
- **Simulator resources**: multi-turn conversational evals ship as
  copy-paste resource files in the skill (a simulated-user spec template
  and a classifier), not as built-in machinery. Single-shot scenarios
  work out of the box.
- **First worked suite**: the feature includes a first suite for the
  `code-review` skill as the vertical slice: fixture diff with planted,
  known defects; scorers check the review names the defects, covers both
  axes, and makes no source edits. This suite is the proof the machinery
  works end to end.
- **Post-authoring review routes to `eval-review`**: the sibling
  `eval-review` skill (shipped ahead of this feature) is the review
  counterpart, mirroring the skill-creator/skill-review pairing. The
  eval-creator skill's authoring flow ends by invoking it (suite review
  mode) on the just-authored suite; it is advisory, not a gate. Its run
  triage mode is also the designated receiver when a suite run fails
  during future use.
- **First-suite home**: the first suite lives inside this repo's tree
  (under the default `evals/` location), created by the skill itself,
  serving both as the vertical slice and as the reference example for
  future users.

## Testing Decisions

- **No new test machinery.** The repo's existing structure seam asserts
  package-manifest and registration invariants (the skill-count assertion
  updates 28 to 29, and the skill's presence in the skill lists is
  covered by the existing list-driven structure tests). The skill itself
  is authored through the skill-creator skill, whose pipeline includes its
  own adversarial review (trigger test, execution dry-run, context
  review, generalization review), which the user accepted as the
  validation for this deliverable.
- **The smoke eval is the machinery's proof**: each scaffolded suite ships
  a smoke task that runs against a mock model, so the runner, fixture
  prep, and scorers are proven executable without API spend. The first
  worked suite (code-review) is the end-to-end proof: real runs, real
  scores, real logs.
- **Eval runs are graded by outcome** (state of the fixture, the
  transcript, the final output), never by the path the agent took.
- **Good tests for this feature** are the ones a second domain expert
  would independently judge the same way; the authoring discipline the
  skill teaches is its own test standard.

## Out of Scope

- Docker or bridge runner mode, container images with pi baked in
  (documented as a future strict-A/B option only).
- Service dependencies (Aura, Postgres, or any local service) and
  multi-harness matrices; evals target pi only.
- Post-hoc analysis of real session telemetry (owned by the existing
  telemetry-eval skills); this skill owns controlled experiments only.
- Publishing the shared eval machinery as a pip package; suites stay
  self-contained.
- CI integration of eval suites into pipelines.
- Built-in multi-turn simulator machinery (the copy-paste resources
  cover conversational skills; built-in support is future work).
- Evaluating skills of harnesses other than pi.

## Further Notes

- The spec inherits the map's constraints verbatim: no em-dashes in any
  prose; user-invoked only; deterministic-first scoring; deliberately
  simpler than the prior art.
- Factual grounding: the runner recipe comes from the isolation spike's
  findings (committed on evidence), and the Inspect/pi API facts come
  from the eval-stack-research findings file, which records
  version-specific drift facts (factory-form scorers, JSON-mode exit-0
  trap, the mock-model smoke pattern, the numpy host note). The
  implementation reads those two findings files rather than re-deriving
  the facts.
- The manual-mode marker interacts with the human-implementation-mode
  decision recorded in the archived task; the marker is the documented
  narrow exception to that decision's prose-only trigger.
- The skill must not silently expand scenario scope while authoring; new
  requirements discovered mid-authoring become new tasks via the
  workflow, not quiet scope creep.
