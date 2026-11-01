---
name: task-workflow-overview
description: Entry point. Ask which skill or flow fits your situation, or which move comes next. A layered explainer of the v5 workflow with a fast track to tw_next.
---

# Working with Tasks

**Fast track.** Ask `tw_next` for the live answer. Outside a workflow skill
it names the next phase to open through `tw_open`; inside one it tells you to
finish the current work first and ask again after `tw_close`. The live answer
is short on purpose; stop here when it is all you need.

## The short version

Every request, bugs included, enters as an effort through `/skill:intake`,
the single front door. `/skill:wayfinder` settles the planning decisions,
`/skill:to-spec` writes the specification, `/skill:to-tickets` produces the
architecture document and the ticket graph, `/skill:implement-ticket` builds
and closes each ticket, and `/skill:finalize-effort` runs the effort close
and archive. `/skill:setup-workflow` initializes or migrates a repo once.
`docs/tasks/` is an OKF bundle: one directory per effort holding `map.md`,
an optional `spec.md`, a `tasks/` subdirectory of planning tasks, and a
`tickets/` subdirectory of implementation tickets. The `tw_*` tools make
that graph queryable. No external issue tracker, everything in git.

## The main flow: idea to ship

The route most work travels, one phase at a time. Every phase opens with
`tw_open` (the gate that checks the tree before disclosing the phase tools)
and closes with `tw_close`; each phase's own `SKILL.md` carries the detail.

1. **`/skill:intake`** is the front door. It records the request verbatim,
   classifies it (feature or bug), and creates the effort: a map with its
   non-goals and non-negotiable facts, plus exactly one non-negotiables
   grilling task. A bug report becomes the effort's `subtype: bug`
   implementation ticket. There is no triage queue and no rejection path.

2. **`/skill:wayfinder`** is the planning phase. It works the planning
   frontier, delegating `research` and `prototype` and running `grilling`
   itself, writes each result back to the map, and runs the reconcile pass.
   When the reconcile sets the effort ready for the spec, wayfinder hands
   off; it does not build.

3. **`/skill:to-spec`** collapses the settled record into the specification
   at the effort root. It asks nothing planning already settled.

4. **`/skill:to-tickets`** turns the spec into the living architecture
   document plus a tracer-bullet ticket graph. Each ticket declares its
   blocking edges at creation.

5. **`/skill:implement-ticket`** implements the ready frontier in dependency
   levels: a per-ticket agent chain (a tdd-worker in the red-green loop, then
   verification and landing), followed by the inlined per-ticket close-out
   (the CI gate, the changelog, the done-marking, the merge). The end-of-
   effort pass wraps the whole effort up.

6. **`/skill:finalize-effort`** runs the holistic review, triages every
   finding, and archives the effort through the archive tool.

### Context hygiene

Keep the planning phases (intake through to-tickets) in **one unbroken
context window** so the grilling, specification, and tickets build on the
same thinking. Each `/skill:implement-ticket` run then starts fresh from the
ticket. Read [PHASE-BOUNDARIES.md](PHASE-BOUNDARIES.md) for the ordered tree
of context-management decisions at each phase boundary; that reference is
the deep layer behind this section.

## On-ramps

A starting situation that generates work, then merges onto the main flow.

- **A new request: idea, feature, or bug** to **`/skill:intake`**. It is the
  single front door and always creates an effort, then hands off to
  **`/skill:wayfinder`** for the grilling.

- **Something's broken** to **`/skill:diagnosing-bugs`**. For the hard ones:
  the bug that resists a first glance, the intermittent flake, the regression
  that crept in between two known-good states. It refuses to theorize until
  it has a **tight feedback loop** (one command that already goes red on this
  bug), then fixes with a regression test.

- **A foggy area of the codebase** to **`/skill:improve-codebase-architecture`**.
  It surveys for deepening opportunities; picking one generates a request you
  take to `/skill:intake`.

- **A repo that is not set up yet, or is on an older schema** to
  **`/skill:setup-workflow`**. It detects fresh, behind, or current from
  `docs/tasks/state.yaml` and runs the onboard or migrate branch.

