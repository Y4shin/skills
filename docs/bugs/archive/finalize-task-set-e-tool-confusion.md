---
title: finalize-task Step 7 aborts on task_state_set "command not found" under set -e
status: fixed
severity: minor
reported: 2026-08-27
confirmed_by: regression test (tests/skills.test.ts, red on unfixed prose)
fix_commit: dbfe99359c4c2116f5943ef7bf65e4d137dcf449
promoted_to:
skill: finalize-task
---

## Observed

When an agent follows `skills/finalize-task/SKILL.md` Step 7 literally inside
a single `bash` block with `set -e`, the scripted sequence aborts mid-archive.
The task **does** finalize correctly in the end, but only because the agent
recovers by hand-carrying the remaining steps. This has now happened on two
consecutive finalizes (`atlassian-keyring-auth`, `atlassian-bitbucket-token`).

Concretely, Step 7 shows:

```
task_map_tick <map-slug> {taskSlug}  # if belongs to map
git mv docs/tasks/{taskSlug}/ docs/tasks/archive/{taskSlug}/
task_state_set task null
task_state_set slice null
git checkout main
git merge --no-ff task/{taskSlug} -m "task: finalize {taskSlug}"
git branch -d task/{taskSlug}
```

An agent running this as one `set -e` shell block hits `task_state_set task
null` and fails with `command not found` (exit 127), because
`task_state_set` is a **Pi tool** the agent invokes as a function, not a
shell binary. `set -e` then aborts the whole block. The archive commit (`git
mv` + `git commit`) usually succeeds before this point, so the task ends up
archived on the task branch with `git checkout main` + the `--no-ff` merge +
`git branch -d` never running.

The agent recovers by: calling the real `task_state_set` tool, committing the
resulting `docs/tasks/state.yaml` change, then running `git checkout main` +
`git merge --no-ff` + `git branch -d` + `git push` manually. The outcome is
correct, but the skill's scripted sequence is fragile to the tool-vs-binary
confusion and breaks mid-run every time.

## Expected

An agent following Step 7 as written should reach `git checkout main` + the
`--no-ff` merge + `git branch -d` without a mid-sequence abort, regardless of
whether it interleaves Pi tool calls with shell commands.

## Reproduction

1. Have an agent implement + finalize a task whose task-workflow state uses
   `docs/tasks/state.yaml` (e.g. any task in a repo onboarded to the
   `task-workflow` skills).
2. Watch the agent execute Step 7. With `set -e` active, the block dies at
   `task_state_set task null` (exit 127). The agent then recovers manually.

Observed twice on 2026-08-27 (the two finalizes referenced above).

## Suspected area

`skills/finalize-task/SKILL.md`, Step 7, the scripted block mixes shell
commands (`git mv`, `git checkout`, `git merge`, `git branch`) with a Pi tool
call (`task_state_set`) as if all are shell binaries, and the surrounding
convention encourages a single `set -e` block.

`task_map_tick` (also shown in Step 7) is a Pi tool too; it happens not to
trigger this when the map uses the object-form `tasks:` list (it errors
harmlessly with "no task <slug> in map" and the agent falls back to editing
the map doc directly), but the same tool-vs-binary confusion applies.

## Root cause

A mismatch between **what the skill's Step 7 text shows** (a shell script
containing `task_state_set` / `task_map_tick` as if they are CLI commands) and
**what is actually true** (both are Pi tools the agent invokes as functions,
interleaved with shell). `set -e` turns the "command not found" into a
sequence-aborting failure instead of a no-op.

## Fix summary

Applied option 2 from the bug doc (split the tool calls out of the shell
script). `finalize-task` Step 7 now presents three clearly-labeled steps:

1. `task_map_tick` as a **Pi tool** (with the harmless-error fallback note),
2. `task_state_set task null` / `task_state_set slice null` as **Pi tools**,
3. the `git mv` / `commit` / `checkout` / `merge --no-ff` / `branch -d`
   sequence in its own `set -e`-safe `bash` block, which contains **no** Pi
   tool calls.

The prose now explicitly states that `task_map_tick` and `task_state_set` are
tools invoked as functions, not shell binaries, so an agent following the
step does not wrap them in `set -e` expecting CLI semantics.

Regression test: `tests/skills.test.ts` > "finalize-task Step 7 separates Pi
tool calls from the shell archive block", asserts the Step 7 block containing
`git merge --no-ff` does not contain `task_state_set` / `task_map_tick`, while
both tools still appear in Step 7 marked as tool invocations. Red on the
unfixed prose, green after the fix.

## Impact

No data loss, no wrong final state, the task always finalized and main
always got the merge. The only cost was the agent recovering mid-sequence on
every finalize that touched `docs/tasks/state.yaml`, which was noisy and
distracting (and risked a real mistake if the agent ever didn't recover).
Fixed; the archive sequence now runs uninterrupted.
