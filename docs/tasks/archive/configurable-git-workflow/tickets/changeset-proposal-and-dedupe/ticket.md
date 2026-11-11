---
type: ticket
subtype: feature
title: Propose changesets before writing, and keep the dedupe honest
status: deprecated
workflow_state: done
blocked_by:
- changeset-authoring
size: s
---

## What to build

Effort close proposes changeset entries before writing them, and the duplicate
check stays trustworthy when one staged file cannot be parsed. The landed
authoring tool writes in the same call that resolves the entries, so the operator
confirms after the fact, and one malformed staged file makes the tool blind to
everything already staged.

## Acceptance criteria

- [ ] A pre-write proposal surface returns the entries that would be written,
      the entries skipped as already staged, and whether the generic entry applies,
      without touching the filesystem. A dry-run option on the existing writer or a
      separate read tool both satisfy this.
- [ ] The effort close's prose path can show that proposal and write only after
      confirmation, which is the settled flow.
- [ ] Reading staged entries distinguishes "nothing staged" from "could not read".
      An unreadable staged entry refuses the write with a named reason instead of
      silently emptying the staged set and writing a duplicate generic entry.
- [ ] Package validation accepts every package the workspace reader knows about,
      including a monorepo's root package, and the generic entry is validated like
      any other.
- [ ] Regression tests cover the malformed-staged-file case by asserting that no
      second identical generic entry appears.
- [ ] The full suite stays green.

## Blocked by

- `changeset-authoring`, whose module and tool this extends

## Implementation notes

### What landed

The effort close now proposes changeset entries before writing them, and the
duplicate check survives an unreadable staged file.

- `tw_write_changesets` takes an optional `dry_run`. With it the tool runs the
  same workspace read, config read, validation, generic fallback, and dedupe, and
  stops before the write. It answers with the entries it would write, the entries
  skipped as already staged, whether the generic entry applies, `written: []`, and
  a result text saying nothing has been written. A dry run refuses in exactly the
  cases the write refuses.
- A dry-run flag rather than a fifth tool, because the architecture pins the
  surface at four tools and a new tool would also need disclosure and three
  registration pins.
- `readStagedEntries` now distinguishes "nothing staged" from "could not read".
  An unreadable staged entry refuses the write with a named code, so a malformed
  file can no longer empty the staged set and let a duplicate generic entry through.
- Validation accepts every package the workspace reader knows about, including a
  monorepo root, and the generic entry is validated like any other.
- The effort close's prose gained the three-step flow: propose with `dry_run`,
  show the answer, write after confirmation. Its report resource now names the
  changesets the effort authored.

### Lessons

- The refusal's reason names the unreadable file, which the operator can then fix,
  rather than only saying the staged set was unreadable.
- The regression test asserts that exactly one file carries the generic summary
  after a refused write, which is the property the earlier ticket's criterion
  claimed and did not hold.
- The prose for proposing before writing now lives in the effort close, so the
  later prose ticket only has to reconcile naming and the tool references.
