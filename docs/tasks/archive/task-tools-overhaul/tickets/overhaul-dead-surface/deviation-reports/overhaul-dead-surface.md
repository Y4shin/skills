---
type: deviation report
title: Deviation report for overhaul-dead-surface
status: stable
---

## Deviation report: overhaul-dead-surface

Verification basis: `git diff task/overhaul-dead-surface..ticket/overhaul-dead-surface`
(13 files, +173/-1089, 3 commits: the approved exception first, then RED
tests, then the GREEN deletions), the source read on the ticket branch,
and a fresh independent run of the gates: `npm test` 728/728 across 14
files, `npm run typecheck` exit 0. The registered surface after deletion is
exactly the arch spec's contract (eleven `tw_*` survivors plus
`notify_user`, verified against `createTools()`). Every keep was verified:
`notify_user` byte-identical (zero mentions in the `src/pi.ts` diff),
`mapChildInfos` and `taskPathForSlug` present, `itemFinalizable`'s v3
status fallback present, `tw_dependency_levels`' map branch present with
its v3 array fallback, dual-shape parsing intact in `art.ts`. The
package-wide grep for the deleted names finds hits only inside the
exemption set.

### API surface changes

- **The deleted surface (planned, landed as spec'd).** Six tools, the
  guidelines feature and its machinery, and the slice machinery removed
  end to end; `tests/guidelines.test.ts` deleted as a file; deleted-tool
  test coverage removed, never skipped. No surviving tool's contract
  changed.
- **Description dead-clause removals (removal only).** The
  `tw_finalizable` and `tw_dependency_levels` descriptions and the
  `src/pi.ts` header comment dropped clauses describing the deleted slice
  behavior (the task branch, the slice-file gate). This is the arch
  spec's "no description rewording beyond removal" applied to claims the
  deletion falsified; no new claims were added.
- **The user-approved exception landed as spec'd.** `submit_feedback`
  added to the four chain agents' `tools:` lines, one word per file,
  committed first.
- **Impact:** the shrunken surface is pinned by exact-equality
  registration assertions in `tests/plugin.test.ts` and
  `tests/gate-factory.test.ts` (GATED_NAMES now twelve tools), so a
  re-registered deleted tool fails the suite. No dependent ticket
  remains before the effort tail (`backfill-skill-docs-pages`), whose
  docs pages must describe this final surface.

### Abstraction usage

Used/was specified: yes. The corpus assertion extends the rename sweep's
exemption-set pattern (`DEAD_SURFACE_NAMES` plus
`DEAD_SURFACE_EXEMPT_FILES`/`PREFIXES` in `tests/skills.test.ts`), with
the sweep file itself exempted exactly as the arch spec's contract
listed. No new conformance or sweep machinery was invented; the RED
corpus run failed on exactly the predicted offender set before any
deletion happened, which validated the exemption design up front.

### Out-of-scope changes

All disclosed by the implementer, all verified here, none contradicting
the spec's intent:

- **Corpus exemption-set additions (four paths).** The arch spec defined
  the historical-record class but its enumeration missed
  `docs/tasks/tool-surface-inventory/` and
  `docs/tasks/workflow-tool-usage-audit/` (the effort's research trees
  recording the old surface; the rename sweep already exempts the same
  trees), `rewrite-plan.md` (the root-level v2 clean-slate plan, a record
  of the old surface), and `docs/tasks/task-tools-overhaul/spec.md` (the
  effort's own design spec, this slice's cited design context). All four
  are historical or design records of the surface as it was; exempting
  them is the class-consistent reading (the alternative, editing
  records to remove the names, would falsify them). No living doc needed
  editing beyond `docs/repo-gating.md`, which matches the spec's claim
  once these are classed as historical.
- **Verifier-allowlist assertion flip.** The
  `tests/skills.test.ts` slice-verifier `tools` assertion pinned
  `read, bash` and now pins `read, bash, submit_feedback`: the
  user-approved exception changes the value the test pins. Intended, not
  a forced edit.
- **gate-factory describe restructuring.** The "before_agent_start
  guidelines injection" describe is removed with the deleted hook (its
  subject no longer exists); its surviving strip-handler test was
  re-homed under a renamed `before_agent_start` describe; the
  personal-repo assertion now asserts no `before_agent_start` handler at
  all, because the old count-of-one assertion was testing the deleted
  handler. Coverage preserved where the subject survives.
- **Re-seated surviving tests.** The `tw_map_finalizable` all-done test
  edits the map array directly instead of calling the deleted
  `tw_map_tick`; the `tw_dependency_levels` task-branch tests became one
  v3 map-fallback test (the deleted branch's surviving sibling), and the
  integration round-trip moved to the map selector. Assertions preserved,
  mechanics moved off deleted tools.
- **SKIP_DIRS check scoped to `src/`.** The arch spec's "(only where
  discovery is its sole user)" parenthetical read as a scoping rule; a
  package-wide literal check would false-positive on the vendored
  `.agents/skills/impeccable` scripts, which carry their own unrelated
  `SKIP_DIRS` (verified).
- **`docs/repo-gating.md`** dropped the two guidelines names from both
  spots they appeared (the gated-list mention and the injection bullet);
  removal only, wording otherwise untouched.

Pre-existing dead code was correctly left alone (the unused `Bool`
helper, an unused type import): outside this ticket's scope.

### Ticket doc update needed?

Yes: the land-worker's Implementation note should record (a) the four
exemption-set additions as the sweep's historical-record precedent,
(b) the verifier-allowlist assertion flip as the approved exception's
test-side consequence, and (c) the re-seated tests, so later readers see
they were intentional. The transition note (this chain ran on the new
`ticket/` branch convention, the first to do so) is worth one line.

### User attention needed?

No. No scope changed: the only addition was the pre-approved
`submit_feedback` exception, and the exemption-set additions are
class-consistent historical records rather than a contract change. The
slice doc's acceptance criteria all hold on independent verification.
