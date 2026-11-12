---
type: task
subtype: research
title: Which libraries can extract the required TypeScript and Go architecture facts?
status: stable
workflow_state: done
blocked_by: []
---

## Precise question

Which maintained libraries and first-party toolchains can extract the architecture facts this effort needs from TypeScript and Go, and which combination should the `facts-provider` prototype implement and measure?

The required facts are:

- source files, packages or modules, and their paths;
- symbols with name, qualified name, kind, declaration location, and export or visibility status, including Go `internal/` reachability;
- imports and symbol bindings, with the importing file and package, imported symbol or alias, resolved source where provable, and source location;
- usage and reference sites with the containing file, function or method where available, so an architecture reader can tell which code uses or imports a symbol;
- package or module dependency edges and the evidence behind them;
- explicit unresolved items and analysis coverage, without name-matched guesses.

## Decision it unblocks

The exact alternatives, implementation approach, known-answer checks, and real-repository measurements in `facts-provider`. Its original candidate list is provisional until this research reports.

## Trusted source boundaries

Use primary sources: official language and toolchain documentation, official API references, library source repositories, released package metadata, and licenses. Inspect the two target repositories read-only where their module and build layouts affect feasibility:

- `/home/pplattner/Projects/skills` for TypeScript;
- `/home/pplattner/Projects/plai-api` for Go, as directed by the operator on 2026-11-12. This replaces the earlier Go repository choice for this effort.

Cover at least the TypeScript Compiler API, ts-morph where it adds useful capability, Go's `go/parser`, `go/ast`, `go/token`, `go/types` and `go/importer`, `golang.org/x/tools/go/packages`, relevant `x/tools/go/callgraph` options, `go list`, Tree-sitter, and CodeGraph. Add or drop candidates only from documented capability evidence. Do not treat a library's presence or popularity as proof that it can resolve the required facts.

## Evidence required

- A capability matrix by candidate and language covering every required fact above, with direct citations for material claims.
- Package and build-model findings for both real repositories, including TypeScript project references or module resolution concerns and Go modules, `internal/`, build tags, generated files, and test packages where relevant.
- For TypeScript, how to resolve import bindings and usage sites to declarations, and how to identify the containing function or method.
- For Go, how type checking, package loading, `internal/` visibility, selector resolution, and caller context work, including the cost and limitations of whole-program call graphs versus exact selector usage.
- Maintenance, license, runtime and packaging implications for a TypeScript Pi package, including whether Go analysis should be a Go helper process, a separately installed tool, or another supported integration.
- A recommended prototype design and two or three concrete alternatives, with known-answer fixtures and real-repository checks that discriminate between them.
- Confidence, unresolved questions, and any claims the prototype must verify rather than assume from documentation.

## Likely dependents

`facts-provider` first, then `architecture-schema`, `diff-update-roundtrip`, and `skill-surface`.

Research only. Do not modify application code, either target repository, or their Git state. Record a cited Markdown findings artifact and summarize its recommendation in the task notes.

## Notes

## Findings and recommendation, 2026-11-12

The complete cited findings document is stored at:

`/home/pplattner/.pi/agent/sessions/--home-pplattner-Projects-skills--/subagent-artifacts/outputs/e9c9c8b4-7701-4e70-aeea-db08bc1f09bf/extraction-libraries-findings.md`

### Decision input

Use two first-party extraction frontends behind one shared, versioned fact schema:

- TypeScript: the raw TypeScript Compiler API for programs, symbols, aliases, imports, visibility, and resolved declarations, plus the TypeScript language-service reference facilities for usage sites. Ancestor walks identify the containing function or method.
- Go: a small Go helper using `golang.org/x/tools/go/packages` with `go/types` and AST inspection. Extract package inventory, typed symbol definitions and uses, selectors, imports, callers, visibility, and errors. Compute `internal/` reachability from package paths and module layout, then cross-check loader behavior.

Do not use Tree-sitter as the primary binding extractor, CodeGraph as the correctness source, or a whole-program call graph for the first version. CodeGraph can be a read-only comparison source. Exact typed usage sites answer this effort's question without CHA over-approximation or RTA reachability limits.

The prototype must verify, rather than inherit as assumptions: the exact TypeScript reference API and alias behavior, TypeScript reference-run cost, the minimum useful `packages.Load` mode, Go load time on `plai-api`, generated and ignored-file coverage, and the internal-package negative fixture.

### Repository facts

- `skills` has one NodeNext source program under `tsconfig.json`; tests use a separate `tsconfig.test.json`.
- `plai-api/src` is the Go module. Research counted 109 packages with the local toolchain, about 70 generated files, and 18 build-tagged files concentrated in integration-test support. The count is a per-run baseline, not a constant.
- Distribution recommendation for the prototype is `go run` with an explicit Go-toolchain capability check. Prebuilt platform binaries remain a later packaging decision.

### Confidence and rejected alternatives

Confidence is high in the first-party type-based approaches and medium-high in Go helper packaging. Rejected as primary designs: CodeGraph-only extraction, parser or Tree-sitter-only extraction, and callgraph-first Go analysis. Their limitations and source citations are in the findings document.

### Dependent-task impact

`facts-provider` should implement the recommended two-frontends design and its known-answer fixtures, then measure both real repositories and report unresolved coverage. `architecture-schema` should require provider provenance, declaration and usage evidence, explicit resolution state, generated-file status, and per-program or per-package coverage.
