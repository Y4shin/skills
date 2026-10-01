---
"task-workflow": minor
---

implement-task: ship the per-ticket chain as a pre-canned workflow script (`scripts/ticket-chain.js`) gated by a new read-only `implement-preconditions` agent (`tools: read, submit_feedback`). The feature and bug resources launch it with `args` (effort, ticket, subtype, ticket and bug paths) instead of composing the chain inline, and the chain returns a structured `{ ok, failed, step, refs }` result; the gate refuses to launch any worker when the ticket doc does not exist, is human-owned, or does not match the dispatched subtype. Child tasks are composed from identity and pointers only: procedure lives in the agent definitions and the tdd / diagnosing-bugs skills, and `extra` carries pointers to runtime context (a recorded uncertainty resolution in the ticket's `.work/`, prior-attempt outputs) rather than caller-authored instructions. The call shapes are pinned by tests over the script and the agents.
