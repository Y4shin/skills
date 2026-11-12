---
type: task
subtype: prototype
title: Which extraction design provides trustworthy fitting facts on TypeScript and Go?
status: stable
workflow_state: done
blocked_by: []
---

## Question

Which extraction design can supply the source inventory, package or module mapping, ownership evidence, dependency edges, symbol bindings, visibility, and source locations needed for guided fitting and focused diffs on this TypeScript repository and the real Go repository, without presenting unresolved analysis as fact?

## Decision it unblocks

The provider contract behind `architecture-schema`, including which facts the schema can require, which must remain optional, and how inventory coverage and dependency coverage are reported.

## Baseline and alternatives

The related `architecture-tracking` effort recorded false cross-package Go reference edges, no Go visibility, and no package resolution from CodeGraph 1.6.2. Treat that as the baseline rather than repeating a five-language survey. Compare the smallest credible designs for this effort:

1. An owned syntax extractor using Tree-sitter, with exact import-based unit edges and an explicit unresolved bucket for references it cannot prove.
2. Language-native extraction, using the TypeScript compiler API and Go tooling such as `go list` and the Go parser.
3. A hybrid with one provider interface and language-specific exact extractors. CodeGraph may be evaluated as optional enrichment, not assumed correct because it exists.

## Smallest artifact

A throwaway local CLI and fixtures that run read-only against:

- this repository at `/home/pplattner/Projects/skills`;
- `/home/pplattner/Projects/pdl-bezahlbar-machen`, without modifying its tracked files or Git state.

Extract file and package inventories, declarations and visibility where available, import bindings and unit edges with locations, and a sample of provable symbol references. Record every unresolved item with a reason. Test at least one same-named symbol trap so name matching cannot invent an edge.

## Evidence required

- A side-by-side table for the alternatives: implementation cost, inventory coverage, dependency coverage, visibility, symbol evidence, unresolved reporting, and packaging implications.
- Exact known-answer checks on a small TypeScript fixture and a small Go fixture, including imports, aliases, visibility, and one deliberate same-name trap.
- Real-repository counts and sampled source evidence for both target repositories.
- A clear statement of what the provider cannot prove, including dynamic imports, generated files, build constraints, and unresolved references where applicable.
- A recommendation for the provider contract, with confidence and remaining limitations.

## Who reacts

The operator reacts to the measured trade-offs and the recommended provider contract.

## Likely dependents

`architecture-schema`, then `diff-update-roundtrip` and `skill-surface`.

Keep the prototype out of the production package and record its location and measurements in the planning task. Do not build production tooling in this task.

## Notes

## Prototype result, 2026-11-12

### Verdict

The research-derived design answers the task with high confidence for the two measured repositories. Use language-native, type-aware frontends behind one explicit fact schema. Do not use name matching, Tree-sitter alone, CodeGraph, or a whole-program call graph as the primary source of symbol bindings and usage evidence.

The full report is:

`/home/pplattner/.pi/agent/sessions/--home-pplattner-Projects-skills--/subagent-artifacts/outputs/f676ca1e-bbc3-4f5d-816e-13576ea6ca84/facts-provider-report.md`

The throwaway source and fixtures, excluding large generated fact files, binaries, and installed dependencies, are archived at:

`/home/pplattner/.pi/agent/sessions/--home-pplattner-Projects-skills--/subagent-artifacts/outputs/f676ca1e-bbc3-4f5d-816e-13576ea6ca84/prototype-architecture-facts-source.tar.gz`

The working prototype directory was removed after verification. Only the report and source archive remain.

### Verification independently rerun

- TypeScript known-answer fixtures: **17 passed, 0 failed**. Covered barrels, two-level re-exports, renamed re-exports, export visibility, nested containing methods and arrow functions, unresolved imports, dynamic imports, and same-name isolation.
- Go known-answer fixtures: **13 passed, 0 failed**. Covered exported and unexported symbols, allowed and forbidden `internal/` imports, exact selector usage, containing functions, ignored build-tagged files, generated files, partial type errors, and interface method versus concrete method identity.
- `skills`: 26 root source files, 475 declarations, 116 imports, 2,012 usages, zero unresolved imports, and zero diagnostics. The 13-second run peaked around 1.7 GB RSS. The separate test program did not change source facts.
- `plai-api/src`: 109 of 109 per-run baseline packages, 1,239 loaded source files, 16,491 declarations, 383,745 usages, 5,075 evidenced imports, 1,131 `internal/` edges with zero violations, and zero partial packages or type errors. Cold load was 32.1 seconds; warm load about 0.7 seconds and extraction about 0.45 seconds.
- Omitting `NeedDeps` produced identical root-package facts and avoided a measured 5.6-times heap increase.

