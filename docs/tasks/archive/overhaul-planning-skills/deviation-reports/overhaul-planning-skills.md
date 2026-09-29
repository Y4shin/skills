## Deviation report: overhaul-planning-skills

Verification basis: `git diff task/overhaul-planning-skills..slice/overhaul-planning-skills`
(17 files, +897/−265), the five skills' prose read in full, and a fresh run of
the gates on the slice branch: `npm test` 716 passed (15 files), `npm run
typecheck` clean. The arch spec's three approval decisions (tw_list rework in
this ticket, docs pages deferred to a follow-up task, `workflow_state: ready`
for new items) were all followed; the implementer hit no uncertainty stop.

### API surface changes

- **tw_list parameter set (planned, landed as spec'd).**
  - **Planned:** `kind` widened to map|task|ticket|spec, `status` kept, new
    `workflow_state`, `effort` replacing the old `map` param, scan-based with
    archive excluded, `effortGroupOf` exported from `src/core/graph.ts`.
  - **Actual:** exactly that, including the export mirroring the landed
    graph-tools pattern of promoting grouping rules instead of duplicating
    them. Rows render `slug (type/subtype) [state]`; json rows carry slug,
    type, subtype, status, workflow_state, effort, path.
  - **Impact:** the only skill caller of `tw_list` is the router's read-only
    query row, updated in this slice; `tests/gate-factory.test.ts` lists it
    as a surviving tool, unaffected. The v3 plugin test "filters by map" was
    flipped to "filters by effort" (`{ map: "auth" }` to
    `{ effort: "auth" }`): the spec'd interface change, and the v3 grouping
    semantics are preserved (same artifacts match on the v3 fixture).
- **tw_list now lists legacy v3 slice docs (disclosed addition beyond the
  spec's letter).**
  - **Planned:** the spec said "filter scanMemo hits, excluding any path with
    an `archive/` segment" and did not mention v3 `slices/<n>-*.md` files.
  - **Actual:** the old implementation never scanned `slices/`, so slice docs
    never appeared; the scan-based rework lists them as `(slice)` rows on v3
    trees. The existing v3 assertions still pass (they are containment, not
    exhaustiveness).
  - **Impact:** cosmetic on pre-migration trees, gone after the repo's own
    v4 migration. Worth flagging to overhaul-dead-surface (its corpus sweep
    should expect `(slice)` rows in listings) and to overhaul-execution-skills
    if its prose reasons over `tw_list` output. The `kind` enum does not
    include `slice`, so `kind` filtering cannot select them.
- **to-spec's approval flip uses the full spec path (implementation detail
  the spec left open).**
  - **Planned:** "flips status to stable when the user approves the spec",
    mechanism unspecified.
  - **Actual:** `tw_set docs/tasks/<effort>/spec.md status stable`, the path
    form, because a bare slug shared with `map.md` resolves to the map
    (resolver type priority prefers map).
  - **Impact:** callers must use the path form the prose shows; recorded in
    the implementation notes below so the execution-skills ticket is aware.

### Abstraction usage

Used/was specified: yes. `tw_list` rebuilt on the scan layer (`scanMemo`,
`scanIndex`) with `effortGroupOf` promoted out of `graph.ts` rather than
duplicated; the template-conformance seam reuses `parse`, `fromFrontmatter`,
`validateArtifact`, and `findAnomalies` with zero new conformance code; the
v4 fixture builder (`seedV4Tree`) and the structure-test pattern are reused;
the resume-scenario test exercises the real `tw_state_set`/`tw_state` tools
through `createTools()` against a fixture effort. No reimplementations found.

### Out-of-scope changes

None. All 17 changed files are inside the arch spec's file list; no
implement-task, finalize-task, tdd, or code-review prose was touched; the
repo's own docs/tasks tree stays v3 untouched; no docs pages were created
(arch spec decision 2 defers them to a follow-up task); PHASE-BOUNDARIES.md
untouched as spec'd. Zero new em-dashes in the slice diff; zero references to dead
tools (`tw_slices`, `tw_set_slices`, `tw_resolve`, `tw_assert_kind`,
`tw_map_tasks`, `tw_map_tick`, `get_guidelines`, `list_guidelines`) in the
five skills.

Judgment calls within scope, all disclosed by the implementer, none
contradicting the spec's letter:

- The doctor's bash sweep covers `archive/` too (the spec's detection list
  did not say to exclude it; archived shapes route to finalize-task, and the
  resource documents the reading).
- The test's sweep predicate is a JS mirror of the resource's bash command
  rather than an execution of it. The spec asked for "the sweep predicate";
  the resource's bash is agent-facing prose, and the engine-level checks
  (`tw_frontier` Anomalies, `findAnomalies`) remain the real gate. Bounded
  drift risk between the mirror and the bash, acceptable for prose-level
  checking.
- Wayfinder documents creating `docs/tasks/index.md` from scratch when it
  does not exist yet (a completion of the spec's "index format matches the
  migration's writer" instruction, using exactly that format).
- The `mode: human` line is carried literally in the producer templates with
  the when-to-omit comment, matching the arch spec's single-source templates
  verbatim so prose and spec cannot drift.

### Task doc update needed?

Yes. The task doc has no `## Implementation notes` section yet; the
land-worker should append one recording: (a) the `tw_list` interface change
(`map` param replaced by `effort`, `workflow_state` filter added, v3 legacy
slice docs now visible as `(slice)` rows) so overhaul-execution-skills and
overhaul-dead-surface pick it up deliberately; (b) the arch spec's approval
decision that the docs-page backfill for the five skills is a follow-up task
(not lost when this branch merges); (c) the to-spec approval flip needing the
full spec path because a shared slug resolves to the map.

### User attention needed?

No. Scope is unchanged, every API surface delta above is either spec'd (the
tw_list parameter set), a disclosed consequence of the spec'd scan-based
implementation (slice rows in listings), or an implementation detail the
spec deliberately left open (to-spec path form, sweep scope). All eight
task-level acceptance criteria verify against the diff and the test suite
(716 passed, typecheck clean), including the structure tests covering
skill registration facts and the deleted feature/bug resources.
