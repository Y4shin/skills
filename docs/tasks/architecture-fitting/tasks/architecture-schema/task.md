---
type: task
subtype: grilling
title: Settle the portable architecture model and complete diff representation
status: stable
workflow_state: done
blocked_by:
- facts-provider
---

## Decision to settle

The portable architecture document format: unit identity and hierarchy, source selectors, responsibilities and boundaries, intended and observed relationships, code-commit provenance, static-analysis evidence and coverage, and the review markup that makes a diff a complete highlighted architecture that update can clean mechanically.

## Parent decisions it depends on

`non-negotiables` fixed clean-`HEAD` provenance, stable fitted assignments, guided review, complete highlighted diff copies, clean update without reinterpretation, and no enforced storage location. `facts-provider` establishes which extracted facts and coverage statements are honest on TypeScript and Go.

## Choices already known

- The related design uses one Markdown file per architectural unit, with stable IDs, parent relationships, source selectors, declared relationships, and prose for responsibility, boundary, and rationale.
- The architecture must remain portable to destinations outside the source repository, so machine interpretation cannot assume `${REPO_ROOT}/docs/architecture/`.
- Language visibility, observed use, and intended API or relationships must remain distinguishable.
- Diff markup can live inline in a full architecture copy, in structured metadata rendered into that copy, or in a sidecar review record. The chosen form must preserve the entire architecture through update, not only its changed units.
- Provenance must distinguish the comparison base from the `HEAD` commit described by the resulting architecture.

## What this session must pin down

- The root and per-unit files, exact keys and types, stable ID rules, hierarchy and ownership invariants, and selector syntax for TypeScript and Go.
- Which content is human or agent intent, which is tool-derived, and which generated facts are stored versus recomputed.
- The minimum evidence and coverage records required for a reader to distinguish no dependency from incomplete analysis.
- The representation of added, removed, and changed units, assignments, relationships, and prose in a complete diff architecture, including useful change notes.
- The review state needed for update to consume only the diff and emit a clean architecture without the old source.
- What explicit operator confirmation records when a clean result replaces the authoritative source.

## Recommended starting answer

Use a root index with provenance and analysis coverage, plus one Markdown file per unit with stable free-form IDs, parent, source selectors, intended API and relationships, and prose intent. Keep observed facts attributable to the provider and separately identified from intent. Represent a diff as the same complete model plus structured review metadata and rendered highlights, so update can validate and remove the review layer without reconstructing architecture content.

## Downstream work this may create

`diff-update-roundtrip`, `skill-surface`, and the specification's model, validation, fitting, diff, and update sections.

## Notes

## Settled (shared understanding confirmed by the operator)

The grilling closed after four rounds with the operator's explicit confirmation. Final decision in the operator's terms, as summarized and confirmed:

- Directory-with-index for any node with children, plain file for leaves, recursively; childless root AUs may be plain files next to the root index.
- Language-specific selector identifiers preferred where the language and tooling yield them; deterministic, documented tier heuristic; strict highest-tier-wins per AU; `removed` mirrors `new` at the top of the ladder.
- Side channels (undeclared observed relations) are errors, red. Missing relations (declared but unobserved) are warnings, yellow or orange.
- Fixed prose header structure corresponding to front-matter fields, every declared_relationship with its own prose section.
- The concrete schema is approved provisionally: leave it as-is and see how it goes, with `version: 1` available for evolution.

Dependent-task implications: `diff-update-roundtrip` can test the roundtrip against the settled change-record form, including the `new` and `removed` markers. `skill-surface` inherits the diagram requirements (root and per-unit mermaid, gap styling, tier color-coding). The specification's model, validation, fitting, diff, and update sections take their format from this decision.

Remaining fog or newly discovered work: none from this task. Open presentation details deliberately left to fitting work: the tier color palette, and the exact trigger conditions of the tier heuristic beyond the category definitions.

## Round 4 settled (operator's answer)

