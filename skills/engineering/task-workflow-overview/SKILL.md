---
name: task-workflow-overview
description: Entry point. Ask which skill or flow fits your situation. A router over the skills in this repo.
---

# Working with Tasks

You don't remember every skill, so ask. This is the router that maps user
intent to the right skill or flow. This repo uses the task-workflow: a
dependency graph under `docs/tasks/` of maps and executable tasks. Bugs live
under `docs/bugs/`. No external issue tracker, everything in git.

A **flow** is a path through the skills. Most paths run along one **main
flow**, and several **on-ramps** merge onto it. Everything else is standalone,
or a vocabulary layer that runs underneath.

## The main flow: idea to ship

The route most work travels. You have an idea and want it built.

1. **`/skill:grilling`** sharpens the idea by interview. Start here whenever
   you are working in a repo: it runs the grilling primitive (rounds,
   frontier, facts are the agent's job, decisions are yours). (A stateful
   `grill-with-docs` variant that also builds `CONTEXT.md` and ADRs inline is
   planned; for now use `grilling` and `domain-modeling` together.)
2. **Branch: can you settle every question in conversation?** If a question
   needs a runnable answer (state, business logic, a UI you have to see),
   detour through a prototype, bridged by **`/skill:handoff`** in both
   directions:
   - **`/skill:handoff`** out, then open a fresh session against that file,
   - **`/skill:prototype`** to answer the question with throwaway code,
   - **`/skill:handoff`** back what you learned.
3. **Branch: is this a multi-session build?**
   - **Yes** to **`/skill:to-spec`** (turn the thread into a spec), then
     **`/skill:to-tickets`** to split it into tracer-bullet feature/bug tickets,
     each declaring its **blocking edges** under `docs/tasks/` using the
     `task_*` tools for the graph. Kick off **`/skill:implement-task`** per
     ticket, clearing context between each one.
   - **No** to **`/skill:implement-task`** right here, in the same context
     window.

   Either way, **`/skill:implement-task`** builds each ticket by driving
   **`/skill:tdd`** internally (one red-green slice at a time), then closes out
   by running **`/skill:code-review`**, a two-axis review (Standards + Spec) of
   the diff, before committing.

### Context hygiene

Keep steps 1 to 3 in **one unbroken context window** (don't compact or clear
until after `/skill:to-tickets`) so the grilling, spec, and tickets all build
on the same thinking. Each `/skill:implement-task` then starts fresh, working
from the ticket.

Read [PHASE-BOUNDARIES.md](PHASE-BOUNDARIES.md) for the ordered tree of
context-management decisions at each phase boundary.

## On-ramps

A starting situation that generates work, then merges onto the main flow.

- **Bugs and requests piling up** to **`/skill:triage`**. It moves issues
  through triage roles and produces agent-ready tasks, which
  **`/skill:implement-task`** later picks up. Triage is only for issues you
  didn't create: tickets that `/skill:to-tickets` produced are already
  agent-ready, so don't triage them.

- **Something's broken** to **`/skill:diagnosing-bugs`**. For the hard ones:
  the bug that resists a first glance, the intermittent flake, the regression
  that crept in between two known-good states. It refuses to theorize until
  it has a **tight feedback loop** (one command that already goes red on this
  bug), then fixes with a regression test.

- **A huge, foggy effort** to **`/skill:wayfinder`**. When the way from here
  to the destination isn't visible yet, it charts a shared map of **decision
  tasks** and resolves them one at a time, producing **decisions, not
  deliverables**, until the fog is pushed back and the way is clear. When the
  map clears, **it hands off, it doesn't build**: merge onto the main flow at
  **`/skill:to-spec`**, which collapses the map's linked decisions into a
  buildable plan, then `/skill:to-tickets` and `/skill:implement-task` as
  usual.

## Codebase health

- **`/skill:improve-codebase-architecture`** runs whenever you have a spare
  moment to keep the codebase good for agents to operate in. It surfaces
  **deepening opportunities**; picking one generates an idea you can take into
  the main flow at `grilling`.

## Vocabulary underneath

Two model-invoked references that run *beneath* the other skills, each the
single source of truth for its vocabulary.

- **`/skill:domain-modeling`**: sharpen the project's *domain* language:
  challenge a fuzzy term, resolve an overloaded word, record a hard-to-reverse
  decision as an ADR.
- **`/skill:codebase-design`** is the deep-module vocabulary (module,
  interface, depth, seam, adapter, leverage, locality) for designing a
  module's *shape*.

## Standalone

Off the main flow entirely.

- **`/skill:grill-me`**: the same relentless interview as `grilling`, but
  **stateless**: it saves nothing locally and builds no `CONTEXT.md`. Reach
  for it when you are not working in a working directory.
- **`/skill:grilling`** is the interview primitive itself.
- **`/skill:resolving-merge-conflicts`** works an in-progress merge or rebase
  conflict hunk by hunk, resolving by intent, never `--abort`.
- **`/skill:prototype`** is a small, throwaway program that answers one
  design question.
- **`/skill:research`**: delegate reading legwork to a background agent.
- **`/skill:to-questionnaire`** turns a decision you can't answer alone into
  a questionnaire for someone else.
- **`/skill:wizard`** generates an interactive bash wizard for steps only a
  human can perform.
- **`/skill:wait-what`** is the corrective for a message that didn't land.
- **`/skill:teach`**: learn a concept over multiple sessions.
- **`/skill:writing-for-agents`** is the reference for writing documents
  agents consume.

## Read-only queries

| Question | Tool |
|---|---|
| "Is this task ready?" | `task_finalizable <slug>` |
| "What's left on task X?" | `task_slices <slug>` for legacy tasks; `task_frontier <map>` for Wayfinder maps |
| "List tasks / maps" | `task_list` |
| "Show artifact X" | `task_show <slug>` |
| "Where am I?" | `task_state` |
| "What's in the bug triage queue?" | `grep -l "status: reported" docs/bugs/*.md` |

## Actions

| Action | Skill |
|---|---|
| Plan an idea or grow a decision-task graph (mandatory initial grilling) | `/skill:wayfinder` |
| Turn a conversation/map into a spec | `/skill:to-spec` |
| Break a spec into tracer-bullet feature/bug tickets | `/skill:to-tickets` |
| Implement the ready frontier | `/skill:implement-task` |
| Finalize / archive | `/skill:finalize-task` |
| Initialize repo | `/skill:setup-workflow` |
| Triage incoming issues | `/skill:triage` |
| Diagnose a hard bug | `/skill:diagnosing-bugs` |

> **Feedback:** any of these skills can hit a snag. When that happens, call
> `submit_feedback({ kind, data })` autonomously to record it. `kind` is a
> short category (`good`, `bad`, `friction`, `architecture`); `data` is one or
> two specific, actionable sentences about the *workflow*, not the project
> work. Requires the `pi-telemetry` extension (`submit_feedback` tool).
