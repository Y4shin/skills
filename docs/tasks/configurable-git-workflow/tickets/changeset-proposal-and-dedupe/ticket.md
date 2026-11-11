---
type: ticket
subtype: feature
title: Propose changesets before writing, and keep the dedupe honest
status: stable
workflow_state: ready
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
