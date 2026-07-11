# Enhanced task-workflow plan

Adopt high-value, low-overhead patterns from bigpowers into the existing
prd-workflow, while restructuring for composability, archival, and internal-only
tracking.

## Design principles

1. **Many small, composable skills.** Each skill does one thing. Skills
   explicitly reference each other. An agent can invoke any skill directly or
   compose them through handoff.

2. **Archive, never delete.** Done slices move to `slices/archive/`. Done tasks
   move to `archive/`. Done epics move to `epics/archive/`. History is always
   recoverable.

3. **Internal tracking only.** No GitHub/Forgejo issues, no labels, no
   milestones. State lives entirely in the `docs/tasks/` directory tree and
   frontmatter. Slice ordering uses `blocked_by` slugs, not issue numbers.

4. **Rename PRD → Task.** Throughout: `prd.md` → `task.md`, `create-prd` →
   `create-task`, `prd_*` tools → `task_*` tools, `docs/prd/` → `docs/tasks/`.

5. **State lives where it naturally belongs.** Session resumption in
   `state.yaml`. Slice lifecycle in slice frontmatter. Task-level tracking in
   task frontmatter. No central cockpit duplicating artifact data.

6. **Hard gates are executable.** "Run lint + test; block on non-zero"
   replaces manual checklists.

---

## Directory structure

```
docs/tasks/
├── state.yaml                          # session resumption
├── CHANGELOG.md                        # completed task summaries
├── <task-slug>/                        # active task
│   ├── task.md
│   └── slices/
│       ├── <n>-<slug>.md               # todo / in-progress
│       └── archive/                    # done slices
│           └── <n>-<slug>.md
├── archive/                            # completed tasks
│   └── <task-slug>/
│       ├── task.md
│       └── slices/
│           ├── <n>-<slug>.md
│           └── archive/
│               └── <n>-<slug>.md
├── epics/
│   ├── <epic-slug>/
│   │   └── epic.md                     # active epic
│   └── archive/                        # completed epics
│       └── <epic-slug>/
│           └── epic.md
```

**Archive rules:**
- Slice done → `mv slices/<n>-<slug>.md slices/archive/<n>-<slug>.md`
- Task done → `mv docs/tasks/<slug>/ docs/tasks/archive/<slug>/`
- Epic done → `mv docs/tasks/epics/<slug>/ docs/tasks/epics/archive/<slug>/`

---

## State distribution

| Data | Location |
|---|---|
| Active task / slice / epic | `docs/tasks/state.yaml` `active` block |
| Next action | `docs/tasks/state.yaml` `next_action` |
| Last completed action | `docs/tasks/state.yaml` `last_action` |
| Slice status, size, timestamps | Slice doc frontmatter |
| Task status, timestamps | Task doc frontmatter |
| Epic status, timestamps | Epic doc frontmatter |
| Completed task log | `docs/tasks/CHANGELOG.md` |

### `docs/tasks/state.yaml`

```yaml
# Session resumption. Never duplicates artifact frontmatter data.
active:
  task: <slug>          # null if none
  slice: <slug>         # null if none
  epic: <slug>          # null if standalone task
last_action: <string>   # e.g. "implement-slice completed <slug>"
next_action: <string>   # e.g. "start-slice <slug>" or "finalize-task <slug>"
```

---

## Full skill catalogue (17 skills)

### Orchestration

| Skill | Purpose |
|---|---|
| `task-workflow-overview` | Entry point. Routes queries to tools; routes actions to skills. |

### Planning

| Skill | Purpose | Calls |
|---|---|---|
| `create-task` | Interview user, write `task.md` or `epic.md` | `grill-me` |
| `grill-me` | Reusable interview discipline: ask one question at a time, recommend + reason, iterate | — |
| `slice-task` | Break a task into vertical slices, write slice docs | `size-slices` |
| `size-slices` | T-shirt sizing quiz per slice (S ≤1h / M ≤4h / L ≤1d / XL >1d) | `grill-me` |

### Execution

| Skill | Purpose | Calls |
|---|---|---|
| `start-slice` | Understand the slice, decide test strategy, write test plan | `grill-me` |
| `implement-slice` | Orchestrate the full build: branch → TDD → verify → land | `develop-tdd`, `verify-slice`, `land-slice` |
| `develop-tdd` | RED → GREEN → REFACTOR loop against the test plan | — |
| `verify-slice` | Hard gate: run lint + test, block on failure | — |
| `land-slice` | Merge into task branch, conventional commit, archive slice, update state | `archive-artifact` |

### Completion

