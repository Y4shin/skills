# Evaluation System Improvements and Calibration Workflows

## Objective

Improve the existing agent communication evaluation system so that it reliably measures how understandable and useful an agent's final messages are to its human operator.

The current system scores final messages against five communication criteria using an LLM judge. An initial set of eleven hand-written calibration cases exists.

We want to:

1. Correct weaknesses in the existing scoring system.
2. Incorporate the operator's known project vocabulary from historical session context.
3. Build interactive Pi extension workflows for collecting human annotations.
4. Evaluate judge reliability using controlled examples, repeated scoring, and pairwise comparisons.
5. Calibrate the relative importance of scoring criteria against the operator's actual preferences.
6. Establish a reproducible, versioned evaluation process for comparing future changes to the agent's communication.

The goal is not merely to make the agent comply with writing rules. The goal is to reduce the effort required to understand its responses.

## Your assignment

**Inspect the existing repository and create implementation tickets for the work described below.**

Do not implement the entire system as part of this assignment.

Use the repository's existing ticket structure, task planning conventions, architectural decisions, and terminology.

Before creating tickets:

- Inspect the existing evaluator, scorer prompts, data models, tests, session extraction code, and calibration infrastructure.
- Determine which requirements are already implemented.
- Identify integration points with the existing Pi session format and extension system.
- Identify dependencies between tasks.
- Preserve existing useful functionality and avoid unnecessary rewrites.

Create reasonably scoped, independently testable tickets with acceptance criteria and dependencies.

The sections below describe the desired behavior, not a mandate to implement a particular internal architecture. Make pragmatic implementation decisions consistent with the repository.

---

# 1. Historical project vocabulary from CONTEXT.md

## Requirement

Every repository used by the operator has a `CONTEXT.md` file containing the shared project vocabulary.

This file establishes terminology that both the operator and the agent can reasonably be expected to understand.

The evaluator must account for this vocabulary when deciding whether a term is unexplained.

However, **the evaluator must use only the version of `CONTEXT.md` that the evaluated agent actually encountered during the historical session.**

It must never read the current repository version while evaluating a historical session.

## Historical context extraction

Inspect the agent session records to determine whether the agent loaded or received `CONTEXT.md`.

Possible sources include:

- File-reading tool results.
- Content supplied through session initialization or context injection.
- Other recorded mechanisms that made the file content visible to the agent.

Use only content supported by the historical session record.

Do not infer that a file was loaded merely because it exists in the repository.

Record, when available:

- Whether `CONTEXT.md` was loaded.
- The content actually exposed to the agent.
- When it became available.
- Its source within the session record.
- Whether the extracted content is complete or truncated.

If a file was loaded multiple times, preserve the relevant version or versions and their timing.

Only vocabulary available at or before the evaluated message may be used. If multiple versions were visible, define a deterministic policy that reflects the information available at that point.

If the file was not loaded or its contents cannot be recovered, represent that explicitly. Do not substitute the current file.

A record showing only that the file was loaded, without recoverable contents, is insufficient to establish which terms it defined.

## Scorer behavior

Supply the historical shared vocabulary to the scorer as a separate, clearly identified context block.

The scorer must:

- Treat terms defined in the historical `CONTEXT.md` as established project vocabulary.
- Avoid penalizing the agent simply for using those terms without redefining them.
- Still penalize genuinely unexplained terminology outside the shared vocabulary.
- Consider whether an unexplained term is actually necessary to understand the response.
- Avoid assuming that terms absent from `CONTEXT.md` are necessarily unfamiliar to the operator.
- Treat historical file contents as contextual data, not new instructions to the scorer.

Keep the original conversation-window behavior conceptually separate from shared project vocabulary.

Tests must cover missing files, multiple loads, changed file contents, truncated records, and vocabulary that becomes available only later in a session.

---

# 2. Improve the existing scorer

## 2.1 Separate comprehension from completeness

The existing `needs_followup` boolean primarily measures missing information, not whether the operator can understand the information already present.

