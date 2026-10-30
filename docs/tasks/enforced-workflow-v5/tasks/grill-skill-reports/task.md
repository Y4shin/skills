---
type: task
subtype: grilling
title: What a skill reports when it finishes
status: stable
workflow_state: done
blocked_by: []
---

# What a skill reports when it finishes

## Decision to settle

The report contract for every workflow skill: what the human is told when a
skill finishes its work, in what shape, at what level of detail, and where the
detail lives when it is needed. The recurring failure is that completion
reports read as a wall of execution-internal text: run ids, step receipts,
output references, harness counts, and workflow jargon, with the context
missing, so the human cannot tell what changed, what needs a decision, or what
to do next. The first concrete instance: after one implementation ticket's
chain finishes, the report describes the chain rather than telling the human
what is now true and what to run next.

## Parent decisions it depends on

None. It consumes the settled vocabulary (the specification, the architecture,
planning task, implementation ticket) but does not depend on another open
decision.

## Choices already known

- The audience: the human operator, who did not watch execution and cannot be
  assumed to hold the run ids, refs, or internal terms in their head. The
  executing agent is not the audience.
- What counts as actionable: what is now true that was not before (state
  changes), what needs a human decision, what is blocked or failed, and the
  exact next commands to run.
- What is noise when it is not asked for: subagent run ids, per-step receipts,
  raw output references, harness counts, tool-call detail, and workflow
  internals. Whether any of it may appear inline at all, or only behind a
  pointer.
- Where the detail lives: chat prose only, a report artifact, or prose that
  points at an artifact. Failure and escalation reports are in scope too, and
  they are the ones most likely to be walls of text.
- Whether the contract is one shared template every skill follows or a
  per-skill shape.
- Whether reports stay prose discipline (documented and reviewed) or become
  gated or checked somehow. Note that a final chat message is not a
  precondition-checkable artifact, so the enforcement pillar may not apply.
- Whether the vocabulary qualifier rule (planning task, implementation ticket,
  the specification, the architecture) applies to reports, and how it squares
  with plain, short prose.

## Recommended starting answer

One shared report contract, in this order, short:

1. What is now true: the state change and the artifacts that exist now.
2. What needs the human: decisions, approvals, or nothing.
3. What to run next: the exact commands, at most a few.
4. What is broken or blocked, with the smallest useful cause.
5. A single pointer to the detail artifact, if any.

The test for whether the report is good: the human can act on it without
reading anything else, and without asking what anything means. Executing-agent
detail is never inlined; it is a pointer. The contract covers normal
completion, refusals, failures, and escalations. It stays prose discipline
(documented in each skill and reviewed), because a chat message cannot be
gated the way a tool call can. Vocabulary qualifiers apply only where they
remove ambiguity, never as ceremony.

## Downstream work it may create

A shared report reference the skills point at; a report section in each of the
workflow skills; a review criterion in `code-review` or `skill-review`; the
effort's final documentation re-sync ticket; possibly a change to how the
per-ticket chain and end-of-effort workflows return their results to the
parent, if the parent's report currently can only mirror the chain's internals.

## Settled decisions

### Q1 - One shared contract for every workflow skill's completion report (settled)

- "Shared contract" means the fixed shape of the final report a workflow skill
  produces for the human when it finishes. The user confirmed that reading.
- One contract, applied by every workflow skill that ends a run with the human
  waiting: intake, wayfinder, each planning task, to-spec, to-tickets, ticket
  execution, and finalize-effort.
- Fixed order: (1) what is now true, (2) what needs the human, (3) what to run
  next, (4) what is broken or blocked, (5) one pointer to the detail. A skill
  may add at most one skill-specific line inside that order; it may not reorder
  or add sections.
