---
kind: slice
slug: skill-rewire
title: "Rewire grilling SKILL.md + wayfinder grilling.md to drive the CLI end-to-end"
task: ../task.md
mode: hitl
status: todo
size: m
blocked_by:
- server-and-spa
---

# skill-rewire

## End-to-end behavior

The grilling skill prose is rewritten so the agent drives the CLI
end-to-end instead of using `ask_user_question`. The Wayfinder `grilling.md`
resource is updated to match. The skill launches the server at the start of a
grilling, maintains the graph + summary via `update` as rounds progress, reads
answers via `get`, signals re-renders via `refresh`, blocks on the user via
`wait`, and finalizes via `finalize`. Crucially, the skill prose NEVER mentions
`.grilling.json` or the temp dir path — it only ever references the `--state
<key>` handle. The state dir is registered as a Pi-protected path so Pi blocks
reads/writes into it even if the agent tries (D7h backstop).

This is a human-in-the-loop slice (mode: hitl) because rewriting skill prose
benefits from human review of the wording and the agent's round-by-round
behavior.

## Acceptance criteria

- `skills/grilling/SKILL.md` is rewritten to drive the CLI: `start` at
  beginning, `update add-question`/`add-edge`/`promote`/`set-summary` to build
  the graph and maintain the summary per round, `set-state in-round` +
  `refresh` to open a round, `wait round-done` to block on the user, `get` to
  read answers, recompute the frontier, and repeat; `set-state final-review` +
  `refresh` for the completion gate; `wait accepted`/`wait rejected`; `finalize`
  to emit the markdown and stop the server.
- The skill prose NEVER mentions `.grilling.json` or the real temp dir path;
  it only references the `--state <key>` handle returned by `start`.
- The skill preserves the grilling skill's core semantics: design tree,
  frontier, rounds, "facts are the agent's job," and the completion gate
  (confirm shared understanding). The CLI is the interaction mechanism, not a
  change to what grilling *is*.
- The 7-state machine and the final-review/accepted/rejected loop are reflected
  in the skill: the agent drives `final-review` for the completion gate, and
  on `rejected` resumes `in-round` to address the gap (per D9t).
- `skills/wayfinder/resources/grilling.md` is updated to match: a `type:
  grilling` task's execution now drives the CLI; the task body still states the
  decision, parent decisions, known choices, recommended answer, and
  downstream work.
- The real temp dir is registered as a Pi-protected path (via the extension in
  `src/pi.ts`) so reads/writes into it are blocked as a backstop to the skill's
  "don't touch the dir" instruction.
- The agent, following the rewritten skill, can run a full grilling using only
  the CLI surface (no `ask_user_question`).

## Test plan

### Seams
- The skill's round loop maps onto CLI calls: build → `refresh` → `wait` →
  `get` → recompute → next round.
- The completion gate maps onto `final-review` + `wait accepted`/`rejected` +
  `finalize`.
- The hiding contract: the skill text is grep-able for the absence of
  `.grilling.json` and temp-dir path references.

### Failure modes
- The skill mentions the hidden file or dir path → fails acceptance (grep must
  find nothing).
- The skill tells the agent to edit the JSON directly → fails acceptance (must
  use `update`).
- The skill omits the completion-gate confirmation → fails acceptance (must
  preserve the grilling core).
- Pi path protection not wired → the backstop is missing; fails acceptance.

### Scenarios
- Dry run: the agent reads the rewritten SKILL.md and, for a sample decision,
  emits the sequence of CLI calls it would make (no real execution) — a human
  verifies the sequence is correct and complete.
- A real small grilling (human + agent) using the rewritten skill: the agent
  drives the CLI, the human answers in the browser, the loop completes and
  `finalize` emits markdown. (This is a manual smoke test, not the automated
  eval — that's the next slice.)

### Edge cases
- The skill must handle the `rejected` path: on `rejected`, resume `in-round`
  to address the gap named in the rejection feedback, then re-reach
  `final-review`.
- The skill must handle `finalize` returning non-zero (coast not clear): report
  to the user what's unresolved and continue grilling.

## Constraints and dependencies

- D7h (hiding: not mentioned + path protection), D9t (rejected → in-round),
  D12 (skill rewire in scope).
- blocked_by: server-and-spa (the CLI + server + SPA must exist to rewire
  onto).
- mode: hitl because skill prose wording and the agent's round behavior benefit
  from human review.
- Does NOT include the eval harness — that's the next slice.
