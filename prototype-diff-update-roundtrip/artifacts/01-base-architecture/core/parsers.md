---
type: unit
id: parsers
parent: core
selectors: [{"form":"path-prefix","value":"src/core/parsers"}]
declared_relationships: []
intended_api: ["parse"]
---
# parsers

## Responsibility

Parse raw input for the core domain model.

## Boundary

Only core/parsers output feeds the domain model.

## Rationale

Isolates input syntax from the domain model.

## Observed

- depends on database: 1 reference (src/core/parsers/index.ts:1, imports findRecords)
- owned files: 2
