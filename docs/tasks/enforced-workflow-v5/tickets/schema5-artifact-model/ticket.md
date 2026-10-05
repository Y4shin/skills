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