---
type: task
subtype: prototype
title: Can CodeGraph resolve cross-package references in a monorepo, and is multi-root cheap?
status: stable
workflow_state: ready
blocked_by: []
---

## Question

Does CodeGraph resolve references **between packages inside one monorepo**, and
is supporting multiple source roots cheap enough to build into the model?

This decides whether the repository settings schema allows one root or many.

## Alternatives worth comparing

1. One root, one exclude list (the default the operator chose).
2. Several roots, each with its own exclude list.
3. One root that is the repository root, filtered by excludes only.

## Smallest artifact that answers it

Three throwaway monorepos, kept outside this repository's tracked tree (a temp
directory is fine): one TypeScript with two or three workspace packages, one Rust
with a small Cargo workspace, one Go with a module containing two or three
packages that import each other. The packages hold one or two trivial functions
each; one package must reference a symbol in another so the edge is real. Index
each with `codegraph` and query the cross-package reference.

The question is not whether the tool starts. It is whether the cross-package edge
appears in the index, whether a per-root inventory can be produced, and whether
the per-language answers differ enough that multi-root becomes a per-language
problem.

## Who reacts

The operator decides whether multi-root enters v1, on the prototype's verdict.
The recommendation may differ per language, and saying so is a valid outcome.

## Unblocks

`unit-model-schema`, whose selector and settings decisions depend on it.
