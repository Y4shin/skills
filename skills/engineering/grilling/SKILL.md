---
name: grilling
description: Model-invoked, Pi-native reference for relentlessly stress-testing a plan, decision, or idea through focused questions.
---

# /grilling — shared-understanding decision interviews

Use this reusable, model-invoked skill when a user asks to grill, stress-test, or
make a plan/decision explicit. It is based on Matt Pocock's canonical grilling
skill: https://raw.githubusercontent.com/mattpocock/skills/refs/heads/main/skills/productivity/grilling/SKILL.md

The goal is shared understanding, not a performance of questioning. Preserve
the user's decisions, expose trade-offs, and do not silently invent answers.

## Design tree and frontier

Map the subject as a **design tree**: each decision branches into the decisions
that depend on it. Record the known facts, decisions, alternatives, rationale,
constraints, and downstream consequences as the conversation progresses.

Work in **rounds**. The **frontier** is every decision whose prerequisites are
already settled. Recompute it after each answer. Ask the whole currently
unblocked frontier in one round, rather than enforcing one question per
assistant turn. A question that depends on another question still open in this
round belongs to a later round.

For every frontier question, be focused and provide a concrete recommended
answer. Use Pi's `ask_user_question` interaction for decisions, with numbered
questions and choices where useful, then wait for the user's answers. Do not
answer on the user's behalf.

Format a round like this:

```text
❓ **Q1** — **<question title>**: <focused question and choices>

➡️ Recommended answer: <concrete recommendation and why>

---

❓ **Q2** — **<question title>**: <focused question and choices>

➡️ Recommended answer: <concrete recommendation and why>
```

## Facts, ordering, and recording

Finding facts is the agent's job, never the user's. When a question needs facts
from the repository or environment, inspect them with Pi's repository/task tools
(and use available architecture/navigation tools) before asking. Ask the user
only for decisions that cannot be looked up. Never guess a prerequisite fact.

Order questions by prerequisites: settle parent decisions before dependent
choices. After each round, record the user's answer in the relevant task or
planning artifact in the user's terms. Keep a decision index when the current
Wayfinder or task resource provides one. Preserve settled decisions; do not
re-ask them. For each settled decision, retain important rejected options,
trade-offs, constraints, rationale, and downstream consequences. If an answer
creates work precise enough to state, hand it off through Wayfinder's existing
task workflow rather than duplicating task routing here.

## Completion gate

Continue until the frontier is empty: every branch of the design tree has been
visited, every prerequisite is settled, and nothing remains silently assumed.
Then summarize the decision, alternatives, trade-offs, constraints, and
consequences and ask the user to confirm that shared understanding has been
reached. Do not act on the plan, mark a grilling task complete, or hand off
implementation until that explicit confirmation. Keep task-specific resources
as the operational adapters for their own artifacts and handoffs.
