# task-workflow v2

> Idea → task → slices → TDD → finalize — a planning workflow for `docs/ideas/` and `docs/tasks/`.
> Pi package. One `pi install` away.

## What changed from v1

- **One extension file** instead of 5
- **No chain JSON files** — orchestration lives in SKILL.md
- **3 agents instead of 7** — tdd-worker, slice-verifier, land-worker, deviation-reporter
- **6 skills instead of 10** (+ 9 archived removed)
- **Parallel fan-out** with git worktrees instead of sequential loops
- **`task_dependency_levels` tool** — BFS dependency resolution, not LLM pseudocode
- **Verifier retry path** — re-dispatches TDD worker with error output
- **Checkpoint commits** — TDD worker commits after each GREEN
- **Size-based turn budgets** — S/M/L/XL from slice frontmatter
- **Slice resolution fixed** — all task_* tools accept slices

## Install

```bash
pi install /path/to/task-workflow
```

Then in any repo:

```
/skill:onboard-workflow    # creates docs/tasks/ + docs/ideas/
/skill:refine-idea         # flesh out a rough idea ("grill me")
/skill:create-task         # start planning (optionally from a refined idea)
```

## Development

```bash
npm install
npm test
npm run typecheck
```