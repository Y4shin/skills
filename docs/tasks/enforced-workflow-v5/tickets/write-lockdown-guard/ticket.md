---
type: ticket
subtype: feature
title: Write lockdown on docs/tasks and the dropped bash scan
status: stable
workflow_state: ready
blocked_by: []
size: m
---

## What to build

The built-in `write` and `edit` tools are blocked on `docs/tasks/**` by a
`tool_call` handler, so the named `tw_*` tools are the only writers of the
tree. The handler matches both relative and absolute paths and refuses with
the lockdown reason.

The handler is independent of the active tool set. It blocks in every
phase, including while a skill's toolset is open, because the prototype
showed the guard and the disclosure are orthogonal.

No `bash` mutation scan is added. The previous heuristic is dropped rather
than kept, because a command string cannot be gated soundly. Reading the
tree with `read` or `bash` stays allowed, and the human's editor is
unaffected.

`docs/bugs/**` is not guarded: the bug substrate retires, and the guard
scope is `docs/tasks/**` only. The residual risk that a determined shell
command can still mutate the tree is documented, not defended.

## Acceptance criteria

- [ ] `write` and `edit` under `docs/tasks/**` are refused, for relative and
      absolute paths.
- [ ] The same calls outside `docs/tasks/**` are allowed, including
      `docs/bugs/**`.
- [ ] The guard blocks while a toolset is open, proving independence from the
      active set.
- [ ] No `bash` command-string scanning exists.
- [ ] The residual-risk note is recorded in the boundary documentation.
- [ ] Guard tests in `tests/gate-factory.test.ts` cover both directions.

## Blocked by

- None (can start immediately).