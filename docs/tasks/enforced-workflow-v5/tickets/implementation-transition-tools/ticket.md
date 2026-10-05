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