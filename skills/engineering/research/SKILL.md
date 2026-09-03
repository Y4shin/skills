---
name: research
description: Investigate a question against high-trust primary sources and capture the findings as a cited Markdown file. Use when the user wants a topic researched, docs or API facts gathered, or reading legwork delegated to a background agent.
---

# Research

Spin up a **background subagent** to do the research, so you keep working
while it reads.

## Name distinction

This skill shares its name with the `research` **task type** (a Wayfinder
planning type whose execution resource lives at
`skills/engineering/implement-task/resources/research.md`). They are
different layers:

- The **task type** (`type: research`) is a planning routing: Wayfinder
  creates a research task, and the orchestrator resolves it directly against
  primary sources, writing findings to the task's artifact location.
- This **skill** is the reusable delegation primitive: it spins up a
  background subagent to do the reading legwork, so the calling context keeps
  working. The skill is what the task-type resource (or any orchestrator)
  reaches for when the research should run in the background rather than in
  the calling context.

The task type is the *when* (Wayfinder routes a research question); this
skill is the *how* (a background agent does the legwork).

## The background agent's job

1. Investigate the question against **primary sources** (official docs,
   source code, specs, first-party APIs), not a secondary write-up of them.
   Follow every claim back to the source that owns it.
2. Write the findings to a single Markdown file, citing each claim's source.
3. Save it where the repo already keeps such notes; match the existing
   convention, and if there is none, put it somewhere sensible and say
   where.

## When to use this skill vs the task type

- **Use this skill** when you want to delegate reading legwork to a
  background agent and keep your context free for other work. The caller
  (an orchestrator, a grilling session, or the user) stays productive while
  the subagent reads.
- **Use the `research` task type** when a Wayfinder map needs a research
  task as a planning artifact with a precise question, trusted source
  boundaries, and evidence-for-completion criteria. The task-type resource
  may dispatch to this skill when the research should run in the background.

The two compose: a `type: research` task can be resolved by dispatching to
this `research` skill.
