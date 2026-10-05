---
type: ticket
subtype: feature
title: Schema-5 migration target and the upgrade-4-to-5 resource
status: stable
workflow_state: ready
blocked_by: [migrate-v4-to-v5]
size: s
---

## What to build

`setup-workflow` carries downstream repos forward to schema 5.

Update `docs/migration-target.yaml` to describe schema 5: the new artifact
types (`architecture`, `review`), the map frontmatter (`ready_for_spec`,
`origin_effort`), the map body sections, and the schema-5 version stamp.
The file currently targets schema 3 while the live tree is v4; bring the
target to v5 in one consistent state.

Add `skills/engineering/setup-workflow/resources/upgrade-4-to-5.md` as the
per-version upgrade resource, matching the shape of the existing
`upgrade-3-to-4.md`, and wire it into `setup-workflow`'s version table so a
v4 repo is routed to it.

Running the migration on a downstream repo stays a human `setup-workflow`
action after v5 lands. This ticket ships the guide and the target, not an
automatic run.

## Acceptance criteria

- [ ] `docs/migration-target.yaml` describes schema 5 and no longer claims
      schema 3.
- [ ] `upgrade-4-to-5.md` exists, follows the established resource shape,
      and covers every v4-to-5 rewrite the migration performs.
- [ ] `setup-workflow`'s version table routes a v4 repo to the new resource.
- [ ] `tests/setup-workflow-scripts.test.ts` is green.

## Blocked by

- migrate-v4-to-v5 (the guide documents the reshape that ticket implements).