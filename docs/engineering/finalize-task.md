# finalize-task

## What it does

`finalize-task` closes out a landed ticket and, when the effort is done, the
effort. It runs after `implement-task` reported its chains landed and the
ticket resolves through the resolver
(`docs/tasks/<effort>/tickets/<ticket-slug>/ticket.md`).

The per-ticket close-out: a **CI gate** on the landing branch (a red branch
is never merged; fix forward instead), a **knowledge harvest** that folds
durable findings into `docs/testing.md` and other docs, a CHANGELOG entry in
`docs/tasks/CHANGELOG.md`, and the ticket marked done via the set tool
(`tw_set <ticket-path> workflow_state done`, the one owner of the marking),
verified with `tw_finalizable <ticket-slug>` (which also surfaces the effort
graph's anomalies). The state pointer clears with
`tw_state_set task null`, then the landing branch merges into main with
`--no-ff`.

Bug tickets get a closure branch: the bug doc reference is read from the
ticket body (if the body names none, the skill asks you which bug doc to
close), the doc is set to `status: fixed` with `fix_commit` and root-cause
sections filled, then archived to `docs/bugs/archive/`.

**Effort finalization** runs when `tw_map_finalizable <effort-slug>`
reports ready: the map and done items are marked `status: deprecated`, the
effort directory archives as a unit with
`git mv docs/tasks/<effort>/ docs/tasks/archive/<effort>/`,
`docs/tasks/index.md` moves the effort from `## Live` to `## Archived`, and
both state pointers clear.

## When to reach for it

The model reaches for it automatically at the end of each ticket's chain.
There is nothing to run manually unless you are finalizing a ticket whose
chains already landed.

## Common questions

**Why is there no per-ticket archive move?**
The ticket stays in the live effort. Moving one ticket out would split the
effort's graph scope; the effort archives as a unit at finalization.

**What if the CI gate is red?**
Stop. Fix forward on the landing branch, never merge a red branch. Fixing
forward is a designed-for adjustment and is recorded when it fires.

**Why does the skill keep saying "Pi tool, not a shell command"?**
The close-out interleaves tool calls with shell. Wrapping a `tw_*` tool
call in a `set -e` shell block fails with command not found (exit 127) and
aborts the sequence mid-way; the tools are invoked as tools, the shell steps
run separately.

**What makes an effort finalizable?**
`tw_map_finalizable <effort-slug>` derives it from the scan: every task and
ticket done, and if a spec exists, at least one ticket exists. If it is not
ready, the skill stops and reports the remaining work.

## It's working if

- The ticket's `workflow_state` reads done only after the CI gate passed and
  the knowledge harvest landed.
- The landing branch merged into main with a merge commit, and the bug
  branch (for bug tickets) left a fixed, archived bug doc with a real
  `fix_commit`.
- Effort archiving moved the whole directory to
  `docs/tasks/archive/<effort>/`, marked items deprecated, and left
  `docs/tasks/index.md` with sorted `## Live` and `## Archived` lists.
- Both state pointers (`map`, `task`) read null afterwards.
