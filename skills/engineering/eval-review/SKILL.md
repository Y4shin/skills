---
name: eval-review
description: "Review an Inspect-based eval suite for the pi harness along independent criteria: contract validity (does it measure what it claims), outcome vs path grading, isolation and baseline-vs-treatment soundness, and scorer integrity. Use when asked to review or audit an eval suite, check whether an eval measures the capability it claims, sanity-check scorers, isolation, or the baseline-vs-treatment setup, or triage a failed or flaky eval run (scorer bug vs skill defect vs spec mismatch). Suite reviews spawn parallel read-only sub-agents; nothing is edited during a review. Do NOT use for authoring, scaffolding, improving, or tuning an eval suite, reviewing code changes (use code-review), or reviewing Agent Skills (use skill-review)."
---

# /eval-review, Multi-criterion eval suite review

Review an eval suite (its task modules, scorers, fixtures, and runner
setup) along independent axes, or triage a failed or flaky run. Two modes:

- **Suite review**: a static multi-axis review of the suite as authored,
  run as parallel fresh sub-agents.
- **Run triage**: a single deep read of one run's transcript that classifies
  the failure, with no fanout.

A "suite" here is an Inspect-based collection of eval tasks that run the pi
harness headlessly. Suites authored through `eval-creator` follow that
shape; hand-written suites with the same shape are reviewable too.

## Where it fits

`eval-creator` invokes the suite review at the end of authoring. The review
is **advisory**: findings surface for the author and the user, nothing is
gated by it. A user can also invoke `/skill:eval-review` directly.

A suite can pass one axis and fail another, so there is **no single
winner**; reports stay side by side.

## Mode 1: Suite review

### 1. Pin the suite under review

Resolve the suite directory from the task context (usually an `evals/` tree;
repos can override the location, commonly via a `docs/evals.md` file). Confirm
it contains task modules with `@task` functions and a scorer setup. If the
target is missing or has no runnable task, stop and report why.

### 2. Triage the axis set

Read the suite's task modules, scorers, runner configuration, and fixtures
to fix the review plan **before spawning any reviewer**:

- The four **core** axes always run: Contract validity, Outcome grading,
  Isolation and comparison, Scorer integrity.
- Select an **optional** axis only when the suite exercises it:
  - **Simulated-user integrity**: the suite has multi-turn scenarios with a
    simulated user.
  - **Trial and saturation hygiene**: the suite has run history (logs or
    results) to check against.
- Keep the total to at most **5 axes**; if that overflows, prune the
  lowest-value optional axes rather than stacking.

The plan is **final once fixed**: no reviewer requests another axis later.

Present the plan as a short preamble before the report:

```
Review plan: <core axes, all run> + <selected optional axes>
Runners: <the parallel reviewer agents that will run>
```

### 3. Spawn the planned axes in parallel

One fresh, read-only reviewer per axis (`tools: read, bash`). Each reads
the suite directly from disk. Do not pass authoring-session backstory to
any reviewer.

**Contract-validity reviewer**
- For each task: is the contract explicit, which capability is measured and
  which outcome proves it?
- Apply the two-experts test: would two domain experts independently reach
  the same verdict from the transcript? Flag contracts where reasonable
  experts could disagree.
- Are semantic properties ("the agent treated this as the user's decision")
  stated as semantic, or silently approximated by substring checks?
- Flag contracts that over-promise or could pass for the wrong reason.
- Keep the report under 400 words.

**Outcome-grading reviewer**
- Substring scorers are directional, not semantic: a contains-check passes
  when the word appears in a rejection. Flag every scorer that claims
  meaning but only proves word presence.
- Check both directions: where a behavior should occur, is there also a
  nearby case asserting it should not? One-sided suites get flagged.
- Flag path-grading: scoring the tools used, the exact wording, or the
  route taken, instead of the end state. Agents find valid paths the
  designer did not anticipate; path-graders punish them and teach nothing.
- Keep the report under 400 words.

**Isolation and comparison reviewer**
- Read `references/isolation-checklist.md` first, then verify the runner
  setup against every checklist item: hermetic agent dir, disabled
  discovery, explicit re-adding of under-test resources, fixture placement,
  canary assertion, completion detection.
- Baseline-vs-treatment soundness per the checklist's comparison section:
  the two arms must differ by exactly the treatment. Flag any other
  difference between the arms.
- Keep the report under 400 words.

**Scorer-integrity reviewer**
- Deterministic scorers are the default; an LLM judge belongs only where
  the property is genuinely semantic. Flag grep-widening that fakes
  semantics.
- Scorers must be read-only: they return a Score and never mutate the
  fixture or run state.
- Scorers must follow the factory form the installed Inspect version
  requires.
- Incorrect versus unscored: a wrong answer is scored incorrect; an
  unobtainable judgment (unparsable grader verdict) is unscored with a
  reason. Flag anything that silently drops samples from metrics.
- Keep the report under 400 words.

**Simulated-user integrity reviewer** *(optional)*
- User specs hold opinions, not instructions. A spec engineered to script
  the outcome ("tell the agent to reject X") invalidates the measurement.
- No blanket confirmations, no task-complete signals; the user answers
  only what the agent actually asked.
- A separate classifier decides terminated versus needs-input; the
  simulator never decides pass/fail.
- Keep the report under 400 words.

**Trial and saturation reviewer** *(optional)*
- Conclusions in the suite's history rest on at least 3 trials, never a
  single run.
- A reference solution (known-good transcript or artifact state) exists for
  each scenario family, proving the task is solvable and the scorers are
  wired correctly.
- Saturated scenarios (100 percent pass) are labeled regression guards, not
  capability signal.
- Keep the report under 400 words.

Append this fanout guard to each reviewer brief:

> Do not invoke `/skill:eval-review` or spawn additional agents, perform this review directly.

### 4. Aggregate

Present the reports under verbatim headings, lightly cleaned for clarity.
Do not merge the lists or re-rank findings across axes. Include the review
plan preamble. End with a one-line per-axis worst-issue summary; do not
declare an overall winner.

## Mode 2: Run triage

For a failed or flaky run. One deep read, no fanout, and never widen a
scorer during triage.

1. Read the run's transcript or log (Inspect writes `.eval` log files to a
   logs directory; read them with the framework's log reader or the log
   viewer) and each failed scorer's explanation. Find the *why* of every
   pass and every fail; a pass for the wrong reason is a silent failure
   and is worse than a visible one.
2. Classify each failure:

| Evidence | Verdict | Action |
|---|---|---|
| Agent followed what the skill under test teaches, outcome matches the contract, scorer missed it | Scorer bug | Fix the scorer's signal or channel |
| Agent violated what the skill under test explicitly promises | Skill defect | The scorer did its job; file the finding against the skill |
| The suite never promised what the run expected | Spec mismatch | Redesign the contract; this is a product decision, put it to the suite owner |

3. Apply the trial rule: one transcript is an anecdote. Do not draw
   conclusions from fewer than 3 trials.
4. Reject invalid tuning: widening a substring until the agent passes is
   overfitting to one run. If the property is genuinely semantic, propose
   an LLM judge instead.

## References

- **[isolation-checklist.md](references/isolation-checklist.md)**: the
  hermetic-runner recipe for headless pi evals, with the version-pinned
  facts (flag semantics, exit codes, fixture placement) the isolation
  reviewer verifies against. Read it before reviewing a runner setup, and
  during triage whenever isolation is the suspected cause.
