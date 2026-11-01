---
name: intake
description: "The single front door to the workflow, for both the phase and the skill. Every request becomes an effort: intake runs bounded sanity checks, records the intake facts, and creates the effort with a map and exactly one non-negotiables grilling task through the named tools. Replaces triage."
disable-model-invocation: true
---

# Intake

Intake is the single front door to the workflow, for both the phase and the
skill. It replaces `triage`: there is no parallel bug substrate and no
rejection path. Every request that enters through this door becomes an
effort. A run always creates the effort; intake never rejects a request.

Intake is user-invoked: starting an effort is a deliberate human act, and
this is where the raw request and the stories enter. The human types
`/skill:intake` and describes the request in natural language.

## Open first

Every run starts by opening the skill: call `tw_open` with
`{ skill: "intake", effort: "<effort-slug>" }` (the effort slug is the
directory name the effort will get under `docs/tasks/`; it need not exist
yet, because intake creates it). The opener activates the intake toolset,
and work goes only through the tools it discloses. Close the phase with
`tw_close intake` when the run releases.

## Intake's round is its own short round, not a grilling

The first round is not a grilling and does not invoke the `grilling` skill.
It is intake's own short round: quick sanity checks, then a fixed set of
pre-determined questions asked only for the facts intake cannot derive
itself. The grilling that sharpens the effort's non-goals and non-negotiable
facts happens later, in the effort's non-negotiables grilling task, which
Wayfinder runs.

### The bounded sanity checks

Run the checks before asking anything. They are bounded and time-boxed,
never exhaustive: a targeted, capped reach into the code, not a survey.

1. **Duplicate and fold-in check**: search active and archived efforts for a
   duplicate or a fold-in target (`tw_list`, then read the candidates'
   maps). If an unarchived effort already does this, ask the user why a new
   effort is wanted, or fold the idea into the existing effort (a new
   planning task or ticket there, not a new effort).
2. **Link check**: search for related efforts, so the new map can carry the
   right links.
3. **Classification**: classify the request as a feature or a bug.
4. **Code reach**: only when a targeted check is genuinely useful, reach
   into the code with a time box: confirm an already-implemented behavior
   exists, or confirm the requested behavior is absent. Report where you
   looked. When the reach does not settle it, stop and ask.

### The intake facts

Ask only the facts the checks could not derive, in one round. Record:

- the **raw request**, verbatim;
- a **one-line destination**, in the user's words;
- the **actor** (who benefits);
- the **classification** (feature or bug);
- **three to five stories**: for a feature, the central user stories ("As
  an \<actor\>, I want \<feature\>, so that \<benefit\>"); for a bug, in
  place of stories, its reproduction: **steps, expected versus actual, and
  impact**;
- optional **constraints**. "Don't know" is a perfectly good answer;
  record it as the answer, never as a gap to fill by guessing.

The barrier to entry stays low: a vague idea jotted down is enough. Do not
expand the round into an interview.

## Always create the effort

Every run that survives the checks creates an effort. There is no
rejection path: a request that is out of scope, already implemented, or
intentionally declined still becomes an effort whose Wayfinder planning
records the no in the map's `## Non-goals`, and a deliberately rejected
enhancement is recorded through the out-of-scope KB during planning. Intake
decides no simple-versus-full split: every effort gets the full arc.

Create the effort through the named tools, in this order:

1. **`tw_create_effort`** with the effort slug and title: it writes the
   map at `docs/tasks/<effort>/map.md` and registers the effort in the
   root index. The map carries `## Non-goals` and
   `## Non-negotiable facts` seeded as **empty placeholders**, so a later
   gate refusal names missing content rather than a missing section.
2. **`tw_add_task`** with subtype `grilling`: create **exactly one**
   non-negotiables grilling task, the effort's only planning task at intake
   time. Its body carries the recorded facts: the decision to settle (the
   effort's non-goals and non-negotiable facts, including the effort-level
   success test), the raw request verbatim, the destination, the actor,
   the classification, the stories (or the bug reproduction), and the
   constraints. Wayfinder runs this session; intake does not grill.
3. **`tw_add_ticket`** for a bug: **every bug report becomes an effort**,
   and the defect is a `subtype: bug` implementation ticket inside it.
   A feature request creates no ticket here: tickets are produced later,
   by `to-tickets` from the spec.
4. **`tw_state_set`** with `map` pointing at the new effort, and clear a
   stale `task` pointer with `null`.

Do not fill in the two placeholder sections, do not write a spec, and do
not decide non-goals or the success test here: they belong to Wayfinder's
planning.

## Hand off

With the effort created, close the phase and hand off:

```text
/skill:wayfinder <effort-slug>
```

Wayfinder runs the non-negotiables grilling task (and any further planning
tasks it adds), fills the two sections, and reconciles the map.

## Report

End the run with the completion report in
[resources/report.md](resources/report.md): the fixed five-part shape,
tuned for this skill. A refusal, failure, or escalation is the same shape.

> **Feedback:** if intake hits a snag (a duplicate check that missed, a
> classification that stayed ambiguous, or something that worked notably
> well), call `tw_feedback({ kind, data })` autonomously to record it. `kind`
> is one of `good`, `bad`, `friction`, `architecture`; `data` is one or two
> specific, actionable sentences about the *workflow*, not the project work.
> Requires the `pi-telemetry` extension.
