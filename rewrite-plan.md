# task-workflow v2 — Clean-Slate Rewrite

A from-scratch reimagining of this package. Incorporates lessons from the
original v1 codebase and from real pipeline runs (see `FEEDBACK.md`).

## What the Old One Got Right

1. **The three-phase model** (plan → implement → finalize) is sound.
2. **The task/slice hierarchy** (task = feature, slice = vertical tracer-bullet)
   is a good decomposition model.
3. **`docs/tasks/` as the single source of truth** — no external issue tracker,
   everything in git.

## What the Old One Got Wrong

1. **Too many abstraction layers.** 5 moving parts (extensions, skills, chains,
   agents, core) + `dist/` build. A skill file → chain JSON → agents → extension
   tools = 4 levels of indirection.

2. **Chain JSON files add indirection without value.** Just a list of agent steps
   with template variables. The SKILL.md already describes these in prose. The
   chain JSON drifts out of sync and requires `bash("cat chains/foo.chain.json")`
   boilerplate.

3. **Too many agents with unclear roles.** 7 agent definitions for 4 roles.
   The `worker` agent is a catch-all with no definition file. `grill-agent` and
   `approval-agent` are deprecated but still referenced.

4. **The extension is over-split.** 5 entry points. ObservMe bridge and
   plan-review are unrelated to the core workflow.

5. **No "just run it" simplicity.** A new user must understand pi extensions,
   SKILL.md frontmatter, chain JSON schema, agent frontmatter, template variable
   substitution, subagent lifecycle, artifact discovery.

6. **Skills are too long.** `pipeline-slices/SKILL.md` is 300+ lines of inline
   JavaScript pseudocode — half error-handling loops.

7. **Every skill duplicates the pre-flight check.** 7 files, same 15-line block.

8. **No parallelism.** Slices implement one at a time, even when independent.

9. **LLMs shouldn't run algorithms.** The skill file described a BFS dependency
   resolution in prose/pseudocode. That's work for a tool.

10. **No retry path for verifier failures.** The chain stops dead if lint or
    tests fail. No "go back and fix" loop.

11. **Divergence check was redundant.** TDD worker built to spec, verifier
    confirmed it. The separate diverge-check step caught nothing.

12. **Land step drifted out of scope.** The "mechanical merge and archive" agent
    started writing code for the next slice.

13. **No checkpoint commits.** When a timeout fired mid-step, partial work
    (written code, applied fixes) was uncommitted and lost.

14. **Fixed turn budget ignored slice size.** Small S slices got the same budget
    as large XL slices.

---

## Clean-Slate Design: Principles

1. **Three layers, not five.**
   - **One extension** (TypeScript) — registers `task_*` tools
   - **Agent definitions** (markdown) — subagent behavior
   - **N skills** (SKILL.md) — orchestration instructions for the parent
   No chain JSON files. No barrel exports. No `dist/` build output.

2. **Skills describe orchestration; agents describe execution.**
   A skill tells the parent what to orchestrate. An agent file tells a subagent
   how to behave. Neither references a chain JSON.

3. **Algorithms belong in tools, not in skill prose.** Dependency resolution,
   dependency-level computation, artifact tree walks — all implemented as
   extension tools. The LLM calls the tool and gets structured JSON back.

4. **Subagents are for parallelism, isolation, and focus.**
   - **Parallelism**: non-dependent slices implement concurrently via git worktrees
   - **Isolation**: each subagent starts with a clean fork of context
   - **Focus**: subagents run *inside worktrees* — the parent stays clean

5. **Failures must have recovery paths.** A verifier failure re-dispatches the
   TDD worker with the error output. Timeouts must not lose partial work.

6. **Core is pure data, not I/O.** No `node:fs` imports in core modules.

---

## Proposed File Structure