| Skill | Purpose | Calls |
|---|---|---|
| `finalize-task` | Hard CI gate, harvest knowledge, archive task, clear state | `summarize-task`, `archive-artifact` |
| `summarize-task` | Write changelog entry for a completed task | — |
| `archive-artifact` | Move a done slice, task, or epic to its archive directory | — |

### Infrastructure

| Skill | Purpose |
|---|---|
| `resume-workflow` | Read `state.yaml` + artifacts, report where you are and what's next |
| `migrate-workflow` | Migrate a repo from old prd-workflow (docs/prd/, forge issues) to new task-workflow |
| `onboard-workflow` | Initialize a fresh repo for task-workflow: create `docs/tasks/`, `state.yaml`, `CHANGELOG.md` |

---

## Tool catalogue (renamed from `prd_*` → `task_*`)

All `prd_*` tools are renamed to `task_*`. `prd_forge` is **dropped** entirely.

| Old name | New name | Notes |
|---|---|---|
| `prd_show` | `task_show` | |
| `prd_get` | `task_get` | |
| `prd_set` | `task_set` | |
| `prd_resolve` | `task_resolve` | |
| `prd_assert_kind` | `task_assert_kind` | |
| `prd_list` | `task_list` | Respects archive — only lists active (non-archived) by default |
| `prd_slices` | `task_slices` | Respects archive — only lists active slices |
| `prd_set_slices` | `task_set_slices` | |
| `prd_finalizable` | `task_finalizable` | |
| `prd_lint` | `task_lint` | Scans archive dirs too, reports separately |
| `prd_epic_prds` | `task_epic_tasks` | |
| `prd_epic_prd_issue` | dropped | No more issue numbers |
| `prd_epic_set_prd_issue` | dropped | No more issue numbers |
| `prd_epic_tick` | `task_epic_tick` | |
| `prd_epic_finalizable` | `task_epic_finalizable` | |
| `prd_forge` | **dropped** | No more forge integration |
| `prd_reference` | `task_reference` | |
| `prd_profile` | `task_profile` | |
| `prd_workflow_gate` | `task_workflow_gate` | |

---

## Frontmatter schemas

### Task (`task.md`)

```yaml
---
kind: task
title: <short human title>
slug: <kebab-slug>
epic: <epic-slug>              # OPTIONAL
slices: [<slug-a>, <slug-b>]   # slice slugs in dependency order
status: draft | slices-planned | in-progress | done
started_at: <ISO 8601>
completed_at: <ISO 8601>
---
```

### Slice (`slices/<n>-<slug>.md`)

```yaml
---
kind: slice
title: <short human title>
slug: <kebab-slug>
task: ../task.md
mode: hitl | afk
analysed: false
status: todo | in-progress | done
size: s | m | l | xl
blocked_by: [<slug>, ...]     # slice slugs, not issue numbers
started_at: <ISO 8601>
completed_at: <ISO 8601>
---
```

### Epic (`epic.md`)

```yaml
---
kind: epic
title: <short human title>
slug: <kebab-slug>
tasks:                          # ordered child task decomposition
  - slug: <task-slug>
    blocked_by: [<task-slug>, ...]
    done: false
status: draft | tasks-planned | in-progress | done
started_at: <ISO 8601>
completed_at: <ISO 8601>
---
```

---

## Skill specifications

---

### `task-workflow-overview`

```yaml
name: task-workflow-overview
description: >
  Entry point for task/epic/slice questions in repos using the task-workflow
  (docs/tasks/ tree). Use when: 'is this task ready?', 'what's left on task X?',
  'list the planning tree', 'status of task X?', 'is the planning tree valid?',
  or the first planning question in a fresh conversation. Routes action requests
  to the matching skill.
```

**Read-only queries — use `task_*` tools:**

| Question | Tool |
|---|---|
| "Is this task ready to finalize?" | `task_finalizable <slug>` |
| "What slices are open on task X?" | `task_slices <slug>` |
| "List tasks / epics / what's in progress?" | `task_list` (with `status`/`kind` filter) |
| "Show task/epic X (frontmatter + status)." | `task_show <slug>` |
| "What's the file path for X?" | `task_resolve <slug>` |
| "Is the epic done / what are its child tasks?" | `task_epic_finalizable` / `task_epic_tasks` |
| "Is the planning tree valid?" | `task_lint` |

**Actions — route to the matching skill:**

| Action | Skill |
|---|---|
| Resume after interruption | `resume-workflow` |
| New task or epic | `create-task` |
| Slice a task | `slice-task` |
| Size the slices | `size-slices` |
| Analyse a slice's test strategy | `start-slice` |
| Build a slice (TDD) | `implement-slice` |
| Close out a task (or epic) | `finalize-task` |
| Archive something | `archive-artifact` |
| Migrate from old prd-workflow | `migrate-workflow` |
| Init a fresh repo | `onboard-workflow` |