- Fixed prose structure confirmed: unit-file bodies carry authored sections in fixed order (`## Responsibility`, `## Boundary`, `## Rationale`, one section per declared relationship titled after it, for example `## Relationship: cli (depends-on)`), then generated sections (`## Observed` with edges and coverage statement, `## Diagram` with the unit's mermaid, present only when the unit has sub-units). Root index body: authored `## Overview`, generated `## Diagram` and `## Units`. The per-relationship sections make the front matter and prose mechanically checkable against each other.

## Round 3 settled (operator's answers)

- `fix or optimization` reading confirmed: a change with no functional impact on the product, that fixes an issue or optimizes something. And removals get their own tier: `removed`, mirroring `new` at the top of the ladder (existence events, distinct visual marker from content-tier colors).
- Gap styling: undeclared observed relationships are errors, styled red (the side channels); declared-but-unobserved relationships are warnings, styled yellow or orange (the missing ones). My recommendation to keep unused permissions neutral was rejected: both gap directions carry negative styling, with different severities.
- The concrete schema (root index, unit file, change records, update semantics as sketched in Q14) is approved as-is, provisionally: "leave it as-is and see how it goes". One amendment: the prose header structure of unit files is fixed and corresponds to certain front-matter fields; every declared_relationship must have a corresponding prose section describing it.
- Open from this answer: the exact fixed heading list for unit-file bodies (the rule is settled, the headings are not yet enumerated).

## Round 2 settled (operator's answers)

- Node form: the recursive rule is accepted, with one change: a root-level AU may also be an individual file without its own directory, if and only if it has no sub-units. So at every level, a node with children is a directory whose index file describes it and a leaf is a plain file; additionally, a childless root AU may sit directly next to the root index as a plain file (a directory is still allowed for it).
- Per-language selector mapping: approved. TypeScript uses repository-relative path prefixes, Go uses package import path prefixes, Python uses dotted module paths; every selector carries an explicit form tag so a reader can tell which kind of claim it makes, and future languages (for example Java packages) slot in without format changes.
- Diagrams and relationship gaps: in the ideal world there is no gap between declared and observed relationships. Any gap is visualized in a "negative" way, because an observed-but-undeclared relationship is a side channel. The markdown declares relationships as authored intent, and the mermaid covers the declared relationships as well as the unintended side channels. Open from this answer: whether a declared-but-never-observed relationship (an unused permission) is also styled negatively or shown neutrally.
- Change categories: a strict hierarchy in which an AU always falls in the highest tier of all the changes inside it in this diff. From lowest to highest tier: `fix or optimization` (no functional impact on the product, fixes an issue or optimizes); `feature` (a functional change to the product without touching the fundamental architecture, for example a new API route with no new external dependencies such as new external APIs or databases); `structural-import` (adds new dependencies on other AUs or adapts to modifications of other AUs' exports, with the AU's internal architecture not changed beyond adapting to an external AU change; arises when a dependency or imported AU changed in the next categories); `structural` (modifies the actual architecture of the AU beyond adapting to external changes, possibly purely internal refactoring, in which case importers do not need a structural-import change); `new` (any newly added AU or sub-AU).
- Open from this answer: the exact reading of the `fix or optimization` definition (the sentence as typed carries a dropped word), and which tier a removed AU takes.

## Round 1 settled (operator's answers)

- File layout: root index plus **one directory per unit**. Each unit directory holds an index file that plays the role of the per-unit Markdown file; sub-units are created as individual files inside the unit directory. Rejected: single monolithic file; per-unit Markdown plus a machine-readable sidecar.
- Unit identity: free-form slug IDs accepted; with the directory layout the slug is the directory name and the unit's own content is the index file inside it. Children reference the parent by ID; renames are explicit authored edits. Rejected: path-derived IDs, dotted hierarchical IDs.
- Source selectors: **prefer language-specific identifiers where possible**, "possible" meaning both that the language supports them and that our tooling yields or can easily derive them (Go package/import names, Java package names as examples). Language identifiers come first; path selectors are the fallback, reversing the most-specific-wins-first recommendation. The exact per-language mapping stays open for round 2.
- Intent versus extracted facts: approved as recommended. Authored intent is the human-editable core; only aggregated observed edges are stored, in a clearly marked generated section attributed to provider, evidence tier, and commit; raw usage evidence is recomputed on demand and never stored.
- Provenance and coverage records: approved as recommended. Per-language provider, tier, version, described commit plus diff base commit, inventory and dependency coverage, all in the root index; an absent edge is a claim only when the applicable coverage says complete.
- Diff representation: approved as recommended (structured change records rendered inline into a complete self-contained copy), with an addition: the root architecture index carries a mermaid diagram of the architecture, and a unit index describing sub-units also carries a mermaid of those sub-units. In a diff architecture the mermaid highlights change: color-coded, with differences ranked semantically by a heuristic, categories along the lines of "fixes", "non-structural changes", "structural changes".
- Replacement confirmation: approved as recommended (replacement entry in the root index recording old described commit, new described commit, and when).

## Provider strategy settled by `provider-strategy`, 2026-11-12

The schema must support one production native TypeScript adapter, the Tree-sitter fallback, and a native-adapter test double for Go. The real Go adapter is out of scope unless the generic approach later proves insufficient. Provider selection and evidence tier are visible in every result, and synthetic test-double provenance is explicit. Native semantic acceptance applies to TypeScript; Go and Python use the reduced fallback contract.

## Additional prerequisite from the operator, 2026-11-12

The provider now needs a language-agnostic fallback with an explicitly reduced evidence tier. Consume `language-agnostic-extraction` and any follow-up prototype it triggers before settling the provider and coverage portions of this schema. The schema must distinguish native semantic facts, exact syntax facts, path-derived inference, unresolved semantics, and provider or grammar provenance.
