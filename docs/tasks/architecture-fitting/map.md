---
type: map
title: Standalone architecture fitting and git-diff updating
status: stable
---
# Standalone architecture fitting and git-diff updating

## Destination

A standalone, reusable architecture capability, exposed through a user-facing skill and supporting tools, that fits a reviewed unit and sub-unit architecture over an unfamiliar codebase, produces a full architecture diff between the recorded base commit and current `HEAD`, and turns that reviewed diff into a clean authoritative update. Static analysis grounds source ownership and relationships in evidence. The user can inspect architectural changes without rereading the whole model, and agents can reuse the core architecture instructions and logic independently of the user-facing input and output flow.

## Constraints

- Every architecture records the commit of the code it describes. All three operations analyze clean `HEAD`; a dirty working tree requires analysis in a detached worktree at `HEAD`, never analysis of the uncommitted state.
- No canonical architecture location is enforced. Fit asks before writing and suggests `${REPO_ROOT}/docs/architecture/`; destinations outside the repository are supported. Diff and update always ask where to source the comparison architecture from.
- Diff requires a valid base commit in the source architecture and refuses to guess one.
- Fit is guided: static analysis proposes units, sub-units, ownership, and relationships, and the user reviews and corrects the proposal before the final write.
- Diff preserves the fitted architecture and its assignments, refreshes tool-derived facts, and makes localized changes where needed. Broader redesign requires operator agreement.
- Update consumes the complete reviewed diff and removes its review markup without consulting the old architecture or repeating architectural interpretation.
- The source architecture stays unchanged unless the user explicitly confirms replacement.
- The core logic, instructions, and prose are reusable independently of the user-facing skill.
- Native semantic acceptance covers this TypeScript repository. Go and Python acceptance use the Tree-sitter fallback with exact-syntax and E3 evidence; no semantic-parity claim is made.
- The implementation has one shared fact and architecture pipeline, a native-adapter contract, a production TypeScript adapter, and a Go adapter test double. The real native Go adapter is deferred.
- The live `architecture-tracking` effort remains unchanged by this effort.
- Package changes must keep skill registration, README references, human-facing docs, and workflow routing in sync, with no em-dashes in prose.

## Non-goals

- Changing, completing, or superseding the live `architecture-tracking` effort in this effort.
- Integrating the architecture model into Wayfinder, ticket close-out, effort finalization, CI gates, or refactoring-pressure tracking.
- Retiring or replacing `codebase-design`, `improve-codebase-architecture`, or their supporting agents in this effort.
- Analyzing uncommitted working-tree states, fingerprinting dirty state, or creating snapshot commits for it.
- The real native Go adapter, its helper-process or binary distribution, and native Go acceptance in this effort. It returns only if the generic approach proves insufficient.
- Claiming native semantic parity for the language-agnostic fallback, or claiming full-provider validation for an unmeasured language.
- Language-specific fitting or diffing algorithms. Only extraction adapters vary by language.
- Fully automatic fitting without user review, or broad architectural reinterpretation during diff or update without operator agreement.
- Enforcing one canonical architecture storage location.

## Non-negotiable facts

**Success test:** on this TypeScript repository, a user can fit a reviewed architecture using native semantic evidence; on that repository, a real Go repository, and at least one additional language, the same pipeline can also use Tree-sitter fallback evidence with explicit limits. In each case the user can generate a complete highlighted architecture from its recorded base commit to current `HEAD` and turn that reviewed copy into a clean authoritative update without architectural reinterpretation, with every result naming its code commit and the source unchanged until explicit confirmation.

- Fit includes architectural units and sub-units, source ownership, responsibilities and boundaries, relationships, and evidence derived through static analysis. The user reviews and corrects the proposed model before the final write.
- Diff is a complete updated architecture, not merely a change report. Changes are highlighted beside the affected architecture, with change notes where useful.
- Update consumes only the reviewed diff architecture and produces the same model without diff annotations or change-only notes. It does not require the old architecture or another analysis pass.
- Existing fitted assignments remain stable unless the reviewed change records a localized adjustment or the operator agrees to broader rethinking. Authorship by an agent does not make an assignment less stable.
- Tool-derived code facts are refreshed during fitting and diff. Analysis gaps and unresolved evidence are reported rather than presented as certain architecture.
- The production TypeScript adapter provides exact semantic declarations, imports, symbol bindings, usages, and containing functions within its measured coverage. TypeScript 5.x is a provider dependency, independent of the target repository's compiler version.
- Tree-sitter supplies the strongest facts it can prove without a language-native frontend. Every declaration, import, usage, visibility, and resolution claim carries its evidence tier; unknown semantics remain unknown, and fallback output is visibly distinguishable from native-provider output.
- Provider selection and native-adapter integration are tested with explicit provenance and a Go test double. Synthetic test-double facts are never presented as real Go analysis.
- The architecture's code commit is always explicit. Clean `HEAD` is the analyzed target, including when a detached worktree is needed to isolate it from dirty files.
- Fit asks for the destination and suggests `${REPO_ROOT}/docs/architecture/`; diff and update always ask for the source. Writing outside the repository is supported.
- Replacing the authoritative source requires explicit confirmation. Until then, the source remains untouched.
- Other skills can reuse the core architecture instructions and logic without passing through the user-facing skill's input and output wiring.

