---
type: deviation report
title: Deviation report for readme-order
status: stable
---

## Deviation report: readme-order

### API surface changes

- **Planned:** the architecture's per-ticket contract for ticket 3 says the
  ticket "moves the one out-of-order entry and adds the order assertion to the
  existing README test, deleting nothing from the membership checks". The
  "Documentation order" decision spells the assertion out: "the test that pins
  the top-level order compares the file's list unsorted against a **sorted
  expectation**, following the pattern the suite already uses where it compares
  a document's section order against its own sorted copy." "Do not reimplement"
  adds "do not add ... a new ordering comparator. Both exist in the suite."
- **Actual:** the README move is exactly as planned: one entry moves, and it is
  `operator-communication`, from the tail of the model-invoked list to the head
  of its productivity group. The assertion is not a plain sorted expectation. A
  local helper in the same `describe` block builds it:

  ```ts
  function dictionaryOrder(skills: string[]): string[] {
    return [...skills].sort((a, b) =>
      a.replace(/-/g, "").localeCompare(b.replace(/-/g, "")),
    );
  }
  ```

  The reason is measured, not stylistic: a plain `.sort()` over
  `<bucket>/<name>` orders `engineering/code-review` before
  `engineering/codebase-design`, because `-` (`0x2D`) precedes every letter, and
  `localeCompare` on the raw strings agrees in this ICU build. Obeying a plain
  sort therefore requires **two** README moves
  (`code-review` up as well as `operator-communication`), which contradicts the
  same architecture paragraph's "the one entry that breaks the rule today
  moves", the ticket's first acceptance criterion, and `map.md`'s "the one
  stray entry (`operator-communication` last in the model-invoked group)". The
  first RED cycle surfaced the second violation and the supervisor chose the
  map's intent: hyphen-insensitive dictionary order, one move. Under that rule
  exactly one entry was out of place, and only that one moved.

  Three smaller surface facts: the bucket README tests now normalize their own
  side through `dictionaryOrder` instead of `.sort()`; the top-level test was
  renamed to "the top-level README lists exactly the promoted set, ordered by
  bucket then name"; and a second test,
  `the top-level README states the order rule where the lists live`, was added
  to pin the prose the ticket's second criterion requires.
- **Impact:** none on dependent tickets in code. `git diff main...HEAD` touches
  only `README.md` (7 insertions, 1 deletion) and `tests/skills.test.ts` (40
  insertions, 9 deletions); there is no `src/**` change, no tool, no schema, no
  refusal text, and no gate decision, so `extract-tool-families` and
  `trim-the-entry` inherit nothing to carry. The impact is on the contract text
  they will be reviewed against: the architecture still says "a sorted
  expectation" with no comparator, and its "do not add a new ordering
  comparator" line reads as forbidding the helper this ticket needed. Read
  literally, the two statements cannot both be true, so a ticket 4 or 5
  reviewer applying the architecture verbatim would flag this change. The
  architecture needs the amend; the code does not need the revert.

### Abstraction usage

- Used/was specified: **yes**, with one qualification.
- Reused the suite's existing machinery rather than adding to it: `readFile`,
  `sectionBody`, `linkedSkills`, and `promotedWithInvocation`, with
  `package.json`'s `pi.skills` still the single source of truth for the
  expected set. `linkedSkills` is called on the top-level README with no bucket
  argument and on the bucket READMEs with their own bucket, so the same helper
  still reads both link shapes.
- Copied the prior art the architecture names: the doc-page section-order check
  (`tests/skills.test.ts`, the `DOC_PAGE_SECTIONS` positions compared against
  their own sorted copy) is the pattern this assertion follows, and the new
  prose test follows the suite's existing wording pins.
- The qualification: that prior art sorts **numbers**, so the "sorted
  expectation" half of it has no name comparator to borrow. The only genuinely
  new abstraction is the six-line `dictionaryOrder` above, scoped inside the
  `describe("documentation re-sync (docs-resync)")` block rather than at file
  top level with `linkedSkills` and `sectionBody`. It is a name comparator, not
  a second position comparator, and it carries a doc comment stating the rule
  and why a raw sort does not express it. The architecture's "do not add ... a
  new ordering comparator" is the one instruction this deviation runs against.

### Out-of-scope changes

