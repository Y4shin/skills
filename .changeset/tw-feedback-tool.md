---
"@y4shin/pi-task-workflow": minor
---

Add `tw_feedback`, the single labelled route from a workflow phase to the telemetry store.

Every skill and agent sent the model to pi-telemetry's `submit_feedback`
directly, so the workflow label lived only in prose: each block had to restate a
kind convention, and a caller could ignore it.

- `tw_feedback({ kind, data })` takes one of the pre-approved signals (`good`, `bad`, `friction`, `architecture`, `expected`) and a string or object payload, and runs pi-telemetry's `submit_feedback` through `ctx.executeTool`.
- The wrapper reads the installed `submit_feedback` parameter schema from `ctx.tools`. When it declares a `source` input, the call is `{ source: "workflow", kind, data }`; when it does not, the call is `{ kind: "workflow.<kind>", data }`. An unreadable or unlisted schema takes the prefix form, which both shapes accept.
- A refused nested call is surfaced with the store's reason instead of a silent success, and the install command is added when the store is not registered at all.
- `src/core/feedback.ts` holds the pure adaptation; `tests/feedback.test.ts` pins both shapes and the refusals, and `tests/integration/feedback.test.ts` proves the contract against a real session rather than a stub.

Every skill now calls `tw_feedback`, and so does every shipped agent, so the
label is applied in one place instead of restated in 26 blocks.

- All sixteen skill and resource blocks that described a feedback call now name `tw_feedback` with a bare kind, and the `workflow.<signal>` convention they carried is gone.
- All ten agents allowlist `submit_feedback` and `tw_feedback`. Both are needed: a nested call reaches only an active tool, and a child's allowlist is its whole active set. `code-reviewer` and `skill-reviewer` instructed a feedback call while allowlisting no tool for it; they now list both. A background child loads ambient extensions, which is what makes the gated wrapper reachable, and every shipped chain dispatches with `async: true`.
- The agent allowlist policy narrows rather than disappears: `tw_feedback` is the only gated `tw_*` tool an agent may name, because it writes telemetry rather than the tree, and an agent that names it must also name `submit_feedback`. `tests/skills.test.ts` pins both rules, and a corpus check fails any file that sends the model to `submit_feedback` for workflow feedback or gives kind guidance without naming `tw_feedback`.
