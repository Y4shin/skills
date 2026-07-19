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
│   Epic: "Auth system" ────────────────────────────────────────────┐ │
│   │  Planned: OAuth2 + SSO + API keys                             │ │
│   │  After all tasks done: "SSO was deferred, API keys were       │ │
│   │  replaced with PATs" → update epic doc                        │ │
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
   - Epic: compare what was delivered against epic plan

2. **Does the containing document need updating?**
   - Slice deviation → update task doc's implementation notes
   - Task deviation → update epic's task list or description
   - Epic deviation → update epic doc

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

## Level 2: Task → Epic

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

  If the task belongs to an epic:
    - Does the epic's task list entry need updating?
    - Does the epic's description need updating?
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

### Epic update needed?
This task is part of epic "backend-infrastructure".
→ Update epic's task list: repo-foundation actually delivered 4 sub-tasks
  (go-module, env-loading, http-server, migration-runner), not 3 as planned.
→ Update epic's description: env-loading supports embed.FS now.

### User attention needed?
No — scope change was documented, user story was exceeded, not missed.
```

### What gets updated

- The task doc's `## Implementation notes` (already updated per-slice, now
  summarized and confirmed)
- The epic doc, if the task belongs to one:
  - `tasks:` list entry updated with actual delivery notes
  - Any deviation in scope or description appended

---

## Level 3: Epic → (no higher level)

### When

During finalize-task when the epic's last child task is finalized.

### Who

The parent (skill instruction in finalize-task).

### What it checks

```
finalize-task reads:
  - docs/tasks/epics/<slug>/epic.md     (the original epic plan)
  - All child task docs                  (original + implementation notes)
  - All deviation reports from child tasks

  Checks:
  - Does the epic's outcome match the original plan?
  - Were any child tasks added, removed, or merged?
  - Did the scope shift?
  - Is the epic's description still accurate?
```

### What gets written

A deviation summary is appended to the epic's completion notes (or if the
epic doesn't have a notes section, the epic doc gets updated).

### What gets updated

- The epic doc's `tasks:` list — each child task gets an `actual:` note
  if it diverged from the plan
- The epic doc's description gets updated if the overall outcome changed

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
      └── if epic: parent updates epic doc
  │
  ▼
finalize-task (per task)
  │
  ├── CI gate
  ├── Knowledge harvest
  ├── Task deviation → epic update (if applicable)
  ├── Changelog
  └── Archive + merge

  ▼
finalize-task (per epic, last child)
  │
  ├── Epic deviation summary
  ├── Update epic doc
  └── Archive epic
```

---

## Deviation Flow Summary

| Level | Trigger | Who | Reads | Writes | Updates |
|---|---|---|---|---|---|
| Slice → Task | After tdd-worker | `deviation-reporter` agent | arch spec, slice doc, implementation | `deviation-reports/<slug>.md` | Task doc `## Implementation notes`, arch spec for pending slices |
| Task → Epic | During finalize-task | Parent (skill instruction) | task doc, slice deviation reports, combined diff | Task deviation section in task doc | Epic doc `tasks:` entry |
| Epic → (none) | During finalize-epic | Parent (skill instruction) | epic doc, all child task docs, all task deviation reports | Epic deviation summary | Epic doc description |

## What This Prevents

| Anti-pattern | How deviation flow prevents it |
|---|---|
| **Scope drift without documentation** | Every slice deviation is recorded. The task doc accumulates what actually happened. |
| **Epic plans that describe a different reality** | Task deviations flow up to the epic. The epic doc is updated as tasks complete. |
| **"We forgot why we did X"** | Deviation reports record the reasoning behind every divergence. |
| **Dependent slices build on wrong assumptions** | The arch spec in chain_dir is updated per-slice. Pending slices read the latest version. |
| **Knowledge loss on long tasks** | The task doc's implementation notes grow incrementally, not retroactively at the end. |
| **Surprise at epic completion** | The epic is updated per-task, not all at once at the end. |

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