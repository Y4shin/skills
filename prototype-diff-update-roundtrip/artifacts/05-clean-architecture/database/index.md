---
type: unit
id: database
parent: 
selectors: [{"form":"path-prefix","value":"src/db"},{"form":"go-import-path","value":"internal/db"}]
declared_relationships: [{"target":"core","kind":"depends-on","label":"uses domain model","note":"The database layer may use the shared domain model."}]
intended_api: ["record store interface"]
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
  database-schema["database/schema"]
  database-store["database/store"]
  util["util"]
  database-schema -.->|"[ND] imports fmt"| util
  linkStyle 0 stroke:#c0392b
```
