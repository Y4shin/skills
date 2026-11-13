---
type: unit
id: cli
parent: 
selectors: [{"form":"path-prefix","value":"src/cli"}]
declared_relationships: [{"target":"database","kind":"depends-on","label":"reads records","note":"The CLI reads records through the database unit."}]
intended_api: ["main entry point"]
---
# cli

## Responsibility

Parse arguments and orchestrate one run.

## Boundary

No business logic, no direct storage access beyond declared dependencies.

## Rationale

A thin shell keeps the entry point replaceable.

## Relationship: database (depends-on)

The CLI reads records through the database unit.

## Observed

- depends on database: 1 reference (src/cli/main.ts:1, imports findRecords)
- owned files: 1
