# evals

Offline measurement of one thing: **is the message the agent hands back to you
readable?** Not whether the work was right. The judge cannot see the work, by
design.

Operator-only. Nothing here is loaded by pi, named by a skill, listed in
`package.json`, or published: `evals/` is absent from `files` and from `pi`,
so the agent cannot reach it on its own.

Node 24 runs the TypeScript directly. No build step.

## The question this answers, and the one it cannot

Judging your history tells you what the guide *was*, never what it could do.
Your corpus barely varies the guide: 72 of 2540 turn-ending messages carry it,
and they all carry the same 2060-character version. A cross-sectional score
across those is mostly a measurement of which model wrote the message and what
the run happened to contain.

That is what `regenerate.ts` is for. It holds a real run fixed, varies only the
guide, and asks the same model for the closing message again. Same task, same
model, one variable. Grade those outputs blind and you have an experiment.

So: `corpus.ts` and `score.ts` are the scout. `regenerate.ts` is the
instrument.

## Run it

```bash
# 1. build the corpus (deterministic, free, about a second)
node evals/corpus.ts                     # every top-level session
node evals/corpus.ts --project homelab-nix
node evals/corpus.ts --window 1          # sensitivity: 1 remembered message

# 2. calibrate the scorer before trusting it
node evals/calibrate.ts --model deepseek/deepseek-flash --samples 3

# 3. grade a sample
node evals/score.ts --model deepseek/deepseek-flash --limit 30 --classes report,answer
node evals/report.ts --by class

# 4. vary the guide on a fixed run
node evals/regenerate.ts --model deepseek/deepseek-flash \
  --session ~/.pi/agent/sessions/<project>/<session>.jsonl --line 231 --samples 3
node evals/score.ts --input ~/.pi/agent/evals/variants.jsonl --out ~/.pi/agent/evals/variant-scores.jsonl
node evals/report.ts --input ~/.pi/agent/evals/variant-scores.jsonl --by variant

# 5. watch the bill
node evals/spend.ts --by day
```

`--dry-run` on `score.ts` prints the exact prompts. `--dry-run` on
`regenerate.ts` prints the variant and history sizes without spending anything.

## What one sample is

One assistant message that ended a turn, plus the window you would have
remembered when reading it: the operator's own earlier messages and the
agent's earlier replies, stopping at 3 items or 20 minutes back, whichever
comes first. Tool traffic and reasoning are excluded, because you never saw
them. A judge given them grades the run instead of the message.

Each sample carries the treatment (`hasAddendum`, the guide's length and hash)
separately from the agent's context (`contextTokensAtStart`, whether
`CONTEXT.md` was read and how long ago). Those are different variables and the
analysis has to keep them apart.

## Three things that will mislead you if you forget them

**Run the calibration first.** `evals/fixtures/calibration.jsonl` holds 11
hand-written cases with known answers: one message per failure the guide
names, plus the clean counterpart of each. `calibrate.ts` grades them and exits
1 if any case misses. As of writing it passes 11/11 at three samples, but three
of those cases flip between samples, so the scorer is usable and noisy at the
margins. A rubric that has not been through this is a number generator.

**Treat a variant effect smaller than the sample noise as nothing.**
`report.ts` prints the median within-case standard deviation when you have
several samples per message. Compare any variant gap against that number.

**The replay is approximate.** `regenerate.ts` reassembles the system prompt
from the stored sections and preserves tool traffic, but it drops what the
transcript no longer carries. Variant-to-variant comparison is sound because
every arm gets the same approximation. Absolute comparison against the
original message is indicative only.

## Files

| file | what it does | model calls |
|---|---|---|
| `corpus.ts` | sessions to one row per turn-ending message | none |
| `calibrate.ts` | grades the fixture cases and checks the expectations | judge |
| `score.ts` | grades a corpus file | judge |
| `regenerate.ts` | regenerates a closing message under guide variants | generator |
| `report.ts` | distributions, spread, lowest-scoring messages | none |
| `spend.ts` | what the ledger says you spent | none |

Outputs land in `~/.pi/agent/evals/` by default, outside the repo: the corpus holds
transcripts, and this repo runs hygiene checks over its own files. Override the
directory with `--out <path>` or `EVAL_OUT_DIR`.

## Calibration cases

Each case in `evals/fixtures/calibration.jsonl` carries the message, the window
the operator would remember, and bounds on what the judge must say:

```json
{
  "id": "closed-snag-included",
  "note": "A snag the agent hit and closed in the next step.",
  "window": [],
  "text": "...",
  "expect": { "selection": { "max": 2 }, "needs_followup": false }
}
```

Write expectations as bounds, not exact scores. A judge that says 1 where you
expected 2 is not broken; a judge that says 4 on `terms_defined` for a wall of
undefined nouns is. Cases are synthetic on purpose: this repo is public, and
real transcripts carry work content.

Three rules for adding a case:

- Assert one failure at a time, so a miss tells you which rule broke.
- Include the window whenever the case turns on a term being already known.
  Without it you are testing the judge's guess at project vocabulary.
- Leave `class` out when the case sits on a boundary. `report` against `answer`
  is a labelling preference, not a quality signal.

## Choosing a model

`score.ts` and `regenerate.ts` resolve one model, in this order:

1. `--model <provider>/<id>`
2. `EVAL_MODEL` with `OPENAI_BASE_URL` and `OPENAI_API_KEY`
3. auto-detect from `~/.pi/agent/models-store.json` and `auth.json`, but only
   for providers pi already holds a key for and models on the
   `openai-completions` API. If more than one qualifies, the run stops and
   lists them instead of guessing, because the judge's family is a variable.

Override the paths with `PI_AGENT_DIR`, `PI_SESSIONS_DIR`, `PI_TELEMETRY_DB`.

## Spend

Every billed response is appended to `~/.pi/agent/evals/spend.jsonl` with its token
count and cost, priced from the model's entry in `models-store.json`. These
calls post to the provider directly, so they never appear in pi-telemetry's
`llm_requests`; this ledger is the only record.

Retried truncations are billed, and counted. A reasoning model that spends the
whole budget thinking returns an empty message, so the harness retries with a
larger budget. A run of 6 grades cost 9 calls for exactly that reason: raise
`--max-tokens` if retries are frequent.

## What the corpus leaves out

- **Subagent sessions.** They live deeper in the sessions tree
  (`<session>/<agent>/run-N/session.jsonl`), and their messages were written
  for another agent. Excluded unless you pass `--include-subagents`.
- **Acknowledgements under 200 characters.** They score as noise. Pass
  `--keep-acks` to include them.
- **Sessions that stored no system prompt.** 259 of 297 sessions in this
  machine's corpus. Their treatment is unknown and they cannot be used to
  compare guides, though their messages still score for profiling.
