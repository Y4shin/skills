# implement-ticket

## What it does

`implement-ticket` is the implementation phase. It replaces the ticket half
of the retired implementation router and all of the retired close-out skill:
one skill works the ticket
frontier in dependency levels, dispatches the per-ticket chain for every
ticket, and closes each landed ticket out inline, in the same autonomous
run. The human never waits to type a close-out skill.

The phase opens through `tw_open` with the effort and the target ticket
(the opener is the gate). The gate refuses an effort with no implementation
work left, a spec with no tickets, a missing or unstable architecture
document (never drafted here: the architecture is `to-tickets`' output; a
bug-only effort has none by design and is exempt), a done or blocked
target, and a not-ready target whose blockers are unfinished, each refusal
naming the legal next calls.

**The ticket frontier and the level loop:** the ready edge comes from
`tw_frontier <effort-slug>` and the waves from
`tw_dependency_levels <effort-slug>`. Tickets run one at a time, in level
order; the levels stay strict barriers. Concurrency inside a level is not
implemented: every chain shares the one repo working directory, so two at
once would checkout different landing branches in the same tree. Worktree
isolation is a recorded follow-up, not current behaviour.

**The per-ticket chain** is one pre-canned workflow script,
`scripts/ticket-chain.js` in the skill directory (shared by the feature and
bug pipelines): the model resolves the ticket's parameters (effort, ticket,
subtype, the optional separate bug and reproduction paths, plus runtime
context pointers as `extra`: a recorded resolution, prior-attempt outputs)
and launches it once with those
`args`; the script owns the preconditions gate, step order, ok-gates, and
output bindings, and returns a structured `{ ok, failed, step, refs }`
result. Child tasks carry identity and pointers only; procedure lives in
the agent definitions and the tdd / diagnosing-bugs skills. The gate is the
read-only `implement-preconditions` agent (file reads plus workflow
telemetry only): it refuses to launch any worker when the ticket doc does
not exist, is human-owned, or does not match the dispatched subtype.

- **Feature tickets** run the full chain: a tdd-worker (red-green loop),
  then a read-only slice-verifier and a deviation-reporter in parallel
  behind an ok-gate on both, then a land-worker per ticket.
- **Bug tickets** run a lean red-first regression chain (tdd-worker,
  slice-verifier, land-worker) following the `diagnosing-bugs` discipline.

**The inlined per-ticket close-out** runs right after a chain lands: the CI
gate (a red branch is never merged; fix forward instead), the knowledge
harvest that folds durable findings into the docs, the changelog entry
written through `tw_write_changelog` (the only writer of
`docs/tasks/CHANGELOG.md`), the ticket marked done through `tw_mark_done`
(the one owner of the marking), verified with
`tw_finalizable <ticket-slug>` (which also surfaces the effort graph's
anomalies), the state pointer cleared with `tw_state_set task null`, and
the landing branch merged into main with `--no-ff`. A bug ticket has no
closure step: `docs/bugs/` is a static archive in schema 5, and the
implementation ticket is the defect's record.

After the last ticket, the **end-of-effort pass** runs as a second shipped
workflow, `scripts/end-of-effort.js`: the advisory whole-effort review, the
architecture reconcile, the coherence refactor (driven by an explicit list
of inconsistencies the model composes from the deviation reports), and the
suite gate. The model composes inputs and handles the structured result; it
never refactors, edits the architecture document, or runs the suite itself.

**Human-owned tickets (`mode: human`) are hard-refused:** the router never
launches chains for a marked ticket and does not fall through to the
subtype pipeline. It hands back the invocation:
`/skill:implement-ticket <slug>` run by you, with the human-mode protocol
walking through collaboration, handoff, verification, and landing.

## When to reach for it

The model reaches for it automatically once `to-tickets` has produced the
ticket graph; you can also type `/skill:implement-ticket <effort-slug>` to
kick it off. Context clears between tickets: each dispatch starts fresh
from the ticket document.

## Common questions

**What happens with a `mode: human` ticket?**
Nothing autonomous. The router refuses before any resource is selected and
tells you to run `/skill:implement-ticket <slug>` yourself. The refusal is
a router rule, not a pipeline decision.

**Who marks a ticket done?**
Only `implement-ticket`, in its inlined close-out, after the chains land.
The chain never marks the ticket done itself; that marking has one owner.

**The ticket turned out too big. What now?**
The failure toolbelt splits it through `tw_split_ticket`: sub-tickets
registered in the effort under `docs/tasks/<effort>/tickets/`, inheriting
the subtype, with the superseded original left deprecated and done. No
ad-hoc off-graph files, and hand edits are refused by the write guard.

**Why fresh context per ticket?**
The ticket document is the contract. A fresh dispatch reads the ticket, the
architecture document, and the standards files directly (AGENTS.md,
CONTEXT.md, docs/standards.md, docs/testing.md), which keeps each ticket
independent of the last one's conversation.

**Where does the close-out end?**
With the landing branch merged into main and the ticket done. The
effort-level holistic review and the archive are `finalize-effort`'s.

## It's working if

- Dispatches are per-ticket over the frontier, sequenced by dependency
  level, and each one reads the ticket's subtype, mode, and size.
- A missing, mismatched, or human-owned ticket doc is refused by the
  read-only preconditions gate before any worker launches, and a missing or
  unstable architecture document is refused by the opener, never drafted.
- The close-out runs inline in the same run that lands each ticket: changelog
  through `tw_write_changelog`, done through `tw_mark_done`, merged to main.
- A `mode: human` ticket produces a refusal and a handback, never an
  autonomous chain.
- Feature chains verify through read-only agents before anything lands, and
  landing is a separate land-worker step.
- The run ends with the completion report from the skill's
  `resources/report.md`: landed tickets, a compact cause for failures, the
  next step, and one pointer; the chain's step receipt and refs stay behind
  it.
