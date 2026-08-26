# Implement Task (bug human mode)

Human/manual mode is selected by the bug router only after clear intent, or
after the user confirms an ambiguous invocation. Follow the approved
human-owned bug protocol:

- Collaboratively plan reproduction and diagnosis before implementation; do
  not force a bug through feature architecture-spec planning.
- Ask for explicit consent before the implementation handoff.
- Hand the fix to the human; do not write fix code or tests without an explicit
  request from the human.
- After implementation, run a verifier-first, read-only verification chain
  with fast failure. Verification agents may inspect and run tests, but must
  not edit source, tests, task documents, or configuration.
- Present findings and obtain explicit human approval before landing or
  completing the task.
- Keep `land-worker` separate from verification and invoke it only after that
  approval.

This resource is orchestration prose, not an application-code pipeline.
