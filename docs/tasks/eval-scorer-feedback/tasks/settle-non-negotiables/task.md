---
type: task
subtype: grilling
title: Settle the non-goals and non-negotiable facts for implementing the eval scorer review
status: stable
workflow_state: done
blocked_by: []
---

# Settle the effort's non-goals and non-negotiable facts

The decision to settle: which of the review's recommendations this effort
implements as written, which conflict with the operator-only harness or with
each other, and what the effort-level success test is. The review's
recommendations are the requirements. A recommendation judged wrong, or that
conflicts with another, becomes a written decision here with its consequence
recorded in `map.md`. Nothing in the review is dropped without that written
reason, and "too much work" is not a reason.

The requirement document is `docs/tasks/eval-scorer-feedback/eval-feedback.md`
(moved by `git mv` from `docs/eval-feedback.md`, body verbatim, OKF frontmatter
added). Everything downstream cites the moved path.

## Raw request, verbatim

```text
Read docs/eval-feedback.md first. It holds another agent's review of the operator-communication scorer, and it is the requirement document for this effort: implement all of it.

Scope is the offline scoring harness in evals/ plus the two skills it grades against. Nothing in that harness ships, and nothing in it may become reachable by the agent.

Derive the rest from the document instead of asking me:
- Effort slug: eval-scorer-feedback. Classification: feature.
- Destination: the scorer and its fixtures implement every recommendation in the review, and the calibration suite proves the ones that change scoring behaviour.
- Stories: one per recommendation group the document uses. If it does not group its recommendations, group them by the part of the harness each one touches and show me the grouping in the map.
- Constraints are the non-negotiables below. Do not spend the intake round re-asking them.

Non-negotiables:
- Implement every recommendation. One you judge wrong, or that conflicts with another, becomes a decision in Wayfinder planning with its consequence recorded. Nothing in the document is dropped without a written reason in the map, and "too much work" is not a reason.
- The harness stays operator-only: absent from the package's published files, absent from its skill manifest, and not invocable by the agent.
- Corpus outputs and the spend ledger stay outside the repository, in the agent directory under the operator's home.
- Every model call keeps recording its token counts and cost to the ledger, including retried calls.
- A calibration case with a known answer accompanies every scoring change, and the calibration suite must pass before any run that scores real messages.
- npm test and npm run typecheck:evals must pass, including the repository's corpus checks over every file and the em-dash ban.

A reference on the scorer as it stands:
- /tmp/scorer-analysis.md is a full written description of the current scorer, produced for the external review. Read it for context on what the review is criticising.
- It lives outside the repository and is temporary. Nothing in the effort cites it as a repository path, and nothing downstream depends on it still existing. Where it disagrees with the code, the code wins; where it disagrees with the review, the review wins.

Moving the review, once tw_create_effort has created the effort:
- docs/eval-feedback.md is committed, so move it, do not copy it and do not rewrite it: git mv docs/eval-feedback.md docs/tasks/<effort>/eval-feedback.md from bash. The write and edit tools are blocked on docs/tasks/**, and the review keeps its history only through git mv.
- Keep the body verbatim, including its wording you might disagree with. The only addition is the OKF frontmatter the tree requires, placed above the existing content: type: findings, a title naming it as the review of this harness, and status: stable. That is the shape the archived efforts use for their handoff and comparison documents, and a file under docs/tasks/ without a type shows up as a graph anomaly.
- Everything downstream cites the moved path, not the old one. If the review itself references docs/eval-feedback.md, that reference is corrected to the new path and nothing else in its text changes.

If docs/eval-feedback.md is missing, empty, or does not read as a review of this harness, stop and tell me rather than inventing requirements.
```

Correction on record: the request's scope line says "the two skills it
grades against". The operator corrected that during intake to **one** skill,
`skills/productivity/operator-communication` (whose `SKILL.md` doctrine the
judge reads at run time through `GUIDE_PATH` in `evals/lib/config.ts`).
`writing-for-agents` is out of scope. No second skill is in scope.

