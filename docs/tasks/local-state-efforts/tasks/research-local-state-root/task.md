---
type: task
subtype: research
title: Research keying and layout for the local state root
status: stable
workflow_state: ready
blocked_by: []
---

# Question

How should the local state root outside the repo be keyed and laid out?

- Per-repo identity: deriving and encoding the per-repo directory from the repo's path relative to home (special characters, length limits, collisions between similar paths), and how to treat symlinks, worktrees, and moved or renamed repos.
- The marker that marks a repo as locally set-up: what detection reads instead of `docs/tasks/state.y(a)ml`.
- Conventions pi itself uses for per-project machine-local state under `~/.pi/`, and prior art in this repository: `src/core/repo-gate.ts` and `docs/ideas/gate-skills-by-repo.md`, which proposed `~/.pi/task-workflow.json`.
- Naming: the raw request sketched `~/.pi/task-workflow/external-state/<path-relative-to-~>/` before the terminology moved from external to local, so the root's name renames with the concept.

# Decision it unblocks

The spec's local-state layout, naming, detection rules, and per-repo identity scheme.

# Trusted source boundaries

This repository; pi's own documentation and conventions for machine-local state; the local filesystem for verifying encoding behavior. No web research.

# Evidence required

Findings at `docs/tasks/local-state-efforts/tasks/research-local-state-root/findings.md`: at least two layout options with trade-offs (identity, collisions, human readability, listing ergonomics) and one recommendation, plus a concrete proposal for the local-setup marker.

# Likely dependent tasks

The spec; `design-hook-mechanism` consumes this task's result, because the hook declaration lives inside the local state root.
