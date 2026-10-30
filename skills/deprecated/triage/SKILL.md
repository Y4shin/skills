---
name: triage
description: Compatibility redirect for the retired triage workflow; intake is the single front door and every request becomes an effort.
disable-model-invocation: true
---

# Retired: Triage

Triage is retired. The front door is now `/skill:intake`: the single front
door that replaces triage. It runs bounded sanity checks, records the
intake facts, and always creates an effort (a map plus exactly one
non-negotiables grilling task through the named transition tools). Every
bug report becomes an effort with a `subtype: bug` implementation ticket
inside it; there is no parallel bug substrate and no rejection path.

Run:

```text
/skill:intake
```

This file remains only so an old bookmark produces a useful migration
message; it is not included in the package's promoted skill set and ships
no docs page.
