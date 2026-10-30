---
type: deviation report
title: Deviation report for schema5-artifact-model
status: stable
---

## Deviation report: schema5-artifact-model

### API surface changes
- **Planned:** The arch spec's contract for ticket 2: `architecture` and
  `review` in `KNOWN_TYPES`; `TYPE_LEAVES` entries for `architecture.md` and
  `review.md`; `fromFrontmatter` reading `ready_for_spec` and
  `origin_effort`; map-section-name helpers for `## Non-goals` and
  `## Non-negotiable facts`; legacy `arch spec`/`arch-spec.md` tolerance.
  Contract: v4 artifacts still parse; new producers write v5 only.
- **Actual:** Delivered as specified, with one surface addition: the map
  sections are exposed not just as name constants but as an exported pure
  reader, `readMapSection(body, name): string[] | null`
  (`MAP_SECTION_NON_GOALS`, `MAP_SECTION_NON_NEGOTIABLE_FACTS`,
  `MAP_SECTION_ALIASES` is private). `Artifact` gains two required fields,
  `ready_for_spec: boolean` and `origin_effort: string | null`, populated in
  `fromFrontmatter`. `src/core/graph.ts` itself changed zero lines (see
  below). Diff: `src/core/art.ts` +77, `tests/art.test.ts` +195,
  `tests/graph.test.ts` +63.
- **Impact:** Additive and safe for dependents. Two notes for downstream
  tickets: (1) the two `Artifact` fields are required interface fields, so
  any code constructing `Artifact` literals directly (rather than through
  `fromFrontmatter`) must supply them; today only `tests/graph.test.ts`'s
  local fixture helper does, and no other `src/` file constructs the type
  directly. (2) `KNOWN_TYPES` growth ripples structurally into
  `src/core/migrate.ts`'s derived `AUX_TYPES` and `auxTypeForFilename`, so
  `architecture`/`review` are now recognized types there; no v4 fixture
  carries them, so v4 migration behavior is unchanged, but
  `migrate-v4-to-v5` must place them deliberately as effort-root primaries
  in the v5 reshape (not as beside-artifact aux files).

### Abstraction usage
- Used/was specified: yes. Everything lives in `src/core/art.ts` per the
  spec's module map; no parallel model was built; no direct `fs` in `core/`;
  frontmatter parse/dump untouched. The reader is pure and side-effect free.

### Out-of-scope changes
- **`src/core/graph.ts` unchanged, deliberately.** The ticket prose says
  graph.ts "learns" two facts; both are guarantees the layer already
  satisfies. The new types flow through the graph as ordinary artifacts,
  nothing keys on a missing architecture document, and the
  spec-plus-zero-tickets refusal is unchanged (same condition, same
  message). The worker pinned both facts with tests instead of adding
  logic. Relatedly, the arch spec's module map line "graph.ts:
  `ready_for_spec` awareness (frontier, finalizability)" is realized here
  only as the parsed field riding on `Artifact`; making `effortFinalizable`
  require the flag would break every v4 map before the migration runs, and
  the flag-consumption checks belong to `planning-transition-tools`
  (`tw_finalize_map`) and `to-spec-rescope` (the opener). The arch spec's
  module-map line should be read as "the flag is available to graph
  consumers", not "graph.ts consults it".
- **`tests/graph.test.ts`'s local `art()` fixture helper** was extended
  with the two new required `Artifact` fields. Mechanical consequence of
  the spec'd interface growth.
- Nothing else moved: no `src/pi.ts`, no skills, no docs, no migration
  code. The v4 `arch-spec.md` context tool and the skill prose that names
  `arch-spec.md` remain (owned by later tickets).

### Ticket doc update needed?
Yes. Append an `## Implementation notes` section recording: the strict
boolean reading of `ready_for_spec` (only `=== true` reads true; absent,
`false`, and non-booleans all read false, per the grilling's
absent-and-false-identically rule); the `readMapSection` semantics (blank
margins trimmed so an empty placeholder reads `[]`; sections end at the
next `##` heading so `###` stays inside; legacy `## Out of scope` aliases
resolve in both directions; first heading wins when both names appear);
why `graph.ts` has no diff; and the `AUX_TYPES` ripple the migration
ticket must handle in the v5 reshape.

### User attention needed?
No. The export contract holds for every downstream ticket: the new types,
fields, section vocabulary, and reader exist and are tested. The
graph.ts no-change is a defensible reading of "in the same terms as
before", not a scope change; the flag's enforcement lives in the tickets
that own the tools that check it, exactly as the spec's contract table
assigns it.
