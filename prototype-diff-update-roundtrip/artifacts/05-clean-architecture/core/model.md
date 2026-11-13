---
type: unit
id: model
parent: core
selectors: [{"form":"path-prefix","value":"src/core"}]
declared_relationships: []
intended_api: ["buildModel"]
---
# model

## Responsibility

The domain model types and builders.

## Boundary

Everything in core outside the parsers sub-unit.

## Rationale

The remaining scope of core once parsers was carved out.

## Observed

- no outgoing dependency on another unit (coverage complete)
- owned files: 1
