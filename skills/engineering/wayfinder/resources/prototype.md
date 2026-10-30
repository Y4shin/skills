# Wayfinder Planning Resource, Prototype

Use this resource when the key uncertainty is best answered by reacting to a
concrete artifact, such as a UI variation, state model, or interaction flow.

## Create the task

Create the task at `docs/tasks/<effort>/tasks/<task-slug>/task.md` with
`subtype: prototype` and no blockers:

```yaml
---
type: task
subtype: prototype
title: <question>
status: stable
workflow_state: ready
blocked_by: []
mode: human   # optional; omit unless the human must implement it
---
```

The task body must state:

- the single design or behavior question;
- the alternatives worth comparing;
- the smallest artifact that can answer it;
- who must react to the result;
- the decision or implementation tickets it should unblock.

Keep the prototype throwaway. Production implementation belongs in a separate
feature ticket created after the decision, by `to-tickets`.

## Run the task

Delegate the build to the `prototype` skill; it owns the artifact conventions
and the method. Exercise the alternatives the task names and record what was
learned. Ask the user to react when the task is human-in-the-loop; do not
answer a human-in-the-loop question on the user's behalf. Preserve the
decision-rich artifact or a link to it, then record the chosen direction and
its implications for dependent tasks.

## Write back, then mark done

As the task's final step, write the recorded results back to the map with
`tw_write_section`: a short statement of the chosen direction in
`## Decisions so far` that references this task's slug as a stand-alone token,
plus any canonical-section updates the decision carries. Then mark the task
done with `tw_mark_done <task-path>`; the done-marking refuses while the map
does not reference the task. Mark it done only after the task question has an
evidence-backed answer; otherwise use `tw_mark_blocked` and state what is
missing. Delete throwaway code unless the task explicitly says to keep it.

## Completion evidence

The result must contain:

- question and alternatives explored;
- prototype location or artifact link;
- observations from exercising it;
- chosen direction and rejected alternatives;
- consequences for dependent tasks;
- any newly discovered work for Wayfinder.

Do not quietly turn a prototype into production code.

> **Feedback:** if prototyping hits a snag, a question the prototype couldn't
> answer, an alternative that was hard to compare, a throwaway artifact that
> leaked, or something that worked notably well, call
> `submit_feedback({ kind, data })` autonomously to record it. `kind` is a
> short category (`good`, `bad`, `friction`, `architecture`); `data` is one or
> two specific, actionable sentences about the *workflow*, not the prototype.
> Requires the `pi-telemetry` extension (`submit_feedback` tool).
