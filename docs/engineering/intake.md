# intake

## What it does

`intake` is the single front door to the workflow, for both the phase and
the skill. It replaces `triage`. Every request that enters through it
becomes an effort under `docs/tasks/<effort>/`: there is no parallel bug
substrate and no rejection path.

One intake run runs a bounded, time-boxed round of sanity checks (active
and archived efforts for a duplicate or fold-in target, related efforts for
links, the feature-versus-bug classification, and a capped reach into the
code only when genuinely useful), asks only the facts it cannot derive, and
always creates the effort through the named transition tools: the map, with
`## Non-goals` and `## Non-negotiable facts` seeded as empty placeholders and
the effort registered in `docs/tasks/index.md`, plus exactly one
non-negotiables grilling task that Wayfinder later runs to determine the
effort's non-goals and its non-negotiable facts (including the effort-level
success test). A bug report becomes an effort with a `subtype: bug`
implementation ticket inside it. "Don't know" is a valid constraint answer.

## When to reach for it

Type `/skill:intake` when a new request enters the workflow: an idea, a
feature request, or a bug report. It is user-invoked: starting an effort is
a deliberate human act, and this is where the raw request and the stories
enter. Intake is quick: the barrier to entry is a vague idea jotted down.
It hands off to `/skill:wayfinder`, which runs the grilling.

## Common questions

**Does intake grill the request?**
No. Intake's round is its own short round, not a grilling. The
non-negotiables grilling belongs to the effort's planning, run by
`wayfinder`.

**What if the request is out of scope or already done?**
The bounded checks surface it, but intake decides no rejection: the request
still becomes an effort, and the planning records the no in the map's
`## Non-goals` (or, for a deliberately rejected enhancement, in the
out-of-scope KB). Intake decides no simple-versus-full split either: every
effort gets the full arc.

**Where do bugs go?**
Every bug report becomes an effort. The defect is a `subtype: bug`
implementation ticket inside that effort. `docs/bugs/` survives only as a
static archive.

**Can I skip the effort and just fix it?**
Not through intake. There is no spot-fix path and no bare bug ticket: every
request enters as an effort, so the bug path stops being a parallel
substrate.

## It's working if

- One run produced one effort: a map with both placeholder sections, and
  exactly one non-negotiables grilling task (plus the bug ticket, for a
  bug report).
- The recorded facts are the raw request verbatim, a one-line destination,
  the actor, the classification, three to five stories (or the bug's
  steps, expected versus actual, and impact), and optional constraints
  where "don't know" is recorded as the answer.
- The duplicate and link checks were bounded and time-boxed, and never
  re-asked a question the checks answered.
- Every write went through the named `tw_*` tools; no hand edit to
  `docs/tasks/**`.
- The session ended with the completion report from the skill's
  `resources/report.md`: the effort created, what needs the human, and one
  pointer.
