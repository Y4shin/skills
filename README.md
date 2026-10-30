# task-workflow v2

> Idea → Wayfinder → task frontier → type-specific execution → finalize, a planning workflow for `docs/tasks/`.
> Pi package. One `pi install` away.

## What changed from v1

- **One extension file** instead of 5
- **No chain JSON files**, orchestration lives in SKILL.md
- **3 agents instead of 7**, tdd-worker, slice-verifier, land-worker, deviation-reporter
- **6 skills instead of 10** (+ 9 archived removed)
- **Parallel fan-out** with git worktrees instead of sequential loops
- **`tw_dependency_levels` and `tw_frontier` tools**, BFS dependency resolution, not LLM pseudocode
- **Verifier retry path**, re-dispatches TDD worker with error output
- **Checkpoint commits**, TDD worker commits after each GREEN
- **Size-based turn budgets**, S/M/L/XL from task frontmatter
- **Legacy slice resolution preserved**, existing tw_* tools still accept slices

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
dependency graph directly. `/skill:implement-ticket` implements the effort's
tickets: one per-ticket chain per ticket over the dependency levels, with the
per-ticket close-out inline. The feature and bug pipelines remain the TDD
pipelines.

## Skills

The package ships exactly the promoted set in `package.json`'s `pi.skills`.
A user-invoked skill is reachable only when you type `/skill:<name>`; a
model-invoked skill is model- or user-reachable.

### User-invoked

- [improve-codebase-architecture](./skills/engineering/improve-codebase-architecture/SKILL.md)
- [intake](./skills/engineering/intake/SKILL.md)
- [setup-workflow](./skills/engineering/setup-workflow/SKILL.md)
- [to-spec](./skills/engineering/to-spec/SKILL.md)
- [to-tickets](./skills/engineering/to-tickets/SKILL.md)
- [wayfinder](./skills/engineering/wayfinder/SKILL.md)
- [grill-me](./skills/productivity/grill-me/SKILL.md)
- [handoff](./skills/productivity/handoff/SKILL.md)
- [teach](./skills/productivity/teach/SKILL.md)
- [wait-what](./skills/productivity/wait-what/SKILL.md)

### Model-invoked

- [codebase-design](./skills/engineering/codebase-design/SKILL.md)
- [code-review](./skills/engineering/code-review/SKILL.md)
- [diagnosing-bugs](./skills/engineering/diagnosing-bugs/SKILL.md)
- [domain-modeling](./skills/engineering/domain-modeling/SKILL.md)
- [eval-review](./skills/engineering/eval-review/SKILL.md)
- [finalize-effort](./skills/engineering/finalize-effort/SKILL.md)
- [grilling](./skills/engineering/grilling/SKILL.md)
- [implement-ticket](./skills/engineering/implement-ticket/SKILL.md)
- [prototype](./skills/engineering/prototype/SKILL.md)
- [research](./skills/engineering/research/SKILL.md)
- [resolving-merge-conflicts](./skills/engineering/resolving-merge-conflicts/SKILL.md)
- [skill-creator](./skills/engineering/skill-creator/SKILL.md)
- [skill-review](./skills/engineering/skill-review/SKILL.md)
- [task-workflow-doctor](./skills/engineering/task-workflow-doctor/SKILL.md)
- [task-workflow-overview](./skills/engineering/task-workflow-overview/SKILL.md)
- [tdd](./skills/engineering/tdd/SKILL.md)
- [wizard](./skills/engineering/wizard/SKILL.md)
- [to-questionnaire](./skills/productivity/to-questionnaire/SKILL.md)
- [writing-for-agents](./skills/productivity/writing-for-agents/SKILL.md)

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