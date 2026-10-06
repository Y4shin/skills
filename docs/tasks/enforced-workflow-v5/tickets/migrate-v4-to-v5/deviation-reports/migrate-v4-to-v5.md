---
type: deviation report
title: Deviation report for migrate-v4-to-v5
status: stable
---

## Deviation report: migrate-v4-to-v5

### API surface changes
- **Planned:** The spec's interface contract (entry 5) names the v5
  `detectVintage` branch and the v4-to-5 reshape, with the contract
  properties: idempotent, YAML-verified, failure leaves the tree untouched,
  interrupted run resumes, archives covered, `state.yaml` stamped
  `schema_version: 5`. The spec's "Existing abstractions" section already
  framed this as a new branch of the one engine, not a second engine.
- **Actual:** Built as specified, with one type-level change and one
  behavioral detail the contract did not pin:
  - `MigrateReport.to` changed from the literal type `4` to `5`, and the
    CLI's no-op message changed from "already on schema_version 4" to
    "already on schema_version 5". Any consumer matching on the `4` literal
    or the v4 message string breaks. Within this effort, that is
    `migration-target-and-upgrade-resource` (the upgrade resource's
    transcript of CLI output) and the v4 prose owned by
    `overview-doctor-rescope` and `docs-resync`; none of them parse the
    literal today, so the impact is limited to the upgrade guide's accuracy.
  - The multi-architecture-doc corner: the ticket says `arch-spec.md`
    becomes `architecture.md` "at the effort root" but the v4 machinery
    already renames in place when an effort holds several architecture
    documents, because hoisting all of them would silently lose all but one.
    The single-doc case lands at the effort root as specified; the
    several-doc case renames to `architecture.md` in its own directory.
    Pinned by the existing no-collapse tests, updated to the new names.
- **Impact:** Downstream tickets see a `MigrateReport.to` of `5` and the new
  message; the upgrade-resource ticket must describe schema-5 output. No
  downstream ticket calls `migrate()` expecting a `4`.

### Abstraction usage
- Used/was specified: yes. The reshape reuses `reorganize`, `TreePort`
  staging, the undo journal, `dumpVerified` (which now verifies every staged
  write, including body rewrites), and `MAP_SECTION_NON_GOALS` /
  `MAP_SECTION_NON_NEGOTIABLE_FACTS` from the schema5-artifact-model ticket.
  The one deliberate placement that ticket's deviation report flagged was
  honored: `architecture` and `review` sit in `PRIMARY_TYPES`, so the
  derived `AUX_TYPES` does not treat them as aux files, and `v4Home` places
  them as effort-root primaries.
- One ripple resolved: `detectVintage` needed no new code branch, because
  the stamp read already returns the stamped number; the "version-5 branch"
  the ticket names is pinned by a test (`report.from === 5`) instead of new
  logic. Recorded so a reviewer does not hunt for dead code.

### Out-of-scope changes
- `tests/fs-port.test.ts` (a foreign file for this ticket): two stamp
  assertions and one test name updated to expect schema 5. The change is
  exactly the spec'd stamp move; the tests' intent is untouched. Recorded
  rather than silently absorbed.
- `src/core/migrate.ts` doc comments now describe schema 5 (the "version 4
  migration" header became "the migration to schema 5"). Comment-only.
- No production behavior beyond what the reshape requires; `docs/bugs/` is
  never read into the plan, never moved, never reported, as the ticket asks.

### Ticket doc update needed?
No. The ticket's acceptance criteria are all met and pinned by tests in
`tests/migrate.test.ts` (77 tests in the file, green): the four existing
non-negotiables, the body rename, the filename and type rename, archive
coverage, one hop for every vintage, byte-stable second run, `docs/bugs/`
untouched. The implementation note appended at landing records the
multi-doc rename detail, the stamp assertions in the foreign test file, and
the detectVintage finding, which is the right home for them.

### User attention needed?
No. Scope did not change: every planned obligation is delivered, the two
divergences are inside the ticket's own remit (the target-version change is
the ticket's point, and the multi-doc case is the existing machinery's
established no-loss rule), and no API surface that a dependent ticket
consumes differs from the spec's contract.

### Workflow note
The two earlier chain attempts died at the preconditions gate with the
harness rejecting the gate child's output ("structured acceptance report
not found") while the child had emitted `VERDICT: PASS`; this attempt's
outputs carry the structured report. Recorded as workflow friction, not a
finding about this ticket.