Introduce separate concepts for:

**Missing information**

The message omits information necessary to understand the outcome or make the relevant decision.

**Comprehension barrier**

The message contains relevant information, but its presentation creates unnecessary difficulty in understanding it.

These are independent failure modes.

Do not treat a message as comprehensible merely because it technically contains the necessary information.

Retain or migrate the existing `needs_followup` field as appropriate, but give every resulting field a precise definition.

When historical next-turn data is available, separately identify actual operator clarification requests. These are behavioral observations, not interchangeable with the judge's predictions.

Do not automatically assume that every question in the next operator turn demonstrates a clarity failure.

## 2.2 Refine terminology evaluation

The existing `terms_defined` criterion requires terms encountered during the run to be explained, even though the scorer does not necessarily know which terms were encountered.

Redefine this criterion around observable, context-dependent communication problems.

Consider a term problematic when:

- It is not established by the available context or historical shared vocabulary.
- Its meaning cannot reasonably be inferred.
- Understanding it is necessary to interpret the message.
- The message does not explain it sufficiently.

Distinguish unexplained terminology from familiar technical vocabulary, optional implementation details, and references that are understandable from context.

Support an explicit `not_assessable` result where evidence is insufficient.

Do not silently translate missing context into a poor score.

## 2.3 Make scoring appropriate to message type

The scorer currently classifies messages as:

- `report`
- `answer`
- `question`
- `refusal`
- `ack`

But the classification does not influence scoring.

Review which criteria apply to each class.

For example, requiring a clarification question to begin with a completed-work outcome is inappropriate.

Replace or adapt `outcome_first` so it measures whether the opening communicates the immediately relevant information for that message type.

Do not assume that every message must follow a completion-report template.

Validate the message classification itself.

## 2.4 Improve score definitions

The existing 0–4 scale does not clearly distinguish every score.

Evaluate whether:

- A three-level scale provides adequate discrimination with better reliability.
- A five-level scale provides meaningful additional information.
- Some criteria should use distinct anchors or categorical labels.

Every supported score must have an explicit, operational definition.

Include examples and borderline cases where useful.

Do not assume a larger numerical scale is better.

## 2.5 Separate rubric compliance from communication quality

The current scorer receives the full communication doctrine.

Some rules describe observable communication failures, while others specify stylistic conventions.

Avoid penalizing a message's overall comprehensibility merely because it violates a style convention that has no meaningful effect on understanding.

Distinguish, where useful:

- Compliance with explicit writing rules.
- Actual communication clarity and usability.

Review whether the full writing doctrine should remain in the judge prompt or whether a shorter, purpose-built evaluation rubric would be more reliable.

Preserve the writing doctrine as an independent source of instructions for the agent being evaluated.

## 2.6 Improve judge output

Provide criterion-level evidence and explanations.

For each scored criterion, return at least:

- Score or categorical judgment.
- Short reason.
- Relevant evidence from the evaluated message, when applicable.
- Whether the criterion was assessable.

Prefer structured, schema-validated output.

Do not silently clamp out-of-range scores or convert unknown classes into valid classifications.

Invalid outputs must be reported or explicitly retried.

Preserve enough diagnostic information to investigate scoring failures.

## 2.7 Avoid hiding critical failures in an average

Retain the full scoring profile.

Do not use an unweighted arithmetic mean as the sole or authoritative measure of communication quality.

Support reporting of:

- Individual dimensions.
- Critical failures.
- Overall score, if one is defined.
- Uncertainty or unavailable judgments.

Do not immediately replace the mean with the minimum score. Aggregate scoring should be calibrated against human preferences.

---

# 3. Calibration dataset

Build a reusable, versioned calibration dataset.

A calibration example should contain:

- A stable example identifier.
- The final agent message.
- The historical visible conversation context.
- Historical `CONTEXT.md` vocabulary, when available.
- Message classification.
- Source provenance.
- Whether the example is real or synthetic.
- Relevant annotations and comparisons.
- Dataset and annotation versions.

