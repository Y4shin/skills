# task-workflow-doctor

## What it does

`task-workflow-doctor` diagnoses a broken task-workflow symptom and routes
you to the right skill or manual step. It checks the repository for the most
common causes (missing directories, missing files, misconfigured
frontmatter) and names exactly which artifact is at fault and which skill
fixes it. **It diagnoses and routes; it does not fix.**

The core symptom table maps what you observe to what is missing and where to
go. `docs/tasks/` empty or tasks not showing: run `/skill:setup-workflow`
(the tree itself is missing). State lost, bugs cannot be created, or
`docs/testing.md` / `docs/dev-env.md` missing: `/skill:setup-workflow`
again, per the specific resource. `CONTEXT.md` and `docs/adr/` missing:
a manual step until the repo adopts the skills that create them lazily.

The v4 row covers **OKF conformance failures**: files under
`docs/tasks/<effort>/` with missing frontmatter, an empty `type`, or an
invalid `status` / `workflow_state` pair, surfacing as anomalies reported by
the graph tools. The route is `/skill:setup-workflow`'s migrate branch (for
a pre-v4 tree) or the responsible producer skill (wayfinder, to-spec, or
to-tickets) for drift the migration did not cause.

## When to reach for it

The model reaches for it when something feels wrong with the task workflow:
tasks are not showing up, a required file is missing, or a skill command
fails. You can also type `/skill:task-workflow-doctor` with the symptom.
It is a diagnostic entry point, not part of the happy path.

## Common questions

**It found the problem. Why didn't it just fix it?**
Routing to the owning skill keeps one fixer per artifact. Duplicating
setup logic in the doctor is how two codepaths drift apart; the doctor's
job ends at the diagnosis and the named route.

**Why are `CONTEXT.md` and `docs/adr/` "manual steps"?**
Those files are created lazily by the skills that adopt them
(`domain-modeling`, architecture work). Until a repo adopts them, no skill
owns their creation, so the doctor says so instead of pretending otherwise.

**What does an OKF conformance failure look like?**
The graph tools report anomalies alongside their answers: a file with no
frontmatter, a missing or empty `type`, or a `status`/`workflow_state` pair
the conformance rules forbid (for example `draft` paired with `done`). The
doctor's resource for this names the migration for pre-v4 trees and the
producer skills for fresh drift.

## It's working if

- The diagnosis names the specific missing or misconfigured artifact, not a
  vague "something is wrong with your workflow".
- The route is a skill invocation (usually `/skill:setup-workflow`) or an
  explicit manual step, and the routed skill is actually run next.
- A healthy repo comes back clean: the doctor checks the v4 tree shape
  (`map.md`, `tasks/`, `tickets/`, `state.yaml`, `index.md`) and reports
  nothing when it is intact.
- It never edits the tree itself.
