---
type: task
subtype: prototype
title: Can a reviewed full diff become a clean update without content loss or reinterpretation?
status: stable
workflow_state: ready
blocked_by:
- architecture-schema
---

## Single design question

Can the chosen architecture schema represent a complete reviewed diff whose clean update is a mechanical, verifiable removal of review markup, while preserving unchanged content and agent-authored assignments and using only clean `HEAD` for code analysis?

## Alternatives worth comparing

1. Inline review markers and change notes in the complete architecture files, with enough structure for mechanical removal.
2. Structured sidecar review metadata plus a generated highlighted rendering, with update applied to the underlying complete model.
3. Separate clean and highlighted complete copies produced by one comparison, with update selecting and validating the clean copy rather than transforming the annotated one.

## Smallest artifact

A throwaway fixture and local script that:

- starts with a small nested architecture fitted at a base commit;
- changes TypeScript and Go fixtures by adding a package or module that fits an existing unit, adding a sub-unit case, changing an import edge, and removing owned code;
- produces a complete highlighted diff from the recorded base commit to `HEAD`;
- simulates operator review of both a localized assignment and a broader redesign proposal;
- produces the clean updated architecture using only the reviewed diff;
- verifies that unchanged architecture content and fitted assignments survive exactly, all tool-derived facts that should refresh do refresh, and no diff markup or change-only notes remain.

Run the analysis once with a dirty original working tree and prove that the inspected target is a detached worktree at `HEAD`, the original working tree and index remain unchanged, and uncommitted content does not influence the result. Use temporary repositories or fixtures, never the real repositories' Git state, for mutation tests.

## Who must react

The operator reviews whether the highlighted copy is readable, whether the review record captures decisions without ambiguity, and whether the clean-output equivalence check is convincing.

## Evidence and decision output

- Prototype location and the exercised alternative or alternatives.
- A content-preservation and round-trip check with any loss or false equivalence reported.
- A demonstration that update does not read the old architecture or invoke architectural analysis.
- The chosen representation and rejected alternatives, with consequences for `skill-surface` and implementation slicing.

## Likely dependents

`skill-surface`, then the specification and implementation tickets for diff generation, review, clean update, detached-worktree analysis, and write-safety checks.

## Notes

## Round 3 follow-up: mermaid parse error fixed

- The operator reported a mermaid render error (screenshot; the content was independently reproduced with the real parser): 7 of 11 generated diagrams failed to parse. Root cause: mermaid's flowchart grammar rejects unquoted edge labels containing spaces, and every edge label added in round 3 ("reads records", "[ND] imports findRecords") was multi-word and unquoted.
- Fix: all edge labels render quoted (`-->|"reads records"|`, `-.->|"[ND] imports fmt"|`).
- The verification suite now renders every generated diagram through @mermaid-js/mermaid-cli as a gate: all 11 diagrams (base, diff, reviewed, clean) must parse. This is recorded as a required check for the specification's fitting, diff, review, and update sections: every produced mermaid must be validated by a real parser, not by eyeball.
- After the fix: 16 checks plus the external render gate all pass.

## Round 3 implemented (diagram conventions) and a review-fidelity discovery