Support both real examples extracted from sessions and deliberately constructed examples.

Keep synthetic modifications separate from original session records.

All annotations must reference stable example identifiers.

Record which version of an example was judged. Editing a message after annotation must not silently change the meaning of existing annotations.

Provide import/export capabilities suitable for reproducible offline evaluation.

Use a storage format consistent with existing repository conventions.

## Dataset partitioning

Support at least:

- A development/calibration set.
- A held-out validation set.

Avoid using held-out human judgments while tuning prompts, criteria, or weights.

Where synthetic variants derive from an original response, keep the original and its variants in the same partition to avoid evaluation leakage.

Avoid treating large numbers of closely related variants as independent examples.

---

# 4. Temporary Pi extension for interactive annotation

Create a Pi extension that can be temporarily loaded into an agent session to support interactive calibration-data creation.

**This extension is a development tool. It must not be installed, enabled, or shipped as part of the normal Pi package or default agent configuration.**

Place it in an appropriate development-only location.

Use the existing Pi extension APIs and conventions.

The extension should expose tools and/or commands that enable the following interactive workflows.

## 4.1 Creating calibration examples

The operator should be able to ask the agent to create calibration examples.

The agent may:

1. Propose a real historical message with its context.
2. Present the message and context to the operator.
3. Discuss its suitability for the dataset.
4. Help refine or replace the example.
5. Save it after operator approval.

The operator must be able to:

- Accept an example.
- Reject it.
- Edit or request a revised version.
- Assign or correct metadata.
- Inspect its associated context.
- Distinguish original text from synthetic modifications.

For real historical messages, preserve the unmodified original.

If a message is rewritten, store the rewritten version as a separate example with explicit provenance.

Do not silently convert a rewritten example into a real historical observation.

## 4.2 Criterion-level pairwise annotation

Once examples are available, the extension should help present selected pairs for human evaluation.

Each example must be shown with its own relevant context.

For an individual rubric criterion, provide the following choices:

1. A significantly better than B.
2. A somewhat better than B.
3. Approximately equal.
4. B somewhat better than A.
5. B significantly better than A.

Also support:

- Cannot judge.
- Skip.
- Optional explanation.

The operator's selection is authoritative for that human annotation.

The agent must not infer, alter, or fill in human preferences.

Do not expose the LLM judge's existing scores before the operator makes an independent judgment unless the operator explicitly requests them.

The extension should save each comparison with:

- Both example IDs and their versions.
- Criterion identifier and rubric version.
- Selected preference.
- Optional explanation.
- Presentation order.
- Annotation timestamp.
- Annotation provenance.

Support resuming interrupted annotation sessions without losing completed judgments.

## 4.3 Pair selection

Do not require exhaustive all-pairs comparisons.

Support selection strategies including:

- Random comparisons.
- Comparisons between similar message types.
- Comparisons between examples with similar estimated quality.
- Comparisons between examples with large estimated quality differences.
- Comparisons selected to reduce uncertainty.
- Deliberate consistency checks.

Track which comparisons have already been annotated.

Ensure sufficient connectivity between examples intended to share a global ranking.

Avoid presenting the same pair repeatedly except where explicitly required for consistency measurement.

When doing deliberate consistency checks, record that purpose without revealing it to the annotator before their judgment.

## 4.4 Human annotation ergonomics

The annotation loop should be efficient enough to use for dozens or hundreds of comparisons.

Avoid making the operator manually type lengthy descriptions for every judgment.

The interface should make it easy to:

- Read the two messages.
- Inspect their contexts.
- See the current criterion.
- Select a preference.
- Add an optional note.
- Move to the next pair.
- Review or correct earlier annotations.
- Stop and resume later.

If the Pi interface supports an interactive selection interface, prefer it over requiring free-form textual responses.

Keep the underlying annotation workflow usable even if advanced terminal UI features are unavailable.

---

# 5. Controlled mutations

Extend the calibration tooling to support creating deliberately modified versions of messages.

