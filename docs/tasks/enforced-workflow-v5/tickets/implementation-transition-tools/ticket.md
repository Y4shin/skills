---
type: ticket
subtype: feature
title: Implementation transition tools, escapes, changelog, and archive
status: stable
workflow_state: ready
blocked_by: [schema5-artifact-model, planning-transition-tools]
size: l
---

## What to build

The rest of the named transition surface, covering every write that is not a
map or planning write. After this ticket, no legitimate workflow step needs
`bash` on the tree or a free field write.

Add:

- `tw_write_spec`, the specification writer.
- `tw_add_ticket`, ticket creation.
- `tw_split_ticket`, the escape hatch that creates the sub-tickets and
  supersedes the original as deprecated plus done.
- The ticket half of `tw_mark_done`, with the preconditions for marking an
  implementation ticket done.
- The changelog writer.
- `tw_record_out_of_scope`, writing the global `out-of-scope note` KB under
  `docs/tasks/out-of-scope/` and updating its index.
- The archive move, so archiving an effort no longer needs `git mv` or
  `bash`.

`tw_resolve_uncertainty` stays as it is. The in-effort version of deferral
stays the map's `## Non-goals`; in-scope deferred work becomes a ticket or a
follow-up effort, not a KB note. `tw_state_set` survives as the named writer
for the one state file.

Every writer carries its own preconditions and writes through the frontmatter
seam. `ready_for_spec` is untouched by these tools except where a ticket write
is also a plan change.

## Acceptance criteria

- [ ] Each named tool exists, carries its preconditions, and writes through
      the frontmatter seam.
- [ ] `tw_split_ticket` creates the sub-tickets and marks the original
      deprecated plus done.
- [ ] `tw_record_out_of_scope` writes the KB note and updates the index.
- [ ] The archive move relocates an effort without any shell command.
- [ ] The changelog writer is the only writer of the changelog.
- [ ] `tw_resolve_uncertainty` and `tw_state_set` still behave as before.
- [ ] No workflow write is left without a named tool.
- [ ] Tool-contract tests cover each writer against fixture trees.

## Blocked by

- schema5-artifact-model (new types and frontmatter).
- planning-transition-tools (`tw_set` removal and the shared writer
  conventions must land first, so the surface has one shape).

## Implementation notes

- Landed 2026-07-19 by the land worker. Merged `ticket/implementation-transition-tools`
  (9 wip commits, tip `aa797ca`) into the landing branch
  `task/implementation-transition-tools` (created at base `95cad35`, the tip of
  `task/planning-transition-tools`) with `--no-ff`; ticket branch deleted.
  Full suite 915/915 passing after the merge; typecheck clean.
- Scope: three files (`src/pi.ts`, `tests/plugin.test.ts`,
  `tests/gate-factory.test.ts`), 50 new contract test cases across eight
  describes, one per writer.
- All eight named v5 writers landed in `src/pi.ts`: `tw_write_spec`,
  `tw_add_ticket`, `tw_split_ticket`, the ticket half of `tw_mark_done`,
  `tw_write_changelog`, `tw_mark_blocked`, `tw_record_out_of_scope`, and
  `tw_archive_effort`. `tw_resolve_uncertainty` and `tw_state_set` are
  untouched. The write guard now also pins `docs/tasks/CHANGELOG.md`, so the
  changelog writer is provably the only writer.
- Divergences from the ticket plan (recorded by the TDD worker, held at review):
  (1) the unnamed tools follow the `tw_<verb>_<object>` family; (2)
  `tw_add_ticket` validates `blocked_by` at creation (kind-scoped) instead of
  to-tickets' planned by-hand second wiring pass, so tickets are created in
  dependency order and the landed write guard leaves no legal hand-edit path;
  dependent tickets must teach creation-order wiring; (3) `ready_for_spec` is
  untouched by every new writer, the ticket's caveat resolves vacuous on this
  surface; (4) the interim "planning half refuses tickets" test was replaced by
  the ticket-half contract, an owned surface change; (5) the architecture and
  review writers are deliberately absent, owned by tickets 11 and 18, those
  writes stay fail-closed under the guard until then; (6) split edges:
  sub-tickets inherit the original's `blocked_by` unioned with per-sub edges,
  the superseded slug cannot be an edge target, sub slugs must not collide.
- Known residual risks (non-blocking, verbatim from verification): the ticket
  done-marking checks the changelog reference against the global changelog
  body, so identical ticket slugs across live efforts could satisfy each
  other's reference; `tw_write_changelog` appends to a changelog with no dated
  heading rather than failing; the archive move's `renameSync` is atomic only
  within one filesystem.
- Known scratch to review: `docs/tasks/state.yaml` (orchestrator dispatch
  pointer) and
  `docs/tasks/enforced-workflow-v5/tickets/implementation-transition-tools/deviation-reports/`
  are uncommitted; left for the finalize step's discretion.