The review's opening assignment ("Inspect the existing repository and create
implementation tickets ... Do not implement the entire system as part of this
assignment") is an instruction to the reviewing agent, not a recommendation
about this harness. `to-tickets` covers the ticket-shaped deliverable.

## Destination

The scorer and its fixtures implement every recommendation in the review, and
the calibration suite proves the ones that change scoring behaviour.

## Actor

The operator who runs the harness and reads the messages it grades. Every
question in the review is asked from that seat: does the score explain whether
the agent's communication is getting easier for this operator to understand.

## Classification

Feature.

## Stories, one per recommendation group

The review groups its recommendations as its numbered sections 1 to 10. Section
11 is suggested sequencing, section 12 is the methodological constraints, and
section 13 is the deliverable shape; none of those three is a recommendation
group. Grouping by the part of the harness each group touches is shown beside
each story.

1. **Historical project vocabulary** (`evals/lib/sessions.ts` extraction,
   `evals/lib/judge.ts` prompt assembly). As the operator, I want the judge
   given only the `CONTEXT.md` content the agent actually saw in that session,
   recovered from the session record with its timing and completeness, so that
   project vocabulary stops being scored as unexplained and today's file is
   never read.
2. **Scorer behaviour** (`evals/lib/judge.ts` prompt, parser and aggregation;
   `evals/score.ts`; `evals/calibrate.ts`). As the operator, I want missing
   information and comprehension separated, terminology redefined with an
   explicit `not_assessable`, criteria applied per message class, every score
   anchored in words, style compliance kept apart from clarity,
   criterion-level evidence, and the full profile kept instead of a bare mean,
   so that a score names a real failure.
3. **Calibration dataset** (fixtures, annotation and dataset storage under the
   agent dir, import and export). As the operator, I want a versioned dataset of
   real and synthetic examples with stable IDs, provenance and partitions, so
   that annotations never drift from the text they judged and held-out
   judgments stay out of tuning.
4. **Interactive annotation tooling** (a development-only loader, not shipped,
   not reachable by the agent). As the operator, I want to create, accept,
   reject and correct calibration examples with their context in a session, so
   that the dataset is built from approvals rather than the agent's guesses.
5. **Criterion-level pairwise annotation** (same tooling, annotation storage).
   As the operator, I want to judge selected pairs per criterion on a five-way
   scale with skip and cannot-judge, blind to the judge's own scores, resumable,
   so that my preferences are recorded as mine and stay independent.
6. **Controlled mutations** (mutation records, mutation-driven calibration
   cases, sensitivity, specificity, monotonicity and invariance checks). As the
   operator, I want deliberately mutated variants of one message targeting one
   criterion, with the intended direction and the expected unaffected criteria
   recorded, so that a scoring change is proven to detect the failure it claims
   and to leave unrelated criteria alone.
7. **Overall human preference** (a separately loadable collection workflow,
   separate storage, and the rubric-importance analysis it feeds). As the
   operator, I want to state which of two responses I would rather have received
   without reasoning about the rubric and without seeing criterion scores, so
   that criterion importance is learned against an independent reference.
8. **Judge reliability and consistency** (`evals/score.ts`, `evals/calibrate.ts`
   and `evals/report.ts`: repeats, order swaps, criterion permutations, cycles,
   judge comparison). As the operator, I want repeated judging, reversed
   presentation order, permuted rubric order, cycle detection and alternative
   judge models reported as diagnostics with the configuration that produced
   them, so that a judged difference can be told from judge noise.
9. **Context-window experiments** (`evals/lib/sessions.ts` window builder,
   `evals/corpus.ts --window`). As the operator, I want the same examples scored
   with no window, the current three-item twenty-minute window and a larger
   window, with truncation accounted for, so that the window is a measured
   assumption rather than a guess.
10. **Statistical analysis, ranking and weight calibration** (`evals/report.ts`
    plus new analysis scripts). As the operator, I want agreement with my
    criterion and overall preferences, mutation accuracy with false penalties
    and missed failures, a connected relative ranking from incomplete pairs, and
    a comparison of aggregation strategies on held-out judgments, so that
    aggregate scoring is calibrated and a single number never stands in for a
    diagnosis.

