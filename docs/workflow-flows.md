# Workflow flows

How work travels through this package, from an idea to a shipped effort. This
is a map of the current design (v5 in flight: the v5 phases land as their
tickets land), assembled by reading the router, every workflow skill, both
pre-canned workflow scripts, all eleven agent definitions, and the
graph/artifact layer in `src/core/`.

## 30-second model

```
ON-RAMP                         PLAN                                   BREAKDOWN            BUILD                     SHIP
──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
grilling ─┐
          ├─ foggy? ─▶ wayfinder: map + decision tasks ─┐
intake ───┘             ▲ resolve tickets via implement-  │
improve-arch ───────────┘ ticket (feature/bug per level)  │
                                                          ▼
                                               to-spec ─▶ to-tickets ─▶ implement-ticket ─▶ finalize-effort ─▶ archive
diagnosing-bugs ─▶ implement-ticket (subtype: bug) ─────────────────────────┘        ▲
                                    └──────── new uncertainty / split → back to wayfinder / to-tickets ────────┘
```

Everything is a file under `docs/tasks/` (an OKF bundle: one directory per
**effort** holding `map.md`, `spec.md`, `tasks/` decision tasks, and
`tickets/` implementation tickets); `docs/bugs/` survives only as a static
archive. There is no external
issue tracker. The `tw_*` Pi tools query that tree; under the write lockdown
its only writers are the named `tw_*` tools, with `tw_state_set` for the
state file and `tw_resolve_uncertainty` for uncertainty resolutions.

## The substrate the flow runs on

| Concept | Where | Meaning |
|---|---|---|
| effort | `docs/tasks/<effort>/` | The unit that archives. The grouping key is the directory. |
| map | `map.md` | Wayfinder's low-resolution plan: Destination, Constraints, Decisions so far, Fog, Out of scope. |
| decision task | `tasks/<slug>/task.md` | `subtype: research \| prototype \| grilling \| manual`. Produces decisions. |
| spec | `spec.md` | `to-spec` output, `draft` then `stable` on approval. |
| ticket | `tickets/<slug>/ticket.md` | `subtype: feature \| bug`, `blocked_by`, `size` (s/m/l/xl), optional `mode: human`. |
| architecture document | `architecture.md` | `to-tickets`' output: the per-effort interface and seam contract, stable, read by every chain (never drafted in implementation). |
| bug doc | `docs/bugs/<slug>.md` | the live substrate is retired; `docs/bugs/` survives as a static archive and the close-out fills the closure fields. |
| state | `docs/tasks/state.yaml` | `schema_version: 4`, a `map` pointer, a `task` pointer. |

Artifact frontmatter has two orthogonal axes: OKF `status` (`draft | stable |
deprecated`) and `workflow_state` (`todo | ready | in-progress | blocked |
done`). They are paired and validated: `draft` pairs only with `todo`, and
`deprecated` pairs only with `done`.

Graph semantics from `src/core/graph.ts`: edges are **kind-scoped** (tasks to
tasks, tickets to tickets) and **effort-scoped**; tasks and tickets are
levelled independently; `done` gates on `workflow_state: done` only
(deprecated counts as done and drops out of the graph); an effort is
finalizable when nothing is unfinished and, if a spec exists, at least one
ticket exists.

## Main flow: idea to ship (feature path)

```mermaid
flowchart TD
    IDEA(["Idea / request"]) --> GRILL["/skill:grilling<br/>design-tree rounds, one frontier at a time"]
    GRILL --> SCOPE{"Multi-session build?"}
    SCOPE -- "no" --> SOLO["implement in this context window<br/>(or a one-ticket effort via implement-ticket)"]

    SCOPE -- "yes" --> KNOWN{"Way already visible?"}

    KNOWN -- "no: huge, foggy" --> WF["/skill:wayfinder (user-invoked)<br/>mandatory initial grilling -> map.md<br/>plus a decision-task graph"]
    WF --> RES["resolve the planning frontier<br/>via /skill:wayfinder, then to-spec"]
    RES -- "new uncertainty / fog" --> WF
    RES -- "way is clear" --> TS

    KNOWN -- "yes" --> TS["/skill:to-spec (user-invoked)<br/>synthesize, no interview<br/>spec.md draft -> stable on approval"]
    TS --> TT["/skill:to-tickets (user-invoked)<br/>tracer-bullet tickets plus the architecture document<br/>blocked_by wired at creation (tw_add_ticket)"]
    TT --> IMPL["/skill:implement-ticket &lt;effort&gt;<br/>per-ticket chains over tw_frontier"]

    SOLO -.-> FIN
    IMPL --> EOE["end-of-effort workflow<br/>advisory review -> spec reconcile<br/>-> coherence refactor -> suite gate"]
    EOE --> FIN["/skill:finalize-effort &lt;ticket&gt;<br/>CI gate -> harvest -> changelog<br/>-> mark done -> merge task/* into main"]
    FIN --> MORE{"tw_map_finalizable?"}
    MORE -- "no, more tickets" --> IMPL
    MORE -- "yes" --> ARCH["archive effort as a unit<br/>deprecate plus git mv docs/tasks/archive/"]
```

