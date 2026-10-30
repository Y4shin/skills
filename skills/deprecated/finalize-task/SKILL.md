---
name: finalize-task
description: Compatibility redirect for the retired finalize-task workflow; the per-ticket close-out runs inline in implement-ticket, in the same autonomous run that lands the ticket.
disable-model-invocation: true
---

# Retired: Finalize Task

`finalize-task` is retired. Its per-ticket close-out (the CI gate, the
knowledge harvest, the changelog entry, the done-marking, the per-ticket
close-out, and the merge to main) runs inline in `implement-ticket`, in the
same autonomous run that lands the ticket; the human never waits to type a
close-out skill. The one-owner rule holds: that closing phase is still the
only thing that sets a ticket's `workflow_state: done`. The effort-level
holistic pass and the archive are `finalize-effort`.

Run:

```text
/skill:implement-ticket <effort-slug>
```

This file remains only so an old bookmark produces a useful migration
message; it is not included in the package's promoted skill set and ships
no docs page.
