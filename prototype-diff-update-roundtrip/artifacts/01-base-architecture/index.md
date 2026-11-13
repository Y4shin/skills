---
type: architecture
version: 1
described_commit: d889302a20d18abe5f7fb16ffe7dc75c53d79ae2
providers: [{"language":"typescript","provider":"native-ts","tier":"native-semantic","provider_version":"5.9.2","grammar_version":null,"inventory":{"in_scope":8,"owned":8,"unowned":null},"dependencies":{"references":3,"resolved":2,"unresolved":1}},{"language":"go","provider":"tree-sitter","tier":"exact-syntax","provider_version":"0.24.4","grammar_version":"go-v0.23.4","inventory":{"in_scope":2,"owned":2,"unowned":0},"dependencies":{"references":0,"resolved":0,"unresolved":0}}]
replacement_history: []
---
# Architecture

## Overview

Root units: the CLI reads through core, the database unit owns persistence, util holds trivia. The database unit declares a dependency on core that no code uses yet, and the core/parsers sub-unit reaches into the database unit undeclared.

## Diagram

```mermaid
%%{init: {"flowchart": {"nodeSpacing": 70, "rankSpacing": 110}}}%%
graph TD
  database["database"]
  cli["cli"]
  core["core"]
  util["util"]
  cli -->|"reads records"| database
  core -.->|"[ND] imports findRecords"| database
  database -->|"[U] uses domain model"| core
  linkStyle 1 stroke:#c0392b
  linkStyle 2 stroke:#e67e22
```

## Units

- database
- cli
- core
  - core/model
  - core/parsers
- util