- Spacing: every diagram opens with a mermaid init directive (`nodeSpacing: 70, rankSpacing: 110`), present in base, diff, and clean diagrams.
- Edge labels: declared relationships gained a few-word authored `label` (fixture: cli to database "reads records", database to core "uses domain model"); every plain edge shows it. Drafted declarations proposed by the diff are labeled from the observed evidence ("imports buildModel", "imports fmt"), which is honest for unconfirmed proposals.
- [U] and [ND]: unused edges render as `-->|[U] reads records|` (what the relationship should have been, from the declared label), side channels as `-.->|[ND] imports findRecords|` (what actually is there, from the observed import). Both keep their red/orange link colors.
- Second line: changed AU boxes in diff diagrams carry the change class under the fully qualified name (`cli["cli<br/>structural-import"]`), in addition to the tier colors; update strips the second line and the tier classes mechanically.
- Review now also rejects one drafted declaration (schema's drafted depends-on util, removed with its prose section and change record), leaving a genuine `[ND] imports fmt` edge through review into the clean architecture; accepted drafts (cli to core) stay as plain labeled edges.
- Review-fidelity discovery: because review edits the diff copy, the reviewed diagrams must be re-rendered during review (review runs in the diff operation's context and may analyze); update still only strips, never analyzes or regenerates.
- Schema addition: `declared_relationships` entries carry a short `label` used on diagram edges; observed edge evidence carries the imported symbol so [ND] edges can say what is actually there.
- New checks: V13 (all diagram conventions, including the [ND] surviving review into clean) and V14 (no duplicated section headings anywhere; this pinned a real replaceSection misuse that doubled ## Diagram headings mid-round). 16 checks, all passing.

Consequence for the specification: the review step owns diagram re-rendering after operator edits; update's contract stays "validate, strip, renumber", nothing more.

## Operator review feedback, round 2 (diagram conventions, all views)

- Space the AU boxes out more, and label every edge with a few words describing the relationship (for example core depends on database described as "uses database implementation"); a bit more descriptive than that if possible, but few words so the graph does not crowd.
- Edges with missing or erroneous connections start with a marker: `[U]` (unused, declared but not observed) and `[ND]` (not declared, observed but undeclared). `[U]` edges carry a few-word description of what the relationship should have been if it was there; `[ND]` edges a few words on what actually is there.
- In the diff view, every AU box with a change carries a second line inside the box with the change class (tier), in addition to the color coding.
- These apply to all diagrams, not only the diff view, except the second line which is diff-only by nature (base and clean architectures have no change classes).

## Round 2 amendments implemented (fully qualified names, strict partitioning)

- All references now use fully qualified names built from the root AU down (`core/parsers`, `database/schema`): the parent field holds the parent's fully qualified name, declared relationship targets are fully qualified, mermaid node labels and unit rollups show them, and the fixture prose uses them. The core unit's diagram now reads `core/parsers -.->|side channel| database`, which shows at a glance that a sub-AU of core connects to the root AU database.
- Strict partitioning is implemented and visible: a subdivided AU owns no code directly; ownership resolves by descending from the root AU through children (longest matching selector per level). A subdivided unit's Observed section states `no direct ownership: subdivided into <children>` and `scope files: N, owned by sub-units: N, gaps: <files or none>`.
- The fixture was violating the rule (core owned model.ts directly while having core/parsers); it is now partitioned: core has children core/model and core/parsers, and at HEAD database gains children database/schema and database/store, the second forced by strict partitioning (a rest sub-unit covering the remainder of the parent's scope).
- New checks: V11 asserts the partition invariants (no gaps, full root coverage, subdivided units own nothing) in base, reviewed, and clean; V12 is a negative control proving a missing rest sub-unit surfaces as a visible gap (core's Observed names `gaps: src/core/model.ts`).
- V3 caught a real defect during this round: update dropped the removed core/parsers but left core's Observed tiling line naming it. Fixed mechanically: the tiling enumeration is tree-derived, so update rewrites it from the surviving children; edges and counts stay verbatim.

Newly discovered schema needs from this round (input for `skill-surface` and the specification):

- Naming the rest sub-unit that strict partitioning forces (the prototype derives it from the parent's first remaining pre-existing file; `database/store` reads well, but the naming is a real skill-surface question).
- The degenerate case where update removes ALL sub-units of a parent is unspecified (the parent becomes a leaf whose owned-files count update cannot derive without analysis); the spec needs a rule.
- A declared relationship on a root AU covers observed edges into its subtree (cli declares depends-on core, the observed edge lands on core/model); the covering rule needs to be explicit in the specification.

## Operator review feedback, round 1 (schema-level amendments)

- Fully qualified names everywhere: every reference to an AU or sub-AU (front matter parent and declared relationship targets, prose, mermaid node labels, unit rollups) uses the fully qualified name built from the root AU down, for example `core/parsers`, even inside the containing AU's own files. Reason: in the core unit's mermaid, the `parsers` to `database` edge did not show at a glance that `parsers` is a sub-AU of core connecting to the root AU database.
- Strict partition rule confirmed and to be made visible: if an AU has sub-AUs, the sub-AUs must contain all the code of the AU as disjoint sets. The operator could not determine from the prototype's core unit whether parsers fully encompassed core's code or whether the rest was simply not added to a sub-AU; that state (parent owning leftovers directly while subdivided) is a violation. The format must show the tiling (coverage and gaps) and the tooling must report it.
- The operator announced further feedback on the diff view after these changes ("this is not yet about the diff view, I am getting to that now"); the prototype stays open for iteration.

## Prototype run, evidence (diff-update-roundtrip)

Question: can the settled schema carry a complete reviewed diff whose clean update is a mechanical, verifiable removal of review markup, preserving unchanged content and agent-authored assignments, analyzing only clean HEAD.

Prototype location: `prototype-diff-update-roundtrip/` (throwaway; `node run-prototype.mjs`; artifacts under `artifacts/`, inspectable fixture repo under `tmp/`). Artifacts: 01 base architecture, 02 code changes, 03 diff architecture, 04 reviewed diff, 05 clean architecture, 06 verification report, 07 dirty-run report.

Alternatives: (1) inline structured change records in the complete files, exercised and chosen; (2) sidecar review metadata and (3) separate clean and highlighted copies, rejected with a concrete observation: operator review edits the diff copy itself (the localized assignment extended the proposed sub-unit's selectors), so a pre-produced clean copy would go stale, and a sidecar splits the reviewed content across two artifacts that must be kept in sync during review.

Observations:

- The fixture exercised every tier: cli structural-import (declared edge added for the switched import), core structural (lost sub-unit parsers), database structural (gained sub-unit schema; its records carried feature and fix-or-optimization underneath, so highest-tier-wins computed), schema new, parsers removed, util unchanged.
- Update gate: an unreviewed diff with open proposals is refused.
- Review record: root proposals with open, accepted, or deferred status plus per-section `> Review note:` marker lines captured the operator decisions (accept the sub-unit with the Go module added; defer the merge-core-into-database redesign) without ambiguity, and both forms are mechanically strippable.
- Clean-output equivalence: 12 automated checks, all passing. Authored prose preserved exactly for units without reviewed authored changes; selectors stable; observed sections equal an independent analysis of HEAD over the reviewed unit set (edges and owned files); no markup remains (greps for change, base_commit, proposals, tier classes, review notes, diff summary); update ran with the original architecture moved away; parsers dropped, schema present with the reviewed Go selector, util byte-identical; root described_commit = HEAD with the replacement entry; reviewed declared relationships kept; diff completeness (every base unit present, util without a change block).
- Dirty working tree: analysis ran in a detached worktree at HEAD; the original tree and index were unchanged (identical porcelain status); the diff output was byte-identical to the clean run, so uncommitted content did not influence the result.

Newly discovered schema needs (input for `skill-surface` and the specification, not new planning tasks):

- A diff-only root proposals key with open, accepted, or deferred statuses worked as the home for broader redesign proposals; update refuses open ones and drops the key.
- The fixed marker line form (`> Review note:`) for review-time annotations is the strippable convention; prose without the marker would survive update as architecture content.
- Update derives the clean diagrams by stripping the tier-class vocabulary from the reviewed diff's mermaid, not by regenerating; regeneration would need analysis, which update must not do.
- Directory normalization is part of update: database.md promoted to database/ when it gained a child; core, having lost its only child, may lawfully remain a directory or become core.md (the prototype demoted it; both are legal for a root AU).
- Review tooling must refresh the root providers inventory counts when a review changes ownership, the same way unit Observed sections were refreshed.

Chosen direction: alternative 1, inline structured change records rendered into the complete self-contained copy, exactly as settled by `architecture-schema`; validated end to end.

Consequences: `skill-surface` builds on this roundtrip shape; the specification's diff, review, and update sections take the proposals key, the review-note marker, and the diagram-strip rule above.
