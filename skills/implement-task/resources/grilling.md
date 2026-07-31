# Implement Task — Grilling Resource

Resolves a `type: grilling` task. This is a human-in-the-loop decision task.

## Process

1. Read the map destination, map, task question, dependencies, and existing
   decisions. Do not re-ask settled questions.
2. Ask exactly one focused question at a time.
3. Include a concrete recommended answer with every question.
4. Follow the decision tree: settle parent decisions before dependent choices.
5. After each answer, update the task body with the decision and its newly
   opened questions. Keep the map's `Decisions so far` index current.
6. Never answer for the user and never mark the task done while required human
   decisions remain.
7. When the question is settled, record the final decision, rejected options,
   constraints, and consequences for dependent tasks.
8. Create or request new tasks through Wayfinder when the answer exposes work
   that is precise enough to state.

## Completion evidence

The task must contain:

- the final decision in the user's terms;
- important alternatives considered;
- constraints and rationale;
- dependent-task implications;
- remaining fog or newly discovered work.

This resource does not write application code.
