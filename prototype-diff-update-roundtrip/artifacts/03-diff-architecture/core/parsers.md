---
type: unit
id: parsers
parent: core
selectors: [{"form":"path-prefix","value":"src/core/parsers"}]
declared_relationships: []
intended_api: ["parse"]
change: {"category":"removed","op":"removed-unit"}
---
# parsers

## Responsibility

Parse raw input for the core domain model.

## Boundary

Only core/parsers output feeds the domain model.

## Rationale

Isolates input syntax from the domain model.

## Observed

- no outgoing dependency on another unit (coverage complete)
- owned files: 0
