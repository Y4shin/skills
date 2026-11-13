---
type: unit
id: core
parent: 
selectors: [{"form":"path-prefix","value":"src/core"}]
declared_relationships: []
intended_api: ["buildModel"]
change: {"category":"structural","records":[{"scope":"ownership","note":"owned code removed: src/core/parsers/index.ts, src/core/parsers/legacy.ts"},{"scope":"hierarchy","note":"lost sub-unit core/parsers"}]}
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
- scope files: 1, owned by sub-units: 1, gaps: none

## Diagram

```mermaid
%%{init: {"flowchart": {"nodeSpacing": 70, "rankSpacing": 110}}}%%
graph TD
  core-model["core/model"]
  core-parsers["core/parsers<br/>removed"]
  class core-parsers tier-removed
  classDef tier-fix-or-optimization fill:#e2e3e5
  classDef tier-feature fill:#fff3cd
  classDef tier-structural-import fill:#ffe5b4
  classDef tier-structural fill:#f8d7da
  classDef tier-new fill:#d1e7dd
  classDef tier-removed fill:#ced4da
```
