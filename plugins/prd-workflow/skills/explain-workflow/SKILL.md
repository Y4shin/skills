---
name: explain-workflow
description: Explain the full prd-workflow lifecycle — every phase, every skill, how they connect, and when to use each one. Use when the user asks "how does this workflow work", "explain the PRD process", "what skills are available", or wants an overview before starting. Don't use it to actually run any workflow step — point the user at the right skill instead.
allowed-tools: Bash(python3 *)
---

# Explain the PRD Workflow

Present the full prd-workflow lifecycle to the user. Inject the current planning-tree
inventory so the explanation is grounded in the repo's actual state:

!`python3 "${CLAUDE_SKILL_DIR}/../../scripts/prd_tool.pyz" list`

Also inject the project profile when available — it tells the user what architecture layers,
test infrastructure, and orientation docs their project has configured:

!`python3 "${CLAUDE_SKILL_DIR}/../../scripts/prd_tool.pyz" profile`

## What to present

Walk the user through each phase of the workflow in order, explaining what each skill does,
when to use it, and how it hands off to the next. Use the structure below. Adapt the level
of detail to the user's question — if they asked for a quick overview keep it concise; if
they want the full picture, cover everything.

### Phase 0 — Setup (once per repo)

| Skill | Purpose |
|---|---|
| `/prd-workflow:init-prd-workflow` | Stamps `docs/prd/.workflow-version`. Every other skill refuses to run until this exists. Run once. |
| `/prd-workflow:update-prd-workflow` | Migrates the workflow version forward after plugin updates. No-op if already current. |

### Phase 1 — Planning

Three entry points depending on scope:

| Scope | Skill | Produces |
|---|---|---|
| **Epic** (multi-PRD outcome) | `/prd-workflow:create-epic` | `docs/prd/epics/<slug>/epic.md` with `kind: epic` frontmatter |
| **Feature** (user-facing behaviour) | `/prd-workflow:create-feature-prd` | `docs/prd/<slug>/prd.md` with `kind: feature` |
| **Capability** (foundational/infra, no UI) | `/prd-workflow:create-capability-prd` | `docs/prd/<slug>/prd.md` with `kind: capability` |

Each runs a relentless interview (the `grill-me` discipline), then crystallises answers into
a committed spec. The epic skill hands off to `/prd-workflow:epic-to-prds` which decomposes
the epic into child PRDs and invokes the matching create skill for each.

`/prd-workflow:grill-me` is available standalone for stress-testing any plan without
producing an artifact.

### Phase 2 — Slicing (PRD → issues)

| PRD kind | Skill | What it does |
|---|---|---|
| Feature | `/prd-workflow:feature-prd-to-issues` | Breaks the PRD into tracer-bullet vertical slices as issues, wires dependencies, writes slice docs |
| Capability | `/prd-workflow:capability-prd-to-issues` | Same, but slices are enabling surfaces with a first consumer each |

Each slice gets its own doc at `docs/prd/<slug>/slices/<n>-<slug>.md` and a tracked issue.
The PRD issue itself is assigned to the epic's milestone when under an epic.

### Phase 3 — Implementation (per slice)

Two steps per slice, always in order:

1. **`/prd-workflow:analyse-issue <n>`** — Fetches the issue, presents a structured summary,
   then grills the developer on the test strategy (which layers, which test type, failure
   modes, real vs fake dependencies). Appends a confirmed `## Test plan` to the slice doc.

2. **`/prd-workflow:implement-issue <n>`** — Strict TDD against the test plan. Cuts a slice
   branch off the PRD integration branch, runs red→green→refactor, merges the slice back
   into the PRD branch, closes the issue, and garbage-collects the slice doc. No per-slice
   PR — the full CI gate is deferred to finalize.

### Phase 4 — Closing the loop

| Skill | When | What it does |
|---|---|---|
| `/prd-workflow:finalize-prd` | All slices merged | Harvests durable knowledge into permanent docs (design docs, changelog), opens the single PRD PR into main |
| `/prd-workflow:finalize-epic` | All child PRDs finalized | Closes the epic milestone, folds epic-level knowledge into permanent docs, deletes the spent epic dir |

### Utilities

| Skill | Purpose |
|---|---|
| `/prd-workflow:adopt-prd` | Backfills frontmatter onto legacy docs that predate the workflow or carry old inline metadata |
| `/prd-workflow:grill-me` | Standalone stress-test interview — no artifact produced |

### Key concepts

- **Provider-aware**: all skills detect the forge (GitHub, Forgejo, or local/no-remote) and
  use the right CLI commands. Local repos use the same branch workflow but skip remotes/PRs
  and use a built-in tracker.
- **Integration branch**: each PRD has its own branch. Slices branch off it and merge back
  into it. Only the final PRD PR merges into main.
- **One PR per PRD**: individual slices don't get PRs. The single integration PR at finalize
  is the gate where the full CI suite runs.
- **Slice docs are ephemeral**: they live under `docs/prd/<slug>/slices/` during development
  and are cleaned up as slices land. Durable knowledge is folded into permanent docs at
  finalize.

### The typical happy path

```
init-prd-workflow          (once)
    │
create-feature-prd         (interview → spec)
    │
feature-prd-to-issues      (spec → tracked slices)
    │
    ├── analyse-issue #1   (test strategy)
    │   └── implement-issue #1  (TDD → merge slice)
    ├── analyse-issue #2
    │   └── implement-issue #2
    └── ...
    │
finalize-prd               (single PR → main)
```

For epics, wrap the above in:

```
create-epic → epic-to-prds → [create + slice + implement per PRD] → finalize-prd (each) → finalize-epic
```

## After presenting

If the injected planning-tree inventory shows existing PRDs, epics, or slices, point the
user at where they are in the workflow and which skill to run next. If the inventory is empty,
suggest starting with `/prd-workflow:init-prd-workflow` (if not yet initialized) or
`/prd-workflow:create-feature-prd` / `/prd-workflow:create-epic` (if already initialized).