---

### `onboard-workflow`

```yaml
name: onboard-workflow
description: >
  Initialize a repository for task-workflow. Creates docs/tasks/ directory
  structure, state.yaml, and CHANGELOG.md. Use on a fresh repo that has never
  used prd-workflow or task-workflow before. For repos migrating from the old
  prd-workflow, use migrate-workflow instead.
```

**Steps:**

1. Check `task_workflow_gate`. If `docs/tasks/` already exists, stop and report:
   "This repo is already initialized. If you need to migrate from the old
   prd-workflow (docs/prd/), use `/skill:migrate-workflow`."
2. Create directory structure:
   ```bash
   mkdir -p docs/tasks/archive
   mkdir -p docs/tasks/epics/archive
   ```
3. Create `docs/tasks/state.yaml`:
   ```yaml
   active:
     task: null
     slice: null
     epic: null
   last_action: onboard-workflow initialized repo
   next_action: create-task
   ```
4. Create `docs/tasks/CHANGELOG.md`:
   ```markdown
   # Task Changelog
   ```
5. Commit: `chore: initialize task-workflow`.
6. Report: "Ready. Run `/skill:create-task` to start your first task."

**Handoff:** → `create-task`

---

### `migrate-workflow`

```yaml
name: migrate-workflow
description: >
  Migrate a repository from the old prd-workflow (docs/prd/ directory, forge
  issue tracking) to the new task-workflow (docs/tasks/ directory, internal
  tracking only, archive model). Handles renaming, frontmatter updates, forge
  cleanup, and directory restructuring. Use on repos that already have
  docs/prd/. For fresh repos, use onboard-workflow instead.
```

**Steps:**

