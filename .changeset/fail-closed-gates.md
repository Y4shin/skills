---
"@y4shin/pi-task-workflow": patch
---

A checkout the guards cannot read refuses instead of passing. The three `git`
facts the resolver reads are taken in one call, and a failed read yields one
answer rather than a mixture of empty fields, so the openers refuse the phase,
the spawn block reports the guard it could not run, and the refusal names the
option that fits: the `flat` profile, for a directory that is not a git checkout
at all. Previously an unreadable checkout could read as "no branch required" and
let the phase open on a guess.
