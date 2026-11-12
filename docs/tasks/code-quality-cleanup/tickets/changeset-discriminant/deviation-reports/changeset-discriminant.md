---
type: deviation report
title: Deviation report for changeset-discriminant
status: stable
---

## Deviation report: changeset-discriminant

### API surface changes
- **Planned:** the architecture's per-ticket contract for ticket 2 says this
  ticket "adds the discriminant to `Proposal` and `WriteOutcome` and narrows at
  the tool handler, deleting the assertion. Keeps every existing field, so the
  changeset suite's assertions survive untouched. Hands the split tickets a
  changeset module whose types no caller asserts." The specification's
  "Changeset discriminant" decision repeats it, and `map.md` records that "the
  exact spelling belongs to the ticket".
- **Actual:** exactly that shape. `src/core/changesets.ts` gains
  `kind: "proposal"` on `Proposal` and `kind: "write"` on `WriteOutcome`, and
  every constructor sets the literal: `proposeEntries`, the success return of
  `resolveProposal`, `refusedProposal`, and both returns of `writeEntries`. The
  internal `ResolvedProposal` inherits `kind: "proposal"` from `Proposal`, so the
  one refusal path is covered. `src/pi.ts`'s `tw_write_changesets` handler
  replaces `const written = dryRun ? [] : (resolved as WriteOutcome).written;`
  with `const written = resolved.kind === "write" ? resolved.written : [];` and
  drops the now-unused `type WriteOutcome` import. The other fields (`refusal`,
  `written`, `entries`, `skipped`, `generic`, `diagnostics`) and the `workspace`
  field on the internal type are byte-identical, and the only handler lines that
  moved are that assignment plus a two-line comment. The spelling choice (`kind`)
  matches the discriminant name `src/core/art.ts`, `git-profile.ts`, and
  `migrate.ts` already use, which is the convention the map's "spelling belongs to
  the ticket" clause points at.
- **Impact:** ticket 4 (`extract-tool-families`) and ticket 5 (`trim-the-entry`)
  move the changeset tool into the release family and must carry both `kind`
  literals and the narrowing expression with it; nothing in the suite pins the
  discriminant's presence beyond `tests/changesets.test.ts`, so a move that drops
  the literals fails only that file. The map's inventory entry "`src/pi.ts` line
  3667 tells the changeset proposal and write outcomes apart with `(resolved as
  WriteOutcome).written`" is now stale: that string no longer exists anywhere
  (`grep -rn "as WriteOutcome" src/ tests/` returns nothing), so a corpus pin
  copied from that line during ticket 4 has no subject. Note for whoever reads the
  tool result: the discriminant is deliberately **not** on the tool's `details`
  object, because the ticket asks for the outcome types to carry it and for every
  existing field and printed line to stay unchanged. Making it visible on the tool
  surface would be a one-line addition per `details` object in the handler and is
  not planned by this effort.

### Abstraction usage
- Used/was specified: **yes**. The change is built on the two exported types the
  architecture names in "Existing abstractions to use" (`Proposal` and
  `WriteOutcome` in `src/core/changesets.ts`), with no new type, no shared base
  interface, no helper, and no second guard. Nothing was reimplemented and no new
  module or export appeared. The test additions reuse the file's existing
  `fixtureRepository`, `changesetFiles`, and `join` fixtures rather than building
  a second repository harness, and the discriminant assertion lives at the seam
  the architecture names as "the changeset outcome".

### Out-of-scope changes
- **One test file changed:** `tests/changesets.test.ts` gains 39 lines, all
  additions (no deletion in the file by `git diff --numstat`), made of two
  imports (`writeEntries`, `type Proposal`, `type WriteOutcome`) and a
  `describe("the changeset outcome")` block with two cases. This is not drift: the
  specification's "The changeset outcome" prior-art paragraph and the ticket's
  fourth criterion both require a case that reads the narrowing field. The
  existing changeset assertions keep their subjects; the diff touches none of
  them.
- **Two source files touched, both named by the ticket:** `src/core/changesets.ts`
  (13 insertions, 1 deletion, the deletion being the `refusedProposal` one-liner
  reformatted to carry `kind`) and `src/pi.ts` (3 insertions, 2 deletions).
- **No changeset entry authored.** The ticket carries no changeset criterion and
  the architecture's per-ticket contract does not ask for one; the
  specification's story 23 puts the effort's own changeset at the effort's
  finalize step, not at this ticket. Recorded so the absence is a decision rather
  than an oversight, and to match what the `shape-helpers-module` report recorded.
- **No doc, prose, profile, gate, or README change.** `docs/tasks/state.yaml`
  carries an uncommitted one-line workflow pointer (`task: changeset-discriminant`)
  that is not part of the implementation diff.

### Ticket doc update needed?
**Yes.** Append to `## Implementation notes`:

> The discriminant is `kind`, with the literals `"proposal"` on `Proposal` and
> `"write"` on `WriteOutcome` in `src/core/changesets.ts`. Every constructor sets
> it (`proposeEntries`, `resolveProposal`'s success return, `refusedProposal`, and
> both returns of `writeEntries`), and `ResolvedProposal` inherits the proposal
> literal through `Proposal`. The handler in `src/pi.ts` narrows with
> `resolved.kind === "write" ? resolved.written : []` and the `type WriteOutcome`
> import is gone, so the assertion the map named at line 3667 has no replacement
> string in the tree. The discriminant stays off the tool's `details` object: the
> ticket asks for the outcome types to carry it and for the tool's fields and texts
> to stay unchanged, so a byte-identical `details` is the narrower reading.
> `tests/changesets.test.ts` gains a `the changeset outcome` block: a proposal is
> typed `Proposal | WriteOutcome`, its discriminant is read, and `proposal.written` is
> read under `@ts-expect-error` so the compile-time half of the criterion lives in
> `npm run typecheck:tests`, not in the vitest run (vitest strips the directive).

### User attention needed?
**No.** The tool surface, every printed line, and every `details` field are
unchanged, and no dependent ticket needs a different integration point than the
architecture already names. Two things a reviewer should read twice, neither a
defect:

1. The discriminant field is **required** on two exported interfaces in a package whose
   `files` list ships `src`, so this is additive for readers of the two types but
   breaking for any out-of-repo code that constructs a `Proposal` or
   `WriteOutcome` literal. No in-repo consumer constructs either object outside
   `src/core/changesets.ts` (`grep -rn "Proposal" src/ tests/` finds only the
   module and the three test references), so the break is theoretical today.
2. The handler now has two parallel sources of truth for the same question: the
   `dryRun` flag still drives the three printed branches and `details.dry_run`,
   while `kind` drives only the `written` read. They cannot disagree under the
   current call shape (`dryRun` selects which function runs), but a later edit that
   passes a proposal to the non-dry-run path would print the write branches over an
   empty `written`. Restructuring to a single discriminant read is possible and out
   of scope here.

**Verification run for this report** (on `ticket/changeset-discriminant`, commit
`3279f9a`, base `main` at `cb6b591`): `npm run typecheck` clean,
`npm run typecheck:tests` clean, `npx vitest run` 29 files / 1590 tests passed.
`grep -rn "as WriteOutcome\|as Proposal" src/ tests/` returns nothing, and
`git diff main...HEAD --numstat` is 13/1 `src/core/changesets.ts`, 3/2
`src/pi.ts`, 39/0 `tests/changesets.test.ts`.