1. **Inventory.** Run `task_lint` on the old `docs/prd/` tree. List all
   artifacts: PRDs, epics, slices. For each, note the current forge issue
   numbers (they'll be dropped).

2. **Confirm.** Present the migration plan:
   - N PRDs → N tasks
   - M slices (will keep slugs, drop issue numbers)
   - E epics
   - Forge issues will be referenced in migration notes but no longer tracked.
   Ask: "Proceed with migration? Forge issues will not be modified — you must
   close them manually if desired."

3. **Create new structure.** Run `onboard-workflow` steps 2–4 internally to
   create `docs/tasks/` if it doesn't exist.

4. **Migrate each artifact:**
   - **PRD → Task:** `git mv docs/prd/<slug>/prd.md docs/tasks/<slug>/task.md`.
     Update frontmatter: `kind: prd` → `kind: task`. Drop `prd_issue`,
     `milestone`. Convert `slices: [<#a>, <#b>]` to `slices: [<slug-a>,
     <slug-b>]` (resolve each issue number to the corresponding slice slug).
     Keep `status`, `epic` references.
   - **Slice:** `git mv docs/prd/<slug>/slices/<n>-<old-slug>.md
     docs/tasks/<slug>/slices/<n>-<slug>.md`. Update frontmatter: `kind: prd` →
     `kind: slice`. Drop `issue`. Update `prd: ../prd.md` → `task: ../task.md`.
     Add `status: done` if previously completed, `status: todo` otherwise. Add
     `blocked_by: []` (or infer from old forge dependencies if possible). Add
     `size: m` (default, can be re-sized later).
   - **Epic:** `git mv docs/prd/epics/<slug>/epic.md
     docs/tasks/epics/<slug>/epic.md`. Update frontmatter: drop
     `epic_milestone`. In `prds:` → `tasks:`, drop `issue` from each child.

5. **Archive completed artifacts.** For any artifact with `status: done`:
   - If slice: move to `slices/archive/`.
   - If task: move to `docs/tasks/archive/<slug>/`.
   - If epic: move to `docs/tasks/epics/archive/<slug>/`.

6. **Write migration note.** Append to `docs/tasks/CHANGELOG.md`:
   ```markdown
   ## <date> — Migration from prd-workflow
   
   Migrated N tasks, M slices, E epics from docs/prd/ to docs/tasks/.
   Forge issue tracking dropped. See git history for old issue references.
   ```

7. **Clean up.** Remove the old `docs/prd/` directory (after confirming nothing
   else depends on it): `git rm -r docs/prd/`.

8. **Set state.** Write `state.yaml` with `active` cleared and
   `last_action: migrate-workflow completed`. Commit everything: `chore: migrate
   from prd-workflow to task-workflow`.

9. **Report.** Summary of what was migrated, what was archived, and what forge
   issues the user may want to close manually.

**Handoff:** → `resume-workflow`

---

### `resume-workflow`

```yaml
name: resume-workflow
description: >
  Resume work after interruption. Reads docs/tasks/state.yaml and artifact
  frontmatter to determine where you are and what to do next. Use when returning
  to a project after a break, or when the agent is unsure of current workflow
  state.
```

**Steps:**

1. Check if `docs/tasks/state.yaml` exists. If not: "No active workflow. Run
   `/skill:onboard-workflow` to initialize, or `/skill:migrate-workflow` if
   migrating from prd-workflow."
2. Read `state.yaml`. Extract `active`, `last_action`, `next_action`.
3. If `active.task` is set, read `docs/tasks/<slug>/task.md` frontmatter.
   Report task title, status, remaining slices (via `task_slices <slug>`).
4. If `active.slice` is set, read the slice doc. Report status, test plan,
   size estimate.
5. Report a clean summary:
   ```
   Active: task "<title>" (<slug>) — status: <status>
   Active slice: #<n> "<title>" (<slug>) — status: <status>, size: <size>
   Last action: <last_action>
   Next: <next_action>
   ```
6. If `next_action` names a skill, suggest exactly: "Run
   `/skill:<next_action>` to continue."

**Handoff:** None — this is a read-only diagnostic. The agent decides what to
do with the information.

---

### `create-task`

```yaml
name: create-task
description: >
  Interview the user to produce a task doc committed to
  docs/tasks/<slug>/task.md, or an epic at docs/tasks/epics/<slug>/epic.md.
  Uses grill-me for the interview. Use when starting a new feature, capability,
  or multi-task outcome. Hands off to slice-task.
```

**Prerequisites:** `docs/tasks/` exists (run `onboard-workflow` or
`migrate-workflow` first).

**Steps:**

1. **Check for collisions.** `task_list` to see existing artifacts.
2. **Load context.** `task_profile` (project conventions), `task_reference`
   (frontmatter schema).
3. **Determine scope.** Single task or epic? If single task → Step 4. If epic
   → Step 6 (epic branch).
4. **Grill.** Invoke `grill-me` with the interview agenda:
   - Who is the user and what outcome do they get?
   - End-to-end behaviour / API surface.
   - Layers / surfaces touched.
   - What's explicitly out of scope.
   - Initial slice breakdown ideas (rough, will be refined by `slice-task`).
5. **Write task.md.** Write to `docs/tasks/<slug>/task.md`:
   ```markdown
   ---
   kind: task
   title: <title>
   slug: <slug>
   epic: <epic-slug>        # OPTIONAL
   slices: []
   status: draft
   started_at: <ISO now>
   completed_at: null
   ---

   # <title>

   ## Problem / why
   ## User stories / behaviour
   ## End-to-end behaviour
   ## Layers touched
   ## Out of scope
   ## Slice breakdown
   ## Open questions

   ## Implementation notes
   ```
6. **Initialize state.** Write to `docs/tasks/state.yaml`:
   ```yaml
   active:
     task: <slug>
     slice: null
     epic: null              # or <epic-slug>
   last_action: create-task wrote task.md for <slug>
   next_action: slice-task <slug>
   ```
   If another task is already active, warn first: "Task `<old-slug>` is still
   active. Overwrite?" Don't overwrite without confirmation.
7. **Commit.** `docs(task): add <slug> task`.
8. **Epic branch (Step 6).** If this is an epic:
   - Write `docs/tasks/epics/<slug>/epic.md` with `kind: epic`, `tasks: []`,
     `status: draft`.
   - Break into the fewest coherent child tasks. Present decomposition.
   - After approval, set `status: tasks-planned`, fill `tasks:` list.
   - Hand off each child to `create-task` serially, seeding `epic: <slug>`.

**Handoff:** "Ready for `/skill:slice-task <slug>`."

---

### `grill-me`

```yaml
name: grill-me
description: >
  Reusable interview discipline for task-workflow skills. Ask one question at a
  time. Always give a recommended answer with reasoning first, then ask. Drive
  toward clarity on the supplied agenda. Called by create-task, start-slice,
  and size-slices. Not invoked directly by the user.
```

**Protocol:**

1. Receive an agenda from the calling skill: a list of questions in dependency
   order.
2. For each question:
   a. If the answer is obvious from code/docs, answer it yourself and move on.
   b. Otherwise, state your recommended answer with reasoning.
   c. Ask the user: "Does this sound right? Any corrections?"
   d. Iterate until confirmed.
3. When all questions are answered, return the confirmed answers to the calling
   skill.

**Constraints:**
- One question at a time. Never ask multiple questions in one prompt.
- English only.
- If the user pushes back, adapt — don't defend the recommendation.

**Handoff:** Returns control to the calling skill with confirmed answers.

---

### `slice-task`

```yaml
name: slice-task
description: >
  Break a task into independently-grabbable vertical slices, write slice docs,
  and record slices in the task frontmatter. Calls size-slices for estimation.
  Use after create-task.
```

**Prerequisites:** `task.md` exists with `status: draft`.

**Steps:**

1. **Explore.** Read `task.md` in full. Explore the codebase if needed.
2. **Draft slices.** Break the task into vertical tracer-bullet slices. Each
   cuts through all relevant layers end-to-end. Each is:
   - **HITL** (needs a design decision) or **AFK** (autonomous)
   - Independently demonstrable
   - As thin as possible
3. **Quiz.** Present breakdown: title, mode, blocked_by (slugs of earlier
   slices), behaviour covered. Iterate until approved.
4. **Size.** Invoke `size-slices <task-slug>`. This iterates each slice, asks
   for t-shirt size, and writes `size` to each slice doc's frontmatter.
5. **Write slice docs.** For each slice, in dependency order, write
   `docs/tasks/<task-slug>/slices/<n>-<slug>.md`:
   ```markdown
   ---
   kind: slice
   title: <slice title>
   slug: <slice-slug>
   task: ../task.md
   mode: hitl | afk
   analysed: false
   status: todo
   size: s | m | l | xl
   blocked_by: [<slug>, ...]
   started_at: null
   completed_at: null
   ---

   # Slice #<n> — <title>

   ## What to build
   <end-to-end behaviour>

   ## Acceptance criteria
   - [ ] …

   ## Blocked by
   - <slug> — <reason>  |  None — can start immediately

   ## Test plan          ← appended by start-slice
   ```
6. **Update task.** `task_set_slices <task-slug> <slug-a> <slug-b> ...`. Set
   `task_set <task-slug> status slices-planned`.
7. **Update state.**
   ```yaml
   last_action: slice-task created <N> slices for <task-slug>
   next_action: start-slice <first-slice-slug>
   ```
8. **Commit.** `docs(task): slice <task-slug> into <N> slices`.

**Handoff:** Report each slice with slug, mode, size, blocked_by. "Next:
`/skill:start-slice <first-slice-slug>`."

---

### `size-slices`

```yaml
name: size-slices
description: >
  Assign t-shirt sizes to a task's slices. Uses grill-me to iterate through
  each slice one at a time. Called by slice-task. Can also be invoked
  independently to re-size slices.
```

**Prerequisites:** Slice docs exist.

**Steps:**

1. Read the task's slice list from `task_slices <task-slug>`.
2. For each slice (in dependency order):
   a. Present: title, mode (HITL/AFK), blocked_by, acceptance criteria count.
   b. Via `grill-me`: "Size estimate? S (≤1h) / M (≤4h) / L (≤1d) / XL (>1d)"
   c. Give recommended answer with reasoning ("This touches one module with two
      acceptance criteria → S").
   d. After confirmation, `task_set <slice-doc> size s|m|l|xl`.
3. Report a summary table: slice slug | mode | size | blocked_by.

**Handoff:** Returns to `slice-task`.

---

### `start-slice`

```yaml
name: start-slice
description: >
  Understand a slice, decide the test strategy before writing any code, and
  append a confirmed test plan to the slice doc. Uses grill-me for the test
  strategy interview. Use before implement-slice.
```

**Prerequisites:** Slice doc exists with `analysed: false`.

**Steps:**

1. **Fetch + present.** Read the task's `task.md` and the slice doc in full.
   Present a structured summary: task context, slice behaviour, acceptance
   criteria, blocked_by.
2. **Grill on test strategy.** Invoke `grill-me` with the agenda:
   - "What does this slice touch end-to-end? Which layers?"
   - "What's the simplest test that gives honest confidence this works in
     production?"
   - "If you run that test every few minutes while coding, is the feedback fast
     enough?"
   - "Walk through the failure modes — at least two. Does the test type catch
     each?"
   - "Do we need a real dependency (real DB, real HTTP, real browser) or can it
     be faked?"
   - "Is any part already tested elsewhere? What's the exact gap we're filling?"
3. **Persist the test plan.** Set `analysed: true` in slice frontmatter. Append
   to the slice doc:
   ```markdown
   ## Test plan

   **Test type:** <one type from the project's test infrastructure>
   **Reasoning:** <one sentence>

   ### Assertions
   - <key assertion 1>
   - <key assertion 2>
   - <error cases>

   ### Test file
   `<path>`

   ### Run command
   `<run command>`
   ```
4. **Set active state.** Update slice frontmatter:
   - `task_set <slice-doc> status in-progress`
   - `task_set <slice-doc> started_at <ISO now>`
   Update `state.yaml`:
   ```yaml
   active:
     slice: <slice-slug>
   last_action: start-slice analysed <slice-slug>
   next_action: implement-slice <slice-slug>
   ```
5. **Commit.** `docs(slice): add test plan for <slice-slug>`.

**Handoff:** "Ready for `/skill:implement-slice <slice-slug>`."

---

### `implement-slice`

```yaml
name: implement-slice
description: >
  Build a slice via strict TDD against the confirmed test plan. Orchestrates
  the full build pipeline: branch → develop-tdd → verify (hard gate) → land.
  Use after start-slice.
```

**Prerequisites:** Slice doc has `analysed: true` and `## Test plan`.

**Steps:**

1. **Set state.** Report starting slice `<slug>`.
2. **Sync + branch.**
   ```bash
   git fetch origin 2>/dev/null || true
   git checkout main && git pull --ff-only origin main 2>/dev/null || true
   git checkout task/<task-slug> 2>/dev/null || git checkout -b task/<task-slug>
   git checkout -b slice/<slug>
   ```
   (If no remote, skip fetch/pull.)
3. **Load context.** Read the slice doc and parent `task.md`. Follow project
   conventions from `task_profile`.
4. **Develop (TDD).** Invoke `develop-tdd <slice-slug>`. This runs RED → GREEN
   → REFACTOR. It returns when all tests pass.
5. **Verify (hard gate).** Invoke `verify-slice <slice-slug>`. If it fails,
   **stop**. Go back to Step 4 to fix. Do not proceed to Step 6.
6. **Land.** Invoke `land-slice <slice-slug>`. This handles merge, commit,
   timestamps, archive, and state update.
7. **Hand off.** Read `state.yaml` → `next_action`. Report:
   - "All slices done → run `/skill:finalize-task <task-slug>`"
   - "Next: `/skill:start-slice <next-slug>`"

---

### `develop-tdd`

```yaml
name: develop-tdd
description: >
  Strict TDD cycle: RED (write failing test) → GREEN (minimum implementation)
  → REFACTOR (clean up, suite still green). Derives every assertion from the
  slice's acceptance criteria and test plan. Called by implement-slice.
```

**Prerequisites:** Slice doc with `## Test plan`. On branch `slice/<slug>`.

**Steps:**

1. Read the slice doc's `## Acceptance criteria` and `## Test plan`.
2. **RED:** Write the test first. Every assertion must derive from the
   acceptance criteria. Run it — it **must fail**. If it passes without
   implementation, the test is wrong; fix it.
3. **GREEN:** Write only the code that makes the failing test pass. No
   speculative code. Run the test — it **must pass**.
4. **REFACTOR:** Remove dead code, improve names, extract helpers. Run the
   test again — it **must still pass**.
5. Run the project's broader test suite if available (`task_profile` test
   commands). If anything breaks, fix forward.
6. Return control to `implement-slice` with a summary: tests written, tests
   passing, any refactoring done.

**Constraints:**
- Never write a test to match wrong implementation.
- Never skip RED — the test must be seen failing.
- No speculative code beyond what the slice requires.

---

### `verify-slice`

```yaml
name: verify-slice
description: >
  Hard quality gate: run the project's lint command and the slice's test
  command. Blocks on any failure. Called by implement-slice after develop-tdd
  completes.
```

**Prerequisites:** `develop-tdd` has completed. Slice doc has `## Test plan`
with `### Run command`.

**Steps:**

1. Extract the run command from the slice doc's `## Test plan` →
   `### Run command`.
2. Detect or load the project's lint command from `task_profile`. If no lint
   tool is configured, skip lint with a warning.
3. Run lint. If it fails: **STOP**. Report failures. Do not proceed.
4. Run the test command. If it fails: **STOP**. Report failures. Do not proceed.
5. Report: "Slice `<slug>` verified — lint clean, all tests passing."

**Output:** Pass/fail. On pass, `implement-slice` proceeds to `land-slice`. On
fail, `implement-slice` returns to `develop-tdd`.

---

### `land-slice`

```yaml
name: land-slice
description: >
  Merge a verified slice into its task integration branch with a conventional
  commit, record timestamps, archive the slice doc, clean up the feature
  branch, and update state. Called by implement-slice after verify-slice passes.
```

**Prerequisites:** `verify-slice` has passed. On branch `slice/<slug>`.

**Steps:**

1. **Merge.** Construct commit message: `slice(<task-slug>): <slice title>`.
   ```bash
   git checkout task/<task-slug>
   git merge --no-ff slice/<slug> -m "slice(<task-slug>): <slice title>"
   git branch -d slice/<slug>
   ```
2. **Record completion.** On the slice doc:
   - `task_set <slice-doc> status done`
   - `task_set <slice-doc> completed_at <ISO now>`
3. **Append implementation note.** Add a 2–4 line note to the task's
   `## Implementation notes`: what was built, any decisions made.
4. **Archive the slice.**
   ```bash
   mkdir -p docs/tasks/<task-slug>/slices/archive
   git mv docs/tasks/<task-slug>/slices/<n>-<slug>.md \
          docs/tasks/<task-slug>/slices/archive/<n>-<slug>.md
   ```
5. **Commit.** `docs(slice): land <slice-slug> into <task-slug>`.
6. **Update state.** Check if more slices remain (`task_slices <task-slug>`):
   - **If last slice:** Set `task_set <task-slug> status done` and
     `task_set <task-slug> completed_at <ISO now>`. Write to `state.yaml`:
     ```yaml
     last_action: land-slice completed final slice <slice-slug>
     next_action: finalize-task <task-slug>
     ```
   - **If more remain:** Write to `state.yaml`:
     ```yaml
     last_action: land-slice completed <slice-slug>
     next_action: start-slice <next-slug>
     ```
   Clear `active.slice` in `state.yaml`.

**Handoff:** Reports what's next — either "all slices done" or "next slice."

---

### `finalize-task`

```yaml
name: finalize-task
description: >
  Close the loop once all of a task's slices are complete. Runs the full CI
  gate, harvests knowledge, summarizes to CHANGELOG, archives the task
  directory, and clears active state. If the task belongs to an epic and it's
  the last child, also finalize the epic.
```

**Prerequisites:** All slices archived. `task.md` has `status: done` and
`## Implementation notes`.

**Steps:**

1. **Preconditions.** Check out the task integration branch:
   ```bash
   git checkout task/<task-slug>
   git merge main 2>/dev/null || true
   ```
   Gate: `task_finalizable <task-slug>` — if it reports open slices, **stop**
   and list them.

2. **CI gate (hard).** Run the project's full CI command (from `task_profile`
   or detected from repo tooling). If it fails: **stop**. Fix forward. Do not
   proceed until green.

