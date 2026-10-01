# improve-codebase-architecture

## What it does

`improve-codebase-architecture` runs a periodic, read-only survey of the
repository for **high-leverage deepening opportunities**, then hands the one
you pick to wayfinder as a proper planning decision. It never edits
application code.

The survey: it reads the repo-root `CONTEXT.md` and `docs/adr/*.md` as
constraints, then dispatches the read-only `architecture-scout` agent
carrying the `codebase-design` skill (module, interface, depth, seam,
adapter, leverage, locality). The scout explores, biasing toward paths in
`git log`, and returns candidates with files, problem, smallest safe
solution, benefits, a strength rating (Strong / Worth exploring /
Speculative), and a deletion test applied to each.

The candidates render into a self-contained HTML report (tailwind and
mermaid vendored from this repo, never a CDN), written to the OS temp
directory as `architecture-review-<timestamp>.html` and opened for you.
Then it stops and asks exactly one question: **which of these would you like
to explore?** It does not silently choose.

After your explicit pick: the normal branch runs `/skill:grilling` on the
candidate; the no-grill branch ("don't grill me, just show the report") hands
the picked candidate straight to `/skill:wayfinder` in no-grill mode. Either
way, wayfinder owns creating the deepening task and wiring the frontier.

## When to reach for it

Type `/skill:improve-codebase-architecture` whenever you have a spare moment
and want the codebase to get better for agents to operate in. It is
user-invoked: nothing triggers it automatically.

## Common questions

**Will it change my code?**
No. The survey is read-only and the report lands in the temp directory, not
the repo. Code changes only later, through a properly planned and ticketed
effort.

**What is "deepening"?**
Making modules deeper: more capability behind simpler interfaces, the
opposite of accreting shallow layers. The candidates are places where one
well-placed change pays off across many call sites.

**Why does it end with a question instead of a plan?**
Because the pick is yours. Auto-fixing or auto-selecting would turn a
judgment call into a guess; the skill exists to inform that judgment.

**What is the no-grill branch?**
If you say "don't grill me, just show the report", the report is the whole
survey output; after a pick, wayfinder gets the candidate directly with no
design decision inferred from it.

## It's working if

- The report opened from the temp directory, is self-contained (no CDN
  fetches), and ranks candidates with an honest strength spread, including
  "Speculative" ones.
- The scout's candidates cite concrete files and apply the deletion test
  rather than proposing abstractions for their own sake.
- Nothing changed in the repo during the survey.
- Your pick became a wayfinder decision (with grilling, or without it),
  never an immediate code change.
