# Implement Task, Research Resource

Resolves a `type: research` task. This is not a coding pipeline.

## Goal

Answer the task's question using high-trust primary sources and local project
artifacts where appropriate. Capture durable findings at
`docs/tasks/<effort>/tasks/<task-slug>/findings.md` with frontmatter, or in
the task body when the result is small:

## Process

1. Read the effort's map, task body, project context, and dependencies.
2. Identify the exact question and the decision it unblocks.
3. Research primary sources first. Distinguish facts, assumptions, and open
   questions. Cite URLs or repository paths for every material claim.
4. Write the result with a concise recommendation, alternatives rejected, and
   implications for dependent tasks.
5. If research reveals a new precise requirement, record it as discovered work
   and ask Wayfinder to add the dependent task. Do not silently broaden this
   task.
6. Mark the task done with `tw_set <task-path> workflow_state done` only when
   the evidence is sufficient for its stated decision. Otherwise mark it
   blocked with `tw_set <task-path> workflow_state blocked` and explain what
   is missing.

## Completion evidence

The findings artifact carries frontmatter:

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

Do not modify application code for a research task.

> **Feedback:** if research hits a snag, sources that conflicted, a question
> that wasn't sharp enough to answer, a dependency that blocked the
> conclusion, or something that worked notably well, call
> `submit_feedback({ kind, data })` autonomously to record it. `kind` is a
> short category (`good`, `bad`, `friction`, `architecture`); `data` is one or
> two specific, actionable sentences about the *workflow*, not the findings.
> Requires the `pi-telemetry` extension (`submit_feedback` tool).