```
package.json
tsconfig.json
README.md

src/
  pi.ts                           ← ONE extension entry point
  core/
    art.ts                        # Artifact model + tree ops (in-memory, no I/O)
    frontmatter.ts                # YAML frontmatter (in-memory, no I/O)
    state.ts                      # Workflow state model (in-memory)
    err.ts                        # Error types

agents/
  tdd-worker.md                   # RED → GREEN → REFACTOR on one slice
  slice-verifier.md               # Run quality gate in one worktree
  land-worker.md                  # Purely mechanical: merge + archive + commit (NO code writing)

skills/
  task-overview/SKILL.md          # Entry point — routes queries
  create-task/SKILL.md            # Interactive: interview → write task + slice docs
  implement-task/SKILL.md         # Orchestrate parallel slice implementation
  finalize-task/SKILL.md          # CI gate + archive + merge
  onboard-workflow/SKILL.md       # Initialize repo

tests/
  plugin.test.ts                  # Tool registration + smoke tests
  art.test.ts                     # Artifact model (pure)
  frontmatter.test.ts             # Frontmatter parsing (pure)
  state.test.ts                   # State model (pure)
```

Files deleted from v1 — all dead, deprecated, or merged:

| Pattern | Count | Reason |
|---|---|---|
| `chains/*.chain.json` | 3 | Orchestration lives in SKILL.md |
| `skills/archive/*` | 9 | Dead, pre-chain-era skills |
| `skills/implement-slice/` | 1 | Merged into implement-task |
| `skills/pipeline-slices/` | 1 | Superseded by parallel fan-out |
| `skills/revise-task/` | 1 | Merged into create-task |
| `skills/adhoc-task/` | 1 | Folded into implement-task |
| `skills/resume-workflow/` | 1 | Folded into task-overview |
| `skills/migrate-workflow/` | 1 | Old format is dead |
| `agents/grill-agent.md` | 1 | Deprecated, unused |
| `agents/approval-agent.md` | 1 | Deprecated, unused |
| `agents/task-summarizer.md` | 1 | Trivially done by parent |
| `agents/test-strategist.md` | 1 | Done by parent in interview |
| `agents/adhoc-refiner.md` | 1 | Done by parent |
| `src/pi/guidelines.ts` | 1 | Merged into pi.ts |
| `src/pi/check-subagents.ts` | 1 | Merged into pi.ts |
| `src/pi/observme-bridge.ts` | 1 | Belongs in @senad-d/observme |
| `src/pi/plan-review.ts` (+ test) | 2 | Unused feature |
| `src/pi/ntfy.ts` | 1 | Merged into pi.ts (simplified) |
| `src/core/forge.ts` | 1 | Dead code |
| `src/core/forgejo.ts` | 1 | Dead code |
| `src/core/tracker.ts` | 1 | Dead code |
| `src/core/index.ts` | 1 | No barrel |
| `tools/` | 1 | Deprecated demos |
| `tests/forge*.ts`, `tracker.test.ts`, `ntfy.test.ts`, etc. | ~6 | Testing deleted code |

---

## The Workflow

### Phase 1: Create Task (only interactive phase)

The parent agent interviews the user one question at a time:

1. **Task definition** — title, description, user stories, layers,
   boundaries, out-of-scope
2. **Slice breakdown** — vertical pieces with `blocked_by` edges and
   `size` (S/M/L/XL)
3. **Per-slice testing strategy** — asked inline: what layers, what
   failure modes, what scenarios

The parent writes the task doc and all slice docs directly. No subagents.
No chain JSON.

**Dropped from v1:** The `analysed` flag disappears. Slices just have
`status: todo | in-progress | done`.

### Phase 2: Implement Task (autonomous, parallel, recovery-ready)

The parent calls `task_dependency_levels <task-slug>` which returns a
JSON array of dependency levels computed from `blocked_by` edges:

```json
// task_dependency_levels repo-foundation
[
  ["go-module-and-layout"],           // level 0: no deps
  ["env-loading", "migration-runner"], // level 1: depend on level 0
  ["http-server-skeleton"]             // level 2: depends on level 1
]
```

For each level, the parent dispatches subagents in parallel:

```
for each level in levels:
    results = subagent({
        parallel: level.map(slice => [
            { agent: "tdd-worker",   task: "...", worktree: true },
            { agent: "slice-verifier", task: "...", worktree: true }
        ]).flat(),
        concurrency: 4
    })

    for each result:
        if uncertainty artifact:
            ask user, retry
        elif verify failed:
            # Retry path: re-dispatch TDD worker with error output
            subagent({
                agent: "tdd-worker",
                task: `Fix these issues in {worktree}:
                       {verifier-error-output}
                       Do NOT redo completed work.`
            })
            subagent({ agent: "slice-verifier", ... })  // re-verify
        else:
            subagent({ agent: "land-worker",
                       task: "Merge worktree, archive slice doc, commit." })
```

