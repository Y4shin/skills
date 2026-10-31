---
type: deviation report
title: Deviation report for end-of-effort-reconciliation
status: stable
---

## Deviation report: end-of-effort-reconciliation

Diff range: `stricter-workflow..ticket/end-of-effort-reconciliation` (the
landing branch does not exist yet, so the template's
`task/<slug>..ticket/<slug>` range is empty). 57 files, 1452 insertions, 1202
deletions, 14 commits. Verified at the branch tip: `npx tsc --noEmit` exit 0,
`npx tsc -p tsconfig.test.json` exit 0, `npx vitest run` green at 18 files and
1170 tests against the 1146 baseline at `5c7aa33`.

### API surface changes

- **Planned:** one new named writer for the ticket doc, two path exemptions in
  the write guard, and the ticket doc's implementation note moved off the
  built-in `edit`.
- **Actual:** `tw_write_ticket_note` is registered gated (`exposure: "direct"`,
  `defaultActive: false`), takes `selector` / `note` / `replace`, refuses an
  empty note, a non-ticket, and an archived ticket, and is disclosed to
  `implement-ticket`. `isTaskTreePath` gained `LOCKDOWN_EXEMPT_SEGMENTS`
  (`.work`, `deviation-reports`) and `lockdownReason` now names both the
  exemptions and the writers. `agents/land-worker.md` trades `edit` for
  `tw_write_ticket_note` in its `tools:` allowlist, so the note is its only
  write path.
- **Actual, beyond the plan:** `tw_show` joins `wayfinder`'s toolset and stays
  in `skill-creator`'s, whose signature tool is now `skill_validate`. The
  registry comment is corrected. `setup-workflow` stops scaffolding
  `docs/bugs/` and `docs/bugs/archive/`.
- **Impact:** the guard's contract is now "the named tools are the only
  writers of `docs/tasks/**`, except scratch and evidence beside an artifact".
  Tests pin both directions: the exemptions pass, and
  `.work/../../ticket.md` and `deviation-reports/../../ticket.md` stay blocked,
  so traversal cannot smuggle an artifact write through an exempt segment. No
  dependent ticket exists; this is the effort's last one.

### Abstraction usage

- Used/was specified: yes. The ticket's section 6 asked for extraction, and
  both extractions are real rather than wrappers:
  `writeEffortRootArtifact` (`src/pi.ts:815`) holds the empty-body guard, the
  create-or-refuse message, and the title fallback once, with the per-kind
  validation and after-write note passed as hooks; `writeTasksIndex`
  (`src/pi.ts:1143`) sorts both lists and serves both call sites, which is what
  fixes the drift. The new writer reuses `resolveArt`, `readMapSection` /
  `writeMapSection`, and the frontmatter seam. The reachability claim in
  hazard 4 was settled by reading pi core (`_refreshToolRegistry`:
  `allowedToolNames.has(toolName) && _isDeclarable(toolName)` activates
  regardless of `defaultActive`) and pinned at the integration seam by giving
  the harness a `tools` option that reaches the real session factory.

### Out-of-scope changes

- **Em-dash sweep crossed two boundaries.** The ticket said to widen the guard
  "with the exemptions the other corpus checks already carry". The guard
  instead exempts only `docs/tasks/CHANGELOG.md`, so historical records the
  other checks exempt were rewritten rather than skipped: `rewrite-plan.md`
  (46 lines) and `arch-quality-plan.md` (22 lines), neither named by the
  ticket. `rewrite-plan.md` is in `DEAD_SURFACE_EXEMPT_FILES`, so the ticket's
  own instruction would have exempted it. Worse, the rewrites land inside
  fenced code blocks in `arch-quality-plan.md`, editing the sample deviation
  report the document illustrates (`## Deviation report -- env-loading` became
  `## Deviation report: env-loading`), which is example content rather than
  prose. The guard's comment claims "plus the historical records those checks
  already exempt" and the code does not do that. Harmless in outcome (the
  corpus is em-dash free and the changelog happens to have none anyway), but
  the exemption set and the comment disagree, and the guard will keep forcing
  punctuation edits inside code examples.
