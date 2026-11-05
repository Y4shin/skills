---
type: task
subtype: prototype
title: Can an owned tree-sitter layer supply the model's facts across five languages, with a durable cached index and no invented edges?
status: stable
workflow_state: ready
blocked_by: []
---

## Question

Can a tree-sitter layer this package owns produce the facts the unit model needs
across Go, Rust, TypeScript and JavaScript, Python and Java, with a durable index
and caching, and without inventing an edge it cannot prove?

## Why this task exists

The grilling settled CodeGraph as the only provider. Measurement since then
overturned the premise. On `pdl-bezahlbar-machen` (rebuilt with codegraph 1.6.2,
extraction 27) the graph carries no package or module node, resolves no import
path to a package, gives 0 visibility values for 3,933 Go nodes, and resolves
every cross-package call named `Get`, `Set` or `Write` to one of the three method
nodes that carry those names in the whole repository. That is 160 edges, 7 percent
of the cross-package call edges, into `internal/render/cache.go` and
`internal/media/serving.go`. The operator's conclusion: a tool that must be
installed separately has to be right, so CodeGraph does not earn its install.

The same measurement points at the design: the model's primary product, unit
ownership and unit-to-unit edges, is syntactic in every target language. Go's
import list is a complete dependency list because the compiler forbids unused
imports, and 195 internal imports there yield 64 exact package pairs against 97
pairs from symbol aggregation. Tree-sitter can produce that exactly. What it
cannot do is type a receiver, and that layer only supplies drill-down evidence.

## The artifact

A TypeScript CLI, built outside the package and named in the probe, that parses
with tree-sitter and emits per language:

- Symbols: name, qualified name, kind, file, owning unit, line range.
- Units: the package or module each file belongs to, and the run's language rule
  for deciding that.
- Visibility per symbol, with the language's own rule stated: Go capitalization
  and the `internal/` path rule; Rust `pub`, `pub(crate)`, `pub(super)`,
  `pub(in ...)`; Java `public`, `protected`, package-private, `private`; Python
  underscore convention and `__all__`; TypeScript `export` and `export default`.
- Reachability: for each symbol, the set of units that may reference it under
  that visibility rule.
- Unit edges: exact from syntax. Go import statements, Rust `use`, Python
  `import` and `from`, Java `import`, TypeScript import and re-export.
- Reference sites that resolve provably, meaning a binding the file's own imports
  or its own scope make certain, plus an explicit unresolved bucket carrying
  locations and the reason.
- Provenance: extraction and grammar versions on every record, so a result can be
  attributed to the tool that produced it.

Durable index and caching, since the workflow refreshes facts repeatedly: a
persisted index keyed by file content hash, incremental re-extraction of changed
files, a stated invalidation rule, and measured cold and warm timings.

## Corpora

- **Go**: `/home/patric/Projects/pdl-bezahlbar-machen`, 211 Go files in 28
  packages. Its `.codegraph` index may be read for comparison. Do not modify its
  tracked files.
- **TypeScript and JavaScript**: this repository.
- **Rust, Python, Java**: three small corpora built for this task, each with
  three units, at least one cross-unit reference, one exported and one private
  symbol, and one trap where a naive name match would invent an edge, for example
  two same-named methods on unrelated types in different modules.

## Alternatives worth comparing

1. WASM grammars shipped as npm dependencies, so nothing is installed by the user
   and Windows needs no build toolchain.
2. Native bindings, faster but a platform build cost this package has already
   paid once.
3. Tree-sitter for syntax plus one shell-out to `go list` for Go build-tag,
   cgo and generated-file accuracy. Recommended for Go, since a parser cannot
   see build tags and `go list` is present wherever the code builds.

## Evidence required

- A per-language table: files, units, symbols, visibility values, unit edges,
  provable reference sites, unresolved sites.
- Exactness checkpoints: Go internal package pairs must come out at 64; Go
  visibility must follow capitalization; `q.Set` on a `url.Values` and `w.Write`
  on an `http.ResponseWriter` must land in the unresolved bucket and never on
  `(*Cache).Set` or on media's `Write`.
