---
kind: task
type: feature
slug: overhaul-execution-skills
title: Execution-side skills to v4 (implement-task, finalize-task, standards reads, ui-noter removal)
map: task-tools-overhaul
status: ready
blocked_by:
- overhaul-tw-rename
slices: [overhaul-execution-skills]
---

## What to build

The execution side of the flow rewritten for the v4 tree.

Implement-task: the router reads subtype and mode from the
artifact's frontmatter (absent mode means today's prose-driven
routing). The feature and bug pipelines rebase to per-ticket chains
over the effort frontier: the architecture spec lives at the effort
root, shared by the effort's ticket chains; per-ticket budgets come
from the size field (default m); a chain failure's split becomes a
sub-ticket registered in the effort; the dead ui-noter dispatch is
removed (its consumer silently no-ops and zero notes were ever
produced); the land-worker loses its slice-archive duty. A ticket
marked `mode: human` hard-refuses autonomous dispatch: the router
hands it back with the skill invocation for the human to run.

Finalize-task: marks the artifact's own workflow state via the set
tool (no tick, no array), gates archiving on the scan tools,
clears the state pointers (the current item and, when the effort
finalizes, the effort pointer), regenerates the root index on
archive, and drops the note check. The onboarding report's dead
task-overview pointer is fixed in the same effort.

Code review and the tdd workers read standards files directly (repo
root instruction files, standards and testing docs) with no
guidelines tool in the middle; the guidelines feature's deletion
itself lands in the dead-surface ticket.

## Acceptance criteria

- [ ] The implement-task router dispatches on subtype from
      frontmatter; absent subtype defaults to today's behavior.
- [ ] mode: human hard-refuses autonomous dispatch and hands off
      with the skill invocation.
- [ ] Per-ticket chains read their ticket file and the effort-root
      architecture spec; budgets from size (default m).
- [ ] Failure splits become sub-tickets registered in the effort.
- [ ] No ui-noter dispatch remains anywhere in the pipelines.
- [ ] Finalize marks workflow state via the set tool and gates
      archiving on the scan tools; pointers cleared; index
      regenerated; note check gone.
- [ ] Code review and tdd prompts read standards files directly.
- [ ] The onboarding report's dead pointer is fixed.
- [ ] Structure tests cover the removed and re-pointed prose.

## Blocked by

- overhaul-tw-rename (prose is written against final tool names);
      runs parallel with overhaul-planning-skills.
