# Architecture & Code Quality — Deviation Feedback Loop

## The Core Idea

Acknowledging that plans change during implementation is not a weakness —
it's reality. The question is whether those changes accumulate as debt or
get fed back into the planning documents.

The solution: **a lightweight deviation feedback loop at every level of the
planning tree.** Every time a unit of work completes, we check whether
reality diverged from the document that defined it, and if so, we update
the containing document.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Deviation Tree                               │
│                                                                     │
│   Map: "Auth system" ────────────────────────────────────────────┐ │
│   │  Planned: OAuth2 + SSO + API keys                             │ │
│   │  After all tasks done: "SSO was deferred, API keys were       │ │
│   │  replaced with PATs" → update map doc                        │ │
│   └────────────────────────────────────────────────────────────────│ │
│       │                                                             │
│       ├── Task: "OAuth2 login" ─────────────────────────────────┐  │ │
│       │   │  Planned: Google, GitHub, GitLab providers          │  │ │
│       │   │  After all slices done: "GitLab was out of scope,   │  │ │
│       │   │  documented in task notes" → update task doc        │  │ │
│       │   └─────────────────────────────────────────────────────│  │ │
│       │       │                                                   │  │ │
│       │       ├── Slice: "google-oauth" ──────────────────────┐  │  │ │
│       │       │   │  Arch spec: `LoginWithGoogle()`           │  │  │ │
│       │       │   │  After TDD: `AuthenticateWithGoogle()`    │  │  │ │
│       │       │   │  → deviation report → task notes updated  │  │  │ │
│       │       │   └───────────────────────────────────────────│  │  │ │
│       │       │                                                │  │  │ │
│       │       └── Slice: "github-oauth" ─────────────────────┐  │  │ │
│       │           │  Arch spec: same interface as google     │  │  │ │
│       │           │  After TDD: matches spec, no deviation   │  │  │ │
│       │           └──────────────────────────────────────────│  │  │ │
│       │                                                       │  │  │ │
│       └── Task: "API key management" ──────────────────────┐  │  │ │
│           │  Planned: CRUD + scoping                       │  │  │ │
│           │  After all slices: "PATs instead of keys,      │  │  │ │
│           │  scope model simpler" → update task doc        │  │  │ │
│           └────────────────────────────────────────────────│  │  │ │
│                                                              │  │  │ │
└──────────────────────────────────────────────────────────────┘──┘──┘──┘
```

---

## The Pattern

At every level, the same three questions:

1. **Did reality diverge from the plan?**
   - Slice: compare implementation against architecture spec + slice doc
   - Task: compare final implementation against task doc
   - Map: compare what was delivered against map plan

2. **Does the containing document need updating?**
   - Slice deviation → update task doc's implementation notes
   - Task deviation → update map's task list or description
   - Map deviation → update map doc

3. **Is the divergence significant enough to involve the user?**
   - Minor (internal rename, backward-compatible addition) → autonomous
   - Major (scope change, API surface change, deferred feature) → ask user

---

## Level 1: Slice → Task

### When

After each tdd-worker completes, before the next slice starts.

### Who

The `deviation-reporter` agent (forked from tdd-worker context).

### What it checks

```
deviation-reporter reads:
  - {chain_dir}/arch-spec.md      (the architecture spec for this run)
  - The slice doc                  (acceptance criteria, what to build)
  - The implementation             (what was actually written)
  - The git diff on the worktree

Writes to: {chain_dir}/deviation-reports/<slice-slug>.md

Then THE PARENT reads the report and decides:
  - Does the task doc's ## Implementation notes need updating?
    If yes: append a note to the task doc.
  - Does this affect any pending slices (next dependency level)?
    If yes: update the arch spec (in chain_dir) for those slices.
```

### What the report contains

```markdown
## Deviation report — env-loading

### Source of truth checked
- Arch spec: {chain_dir}/arch-spec.md
- Slice doc: docs/tasks/repo-foundation/slices/2-env-loading.md

### Deviations from arch spec
1. **API surface:** `LoadEnv(path string)` → `LoadEnv(fs embed.FS, path string)`
   Reason: needed embedded env files for testing. Backward compatible (nil fs ok).
   → Affects slice 3's arch spec (updated in chain_dir).

2. **Addition:** Added `ValidateEnv()` helper. Not in spec, required for errors.
   → Internal only, no affect on dependents.

### Deviations from slice doc
(none — acceptance criteria all met)

### Task doc update needed?
Yes — append to ## Implementation notes:
  "Slice 2 (env-loading): LoadEnv now accepts embed.FS for embedded env
   support. Added ValidateEnv() helper. arch-spec updated for slice 3."

