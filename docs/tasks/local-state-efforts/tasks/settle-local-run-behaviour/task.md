---
type: task
subtype: grilling
title: Settle what a locally set-up run collects, and the invariants it keeps
status: stable
workflow_state: ready
blocked_by: []
---

# Decision to settle

Three operator decisions that the research could not answer, because each is a
preference about how the workflow should behave rather than a fact about the
code.

## 1. What a run collects instead of the knowledge artifacts

The map skips CONTEXT.md, ADRs, docs pages, and the changelog in local setups
and replaces them with collection plus a finalize review. Open: what is
collected (the harvest's notes, test-protocol observations, domain terms, a
changelog-style record of what landed), where it accumulates (the local state
root beside the effort, one file per run, or per-ticket fragments), and how it
is guided (a prose description of the repo's own documentation conventions held
in the local state). Recommended starting answer: collect into the local state
root beside the effort, in one file whose headings follow the repo's existing
documentation, guided by a prose conventions note that the local initialization
writes an empty skeleton for.

## 2. Whether selection and delivery are automatic at finalize or a hook instance

`design-hook-mechanism` settled a hook mechanism that can gate on
`effort_archived`. So finalize's integration review can be either a built-in
step in the skill or an instance of the hook system. Open: which, and if
built-in, whether finalize proposes a patch the operator applies or writes the
repo's docs itself once the operator approves. Recommended starting answer:
built-in, so the arc works with no declaration at all, and it proposes the
integration for the operator to apply while showing the collected material's
location.

## 3. Whether the write lockdown applies to the local artifact tree

Today built-in `write` and `edit` are refused under `docs/tasks/**` so the named
`tw_*` tools are the only writers. `survey-in-repo-assumptions` established that
a local tree outside the repo is not covered, so local artifacts would have no
sole-writer invariant. Open: extend the lockdown to the resolved local root, or
drop it there and state in the output that local artifacts have no enforced sole
writer. Recommended starting answer: extend it, so one invariant holds in both
setups and a mid-run agent cannot corrupt an artifact the tools own.

# Parent decisions it depends on

- `research-local-state-root`: the local root at
  `<agent-dir>/task-workflow/local-state/repos/<slug>-<hash12>/`, its
  `local-setup.yaml` marker, and `state.yaml` beside it. The collected
  material's location must fit that layout.
- `design-hook-mechanism`: the milestone tokens, the gate and notify polarity,
  and `tw_hook_done`. The answer to question 2 decides whether finalize uses it.
- `survey-in-repo-assumptions`: the re-anchor seam, the skip list, and the
  finding that the lockdown does not reach a tree outside the repo.

# Known choices

- Collection: one run file under the local effort directory, per-ticket
  fragments merged at finalize, or reuse of the existing changelog writer with
  a local base path.
- Integration review: built-in and proposing a patch, built-in and writing after
  approval, or a declared gate hook on `effort_archived`.
- Lockdown: extend to the local root, or drop with an explicit statement.

# Downstream work the answers create

The spec's collection and finalize sections, the finalize reduction matrix, the
`isTaskTreePath` change if the lockdown is extended, and the degradation-notice
wording that names where the collected material sits.
