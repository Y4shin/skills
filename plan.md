# Architecture plan: Skills → Agents + Chains

Convert the task-workflow from a skill-based architecture to PiSubAgent chains
with focused subagents, using `contact_supervisor` for user interaction and
`{chain_dir}` for artifact management.

## Motivation

The current architecture mixes interactive skills (which run in the main agent
context and use `ask_user_question` / `grill-me`) with one-shot subagents (which
are isolated and parallelisable). This creates awkwardness:

- Artifact passing between skills and agents is ad-hoc (slice doc in repo, no
  canonical temp location).
- The `test-strategist` agent was stripped of its interactive approval step when
  converted from a skill, because subagents don't have `ask_user_question`.
- Iteration loops (generate → present → feedback → regenerate) require
  re-invoking agents with full context, wasting tokens.

The answer is to **use PiSubAgent chains** for everything executable, with
`contact_supervisor({ reason: "interview_request" })` as the bridge for user
interaction. The parent loop (`wait()` → relay → reply) is shared across all
chains.

## Chain mechanism (PiSubAgent)

Chains are **programmatic** — defined as `subagent({ chain: [...] })`:

```
subagent({
  chain: [
    { agent: "grill-agent", task: "..." },
    { agent: "test-strategist", task: "..." }
  ]
})
```

**Key mechanisms:**

| Mechanism | What it does |
| ----------- | ------------- |
| **Sequential steps** | Each step runs after the previous completes. Next step gets `{previous}` (prior output) |
| **Template variables** | `{task}` — original task, `{previous}` — last step's output, `{chain_dir}` — shared temp directory, `{outputs.name}` — output from a step tagged with `as: "name"` |
| **`{chain_dir}`** | A temp directory created for the chain at `/tmp/pi-subagents-uid-1000/chain-runs/<id>/`. All `output` paths are relative to it. Steps read each other's files |
| **`output` paths** | Each step writes to a file: `output: "strategy/draft.md"`. Later steps reference it via `{outputs.name}` |
| **Parallel groups** | A step can be a `parallel` group of agents running concurrently |
| **`async: true`** | The whole chain runs in background. Parent uses `wait()` to block until completion or attention needed |
| **Supervisor detach** | When a step calls `contact_supervisor` with `need_decision` or `interview_request`, the chain **detaches** via pi-subagents' native supervisor channel — parent gets control back, handles the interaction, resumes the child |

## Agent roster

### Existing agents (minor updates needed)

| Agent | File | Changes needed |
| ------- | ------ | --------------- |
| `test-strategist` | `agents/test-strategist.md` | Added `inheritProjectContext: true`. |
| `tdd-worker` | `agents/tdd-worker.md` | Already had `inheritProjectContext: true`. |
| `slice-verifier` | `agents/slice-verifier.md` | Added `inheritProjectContext: true`. |
| `task-summarizer` | `agents/task-summarizer.md` | Added `inheritProjectContext: true`. |

### New agents

| Agent | File | Interactive? | Purpose |
|-------|------|--------------|---------|
| **`grill-agent`** | `agents/grill-agent.md` | ✅ Yes | Autonomous interviewer. Given a context (feature idea, slice spec, proposed breakdown), walks decision trees, explores the codebase to answer questions itself, and asks the user one question at a time via `contact_supervisor({ reason: "interview_request" })`. Each question includes a recommended answer with reasoning. |
| **`approval-agent`** | `agents/approval-agent.md` | ✅ Yes | Presents a plan/strategy and asks for approval via `contact_supervisor({ reason: "need_decision" })`. Returns approved or routes back change requests. Handles revise-re-present loop internally. |

Everything else that's non-interactive uses the builtin `worker` or `delegate`
agent with a specific task prompt — no custom agent file needed.

## Chain definitions

### `create-epic` chain (iterative, not batch)

```
grill-agent  ──→  worker
(autonomous:   (write epic.md,
 what's the     list high-level tasks,
 goal? which    set state to point at first task)
 high-level
tasks?)
```

Story: The user says "I want to add a payment system." The grill-agent reads
the codebase, finds existing payment stubs, walks the decision tree: what
provider? what are the high-level tasks? what are the dependencies? It asks
the user one at a time with recommendations. A worker writes the epic doc with
the task list. Then the workflow **stops** — it does not auto-create child
tasks.

The reason: tasks created later benefit from context of what was actually
built in earlier tasks. Planning all tasks upfront leads to stale assumptions.
Instead, the user runs `start-next-task` (or equivalent) when they're ready
for the next one.

