---
name: implement-task
description: Autonomous. Implements the pending tickets of an effort via per-ticket chains over the effort frontier. Reads subtype and mode from the artifact's frontmatter and routes feature tickets through the architecture-spec / dependency-level flow, bug tickets through a lean red-first regression chain, and planning subtypes through their per-type resources.
metadata:
  telemetry.capture: "target"
---

# Implement Task

> **Telemetry:** once you know the pending-ticket count for this effort, call
> the `telemetry_skill_context` tool with `{ skill_name: "implement-task",
> sliceCount, map }` -- `sliceCount` = the number of pending tickets on the
> effort frontier (from `tw_frontier <effort-slug>`), `map` = the effort slug
> (the directory name under `docs/tasks/`; omit when there is none). The
> `target` (ticket slug) is already captured automatically from your
> invocation argument, so do NOT pass it here. Pass `skill_name` explicitly so
> the metadata correlates to this invocation even when multiple skills run in
> one turn.

> **Async dispatch (hard rule):** every `subagent(...)` call in this skill's
> resources -- ticket chains and any fan-out -- MUST be launched with
> `async: true`. Never run a blocking/foreground subagent. After dispatching,
> call `wait({ id })` (or `wait()` / `wait({ all: true })`) to receive the
> result while keeping the turn alive; async runs are tracked, interruptible,
> and steerable.

## Routing

Read the artifact's routing fields from its frontmatter: `subtype` (the v4
workflow category) and `mode` (the optional human-owned marker). Resolve the
artifact through the resolver, which accepts a slug or a path and finds
`ticket.md` under `docs/tasks/<effort>/tickets/` and `task.md` under
`docs/tasks/<effort>/tasks/`, as well as the legacy flat shape. Never hardcode
a path template in this skill; pass the selector you were given.

```
const selector = "<ticket-or-task-slug-or-path>"
const subtype = tw_get(selector, "subtype") || tw_get(selector, "type") || "feature"
const mode = tw_get(selector, "mode")

const resources = {
  research: "resources/research.md",
  prototype: "resources/prototype.md",
  grilling: "resources/grilling.md",
  manual: "resources/manual.md",
  feature: "resources/feature.md",
  bug: "resources/bug.md",
}

follow resource resources[subtype] || resources.feature
```

Absent `subtype` falls back to `type`; legacy artifacts keep today's behavior.
Absent both defaults to `feature`.

### Human-owned tickets (mode: human)

A ticket or legacy task marked `mode: human` is **human-owned**. The router
**hard-refuses autonomous dispatch**: it never launches subagent chains for a
marked artifact and does not fall through to the subtype resource's autonomous
pipeline. The router responds that the artifact is human-owned and hands back
the re-invocation for the human to run:

> "This ticket is marked `mode: human`, so it is yours to implement. Run
> `/skill:implement-task <slug>` yourself, saying that you will implement it,
> and the human-mode protocol will walk you through it."

The refusal is a router rule, not a pipeline decision: it fires
before any resource is selected, here and again in the feature and bug
routers.

## Skill delegation for planning subtypes

Under the two-phase model, planning subtypes (research, prototype, grilling,
manual) come from wayfinder; implementation subtypes (feature, bug) come from
`to-tickets`. The per-subtype resources above remain the inline definition and
fallback for each subtype. Where a standalone skill of the same name exists,
the orchestrator MAY delegate to it instead of running the resource inline:

- **`subtype: research`** -- delegate to the `research` skill (a background
  agent that investigates against primary sources and leaves cited Markdown).
  Use this when the question benefits from a dedicated background agent; the
  research resource is the inline fallback for smaller lookups.
- **`subtype: prototype`** -- delegate to the `prototype` skill (throwaway
  code that answers one design question, either a logic HTML file or
  toggleable UI variants). Use this when the design question needs a concrete
  artifact; the prototype resource is the inline fallback.
- **`subtype: grilling`** and **`subtype: manual`** -- no standalone skill;
  run the per-subtype resource inline as today.

The artifact subtype and the skill **coexist**: the subtype is the planning
artifact category (wayfinder creates it with acceptance criteria,
`blocked_by`, etc.); the skill is the reusable discipline (the background-agent
process, the throwaway-code conventions). Delegating to the skill does not
replace the task document; the skill's output feeds back into the task's
findings or notes, and the task is marked done when its acceptance criteria
are met.

## Effort frontier mode

When invoked with an effort, work the ready frontier from
`tw_frontier <effort-slug>`, routing each item by its subtype. The frontier is
the effort graph's ready edge: tickets whose `blocked_by` dependencies are all
done. Planning and discovery tasks may add new tickets or reveal fog; update
the graph and return to Wayfinder when a new decision must be made. Do not
invent a separate specification or ticket phase.

The `feature` and `bug` resources are the implementation pipelines. The other
resources are deliberately non-coding pipelines.

If no subtype is present, `subtype` defaults to `feature` (after the `type`
fallback).

After the current frontier has been completed, call
`/skill:wayfinder <effort-slug>` to reassess the map, graduate newly discovered
work, update dependencies, and add any newly precise tickets before declaring
the effort complete.

> **Feedback:** if execution hits a snag -- a chain that kept failing, a
> ticket that wouldn't split, a worker that needed a tool it lacked, a
> dependency level that blocked unnecessarily, or something that worked
> notably well -- call `submit_feedback({ kind, data })` autonomously to
> record it. `kind` is a short category (`good`, `bad`, `friction`,
> `architecture`); `data` is one or two specific, actionable sentences about
> the *workflow*, not the code. The tdd-worker, slice-verifier,
> deviation-reporter, and land-worker agents also call this tool themselves;
> you don't need to relay their friction. Requires the `pi-telemetry`
> extension (`submit_feedback` tool).
