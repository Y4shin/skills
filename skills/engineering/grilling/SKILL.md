---
name: grilling
description: Model-invoked, Pi-native reference for relentlessly stress-testing a plan, decision, or idea through focused questions.
---

# /grilling - shared-understanding decision interviews

Interview the user relentlessly until you reach a shared understanding. Map
this as a **design tree**: every decision branches into the decisions that
depend on it.

The goal is shared understanding, not a performance of questioning. Preserve
the user's decisions, expose trade-offs, and do not silently invent answers.

## Design tree and frontier

Work the tree in **rounds**. The **frontier** is every decision whose
prerequisites are already settled: the questions you can ask _now_ without
guessing at answers you have not heard yet. Ask the whole frontier in one
round: number each question and give your recommended answer. Then wait for
the user's answers before the next round.
A question that depends on another question still open in this round belongs
to a later round.

For every frontier question, be focused and provide a concrete recommended
answer. Do not answer on the user's behalf.

Format a round like this:

```text
❓ **Q1** - **<question title>**: <focused question and choices>

➡️ Recommended answer: <concrete recommendation and why>

---

❓ **Q2** - **<question title>**: <focused question and choices>

➡️ Recommended answer: <concrete recommendation and why>
```

Each round the user answers reshapes the tree: settled decisions push the
frontier outward and unblock questions that depended on them. Recompute the
frontier after each answer.

## Facts, ordering, and recording

Finding _facts_ is your job, never the user's. When a frontier question needs
a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to
find it; do not ask the user for anything you could look up yourself. Do not
block on it: a running exploration is an unsettled prerequisite, so only the
questions downstream of it wait for the sub-agent to report; ask the rest of
the frontier now. The _decisions_ are the user's: put each to them and wait.

Order questions by prerequisites: settle parent decisions before dependent
choices. After each round, record the user's answer in the relevant task or
planning artifact in the user's terms. Keep a decision index when the current
Wayfinder or task resource provides one. Preserve settled decisions; do not
re-ask them. For each settled decision, retain important rejected options,
trade-offs, constraints, rationale, and downstream consequences. If an answer
creates work precise enough to state, hand it off to wayfinder (for planning
decisions) or to-spec (for implementation decisions), not by duplicating task
routing here.

## Completion gate

Continue until the frontier is empty: every branch of the design tree has been
visited, every prerequisite is settled, and nothing remains silently assumed.
Then summarize the decision, alternatives, trade-offs, constraints, and
consequences and ask the user to confirm that shared understanding has been
reached. Do not act on the plan, mark a grilling task complete, or hand off
implementation until that explicit confirmation. Keep task-specific resources
as the operational adapters for their own artifacts and handoffs.
