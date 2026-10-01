---
"task-workflow": minor
---

Add the `tw_resolve_uncertainty` tool: the uncertainty resolution is recorded through a scoped write-delete tool (writes the ticket's `.work/resolution.md`, deletes `.work/uncertainty.md`, refuses without an uncertainty file, rejects non-tickets and empty text), so a delegated orchestrator closes the uncertainty loop without generic write access. The feature resource's uncertainty flow calls it instead of raw write/delete.