Two planning entry stories coexist. The router `task-workflow-overview` puts
`grilling` at the top and treats **wayfinder as an on-ramp** for fog;
wayfinder's own description and the Actions table present it as **the
planning entry** ("plan an idea"). Both end at `to-spec`.

## Phase 3 detail: the per-ticket chain

Feature tickets use `scripts/ticket-chain.js`. The orchestration rules are:
async dispatch only, the parent never implements, and children receive
pointers rather than authored prompts.

```mermaid
flowchart TD
    EFF["/skill:implement-ticket &lt;effort&gt;"] --> GATE0{"mode: human?"}
    GATE0 -- "yes" --> REFUSE0["hard-refuse: hand back /skill:implement-ticket &lt;slug&gt;<br/>for the human-mode protocol"]
    GATE0 -- "no" --> ARCH["the architecture read: architecture.md at the effort root<br/>exports, abstractions, seams, interface contracts<br/>to-tickets' output, never drafted here"]
    ARCH --> LEVELS["Step 2: tw_dependency_levels(effort)<br/>level 0 -> 1 -> 2 ... (strict barriers)"]
    LEVELS --> PICK["next ticket in level<br/>sequential: chains share the repo cwd"]
    PICK --> STATE["tw_state_set task &lt;slug&gt;"]
    STATE --> CHAIN["subagent(async, workflow: ticket-chain.js,<br/>timeout from size: s/m/l/xl = 15/30/45/60 min)"]

    CHAIN --> GATE{"implement-preconditions<br/>VERDICT: PASS?"}
    GATE -- "no" --> GR["gate refusal: re-resolve, rebuild args, relaunch once<br/>(the failure toolbelt never applies)"]
    GR --> CHAIN
    GATE -- "yes" --> TDD["tdd-worker on ticket/&lt;slug&gt;<br/>RED -> GREEN -> REFACTOR, commit per GREEN"]
    TDD --> UNC{".work/uncertainty.md?"}
    UNC -- "yes" --> RES["ask_user_question -> tw_resolve_uncertainty<br/>writes .work/resolution.md, deletes uncertainty"]
    RES --> CHAIN
    UNC -- "no" --> VER["slice-verifier (lint plus tests)<br/>in parallel, deviation-reporter (forks tdd context)"]
    VER --> OK{"verify ok AND deviation ok?"}
    OK -- "no" --> BELT["failure toolbelt<br/>diagnose -> split into sub-tickets -> retry plus 50% -> escalate"]
    BELT --> PICK
    OK -- "yes" --> LAND["land-worker<br/>merge ticket/&lt;slug&gt; into task/&lt;slug&gt; --no-ff, delete working branch"]
    LAND --> MOREIN{"more tickets in level?"}
    MOREIN -- "yes" --> PICK
    MOREIN -- "no" --> REC["spec-reconciler over deviation reports<br/>(only where real API surfaces diverged)"]
    REC --> LEVELS
```

Notable invariants:

- **Landing is not done.** The chain never sets `workflow_state: done`;
  `implement-ticket`'s inlined close-out is the single owner of that
  marking.
- **Branch ladder.** `main -> task/<ticket> (landing) -> ticket/<ticket>
  (working)`. The land-worker merges working into landing; finalize merges
  landing into main.
- **Gating is enforced, not trusted.** Each host gate is a real command
  (`test -f`, `git rev-parse`), and verdict children must open their output
  with an exact marker (`VERDICT: PASS`, `RECONCILED`, `REFACTORED`, `SUITE:
  GREEN`), checked fail-closed.
- **Uncertainty is a designed escape hatch,** recorded with
  `submit_feedback({kind: "expected"})`, resolved through the scoped tool,
  then the chain is relaunched with a pointer to the resolution.
