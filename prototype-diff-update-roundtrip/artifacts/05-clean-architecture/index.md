---
type: architecture
version: 1
described_commit: e6b9141b5a672b003cb429496eb6e69f47df1327
providers: [{"language":"typescript","provider":"native-ts","tier":"native-semantic","provider_version":"5.9.2","grammar_version":null,"inventory":{"in_scope":9,"owned":9,"unowned":0},"dependencies":{"references":5,"resolved":2,"unresolved":3}},{"language":"go","provider":"tree-sitter","tier":"exact-syntax","provider_version":"0.24.4","grammar_version":"go-v0.23.4","inventory":{"in_scope":2,"owned":2,"unowned":0},"dependencies":{"references":0,"resolved":0,"unresolved":0}}]
replacement_history: [{"from_commit":"d889302a20d18abe5f7fb16ffe7dc75c53d79ae2","to_commit":"e6b9141b5a672b003cb429496eb6e69f47df1327","at":"2026-11-13T16:25:18.037Z"}]
---
# Architecture

## Overview

Root units: the CLI reads through core, the database unit owns persistence with the new schema and replication modules, util holds trivia. The database unit still declares a dependency on core that no code uses.

## Diagram

```mermaid
%%{init: {"flowchart": {"nodeSpacing": 70, "rankSpacing": 110}}}%%
graph TD
  cli["cli"]
  core["core"]
  database["database"]
  util["util"]
  cli -->|"imports buildModel"| core
  database -.->|"[ND] imports fmt"| util
  cli -->|"[U] reads records"| database
  database -->|"[U] uses domain model"| core
  linkStyle 1 stroke:#c0392b
  linkStyle 2 stroke:#e67e22
  linkStyle 3 stroke:#e67e22
```

## Units

- cli
- core
  - core/model
- database
  - database/schema
  - database/store
- util
