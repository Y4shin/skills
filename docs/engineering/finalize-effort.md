# finalize-effort

## What it does

`finalize-effort` closes an effort: one holistic review of the whole effort,
a triage of every finding, and the archive move. It is read-only toward the
code it reviews. A second run after review findings became tickets does not
reuse the first artifact: it re-reads the effort as it now stands and
rewrites the review, recording what the new work resolved.

When `docs/tasks/<effort>/end-of-effort-review.md` exists, it is an input
too. That file is the advisory review `implement-ticket` recorded when the
last ticket landed, through `tw_write_review` with `pass: "end-of-effort"`
(the finalize pass owns `review.md`). Its findings are dispositioned in the
same triage, recorded in place with `tw_write_review` and
`pass: "end-of-effort"` plus the findings, so a finding that only lived in a
run artifact cannot be archived untriaged. The advisory file is an input,
never a gate: `tw_archive_effort` ignores it.

Before the review, the phase reconciles the living architecture against what
landed: every end-of-effort reconcile runs before the last landing, so the
close holds `tw_write_architecture` and records the corrected document. On a
schema-4 tree the v5 writer refuses the legacy `arch-spec.md`, so the gap is
recorded in the review instead.

The outcome is recorded through `tw_write_review`'s `reconcile` argument as
`done: <what changed>`, `none: <why nothing needed reconciling>`, or
`unavailable: <reason>`, and `tw_archive_effort` refuses a finalize review
without it. The reconcile is otherwise prose discipline with no output of its
own, so this record is what makes a silent skip impossible.

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
- an **informational** finding stays in the review artifact, accepted. Two
  kinds are informational by construction: a finding whose fix lives under
  `docs/tasks/` (the implementation phase has no writer for planning
  artifacts, so ticketing it creates impossible work), and a documentary
  finding whose subject already holds in code and tests (rewriting settled
  prose changes nothing the tool does). Without the second rule the advisory
  review and the finalize review keep feeding each other new doc findings and
  the effort never converges.

When a human accepts a follow-up, the findings move into the child effort's
`review.md` through `tw_write_review` with `follow_up`, so one artifact holds
them. The origin keeps a review artifact that records each displaced
finding's disposition and the follow-up slug, so the trail reads in both
directions. `tw_archive_effort` performs the archive move: it refuses while
a finding still lacks a disposition, then deprecates the finished items,
moves `docs/tasks/<effort>/` to `docs/tasks/archive/<effort>/`, updates the
root index, and clears `docs/tasks/state.yaml`'s `map` pointer when it named
the archived effort. The move is committed with git as the phase's last
step.

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

**Why is the review re-run instead of reused?**
Because the archive closes what the effort actually is. A dispositioned
review from before three more tickets landed describes an older tree, and
reusing it would archive work the close never read.

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
- The archive happens through `tw_archive_effort`, never the shell, a
  review with a pending finding makes the tool refuse, the state pointer
  stops naming the archived effort, and the move is committed.
- The run ends with the completion report from the skill's
  `resources/report.md`: what archived, what needs the human, the next
  command, and one pointer, compact.
