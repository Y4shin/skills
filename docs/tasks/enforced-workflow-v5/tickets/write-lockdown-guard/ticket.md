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

## Implementation notes

- Landed from the re-verified ticket branch (`7eb62d6`, five `wip:` commits) onto
  a fresh landing branch `task/write-lockdown-guard` created at the merge base
  `960e623`: the prior attempt's land had been rolled back and the landing
  branch did not exist at land time, so it was recreated rather than reused.
- The guard lives in `src/pi.ts` (`guardTaskTreeWrites` + `isTaskTreePath`),
  registered as a `tool_call` handler inside the personal-repo (`!gate.active`)
  branch. It blocks built-in `write` and `edit` on any path under
  `docs/tasks/**` (relative, absolute, and `..`-traversal), resolves against
  the session cwd, and passes everything else through. It is a hook, so it is
  independent of the active tool set and blocks in every phase.
- No `bash` command-string scan exists; the residual risk that a shell command
  can still mutate the tree is documented in `docs/repo-gating.md` (new section
  "Write lockdown on docs/tasks (personal repos)").
- Tests: `tests/gate-factory.test.ts` grew the blocked and allowed matrices
  (including `docs/bugs/**` and the `docs/tasks-archive` lookalike), a
  toolset-independence test, bash passthrough, and doc-note assertions.
  26/26 ticket tests pass; full suite 815/815; typecheck clean.
- Unpinned judgment calls made by the TDD worker: the residual-risk note's
  home (`docs/repo-gating.md`) and the personal-repo-only guard scope, both
  documented in the TDD output and reversible.