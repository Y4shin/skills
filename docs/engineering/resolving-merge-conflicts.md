# resolving-merge-conflicts

## What it does

`resolving-merge-conflicts` works an in-progress git merge or rebase
conflict hunk by hunk, resolving by intent rather than by picking sides.
Four steps:

1. **See the current state** of the merge or rebase: the git history and the
   conflicting files.
2. **Find the primary sources** for each conflict: read the commit messages,
   the PRs, the original issues, so the deep intent behind each change is
   understood, not guessed.
3. **Resolve each hunk**: preserve both intents where possible; where they
   are genuinely incompatible, pick the one matching the merge's stated goal
   and note the trade-off. New behavior is never invented mid-conflict, and
   it always resolves: **never `--abort`**.
4. **Run the project's automated checks** (typecheck, then tests, then
   format), fix anything the merge broke, then stage, commit, and finish the
   merge or continue the rebase to completion.

## When to reach for it

The model reaches for it when a merge or rebase stops with conflicts, or you
report one mid-merge. There is nothing to configure; it picks up the
in-progress state from the repository.

## Common questions

**Why is aborting forbidden?**
Aborting discards the resolution work and usually just postpones the same
conflict. Working each hunk to a resolution, even an imperfect one with a
noted trade-off, finishes the job the merge started.

**How does it decide which side wins?**
It reads the intent behind both sides first (commits, PRs, context), then
preserves both where possible. Where they truly conflict, the merge's stated
goal decides, and the trade-off is written down.

**What if the merge breaks tests that neither side touched?**
The automated checks catch it: typecheck, tests, and format run before the
merge is declared finished, and anything the merge broke gets fixed as part
of resolving.

## It's working if

- Every conflict hunk was resolved by intent, with both sides preserved
  where they could coexist.
- No `--abort` happened, and no behavior was invented that neither side
  intended.
- The full automated checks passed after resolution.
- The merge or rebase finished: staged, committed, rebase continued to the
  end.