3. **Harvest.** Read `task.md` in full, especially `## Implementation notes`.
   Review the branch diff:
   ```bash
   git log --oneline --no-merges main..task/<task-slug>
   ```

4. **Fold into permanent docs.** Migrate durable knowledge into the project's
   permanent design docs, decision log, or changelog (from `task_profile`
   "Knowledge destinations"). Commit onto the task branch.

5. **Summarize.** Invoke `summarize-task <task-slug>`. This appends a changelog
   entry to `docs/tasks/CHANGELOG.md`. Commit.

6. **Tick the epic** (if applicable). If `task_get <task-slug> epic` returns a
   value: `task_epic_tick <epic-slug> <task-slug>`. If this was the last child
   (`task_epic_finalizable <epic-slug>` says ready), finalize the epic too:
   - Set `completed_at` on the epic.
   - Archive: `git mv docs/tasks/epics/<epic-slug>/
     docs/tasks/epics/archive/<epic-slug>/`.
   - Summarize the epic to CHANGELOG.

7. **Archive the task.**
   ```bash
   git mv docs/tasks/<task-slug>/ docs/tasks/archive/<task-slug>/
   ```

8. **Clear state.** Update `state.yaml`:
   ```yaml
   active:
     task: null
     slice: null
     epic: null          # or keep epic if more tasks remain
   last_action: finalize-task completed <task-slug>
   next_action: null     # or next task slug if epic has more
   ```

