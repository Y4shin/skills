# task-workflow v2

> Idea → Wayfinder → task frontier → type-specific execution → finalize, a planning workflow for `docs/tasks/`.
> Pi package. One `pi install` away.

## What changed from v1

- **One extension file** instead of 5
- **No chain JSON files**, orchestration lives in SKILL.md
- **3 agents instead of 7**, tdd-worker, slice-verifier, land-worker, deviation-reporter
- **6 skills instead of 10** (+ 9 archived removed)
- **Parallel fan-out** with git worktrees instead of sequential loops
- **`task_dependency_levels` and `task_frontier` tools**, BFS dependency resolution, not LLM pseudocode
- **Verifier retry path**, re-dispatches TDD worker with error output
- **Checkpoint commits**, TDD worker commits after each GREEN
- **Size-based turn budgets**, S/M/L/XL from task frontmatter
- **Legacy slice resolution preserved**, existing task_* tools still accept slices

## Install

```bash
pi install /path/to/task-workflow
```

Then in any repo:

```
/skill:setup-workflow    # creates docs/tasks/ + docs/bugs/
/skill:wayfinder           # grill first, then grow a dependency-aware work graph from an idea
```

## Workflow

Wayfinder begins every map with one grilling session, then replaces the former
refine/create-task/spec/ticket handoff. It creates and grows a map's
dependency graph directly. `/skill:implement-task` dispatches
tasks by `type:`: research, prototype, grilling, manual, feature, or bug. The
existing feature and bug implementation resources remain the TDD pipelines.

## Development

```bash
npm install
npm test
npm run typecheck
```

## Repo gating (auto-disable in work repos)

This package is **global**, so it would load in every repo, including work
repos where it doesn't belong. The gate auto-disables all of the package's
resources in work repos based on the repo's `git origin`, with **zero
per-repo config**. See [`docs/repo-gating.md`](docs/repo-gating.md) for the
full truth table, detection rules, and the one known limitation (the six
skills still appear on `/help` in a work repo, pi 0.80.10 has no hook to
suppress them there; explicit `/skill:<name>` is blocked via the `input`
event instead).