---
type: unit
id: schema
parent: database
selectors: [{"form":"path-prefix","value":"src/db/schema"},{"form":"go-import-path","value":"internal/db/schema"}]
declared_relationships: []
intended_api: []
---
# schema

## Responsibility

Owns the schema module inside database.

## Boundary

Part of database; no direct consumers outside it.

## Rationale

A distinct module with its own set of files.

## Observed

- depends on util: 1 reference (src/db/schema/mapping.ts:1, imports fmt)
- owned files: 3
