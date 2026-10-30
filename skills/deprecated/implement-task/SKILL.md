---
name: implement-task
description: Compatibility redirect for the retired implement-task workflow; implement-ticket is the implementation phase and owns the ticket frontier, the chain dispatch, and the inlined per-ticket close-out.
disable-model-invocation: true
---

# Retired: Implement Task

`implement-task` is retired. The implementation phase is now
`implement-ticket`: the model-invoked skill that owns the ticket frontier,
the dependency-level loop, the per-ticket chain dispatch, the end-of-effort
pass, the failure toolbelt, and the inlined per-ticket close-out (CI gate,
knowledge harvest, changelog, done-marking, close-out, merge to main). Its
planning half is absorbed into `wayfinder`: the planning frontier
(research, prototype, grilling, manual) is Wayfinder's, worked in bounded
passes, and there is no separate planning-execution skill.

Run:

```text
/skill:implement-ticket <effort-slug>
```

This file remains only so an old bookmark produces a useful migration
message; it is not included in the package's promoted skill set and ships
no docs page.