### Technical decisions and corrections to research

- Ship or declare a dedicated TypeScript 5.x runtime dependency for the provider. This repository's installed TypeScript 7.0.2 does not expose the JS `createProgram`, checker, or language-service APIs used by the prototype.
- Use the TypeScript language service for reference sites, with absolute project roots. Normalize `node:` imports through ambient module symbols rather than calling them unresolved.
- Export status comes from the source file's exports map, not the nonexistent public `SymbolFlags.Export` assumed during research.
- Use `go/packages` with `NeedName|NeedFiles|NeedSyntax|NeedTypes|NeedTypesInfo|NeedImports|NeedModule`. Merge `go list -json` inventories for test, external-test, and ignored files. Compute Go `internal/` reachability from module and package paths and retain loader errors as evidence.
- Record interface usages as their exact static interface-method target. Concrete dynamic dispatch remains unknown unless a later, explicitly approximate callgraph layer supplies it.

### Limits the provider contract must expose

- Non-literal TypeScript dynamic imports are unresolved unless separately modeled.
- External package source files in a TypeScript program are coverage-reported but not extracted as target-root declarations.
- Default-tag Go analysis misses packages whose every file requires a build tag. One `pgtest` package demonstrated this coverage boundary.
- Go test and external-test files are inventoried but their declarations and usages were not extracted.
- Generated-file detection uses header and naming evidence and is heuristic.
- Multi-module workspaces were not tested.
- TypeScript per-declaration reference searches need caching or batching as projects grow.
- Full Go usage evidence produced 133 MB of JSON. The implementation needs aggregated counts plus sampled or paginated evidence rather than one mandatory in-memory architecture document.

### Consequences for dependents

`architecture-schema` can require located file and package inventories, declarations with visibility, import resolution and `internal/` reachability, exact usage sites with containing functions, provider and toolchain versions, and per-run coverage. It must also model generated and ignored files, partial analysis, static interface targets, and evidence pagination or sampling. The 30 fixture assertions form the minimum regression contract for the implementation provider.

## Research-derived execution brief, 2026-11-12

Implement the recommendation from `extraction-libraries`, not the earlier provisional Tree-sitter comparison:

- One shared JSON fact schema with explicit provider version, source state, declaration and usage locations, resolution state, generated-file status, and coverage records.
- A TypeScript frontend using the raw Compiler API for project loading, module and alias resolution, declarations, exports and imports, plus language-service reference queries for usages. Use AST ancestor walks for containing functions and methods.
- A Go helper using `golang.org/x/tools/go/packages`, `go/types`, and AST inspection. Record package loading and type errors, exact definitions and uses, selectors, containing functions, import evidence, exportedness, generated files, and ignored build-tagged files. Compute `internal/` reachability from module and package paths and test a rejected out-of-tree import.
- CodeGraph is at most a sampled comparison source. Tree-sitter-only and callgraph-first designs are rejected for this prototype.

Run the known-answer fixtures in the research findings, then measure `/home/pplattner/Projects/skills` and `/home/pplattner/Projects/plai-api/src`. Verify TypeScript reference behavior and cost, minimum practical `packages.Load` flags, Go package coverage against the per-run `go list ./...` baseline, and generated or ignored-file reporting. Report timings and every unresolved or partial-coverage class.

The research document is `/home/pplattner/.pi/agent/sessions/--home-pplattner-Projects-skills--/subagent-artifacts/outputs/e9c9c8b4-7701-4e70-aeea-db08bc1f09bf/extraction-libraries-findings.md`.

## Execution prerequisites updated by the operator, 2026-11-12

Run `extraction-libraries` first. Its documented findings must determine the candidates and implementation design this prototype attempts, superseding the provisional alternatives above where the evidence warrants.

Use `/home/pplattner/Projects/plai-api` as the real Go repository. This replaces `/home/pplattner/Projects/pdl-bezahlbar-machen` everywhere in this task. Keep `plai-api` read-only and do not change its Git state.

The prototype must include symbol-level usage and import evidence: importing or using file, containing function or method where available, imported or referenced symbol, resolved declaration, and source location. The research task defines the exact discriminating checks before implementation begins.