- Cost: cold parse time, warm cached time, index size, and incremental re-index
  time after touching one file, per repository.
- Packaging risk: which npm packages are needed, whether they are WASM or native,
  what each grammar's ABI and maintenance look like.
- A verdict: which tiers each language reaches, and which languages are
  first-tier only.

## Who reacts

The operator, on the numbers. The decision it unblocks is the provider contract
in the map's non-negotiable facts, and whether CodeGraph remains as an optional
enrichment path.

## Unblocks

`codegraph-evidence`, whose measurements become this comparison's baseline;
`unit-model-schema`, which needs the selector and visibility semantics;
`views-and-facts-refresh`, which renders the coverage tiers; and
`check-enforcement`, which needs to know what a declared boundary can be checked
against.

## Kept artifact

The decision rests on measurements that must stay re-runnable, so keep the probe
and its three corpora at
`docs/tasks/architecture-tracking/tasks/tree-sitter-provider/probe/`. Nothing in
it ships in the package.

## Notes

## Location correction, 2026-11-05

The body above says the probe and its corpora live at
`docs/tasks/architecture-tracking/tasks/tree-sitter-provider/probe/`. That is not
possible: the `tool_call` guard blocks `write` and `edit` for every path under
`docs/tasks/`, so no agent can build inside the task directory. The body also
contradicts the repository's own convention, which keeps a throwaway prototype in
a gitignored directory and commits the findings rather than the code.

So the probe is built at `prototype-tree-sitter/` in the repository root, the
same pattern as the existing `prototype-bundle/`, and it is committed to a
throwaway branch `prototype/tree-sitter-provider`, pushed, with the pointer and
the measurements recorded here. Main keeps the record, not the code. Everything
else in the task stands: corpora, languages, checkpoints, index and caching,
bindings.

## Scope addendum, 2026-11-05 (operator)

The extractor must also record **symbol-level import bindings**: which symbols
are imported into where, not only which units import which units. The unit edge
says a dependency exists; the binding says which names cross it, and the model
needs the second to answer "who can call this" and to show evidence behind a
unit edge.

Per file, record every binding the source establishes:

- **Go**: an import binds a package name or alias, and the cross-boundary symbols
  are the exported identifiers selected through it. Record the package binding
  plus each selector actually used, with location.
- **TypeScript and JavaScript**: named imports, default imports, namespace
  imports, `export *` re-exports, `export { x as y }`, and dynamic `import()`
  where the specifier is a string literal. Record the local alias, the imported
  name, and the resolved unit and file.
- **Rust**: `use` paths, groups (`use a::{b, c}`), globs (`use a::*`), renames
  (`as`), and `pub use` re-exports, since a re-export changes who can reach the
  symbol.
- **Python**: `import x`, `import x as y`, `from m import a, b`, `from m import a
  as c`, and `from m import *`, with the caution that a star import is a
  provable binding of unknown extent and belongs in the unresolved bucket
  alongside its reason.
- **Java**: single-type imports, on-demand imports (`import a.b.*`), static
  imports, and the implicit binding every file in a package has to its own
  package's types.

Each binding carries its location, its local name, the imported name, the
resolved file and unit, and its resolution state. A specifier that cannot be
resolved is recorded unresolved with the reason, never dropped.

## Additional evidence for the same task

- A per-language table of bindings: count by kind (named, default, namespace,
  glob, wildcard, alias, re-export, static, on-demand), resolved against
  unresolved.
- Exactness checkpoints for bindings, alongside the ones already listed: a
  TypeScript namespace import must not attribute a symbol it never names; a Java
  on-demand import must not expand into every type of the package as if imported;
  a Go import must contribute only the selectors used in the file, not every
  exported symbol of the package.
- The distinction the model needs, stated once: a unit edge is a claim about
  dependency direction, a binding is a claim about which name crossed, and the
  two are computed from different facts and reported separately.
