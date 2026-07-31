# Implement Task — Prototype Resource

Resolves a `type: prototype` task. A prototype is a cheap instrument for
answering one design or behavior question, not production implementation.

## Process

1. Read the task question, map, dependencies, project context, and ADRs.
2. State the question and the smallest artifact that can answer it.
3. Build the throwaway terminal, logic, or UI prototype requested by the task.
4. Exercise the alternatives and record what was learned. For UI work, make
   the alternatives easy to compare; for logic, include representative and
   edge-case scenarios.
5. Ask the user to react when the task is human-in-the-loop. Do not answer a
   HITL question on the user's behalf.
6. Preserve the decision-rich artifact or link to it, then record the chosen
   direction and its implications for dependent tasks.
7. Mark the task `done` only after the task question has an evidence-backed
   answer. Delete throwaway code unless the task explicitly says to keep it.

## Completion evidence

The result must contain:

- question and alternatives explored;
- prototype location or artifact link;
- observations from exercising it;
- chosen direction and rejected alternatives;
- consequences for dependent tasks;
- any newly discovered work for Wayfinder.

Do not quietly turn a prototype into production code. Production behavior is a
separate `type: feature` task.
