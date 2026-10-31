---
type: deviation report
title: Deviation report for grilling-delegation-fix
status: stable
---

## Deviation report: grilling-delegation-fix

Verified against the implementation on branch `ticket/grilling-delegation-fix`
(five wip commits from `stricter-workflow` at `462c8a0`), prose seam and
skills suite green (463 relevant tests; full suite 1005 passing across 18
files per the TDD report).

### API surface changes
- **Planned:** arch-spec entry 12: "exports the single grilling-method home.
  Contract: every pointer resolves to the `grilling` skill; no resource
  restates the method." No named exports were promised.
- **Actual:** no new exports. The landed change is prose plus test seams:
  `improve-codebase-architecture` (SKILL.md and its docs page) now delegates
  its grilling session to the `grilling` skill; the router correction in
  `implement-task/SKILL.md` was already delivered by
  `wayfinder-reconcile-and-passes`, so this ticket pinned it with tests
  (seam 2e delegation/no-restatement in `tests/skill-rewire.test.ts`, seam 2f
  no-router-denial, plus `tests/skills.test.ts` assertions inverted from
  requiring the old method string to forbidding it).
- **Impact:** none on dependent tickets. `docs-resync` (20) inherits two
  wording notes recorded below; no interface or tool surface changed.

### Abstraction usage
- Used/was specified: yes. The ticket builds entirely on the landed prose
  seam (`tests/skill-rewire.test.ts` extended, not replaced) and the
  skills-surface seam (`tests/skills.test.ts`). No new mechanism was
  invented; no `tw_*` writer was needed because the blockers were satisfied
  by landed state rather than frontmatter edits.

### Out-of-scope changes
- The implementation note was recorded as a separate
  `implementation-notes.md` under the ticket directory instead of being
  appended to the ticket doc's `## Implementation notes` section, the
  convention the ten previously landed tickets follow. The content itself is
  accurate; only its location diverges. Recommend the land step normalize
  this (append the note to `ticket.md`) so `docs-resync` and the coherence
  pass read one convention.
- The TDD worker adopted a pre-existing `ticket/grilling-delegation-fix`
  branch at dispatch rather than creating it (process note, no code impact).
- The `spec.md` inline-architecture note planned by
  `to-tickets-architecture` was judged unnecessary (the migration already
  moved the architecture into `arch-spec.md`); recorded in the
  implementation note so the coherence pass does not repeat it.

### Ticket doc update needed?
Yes, minor: append a `## Implementation notes` section to the ticket doc
(either moving the `implementation-notes.md` content in or pointing at it),
matching the landing convention of the other landed tickets. No acceptance
criterion text needs changing; all four criteria are met on the branch.

### User attention needed?
No. No scope changed, no planned surface shrank or moved: the three prose
obligations were either already satisfied upstream (router denial removed by
`wayfinder-reconcile-and-passes`, `wayfinder/resources/grilling.md` already a
thin pointer) or landed here (`improve-codebase-architecture` delegation),
and every remaining "one question at a time" match in the tree is either
intentional (survey-stop phrasing, the prototype skill's own question) or
inside the effort's own records, which this ticket must not rewrite.

### Carry-forward notes for pending tickets
- **`docs-resync` (20):** `docs/engineering/wayfinder.md` still describes
  grilling as "resolve a human decision through conversation", pre-round
  phrasing worth aligning; and the `improve-codebase-architecture` docs page
  keeps an intentional "asks exactly one question" line about its
  candidate-pick survey stop that a future reader could confuse with the
  grilling method. Both are wording alignments, not code.
- **Coherence pass:** the separate `implementation-notes.md` location (if not
  normalized at land) should be folded back into the ticket doc.
