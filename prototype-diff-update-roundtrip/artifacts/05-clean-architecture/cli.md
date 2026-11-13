---
type: unit
id: cli
parent: 
selectors: [{"form":"path-prefix","value":"src/cli"}]
declared_relationships: [{"target":"database","kind":"depends-on","label":"reads records","note":"The CLI reads records through the database unit."},{"target":"core","kind":"depends-on","label":"imports buildModel"}]
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

## Relationship: core (depends-on)

Depends on core.

## Observed

- depends on core/model: 1 reference (src/cli/main.ts:1, imports buildModel)
- owned files: 1