### `start-next-task` entry point (between epic and task creation)

```
worker  ──→  grill-agent  ──→  worker
(reads epic,  (autonomous with   (write task.md,
 finds next    full context of     slices, state)
 undone task,  what was already
 checks deps)  built)
```

Story: After the first task is finalized, the user runs `start-next-task`.
A worker reads the epic, finds the next undone task whose dependencies are
all done. The grill-agent explores the codebase with full context of what was
actually implemented, walks the decision tree for this specific task, and asks
the user with recommendations. A worker writes the task doc, slices, and sets
state.

### `create-task` chain (individual task, not from epic)

```
grill-agent  ──→  grill-agent  ──→  test-strategist  ──→  approval-agent  ──→  worker
(autonomous:   (autonomous:   (write test       (present all       (create task.md
 what, layers,  per-slice      plans to          strategies,        + slice docs
 boundaries,    layers,        {chain_dir}/      ask approve,       with test plans,
 slices)        failure modes, test-plans/)       iterate)           set state)
                testing)
```

Story: Two focused grill-agents keep context clean. The first defines the
task (who, outcome, layers, boundaries, slice breakdown). The second takes
that breakdown and interviews about per-slice testing strategy (layers,
failure modes, testing approach). The test-strategist generates test plans
for every slice. The approval-agent presents ALL strategies for one-shot
approval. A worker creates the task doc and all slice docs with their test
plans, setting `analysed: true, status: todo` — ready for autonomous
implementation.

### `start-slice` chain (REMOVED in v1.2.0)

This chain was folded into `create-task`. Per-slice testing strategy is now
designed during the initial create-task interview, alongside task definition.
No more per-slice interactive analysis step needed.

### `implement-slice` chain

```
worker  ──→  tdd-worker  ──→  slice-verifier  ──→  worker       ──→  worker
(branch,   (RED→GREEN→     (lint + test gate,   (divergence      (merge, notes,
 read doc)   REFACTOR,      hard block)          check: compare   archive, state)
             ask when                             plan vs built,
             uncertain)                           discussion if
                                                  needed)
```

Story: A worker creates the slice branch and loads context. The tdd-worker
runs strict RED → GREEN → REFACTOR, asking the supervisor when uncertain
about test plans or acceptance criteria. The slice-verifier runs lint and
test — hard gate, stops on failure. A divergence checker compares what was
built to the original plan; if significant deviations affect remaining
slices, it initiates a one-shot discussion with the user. A worker merges
into the task branch, appends implementation notes, archives the slice doc,
and updates state.

### `finalize-task` chain

```
worker  ──→  worker  ──→  task-summarizer  ──→  worker
(CI gate,   (harvest +  (write CHANGELOG     (archive task,
 block)      fold docs)   entry)               tick epic, clean state,
                                               merge to main)
```

Story: A worker runs the full CI — hard gate. A worker reads the task doc and
git log, folds durable knowledge into project docs (especially
`docs/testing.md`). The task-summarizer appends a changelog entry. A worker
archives the task directory, ticks the epic if applicable, clears state.yaml,
and merges to main.

### `onboard` / `migrate`

Single `worker` calls — simple enough to not need a chain.

## Agent feedback loops and context flow

### How context moves between steps

Each chain step is a separate child Pi process. When it completes, the process
exits and its session is discarded. The following mechanisms carry information
to the next step:

| Mechanism | What it carries | How the next step accesses it |
| ----------- | --------------- | ------------------------------ |
| **`{previous}`** | The agent's final output text (auto-captured) | Template variable in the next step's task string |
| **`output: "path"`** | File written to `{chain_dir}` by the step | `{outputs.name}` or `{chain_dir}/path` |
| **`{chain_dir}`** | Shared temp directory, survives across steps | Any step can read any file in it |

### How agents iterate internally

Interactive agents (`grill-agent`, `approval-agent`) handle their own iteration
loops — they do **not** rely on the chain to loop. Each `contact_supervisor`
call is a **blocking** file-system poll. The child process stays alive between
calls, preserving all accumulated context:

```
grill-agent (single chain step, alive the whole time):
  └─ read codebase, explore, think
  └─ contact_supervisor(interview_request) → blocks
  └─ receives reply → continues (same session, same context)
  └─ think: "what's the next question?"
  └─ contact_supervisor(interview_request) → blocks
  └─ receives reply → continues
  └─ ... until decision tree is fully explored
  └─ output structured summary → this becomes {previous}
```

The `grill-agent` never terminates between questions. It only finishes when
the decision tree is fully walked. The `approval-agent` works the same way:

