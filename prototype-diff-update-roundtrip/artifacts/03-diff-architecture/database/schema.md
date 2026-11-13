---
type: unit
id: schema
parent: database
selectors: [{"form":"path-prefix","value":"src/db/schema"}]
declared_relationships: [{"target":"util","kind":"depends-on","label":"imports fmt"}]
intended_api: []
change: {"category":"new","op":"added-unit"}
---
# schema

## Responsibility

Owns the schema module inside database.

## Boundary

Part of database; no direct consumers outside it.

## Rationale

A distinct module with its own set of files.

## Relationship: util (depends-on)

Depends on util.

> Review note: proposed by the diff from the observed import; confirm or remove during review.

## Observed

- depends on util: 1 reference (src/db/schema/mapping.ts:1, imports fmt)
- owned files: 2
