---
type: task
subtype: prototype
title: Can a Tree-sitter syntax provider deliver an honest cross-language fallback?
status: stable
workflow_state: done
blocked_by:
- language-agnostic-extraction
---

## Single design question

Can one owned Tree-sitter query layer over the WASM runtime provide useful exact-syntax architecture facts across TypeScript, Go, and Python, with no per-language semantic resolver and no name-matched bindings presented as fact?

## Research premise

`language-agnostic-extraction` found this to be the only credible genuinely shared fallback. SCIP, LSIF, LSP, CodeQL, Kythe, and similar protocols or platforms still need per-language indexers, compilers, or language servers. ast-grep is the nearest alternative but adds a search rule DSL without a stronger fact model. Stack graphs is archived.

The full research findings are `/home/pplattner/.pi/agent/sessions/--home-pplattner-Projects-skills--/subagent-artifacts/outputs/ef55fd1e-2394-4070-a4ff-3fd8a03d6546/language-agnostic-extraction-findings.md`.

## Alternatives worth comparing

1. `web-tree-sitter` plus one owned query and node-kind map per grammar, the recommended design.
2. `@ast-grep/napi` for the same fact emitter if it materially reduces implementation or packaging cost without weakening facts. Implement this only as a small comparison when useful.
3. A name-matching baseline used only to demonstrate the false cross-file edges that the fallback refuses, never as a production candidate.

## Smallest artifact

A throwaway CLI outside the production package, with TypeScript, Go, and Python fixtures and a shared JSON fact schema:

- files with language, grammar version, parse status, and provenance;
- declarations with name, kind, exact range, containing-scope chain, and visibility or explicit unknown;
- imports with raw specifiers, exact alias bindings, static or dynamic kind, and unresolved module resolution unless a labelled path rule proves it;
- usages with identifier role, containing declaration and scope, and `resolution: unresolved` rather than invented cross-file bindings;
- path-derived package records labelled `derivedFrom: path` and evidence tier `E3`;
- per-file and per-fact evidence tiers and an unresolved-events log with reasons.

Prefer `web-tree-sitter` 0.27.x and maintained TypeScript, Go, and Python grammars. Record how grammar WASM artifacts are obtained, their versions and licenses, installation footprint, and whether the design avoids a local compiler toolchain. If packaging assumptions fail, measure the smallest honest alternative rather than silently switching to native bindings.

## Known-answer checks

Exercise the research fixtures, including:

- TypeScript exported and unexported declarations, renamed re-exports, local same-name declarations and calls, unresolved imports, and dynamic imports.
- Go capitalization visibility, import aliases, path-derived `internal/` reachability labelled `E3`, same-name traps, and no interface-to-implementation claims.
- Python `__all__`, underscore conventions, import aliases, relative imports, path-derived packages, and same-name traps.
- In every language, prove that name matching would invent at least one edge that the fallback refuses.
- Include parse failure or unsupported syntax coverage and containing-scope checks.

Measure parse throughput on this TypeScript repository and a representative Python sample, plus grammar-install and output-size costs. Compare WASM with native runtime cost only if both are already practical to run without changing the production package.

## Who reacts

The operator reviews whether the reduced fact contract is useful enough for fitting and diffing, and whether the packaging cost is acceptable.

## Decision output and dependents

Record prototype location, fixture results, throughput and footprint, fact and evidence-tier limits, chosen runtime, and rejected alternatives. State whether this becomes the required fallback and what `architecture-schema` must make mandatory. Preserve a report and source archive, then remove the working prototype. Do not edit production code, target repositories, or Git state.

## Notes

## Prototype result, 2026-11-12

### Verdict

Adopt the owned Tree-sitter WASM query layer as the required **Tier B** language-agnostic fallback. Keep the native TypeScript and Go frontends as **Tier A**. The fallback provides exact syntax and explicitly labelled path inference, but no semantic parity and no cross-file symbol bindings.

The second worker timed out after completing the implementation and measurements but before producing its report. No further retry was made. The parent inspected the artifacts, independently reran the complete verifier, and wrote the report from the measured source and results.

The consolidated report is:

`/home/pplattner/.pi/agent/sessions/--home-pplattner-Projects-skills--/subagent-artifacts/outputs/581ac67e-4789-43d3-9688-dbb52e5a2a8e/language-agnostic-fallback-report.md`

The source, fixtures, and measured result JSON are archived without dependencies or grammar binaries at:

`/home/pplattner/.pi/agent/sessions/--home-pplattner-Projects-skills--/subagent-artifacts/outputs/581ac67e-4789-43d3-9688-dbb52e5a2a8e/language-agnostic-fallback-source.tar.gz`

The working prototype directory was removed after verification.

### Independent verification

- **28 known-answer checks passed, 0 failed** across TypeScript, Go, and Python.
- A name-matching baseline invented 21 candidate edges, with 9 demonstrably false. The fallback refused those bindings and emitted no cross-file symbol-resolution claims.
- TypeScript checks covered declarations, ranges, exports, re-export aliases, static and dynamic imports, unresolved modules, containing scopes, and same-name traps.
- Go checks covered visibility, package names, aliases, E3 `internal/` reachability, no interface-implementation claim, parse coverage, and same-name traps.
- Python checks covered `__all__`, aliases, relative imports, underscore convention tiers, packages, parse coverage, and same-name traps.

### Runtime and footprint

- `web-tree-sitter` 0.27.2, MIT.
- TypeScript grammar v0.23.2, Go grammar v0.25.0, and Python grammar v0.25.0, all MIT, from official release WASM artifacts with SHA-256 provenance.
- No compiler or native build toolchain was needed for the measured WASM path.
- Installed runtime dependencies occupied 4,686,123 bytes; the three grammar artifacts occupied 2,088,914 bytes, about 6.8 MB total.

### Real-source measurements

- 67 TypeScript files in this repository parsed in 161 to 171 ms, about 391 to 416 files per second. Two files had explicit parse errors: `src/core/art.ts` and `tests/gate-factory.test.ts`. These are real fallback coverage gaps.
- 200 Python standard-library files parsed in 292 to 317 ms, about 630 to 684 files per second, with zero parse errors.
- Full identifier usage output was large: about 13.8 MB for 67 TypeScript files and 5 MB for 50 Python files. Aggregation, pagination, or sampling is mandatory for the production design.

### Limits and dependent-task consequences

A new language still needs a versioned syntax query and node-kind adapter. Import aliases are exact syntax but target declarations remain unresolved. Dynamic module resolution, build constraints, generated-code semantics, interface dispatch, and implementation relationships are not inferred. Package paths and Go `internal/` reachability are E3. Visibility carries its rule and can be unknown.

`architecture-schema` must make evidence tier, producer and grammar provenance, resolution state and reasons, per-file parse coverage, and native-versus-fallback selection explicit. Raw imports, path-derived package edges, and semantic dependencies are separate fact classes. Empty results are invalid when analysis is partial. Full usage evidence needs aggregation or paging. The 28 checks and name-matching refusals form the minimum fallback regression contract.
