# eval-review

## What it does

`eval-review` reviews an eval suite along independent criteria, or triages
a single failed or flaky run. An "eval suite" here is an Inspect-based
collection of tasks that run the pi harness headlessly against a repo
fixture, the shape `eval-creator` scaffolds and hand-written suites follow
too.

In **suite review** mode it fixes an axis set up front, then runs every
axis as a parallel fresh sub-agent and presents the reports side by side,
never merged, never re-ranked. The core axes:

- **Contract validity**, is the capability being measured explicit, and
  would two domain experts independently reach the same verdict from the
  transcript?
- **Outcome grading**, scorers check end states, not the path the agent
  took; substring scorers are flagged as directional signals; both
  directions (should and should-not cases) must exist.
- **Isolation and comparison**, the runner follows the hermetic recipe
  (redirected agent dir, disabled discovery, explicit re-adding, canary
  assertion) and baseline-vs-treatment arms differ by exactly the
  treatment.
- **Scorer integrity**, deterministic by default, read-only, factory-form,
  and honest about incorrect versus unscored.

Optional axes run only when the suite exercises them: simulated-user
integrity and trial/saturation hygiene. The review is advisory; nothing
lands or blocks on it.

In **run-triage** mode it reads one run's transcript deeply, finds the
*why* behind each pass and fail, and classifies failures as scorer bug,
skill defect, or spec mismatch (the last being a product decision for the
suite owner). It applies the 3-trial rule and rejects substring-widening
disguised as tuning.

## When to reach for it

Type `/skill:eval-review` when a suite needs auditing or when a run failed
and the question is "is the eval wrong, or is the skill wrong?".
`eval-creator` routes its post-authoring review here automatically. You do
not need `eval-creator` installed to use it; any suite with the same shape
is reviewable.

Skip it for authoring a new suite (that is `eval-creator`), for code
reviews (`code-review`), and for reviewing Agent Skills (`skill-review`).

## Common questions

**Suite review or run triage?**
Suite review audits the suite as authored. Run triage diagnoses one run.
A flaky scenario usually gets a triage first, then a suite review once
the failures are understood.

**Does it merge findings into one verdict?**
No. A suite can pass one axis and fail another; the reports stay side by
side and no winner is declared. Each axis ends with its own worst-issue
line.

**Can it fix the suite?**
No, it is advisory. It reports findings; the author decides. Scorers are
never widened during a review or triage.

**What if my suite is not from `eval-creator`?**
Fine, as long as it is Inspect-based, runs pi headlessly, and has task
modules with scorers. The isolation checklist reference pins the runner
facts any such suite is checked against.

**Why does one failed run not prove anything?**
Agent behavior varies between runs; a single transcript is an anecdote.
Conclusions need at least 3 trials, and a zero-percent result across
trials usually means a broken task spec, not an incapable agent.

## It's working if

- A review starts with the axis-set preamble and every selected axis's
  report appears under its own heading, unre-ranked.
- Contract-validity findings point at specific scenarios where experts
  could disagree or where a pass could happen for the wrong reason.
- Outcome-grading findings catch substring scorers claiming semantics and
  missing should-not cases.
- Isolation findings cite concrete recipe violations from the checklist
  reference, not vague concerns.
- A triage ends with each failure classified as scorer bug, skill defect,
  or spec mismatch, with the transcript evidence for the call.
- Nobody widens a scorer to make a run pass during the review.
