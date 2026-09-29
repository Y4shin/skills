# Implement Task (feature human mode)

This resource is the human-owned feature pipeline. The feature router selects it
only for clear human/manual intent, after the user confirms an ambiguous
invocation, or when a `mode: human` marker routes the re-invocation here. It is
orchestration protocol, not an application-code pipeline.

## 1. Collaboratively approve the architecture

1. Read the ticket, the effort's tickets, and the effort-root architecture
   specification (`docs/tasks/<effort>/arch-spec.md`).
2. Present the proposed architecture, ticket dependency order, seams, and
   interface contracts to the human; collaboratively review, discuss, and revise
   them together.
3. Do not transition to implementation until the human gives explicit consent before
   implementation (for example, "approve the architecture" or "proceed with
   implementation").
   Record the agreed decisions in the architecture spec as appropriate.

No ticket implementation or code may be written before the per-ticket handoff;
no ticket code, including tests, may be written before that handoff.

## 2. Handoff each ticket to the human

Use `tw_dependency_levels <effort-slug>` and the effort's `blocked_by` graph to
process tickets in dependency order. Before each ticket, present a handoff containing:

- the ticket goal, current effort context, dependencies, and non-code context;
- the agreed seams and a concrete verification contract; and
- the expected completion evidence and any known risks.

Ask for explicit consent to begin that ticket. The human owns implementation:
do not write ticket code or tests, create implementation commits, or silently
fix findings. After the per-ticket handoff, provide code assistance only after an explicit request for code
assistance from the human, and keep assistance scoped to that request.

Wait for the human to report implementation complete before verification. Do
not mark the ticket done or advance to another ticket at this point.

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
read-only chain and is the sole agent allowed to merge/commit or change state.

After landing, require explicit approval again before moving to the next ticket.
If findings or a landing request are rejected, stop at the current gate and return
control to the human rather than advancing. Repeat the handoff, human
implementation, verification, findings, and approval gates for every ticket. A
verifier failure always returns promptly to the human and never skips ahead.

## 5. Whole-effort completion and collaborative refactoring

When all tickets have landed, present the combined findings and effort completion
evidence. Obtain explicit human approval before declaring ticket completion for
the effort. Then propose refactoring opportunities and discuss them with the
human; do not make whole-effort refactoring autonomous. Apply refactoring only after explicit
consent to refactor, with the human participating in the resulting changes and
review.

Preserve the existing effort state and finalization conventions. Autonomous
feature behavior remains in `resources/feature/autonomous.md` and is never
entered from this protocol without the router's mode decision.
