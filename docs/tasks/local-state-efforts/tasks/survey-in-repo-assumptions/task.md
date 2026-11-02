---
type: task
subtype: research
title: Survey the workflow's in-repo assumptions
status: stable
workflow_state: ready
blocked_by: []
---

# Question

Which paths, tools, gates, and skill behaviors of this package assume the effort tree lives inside the working repository, and what exactly breaks when it does not? Cover:

- file roots and path resolution across `src/core` (`state.ts`, `migrate.ts`, `art.ts`, `repo-gate.ts`, `fs-port.ts`, `graph.ts`, `frontmatter.ts`) and the entry points `src/disclosure.ts` and `src/pi.ts`;
- the refusal behavior of the `tw_*` tools in a repo that is not set up: what the gate checks today and what it says;
- the per-skill dependencies on repo-side artifacts across the arc: CONTEXT.md reads, docs pages, changelog, ADRs, the CI gate and landing-branch merge inside implement-ticket, the archive steps inside finalize-effort;
- detection signals and their robustness: a foreign `docs/tasks` tree in a work repo, and the both-setups state that the map declares unsupported.

# Decision it unblocks

The spec's local-state layout (what must be re-anchored, skipped, or made conditional) and the per-skill reduction matrix for locally set-up repos.

# Trusted source boundaries

This repository only: `src/`, `skills/`, `tests/`, and the shipped docs. No external sources.

# Evidence required

Findings at `docs/tasks/local-state-efforts/tasks/survey-in-repo-assumptions/findings.md`: the inventory listing each assumption with its file locations, what breaks without the in-repo tree, and whether the local setup must re-anchor it, explicitly skip it, or ask. Facts, assumptions, and open questions kept apart; repository paths cited for every material claim.

# Likely dependent tasks

The spec. `research-local-state-root` and `design-hook-mechanism` consume overlapping context (layout constraints, milestone points), but none of the three blocks the others.
