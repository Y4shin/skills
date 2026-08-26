# Implement Task (feature human mode)

This resource is the human-owned feature pipeline. The feature router selects it
only for clear human/manual intent or after the user confirms an ambiguous
invocation. It is orchestration protocol, not an application-code pipeline.

## 1. Collaboratively approve the architecture

1. Read the task, its slices, and the shared architecture specification.
2. Present the proposed architecture, slice dependency order, seams, and
   interface contracts to the human; collaboratively review, discuss, and revise
   them together.
3. Do not transition to implementation until the human gives explicit consent before
   implementation (for example, “approve the architecture” or “proceed with
   implementation”).
   Record the agreed decisions in the architecture spec as appropriate.

No slice implementation or code may be written before the per-slice handoff;
no slice code, including tests, may be written before that handoff.

## 2. Handoff each slice to the human

Use `task_dependency_levels` and the task's `blocked_by` graph to process slices
in dependency order. Before each slice, present a handoff containing:

- the slice goal, current task context, dependencies, and non-code context;
- the agreed seams and a concrete verification contract; and
- the expected completion evidence and any known risks.

Ask for explicit consent to begin that slice. The human owns implementation:
do not write slice code or tests, create implementation commits, or silently
fix findings. After the handoff, provide code assistance only after an explicit request for
code assistance from the human, and keep assistance scoped to that request.

Wait for the human to report implementation complete before verification. Do
not mark the slice done or advance to another slice at this point.

## 3. Read-only, verifier-first verification

After the human's completion report, run the pre-landing chain in this order:

1. `slice-verifier` inspects the diff and runs the agreed tests/checks.
2. If it passes, `deviation-reporter` and `code-reviewer` inspect the result
   and report spec, scope, and quality findings.

Every verifier and reviewer is read-only: grant only repository read/inspection
and test-running tools. They must not edit source, tests, task documents, or
configuration, and they must not commit or invoke `land-worker`.

Use fast failure. If `slice-verifier` fails, stop immediately, present the
failure and evidence to the human, and do not invoke later verification,
landing, or progression. The human decides whether to revise the implementation
or request assistance and then requests another verification run.

## 4. Findings approval gate and separate landing

Present all verifier, deviation, and review findings to the human, including
commands and outcomes. Require explicit human approval before landing. Only
following that approval may `land-worker` run; landing is outside the
read-only chain and is the sole agent allowed to merge/archive/commit or change
state.

After landing, require explicit approval again before moving to the next slice.
Repeat the handoff, human implementation, verification, findings, and approval
gates for every slice. A verifier failure always returns promptly to the human
and never skips ahead.

## 5. Whole-task completion and collaborative refactoring

When all slices have landed, present the combined findings and task completion
evidence. Obtain explicit human approval before marking the task complete.
Then propose refactoring opportunities and discuss them with the human; do not
make whole-task refactoring autonomous. Apply refactoring only after explicit
consent to refactor, with the human participating in the resulting changes and
review.

Preserve the existing task state and finalization conventions. Autonomous
feature behavior remains in `resources/feature/autonomous.md` and is never
entered from this protocol without the router's mode decision.
