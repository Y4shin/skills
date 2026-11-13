---
type: architecture
version: 1
described_commit: e6b9141b5a672b003cb429496eb6e69f47df1327
providers: [{"language":"typescript","provider":"native-ts","tier":"native-semantic","provider_version":"5.9.2","grammar_version":null,"inventory":{"in_scope":9,"owned":9,"unowned":0},"dependencies":{"references":5,"resolved":2,"unresolved":3}},{"language":"go","provider":"tree-sitter","tier":"exact-syntax","provider_version":"0.24.4","grammar_version":"go-v0.23.4","inventory":{"in_scope":2,"owned":2,"unowned":0},"dependencies":{"references":0,"resolved":0,"unresolved":0}}]
replacement_history: []
base_commit: d889302a20d18abe5f7fb16ffe7dc75c53d79ae2
proposals: [{"id":"promote-schema","unit":"database","note":"promote the new schema module (3 files) to a sub-unit of database","status":"open"},{"id":"partition-store","unit":"database","note":"strict partitioning requires a rest sub-unit for the remainder of database's scope (proposed as database/store)","status":"open"},{"id":"merge-core-into-database","note":"cli now depends on core and database; consider merging core into database to simplify the dependency graph","status":"open"}]
---
# Architecture

## Overview

Root units: the CLI reads through core, the database unit owns persistence with the new schema and replication modules, util holds trivia. The database unit still declares a dependency on core that no code uses.

## Diagram

```mermaid
%%{init: {"flowchart": {"nodeSpacing": 70, "rankSpacing": 110}}}%%
graph TD
  cli["cli<br/>structural-import"]
  class cli tier-structural-import
  core["core<br/>structural"]
  class core tier-structural
  database["database<br/>structural"]
  class database tier-structural
  util["util"]
  cli -->|"imports buildModel"| core
  database -->|"imports fmt"| util
  cli -->|"[U] reads records"| database
  database -->|"[U] uses domain model"| core
  linkStyle 2 stroke:#e67e22
  linkStyle 3 stroke:#e67e22
  classDef tier-fix-or-optimization fill:#e2e3e5
  classDef tier-feature fill:#fff3cd
  classDef tier-structural-import fill:#ffe5b4
  classDef tier-structural fill:#f8d7da
  classDef tier-new fill:#d1e7dd
  classDef tier-removed fill:#ced4da
```

## Units

- cli [structural-import]
- core [structural]
  - core/model
  - core/parsers [removed]
- database [structural]
  - database/schema [new]
  - database/store [new]
- util

## Diff summary

- base commit: d889302a20d18abe5f7fb16ffe7dc75c53d79ae2
- head commit: e6b9141b5a672b003cb429496eb6e69f47df1327
- tiers: cli=structural-import, core=structural, core/model=unchanged, core/parsers=removed, database=structural, util=unchanged, database/schema=new, database/store=new
- open proposals: promote-schema, partition-store, merge-core-into-database