9. **Integrate.** Merge into main:
   ```bash
   git checkout main
   git merge --no-ff task/<task-slug> -m "task: finalize <task-slug>"
   git branch -d task/<task-slug>
   ```
   (If remote exists, push main.)

10. **Commit state.** `docs(task): finalize <task-slug>`.

**Handoff:** Report: task archived, CHANGELOG updated, epic status (if any).

---

### `summarize-task`

```yaml
name: summarize-task
description: >
  Write a changelog entry for a completed task before its directory is archived.
  Called by finalize-task. Appends a 3–5 line summary to
  docs/tasks/CHANGELOG.md.
```

**Steps:**

1. Read `task.md` — title, user stories, implementation notes.
2. Draft summary: date, title, slices shipped, key decisions, outcome.
3. Append to `docs/tasks/CHANGELOG.md`:
   ```markdown
   ## <YYYY-MM-DD> — <title> (`<slug>`)
   
   <Slices: <n>-<slug>, ...>. <Key decisions>. <Outcome in one sentence>.
   ```
4. Return to `finalize-task`.

---

### `archive-artifact`

```yaml
name: archive-artifact
description: >
  Move a done slice, task, or epic to its archive directory using git mv.
  Called by land-slice (for slices) and finalize-task (for tasks and epics).
  Can also be invoked directly to archive any artifact.
```

