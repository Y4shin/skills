---
type: deviation report
title: Deviation report for changeset-proposal-and-dedupe
status: stable
---

## Deviation report: changeset-proposal-and-dedupe

Reviewed at `ticket/changeset-proposal-and-dedupe` against
`task/changeset-proposal-and-dedupe` (7 commits, one per TDD slice), plus the
architecture document's Changesets section, its tool-surface section, its
per-ticket contract for ticket 5, and the ticket's acceptance criteria.
Re-verified here, not taken from the implementation notes: `npm run typecheck`
clean, `npx vitest run` 27 files / 1482 tests passed, `npx vitest run
tests/changesets.test.ts` 30 passed (the file held 18 before this ticket). All
six acceptance criteria map to at least one test, and each of the previous
authoring ticket's four predicted gaps is closed by a test that fails without the
fix. One finding below (the refusal's file list) was confirmed by running the
built code against a scratch fixture.

### API surface changes

**1. The proposal surface is a `dry_run` flag on `tw_write_changesets`, not a fifth tool.**

- **Planned:** the ticket allows either ("a dry-run option on the existing
  writer or a separate read tool"). The architecture pins the registered surface
  at four new tools and describes the writer as one that "takes an effort slug
  and the proposed entries, validates each entry's package name against the
  workspace, and writes the files", with no proposal mode; its Changesets
  section separately promises entries "printed in the close-out report and
  written after the operator confirms".
- **Actual:** optional `dry_run` boolean on `tw_write_changesets`. With it the
  tool calls `proposeEntries` instead of `writeEntries`, so the workspace read,
  config read, validation, generic fallback, and dedupe are the same code path,
  stopped before the write. The answer carries the entries it would write, the
  entries skipped as already staged, whether the generic entry applies,
  `written: []`, and `dry_run: true`. The refusals are identical to the write's,
  including the unreadable-staged refusal. The tool description gained a
  paragraph naming the flag and its purpose.
- **Impact:** ticket 4 (`workflow-prose`) must preserve the two-call flow when it
  rewrites `finalize-effort/SKILL.md`, because that file now instructs it. No
  registration, disclosure, or toolset pin changed, so ticket 4's allowlist work
  is untouched. Ticket 6 is unaffected (it has its own plan tool). The flag is
  deliberately snake_case while the other existing dry run on this surface,
  `tw_migrate`, spells it `dryRun`; snake_case matches the surrounding
  parameters (`origin_effort`, `follow_up`), so the odd one out is `tw_migrate`,
  not this flag, but the surface now carries two spellings.

**2. `readStagedEntries`'s return shape changed, additively but breakingly for its consumer.**

- **Planned:** the previous ticket's contract records `readStagedEntries` as
  returning pending entries, one per release. The architecture's changesets seam
  names the read as part of the consumption path and says nothing about how a
  failed read is represented.
- **Actual:** `StagedRead` gained `refusal: ChangesetsRefusal | null`. An empty
  `entries` with a null `refusal` is "nothing staged"; a non-null `refusal` is
  "the staged set exists and could not be read". `diagnostics` stays, but is now
  empty on the refusal path, because the message moved into the refusal's
  `reason`. On the write path the refusal propagates out of `resolveProposal`,
  so both the proposal and the write refuse instead of deduping against an empty
  set.
- **Impact:** `release-mechanics` (ticket 6) is the intended consumer and must
  read `refusal` before trusting `entries`; code that only looked at `entries`
  would reproduce exactly the blind-dedupe bug this ticket closed. Ticket 6's
  `blocked_by` names `changeset-authoring` only, so nothing in its doc points at
  this new field or at the new refusal code. It should be told when it starts.

**3. The refusal vocabulary grew from six codes to seven: `unreadable-staged`.**

- **Planned:** the ticket's third criterion requires an unreadable staged entry to
  "refuse the write with a named reason"; the architecture says every failure is
  a named outcome and does not enumerate.
- **Actual:** `no-workspace | no-config | invalid-config | unreadable-staged |
  unknown-package | invalid-level | no-root-package`. `changesetLegalNext` in
  `src/pi.ts` gained one case ("fix or remove the unreadable changeset file in
  .changeset, then retry tw_write_changesets"), so the refusal renders in the
  existing `Refused: ... Legal next: ...` shape.
- **Impact:** any other switch over `ChangesetsRefusalCode` must handle it.
  Ticket 6's plan and apply tools will render refusals the same way and need
  their own legal-next text for this code, since a malformed staged entry is
  explicitly one of its named failure paths.

**4. A new export, `resolveEntries(changes, workspace): EntryResolution`.**

- **Planned:** not named. The criterion is behavioural: "the generic entry is
  validated like any other". Before this ticket the generic entry was built
  after validation and was therefore the one entry never validated.
- **Actual:** the generic fallback and the validation are extracted into an
  exported pure function that builds the generic entry first and then validates
  the whole requested set with one rule. `resolveProposal` calls it; production
  reaches the behaviour only through `proposeEntries` / `writeEntries`. It exists
  because with the workspace fixed the ordering property is otherwise
  unobservable through the public API.
- **Impact:** none on other tickets. It is a fifth export from the module and a
  second result type (`EntryResolution`) beside `Proposal`, which the module's
  own docs must keep distinct.

**5. `workspace.names` now includes the root package.**

- **Planned:** the criterion says validation must accept "every package the
  workspace reader knows about, including a monorepo's root package".
- **Actual:** `names` is the member packages plus the root package, deduped;
  `root` is unchanged. In a single-package repository the old set already
  included the root, so only monorepos change behaviour. The `Workspace`
  interface's comment already claimed "the root package included"; the code now
  matches the comment.
- **Impact:** an explicit entry naming a monorepo root package is accepted where
  it was refused `unknown-package`; the `unknown-package` reason lists the root
  among the valid names. Ticket 6 is unaffected. Any test pinning the name list
  of a monorepo workspace would need the root added; none does.

**6. The unreadable-staged refusal names files the library does not parse.**

Confirmed by running the built module against a scratch fixture: a repository
holding `.changeset/README.md` (which `changeset init` itself writes) plus one
malformed file refuses with

```
the staged changesets in <dir>/.changeset could not be read (the changeset files
there are README.md, broken.md), so no entry can be checked against what is
already staged: could not parse changeset - missing or invalid frontmatter...
```

`@changesets/read` deliberately ignores `README.md`, `AGENTS.md`, `CLAUDE.md`,
and `GEMINI.md`, and also reads `pre/*.md`, which the refusal's non-recursive
listing omits. So the refusal's one piece of guidance is a superset and a subset
of what the reader actually parses, and lists `README.md` as a suspect. This does
not breach a criterion (the code and the reason are named, and nothing is
written), but the refusal exists to shorten a bisect and this lengthens it on
the most common repository shape. This is also the only place in the module where
a changeset-file predicate exists outside the library, which the architecture's
"do not reimplement changeset parsing" rule makes worth keeping to a minimum. A
filter for the library's ignored names, or dropping the listing in favour of the
directory alone, closes it.

- **Impact:** ticket 6 will copy this vocabulary for its malformed-entry outcome;
  whatever is decided here should be decided before it lands.

### Abstraction usage

- Used/was specified: **yes**, with one small exception noted below.
- The dry run is not a second implementation: it is `proposeEntries`, which is
  `resolveProposal` minus the write, so the proposal and the write cannot
  describe different sets. Both refusal rendering (`refusedOuttext`) and result
  rendering (`outcome`) are reused, and the tool definition keeps `defStructured`
  and `Type.Optional`, so the schema shape is the surface's own.
- The changesets library set is still the only reader and writer: `readChangesets`
  reads the staged set, `writeChangeset(..., { format: false })` writes, and no
  frontmatter, version arithmetic, or changelog formatting is hand-rolled. The
  new generic-entry validation adds no library call; it reorders the existing one.
- One exception: `stagedFiles` in `src/core/changesets.ts` hand-rolls a
  `.changeset` listing (`readdirSync`, `.md` filter, sorted) to render a refusal.
  It is a listing, not a parse, and it is bounded to one string, but it is the
  only file-selection rule in the module that is not the library's, and item 6
  above is the cost of that duplication.
- No convention abandoned. The tool still accepts `effort` without resolving it
  against a live effort, which the authoring ticket recorded; unchanged here, and
  still decorative, since changesets live outside the effort tree.

### Out-of-scope changes

- `skills/engineering/finalize-effort/SKILL.md`: a new "Author the changesets"
  section (one entry per observable change, the generic patch, the three-step
  propose / show / write flow, the refusal list and why the unreadable-file
  refusal exists), plus a new step 5 in the close sequence and renumbering of the
  archive and close steps. In scope: criterion 2 is about this prose path.
- `skills/engineering/finalize-effort/resources/report.md`: part 1 now names the
  changesets the effort authored. Follows from criterion 2.
- `docs/engineering/finalize-effort.md`: a behaviour paragraph plus one "It's
  working if" bullet. Mandated by `AGENTS.md`'s re-sync rule for a promoted-bucket
  skill whose behaviour changed, and enforced by the existing structure test.
- `tests/skills.test.ts`: `tw_write_changesets` added to `SURVIVING_TOOLS` plus a
  new `finalize-effort` prose pin. Not a loosening: the assertion is membership
  in the set of real tool names the prose may reference, and the tool is
  registered, disclosed to this phase, and now named by its prose. The new pin
  asserts the dry run, the confirm-before-write ordering, and the malformed-entry
  refusal.
- No dependency changes (`package.json` and the lockfile are untouched), no new
  tool registration, no disclosure or toolset change, so the gated registered
  surface and its pin are unchanged.
- The ticket doc is **not** updated: `docs/tasks/configurable-git-workflow/tickets/changeset-proposal-and-dedupe/ticket.md`
  has no `## Implementation notes` section and its frontmatter still reads
  `workflow_state: ready`, while the three finished sibling tickets all carry
  `workflow_state: done` and implementation notes. See below.
- `docs/tasks/CHANGELOG.md` has no entry for this ticket yet. The three finished
  siblings each got one through the parent's `docs(ticket): note <slug>` commit,
  so this looks like the orchestrator's step rather than the implementer's; noted
  so it is not lost.
- `docs/tasks/configurable-git-workflow/architecture.md` is unamended. Its
  tool-surface paragraph still describes `tw_write_changesets` as write-only, and
  the file still carries the pre-existing duplicated `## Corrections recorded
  during implementation` H2. The `dry_run` decision belongs in that corrections
  section, and reconcile should dedupe the H2.
- Uncommitted in the working tree: `docs/tasks/state.yaml` (the workflow's live
  task pointer), not this ticket's change and not committed here.

### Ticket doc update needed?

**Yes.** Append to `## Implementation notes`:

- the shipped proposal surface: `dry_run` on `tw_write_changesets`, one
  resolution shared with the write, `written: []` and `dry_run: true` in the
  result details, and the reason a fifth tool was not added (the architecture's
  four-tool pin plus three registration pins and one disclosure entry);
- the read seam's new contract: `StagedRead.refusal`, what null versus non-null
  means, and that `diagnostics` is empty on the refusal path because the message
  moved into the reason;
- the seventh refusal code `unreadable-staged` and its legal-next text;
- the new export `resolveEntries` and `EntryResolution`, and that production
  reaches it only through `proposeEntries` / `writeEntries`;
- that `workspace.names` is now members plus root, deduped, and that this is what
  makes the generic entry validate like any other;
- the prose scope: the new "Author the changesets" section, its placement as step
  5, the renumbered archive and close steps, and the note that ticket 4 must
  preserve the section rather than replace the file;
- the `SURVIVING_TOOLS` addition and why it is not a loosening;
- the verification numbers actually observed: 27 files / 1482 tests, typecheck
  clean, `tests/changesets.test.ts` at 30;
- the frontmatter: set `workflow_state: done`, as the three finished siblings
  already are.

### User attention needed?

**Yes**, because the API surface that dependent tickets see is wider than the
ticket doc says, and two of the decisions land in ticket 6's lap:

1. **`readStagedEntries` is now a two-outcome read.** Ticket 6 is not blocked by
   this ticket, so nothing in its doc tells it that a non-null `refusal` exists or
   that it must not treat `entries: []` as "nothing pending" without checking.
   Cheap to append to ticket 6 now, expensive to discover after its plan tool is
   written.
2. **`unreadable-staged` is a seventh refusal code**, and ticket 6's criteria make
   a malformed entry one of its named outcomes. It needs its own rendering of that
   code rather than a generic fallback.
3. **The refusal's file list includes files the reader ignores.** A repository
   with `.changeset/README.md` beside a malformed entry is told `README.md` might
   be the problem, and a changeset under `.changeset/pre/` is not listed at all.
   Either is a one-line change to `stagedFiles`, but it is operator-facing text
   ticket 6 will imitate, so settle it before then.
4. **Scope itself did not change.** Every criterion is met as written, and the
   previously recorded gaps (no pre-write surface, blind dedupe, monorepo root
   refused, generic entry exempt) are all closed with tests that failed first.
