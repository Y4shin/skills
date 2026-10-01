# implement-task

## What it does

`implement-task` implements the pending tickets of an effort via **per-ticket
agent chains** worked over the effort frontier. It reads the routing fields
from the artifact's frontmatter: `subtype` (the v4 workflow category, with a
fallback to `type` for legacy artifacts, defaulting to `feature`) and `mode`.
The artifact resolves through the resolver, which accepts a slug or a path
and finds the document under `docs/tasks/<effort>/tickets/` or
`docs/tasks/<effort>/tasks/`.

**Effort frontier mode:** invoked with an effort, it reads the ready edge
with `tw_frontier <effort-slug>` and routes each item by its subtype. Six
subtypes exist: the planning subtypes (`research`, `prototype`, `grilling`,
`manual`) run deliberately non-coding pipelines and may delegate to the
standalone skill of the same name; the implementation subtypes route
differently:

- **Feature tickets** run the architecture-spec flow: an effort-root
  architecture spec at `docs/tasks/<effort>/arch-spec.md` (written with you,
  user-approved, committed before the first chain dispatch), then
  `tw_dependency_levels <effort-slug>` orders per-ticket chains that
  dispatch a tdd-worker (red-green loop), then a read-only slice-verifier
  and a deviation-reporter in parallel behind an ok-gate on both, then a
  land-worker per ticket.
- **Bug tickets** run a lean red-first regression chain (tdd-worker,
  slice-verifier, land-worker) following the `diagnosing-bugs` discipline.

Both implementation chains are one pre-canned workflow script,
`scripts/ticket-chain.js` in the skill directory: the model resolves the
ticket's parameters (effort, ticket, subtype, ticket and bug paths, plus
runtime context pointers as `extra`: a recorded resolution, prior-attempt
outputs) and launches it once with those `args`; the script owns the
preconditions gate, step order, ok-gates, and output bindings, and returns a
structured `{ ok, failed, step, refs }` result. Child tasks carry identity
and pointers only; procedure lives in the agent definitions and the tdd /
diagnosing-bugs skills. The gate is the read-only
`implement-preconditions` agent (file reads plus workflow telemetry only):
it refuses to launch any worker when the ticket doc does not exist, is
human-owned, or does not match the dispatched subtype.

Both autonomous pipelines dispatch one read-only `implement-orchestrator`
agent after their acceptance step: it works the frontier and dependency
levels, launches the shipped chains, recovers gate refusals, records
uncertainty resolutions through the scoped tool after asking the parent,
and escalates splits and unresolved failures back as structured flags. The
model composes the brief, answers the orchestrator's uncertainty questions,
and handles its report; it never enters the execution loop.

After the frontier empties, the feature path runs a second shipped
workflow, `scripts/end-of-effort.js`: the advisory whole-effort review, the
arch-spec reconcile, the coherence refactor (driven by an explicit list of
inconsistencies the model composes from the deviation reports), and the
suite gate. The suite gate is a `test-runner` agent executing the repo's
`docs/testing.md` protocol (always-run commands plus numbered "run if
asked" commands selected per launch); the spec reconcile and coherence
refactor go to restricted agents of their own. The model composes inputs
and handles the structured result; it never refactors, edits the spec, or
runs the suite itself.

**Human-owned tickets (`mode: human`) are hard-refused:** the router never
launches chains for a marked ticket and does not fall through to the
subtype pipeline. It hands back the invocation:
`/skill:implement-task <slug>` run by you, with the human-mode protocol
walking through collaboration, handoff, verification, and landing.

After the frontier completes, it calls `/skill:wayfinder <effort-slug>` to
reassess the map before the effort is declared complete.

## When to reach for it

The model reaches for it automatically to build ticketed work; you can type
`/skill:implement-task <slug-or-effort>` to kick it off. Context clears
between tickets: each dispatch starts fresh from the ticket document.

## Common questions

**What happens with a `mode: human` ticket?**
Nothing autonomous. The router refuses before any resource is selected and
tells you to run `/skill:implement-task <slug>` yourself. The refusal is a
router rule, not a pipeline decision.

**Who marks a ticket done?**
Only `finalize-task`, after the chains land. The chain never marks the
ticket done itself; that marking has one owner.

**The ticket turned out too big. What now?**
The failure toolbelt splits it into **sub-tickets registered in the effort**
under `docs/tasks/<effort>/tickets/`, inheriting the subtype, with the
superseded original left deprecated and done. No ad-hoc off-graph files.

**Why fresh context per ticket?**
The ticket document is the contract. A fresh dispatch reads the ticket, the
arch spec, and the standards files directly (AGENTS.md, CONTEXT.md,
docs/standards.md, docs/testing.md), which keeps each ticket independent of
the last one's conversation.

## It's working if

- Dispatches are per-ticket over the frontier, sequenced by dependency
  level, and each one reads the ticket's subtype, mode, and size.
- A missing, mismatched, or human-owned ticket doc is refused by the
  read-only preconditions gate before any worker launches.
- The autonomous path dispatches one read-only orchestrator and answers its
  uncertainty questions; splits and exhausted retries come back as
  structured flags, never as the model fixing code itself.
- The end-of-effort wrap-up (review, spec reconcile, coherence, suite gate)
  runs as one workflow of delegated agents; the model never refactors or
  edits the spec itself.
- A `mode: human` ticket produces a refusal and a handback, never an
  autonomous chain.
- Feature chains verify through read-only agents before anything lands, and
  landing is a separate land-worker step.
- After the frontier empties, wayfinder is reassessed instead of the effort
  being declared done on the spot.
