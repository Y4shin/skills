# Wayfinder Planning Resource, Grilling

Use this resource when the next task is a human decision that cannot be
answered from the repository or external sources.

## Create the task

Create the task at `docs/tasks/<effort>/tasks/<task-slug>/task.md` with
`subtype: grilling` and no blockers:

```yaml
---
type: task
subtype: grilling
title: <decision>
status: stable
workflow_state: ready
blocked_by: []
mode: human   # optional; omit unless the human must implement it
---
```

The task body must state:

- the decision to settle;
- the parent decisions it depends on;
- the choices already known;
- the recommended starting answer;
- what downstream work the answer may create.

## Run the session

Delegate the session to the `grilling` skill: it owns the interview method,
and this resource does not restate it. Work inside the grilling skill's
completion gate: the session ends only on its explicit shared-understanding
confirmation. Record the user's answers in the task body in the user's terms,
with the rejected options, constraints, and consequences for dependent tasks.
Never answer for the user, and never settle a required human decision by
assuming it.

## Write back, then mark done

As the task's final step, write the settled decision back to the map with
`tw_write_section`: a short statement of the decision in
`## Decisions so far` that references this task's slug as a stand-alone token,
plus any canonical-section updates the decision carries (`## Non-goals` and
`## Non-negotiable facts` among them). Then mark the task done with
`tw_mark_done <task-path>`; the done-marking refuses while the map does not
reference the task. Never mark it done while a required human decision
remains; use `tw_mark_blocked` instead.

## Completion evidence

The task must contain:

- the final decision in the user's terms;
- important alternatives considered;
- constraints and rationale;
- dependent-task implications;
- remaining fog or newly discovered work.

This resource does not write application code.

> **Feedback:** if grilling hits a snag, a question that circled, a settled
> decision the doc didn't record, a user who answered for you, or something
> that worked notably well, call `submit_feedback({ kind, data })`
> autonomously to record it. `kind` is a short category (`good`, `bad`,
> `friction`, `architecture`); `data` is one or two specific, actionable
> sentences about the *workflow*, not the decision. Requires the
> `pi-telemetry` extension (`submit_feedback` tool).
