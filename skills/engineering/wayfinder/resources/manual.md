# Wayfinder Planning Resource, Manual

Use this resource when progress requires a human or environment prerequisite,
such as obtaining access, provisioning a service, or inspecting data that is
not yet available.

## Create the task

Create the task at `docs/tasks/<effort>/tasks/<task-slug>/task.md` with
`subtype: manual`:

```yaml
---
type: task
subtype: manual
title: <prerequisite>
status: stable
workflow_state: ready
blocked_by: []
mode: human   # omit unless the human must implement it; manual work usually does
---
```

The task body must state:

- the exact prerequisite;
- the owner or actor;
- the checklist or safe automation boundary;
- evidence required to mark it done;
- dependent tasks that remain blocked.

Never put credentials or secrets in the task document.

## Run the task

Wayfinder runs manual tasks itself; there is no standalone skill.

1. Read the task and identify the exact prerequisite, owner, and evidence
   required to unblock dependents.
2. If the work is safe and automatable, perform it with explicit confirmation
   where it changes external state.
3. Otherwise give the user a precise checklist and stop. Do not claim success
   on the user's behalf.
4. Record URLs, identifiers, configuration locations, row counts, or other
   facts needed by dependent tasks. Never record secrets.

## Write back, then mark done

As the task's final step, write the recorded results back to the map with
`tw_write_section`: a short statement of the completed prerequisite in
`## Decisions so far` that references this task's slug as a stand-alone token,
plus the facts dependent tasks need. Then mark the task done with
`tw_mark_done <task-path>`; the done-marking refuses while the map does not
reference the task. Mark it done only when the evidence in its acceptance
criteria is present; if the prerequisite cannot be completed, use
`tw_mark_blocked` with the reason.

## Completion evidence

The task must contain:

- what was done;
- who or what performed it;
- resulting facts and artifact links;
- remaining risks or follow-up tasks.

This resource does not implement application behavior unless the task is
explicitly reclassified as a feature or bug by Wayfinder.

> **Feedback:** if the manual task hits a snag, a prerequisite you couldn't
> verify, a checklist that was vague, an external state change that fought
> back, or something that worked notably well, call
> `submit_feedback({ kind, data })` autonomously to record it. `kind` is a
> short category (`good`, `bad`, `friction`, `architecture`); `data` is one or
> two specific, actionable sentences about the *workflow*, not the task.
> Requires the `pi-telemetry` extension (`submit_feedback` tool).
