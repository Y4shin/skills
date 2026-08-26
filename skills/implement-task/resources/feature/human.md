# Implement Task (feature human mode)

Human/manual mode is selected by the feature router only after clear intent,
or after the user confirms an ambiguous invocation. Follow the approved
human-owned feature protocol:

- Collaboratively plan and review the architecture spec before implementation.
- Ask for explicit consent before each per-slice implementation handoff.
- Hand the slice to the human; do not write slice code or tests without an
  explicit request from the human.
- After implementation, run a verifier-first, read-only verification chain
  with fast failure. Verification agents may inspect and run tests, but must
  not edit source, tests, task documents, or configuration.
- Present findings and obtain explicit human approval before landing, moving to
  the next slice, or completing the task.
- Keep `land-worker` separate from verification and invoke it only after that
  approval. After all slices land, seek consent for collaborative refactoring.

This resource is orchestration prose, not an application-code pipeline.
