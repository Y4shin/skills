# Implement Task (bug human mode)

The bug router selects this protocol only for clear human/manual intent, or
when the human confirms an ambiguous invocation. This is an orchestration
resource: the human owns the fix and the existing autonomous bug path remains
unchanged.

## 1. Collaboratively reproduce and diagnose

1. Read the bug task, its reproduction evidence, slice documents, and the
   diagnosing-bugs/reproduction workflow. Do not send a bug through feature architecture
   planning.
2. Work with the human to make a diagnosis plan that records the reproduction
   steps, likely cause and competing hypotheses, regression seam, acceptance criteria,
   and implementation scope. Clarify incomplete or rejected plans
   and return to this review rather than proceeding.
3. Present the reproduction/diagnosis plan and ask for explicit human consent
   before implementation. A missing, ambiguous, or rejected consent is a hard
   stop; do not dispatch implementation or verification.

## 2. Human implementation handoff

After consent, hand each slice to the human with its diagnosis context,
non-code context, scope, and concrete verification contract. Do not write fix code
or tests before this handoff; no other repository edits are allowed. The human
implements the fix and reports completion. Code assistance (including writing
code or tests) requires an explicit request for code assistance and remains within
the agreed scope.

## 3. Read-only verifier-first fast-fail chain

After the human reports implementation complete, run this chain sequentially:

1. `slice-verifier` inspects the diff and runs the agreed reproduction,
   regression, and targeted tests first.
2. If it passes, use read-only review/deviation roles as appropriate to inspect
   scope and evidence.

Every verifier/reviewer receives only read/inspection and test-running tools.
They must not edit source, tests, task documents, or configuration, and must
not commit or invoke `land-worker`. This is a verifier-first, read-only,
fast-fail chain: if `slice-verifier` fails, stop immediately, return the
failure and command evidence to the human; return failure promptly and do not invoke later checks,
landing, or task progression. The human decides whether to revise and request
another verification run.

## 4. Findings approval and separate landing

Present all verifier and review findings, reproduction results, test commands,
and residual risks to the human. Require explicit human approval of the
findings and require explicit approval before landing, moving to the next slice,
or declaring task completion. Only after that approval may the separate `land-worker` run; it is
the sole role permitted to merge/archive/commit or change task state. Landing
must never be automatic or part of the read-only verifier chain.

Preserve the lean autonomous bug resource at
`resources/bug/autonomous.md`; this human protocol is entered only through the
bug router's mode decision.