This may be implemented in the same extension as Section 4 or in a separate development-only extension.

Prefer the simplest maintainable architecture.

## 5.1 Mutation workflow

The operator and agent should collaboratively:

1. Select a baseline message.
2. Identify one intended rubric criterion.
3. Propose a mutation.
4. Review the mutation together.
5. Verify that the mutation actually introduces or removes the intended issue.
6. Save the mutation and its expected effects.

The operator must approve the final mutation.

## 5.2 Mutation categories

Initially support mutations targeting:

- Unexplained terminology.
- Unexplained internal labels.
- Poor opening or information ordering.
- Irrelevant information.
- Missing decision-relevant information.
- Unnecessary complexity.
- Poor formatting or structure.
- Comprehension barriers.
- Message-type-specific communication problems.

Also include positive controls:

- Adding a useful explanation.
- Replacing jargon with established project vocabulary.
- Improving structure without changing meaning.
- Adding necessary detail.
- Removing irrelevant information.

## 5.3 Preserve experimental control

Aim to change one relevant property at a time.

A mutation should not accidentally alter factual meaning, completeness, or another important property unless that is explicitly part of the experiment.

Store:

- Parent example ID.
- Modified message.
- Targeted criterion.
- Intended direction of change.
- Expected unaffected criteria.
- Operator approval.
- Explanation of the modification.

Allow the operator to annotate each mutation pair using the pairwise interface.

## 5.4 Tests generated from mutations

Use controlled mutations to test:

**Sensitivity:** Does the scorer detect the introduced problem?

**Specificity:** Does the scorer avoid penalizing unrelated criteria?

**Monotonicity:** Does a deliberately worsened example score worse on the intended criterion?

**Invariance:** Do harmless edits leave the relevant judgments approximately unchanged?

Do not assume all changes can be isolated perfectly. Record and inspect cases where a mutation affects multiple criteria.

---

# 6. Separate Pi extension for overall human preferences

Create a second development-only Pi extension or equivalent independently loadable workflow for collecting overall preferences.

This workflow assumes that criterion-level comparisons from Section 4 may already exist.

Its purpose is different.

**Criterion-level annotation asks which response better satisfies a specific rubric. Overall preference annotation asks which response the operator would actually prefer to receive.**

The latter must not require the operator to reason explicitly about the rubric.

## 6.1 Overall preference question

Present two examples, each with its original context.

Ask approximately:

> Considering what you were trying to accomplish in each conversation, which of these agent responses would you rather have received, based on how easily you could understand and use it?

Use the same five ordered preference labels:

- A significantly better.
- A somewhat better.
- About the same.
- B somewhat better.
- B significantly better.

Also support cannot judge, skip, and optional explanation.

Make clear that this evaluates communication rather than the correctness of unseen code or tool operations.

## 6.2 Keep these annotations independent

Do not show the operator the existing criterion scores or inferred ranking before collecting the overall preference.

Otherwise, the earlier rubric labels could bias the overall judgment.

It should be possible to reuse already annotated pairs, but the interface must not reveal their prior criterion-level results until the independent overall judgment is recorded.

Separate overall preference labels from criterion-level labels in storage.

## 6.3 Reconstruct rubric importance

Use overall preferences and criterion-level measurements to investigate which rubric dimensions explain the operator's preferences.

Possible approaches include:

- Constrained regression on score differences.
- Bradley–Terry-style preference models.
- Ordinal paired-comparison models that preserve preference strength.
- Regularized models that prevent unstable or implausible weighting.

Treat these as candidate approaches rather than mandatory implementations.

Prefer an interpretable model.

Evaluate the results on held-out comparisons.

Do not interpret learned weights as precise measures of psychological importance.

Investigate correlated rubric dimensions before assigning significance to individual fitted weights.

If the existing dimensions cannot explain human preferences, report that limitation rather than forcing a misleading weighted score.

---

# 7. Judge reliability and consistency

Extend the evaluation system with explicit judge reliability tests.