- **One test beyond the architecture's ticket-3 contract.** The contract scoped
  the change to "the order assertion in the existing README test". The ticket's
  second acceptance criterion ("the rule is stated in the README where a
  contributor reads the lists") is a prose requirement with no assertion behind
  it, so it got a thin wording pin in the same `describe` block
  (`/grouped by bucket/i` and `/alphabetical/i` against `sectionBody(readme, "## Skills")`).
  This is additive, not a weakening: 11 tests in the block run, none removed.
- **The bucket README tests changed shape without changing meaning.**
  `linkedSkills(...).sort()` became `dictionaryOrder(linkedSkills(...))` on both
  bucket files. Both comparisons are order-insensitive, so the checks stay
  membership checks, and a comment states that. Verified by mutation:
  swapping the `wayfinder` and `to-spec` blocks in
  `skills/engineering/README.md` leaves the suite green, while swapping
  `finalize-effort`/`grilling` in the top-level model-invoked list fails it.
- **A three-sentence paragraph in the README's `## Skills` intro**, above
  `### User-invoked`: the rule, the instruction to place a new skill by it, and
  the bucket READMEs named as the one exception with the phase-order reason.
  This is the ticket's criterion 2, and it is the only prose change.
- **No em-dash.** The added prose uses a comma, a colon, and "because"; the
  repo's prose ban holds and the suite's sweep is green.
- **No changeset entry authored.** The ticket carries no changeset criterion and
  the per-ticket contract does not ask for one; the specification's story 23
  puts the effort's own changeset at finalize. Recorded so the absence is a
  decision, matching what the `shape-helpers-module` and
  `changeset-discriminant` reports recorded.
- **No doc page, profile, gate, migration, or workflow change**, and no change
  to either bucket README: `git diff main...HEAD -- skills/` is empty, so both
  bucket files and every heading the section greps resolve are byte-identical.
- **`docs/tasks/state.yaml`** carries an uncommitted, phase-owned pointer
  (`task: readme-order`). It is not part of the implementation diff and nothing
  is staged.

### Ticket doc update needed?

**Yes.** This ticket's `ticket.md` has no `## Implementation notes` section yet,
unlike `shape-helpers-module` and `changeset-discriminant`. Create it with:

> The ordering rule the suite enforces is hyphen-insensitive dictionary order,
> not a raw string sort, expressed by one local helper `dictionaryOrder` in the
> `documentation re-sync (docs-resync)` block of `tests/skills.test.ts`. The
> difference is not cosmetic: a raw sort puts `code-review` before
> `codebase-design` and would have required two README moves, while the map, the
> ticket, and the architecture all name exactly one stray entry. With hyphens
> ignored, `operator-communication` is the single violation and it moved to the
> head of the model-invoked productivity group. The top-level test now compares
> `linkedSkills(...)` unsorted against that expectation, so an adjacent swap in
> either top-level list fails, proven by mutation; the two bucket READMEs keep
> membership-only checks, proven by a mutation that reorders the engineering
> list and leaves the suite green. One test beyond the contract,
> `the top-level README states the order rule where the lists live`, pins the
> new `## Skills` prose to satisfy the second acceptance criterion. The
> architecture's "Documentation order" paragraph and its "do not add a new
> ordering comparator" line need the comparator amend; the shipped code is the
> intended end state.

### User attention needed?

**Yes**, narrowly, and it is a documentation reconcile rather than a scope
expansion. Two statements in the architecture cannot both be true of this
README: "the one entry that breaks the rule today moves" and "compares the file's
list unsorted against a sorted expectation". The gap is the hyphen, and the
supervisor already ruled which side wins, so what is left is amending
`architecture.md` (Documentation order, the Documentation order testing bullet,
and the "do not reimplement ... ordering comparator" line) so ticket 4 and 5
reviewers are not handed a contract that forbids what ticket 3 shipped. The
product surface is unchanged: no tool, no schema, no refusal text, no gate, and
`npm test` reports 1591 passing, which is the spec's own proof standard for
"no behaviour change".

**Verification run for this report** (on `ticket/readme-order`, commit
`3f9fd57`, base `main` at `91263e6`): `npm test` 29 files / 1591 tests passed,
`npm run typecheck` clean, `npm run typecheck:tests` clean,
`git diff main...HEAD --numstat` is `7/1 README.md`, `40/9 tests/skills.test.ts`,
`git diff main...HEAD -- src/` and `-- skills/` are both empty, `git diff
--cached --name-only` is empty. Mutations re-run for this report and reverted
with a file copy: swapping `finalize-effort`/`grilling` in the model-invoked list
fails exactly one test in the block; swapping the `wayfinder` and `to-spec`
blocks in `skills/engineering/README.md` leaves all 11 green.
