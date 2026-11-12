---
type: task
subtype: grilling
title: Choose native precision now or one Tree-sitter-only provider path
status: stable
workflow_state: done
blocked_by: []
---

## Decision to settle

For the first implementation, should the architecture capability maintain native TypeScript and Go semantic providers alongside the Tree-sitter fallback, or use only the language-agnostic `web-tree-sitter` path for now?

## Parent evidence

`facts-provider` measured native TypeScript 5.x and Go frontends:

- exact symbol declarations, imports, resolved bindings and usages with containing functions;
- 30 passing known-answer assertions;
- zero unresolved TypeScript imports or diagnostics on `skills`;
- 109 of 109 Go baseline packages on `plai-api`, with zero type errors and zero `internal/` violations;
- Go warm load around 0.7 seconds and cold load 32.1 seconds;
- TypeScript references took about 13 seconds and 1.7 GB on the source program;
- distribution needs a pinned TypeScript 5.x runtime and a Go helper, with test and build-tag coverage limits;
- full evidence can be large, including 133 MB of Go usage JSON.

`language-agnostic-fallback` measured one Tree-sitter WASM syntax path:

- 28 passing checks across TypeScript, Go, and Python;
- exact declarations, syntax ranges, raw imports and aliases, containing scopes, and explicit unresolved symbol bindings;
- about 400 TypeScript and 650 Python parses per second;
- about 6.8 MB runtime and grammar footprint, with no compiler or native build toolchain;
- two real TypeScript files had parse errors under the pinned grammar;
- every cross-file binding remains unresolved, and language-specific syntax query maps are still needed;
- name matching invented 21 candidate edges, 9 demonstrably false, while the fallback emitted none.

Detailed evidence is in both planning tasks' Notes and their linked reports.

## Choices already known

1. **Tree-sitter only for now:** one extraction architecture and one reduced evidence tier everywhere. Defer native TypeScript and Go paths. This lowers implementation and distribution cost but gives up exact cross-file symbol and module resolution even where the prototypes proved it feasible.
2. **Hybrid now:** native TypeScript and Go semantic adapters plus Tree-sitter fallback for everything else. This preserves maximum measured precision at the cost of three adapters, a Go helper, and two runtime models.
3. **Staged hybrid:** Tree-sitter supplies the common baseline everywhere, with native TypeScript and Go invoked only when exact resolution is requested or needed for a specific review. This still requires native implementation now but avoids making it the default cost of every run.

The choice is not whether to keep the previously requested fallback. If native paths remain, Tree-sitter stays as the fallback. A Tree-sitter-only choice makes the fallback the sole provider for now.

## Recommended starting answer

Hybrid with one shared downstream architecture pipeline: Tree-sitter is the portable baseline and native TypeScript and Go are extraction adapters that enrich the same fact schema where semantic precision matters. Do not build separate fitting algorithms per language. The native paths already exist as evidence and resolve information that Tree-sitter cannot, while the fallback keeps other languages usable. If implementation simplicity is more important than exact symbol evidence in the first release, choose Tree-sitter only and explicitly reduce the acceptance contract rather than treating unresolved output as equivalent.

## Downstream consequences

`architecture-schema` must reflect the chosen evidence contract and provider-selection model. Acceptance, packaging, implementation slicing, and the user-visible confidence model all change with this decision. A Tree-sitter-only choice also supersedes the earlier full-provider acceptance assumptions for TypeScript and Go.

## Notes

## Shared-understanding confirmation, 2026-11-12

The operator explicitly confirmed the provider strategy:

- Production native TypeScript extraction is in scope now.
- Tree-sitter is the language-agnostic fallback for Go, Python, other supported grammars, and TypeScript when native extraction is unavailable or inappropriate.
- One shared fact pipeline and native-adapter contract feeds one fitting and diffing implementation. There are no language-specific architecture algorithms.
- A Go adapter test double proves provider integration and selection without claiming real Go semantic output.
- The real native Go adapter and helper-process distribution are deferred until the generic approach proves insufficient.
- Native semantic acceptance now covers TypeScript. Go and Python acceptance use the fallback's exact-syntax and E3 evidence contract.

Rejected alternatives: both native adapters in this effort, Tree-sitter-only despite the affordable TypeScript adapter, native infrastructure with no real TypeScript adapter, and implementing native adapters only as an on-demand second stage in this effort.

`architecture-schema` must reflect provider selection, synthetic test-double provenance, native-versus-fallback evidence, and the reduced Go acceptance contract.

## Round 2, 2026-11-12

The operator selected **TypeScript now, Go later**.

The first implementation will contain:

- one shared downstream architecture and fact pipeline;
- the native-adapter contract and provider-selection infrastructure;
- the production native TypeScript adapter;
- the Tree-sitter fallback for TypeScript when needed, Go, Python, and other supported grammars;
- a Go native-adapter test double that proves integration and selection without emitting purported semantic facts.

The real Go semantic adapter and its helper-process packaging are deferred. Go acceptance in this effort uses the explicitly partial Tree-sitter tier rather than native semantic parity. A future native Go adapter is conditional on the generic approach proving insufficient. The previous full-provider acceptance assumption for Go is superseded; the measured Go prototype remains evidence, not production scope.

## Round 1, 2026-11-12

The operator's decision rule is conditional on implementation effort:

- If both native paths are relatively cheap, implement the hybrid now.
- If one is materially easier, implement that one now and defer the other unless the generic approach proves insufficient.
- If both are complex, build the native-adapter infrastructure and test doubles without production native adapters.

No strategy is settled yet. Evidence supplied for the next round: the TypeScript and Go prototype extractors are similar in code size, but TypeScript productionization is smaller because it runs in-process with a pinned TypeScript 5.x dependency. Go adds helper-process packaging, toolchain capability detection or platform-binary distribution, cold-cache behavior, and a much larger result stream. TypeScript is therefore the easier native adapter; Go carries the larger production burden beyond the shared normalization and storage work.
