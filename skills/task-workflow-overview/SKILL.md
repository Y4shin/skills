---
name: task-workflow-overview
description: >
  Entry point for task/epic/slice questions in repos using the task-workflow
  (docs/tasks/ tree). Use when: 'is this task ready?', 'what's left on task X?',
  'list the planning tree', 'status of task X?', 'is the planning tree valid?',
  or the first planning question in a fresh conversation. Routes action requests
  to the matching skill.
---

# Working with Tasks (task-workflow)

This repo uses the **task-workflow**: a planning tree under `docs/tasks/` of
epics, tasks, and slices, managed by a set of tools.

Use the registered `task_*` tools (`task_show`, `task_list`, `task_get`,
`task_set`, `task_resolve`, `task_assert_kind`, `task_slices`,
`task_finalizable`, `task_lint`, `task_epic_*`, `task_state`, `task_state_set`,
`task_reference`, `task_profile`, `task_workflow_gate`) to query and mutate the
planning tree. **Prefer these tools over shelling out or hand-editing
frontmatter.**

## Workflow overview

The workflow has three phases:

1. **create-task** — the ONLY interactive phase. The user defines the task and
   reviews test strategies for every slice in one sitting.
2. **pipeline-slices** (or **implement-slice** one-at-a-time) — fully
   autonomous TDD implementation. The agent asks only when uncertain or when
   plan divergences affect remaining slices.
3. **finalize-task** — CI gate, knowledge harvesting, changelog, archive, merge.

## Answering questions — read-only

| The user asks… | Run tool |
| --- | --- |
| "Is this task ready (to finalize)?" | `task_finalizable <slug>` |
| "What's left / which slices are open on task X?" | `task_slices <slug>` |
| "List the tasks / epics / what's in progress?" | `task_list` (optionally with `status` or `kind` filter) |
| "Show task/epic X (its frontmatter / status)." | `task_show <slug>` |
| "What's the file path for X?" | `task_resolve <slug>` |
| "Is the epic done / what are its child tasks?" | `task_epic_finalizable` / `task_epic_tasks` |
| "Is the planning tree valid / any malformed docs?" | `task_lint` |
| "Where am I in the workflow?" | `task_state` |
| "What's the workflow state?" | `task_state` |

**"Is this task ready?" specifically:** `task_finalizable <slug>` returns
"ready to finalize" when every slice has been implemented and archived, or lists
the still-open slice numbers otherwise. Treat that as the answer.

## Doing work — route to the right skill

For anything that *creates or changes* artifacts, invoke the matching skill:

| Action | Skill |
| --- | --- |
| Resume after interruption | `/skill:resume-workflow` |
| New task or epic (with test strategies) | `/skill:create-task` |
| Build all remaining slices autonomously | `/skill:pipeline-slices` |
| Build a single slice (TDD) | `/skill:implement-slice` |
| Close out a task (or epic) | `/skill:finalize-task` |
| Migrate from old prd-workflow | `/skill:migrate-workflow` |
| Init a fresh repo | `/skill:onboard-workflow` |

**Orchestrator skills** (`create-task`, `implement-slice`, `pipeline-slices`,
`finalize-task`) dispatch subagent chains for heavy-lifting work. The chains
may pause for user input via `contact_supervisor` only when necessary.

| Chain | Steps |
| --- | --- |
| **create-task** | grill-agent → test-strategist → approval-agent → worker |
| **implement-slice** | worker → tdd-worker → slice-verifier → worker (diverge) → worker (land) |
| **pipeline-slices** | For each slice: worker (setup) → tdd-worker → slice-verifier → worker (diverge) → worker (land) |
| **finalize-task** | worker → task-summarizer → worker |

**Agents** used by these chains:

| Agent | Role |
| --- | --- |
| `grill-agent` | Autonomous interviewer — explores codebase, asks user one question at a time |
| `approval-agent` | Presents plans/strategies for user approval, handles revise-re-present loop |
| `test-strategist` | Designs test plans from slice requirements and failure modes |
| `tdd-worker` | RED → GREEN → REFACTOR implementation, asks when uncertain |
| `slice-verifier` | Lint + test quality gate |
| `task-summarizer` | Writes changelog entries |

Subagents require `pi-subagents` to be installed (`pi install
npm:pi-subagents`).

## Project-level files

| File | Purpose |
| --- | --- |
| `docs/tasks/` | Planning tree (epics, tasks, slices) |
| `docs/testing.md` | Test infrastructure, conventions, and commands |
| `docs/<lang>-guidelines.md` | Language-specific coding conventions (auto-discovered by the guidelines extension) |

## Guideline tools

| Tool | Purpose |
| --- | --- |
| `get_guidelines(language?, topic?)` | Fetch coding conventions for a language or topic |
| `list_guidelines()` | List all available guideline sources in the project |

These tools are registered by the **coding-guidelines extension** shipped with
this package. The extension also auto-injects a reference to relevant guidelines
into the system prompt at session start and when the workflow state changes.

## Rules

- **Use the task_* tools** as the only interface to the planning tree. No ad-hoc
  scripts, no hand-editing frontmatter; ad-hoc approaches drift from the schema
  and corrupt workflow state.
- Answer read-only questions from the tool's output; for actions, invoke the
  matching skill.
- **Archive, never delete.** Done slices move to `slices/archive/`. Done tasks
  move to `archive/`. Done epics move to `epics/archive/`.
- **Internal tracking only.** No GitHub/Forgejo issues. State lives entirely in
  `docs/tasks/` directory tree and frontmatter.
- **Create-task is the only interactive phase.** After that, implementation
  is autonomous. The agent asks only when genuinely uncertain or when plan
  divergences threaten remaining slices.
