---
type: unit
id: database
parent: 
selectors: [{"form":"path-prefix","value":"src/db"},{"form":"go-import-path","value":"internal/db"}]
declared_relationships: [{"target":"core","kind":"depends-on","label":"uses domain model","note":"The database layer may use the shared domain model."}]
intended_api: ["record store interface"]
change: {"category":"structural","records":[{"scope":"ownership","note":"new code fits this unit's scope: internal/db/schema/schema.go, src/db/replication/config.ts, src/db/replication/replicator.ts, src/db/schema/mapping.ts, src/db/schema/types.ts"},{"scope":"ownership","note":"owned code removed: internal/db/legacy.go, src/db/legacy.ts"},{"scope":"hierarchy","note":"gained sub-unit database/schema"},{"scope":"hierarchy","note":"gained sub-unit database/store"}]}
---
# database

## Responsibility

Own persistence and querying of records, in TypeScript and Go.

## Boundary

No CLI parsing, no domain policy. Callers reach it through the record store interface.

## Rationale

One write path for records keeps replication and queries coherent.

## Relationship: core (depends-on)

The database layer may use the shared domain model.

## Observed

- no outgoing dependency on another unit (coverage complete)
- no direct ownership: subdivided into database/schema, database/store
- scope files: 8, owned by sub-units: 8, gaps: none

## Diagram

```mermaid
%%{init: {"flowchart": {"nodeSpacing": 70, "rankSpacing": 110}}}%%
graph TD
  database-schema["database/schema<br/>new"]
  class database-schema tier-new
  database-store["database/store<br/>new"]
  class database-store tier-new
  util["util"]
  database-schema -.->|"[ND] imports fmt"| util
  linkStyle 0 stroke:#c0392b
  classDef tier-fix-or-optimization fill:#e2e3e5
  classDef tier-feature fill:#fff3cd
  classDef tier-structural-import fill:#ffe5b4
  classDef tier-structural fill:#f8d7da
  classDef tier-new fill:#d1e7dd
  classDef tier-removed fill:#ced4da
```