**Lessons from FEEDBACK.md applied here:**
- **No divergence check step.** TDD + verify is the gate. Removed.
- **Verifier failures get a retry path.** Instead of stopping, re-dispatch
  TDD worker with the specific error output.
- **Land step is a restricted agent** (`land-worker`) with code write tools
  removed — it can only merge, archive, and commit.
- **Checkpoint commits:** The TDD worker commits after each GREEN cycle
  (`git commit -m "wip: <slice> test N passing"`). If a timeout fires,
  partial work is on the worktree branch, not lost.
- **Turn budget from slice size:** The `implement-task` skill reads each
  slice's frontmatter `size` field and picks a budget:
  - S: 15 turns / 120s timeout
  - M: 30 turns / 300s timeout
  - L: 60 turns / 600s timeout
  - XL: 90 turns / 1200s timeout

### Phase 3: Finalize Task (autonomous)

1. Run CI hard gate
2. Harvest knowledge into project docs
3. Write changelog entry (parent writes it — it's 3-5 lines from `git log`)
4. Archive task directory
5. Merge to main

---

## New Tool: `task_dependency_levels`

Registered by the extension. Takes a task slug, reads all remaining slices,
computes the BFS dependency levels from `blocked_by` edges, and returns
structured JSON.

```typescript
task_dependency_levels(selector: "repo-foundation")
// Returns:
// {
//   "levels": [
//     ["go-module-and-layout"],
//     ["env-loading", "migration-runner"],
//     ["http-server-skeleton"]
//   ],
//   "remaining": 4,     // non-done slices
//   "done": 1           // already-completed slices
// }
```

This is the **only** change to the extension tool set beyond what v1 had.
Everything else about dependency ordering is in the tool, not in LLM prose.

---

## What Subagents We Keep and Why

### tdd-worker (keep)

RED → GREEN → REFACTOR in a clean worktree. Commits after each GREEN
(checkpoint). Writes uncertainty artifact if stuck.

**Why not the parent?** Parallel worktree dispatch. Clean fork per slice.
Checkpoint commits survive timeouts.

### slice-verifier (keep, revived from v1)

Runs lint + tests inside a worktree. Reports pass/fail with full output.

**Why not the parent?** Parent is in the main tree. Subagent runs
in-place in the worktree. Parallelizes naturally with the fan-out.

### land-worker (new, replaces generic `worker`)

Purely mechanical: merge worktree branch → archive slice doc → add
implementation note → commit. Has code write tools **removed** so it
cannot drift into editing production code.

**Why separate from the parent?** Enforces scope. The v1 land step kept
drifting into writing the next slice's code. This agent has `tools: read,
bash` only — no `write` or `edit`. It literately cannot write code.

### What we drop

| Dropped agent | Why |
|---|---|
| `test-strategist` | Parent does test-plan writing inline during the interview |
| `task-summarizer` | 3-line changelog entry, trivially done by the parent |
| `worker` (generic) | Replaced by `land-worker` with explicit no-code-writing scope |
| `grill-agent` | Deprecated; parent interviews via `ask_user_question` |
| `approval-agent` | Deprecated; parent handles approvals inline |
| `adhoc-refiner` | Writing a spec file from structured output is a trivial write |

---

## Agent Definitions

### tdd-worker.md

```yaml
---
name: tdd-worker
description: Implement one slice via strict TDD in a git worktree.
  RED → GREEN → REFACTOR per acceptance criterion. Commits after each
  GREEN (checkpoint). Writes uncertainty.md and fails if stuck.
tools: read, write, edit, bash
inheritProjectContext: true
defaultContext: fresh
---
```

### slice-verifier.md

```yaml
---
name: slice-verifier
description: Run lint and tests in a slice worktree. Pass or list failures
  with full output. Blocks on failure.
tools: read, bash
inheritProjectContext: true
defaultContext: fresh
---
```

### land-worker.md

```yaml
---
name: land-worker
description: Merge a completed slice worktree into the task branch,
  archive the slice doc, add an implementation note, and commit.
  May NOT write or modify any source code, tests, or config files.
tools: read, bash
inheritProjectContext: true
defaultContext: fresh
---
```

---

## Extension (Simplified)

One file (`src/pi.ts`). Registers:

### New tool: `task_dependency_levels`

Reads task slug, computes BFS dependency levels from `blocked_by` edges,
returns JSON. Pure algorithm — the LLM should not implement BFS in prose.

### Task tools (17 total)

Dropped from v1:
- `task_workflow_gate` — unused; skills check via bash
- `task_lint` — lives in slice-verifier, not a registered tool

Renamed:
- `task_reference` + `task_profile` → `task_context`

Fixed from v1 (feedback_01.md):
- `task_set`, `task_show`, `task_get`, `task_resolve`, `task_assert_kind`
  all accept slice artifacts resolved by slug (disambiguated via active task)
  or by full path under `docs/tasks/<slug>/slices/<n>-<slug>.md`
- `task_assert_kind` accepts `kind: slice`

Kept: `task_show`, `task_get`, `task_set`, `task_set_slices`,
`task_resolve`, `task_assert_kind`, `task_list`, `task_slices`,
`task_finalizable`, `task_dependency_levels`, `task_map_tasks`,
`task_map_tick`, `task_map_finalizable`, `task_state`,
`task_state_set`, `task_context`.

### notify_user tool

Simplified. No auto-notification hooks on `message_end`.

### Lifecycle hooks

Kept:
- `before_agent_start` — inject coding guidelines
- `session_start` — detect pi-subagents availability

Dropped:
- ObservMe env-var injection (belongs in ObservMe package)
- Plan-review hooks (feature removed)
- `message_end` ntfy auto-notifications (call notify_user explicitly)

---

## Coding Guidelines

Keep the auto-injection system (`get_guidelines`, `list_guidelines`), but
simplify:

- Auto-discover guideline files from `docs/` (same naming patterns)
- Inject at session start and after state changes
- Drop the `tool_call` language-detection heuristic (over-engineered)

---

## State Model

```yaml
# docs/tasks/state.yaml
task: null     # active task slug
slice: null    # active slice slug
```

Dropped from v1:
- `active.map` — redundant (map field is in task frontmatter)
- `last_action`, `next_action` — redundant (parent reads frontmatter status)

---

## What Changes From v1 to v2

| Aspect | v1 | v2 |
|---|---|---|
| Abstraction layers | 5 | 3 (ext, agents, skills) |
| Extension files | 5 | 1 |
| Agent definitions | 7 files (+1 missing) | 3 files |
| Chain JSON files | 3 | 0 |
| Subagents used | 7 (+2 deprecated) | 3 |
| Skills | 10 active + 1 entry + 9 archived | 5 |
| Implementation model | Sequential per-slice chains | Parallel fan-out with worktrees |
| Dependency resolution | LLM-pseudocode BFS | `task_dependency_levels` tool |
| Verifier failure | Chain stops, manual fix | Retry: re-dispatch TDD with errors |
| Divergence check | Separate step, caught nothing | Deleted |
| Land step scope | Drifted into writing code | `land-worker`: no write tools at all |
| Checkpoint commits | None — timeout lost work | Commit after each GREEN |
| Turn budget | Fixed per chain | S/M/L/XL from slice frontmatter |
| Pre-flight checks | Copy-pasted × 7 skills | Removed entirely |
| Slice tool support | Broken (feedback_01.md) | All tools accept slices |
| Test files | ~15 | 4 |
| Core modules | 7 files + barrel | 4 files |
| State.yaml fields | 7 (inc nested) | 2 |
| Finished files | ~60 | ~22 |

---

## What the Final Package Looks Like

```
~22 files, 3 layers.

5 skills instead of 10 (+ 9 archived).
3 agents instead of 7 (+ 2 deprecated + 1 missing).
1 extension instead of 5.
4 core modules instead of 7 (+ barrel).
4 test files instead of ~15.

No chain JSON files.
No archived skills.
No dead code.
No LLM-implemented algorithms.
Parallel fan-out with worktrees.
Verifier retry recovery.
Checkpoint commits prevent data loss.
Size-based turn budgets.
```

## Migration: v1 → v2

1. Publish v2 as `task-workflow@2.0.0`
2. v1 remains installable for existing repos
3. Existing `docs/tasks/` trees are structurally compatible with v2
4. Old tasks are read-only in v2 (visible via `task_list`, `task_show`,
   but not buildable via the new parallel flow)
