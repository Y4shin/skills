---
type: deviation report
title: Deviation report for migration-target-and-upgrade-resource
status: stable
---

## Deviation report: migration-target-and-upgrade-resource

### API surface changes
- **Planned:** The ticket names no code API; its deliverables are the
  schema-5 `docs/migration-target.yaml`, the new
  `skills/engineering/setup-workflow/resources/upgrade-4-to-5.md`, a version
  table that routes a v4 repo to that resource, and a green
  `tests/setup-workflow-scripts.test.ts`. The arch spec's contract (entry 6)
  says: export the schema-5 target and the upgrade guide; `setup-workflow`
  routes a v4 repo to the new guide.
- **Actual:** All four criteria landed as specified. One small surfaced
  contract detail: the guide documents the landed CLI output recorded by
  `migrate-v4-to-v5` (`MigrateReport.to` is `5`, the no-op message names
  `schema_version 5`), so the prose contract of `src/migrate-cli.ts` is now
  pinned by this ticket's resource and test. No module, tool, or function
  signature changed in this ticket.
- **Impact:** No dependent ticket calls anything new. Two downstream notes:
  `overview-doctor-rescope` and `docs-resync` still own the v4-sounding
  prose in `CONTEXT.md` and the doctor/overview skills (untouched here, as
  the spec assigns them); the coherence pass should look at the onboard
  branch's `docs/bugs/` scaffold, which now contradicts the target file's
  "static archive" statement.

### Abstraction usage
- Used/was specified: yes. The ticket reuses the established upgrade-resource
  shape (`upgrade-3-to-4.md` as the pattern), the existing
  `tests/skills.test.ts` skill-surface seam, the existing
  `tests/setup-workflow-scripts.test.ts` CLI seam, and the landed
  `src/migrate-cli.ts` behavior as the source of truth for the guide's
  transcript (captured verbatim from a real fixture run, byte-stable no-op on
  the second run). No parallel mechanism was invented.

### Out-of-scope changes
Four additions beyond the ticket's four named criteria, each forced or
anchored:

1. **`tests/skills.test.ts` updated (foreign test file).** The
   `setup-workflow v4` describe block became `setup-workflow v5`
   (detection keys on 5, the no-op message names 5, onboard writes the v5
   stamp, v4 routing and resource-shape tests added). This is the arch
   spec's own version bump (module map: "setup-workflow: version table plus
   `upgrade-4-to-5`"); the assertions' intent (the skill keys detection on
   the current schema and names its resources) is untouched. Same pattern
   `migrate-v4-to-v5` recorded for `tests/fs-port.test.ts`.
2. **`docs/engineering/setup-workflow.md` re-synced** (current is 5, the
   jump is to 5, `upgrade-4-to-5` named). Not named in the ticket; required
   by the project rule that a skill's docs page re-syncs with any behavior
   change, and by the arch spec's prose seam.
3. **`docs/migration-target.yaml` rewritten beyond the four named content
   areas.** "Bring the target to v5 in one consistent state" forced the
   adjacent sections: the v3-era file promoted `triage`,
   `implement-task`, `finalize-task` (all retired in v5), ended the phase
   chain at `implement-task`, described `docs/bugs/` as live, and listed
   `telemetry_skill_context` as a maintained model tool. Every replacement
   comes from the arch spec's settled decisions; a deviation entry (id 7)
   records the landed CLI output.
4. **`setup-workflow/SKILL.md` prose beyond the bare detection table.** The
   backup-branch name, both commit messages, the CLI transformation summary,
   and the target-state note moved from 4 to 5 so the skill stays internally
   consistent (without them, onboarding would stamp a repo the skill's own
   detection calls "behind").

Also recorded: the arch spec lists setup-workflow under "Unchanged in
scope"; this ticket reads that as unchanged in phase scope, not byte-frozen,
because the module map explicitly assigns the version table and the upgrade
resource to this ticket.

### Ticket doc update needed?
Yes. Append to `## Implementation notes`: the four out-of-scope items above
(with their justifications), the verbatim-captured CLI transcript provenance
(fixture lacked `index.md`/`CHANGELOG.md`, so those backfill lines appear),
the no-primary multi-doc corner (hoist plus destination-collision report
rather than in-place rename; no-loss backstop), and the residual-risk bullets
(onboard scaffold still creates `docs/bugs/`; `package_version: "4.0.0"` is
the authoring-time version).

### User attention needed?
No. The API surface is unchanged, and every expansion is anchored in the
arch spec's module map or the repo's standing project rules. One mild spec
ambiguity ("Unchanged in scope" versus the module map's explicit assignment)
was resolved in favor of the more specific instruction and is recorded here;
it did not change what got built.