- Language requirements (the user's addition): simplified technical English;
  compact, no yapping; never assume the reader knows what happened during the
  run. The report is written for someone who did not watch execution.
- Rejected: per-skill shapes. They would spread the same rules across nine files
  and drift again, exactly as the grilling resources did.

### Q2 - What must appear, and what must never appear inline (settled)

- Must appear: the state change in plain terms, the artifacts that exist now,
  anything the human must decide or approve (or the explicit word "nothing"),
  the exact next commands, and a cause for anything broken or blocked.
- Amendment: the cause is not limited to one line. One or two more sentences
  are allowed to explain what went wrong. The limit is on volume: no paragraphs,
  no tables of internals, no long enumerations.
- Never inline: subagent run ids, per-step receipts, output references, harness
  counts, tool-call detail, raw chain JSON, and workflow-internal terms the
  human did not introduce. All of it is reachable only through the single
  pointer.
- Applies to completion, refusal, failure, and escalation reports alike. In a
  failure, part 1 becomes "the ticket did not land and the tree is unchanged",
  and the escalation question is part 2.
- The concrete fields to keep out are the chain's `step` receipt and its `refs`,
  which is what leaks today.

### Q3 - The detail lives behind a pointer to existing artifacts (settled)

- The message points at durable artifacts that already exist: for a landed
  ticket, the ticket doc, the changelog entry, and the commit; for a planning
  task, its task file; for an effort, the map and the review artifact.
- No new per-run report artifact.
- Amendment: the report offers to expand. It states the compact cause and then
  offers more context on request, for example "requirement X failed: <one-line
  summary>. Say the word and I will detail it." The offer is an offer, never a
  dump.
- When a run produced no durable artifact (a refusal, or a failed chain that
  changed nothing), the message carries the cause and points at the failed
  run's output only if the human asks.

## Frontier for round 2

Q4 (where the shared contract physically lives), Q5 (enforcement), and Q6
(does the vocabulary qualifier rule apply to reports). All depend only on Q1
and Q3, so all three are in the next round.

### Q4 - No shared skill or shared file; shared rules, per-skill templates (settled)

- The user's ruling: no `reporting` skill and no single shared contract file.
  The report template is tuned individually for each skill that produces a
  report. The shared instructions (the order, the language rules, the noise
  rules) are kept inline in each skill or in a per-skill resource file.
- This amends Q1's "one shared contract": what is shared is the set of rules,
  not one canonical text or one canonical template. Each skill's report is tuned
  to the state that skill actually produces (a new effort, a landed ticket, a
  refusal, an effort finalize).
- Rejected: a model-invoked `reporting` skill (one more skill in the inventory,
  and a single template cannot be tuned per skill); a canonical section in
  `task-workflow-overview`; a shared reference file.
- Accepted consequence and risk: because the shared rules are duplicated in
  per-skill text with no canonical home, they can drift, and the compactness and
  noise rules have to be repeated in each place. The user accepted this in
  exchange for per-skill tuning and simplicity. Recorded as remaining fog, not
  re-litigated.

### Q5 - Enforcement is prose discipline only (settled)

- The report shape is stated in each skill's prose. No review criterion is added
  to `skill-review`, and there is no runtime gate. The user's ruling: adding a
  report review would overcomplicate the workflow and make it unnecessarily
  long.
- Consequence: nothing mechanically prevents a skill from emitting a wall of
  text. The only pressure is the prose and the human's correction. This is the
  accepted cost; the enforcement pillar does not reach a final chat message.

### Q6 - The vocabulary qualifiers apply to reports (settled)

- Reports are not exempt. Use the qualified nouns ("implementation ticket",
  "planning task", "the specification", "the architecture"). Compactness limits
  sentence count, not terminology.

## Frontier for round 3

Q7 (do the chain and end-of-effort return shapes change so the parent cannot
mirror internals) and Q8 (inlined in each skill, or a per-skill resource file).

### Q7 - The chain and end-of-effort return shapes do not change (settled)

- Leave `ticket-chain.js` and `end-of-effort.js` return shapes as they are. The
  chain keeps returning `ok`, `failed`, `error`, `step`, and `refs`.
- Reason: the failure toolbelt needs `step` and `refs` for diagnosis and for
  the retry's `args.extra` pointer, so they must stay in the machine contract. A
  pre-written `summary` field would give the parent a generic sentence to echo,
  which is the same wall of text with extra indirection.
- The report contract is what keeps `step` and `refs` out of the human-facing
  message, not a change to the machine contract.

### Q8 - Every report step is a per-skill resource file (settled)

- Every skill that produces a completion report gets its own report resource
  file (a per-skill `resources/report.md`), never an inlined block in the
  `SKILL.md`.
- Reason (the user's): progressive disclosure. Step-level detail that only
  becomes relevant at the end of the run would junk up the `SKILL.md` context
  window, and a `skill-review` pass over the rebuilt skills would flag the
  inlined block as a progressive-disclosure violation.
- Consequence: each reporting skill points at its own resource, so the skill
  surface gains one small file per reporting skill. This is an input to
  `grill-skill-surface`.

## Frontier empty

Q1 to Q8 are settled. No decision in this task remains open.

## Human confirmation

- The user confirmed the Q1 to Q8 summary as the shared understanding, including
  the reconciliation that the report rules are shared while the template is
  tuned per skill, and that every report step lives in a per-skill report
  resource file for progressive disclosure. The planning task is done on that
  basis.
