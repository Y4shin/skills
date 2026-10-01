# research

## What it does

`research` delegates reading legwork to a **background subagent**, so the
calling context keeps working while it reads. The agent investigates the
question against **primary sources** (official docs, source code, specs,
first-party APIs), follows every claim back to the source that owns it, and
writes the findings to a single Markdown file with each claim cited, saved
where the repo already keeps such notes.

Two layers share the name, on purpose:

- The **research task type** (`subtype: research`) is a wayfinder planning
  artifact: a precise question, trusted source boundaries, and
  evidence-for-completion criteria, executed through implement-task's
  research pipeline with findings captured in the task directory.
- This **skill** is the reusable delegation primitive: a background agent
  doing the legwork. The task-type resource (or any orchestrator) dispatches
  to it when the research should run in the background rather than inline.

They compose: a research task can be resolved by dispatching to this skill,
and the skill's output feeds back into the task's findings.

## When to reach for it

The model reaches for it when you want a topic researched, docs or API facts
gathered, or reading offloaded while the conversation continues. Ask for
research on a topic and it spins up the background agent.

## Common questions

**Why a background agent instead of reading inline?**
Context. Inline reading floods the working conversation with sources; the
background agent reads, cites, and returns a findings file, and the caller
stays free.

**Why the insistence on primary sources?**
Secondary write-ups age badly and quietly distort claims. Following each
claim to its owning source makes the findings file trustworthy months later,
and makes disagreement traceable.

**Where do the findings go?**
Wherever the repo already keeps such notes, matching the existing
convention; if none exists, somewhere sensible, and the skill says where.

**Is this the same thing as a research task in the task tree?**
Related but distinct: the task type is the planning artifact (the when),
this skill is the delegation mechanism (the how). A research task may use
this skill to do its reading.

## It's working if

- A background subagent did the reading and the main conversation never
  drowned in raw sources.
- Every claim in the findings file cites the primary source that owns it.
- The findings landed in one Markdown file at a location that matches the
  repo's conventions, and you were told where.
- When it ran for a research task, the output fed the task's findings rather
  than bypassing the task.
