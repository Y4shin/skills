# task-workflow-doctor

## What it does

`task-workflow-doctor` diagnoses a broken task-workflow symptom and routes
you to the right skill or manual step. **It diagnoses and routes; it does
not fix.** It is narrowed to what the tools cannot self-diagnose, in four
scopes:

- **A legacy or unversioned tree.** Files under `docs/tasks/<effort>/` fail
  OKF conformance (missing frontmatter, an empty `type`, an invalid
  `status` / `workflow_state` pair), or `docs/tasks/state.yaml` names a
  schema older than 5. Route: `/skill:setup-workflow`'s migrate branch.
- **Missing scaffolding.** The `docs/tasks/` tree, `state.yaml`,
  `CONTEXT.md`, `docs/testing.md`, `docs/dev-env.md`, or `docs/adr/` is
  absent. Route: `/skill:setup-workflow`, whose onboard branch writes the
  current scaffold without clobbering an existing file.
- **A failed migration.** The migrate branch stopped partway, so the tree
  sits between schemas. Route: restore the backup branch the migrate branch
  created, fix the reported cause, then re-run `/skill:setup-workflow`.
- **An opener refusal.** `tw_open` returned `opened: false` and named a
  `reason` plus the `legal_next` calls. Route: follow `legal_next`; the
  doctor names the route and never reopens by another path.

When a `tw_*` tool already reports the cause (a blocked ticket, a not-ready
target, an anomaly), the tool's answer is the route and the doctor is not
needed.

## When to reach for it

The model reaches for it when something feels wrong with the task workflow
and no tool already names the cause: tasks are not showing up, a required
file is missing, a migration failed, or an opener refused and the next move
is unclear. You can also type `/skill:task-workflow-doctor` with the
symptom. It is a diagnostic entry point, not part of the happy path.

## Common questions

**It found the problem. Why didn't it just fix it?**
Routing to the owning skill keeps one fixer per artifact. Duplicating setup
logic in the doctor is how two codepaths drift apart; the doctor's job ends
at the diagnosis and the named route.

**An opener refused. Why not just retry?**
A refused open activates nothing, so a blind retry fails the same way. The
refusal carries `legal_next`, which names the legal calls; the doctor reads
the reason and routes there. Reopening through another skill is not one of
the options.

**What does an OKF conformance failure look like?**
The graph tools report anomalies alongside their answers: a file with no
frontmatter, a missing or empty `type`, or a `status`/`workflow_state` pair
the conformance rules forbid. The doctor's resource names the migration for a
pre-v5 tree and the producer skills for drift the migration did not cause.

## It's working if

- The diagnosis names the specific missing or misconfigured artifact, not a
  vague "something is wrong with your workflow".
- The route is a skill invocation (usually `/skill:setup-workflow`) or an
  explicit manual step, and the routed skill is actually run next.
- A healthy repo comes back clean: the doctor checks the tree shape
  (`map.md`, `tasks/`, `tickets/`, `state.yaml`, `index.md`) and the four
  scopes, and reports nothing when they are intact.
- An opener refusal is routed through its `legal_next` list, never worked
  around.
- It never edits the tree itself.
- The diagnosis ends with the completion report from the skill's
  `resources/report.md`: the cause, the route, and one pointer; the doctor
  still edits nothing.