## Decisions so far

- `non-negotiables` settled three operations: fit creates a reviewed architecture, diff creates a complete updated copy with highlights and useful change notes, and update removes that review markup to create the clean authoritative copy without reinterpretation.
- All operations analyze clean `HEAD`, using a detached worktree when necessary. Diff compares the source architecture's base commit to current `HEAD`; dirty working-tree states are not represented.
- Existing fitted assignments remain stable whether a human or an agent authored them. Tool-derived facts refresh, localized changes are allowed, and broader redesign requires operator agreement.
- Guided fitting, explicit output selection, explicit authority handoff, independently reusable core logic, and a language-agnostic fallback are mandatory. The operator added the fallback requirement after the initial acceptance discussion.
- `extraction-libraries` compared language-native and shared-protocol candidates and grounded the two prototype paths in primary-source evidence.
- `facts-provider` validated native TypeScript and Go extraction with 30 passing known-answer assertions and real-repository measurements. It established that TypeScript is the smaller production adapter, while Go adds helper packaging, toolchain detection, cold-cache behavior, and large result streams.
- `language-agnostic-extraction` found that an owned Tree-sitter query layer is the only credible genuinely shared fallback. SCIP, LSIF, LSP, CodeQL, Kythe, and similar options require per-language semantic frontends or heavyweight infrastructure.
- `language-agnostic-fallback` validated the Tree-sitter WASM design with 28 passing checks across TypeScript, Go, and Python. It provides exact syntax and E3 path inference, unresolved cross-file symbols, explicit grammar provenance and parse gaps, and needs paged or aggregated usage evidence.
- `provider-strategy` selected production native TypeScript now plus Tree-sitter fallback for Go, Python, and other languages, through one shared fact and architecture pipeline. The native-adapter infrastructure includes a Go test double, while the real native Go adapter and helper distribution are deferred until the generic approach proves insufficient. Native semantic acceptance is TypeScript-only; Go and Python accept the explicitly reduced fallback contract.
- `architecture-schema` settled the portable architecture document format: a root index plus unit nodes where a node with children is a directory with an index file, a leaf is a plain file, and a childless root AU may also be a plain file next to the root index; free-form slug identity with children referencing parents by ID and renames as explicit authored edits; form-tagged selectors preferring language-specific identifiers where the tooling yields them (Go import path prefixes, Python dotted module paths, TypeScript path prefixes) under exactly one most-specific owner per in-scope source element, child scope inside parent scope, disjoint siblings, and fully covered subdivided parents; authored intent in fixed prose headers (Responsibility, Boundary, Rationale, one section per declared relationship) kept separate from generated sections (observed edges with provider, tier, and sample evidence, the coverage statement, the mermaid), with raw usage evidence recomputed and never stored; root provenance and coverage records where an absent edge is a claim only when coverage says complete; diagrams style observed-but-undeclared edges (side channels) red as errors and declared-but-unobserved edges (unused permissions) yellow or orange as warnings; a diff architecture is a complete self-contained copy with per-unit change records whose categories form a strict hierarchy from lowest to highest, fix or optimization, feature, structural-import, structural, new, removed, each unit taking its highest tier; update validates and strips the change layer on whole-diff operator confirmation, sets the new described commit, and appends a replacement history entry to the root index.
- `diff-update-roundtrip` validated the roundtrip end to end with a throwaway fixture and 16 passing checks (prototype captured on branch `prototype/diff-update-roundtrip`): inline structured change records in the complete self-contained copy are the right representation, with a diff-only root proposals key (open, accepted, deferred; update refuses open ones), strippable `> Review note:` marker lines, tier-colored mermaid with change classes as second lines, and update as validate-and-strip only. The operator's three review rounds amended the schema: fully qualified unit names everywhere (`core/parsers`); strict partitioning, where a subdivided AU owns nothing directly and its sub-AUs tile its scope as disjoint sets, shown in each subdivided unit's Observed section (children, scope files, gaps); diagrams with spacing, few-word edge labels (declared relationships carry an authored `label`; `[U]` edges name what should have been, `[ND]` edges what actually is), all quoted because mermaid rejects unquoted multi-word labels; and every produced mermaid must pass a real-mermaid parse check, validated against mermaid 8 through 12. Review may analyze and re-render diagrams; update never analyzes, regenerates architecture content, or reads the old architecture. Open spec questions carried forward: naming the rest sub-unit strict partitioning forces, the all-children-removed degenerate case in update, the subtree-covering rule for declared relationships, and refresh of root providers counts during review.

## Fog

## Fog

## Fog

## Fog

## Fog

## Fog
