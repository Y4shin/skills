# Wayfinder Planning Resource, Research

Use this resource when a decision depends on facts from documentation, APIs,
third-party systems, or the local repository.

## Create the task

Create the task at `docs/tasks/<effort>/tasks/<task-slug>/task.md` with
`subtype: research` and no blockers:

```yaml
---
type: task
subtype: research
title: <question>
status: stable
workflow_state: ready
blocked_by: []
mode: human   # optional; omit unless the human must implement it
---
```

The task body must state:

- the precise question;
- the decision or ticket it unblocks;
- trusted source boundaries;
- the evidence required for completion;
- likely dependent tasks.

Do not turn a research task into a vague request to "look into" a topic. If the
question is not precise, leave it in the map's Fog instead.

## Run the task

Delegate the legwork to the `research` skill (a background agent that
investigates against primary sources); the skill owns the method. This stays a
planning task: do not modify application code for it. Distinguish facts,
assumptions, and open questions, and cite URLs or repository paths for every
material claim. Capture durable findings at
`docs/tasks/<effort>/tasks/<task-slug>/findings.md` with frontmatter, or in
the task body when the result is small:

```yaml
---
type: findings
title: <title>
status: stable
---
```

The result must contain:

- question investigated;
- sources and relevant passages;
- findings and confidence;
- recommendation or decision input;
- impact on dependents;
- unresolved questions, if any.

If research reveals a new precise requirement, record it as discovered work
and add the dependent task through Wayfinder. Do not silently broaden this
task.

## Write back, then mark done

As the task's final step, write the recorded results back to the map with
`tw_write_section`: a short statement of the settled result in
`## Decisions so far` that references this task's slug as a stand-alone token,
plus any canonical-section updates the result carries. Then mark the task done
with `tw_mark_done <task-path>`; the done-marking refuses while the map does
not reference the task. Mark it done only when the evidence is sufficient for
its stated decision; otherwise use `tw_mark_blocked` and state what is
missing.

## Completion evidence

The task must contain the findings (or a pointer to the findings file), the
recommendation with its confidence, and the map write-back that references the
task.

> **Feedback:** if research hits a snag, sources that conflicted, a question
> that wasn't sharp enough to answer, a dependency that blocked the
> conclusion, or something that worked notably well, call
> `submit_feedback({ kind, data })` autonomously to record it. `kind` is a
> short category (`good`, `bad`, `friction`, `architecture`); `data` is one or
> two specific, actionable sentences about the *workflow*, not the findings.
> Requires the `pi-telemetry` extension (`submit_feedback` tool).
