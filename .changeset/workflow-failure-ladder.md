---
"@y4shin/pi-task-workflow": minor
---

Add the `workflow-failure` skill: the escalation ladder a stuck run walks when the workflow misbehaves, a `tw_*` tool refuses, or a gate will not open. Four fixed rungs: act on the refusal's own `reason` and `legal_next`, reorient from the shipped internals reference or route to `task-workflow-doctor`, record the snag with `tw_feedback`, then stop and escalate with the five-part completion report that ends the run. Hand-editing the artifact tree, skipping a gate, and inventing a workaround are forbidden at every rung. The skill is model-invoked, registered in the promoted set, and ships its `resources/report.md`.
