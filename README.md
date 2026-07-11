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
| **Skills** (`skills/`) | 16 SKILL.md files |

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
| Plan | `/skill:create-task` | Interviews you, writes `task.md` or `epic.md` |
| Slice | `/skill:slice-task` | Breaks a task into slice docs (+ sizing) |
| Analyse | `/skill:start-slice` | Grills on test strategy, appends test plan |
| Build | `/skill:implement-slice` | TDD: develop → verify → land |
| Close | `/skill:finalize-task` | Harvests knowledge, archives task |
| Migrate | `/skill:migrate-workflow` | Converts `docs/prd/` → `docs/tasks/` |

## Full skill catalogue

### Orchestration

| Skill | Purpose |
|---|---|
| `task-workflow-overview` | Entry point. Routes queries to tools; routes actions to skills. |

### Planning

| Skill | Purpose |
|---|---|
| `create-task` | Interview user, write `task.md` or `epic.md` |
| `grill-me` | Reusable interview discipline |
| `slice-task` | Break a task into vertical slices |
| `size-slices` | T-shirt sizing quiz per slice |

### Execution

| Skill | Purpose |
|---|---|
| `start-slice` | Understand the slice, decide test strategy |
| `implement-slice` | Orchestrate build: branch → TDD → verify → land |
| `develop-tdd` | RED → GREEN → REFACTOR loop |
| `verify-slice` | Hard gate: run lint + test, block on failure |
| `land-slice` | Merge into task branch, archive slice, update state |

### Completion

| Skill | Purpose |
|---|---|
| `finalize-task` | Hard CI gate, harvest knowledge, archive task |
| `summarize-task` | Write changelog entry |
| `archive-artifact` | Move done slice/task/epic to archive |

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