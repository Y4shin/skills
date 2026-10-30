# finalize-effort

## What it does

`finalize-effort` closes an effort: one holistic review of the whole effort,
a triage of every finding, and the archive move. It is read-only toward the
code it reviews, and it runs one pass per effort, so there is no second
advisory review.

The phase opens through `tw_open` with the effort. The review artifact is
`docs/tasks/<effort>/review.md`, written through `tw_write_review`, the only
writer of it. Every finding is dispositioned exactly one way:

- an **in-scope** finding becomes an implementation ticket with
  `tw_add_ticket`, and the effort stays live and returns to the
  implementation frontier;
- an **out-of-scope or large** finding becomes a proposed follow-up effort
  only after the human says yes, created with `tw_create_effort` and linked
  by `origin_effort` on the child map (a field on the child, never a graph
  edge);
- an **informational** finding stays in the review artifact, accepted.

When a human accepts a follow-up, the findings move into the child effort's
`review.md` through `tw_write_review` with `follow_up`, so one artifact holds
them. The origin keeps a review artifact that records each displaced
finding's disposition and the follow-up slug, so the trail reads in both
directions. `tw_archive_effort` performs the archive move: it refuses while
a finding still lacks a disposition, then deprecates the finished items,
moves `docs/tasks/<effort>/` to `docs/tasks/archive/<effort>/`, and updates
the root index.

## When to reach for it

Reach for it when every implementation ticket in the effort has landed and
the changelog records them: the effort has nothing left to build and needs
its close. The implementation phase hands off here after its end-of-effort
pass. Type `/skill:finalize-effort <effort-slug>` to start it.

Do not use it to review a single change: run `/skill:code-review` for that.
Do not use it to implement what it finds: it triages findings into tickets
and follow-ups and leaves the implementation to another phase.

## Common questions

**Why is the review read-only?**
The close is a judgement pass, not another implementation run. Fixing
findings inline would mix review and execution in one context and make the
archive decision depend on code that just changed. Findings become tickets
or follow-ups, and the next phase implements them.

**Why does a follow-up need a human yes?**
The workflow never spawns efforts on its own. The model can propose a
follow-up and show the finding, but the effort is created only after the
human explicitly accepts it.

**What happens to the findings when a follow-up is accepted?**
They move into the follow-up effort's `review.md`, so the skills that act on
them find them there. The origin's review artifact becomes the disposition
record, naming the follow-up slug. There is one copy of the findings, not
two.

**Can an effort archive with an unresolved finding?**
No. The archive tool refuses while a finding lacks a disposition, naming the
review artifact. That precondition lives in the tooling, so a model that
skips the prose still cannot archive the effort.

**Who writes the review artifact?**
`tw_write_review`, the only writer of `docs/tasks/<effort>/review.md`. The
built-in write and edit are refused under `docs/tasks/`, so the named tool
is the only path, and it is what sets the flag the archive reads.

## It's working if

- One holistic review runs per effort, it is read-only toward the code, and
  its findings land in `docs/tasks/<effort>/review.md` as `type: review`.
- Every finding ends as an implementation ticket, an accepted follow-up
  effort, or an explicit informational acceptance; none is left without a
  disposition.
- A follow-up effort exists only after a human yes, and its map carries
  `origin_effort` pointing at the effort it spun out of.
- An accepted follow-up receives the findings in its own `review.md`, while
  the origin's review artifact records the disposition and the follow-up
  slug.
- The archive happens through `tw_archive_effort`, never the shell, and a
  review with a pending finding makes the tool refuse.
- The run ends with the completion report from the skill's
  `resources/report.md`: what archived, what needs the human, the next
  command, and one pointer, compact.
