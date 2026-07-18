# task-workflow

> Task → slices → TDD → finalize — a planning workflow for `docs/tasks/`.
>
> A **[pi package](https://pi.dev)** — one `pi install` away.

## What is this?

A workflow for planning and coordinating work:

- **Task** (`kind: task`) — a requirements doc for one feature or capability
- **Epic** (`kind: epic`) — a coordinated outcome spanning several tasks (optional)
- **Slice** (`kind: slice`) — an independently-grabbable, mergeable tracer-bullet

Everything lives in `docs/tasks/` under version control. **No GitHub/Forgejo
issues** — state lives entirely in the directory tree, frontmatter, and
`state.yaml`. Slice ordering uses `blocked_by` slugs.

## Design principles

1. **Many small, composable skills.** Each skill does one thing. Skills
   explicitly reference each other.

2. **Archive, never delete.** Done slices → `slices/archive/`. Done tasks →
   `archive/`. Done epics → `epics/archive/`. History is always recoverable.

3. **Internal tracking only.** No GitHub/Forgejo issues, no labels, no
   milestones. State lives entirely in `docs/tasks/` and frontmatter.

4. **Hard gates are executable.** "Run lint + test; block on non-zero"
   replaces manual checklists.

5. **One interactive phase.** All user interaction happens in `create-task`
   (task definition + testing strategy for all slices). Implementation is
   fully autonomous — the agent asks only when uncertain or when plan
   divergences threaten remaining slices.

## Install

```bash
# Local (during development)
pi install /path/to/task-workflow

# From git once published
pi install git:codeberg.org/Yashin/skills@v0.12.0
```

This auto-loads:

| Resource | What |
|---|---|
| **Extension** (`src/pi/index.ts`) | 18 `task_*` native tools + `/init-task-workflow` command |
| **Skills** (`skills/`) | 10 SKILL.md files |

Then in any repo:

```
/skill:onboard-workflow    # creates docs/tasks/
/skill:create-task         # start planning
```

## What you get

### Tools (agent-callable)

All artifact operations go through `task_*` tools — the agent calls them directly,
no bash subprocesses:

| Tool | What it does |
|---|---|
| `task_show`, `task_get`, `task_set` | Read/write frontmatter |
| `task_resolve`, `task_assert_kind` | Locate & verify artifacts |
| `task_list`, `task_slices` | List the planning tree |
| `task_finalizable`, `task_lint` | Readiness checks |
| `task_epic_tasks`, `task_epic_tick`, `task_epic_finalizable` | Epic management |
| `task_state`, `task_state_set` | Workflow state management |
| `task_reference`, `task_profile` | Context injection |
| `task_workflow_gate` | Setup check |

### Workflow steps

| Step | Skill | What the agent does |
|---|---|---|
| Setup | `/skill:onboard-workflow` or `/init-task-workflow` | Creates `docs/tasks/` |
| Plan | `/skill:create-task` | One interactive session: interviews for task definition AND per-slice testing strategy, writes task + slice docs with test plans |
| Build (all) | `/skill:pipeline-slices` | One big chain: implements every remaining slice autonomously (TDD → verify → divergence check → land) |
| Build (one) | `/skill:implement-slice` | Implements a single slice autonomously (TDD → verify → divergence check → land) |
| Close | `/skill:finalize-task` | Harvests knowledge, archives task |
| Migrate | `/skill:migrate-workflow` | Converts `docs/prd/` → `docs/tasks/` |

### Ad-hoc tasks

For a raw idea too small for the full pipeline but still wanting full control
(strict TDD + hard verify gate):

| Step | Skill | What the agent does |
|---|---|---|
| Refine | `/skill:adhoc-task` | Relentless grill on the idea → spec; then a testing-strategy feedback loop |
| Build | `/skill:adhoc-task` (chain) | `adhoc-refiner` → `tdd-worker` → `slice-verifier` |
| Harvest | `/skill:adhoc-task` | Migrate durable knowledge (architecture, decisions, testing lessons) to permanent docs |

Ad-hoc work creates **no `docs/tasks/` artifacts** — the spec is ephemeral,
living in the chain run directory. The git branch and chain logs are the
only audit trail. Requires `pi-subagents`.

## Full skill catalogue

### Orchestration

| Skill | Purpose |
|---|---|
| `task-workflow-overview` | Entry point. Routes queries to tools; routes actions to skills. |

### Planning

| Skill | Purpose |
|---|---|
| `create-task` | One interactive interview: task definition + per-slice testing strategy. Writes task.md and all slice docs with test plans. |

### Execution

| Skill | Purpose |
|---|---|
| `pipeline-slices` | Build a big chain implementing every remaining slice sequentially (TDD → verify → divergence check → land). |
| `implement-slice` | Build a single slice autonomously (TDD → verify → divergence check → land). |
| `adhoc-task` | Refine a raw idea → build under full control (ephemeral, no docs/tasks/ artifacts) |

### Completion

| Skill | Purpose |
|---|---|
| `finalize-task` | Hard CI gate, harvest knowledge, archive task |

### Infrastructure

| Skill | Purpose |
|---|---|
| `resume-workflow` | Read state + artifacts, report status |
| `migrate-workflow` | Migrate from old `docs/prd/` to `docs/tasks/` |
| `onboard-workflow` | Initialize a fresh repo |

## Development

```sh
npm install
npm test
npm run typecheck
```

The `pi` manifest in `package.json` is the single source of truth for
auto-discovery — no build step needed.