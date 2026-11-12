---
type: task
subtype: grilling
title: Settle the portable architecture model and complete diff representation
status: stable
workflow_state: ready
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

## Provider strategy settled by `provider-strategy`, 2026-11-12

The schema must support one production native TypeScript adapter, the Tree-sitter fallback, and a native-adapter test double for Go. The real Go adapter is out of scope unless the generic approach later proves insufficient. Provider selection and evidence tier are visible in every result, and synthetic test-double provenance is explicit. Native semantic acceptance applies to TypeScript; Go and Python use the reduced fallback contract.

## Additional prerequisite from the operator, 2026-11-12

The provider now needs a language-agnostic fallback with an explicitly reduced evidence tier. Consume `language-agnostic-extraction` and any follow-up prototype it triggers before settling the provider and coverage portions of this schema. The schema must distinguish native semantic facts, exact syntax facts, path-derived inference, unresolved semantics, and provider or grammar provenance.
