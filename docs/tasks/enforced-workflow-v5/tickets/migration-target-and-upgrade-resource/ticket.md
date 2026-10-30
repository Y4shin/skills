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

## Implementation notes

- Landed 2026-10-06 by the land worker. Merged `ticket/migration-target-and-upgrade-resource`
  (5 wip commits, tip `d19b80a`) into the landing branch
  `task/migration-target-and-upgrade-resource` (created at base `f3db0fe`, the
  tip of `task/implementation-transition-tools`; the landing branch did not
  exist at land time, so it was recreated at the TDD report's landing point,
  same pattern as `migrate-v4-to-v5` and `write-lockdown-guard` before it)
  with `--no-ff`; ticket branch deleted. Full suite 925/925 passing after the
  merge; typecheck clean.
- Scope: six files (`docs/migration-target.yaml`, the new
  `skills/engineering/setup-workflow/resources/upgrade-4-to-5.md`,
  `skills/engineering/setup-workflow/SKILL.md`,
  `docs/engineering/setup-workflow.md`, `tests/setup-workflow-scripts.test.ts`,
  `tests/skills.test.ts`), +446/-167.
- All four criteria landed: the target file stamps `schema_version: 5` with no
  schema-3 claims left; the upgrade resource follows the
  `upgrade-3-to-4.md` shape and covers the architecture rename, the map body
  reshape, the state stamp, and the `docs/bugs/` non-touch; the version table
  routes a v4 repo to it (detection keys on `schema_version` < 5, the no-op
  message names schema_version 5); the ticket's test file is green with a new
  `docs/migration-target.yaml` describe block pinning the schema-5 target.
- Divergences beyond the ticket's four named content areas, recorded by the
  TDD worker and held at review: the target file was rewritten in one
  consistent state beyond the named sections (the v3-era file promoted retired
  phases and described `docs/bugs/` as live); `tests/skills.test.ts`'s
  setup-workflow block moved from v4 to v5 (the arch-spec'd version bump);
  the docs page and the skill's commit messages/branch names re-synced to 5
  per the project's docs rule.
- Validation at merge: `npm test` 925 passed across 17 files;
  `npx vitest run tests/setup-workflow-scripts.test.ts` 9 passed;
  `npm run typecheck` clean. No lint tool is configured in this repo.
- Residual risks (non-blocking, from verification): `CONTEXT.md` and the
  doctor/overview prose still speak v4 (owned by `overview-doctor-rescope`
  and `docs-resync`); the onboard branch still scaffolds `docs/bugs/`
  directories, contradicting the target's static-archive statement, flagged
  for the coherence pass; the guide's transcript comes from a fixture without
  `index.md`/`CHANGELOG.md`, so real v4 repos will not see those backfill
  lines; the no-primary-architecture-doc corner (hoist plus destination-
  collision report) was verified manually but has no automated test.