- **End-of-effort** is a second shipped workflow: advisory `code-reviewer`
  (never gates), gated `spec-reconciler`, gated `coherence-refactorer` (only
  when the model composed an inconsistencies list), and an always-run gated
  `test-runner` reading the repo's `docs/testing.md`.

Planning subtypes (`research`, `prototype`, `grilling`, `manual`) are
deliberately non-coding: they run the matching `resources/*.md`, may delegate
to the standalone `research` or `prototype` skill, and, unlike tickets, the
resource itself marks the task `done`.

## Bug on-ramp

```mermaid
flowchart TD
    BUG(["Bug report / feature request"]) --> INTAKE["/skill:intake (user-invoked)<br/>every request becomes an effort"]
    INTAKE -- "bug report" --> BUGEFF["subtype: bug ticket inside the effort<br/>body references bug doc plus reproduction"]
    INTAKE -- "hard / intermittent" --> DB["/skill:diagnosing-bugs<br/>Phase 1 feedback loop is non-skippable"]
    DB --> BUGEFF
    BUGEFF --> IMB["/skill:implement-ticket<br/>resources/bug.md (router on mode)"]
    IMB --> CHAINB["ticket-chain.js, lean: gate -> tdd-worker (diagnosing-bugs)<br/>-> slice-verifier -> land-worker<br/>(no architecture document, no levels, no deviation step, no coherence pass)"]
    CHAINB --> REV["advisory two-axis code-review over the fix diff"]
    REV --> FINB["inline close-out: CI -> changelog<br/>-> close plus archive bug doc -> mark done -> merge main"]
```

## Everything else: on-ramps, side skills, meta layer

```mermaid
flowchart LR
    GRILL2["/skill:grilling (the interview primitive)"] --> ORACLE

    subgraph ORACLE["Vocabulary underneath (model-invoked)"]
        DM["/skill:domain-modeling<br/>CONTEXT.md plus ADRs"]
        CD["/skill:codebase-design<br/>module / depth / seam vocabulary"]
    end

    subgraph STANDALONE["Off the main flow"]
        GM["/skill:grill-me (stateless interview)"]
        HO["/skill:handoff (transit doc, cross-harness/dir/colleague)"]
        RMC["/skill:resolving-merge-conflicts"]
        PROT["/skill:prototype"]
        RESR["/skill:research"]
        TQ["/skill:to-questionnaire"]
        WIZ["/skill:wizard (human-only bash steps)"]
        WW["/skill:wait-what"]
    end

    subgraph META["Skill / eval authoring"]
        SC["/skill:skill-creator"]
        SR["/skill:skill-review"]
        ER["/skill:eval-review"]
    end

    HO -. "prototype bridge: handoff out -> fresh session -> prototype -> handoff back" .-> PROT
    SC -. "write a skill -> review it" .-> SR
```

`task-workflow-doctor` diagnoses a broken workflow and routes; it never fixes.
`setup-workflow` bootstraps or migrates a repo by reading `state.yaml`'s
`schema_version` (fresh, behind, or no-op). Repo gating auto-disables the
whole package in work repos based on `git origin` (see `docs/repo-gating.md`).

## Full skill inventory

| Skill | Reach | Where it plugs in |
|---|---|---|
| `task-workflow-overview` | model | Router: intent to skill or flow; read-only `tw_*` query table |
| `setup-workflow` | user | Onboard or migrate (the v5 target: `schema_version: 5`) |
| `wayfinder` | user | Planning entry for foggy work: map plus decision tasks, mandatory grilling |
| `to-spec` | user | Collapse conversation or map decisions into `spec.md` |
| `to-tickets` | user | Spec to tracer-bullet tickets with `blocked_by` |
| `intake` | user | The front door: every request (bug included) becomes an effort |
| `implement-ticket` | model | The implementation phase: the ticket frontier in dependency levels, per-ticket chains, the inlined close-out (CI gate, changelog, done-marking, merge), and the failure toolbelt |
| `task-workflow-doctor` | model | Diagnose and route a broken workflow |
| `improve-codebase-architecture` | user | Survey, pick a candidate, hand to wayfinder |
| `grilling` | model | Interview primitive underneath many skills |
| `domain-modeling` | model | `CONTEXT.md` and ADR vocabulary layer |
| `codebase-design` | model | Deep-module vocabulary, architecture scout |
| `tdd` | model | Reference consulted by `tdd-worker` |
| `diagnosing-bugs` | model | Six-phase discipline for bug chains and standalone use |
| `code-review` | model | Two-axis advisory review (end-of-effort, bug diff) |
| `prototype` | model | Throwaway artifact answering one design question |
| `research` | model | Background cited-markdown investigation |
| `resolving-merge-conflicts` | model | In-progress merge or rebase |
| `wizard` | model | Generate a human-run bash wizard |
| `grill-me` | user | Stateless interview, no repo assumed |
| `handoff` | user | Transit doc across harness, directory, colleague, or fork |
| `to-questionnaire` | model | Turn an unanswerable decision into a questionnaire |
| `teach` | user | Multi-session learning |
| `wait-what` | user | Corrective for a message that did not land |
| `writing-for-agents` | model | Reference for agent-consumed prose |
| `skill-creator` | model | Author or fix an Agent Skill |
| `skill-review` | model | Multi-criterion review of an Agent Skill |
| `eval-review` | model | Review an Inspect eval suite or triage a failed run |