### User attention needed?
No — backward-compatible change, internal addition.
```

---

## Level 2: Task → Map

### When

During finalize-task, after the CI gate and before archiving.

### Who

The parent (not a subagent — this is a skill instruction in finalize-task).

### What it checks

```
finalize-task reads:
  - docs/tasks/<slug>/task.md           (the original task definition)
  - docs/tasks/<slug>/task.md           (the ## Implementation notes section)
  - All deviation reports from the slices
  - The combined diff

  Checks:
  - Did the final implementation match the task's scope?
  - Were any user stories not delivered?
  - Were any out-of-scope items accidentally implemented?
  - Did the API surface or behaviour change from the original description?

  If the task belongs to an map:
    - Does the map's task list entry need updating?
    - Does the map's description need updating?
```

### What gets written

```markdown
## Deviation report — repo-foundation

### Source of truth checked
- Task doc: docs/tasks/repo-foundation/task.md

### Deviations from task doc
1. **Scope:** "HTTP server with routing" was planned as a single slice.
   Split into http-server-skeleton + migration-runner during implementation
   when it became clear they were independent. Task doc updated.

2. **User story:** "Developer can configure server port via env var" was
   delivered as "config file + env var with config file taking precedence."
   More flexible than planned — no change needed.

### Map update needed?
This task is part of map "backend-infrastructure".
→ Update map's task list: repo-foundation actually delivered 4 sub-tasks
  (go-module, env-loading, http-server, migration-runner), not 3 as planned.
→ Update map's description: env-loading supports embed.FS now.

### User attention needed?
No — scope change was documented, user story was exceeded, not missed.
```

### What gets updated

- The task doc's `## Implementation notes` (already updated per-slice, now
  summarized and confirmed)
- The map doc, if the task belongs to one:
  - `tasks:` list entry updated with actual delivery notes
  - Any deviation in scope or description appended

---

## Level 3: Map → (no higher level)

### When

During finalize-task when the map's last child task is finalized.

### Who

The parent (skill instruction in finalize-task).

### What it checks

```
finalize-task reads:
  - docs/tasks/maps/<slug>/map.md     (the original map plan)
  - All child task docs                  (original + implementation notes)
  - All deviation reports from child tasks

  Checks:
  - Does the map's outcome match the original plan?
  - Were any child tasks added, removed, or merged?
  - Did the scope shift?
  - Is the map's description still accurate?
```

### What gets written

A deviation summary is appended to the map's completion notes (or if the
map doesn't have a notes section, the map doc gets updated).

### What gets updated

- The map doc's `tasks:` list — each child task gets an `actual:` note
  if it diverged from the plan
- The map doc's description gets updated if the overall outcome changed

---

## The Full Dance

```
create-task
  │
  ▼
implement-task
  │
  ├── Step 1: Architecture spec (ephemeral, user-approved)
  │
  ├── Step 2: Parallel fan-out (per dependency level)
  │   │
  │   ├── tdd-worker → implement slice
  │   ├── deviation-reporter → write slice deviation report
  │   │   └── parent updates task doc ## Implementation notes
  │   │   └── parent updates arch spec for pending slices
  │   │
  │   └── (repeat for each slice in level)
  │
  ├── Step 3: Coherence refactor (skill instruction)
  │
  └── Step 4: Task deviation summary (skill instruction)
      └── parent writes task-level deviation report
      └── if map: parent updates map doc
  │
  ▼
finalize-task (per task)
  │
  ├── CI gate
  ├── Knowledge harvest
  ├── Task deviation → map update (if applicable)
  ├── Changelog
  └── Archive + merge

  ▼
finalize-task (per map, last child)
  │
  ├── Map deviation summary
  ├── Update map doc
  └── Archive map
```

---

## Deviation Flow Summary

| Level | Trigger | Who | Reads | Writes | Updates |
|---|---|---|---|---|---|
| Slice → Task | After tdd-worker | `deviation-reporter` agent | arch spec, slice doc, implementation | `deviation-reports/<slug>.md` | Task doc `## Implementation notes`, arch spec for pending slices |
| Task → Map | During finalize-task | Parent (skill instruction) | task doc, slice deviation reports, combined diff | Task deviation section in task doc | Map doc `tasks:` entry |
| Map → (none) | During finalize-map | Parent (skill instruction) | map doc, all child task docs, all task deviation reports | Map deviation summary | Map doc description |

## What This Prevents

| Anti-pattern | How deviation flow prevents it |
|---|---|
| **Scope drift without documentation** | Every slice deviation is recorded. The task doc accumulates what actually happened. |
| **Map plans that describe a different reality** | Task deviations flow up to the map. The map doc is updated as tasks complete. |
| **"We forgot why we did X"** | Deviation reports record the reasoning behind every divergence. |
| **Dependent slices build on wrong assumptions** | The arch spec in chain_dir is updated per-slice. Pending slices read the latest version. |
| **Knowledge loss on long tasks** | The task doc's implementation notes grow incrementally, not retroactively at the end. |
| **Surprise at map completion** | The map is updated per-task, not all at once at the end. |

## Agent: deviation-reporter

```yaml
---
name: deviation-reporter
description: >
  After a slice is implemented, compare the implementation against the
  architecture spec and slice doc. Write a structured deviation report.
  Fork from the tdd-worker's context so all decisions are visible.
tools: read, bash
inheritProjectContext: true
defaultContext: fork
---

[Behavior:
 1. Read {chain_dir}/arch-spec.md for this slice's section
 2. Read the slice doc for acceptance criteria
 3. Read the implementation (git diff on worktree, plus source files)
 4. Compare: what changed? What was added? What was removed?
 5. Categorize each deviation: API surface, internal, scope, out-of-scope
 6. For each: note impact on dependent slices
 7. Write structured report to {chain_dir}/deviation-reports/<slug>.md
 8. The parent reads this and decides whether to update task doc + arch spec]
```