## 7.1 Repeated judging

Run the same example multiple times using identical inputs and scorer configuration.

Measure:

- Score distributions.
- Criterion-level disagreement.
- Variation near scoring boundaries.
- Overall judgment stability.

Do not assume temperature zero produces deterministic results.

Select the number of repeated samples based on observed instability and evaluation cost.

## 7.2 Position bias

For pairwise evaluation, compare:

- A versus B.
- B versus A.

After reversing the presentation order, the underlying preference should remain consistent.

Record preference reversals.

Do not silently reinterpret a reversal as an actual tie.

## 7.3 Criterion-order sensitivity

Evaluate whether changing the order of rubric criteria in the prompt affects the resulting scores.

Use controlled permutations.

Record the scorer configuration and prompt variant used for each result.

## 7.4 Transitivity and consistency

When enough pairwise comparisons exist, detect preference cycles.

Distinguish:

- Strong cycles involving confident preferences.
- Weak cycles involving near-ties.
- Isolated contradictions.
- Systematic inconsistency patterns.

Do not assume that every preference cycle proves the evaluator is defective.

Use these measurements as diagnostics.

## 7.5 Judge model comparison

Support evaluating the same calibration set with different judge models.

Record model identity and relevant inference configuration.

Compare models using human agreement, reliability, cost, and latency.

Do not assume that using a model from a different family automatically removes bias.

---

# 8. Context-window experiments

The current scorer uses a limited context window of up to three earlier visible items and twenty minutes.

Treat this as an experimental assumption.

Support evaluating the same examples with:

- No preceding conversation.
- The existing context window.
- A larger visible conversation window.

Keep historical `CONTEXT.md` information conceptually separate from these windows.

Measure how the context changes:

- Terminology judgments.
- Comprehension judgments.
- Missing-information judgments.
- Overall score stability.

Account for truncated messages and truncated historical context.

Do not interpret an explanation omitted by truncation as proof that the original message lacked that explanation.

Do not automatically conclude that more context is better. The objective is to approximate what the operator could reasonably rely on when reading the message.

---

# 9. Statistical analysis and calibration

Implement analysis tooling for the collected annotations and scorer results.

## 9.1 Criterion-level measurements

Measure:

- Agreement with human criterion preferences.
- Accuracy on controlled mutations.
- False positive penalties.
- Missed failures.
- Severity agreement where available.
- Repeated-score stability.

If categorical issue labels are introduced, measure precision and recall separately where appropriate.

## 9.2 Overall preference measurements

Measure:

- Agreement with overall human preferences.
- Preference direction accuracy.
- Agreement on preference strength.
- Performance on held-out comparisons.
- Changes across scorer versions.

Report uncertainty where sample sizes are small.

## 9.3 Relative ranking

Explore fitting a global relative ranking from incomplete pairwise comparisons.

Consider Bradley–Terry or an ordinal extension supporting ties and preference strengths.

Ensure the comparison graph has sufficient connectivity for the intended analysis.

Explain ranking uncertainty and avoid presenting latent scores as absolute percentages of clarity.

## 9.4 Calibrating weights

Compare:

- The existing unweighted mean.
- Manually selected criterion weights.
- Human-preference-fitted weights.
- Alternative aggregation strategies that preserve critical failures.

Use held-out human preferences to evaluate the candidate scoring systems.

Do not optimize criterion weights on the held-out set.

Avoid presenting a single aggregate score as sufficient to diagnose communication problems.

## 9.5 Failure analysis

Make it easy to inspect:

- Examples where the scorer strongly disagrees with the operator.
- Criteria frequently responsible for disagreements.
- False penalties on controlled examples.
- Missed comprehension failures.
- Inconsistent pairwise judgments.
- Context-sensitive scoring failures.

Prioritize actionable diagnostics over producing additional aggregate metrics.

---

# 10. Versioning and reproducibility

Every evaluation result must be traceable to:

