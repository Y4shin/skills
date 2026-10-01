# grilling

## What it does

`grilling` is the interview primitive: it stress-tests a plan, decision, or
idea through relentless, focused questioning until **shared understanding**
is reached. The model reaches for it automatically when a decision needs a
human, in wayfinder's mandatory opening grilling, in triage, and anywhere a
plan is about to be built on unexamined assumptions.

The mechanics:

- **Design tree**: every decision branches into the decisions that depend on
  it. The interview walks the tree in **rounds**.
- **Frontier**: each round asks every question whose prerequisites are
  already settled, numbered, each with a concrete **recommended answer**.
  Settled answers push the frontier outward and unblock dependents.
- **Facts versus decisions**: finding facts is the agent's job (it dispatches
  exploration rather than asking you what it could look up); the decisions
  are yours, each put to you explicitly, never answered on your behalf.
- **Recording**: answers land in the relevant task or planning artifact in
  your terms, preserving rejected options, trade-offs, and downstream
  consequences. Settled decisions are never re-asked.

The **completion gate**: the interview continues until the frontier is
empty, every branch visited, nothing left silently assumed. Only then does
it summarize and ask you to confirm shared understanding. It does not act on
the plan or mark work complete before that confirmation.

## When to reach for it

The model invokes it when a decision must be resolved through conversation:
before a map is created, before a spec hardens, before triage writes a
brief. You never need to type anything; when *you* want an interview with no
repo to write into, that is `/skill:grill-me`.

## Common questions

**Why does it answer several questions at once?**
Because the frontier is every currently-unblocked question: asking them
together, each with a recommended answer, is faster for you than one
question at a time, and each round recomputes what is askable next.

**Why is it always asking me for facts I think it should know?**
It should not. If it asks for something it could look up in the repo, that
is a defect in the round: facts are its job, decisions are yours.

**What happens to my answers?**
They are recorded in the planning artifacts in your terms, with the
trade-offs and rejected options preserved, so downstream skills (to-spec,
to-tickets) inherit the decision, not just its conclusion.

**When does it stop asking?**
When the frontier is empty and you confirm shared understanding. Premature
completion (ending while branches remain silently assumed) is the failure
mode the gate exists to prevent.

## It's working if

- Rounds carry the whole open frontier, numbered, each question focused with
  a concrete recommendation you can accept or override.
- The agent looked things up instead of asking you, and the questions you
  did get were genuine decisions.
- Settled decisions stay settled: no re-asking, no silent reinterpretation.
- The exit is an explicit confirmation of shared understanding, with
  alternatives, trade-offs, and consequences summarized first.
