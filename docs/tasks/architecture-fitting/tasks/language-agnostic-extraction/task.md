---
type: task
subtype: research
title: Which language-agnostic tools can provide an honest architecture-facts fallback?
status: stable
workflow_state: done
blocked_by: []
---

## Precise question

Which language-agnostic tools or tool families can supply a useful fallback when no language-native provider exists, and which promising candidate or candidates should a prototype exercise?

The fallback must degrade explicitly by evidence tier. It must never present textual or name-only matches as exact symbol bindings. Distinguish a genuinely shared parser or extractor from a language-neutral protocol that still needs a separate compiler, indexer, or language server per language.

## Decision it unblocks

Whether the provider gains a language-agnostic fallback, what facts and guarantees that fallback can supply, and the exact design of a follow-up prototype when at least one candidate is promising. The result also informs `architecture-schema` and the provider capability contract.

## Required fact axes

Evaluate each candidate for:

- file and language inventory;
- declarations with name, kind, qualified or containing name where available, and location;
- export and visibility information, or an explicit unknown state;
- imports and raw symbol bindings, with location and any provable resolution;
- identifier usages with containing declaration and explicit resolution state;
- package or module inference, clearly labelled when path-derived;
- grammar, indexer, and provider provenance plus analysis coverage;
- deployment, maintenance, license, grammar or indexer installation cost, and suitability for a TypeScript Pi package.

## Search breadth and source boundaries

Use primary documentation, first-party source repositories, protocol specifications, released packages, and licenses. Look beyond the two already rejected primary-provider candidates. Include relevant candidates from these families and add others discovered during research:

- Tree-sitter and its bindings or grammar ecosystem;
- CodeGraph;
- ast-grep and Semgrep;
- Universal Ctags and comparable multi-language declaration indexes;
- SCIP and LSIF, including available TypeScript, Go, and third-language indexers;
- LSP as a client protocol with language-specific servers;
- Sourcegraph stack graphs where applicable;
- CodeQL and its language databases;
- Kythe or comparable language-neutral cross-reference stores and pipelines;
- other maintained structural-search or code-intelligence tools that can realistically emit the required facts rather than only search text.

Do not treat a language-neutral output schema as language-agnostic extraction. Do not assume per-language semantic support exists because a protocol supports the required data model.

## Evidence required

- A broad candidate table with languages, extraction model, each required fact axis, evidence tier, runtime and packaging cost, maintenance, license, and primary citations.
- A clear separation between syntax-only fallbacks, semantic per-language frontends behind a shared protocol, and heavyweight indexing platforms.
- For Tree-sitter, ast-grep, and CodeGraph, an exact assessment of what an owned layer could add without per-language semantics. Identify what declaration, import, visibility, and containing-scope facts can be exact from syntax and what must remain unresolved.
- For SCIP, LSIF, LSP, CodeQL, Kythe, and stack graphs, identify which language-specific indexers or compilers exist and whether the combined design is a real fallback or another native-provider integration.
- A recommended fallback design if a candidate qualifies, with the minimum useful fact contract and an explicit degradation ladder from the existing native TypeScript and Go providers.
- If a candidate merits prototyping, a small cross-language fixture and known-answer checks using TypeScript, Go, and at least one additional language. The checks must separate exact syntax facts from unresolved semantics and include a same-name trap.
- If no candidate qualifies, document why and identify the smallest partial fallback still worth having.

Research only. Do not modify application code, target repositories, or Git state. Return a cited Markdown findings artifact and a concrete prototype recommendation.

## Notes

## Findings and recommendation, 2026-11-12

The complete cited findings document is:

`/home/pplattner/.pi/agent/sessions/--home-pplattner-Projects-skills--/subagent-artifacts/outputs/ef55fd1e-2394-4070-a4ff-3fd8a03d6546/language-agnostic-extraction-findings.md`

### Settled research result

A genuine language-agnostic fallback needs a shared syntax layer, not a language-neutral schema wrapped around per-language indexers. Use an owned Tree-sitter query layer, preferably through `web-tree-sitter` WASM, as the candidate for the required fallback.

The candidate fact contract has three evidence tiers:

- **E1:** exact typed facts from the existing native TypeScript and Go frontends.
- **E2:** exact syntax facts from Tree-sitter, including file inventory, declarations and ranges, containing scopes, export or visibility markers encoded directly in syntax, raw imports and aliases, and usage sites with unresolved binding state.
- **E3:** explicitly labelled path or convention inference, such as package identity and Go `internal/` reachability. Name-only matches never become provider facts.

Every cross-file symbol binding remains unresolved in the fallback. A native language server, SCIP indexer, CodeQL extractor, Kythe indexer, or LSIF indexer is another native-provider integration, not a language-agnostic fallback.

### Important alternatives rejected

- **ast-grep:** credible shared-parser alternative, but its search-rule model does not add a needed fact class. Keep as a prototype comparison only if it materially lowers cost.
- **SCIP, LSIF, and LSP:** shared protocols requiring per-language semantic frontends. LSIF's indexer fleet is also fading.
- **Stack graphs:** closest declarative-resolution design, but upstream is archived.
- **CodeQL and Kythe:** per-language extraction plus heavyweight infrastructure; CodeQL's CLI is proprietary.
- **Semgrep:** pattern-search product rather than a fact inventory, with Python runtime and licensing costs.
- **Universal Ctags:** optional declarations-only last resort, not a usage or import provider.
- **CodeGraph:** previous measured correctness and provenance failures rule it out as a fallback source of truth.

### Prototype decision

Prototype `web-tree-sitter` with TypeScript, Go, and Python grammars, shared schema and query layer, same-name traps, exact syntax assertions, explicit unresolved semantics, parse and installation measurements, and a Python third-language demonstration. The work is `language-agnostic-fallback`.

Confidence is high in the candidate taxonomy and medium-high in the per-language syntax-fact list pending fixture verification. Grammar WASM packaging, node-kind stability, throughput, and the value of narrow same-file resolution remain prototype questions.
