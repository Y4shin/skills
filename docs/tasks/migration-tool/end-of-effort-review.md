---
type: review
title: "End-of-effort review: migration-tool"
pass: end-of-effort
---

# End-of-effort review: migration-tool

Advisory whole-effort review, two axes (Standards: is it built right? Spec: is it the right thing?), recorded here for the close's triage. It does not gate landing, and no overall winner is declared between the axes.

- Fixed point: `e1e7f14` (the merge-base of `effort/migration-tool` and `main`; the nominal fixed point resolved to HEAD itself, so the supervisor approved the merge-base as the effective fixed point).
- Head at review: `2969edf` (the tip after the third ticket's finalize merge).
- Diff: 38 commits, 36 files, +1424/-333.
- Spec source: the effort tree under `docs/tasks/migration-tool/` (spec, architecture, the three ticket docs with deviation reports).

## Standards axis

Hard violations: none.

All standards checks pass: no em-dashes anywhere in the diff's prose; the docs page re-synced with its four mandated sections; task-workflow-overview's router line stays true at its resolution; the promoted set untouched; the new tool tests follow the repo's documented testing conventions (including the executor-swap pattern this diff itself documents); the glossary matches shipped behavior; corpus-sweep tests assert no living file references the removed CLI.

Judgement calls (baseline smells, never hard violations):

1. The migration step enumeration is duplicated nearly verbatim across three surfaces this effort edits (the tool description in the extension entry, the skill's migrate branch, and the 3-to-4 upgrade resource), with no test pinning the three lists to each other, so a step-list change can drift silently. The coherence step declined to cross-pin them; a future effort could consolidate on one canonical list or add a pin.
2. The opener's required non-empty `effort` label forces a dummy label for gateless phases; the migrate branch prose now canonizes the workaround (`effort: "setup-workflow"`). An effort-optional open shape would remove it, an interface change to the opener that belongs to a future effort, not this one.
3. The reroute's scatter across skill prose, docs, resources, glossary, registry comment, tool code, and five test files is exactly what AGENTS.md's re-sync rules endorse, so it is suppressed shotgun surgery by design.

## Spec axis

Missing or partial requirements: one, low severity, now resolved. The deleted spawn-based shim test for the failure exit had no tool-level twin when the third ticket landed; this was documented and justified in the deviation reports. After this review and the reconcile ran, the end-of-effort coherence step added exactly that pin: a test driving `tw_migrate` through the public tool factory, asserting the wrapped `migration failed: <reason>` line and an untouched tree.

Implemented wrongly: nothing found. All six choreography steps, the approval gate outside `main`/`master`, dry-run as a tool parameter, needs-human surfacing, the moved-not-rewritten rendering, the disclosure row and comment, the glossary entry, the docs page and resource rewording, the untouched onboard/no-op branches, the three CLI deletions, and the untouched core were all verified against the landed code.

Scope creep (all documented in deviation reports, test-only or additive): three new structure guards beyond the removal contract's "pure deletion"; the `outcome` details envelope beyond the frozen "return the rendered report text" (the text contract itself holds); the re-scenariod `tw_request_tool` refusal test and four foreign test-table updates, forced maintenance for the spec'd registry change.

## Sequencing note for the triage

The workflow order is review, then architecture reconcile, then coherence, then the suite gate. The reconcile therefore recorded two of its flags as open (the unpinned tool-level failure path and the absent fast-forward recovery step) that the coherence step subsequently closed: the failure-path pin test exists now, and the migrate branch's step 4 carries the recovery paragraph (delete the superseded migration branch, re-create from the moved tip, repeat; never forced) with the docs page carrying the matching common-questions entry. The recorded architecture document predates the coherence commit by design; its one now-stale sentence (the failure-path caveat in the `tw-migrate-tool` test contract) is superseded by the coherence landing. The deliberate survivors stand unchanged: the dated historical changelog mention, the archive reference, and this effort record itself still name the CLI by design of the structure guards' exemptions.

Suite gate: `npm test` 22 files, 1300 tests green; both typechecks clean (run after the coherence refactor landed).
