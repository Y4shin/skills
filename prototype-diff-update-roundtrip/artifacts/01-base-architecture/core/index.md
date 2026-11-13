---
type: unit
id: core
parent: 
selectors: [{"form":"path-prefix","value":"src/core"}]
declared_relationships: []
intended_api: ["buildModel"]
---
# core

## Responsibility

Shared domain model and input handling.

## Boundary

No persistence, no CLI.

## Rationale

A shared vocabulary prevents duplicated record handling.

## Observed

- no outgoing dependency on another unit (coverage complete)
- no direct ownership: subdivided into core/model, core/parsers
- scope files: 3, owned by sub-units: 3, gaps: none

## Diagram

```mermaid
%%{init: {"flowchart": {"nodeSpacing": 70, "rankSpacing": 110}}}%%
graph TD
  core-model["core/model"]
  core-parsers["core/parsers"]
  database["database"]
  core-parsers -.->|"[ND] imports findRecords"| database
  linkStyle 0 stroke:#c0392b
```