**Steps:**

1. Determine artifact kind from frontmatter (`task_assert_kind`).
2. **Slice:** `git mv docs/tasks/<task-slug>/slices/<n>-<slug>.md
   docs/tasks/<task-slug>/slices/archive/<n>-<slug>.md`
   (Create `archive/` dir if missing.)
3. **Task:** `git mv docs/tasks/<slug>/ docs/tasks/archive/<slug>/`
4. **Epic:** `git mv docs/tasks/epics/<slug>/
   docs/tasks/epics/archive/<slug>/`
5. Report what was archived and where.

---

## Implementation order

Dependencies between steps. Each produces a working, testable increment.

| Step | What | Depends on |
|---|---|---|
| **1** | `onboard-workflow` skill | Nothing |
| **2** | `CHANGELOG.md` template (created by onboard) | Step 1 |
| **3** | `state.yaml` template (created by onboard) | Step 1 |
| **4** | `grill-me` skill | Nothing |
| **5** | `resume-workflow` skill | Step 3 (state.yaml format) |
| **6** | `archive-artifact` skill | Nothing |
| **7** | `size-slices` skill | Step 4 (grill-me) |
| **8** | `develop-tdd` skill | Nothing |
| **9** | `verify-slice` skill | Nothing |
| **10** | `summarize-task` skill | Step 2 (CHANGELOG) |
| **11** | `land-slice` skill | Steps 6, 10 |
| **12** | `create-task` skill | Steps 4, 5 |
| **13** | `slice-task` skill | Steps 7, 12 |
| **14** | `start-slice` skill | Steps 4, 5, 12 |
| **15** | `implement-slice` skill | Steps 8, 9, 11, 14 |
| **16** | `finalize-task` skill | Steps 6, 10, 15 |
| **17** | `migrate-workflow` skill | Steps 1, 6, 12 |
| **18** | `task-workflow-overview` skill | Steps 1–17 |
| **19** | Rename `prd_*` tools → `task_*`, drop `prd_forge` | Steps 1–18 (skills reference tools) |
| **20** | Update `docs/artifacts.md` | Steps 1–19 |

