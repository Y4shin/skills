# task-workflow-overview

## What it does

`task-workflow-overview` is the router: it maps your situation to the right
skill or flow. Ask it "which skill fits here?" and it answers with the
specific next move.

It describes the task tree as an OKF bundle: one directory per effort under
`docs/tasks/<effort>/` holding `map.md`, an optional `spec.md`, a `tasks/`
subdirectory of decision tasks, and a `tickets/` subdirectory of
implementation tickets. The `tw_*` tools make that graph queryable. Every
request, bugs included, enters as an effort through `/skill:intake`; there
is no parallel bug substrate (the retired bug directory survives only as
an archive). No external issue tracker, everything in git.

The main flow runs: `/skill:grilling` (sharpen the idea), then
`/skill:to-spec` and `/skill:to-tickets` (spec, then tracer-bullet tickets),
then `/skill:implement-ticket` (per-ticket agent chains plus the inlined
per-ticket close-out: CI gate, changelog, done-marking, merge to main), and
`/skill:finalize-effort` (the effort close and archive). On-ramps merge onto it: `/skill:intake` for a new request (idea,
feature, or bug), `/skill:diagnosing-bugs` for something broken,
`/skill:wayfinder` for a huge foggy effort. Reference tables map read-only
questions to tools (`tw_finalizable`, `tw_list`, `tw_show`, `tw_state`,
`tw_dependency_levels` / `tw_frontier`) and actions to skills.

## When to reach for it

The model reaches for it automatically when you ask which skill or flow
fits your situation; you can also type `/skill:task-workflow-overview`
directly. Start here whenever you know what you want but not which skill
does it.

## Common questions

**I have a bug report piling up with others. Where do I start?**
`/skill:intake`. It is the single front door: every request, bugs included,
becomes an effort (a map plus exactly one non-negotiables grilling task,
and for a bug the `subtype: bug` implementation ticket inside that effort).
There is no triage queue and no rejection path.

**What is the difference between a decision task and an implementation
ticket?**
A decision task (under `docs/tasks/<effort>/tasks/`) holds a question whose
resolution is a decision; wayfinder creates it. An implementation ticket
(under `docs/tasks/<effort>/tickets/`) holds buildable work with acceptance
criteria; `to-tickets` creates it. The vocabulary is separate on purpose.

**Where do completed efforts go?**
The effort directory moves to `docs/tasks/archive/<effort>/` at
finalization, and `docs/tasks/index.md` moves it from `## Live` to
`## Archived`, both lists sorted.

**Do I keep one context window through the whole flow?**
Keep planning in one unbroken window (grilling, spec, tickets), then clear
context per ticket: each `/skill:implement-ticket` run starts fresh from the
ticket document.

## It's working if

- The answer to "what do I run next?" is a specific skill invocation, not a
  shrug, and it names the right on-ramp for your starting situation.
- The flow it describes matches the tree on disk: efforts grouped under
  `docs/tasks/<effort>/`, decision tasks under `tasks/`, tickets under
  `tickets/`, and every request entering through `/skill:intake`. There is
  no parallel bug substrate: the retired bug directory survives only as an
  archive.
- Its query table routes "is this ready?" to `tw_finalizable` and "what's
  left?" to `tw_frontier <effort>` / `tw_dependency_levels <effort>`.
- Context hygiene is respected: planning stays in one window, execution
  gets a fresh one per ticket.
- The routing turn ends with the completion report from the skill's
  `resources/report.md`: the route found, the invocation to run, and one
  pointer.
