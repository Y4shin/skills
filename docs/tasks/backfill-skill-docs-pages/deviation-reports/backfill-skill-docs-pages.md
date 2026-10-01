---
type: deviation report
title: Deviation report for backfill-skill-docs-pages
status: stable
---

## Deviation report: backfill-skill-docs-pages

Implementation: `ticket/backfill-skill-docs-pages` (commits `80cfeb6`
RED, `64a8ac1` GREEN), diff against `task/backfill-skill-docs-pages`.

### API surface changes

- **Planned:** None. The arch spec's interface contract reads "None: this
  is the last ticket on the task-tools-overhaul frontier; the pages are the
  user-facing surface, and nothing consumes them programmatically except
  the structure tests."
- **Actual:** None. The diff is exactly 27 new pages
  (`docs/engineering/` 22, `docs/productivity/` 5) plus an 87-line
  extension of `tests/skills.test.ts`. No code, exports, tool surface,
  `package.json`, agents, or SKILL.md changes.
- **Impact:** None; no dependent tickets exist on the effort frontier.

### Abstraction usage

- Used/was specified: **yes**, all of them.
  - The presence test derives from `pkg.pi.skills` (a small
    `promotedSkill` split helper), never a hardcoded list.
  - Seam 4 reuses the existing `expectOnlySurvivingTools` helper and the
    `SURVIVING_TOOLS` set.
  - `tests/skills.test.ts` was extended, not a new file; no docs tooling
    or scripts were added.
  - The two existing pages served as the tone/density reference; the new
    pages match their register.
  - No bucket-README or top-level README changes; no pages for
    `misc/`, `in-progress/`, `deprecated/` skills.

### Out-of-scope changes

- None found. `git diff --name-status` lists only the 27 page additions
  and the test modification.
- The two pre-existing pages (`eval-review`, `handoff`) were checked and
  left unedited: both conform structurally and their SKILL.md files are
  unchanged, so the slice's "re-synced where wrong" scenario had nothing
  wrong to fix. The four-section conformance is now permanently enforced
  by seam 2.

### Deviations from the plan (minor, recorded)

1. **Guard seams 3 and 4 were green on arrival.** The non-promoted-pages
   guard and the surviving-tools check cannot fail before any page exists
   (no non-promoted page exists; no page names a deleted tool). Forcing
   RED would have meant creating pages or naming tools just to delete
   them. The ticket test plan's failure modes (missing page, missing
   section, failing by name) are covered by seams 1 and 2, which did go
   RED listing exactly the 27 missing pages. The tdd-worker documented
   the exception in its result. Accepted as a guard-invariant reading of
   the spec's own "pins the positive set" language.
2. **Page-content inaccuracy in `docs/engineering/implement-task.md`:**
   it says the feature chain dispatches "a deviation-reporter when
   verification fails". The actual chain (per
   `skills/engineering/implement-task/resources/feature/autonomous.md`)
   runs slice-verifier and deviation-reporter in parallel via
   `runs.all`, with an ok-gate blocking landing on both; deviation
   reporting is unconditional, not failure-triggered. This is exactly
   the factual-drift class the structure tests cannot catch (the
   tdd-worker's own residual risk). One-line fix recommended for the
   effort's coherence pass.
3. **Independently re-verified by this reporter:** 29 pages present, H1
   equals the skill name on every page, the four sections in order, no
   em- or en-dashes under `docs/engineering/` or `docs/productivity/`,
   no deleted tool or guidelines-machinery names in any page, all
   `/skill:` references resolve to real skill directories, and the ten
   user-invoked skills' pages state the typing requirement. The seven
   flow pages, `setup-workflow`, `code-review`, and `tdd` pages were
   read against their SKILL.md sources; all v4 facts (effort-grouped
   tree, task/ticket vocabulary, surviving tools, `mode: human`
   hard-refusal, v4 migration branches, standards direct reads) check
   out except item 2 above.

### Ticket doc update needed?

Yes, when the land-worker appends the implementation note, it should
record: (a) the guard-seam exception (seams 3 and 4 green on arrival by
design), (b) the known one-line inaccuracy in
`docs/engineering/implement-task.md` flagged for the coherence pass,
and (c) that `eval-review` and `handoff` were verified conforming and
deliberately left untouched.

### User attention needed?

No. No scope change and no API surface difference; all four acceptance
criteria are met (verified independently against the diff and the
suite). The implement-task page wording is a one-line coherence item,
not a decision.
