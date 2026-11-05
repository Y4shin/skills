---
type: task
subtype: research
title: Which existing tools can enforce a declared unit boundary, in Go and TypeScript?
status: stable
workflow_state: ready
blocked_by: []
---

## Question

Which existing, cross-language tools can enforce a unit-level dependency rule,
and what does "the unit file links to an executable check" mean concretely per
language?

The model does not generate checks in v1 (that decision is `check-enforcement`).
It declares intended relationships and dependency directions, and points at a
check that runs. This task establishes what that pointer points at.

## The decision it unblocks

`check-enforcement`, and the spec's shape for declared relationships. It also
bounds what the success test can promise: a boundary is enforced only when a real
tool expresses it.

## Trusted source boundaries

The tools' own documentation and released configuration schemas. Candidates worth
checking: `depguard` and `go-arch-lint` for Go, `eslint-plugin-boundaries` and
`dependency-cruiser` for TypeScript, `ArchUnit` and `jQAssistant` for Java,
`import-linter` and `pytest-archon` for Python, `cargo-deny` and `clippy`'s
`disallowed_*` lints for Rust. Drop any candidate that cannot express "unit A may
not import unit B" as a check that exits non-zero.

## Evidence required

- Per language: the tool, whether it can express a direction-specific rule, where
  the rule lives (a config file, an annotation, a source import), and the exact
  invocation that fails on a violation.
- Whether the rule can express unit boundaries as this model defines them (a set
  of source elements grouped by selector) rather than as filesystem directories.
  A Go package rule and a directory rule are not the same statement.
- Whether the tool can report a location, or only a file, because a finding
  without a location is weaker evidence in a view.
- The mapping from a declared relationship in unit front matter to a rule in the
  tool's own configuration, with one worked example in Go and one in TypeScript.
- Which of the two integration targets can express at least one real boundary
  today, and what the rule would be.

## Likely dependents

`check-enforcement`, and the spec's description of front-matter relationships.
Research only: do not add a checker to this repository or to pdl.
