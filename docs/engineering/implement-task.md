# implement-task

## What it does

`implement-task` implements the pending tickets of an effort via **per-ticket
agent chains** worked over the effort frontier. It reads the routing fields
from the artifact's frontmatter: `subtype` (the v4 workflow category, with a
fallback to `type` for legacy artifacts, defaulting to `feature`) and `mode`.
The artifact resolves through the resolver, which accepts a slug or a path
and finds the document under `docs/tasks/<effort>/tickets/` or
`docs/tasks/<effort>/tasks/`.

**Effort frontier mode:** invoked with an effort, it reads the ready edge
with `tw_frontier <effort-slug>` and routes each item by its subtype. Six
subtypes exist: the planning subtypes (`research`, `prototype`, `grilling`,
`manual`) run deliberately non-coding pipelines and may delegate to the
standalone skill of the same name; the implementation subtypes route
differently:

- **Feature tickets** run the architecture-spec flow: an effort-root
  architecture spec at `docs/tasks/<effort>/arch-spec.md` (written with you,
  user-approved, committed before the first chain dispatch), then
  `tw_dependency_levels <effort-slug>` orders per-ticket chains that
  dispatch a tdd-worker (red-green loop), then a read-only slice-verifier
  and a deviation-reporter in parallel behind an ok-gate on both, then a
  land-worker per ticket.
- **Bug tickets** run a lean red-first regression chain (tdd-worker,
  slice-verifier, land-worker) following the `diagnosing-bugs` discipline.

**Human-owned tickets (`mode: human`) are hard-refused:** the router never
launches chains for a marked ticket and does not fall through to the
subtype pipeline. It hands back the invocation:
`/skill:implement-task <slug>` run by you, with the human-mode protocol
walking through collaboration, handoff, verification, and landing.

After the frontier completes, it calls `/skill:wayfinder <effort-slug>` to
reassess the map before the effort is declared complete.

## When to reach for it

The model reaches for it automatically to build ticketed work; you can type
`/skill:implement-task <slug-or-effort>` to kick it off. Context clears
between tickets: each dispatch starts fresh from the ticket document.

## Common questions

**What happens with a `mode: human` ticket?**
Nothing autonomous. The router refuses before any resource is selected and
tells you to run `/skill:implement-task <slug>` yourself. The refusal is a
router rule, not a pipeline decision.

**Who marks a ticket done?**
Only `finalize-task`, after the chains land. The chain never marks the
ticket done itself; that marking has one owner.

**The ticket turned out too big. What now?**
The failure toolbelt splits it into **sub-tickets registered in the effort**
under `docs/tasks/<effort>/tickets/`, inheriting the subtype, with the
superseded original left deprecated and done. No ad-hoc off-graph files.

**Why fresh context per ticket?**
The ticket document is the contract. A fresh dispatch reads the ticket, the
arch spec, and the standards files directly (AGENTS.md, CONTEXT.md,
docs/standards.md, docs/testing.md), which keeps each ticket independent of
the last one's conversation.

## It's working if

- Dispatches are per-ticket over the frontier, sequenced by dependency
  level, and each one reads the ticket's subtype, mode, and size.
- A `mode: human` ticket produces a refusal and a handback, never an
  autonomous chain.
- Feature chains verify through read-only agents before anything lands, and
  landing is a separate land-worker step.
- After the frontier empties, wayfinder is reassessed instead of the effort
  being declared done on the spot.