## References underneath

Four model-invoked references that run *beneath* the other skills, each the
single source of truth for its vocabulary or its discipline.

- **`/skill:domain-modeling`**: sharpen the project's *domain* language:
  challenge a fuzzy term, resolve an overloaded word, record a hard-to-reverse
  decision as an ADR.
- **`/skill:codebase-design`** is the deep-module vocabulary (module,
  interface, depth, seam, adapter, leverage, locality) for designing a
  module's *shape*.
- **`/skill:tdd`** is the red-green-refactor discipline and the seams worth
  testing at: the loop the implementation chain runs, and the reference to
  reach for when test quality or a seam is in question.
- **`/skill:code-review`** reviews changes since a fixed point along two axes,
  Standards and Spec, and reports what it finds rather than fixing it.

## Standalone

Off the main flow entirely.

- **`/skill:grill-me`**: the same relentless interview as `grilling`, but
  **stateless**: it saves nothing locally and builds no `CONTEXT.md`. Reach
  for it when you are not working in a working directory.
- **`/skill:handoff`**: compact the conversation into a handoff document when
  the work has to travel to another session, harness, or colleague.
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
- **`/skill:skill-creator`** scaffolds, builds, or fixes an Agent Skill, and is
  the one discipline that nests its own tools inside an open phase.

## Read-only queries

`tw_next` is declared in every state and answers directly: it is the one row
you can just call. Every other row names the phase that declares the tool;
`tw_open` is that phase's opener, and its own `SKILL.md` opens with the
exact call. Read-only tools are not poured into the always-declared set:
each is disclosed by the phase that owns it, so the table names the phase
and the call.

| Question | How to get the answer |
|---|---|
| "What do I run next?" | `tw_next` (declared in every state) |
| "Is this ticket ready?" | open `/skill:implement-ticket` (or `/skill:finalize-effort`), then `tw_finalizable <ticket-slug>` |
| "What's left on effort X?" | open `/skill:wayfinder` for the planning graph or `/skill:implement-ticket` for the ticket graph, then `tw_frontier <effort>` / `tw_dependency_levels <effort>` |
| "List efforts, planning tasks, tickets" | open `/skill:wayfinder`, then `tw_list` |
| "Show artifact X" | open `/skill:wayfinder`, then `tw_show <slug>` (or read the file: the tree is readable) |
| "Where am I?" | open `/skill:wayfinder` or `/skill:implement-ticket`, then `tw_state` (both pointers) |

## Actions

| Action | Skill |
|---|---|
| Start a new effort from a request (bug included) | `/skill:intake` |
| Plan an idea or grow a planning-task graph (mandatory initial grilling) | `/skill:wayfinder` |
| Turn a conversation/map into a spec | `/skill:to-spec` |
| Break a spec into tracer-bullet feature/bug tickets | `/skill:to-tickets` |
| Implement the ready frontier | `/skill:implement-ticket` |
| Finalize / archive an effort | `/skill:finalize-effort` |
| Initialize or migrate a repo | `/skill:setup-workflow` |
| Diagnose a broken workflow | `/skill:task-workflow-doctor` |
| Diagnose a hard bug | `/skill:diagnosing-bugs` |
| Review an eval suite or triage a failed run | `/skill:eval-review` |
| Review an Agent Skill | `/skill:skill-review` |

## Report

End the turn with the completion report in
[resources/report.md](resources/report.md): the fixed five-part shape,
tuned for this skill. A refusal, failure, or escalation is the same shape.

> **Feedback:** any of these skills can hit a snag. When that happens, call
> `tw_feedback({ kind, data })` autonomously to record it. `tw_feedback` is
> the one route into the telemetry store that labels a row as feedback about
> *this* workflow, so it stays separable from every other kind of feedback.
> The signals are `good`, `bad`, `friction`, and `architecture`, plus
> `expected` for a designed-for escape hatch that fired. `data` is one or two
> specific, actionable sentences about the *workflow*, not the project work.
> Requires the `pi-telemetry` extension.
