---
type: task
subtype: research
title: Does CodeGraph supply the inventory, visibility and references the unit model needs, in TypeScript and in Go?
status: stable
workflow_state: ready
blocked_by: []
---

## Question

What does CodeGraph 1.6.2 actually supply, and at what quality, for the four
inputs the model needs: a source inventory of an in-scope root, declarations
with language visibility, resolved references with locations, and the ability to
evaluate a source selector (a package path, a directory, a file glob) against
the index?

Answer it on two real trees: this repository (TypeScript, 62 files, 1431 nodes,
6365 edges already indexed at `.codegraph/codegraph.db`) and
`/home/patric/Projects/pdl-bezahlbar-machen` (Go, real packages and `internal/`
boundaries). Indexing pdl is permitted for this research; do not modify its
tracked files, and say so if an index has to be created there.

## The decision it unblocks

`unit-model-schema` (what a selector may say and what a unit file can promise)
and `views-and-facts-refresh` (what a view can honestly show). It also feeds
`check-enforcement`, which needs to know whether unit-level edges are derivable.

## Trusted source boundaries

The installed CLI and its type declarations
(`/nix/store/pxz968hvxdzd5ymb03ixwh4syrzbda5v-codegraph-1.6.2/lib/codegraph/lib/dist/types.d.ts`
is where the language, node-kind, edge-kind and visibility contracts live), the
CodeGraph project documentation, and the two trees themselves. Measure on the
trees; do not infer quality from documentation claims.

## Evidence required

- Inventory: can the index enumerate every file under a declared root, and does
  it include files with no declarations? Compare its file count against
  `git ls-files` for the same root.
- Visibility: which node kinds carry `visibility` and `isExported`, per
  language, and where it is absent it must be recorded as absent rather than
  guessed. Check a Go `internal/` package and an unexported Go identifier
  against the code.
- References: sample 10 cross-package references in Go and 10 cross-module
  references here, and state for each whether the index resolved it, resolved it
  to the wrong target, or dropped it. Report the resolution rate and the failure
  modes, with file and line evidence.
- Coverage separation: whether the index can distinguish "this scope has no
  dependencies" from "this scope was not analyzed". This decides whether the
  proposal's inventory-coverage versus dependency-coverage split is
  implementable.
- Selector evaluation: for a package selector, a directory selector and a glob,
  whether ownership coverage can be computed from the index alone or needs the
  filesystem.
- The interface a provider must expose, in a short shape that `to-spec` can turn
  into code.

## Likely dependents

`unit-model-schema`, `views-and-facts-refresh`, `check-enforcement`. If Go
resolution turns out weak, say so plainly: it changes what the Go exercise can
prove, and that is a decision for the operator, not a gap to paper over.
