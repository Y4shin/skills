---
name: grill-me
description: >
  Reusable interview discipline for task-workflow skills. Ask one question at a
  time. Always give a recommended answer with reasoning first, then ask. Drive
  toward clarity on the supplied agenda. Called by create-task, start-slice,
  and size-slices. Not invoked directly by the user.
---

# Grill Me — Interview discipline

## Protocol

1. Receive an agenda from the calling skill: a list of questions in dependency
   order.

2. For each question:
   a. If the answer is obvious from code/docs, answer it yourself and move on.
   b. Otherwise, state your recommended answer with reasoning.
   c. Ask the user: "Does this sound right? Any corrections?"
   d. Iterate until confirmed.

3. When all questions are answered, return the confirmed answers to the calling
   skill.

## Constraints
- One question at a time. Never ask multiple questions in one prompt.
- English only.
- If the user pushes back, adapt — don't defend the recommendation.

**Handoff:** Returns control to the calling skill with confirmed answers.