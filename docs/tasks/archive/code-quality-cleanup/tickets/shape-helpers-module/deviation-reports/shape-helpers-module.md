---
type: deviation report
title: Deviation report for shape-helpers-module
status: stable
---

## Deviation report: shape-helpers-module

### API surface changes
- **Planned:** the architecture's per-ticket contract says this ticket "creates
  the shape module with `text` and `isObject` and nothing else, imports them in
  the git resolver and the spawn guard, and leaves no definition behind. Hands
  every later ticket a single import path for the two guards. Nothing else may
  import them yet." The surface that was planned is therefore: two guards in
  `src/core/shape.ts`, imported by `src/core/git-profile.ts` and
  `src/core/spawn-guard.ts`, with no definition left in the resolver.
- **Actual:** exactly that. `src/core/shape.ts` holds the two guards and no
  import statement; `git-profile.ts` and `spawn-guard.ts` import both from
  `./shape.js` and define neither. The bodies are character-for-character the
  ones that were in `git-profile.ts` (`value.trim()` / `: ""`, and
  `typeof value === "object" && value !== null && !Array.isArray(value)`), so
  behaviour is unchanged. The one surface *removal* is that `export function
  text` / `export function isObject` no longer exist on `src/core/git-profile.js`.
  That removal is what "leaves no definition behind" and "nothing else may
  import them yet" ask for, and it is inert: repository-wide grep finds no
  remaining importer (spawn-guard was the only one; `src/pi.ts` imports eight
  other names from `git-profile.js` but never these two) and no test file
  imported either guard, so nothing outside this ticket resolves through the old
  path. The commit is three files: the new module and the two import sites.
- **Impact:** dependent ticket 4 (`extract-tool-families`) must import the guards
  from `src/core/shape.js` (from a `src/tools/` module that is `../core/shape.js`),
  not from the resolver, and must not re-export them from family or support
  modules. No other in-flight ticket is affected: tickets 2, 3, and 5 do not
  touch these guards, and the module path matches the architecture's "under the
  core helpers, not under the tool modules". A reader of ticket 4 should also
  note that nothing pins the "one definition" property in the suite yet, so
  ticket 4's corpus-count rewrite is the first test-level guard against a second
  copy.

### Abstraction usage
- Used/was specified: **yes**. The new module is the abstraction the architecture
  named, and it is used by both named consumers. It imports nothing (`sha`/`grep`
  over the file finds no `import`), so it sits below both consumers as required.
  The resolver keeps its own four guard uses (`text` at the profile-name check,
  `isObject` three times in the profile validator) and reads them through the new
  import rather than through a local copy. `spawn-guard.ts` keeps its uses
  (`isObject` on `input.args`, `text` on the agent and the ticket) and moved both
  names out of its `./git-profile.js` import list into a separate `./shape.js`
  import, which is the shape the architecture described.

### Out-of-scope changes
- **One local rename in `src/core/git-profile.ts`:** `readProfile`'s
  `let text: string` became `let body` (three lines: the declaration and the two
  reads). This is the ticket's own named remedy applied to a local the effort's
  inventory did not count. It is a rename only: no test reads the name, the
  parsed value and both diagnostics are unchanged, and it is required, because
  after the import that local would shadow the helper and shadowing two strings
  typechecks.
- **Inventory count correction:** the map and the `source-pin-inventory` task
  both state that five local variables are named `text`, all in `src/pi.ts` (lines
  133, 297, 2131, 2150, 3926). The true count for the hazard is six: those five
  plus the one in `git-profile.ts`. Five of the six are still shadow risks for
  ticket 4; the sixth is resolved here.
- **No changeset file was authored.** This ticket lists no changeset criterion and
  the architecture's per-ticket contract does not ask for one; the effort's
  operator story reads as a finalize-effort step. Recorded so the absence is a
  decision rather than an oversight.
- Nothing was added: no new export, no new tool, no new dependency, no test file
  change (`git diff main...HEAD --name-only -- tests` is empty), no edit to
  `src/pi.ts`, and no gate, disclosure, or refusal-text change. `docs/tasks/state.yaml`
  shows an uncommitted one-line change (`task: source-pin-inventory` ->
  `task: shape-helpers-module`); that is the workflow's own pointer, not part of
  the implementation diff.

### Ticket doc update needed?
**Yes.** Append to `## Implementation notes`:

> Implementation notes: the shape module is `src/core/shape.ts`; both guards are
> imported from there by `src/core/git-profile.ts` and `src/core/spawn-guard.ts`
> and are no longer exported from the resolver, so later tickets import
> `../core/shape.js`. One local rename came with it: `readProfile`'s `let text`
> in `git-profile.ts` became `let body`, because the new import would otherwise be
> shadowed. The effort's "five `text` locals" figure counts `src/pi.ts` only; the
> resolvable local in a file that now imports the helper was a sixth and is
> handled. Because the ticket forbade test-file changes, the "one definition"
> property is verified by a throwaway structural check in `/tmp`, not by a
> committed test; ticket 4's corpus-count pins are the first suite-level guard
> against a duplicate reappearing.

### User attention needed?
**No.** The API surface of the tool factory is unchanged, the guard behaviour is
byte-identical, and no dependency ticket needs a different integration point than
the architecture already named. The only thing a reviewer should read twice is the
removal of the two exports from `git-profile.js`: it was checked to be uncalled
anywhere, but it is a public-surface contraction of a core module. If the effort
would rather keep a compatibility re-export until ticket 4 lands, that is a
deliberate choice to make, not a defect introduced here.

**Verification run for this report** (on `ticket/shape-helpers-module`, commit
`3c20143`, base `main` at `87615bc`): `npm run typecheck` clean, `npm run
typecheck:tests` clean, `npm test` 29 files / 1588 tests passed. An independent
grep confirms exactly two `function text(` / `function isObject(` definitions in
`src/` and `tests/`, both in `src/core/shape.ts`, and exactly two importers.