```
approval-agent (single chain step, alive the whole time):
  └─ read strategy from {chain_dir}/draft.md
  └─ contact_supervisor(need_decision) → "Approve?"
  └─ receives reply
  └─ if approved: write to slice doc, return
  └─ if changes: edit the draft, go to 2
```

### Grill-agent output contract

When the grill-agent finishes, its `{previous}` output must contain a
structured summary of what was decided. The next step's task prompt tells it
to read this and act on it. The exact format is up to the agent, but it should
include:

- Confirmed answers to all questions
- The decision tree that was walked
- Any user preferences or constraints discovered
- Recommended next actions

The `{chain_dir}` can also hold a file like `grill/answers.json` for more
structured data, but `{previous}` is the primary handoff for the next step's
task prompt.

## The parent loop (shared across all interactive chains)

```typescript
const run = await subagent({ chain: [...], async: true })

while (true) {
  await wait()  // blocks until chain needs attention or completes

  const pending = await subagent_supervisor({ action: "pending" })
  if (pending.length === 0) break  // chain completed

  for (const request of pending) {
    if (request.reason === "interview_request") {
      // grill-agent is asking a question with a recommended answer
      const { question, context, recommended, reasoning } =
        JSON.parse(request.interview)

      const answer = await ask_user_question({
        question: `${question}\n\nRecommended: ${recommended}\nReasoning: ${reasoning}`,
        header: "Grill",
        options: [
          { label: "Accept", description: `Agree with: ${recommended}` },
          { label: "Custom", description: "Provide a different answer" }
        ]
      })

      await subagent_supervisor({
        action: "reply",
        replyTo: request.id,
        message: JSON.stringify({ answer })
      })
    } else if (request.reason === "need_decision") {
      // approval-agent is asking for approval
      await subagent_supervisor({
        action: "reply",
        replyTo: request.id,
        message: "approved"  // or "changes: ..."
      })
    }
  }
}
```

## What stays as a skill

| Skill | Why |
|-------|-----|
| `task-workflow-overview` | Read-only entry point — inspects state and tells the user which chain to run |
| `resume-workflow` | Read-only diagnostic — reports current state and suggests next chain |

## Obsolete skills (archived)

- `design-test-strategy` — replaced by `test-strategist` agent + approval step
- `develop-tdd` — replaced by `tdd-worker` agent
- `verify-slice` — replaced by `slice-verifier` agent
- `summarize-task` — replaced by `task-summarizer` agent
- `slice-task` — folded into `create-task` chain
- `size-slices` — folded into `create-task` chain
- `land-slice` — step in `implement-slice` chain
- `archive-artifact` — step in various chains
- `grill-me` — replaced by `grill-agent`

## Agent configuration guidelines

All agents in chains:

| Setting | Value | Why |
| --------- | ------- | ----- |
| `context` | `"fresh"` | Don't inherit parent session bloat. Keep focused. |
| `inheritProjectContext` | `true` | Let agents explore codebase, read docs, use guidelines tools. |
| Task prompt | Rich | Include goal, file paths to read, prior step outputs via `{previous}` / `{outputs.name}`. |

The `grill-agent` specifically: fresh context is recommended — the agent should
read the relevant files itself rather than rely on filtered conversation
fragments. Its sharpness comes from autonomy, not inherited history.

## Implementation status

| Step | Status | Details |
| ------ | -------- | --------- |
| 1. `grill-agent.md` | ✅ Done | `agents/grill-agent.md` |
| 2. `approval-agent.md` | ✅ Done | `agents/approval-agent.md` |
| 3. Update existing agents | ✅ Done | Added `inheritProjectContext: true` to all 4 agents |
| 4. Parent loop | ✅ Done | Pattern documented inline in each interactive chain-launching skill |
| 5. Remove model-router | ✅ Done | File deleted, package.json updated, tests pass |
| 6. Chain definitions | ✅ Done | `create-task` (two grill-agents), `implement-slice` (divergence check), `pipeline-slices` (big chain), `finalize-task` — all rewritten. `start-slice` removed. |
| 7. Archive obsolete skills | ✅ Done | 9 skills moved to `skills/archive/` |
| 8. Update overview skill | ✅ Done | `task-workflow-overview` updated with new routing table |
| 9. Integration tests | 🔄 In progress | `tests/agents.test.ts` — faux provider plumbing works, auth passes, but session doesn't route LLM calls through the faux model yet. See the STATUS comment at the top of the test file for debug state and next steps. |