- **Five doctor resources deleted** (`missing-state-yaml`, `missing-dev-env`,
  `missing-testing-md`, `missing-adr-dir`, `manifest-misconfigured`). The
  ticket said to narrow the section to the two scopes and pin it; deleting the
  now-orphaned resources follows, and the SKILL.md, the docs page, and a new
  pin all agree. The sharper question is whether the doctor should still
  recognise a missing `state.yaml`: it can no longer tell the reader that, and
  no other surface owns that diagnosis.
- **`setup-workflow` no longer scaffolds `docs/bugs/`.** Not named in the
  ticket, but coherent with section 4: a fresh repo was being given a directory
  the spec retired. It flips a landed test pin and the docs page in the same
  commit.
- **Story 26 amended as well as 28.** Both carried the same now-false
  concurrency claim, so amending one would have left the other lying.
- **"Decision task" also retired from `wayfinder`'s description and page and
  the doctor's `missing-tasks-tree` resource**, not only the overview and the
  landed test. Same vocabulary finding, wider sweep, correct in substance.
- **A corpus exemption for `docs/tasks/enforced-workflow-v5/`** in the
  dead-surface pin. Consistent with the existing precedent for historical
  effort directories, but note it exempts the live architecture document too,
  so a future live amendment inside that effort may name a deleted tool
  without failing.
- **`tests/integration/harness.ts` gained a `tools` option** and the file was
  type-cleaned, so the reachability claim is testable. Test infrastructure,
  outside the ticket's list, in service of hazard 4.
- **A rebase removed an accidentally staged `docs/tasks/state.yaml`** from the
  first checkpoint. History hygiene, no content change: `git log --
  docs/tasks/state.yaml` still ends at `8e1080c`.

### Ticket doc update needed?

Yes. Append to `## Implementation notes`:

The writer's reachability was settled as a fourth option, not one of the three
the ticket offered: `tw_write_ticket_note` stays gated and is disclosed to
`implement-ticket`, while `land-worker`'s `tools:` allowlist activates it in
its own session. pi core's `_refreshToolRegistry` activates a declarable tool a
session's allowlist names even when `defaultActive` is false, and
`tests/integration/disclosure.test.ts` now pins that at the harness seam; the
harness gained a `tools` option to reach it. `edit` is gone from
`land-worker`'s allowlist, so the named writer is its only write path.
`tw_show` is disclosed to `wayfinder` (the phase the read-only table sends the
reader to) and stays in `skill-creator`, whose signature tool is
`skill_validate`; the registry comment is corrected. Five doctor resources were
deleted with the narrowed scope, and `setup-workflow` stops scaffolding
`docs/bugs/`, which section 4 implies but does not name. The em-dash guard runs
over the corpus but exempts only `docs/tasks/CHANGELOG.md`, so two historical
planning documents were rewritten rather than skipped, including sample content
inside fenced code blocks.

Verification at the branch tip: `tests/skills.test.ts` green, full suite 18
files and 1170 tests against the 1146 baseline at `5c7aa33`, `npx tsc --noEmit`
and `npx tsc -p tsconfig.test.json` both exit 0. Acceptance checkboxes stay
unticked, matching every other landed ticket in this effort.

### User attention needed?

Yes. One acceptance criterion is not fully met, and one scope decision should be
confirmed before landing.

1. **Criterion 3 is half-met: `tw_state` is still unreachable from the rows
   that name it.** The overview's "Where am I?" row says to open
   `/skill:wayfinder` or `/skill:implement-ticket` and then call `tw_state`, but
   `tw_state` is disclosed only by `intake`. Every other row checks out; I
   verified all six against the registry. The new pin cannot catch this because
   it asserts that *some* phase discloses each tool rather than that the phase
   the row names does. Either add `tw_state` to `wayfinder`'s toolset (it
   already carries `tw_state_set`, so a phase that writes the pointers but
   cannot read them is the odd part), route the row to a phase that has it, or
   narrow the criterion deliberately and strengthen the pin to match.
   `docs/engineering/task-workflow-overview.md:32` repeats the same false
   claim.
2. **The em-dash sweep went past the ticket's stated exemption rule.** Confirm
   that rewriting `rewrite-plan.md` and the sample content inside
   `arch-quality-plan.md`'s fenced blocks is wanted, or exempt historical
   records and code fences as the ticket described. If the current reading is
   kept, correct the guard's comment, which claims exemptions the code does not
   apply.