Two stories the review names inside groups are worth their own note because
they are behavioural: recording operator clarification requests as observed
events separate from the judge's prediction (inside story 2), and keeping
synthetic variants in the same partition as their original (inside story 3).

## Constraints

The six non-negotiables in the raw request above, plus the review's own
methodological constraints in its section 12, which this effort inherits
verbatim: human preferences are the external reference; criterion judgments
stay separate from overall preferences; consistency is not correctness;
completeness is not comprehension; present-day repository content never stands
in for historical evidence; annotations attributed to the operator come from the
operator; rubric dimensions are not assumed independent; the held-out set is
never optimised against; synthetic data never replaces real sessions; brevity is
not the optimisation target; and the calibration tooling is never part of the
shipped package.

Effort-level success test, to be confirmed or corrected here: the calibration
suite proves every scoring behaviour the review changes, and a full offline run
on real messages produces per-dimension evidence and a profile that the operator
can read without the harness in front of them.

## Conflicts and decisions this grilling has to settle

1. **Loadable extension versus operator-only** (review sections 4 and 6). The
   review requires a Pi extension "temporarily loaded into an agent session"
   that exposes tools and commands. The non-negotiable says nothing in the
   harness may be reachable by the agent. Both cannot hold as written. Settle
   what the review's intent (operator-authored, operator-approved annotation)
   means when the loader cannot expose agent-callable tools, and record the
   consequence.
2. **Full doctrine in the judge prompt versus a purpose-built rubric** (review
   2.5). The review asks whether the full writing doctrine should stay in the
   judge prompt, and the code currently inlines it and reads it from the shipped
   skill file. Settle the direction and keep the doctrine as the agent's own
   instructions either way.
3. **Scale width** (review 2.4). Three levels, five levels and categorical
   anchors are all left open, and the review warns against assuming a larger
   scale is better. Settle one direction with a calibration case that shows the
   discrimination it buys.
4. **`needs_followup` migration** (review 2.1). The existing eleven cases assert
   on `needs_followup`, and the review's known-defect example depends on it.
   Settle whether the field survives beside the new comprehension field and how
   the eleven cases migrate.
5. **Aggregation** (review 2.7 and 9.4). The review forbids the unweighted mean
   as the sole authoritative measure but also forbids replacing it with the
   minimum. Settle the interim aggregate that holds before weights are fitted.

## Code reach, bounded

Checked while writing this task, so the grilling does not repeat it:

- `evals/fixtures/calibration.jsonl` holds exactly 11 cases, matching the
  review's "initial set of eleven". Each asserts bounds on a few fields.
- `evals/lib/judge.ts` reads one skill file, `GUIDE_PATH`
  (`skills/productivity/operator-communication/SKILL.md`), strips its
  frontmatter and inlines the body in the system prompt.
- `parseJudgement` silently clamps every score to an integer in 0 to 4 and
  converts an unrecognised class to `answer`. There is no `not_assessable`, no
  per-criterion reason, and one 400-character `reason` for the whole message.
- `meanScore` averages the five dimensions and is the only aggregate; the class
  label never enters scoring.
- `evals/lib/sessions.ts` records only whether a `CONTEXT.md` read happened and
  how many minutes before; no file content is captured anywhere. That is the
  section 1 gap, confirmed in code.
- The window builder is three items or twenty minutes, in `sessions.ts`, and is
  parameterised only by `--window` on `corpus.ts`.
- `evals/` is absent from `package.json` `files` and from its `pi` block.
  Outputs and the spend ledger default to `~/.pi/agent/evals/`. No Pi extension
  exists in the repository for annotation work.
- `docs/tasks/archive/pi-harness-evals` and the live `build-eval-creator-skill`
  effort cover authoring Inspect-based suites for skills and extensions. Neither
  covers scoring this harness, so this effort is not a duplicate and does not
  fold into either.

## Notes

## Settled decisions

Recorded from the operator's answers, in their terms. Task slug:
`settle-non-negotiables`.

### D1. Annotation and mutation surface: a pi extension, commands only

