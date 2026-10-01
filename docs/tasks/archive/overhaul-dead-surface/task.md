---
kind: task
type: feature
slug: overhaul-dead-surface
title: Delete the dead tool surface (zero references remain)
map: task-tools-overhaul
status: deprecated
blocked_by:
- overhaul-planning-skills
- overhaul-execution-skills
slices:
- overhaul-dead-surface
workflow_state: done
---

## What to build

The deletion ticket: the dead surface goes, with zero references
remaining anywhere in the package. Nothing new is built.

Deleted tools: resolve, assert_kind, map_tasks, map_tick (the
array died with the v4 layout), the slice pair (enumeration and
list-writer). Deleted feature: the guidelines tools (both) plus the
before_agent_start injection hook and the discovery machinery behind
them (user decision: the feature is deprecated in this overhaul, not
redesigned; a later effort revamps repo-standards delivery). The
notification tool stays untouched, workflow-external.

Because the rename ticket already swept these tools to their final
names and the prose tickets already re-pointed every consumer, this
ticket is a pure no-references-remain contract: remove the
implementations and registrations, remove the tests that cover them,
and verify the package carries zero references to anything deleted.

## Acceptance criteria

- [ ] The deleted tools are unregistered and their implementations
      gone.
- [ ] The guidelines injection hook and discovery machinery are
      gone.
- [ ] Package-wide search finds zero references to any deleted
      tool or the guidelines feature.
- [ ] The full test suite passes; deleted-tool tests are removed,
      not skipped.
- [ ] The notification tool is untouched (verified by diff).
- [ ] The doctor's conformance and routing prose no longer mentions
      the deleted surface.

## Blocked by

- overhaul-planning-skills and overhaul-execution-skills (every
      consumer re-pointed first; deletion stays pure).

## Implementation notes

### Slice - overhaul-dead-surface (landed)

Landed on `ticket/overhaul-dead-surface` (3 commits, merged into
`task/overhaul-dead-surface` with --no-ff, 13 files, +173/-1089,
net -916 lines). This chain ran on the new `ticket/` branch
convention, the first to do so. The user-approved exception landed
first (submit_feedback on the four chain agents' allowlists), then
the RED corpus and registration tests, then the GREEN deletions.
Gates on the merged branch: 728/728 tests across 14 files,
`tsc --noEmit` clean; no lint script is configured (typecheck is the
designated gate). Verified independently before landing (slice gates
plus spot checks: notify_user byte-identical, zero deleted-name
references in src/).

What landed: the six dead tools deleted (tw_resolve, tw_assert_kind,
tw_map_tasks, tw_map_tick, tw_slices, tw_set_slices) together with the
guidelines feature end to end (both tool registrations, the
before_agent_start injection hook, the session_compact re-arm,
discoverGuidelines, guidelinesCache, shouldInjectGuidelines,
guidelineDisplayPath, EXT_TO_LANG, SKIP_DIRS, the inlined SMELL_BASELINE
copy) and the slice machinery (activeSlices, SLICE_RE, SliceInfo and
sliceInfoFrom in src/core/art.ts). tw_finalizable keeps its
status-based check and drops the slice-file secondary gate;
tw_dependency_levels keeps the map branch with its v3 array fallback
and drops the task branch. tests/guidelines.test.ts is deleted as a
file (nothing skipped). The exact registration surface is pinned to
twelve tools by exact-equality assertions in tests/plugin.test.ts and
tests/gate-factory.test.ts (GATED_NAMES). A new dead-surface corpus
describe in tests/skills.test.ts fails on any of the eight deleted
names or the machinery identifiers outside an explicit
historical-record exemption set, plus a src-scoped SKIP_DIRS check.
docs/repo-gating.md drops the two guidelines names (removal only). The
doctor's conformance and routing prose needed no change (the existing
structure tests and the corpus sweep cover it).

Carried forward, in priority order:

1. **Corpus exemption-set additions.** The arch spec's
   historical-record class gained four paths its enumeration did not
   name: docs/tasks/tool-surface-inventory/ and
   docs/tasks/workflow-tool-usage-audit/ (research trees recording
   the old surface; the rename sweep already exempts them for the
   same reason), rewrite-plan.md (the root-level v2 clean-slate
   rewrite plan, a historical record of the old surface), and
   docs/tasks/task-tools-overhaul/spec.md (the effort's own spec,
   this slice's cited design context). No living doc needed editing
   beyond docs/repo-gating.md, which matches the arch spec's claim
   once these are classed as historical.
2. **Verifier-allowlist assertion updated** (read, bash to read,
   bash, submit_feedback): mandated by the user-approved exception,
   which changes the value the test pins. Intended, not a forced
   edit.
3. **gate-factory describe restructuring.** The before_agent_start
   guidelines describe is removed with the deleted hook; its
   strip-handler test survives under a renamed before_agent_start
   describe; the personal-repo test now asserts no before_agent_start
   handler at all (the old count-of-one assertion was testing the
   deleted handler).
4. **Surviving tests re-seated off deleted tools** (assertions
   untouched): the tw_map_finalizable all-done test edits the map
   array directly instead of calling the deleted tw_map_tick; the
   three task-branch tw_dependency_levels tests became one v3
   map-fallback test (selector auth, seeded via an sso task file),
   and the integration round-trip moved to the map selector,
   because the branch they exercised is the deleted one.
5. **SKIP_DIRS corpus check scoped to src/.** A package-wide literal
   check would false-positive on vendored .agents/ scripts that carry
   their own unrelated SKIP_DIRS; the arch spec's sole-user
   parenthetical reads as a scoping rule.
6. **Minor dead-clause removals** in the tw_finalizable and
   tw_dependency_levels descriptions and the src/pi.ts header
   comment, where the deletion falsified the claims; removal only,
   no new claims added.
7. **Pre-existing dead code left alone.** The Bool helper in src/pi.ts
   and the unused type Artifact import in tests/art.test.ts were
   already unused at HEAD; removing them is outside this ticket's
   scope.
8. **v3 fallback edge.** tw_dependency_levels' v3 array fallback
   silently skips map children with no task file on disk
   (pre-existing mapChildInfos semantics, unchanged here; the one
   new fallback test seeds an sso task file to cover a real
   two-level chain).
