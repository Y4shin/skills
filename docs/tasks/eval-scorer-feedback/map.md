---
type: map
title: "Eval scorer feedback: implement the review of the operator-communication scoring harness"
status: stable
---
# Eval scorer feedback: implement the review of the operator-communication scoring harness

## Destination

The scorer and its fixtures implement every recommendation in the review at
`docs/tasks/eval-scorer-feedback/eval-feedback.md`, and the calibration suite
proves the ones that change scoring behaviour. Done means the operator can run
the harness on real messages and read, per dimension, a verdict, named issues
and evidence, plus a critical-failure list, with every result traceable to the
message, vocabulary, rubric, prompt, schema, model and dataset versions it
used.

## Constraints

- Scope is `evals/` plus `skills/productivity/operator-communication`. That
  skill's text is read by the judge and is not edited (see D2).
- The harness stays operator-only: absent from `package.json` `files`, absent
  from its `pi` block, and named by no skill.
- The annotation and mutation extension is loaded only by explicit
  `pi -e <path>`, is never registered with the package, and registers
  commands only. It must expose no model-callable tool.
- Corpus outputs, the spend ledger and real-session datasets live under
  `~/.pi/agent/evals/`. No real session excerpt is ever committed to the
  repository.
- Every model call records its token counts and cost to the ledger, including
  calls retried after truncation.
- Every scoring change ships with a calibration case that has a known answer,
  and the calibration suite passes before any run scores real messages.
- `npm test` and `npm run typecheck:evals` pass, including the repository's
  corpus checks over every file and the em-dash ban.
- The review's section 12 methodological constraints are inherited in full.

## Non-goals

- No UI beyond terminal prompts. The extension commands and plain line prompts
  are the whole interface; a richer front end is a later decision.
- No fine-tuning or training a judge, and no support for judge providers that
  do not speak the OpenAI chat-completions shape the harness already requires.

## Non-negotiable facts

**Success test:** every scoring behaviour the review changes is proven by a calibration case, and on held-out operator comparisons the new scorer predicts overall preference better than the current unweighted mean.

- The judge reads one skill file today, `GUIDE_PATH`
  (`skills/productivity/operator-communication/SKILL.md`), and that text stays
  unchanged. Every scoring rule the review changes therefore lives in the
  judge's purpose-built rubric, versioned separately from the doctrine.
- The session records carry only that a `CONTEXT.md` read happened and how many
  minutes before (`evals/lib/sessions.ts`). No file content is captured
  anywhere, so the review's section 1 extraction is new work against the
  stored transcripts, not a repair.
- `parseJudgement` today clamps every score into 0 to 4 and maps an
  unrecognised class to `answer`. Silent coercion is the failure mode the
  review forbids, so both become reported invalid output with an explicit
  retry.
- `evals/` is absent from `package.json` `files` and from its `pi` block, and
  outputs default to `~/.pi/agent/evals/`. Both stay true.
- `evals/fixtures/calibration.jsonl` holds eleven cases, each asserting bounds.
  They migrate explicitly with the schema change and remain regression tests.
- Window size, sample count, criterion order and judge model are configuration,
  not constants: review section 10 requires each result to name them.

## Decisions so far

Settled by the grilling task `settle-non-negotiables`, which carries the
rejected options and the reasoning in its notes.

- **D1 Annotation surface.** A pi extension loaded only with `pi -e`,
  commands only, never registered with the package and never exposing a
  model-callable tool. No CLI front end.
- **D2 Doctrine untouched.** The judge gets a purpose-built rubric; the
  `operator-communication` text is not edited, so the treatment variable stays
  constant.
- **D3 Scoring shape.** Three-level verdicts (`fails`, `stumbles`, `fine`, plus
  `not_assessable`) with named issue tags and per-dimension evidence, in a
  versioned schema.
- **D4 `needs_followup` replaced.** Missing information and comprehension
  barrier become two scored dimensions; operator clarification requests are
  observed events from the next turn, never the judge's prediction.
- **D5 Aggregation.** Profile, issue tags and a named critical-failure list. No
  overall score until the fitted scorer function exists.
- **D6 Storage.** Fixtures in `evals/fixtures` in the repo; real examples,
  mutations and annotations under `~/.pi/agent/evals/datasets/`. Real session
  data is never committed.
- **D7 Fitting in scope.** Overall-preference collection and the fitted scorer
  function land in the last phase, evaluated on held-out comparisons.
- **D8 Success test.** Recorded as the first line of `## Non-negotiable
  facts`.

## Fog