The annotation and mutation workflows are built as a pi extension that is
**not registered with the pi package**: it is loaded explicitly with
`pi -e <path>` and it registers **commands only, never tools the model can
call**. Nothing in `evals/` is reachable by the agent.

The operator's reasoning, recorded because it is the reason the review's
literal wording changes shape: the pi extension API has stayed stable across
0.xx to 1.xx boundaries, and maintaining several surfaces for a tool that
builds a dataset is not sensible. The operator was explicit that the value of
an extension over a CLI is the flexibility of working with an agent mid
conversation, so that it can propose new samples on the spot instead of
running a rigid harness. That intent is preserved by keeping proposals and
discussion in ordinary conversation and confining the extension to approval
and recording.

Rejected options:

- **Shared core with an extension and a CLI fallback.** The operator judged
  the second surface not worth maintaining. Consequence to carry into the
  tickets: review section 4.4's "keep the workflow usable when advanced UI is
  unavailable" is satisfied inside the extension (plain line prompts, no
  full-screen TUI), not by a separate CLI. There is no second front end.
- **CLI only.** Rejected during the round, then reopened by the operator's own
  note and closed again in favour of the extension.
- **Extension with agent-callable tools.** Rejected: it would make the harness
  agent-reachable and the annotation store agent-writable, overriding the
  operator's own non-negotiable. Recorded as rejected, not as a widening.

Consequence: the operator-only constraint holds literally. The extension lives
outside `files` and outside `pi.extensions`, and its own tests must prove it
registers no tools.

### D2. Doctrine: a purpose-built judge rubric, `operator-communication` untouched

The judge prompt becomes a purpose-built rubric that keeps the doctrine's
observable failures and drops its stylistic conventions. The skill text itself
does not change.

Why: the doctrine is the treatment variable that `regenerate.ts` varies and the
instructions the agent writes under. Editing it would make runs before and
after incomparable and would move the goalposts the harness measures. Review
section 2.5 asks to preserve it as independent instructions, and review section
11 questions 5 and 6 (unverifiable rules, redundant instructions) are therefore
**not** acted on in the doctrine; where a rule cannot be judged from a message
alone, the rubric is what stops scoring it.

Rejected options:

- **Also tighten the doctrine** (cut unverifiable rules, cut redundancy). Not
  taken: it changes the treatment and invalidates the existing 72 historical
  messages.
- **Keep inlining the full doctrine in the judge prompt.** Not taken: it leaves
  review section 2.5's separation of style compliance from clarity unaddressed
  and keeps the redundancy the review names.

### D3. Scoring shape: three-level verdicts plus categorical issue tags

Each dimension returns an ordinal verdict from `fails`, `stumbles`, `fine`,
plus an explicit `not_assessable`, with named categorical issue tags where the
review describes an observable problem (unexplained term, internal label,
label before fact, order barrier, missing decision detail, and so on).
Criterion-level evidence and a short reason come back per dimension.

Why: two thresholds instead of four, and the review's own finding that three of
eleven cases flip between samples at the current 0 to 4 boundaries. The tags
carry the diagnostic vocabulary that section 9.5's failure analysis needs.

Rejected options:

- **Keep 0 to 4 with fully defined anchors.** Cheapest migration, weakest gain
  on the boundary flips.
- **Plain three-level verdicts with no tags.** Rejected because it leaves
  failure analysis without a vocabulary.

Consequence: the score schema is versioned (`schema_version`), the judge prompt
is versioned, and the eleven existing fixture expectations migrate explicitly
with the change. Historical 0 to 4 results are preserved as they are and are
never rewritten.

### D4. `needs_followup` is replaced, not retained

The boolean goes. Missing information and comprehension barrier become two
independent scored dimensions with their own verdicts and definitions, and any
wrong inference is reported as invalid output, not clamped or coerced.
Operator clarification requests are recorded as **observed events** from the
historical next turn where that data exists, kept separate from the judge's
prediction and never treated as proof of a clarity failure on their own.

Why: the review's remaining known defect is exactly the case where the boolean
is false under its own definition while the operator's real next act was to ask
what the message meant.

Rejected options:

