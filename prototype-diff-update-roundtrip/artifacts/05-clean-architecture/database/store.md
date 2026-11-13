---
type: unit
id: store
parent: database
selectors: [{"form":"path-prefix","value":"src/db"},{"form":"go-import-path","value":"internal/db"}]
declared_relationships: []
intended_api: []
---
# store

## Responsibility

Owns the remainder of database's scope after the new sub-units were carved out.

## Boundary

Everything in database not claimed by the sibling sub-units.

## Rationale

Strict partitioning: sub-units of database tile its scope as disjoint sets.

## Observed

- no outgoing dependency on another unit (coverage complete)
- owned files: 5
