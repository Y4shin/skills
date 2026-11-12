---
"@y4shin/pi-task-workflow": minor
---

Split the extension's tool file into one module per tool family, so the entry
holds the wiring and a composition of seven spreads instead of 4501 lines and 40
tool definitions. No tool, argument schema, refusal text, disclosure set, or
bundled profile changed: the suite's surface pins prove it.

Alongside the split: the two generic shape guards moved to a module of their own
below both the core modules and the tool modules; the changeset writer's proposal
and write outcomes carry a `kind` discriminant instead of a type assertion at the
call site; and the top-level README's skill lists are ordered by a rule the suite
enforces, with a hyphen-insensitive collation so a reader sees the order the
documentation states.