- **Keep the boolean beside a comprehension field.** Leaves a boolean next to
  ordinal dimensions.
- **Two booleans.** Keeps the defect.

Consequence: the eleven fixture expectations that assert `needs_followup` are
migrated, not deleted, and the migration is part of the calibration case that
proves the split works.

### D5. Aggregation: the profile, the tags and named critical failures; no overall score yet

No unweighted mean, and no minimum either. The harness reports each dimension,
its verdict, its issue tags, its evidence, and a named critical-failure list.
The overall score exists only once the fitted scorer function is calibrated
against overall preferences (D7), and it is reported beside the profile, never
instead of it.

Rejected options:

- **Unweighted mean kept as provisional.** Rejected: the risk is that the
  number becomes the thing that is read.
- **Fit weights early.** Rejected: it puts the hardest modelling step in the
  critical path of the scoring change.

### D6. Storage: fixtures in the repo, real data outside it

Hand-written and synthetic cases stay in `evals/fixtures`, versioned by git.
Real session-derived examples, mutations of real messages and every human
annotation live under `~/.pi/agent/evals/datasets/` with a manifest carrying
the dataset and annotation versions. An export command writes a repo-shaped
snapshot only when the operator chooses to commit one.

Hard requirement stated by the operator: **no real session data lands committed
into the repository.** The export path must refuse to write a record whose
provenance is a real session, and synthetic or rewritten examples are stored as
their own records with explicit provenance, never as a real observation.

Rejected options:

- **Everything in the repo.** Rejected: real session excerpts would enter a
  public repository.
- **Everything outside the repo.** Rejected: the eleven existing fixtures would
  lose their git history.

### D7. Fitting happens inside this effort, as the last phase

Overall-preference collection (review 6.1 and 6.2) and the fitted scorer
function (review 6.3 and 9.4) are in scope, in the last phase, evaluated on
held-out comparisons. Nothing earlier waits on them.

Rejected options:

- **Collect now, fit in a follow-up effort.** Rejected: review sections 6.3
  and 9.4 would ship unimplemented.
- **No fitted aggregate ever.** Rejected for the same reason.

### D8. Success test

Every scoring behaviour the review changes is proven by a calibration case, and
on held-out operator comparisons the new scorer predicts overall preference
better than the current unweighted mean.

### Non-goals the operator selected

- No UI beyond terminal prompts. The extension commands and plain line prompts
  are the whole interface; a richer front end is a later decision.
- No fine-tuning or training a judge, and no support for judge providers that
  do not speak the OpenAI chat-completions shape the harness already requires.

The operator did **not** select "nothing from the harness ships" or "no change
to the agent's instructions" as non-goals. The first is already a
non-negotiable, and the second is settled as D2, so neither needs restating as
a non-goal.

## Consequences for dependent tasks

- The extension exists as one surface, so its ergonomics are the harness's
  ergonomics. Review 4.4 must be met inside it, and its tests must show it
  registers no model-callable tools.
- Every scoring change (D3, D4, D5) arrives with a migrated calibration case in
  the same change, because the non-negotiable forbids a scoring change without
  one and the suite must gate real runs.
- Schema and prompt versioning is not optional: D3 and D4 both change the
  output contract, and review section 10 requires every result to name the
  versions it used.
- D7 depends on annotation volume, so the last phase must be able to start
  before a large dataset exists and report "insufficient data" as a result
  rather than a failure.

## Remaining fog and newly discovered work

- Review section 11 question 1 (do the five dimensions collapse into one latent
  factor) is a measurement, not a decision. It belongs to the analysis work,
  not to planning, and is carried into the spec as an analysis requirement.
- Review section 8's "is more context better" is likewise a measurement the
  harness produces, not a decision to settle here.
- Whether the review's known-defect message can be located in this machine's
  session records and turned into a case without committing real data is a
  fact-finding job, charted as a planning task.
- Nothing was recorded as out of scope. The review is implemented in full, and
  the two places the implementation departs from its literal wording (the
  extension's command-only surface, and the doctrine left untouched) are
  decisions above with their reasons, not drops.
