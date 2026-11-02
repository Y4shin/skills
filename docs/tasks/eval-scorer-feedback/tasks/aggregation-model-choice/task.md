---
type: task
subtype: research
title: Which statistical model turns criterion measurements into an overall preference
status: stable
workflow_state: ready
blocked_by: []
---

# Which statistical model turns criterion measurements into an overall preference

## Decision to settle

The scorer reports a per-dimension profile, named issue tags and a
critical-failure list (map decision D5). An overall preference estimate is
deferred until it can be fitted against the operator's own overall pairwise
annotations (D7, review 6.3 and 9.4). Review sections 6.3 and 9.3 name
candidate approaches without choosing one: constrained regression on score
differences, Bradley-Terry preference models, ordinal paired-comparison models
that keep preference strength, and regularized variants.

Settle which model the harness fits, and how it is evaluated.

The candidates are not the only question. The review also requires that
correlated dimensions be investigated before any fitted weight is given
significance, that weights are never fitted on the held-out set, that ranking
connectivity from incomplete pairing is checked, and that a limitation is
reported plainly if the dimensions cannot explain human preference at all.

## What the answer must state

- One recommended model family, in terms a ticket can implement, with the
  reason it beats each alternative on interpretability and on evaluation with
  the sample sizes this harness will realistically have.
- How preference strength is treated: the annotations carry five ordered
  labels, including two strengths in each direction, so a model that discards
  strength to a tie has to be justified.
- How the fitted aggregate is validated on held-out comparisons, and what the
  reported uncertainty looks like at small n.
- How correlated dimensions are handled before weights are read, and what the
  harness reports when the dimensions explain little.
- The minimal data volume at which fitting is worth running, and how "not
  enough data yet" is reported as a result rather than a failure.

## Anchors in the repository and the review

- `evals/report.ts` today prints distributions and spread.
- `evals/fixtures/calibration.jsonl` holds bounds-only expectations, so the
  fitting work must not depend on exact scores.
- Review section 9.3 requires a connected comparison graph; section 9.4 requires
  the unweighted mean, manual weights, fitted weights and
  critical-failure-preserving aggregations to be compared on held-out data.

## Non-goals

- Implementing the fit, the storage, or the analysis output.
- Any claim that fitted weights measure psychological importance.
