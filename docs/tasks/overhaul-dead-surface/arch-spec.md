# Architecture spec: overhaul-dead-surface

Status: approved by the user (2026-09-29). One approved exception to the
ticket's pure-deletion constraint, taken in the approval conversation:
adding `submit_feedback` to the tool allowlists of tdd-worker,
slice-verifier, deviation-reporter, and land-worker (one word per file;
their prose already instructs the calls, which are silently impossible
today).

Scope: a pure deletion ticket plus that exception. `src/pi.ts` (tool
registrations and machinery), `src/core/art.ts` (slice-info helpers), six
test files, `docs/repo-gating.md`, and the four agent allowlists. Nothing
else is added, no description is reworded beyond removal. The arch spec
lives in this ticket's v3-shape directory (the transitional convention the
last two tickets used; the effort-root rule applies post-migration).

## The delete list

### Tools (six)

`tw_resolve`, `tw_assert_kind`, `tw_map_tasks`, `tw_map_tick`, `tw_slices`,
`tw_set_slices`: registrations and implementations removed from
`createTools()` in `src/pi.ts`.

### The guidelines feature

`get_guidelines` and `list_guidelines` registrations, the
`before_agent_start` injection hook, the `session_start` and
`session_compact` discovery reset, and the machinery behind them:
`discoverGuidelines`, `guidelinesCache`, `shouldInjectGuidelines`,
`guidelineDisplayPath`, `EXT_TO_LANG`, `SKIP_DIRS` (only where discovery
is its sole user), and the inlined `SMELL_BASELINE` copy (the real source
stays `skills/engineering/code-review/smells.md`).

### Slice machinery, end to end

Per grilling round 1: `activeSlices` and `SLICE_RE` in `src/pi.ts`;
`sliceInfoFrom` and the `SliceInfo` type in `src/core/art.ts` (verified:
the migration uses none of it); `tw_finalizable` drops its `activeSlices`
secondary gate (the check is status-based, keeping the v3 status fallback
inside `itemFinalizable`); `tw_dependency_levels` drops its task branch
(slice levels), keeping the map branch with its v3 array fallback;
`dependencyLevels` in `art.ts` slims to `WorkItemInfo`.

### Kept untouched

`notify_user` (verified by diff), the v3 array fallbacks
(`mapChildInfos`, `taskPathForSlug`) that serve the live tree's surviving
graph tools, the dual-shape parsing in `art.ts` (the migration needs it),
and every surviving tool's behavior.

## The zero-references contract

A package-wide corpus assertion (extending the rename ticket's pattern in
`tests/skills.test.ts`) fails on any of the eight deleted tool names or
the guidelines machinery identifiers outside an explicit
historical-record exemption set: the archived task trees under
`docs/tasks/archive/`, the decision records (the grilling task doc, the
map doc), dated `docs/tasks/CHANGELOG.md` entries,
`docs/migration-target.yaml` (the versioned v3 target-state record),
`docs/ideas/*`, the overhaul tickets' own docs, and the sweep test file
itself. Living docs are already clean except `docs/repo-gating.md`,
which drops the two guidelines names from its gated-list mention.

## The allowlist exception (user-approved)

Add `submit_feedback` to the `tools:` line of `agents/tdd-worker.md`,
`agents/slice-verifier.md`, `agents/deviation-reporter.md`, and
`agents/land-worker.md`. No other agent-file change: their feedback prose
stays exactly as written.

## Tests

- `tests/guidelines.test.ts` deleted (the file, not skipped).
- The deleted-tool describes in `tests/plugin.test.ts` removed
  (tw_set_slices, tw_resolve, tw_assert_kind, tw_slices, tw_map_tasks,
  tw_map_tick); the surviving-tool tests untouched.
- The "guidelines extension" describe in
  `tests/integration/session.test.ts` removed.
- `tests/gate-factory.test.ts` expected tool lists updated to the
  shrunken registered surface.
- `tests/art.test.ts` slice-info coverage removed with the helpers.
- The existing keep-out guards in `tests/skills.test.ts` stay; the new
  corpus assertion covers the deleted names with the exemption set.
- The full suite green after removal; removed, never skipped.

## Do NOT reimplement

- No replacement for anything deleted (the guidelines revamp is a later
  effort by user decision; nothing shadows the deleted tools).
- No prose rewording beyond removal (living docs keep their wording with
  the names gone).
- No migration of this repo's own tree; no planning-side or
  execution-side skill prose changes (already landed clean).
- The context tool's schema reference and the doctor's prose already
  describe only the surviving surface (verified by the existing
  structure tests); no changes there.

## Interface contract for dependents

- backfill-skill-docs-pages runs after this ticket: the docs pages it
  writes must describe the shrunken, final tool surface.
- The registered surface after this ticket: tw_show, tw_get, tw_set,
  tw_list, tw_frontier, tw_dependency_levels, tw_finalizable,
  tw_map_finalizable, tw_state, tw_state_set, tw_context, notify_user.
- The effort finalizes when this ticket lands (backfill-skill-docs-pages
  is blocked by it and remains as the effort's tail).