## Verification checklist

Run through a complete lifecycle after implementation:

- [ ] `onboard-workflow` creates `docs/tasks/`, `state.yaml`, `CHANGELOG.md`
- [ ] `create-task` writes `task.md` with `started_at`, initialises `state.yaml`
- [ ] `grill-me` asks one question at a time, recommends + reasons
- [ ] `slice-task` produces slice docs with `kind: slice`, `status: todo`, `size`
- [ ] `size-slices` interacts per-slice and writes `size` to frontmatter
- [ ] `start-slice` sets `status: in-progress` + `started_at`, appends test plan
- [ ] `start-slice` updates `state.yaml` active slice + next_action
- [ ] `implement-slice` calls `develop-tdd` → `verify-slice` → `land-slice`
- [ ] `develop-tdd` runs RED (seen failing) → GREEN → REFACTOR
- [ ] `verify-slice` runs lint + test, refuses to proceed on failure
- [ ] `land-slice` uses conventional commit `slice(<task>): <title>`
- [ ] `land-slice` archives slice doc to `slices/archive/`
- [ ] `land-slice` detects last slice and sets `next_action: finalize-task`
- [ ] `finalize-task` runs full CI, blocks on failure
- [ ] `summarize-task` appends to `docs/tasks/CHANGELOG.md`
- [ ] `finalize-task` archives task to `docs/tasks/archive/`
- [ ] `finalize-task` clears `state.yaml` active block
- [ ] `archive-artifact` works for slices, tasks, and epics
- [ ] `resume-workflow` correctly reads state and reports next action
- [ ] `migrate-workflow` converts `docs/prd/` → `docs/tasks/` with correct frontmatter
- [ ] `task-workflow-overview` routes queries to tools and actions to skills
- [ ] No `prd_forge` references remain in any skill or tool
- [ ] All `prd_*` tools renamed to `task_*`
- [ ] Slice docs are **never deleted**, only archived
- [ ] Task docs are **never deleted**, only archived
- [ ] Conventional commit format is consistent across all merge messages
- [ ] `task_list` and `task_slices` exclude archived artifacts by default