## Context-management rules baked into the flow

- One **unbroken context window** for grilling, to-spec, and to-tickets, so
  the spec and tickets inherit the reasoning verbatim.
- `implement-ticket` starts **fresh per ticket**; the ticket document is the
  contract, and the architecture document plus repo standards files are the
  pointers.
- `deviation-reporter` **forks** the tdd-worker's context; most other workers
  are fresh.
- `PHASE-BOUNDARIES.md` gives the ordered tree at any phase boundary:
  Continue, `/clear`, `/skill:handoff`, subagent, `/compact`. Continue when
  the next phase needs this phase as a primary source (the
  grilling-to-implementation case). `/clear` is the cheapest move but is
  one-way when the context is relevant.

## Audit notes

The flow is coherent and unusually disciplined about single-writer ownership,
but there is real drift:

1. **The top-level `README.md` is v2-era and violates `AGENTS.md`.** It still
   says "6 skills instead of 10", "3 agents instead of 7", "parallel fan-out
   with git worktrees", and "verifier retry path". The package is v4.0.0 with
   28 shipped skills, 11 agents, sequential same-level chains, and a
   diagnose/split/retry/escalate toolbelt. `AGENTS.md` also requires every
   promoted skill to be referenced in the top-level README, and it references
   none.
2. **`skills/engineering/README.md` is stale and miscategorized.** It lists
   `report-bug` (now in `deprecated/`), omits `to-spec`, `to-tickets`,
   `triage`, `prototype`, `research`, `resolving-merge-conflicts`, and
   `wizard`, and files `setup-workflow`, `to-spec`, `to-tickets`, and `triage`
   under Model-invoked when all four set `disable-model-invocation: true`. Its
   in-flight note about the `adopt-mp-skills-way` map has already landed.
3. **`skills/productivity/README.md` says the opposite of reality.** It
   claims `grill-me`, `handoff`, `to-questionnaire`, `teach`, and
   `writing-for-agents` are "added by the map"; they are present and shipped.
   `grill-me`, `handoff`, `teach`, and `wait-what` are user-invoked;
   `to-questionnaire` and `writing-for-agents` are model-invoked.
4. **Stale script headers contradict the async hard rule.** Both
   `ticket-chain.js` and `end-of-effort.js` still show `wait({ id }) // then
   read the result`, which commit `d6a74cd` removed from the prose docs.
5. **Done-versus-landed ordering is now pinned.** Landing does not set
   `workflow_state: done`; the inlined close-out marks the ticket done after
   the changelog entry, in the same run that landed it, and the end-of-effort
   pass runs once every ticket is done. A wayfinder reassessment between
   landing and the close-out still sees the ticket on the frontier, which the
   opener's in-progress-target rule accepts.
6. **Mixed-subtype efforts have no single driver.** The dependency-level loop
   lives in `feature/autonomous.md`; `bug/autonomous.md` is single-ticket with
   no levels. Since `to-tickets` can emit both `feature` and `bug` tickets in
   one effort, no resource walks both through levels.
7. **The single-session branch routes to the ticket phase, which needs an
   effort.** `task-workflow-overview` sends "not multi-session" to
   `/skill:implement-ticket` "right here"; the phase opens with an effort and
   a target ticket, so a solo build is a one-ticket effort through intake,
   not an artifactless invocation.
8. **Intake's output bridge is explicit.** Every request (bug included)
   becomes an effort: intake creates the map plus exactly one non-negotiables
   grilling task and, for a bug report, the `subtype: bug` ticket inside that
   effort, so `implement-ticket`'s resolver always finds effort-shaped
   `tasks/` and `tickets/`.
