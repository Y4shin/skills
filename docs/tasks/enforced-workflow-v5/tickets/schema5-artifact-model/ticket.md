---
type: ticket
subtype: feature
title: Schema-5 artifact model, readers, and map sections
status: stable
workflow_state: ready
blocked_by: []
size: m
---

## What to build

The artifact model learns schema 5. It is the additive model delta only:
no migration, no transition tools, no skill changes.

`src/core/art.ts` gains the two new artifact types and their filenames:
`architecture` at `architecture.md` and `review` at `review.md`, both at
the effort root. `KNOWN_TYPES` and `TYPE_LEAVES` carry them. The existing
`arch spec` / `arch-spec.md` pair stays readable as a legacy shape, so a
v4 tree keeps parsing until the migration runs.

The reader learns the two new map frontmatter keys: `ready_for_spec`
(boolean; absent reads as false) and optional `origin_effort`. The map
section vocabulary learns `## Non-goals` (absorbing `## Out of scope`,
which stays readable) and `## Non-negotiable facts`, with the effort-level
success test as the first line of that section.

`src/core/graph.ts` learns that a spec-plus-zero-tickets effort is not
finalizable in the same terms as before, and that a bug-only effort has no
architecture document, so a missing `architecture.md` is not an anomaly.

No producer writes v5 yet; the migration ticket owns the reshape.

## Acceptance criteria

- [ ] `architecture` and `review` are recognized types with the correct
      filenames; a file placed as `architecture.md`/`review.md` parses and is
      not reported as an orphan.
- [ ] `type: arch spec` and `arch-spec.md` still parse as the legacy shape.
- [ ] `ready_for_spec` reads as false when absent and true when set;
      `origin_effort` round-trips when present.
- [ ] Map body handling recognizes `## Non-goals` and
      `## Non-negotiable facts`, and still tolerates `## Out of scope`.
- [ ] Graph semantics cover the new types without flagging a bug-only effort
      for a missing architecture document.
- [ ] Model tests (`tests/art.test.ts`, `tests/graph.test.ts`) cover every
      case above.

## Blocked by

- None (can start immediately).

## Implementation notes

- Landed on `task/schema5-artifact-model` (6 commits from landing point
  `29758fb`). Schema-5 additive model delta in `src/core/art.ts`:
  `architecture`/`review` types with `architecture.md`/`review.md` filenames
  at the effort root, `ready_for_spec` (strict-boolean, absent reads false)
  and `origin_effort` map fields, `MAP_SECTION_NON_GOALS` /
  `MAP_SECTION_NON_NEGOTIABLE_FACTS` constants and a `readMapSection` reader
  with `## Out of scope` aliasing to Non-goals.
- Divergence: `src/core/graph.ts` needed no code change. Both graph behaviors
  the ticket prose names (spec-plus-zero-tickets refusal unchanged, no
  missing-architecture anomaly for bug-only efforts) are already-guaranteed
  invariants, pinned by new tests in `tests/graph.test.ts` instead of new
  logic. `ready_for_spec` awareness in frontier/finalizability is deliberately
  left to the `planning-transition-tools` and `to-spec-rescope` tickets; making
  `effortFinalizable` require the flag would break every v4 map before the
  migration runs.
- Ripple: `KNOWN_TYPES` growth makes `architecture`/`review` recognized types
  in `src/core/migrate.ts`'s structurally derived `AUX_TYPES` and
  `auxTypeForFilename`. No v4 fixture carries them, so migration behavior is
  unchanged, but the `migrate-v4-to-v5` ticket must place them deliberately as
  effort-root primaries in the v5 reshape.
- Untouched by design: `src/pi.ts`'s context text and skill prose still
  describe the v4 type set; owned by later tickets in the chain.
- Validation: `npm test` 809 passed across 15 files (785 baseline, +24);
  `npx vitest run tests/art.test.ts` 64 passed, `tests/graph.test.ts` 30
  passed; `npm run typecheck` clean. No lint tool is configured in this repo.
- Residual: `readMapSection` matches heading names exactly after trim (no
  case tolerance); producers must write canonical names until the migration
  rewrites legacy ones.
- Note: `docs/tasks/state.yaml` carried a pre-existing unstaged modification
  (the orchestrator's `task:` pointer to `schema5-artifact-model`). Left
  uncommitted and unstaged, exactly as found.