- Exact evaluated message and context version.
- Historical vocabulary input.
- Rubric version.
- Judge prompt version.
- Judge model and inference configuration.
- Scoring schema version.
- Calibration dataset version.
- Human annotation version, where relevant.
- Any statistical calibration model or aggregation configuration.

Preserve historical results when the rubric changes.

Support comparing scorer versions on the same fixed validation data.

Avoid retroactively changing previous evaluation results when calibration rules are updated.

The existing eleven hand-written calibration cases should remain available as regression tests, with necessary explicit migrations if the scoring schema changes.

---

# 11. Suggested implementation order

Use the following sequence as a starting point when creating tickets. Adjust dependencies based on the existing architecture.

## Phase 1: Foundation

1. Historical `CONTEXT.md` extraction and vocabulary injection.
2. Scorer schema improvements and stricter validation.
3. Clarification of comprehension, completeness, terminology, and message-type criteria.
4. Dataset and annotation storage with provenance and versioning.

## Phase 2: Interactive annotation

5. Development-only Pi extension for creating and refining calibration examples.
6. Criterion-level pairwise annotation workflow.
7. Controlled mutation creation and annotation.
8. Independent overall preference annotation extension.

## Phase 3: Calibration and validation

9. Repeated judging and consistency diagnostics.
10. Context-window experiments.
11. Pairwise ranking and agreement analysis.
12. Criterion-weight calibration.
13. Held-out validation and scorer comparison reports.

Separate tasks further when necessary, but avoid creating tickets so small that they add significant coordination overhead.

## Phase 4: Integration

14. Integrate calibrated scoring into ordinary evaluation runs.
15. Provide concise, interpretable reporting.
16. Document how to update calibration data, evaluate a new judge, and maintain the process.

Do not make ordinary evaluation runs depend on interactive annotation extensions.

The extensions must remain optional development tools.

---

# 12. Important methodological constraints

Preserve these principles throughout the implementation:

**Human preferences are the external reference.** The existing rubric is a hypothesis about what makes responses understandable, not ground truth.

**Separate criterion judgments from overall preferences.** Collect both independently so that criterion importance can be evaluated.

**Do not confuse consistency with correctness.** A judge can be internally consistent while consistently disagreeing with the operator.

**Do not confuse completeness with comprehension.** Information can be present but difficult to understand.

**Do not use present-day repository content for historical evaluation.** Only historical session evidence establishes what vocabulary was available.

**Do not silently invent human annotations.** The agent may suggest examples and explain comparisons, but preference labels attributed to the operator must actually come from the operator.

**Do not assume the current rubric dimensions are independent.** Test overlap and correlated failures.

**Do not optimize against the held-out set.** Keep validation data separate from calibration and development.

**Do not let synthetic data replace real sessions.** Controlled examples are diagnostic tools; real session performance remains the actual target.

**Do not optimize for brevity alone.** Necessary explanation is valuable even when it increases message length.

**Do not make the calibration extensions part of the shipped Pi package.** They must remain explicitly loaded development-only tools.

---

# 13. Expected deliverable from this planning task

Produce implementation tickets using the repository's existing conventions.

For every ticket, include:

- The problem being solved.
- The intended behavior.
- Relevant existing code and integration points.
- Scope and non-goals.
- Dependencies.
- Acceptance criteria.
- Tests or validation requirements.

Ensure that the combined tickets cover every substantive requirement above.

Identify architectural decisions that require investigation, but do not block ticket creation on minor implementation details.

Prefer reusing existing infrastructure over introducing parallel systems.

Where alternatives are proposed, include an investigation or decision step in the relevant ticket instead of prematurely selecting a solution.

The final planning summary should identify:

1. Tickets created or updated.
2. Their dependency order.
3. Requirements already satisfied by existing code.
4. Any unresolved design choices.
5. The smallest useful milestone that enables the operator to begin collecting human calibration data.

The primary success criterion is a practical system that helps determine **whether the agent's communication is getting easier for its operator to understand**, with scores that are explainable, reproducible, and meaningfully aligned with human preferences.

