---
kind: task
type: research
slug: tool-surface-inventory
title: Catalog every tool and hook the extension registers, at contract level
map: task-tools-overhaul
status: deprecated
blocked_by: []
workflow_state: done
---

## The precise question

What is the complete, verified inventory of the extension's registered
surface: every tool the extension registers (name, parameters, return
values, side effects, edge cases, error behavior) and every lifecycle hook
(gate resolution, guidelines discovery/injection, skill stripping, input
gating, session_start peer checks), plus the core modules behind them, as
they exist in the working tree right now?

## The decision or task it unblocks

The workflow-tool-usage-audit (R2) needs this catalog as its reference so
it never has to re-derive what a tool does while auditing how the workflow
uses it. The synthesis grilling (G1) uses it as the left-hand column of
the gap matrix (tool exists vs. workflow uses it). This task does not
decide anything; it produces the factual baseline.

## Trusted source boundaries

- The working tree (source of truth per map decision Q3), specifically
  `src/pi.ts`, `src/core/art.ts`, `src/core/state.ts`,
  `src/core/frontmatter.ts`, `src/core/err.ts`, `src/core/repo-gate.ts`.
- Uncommitted changes are part of the surface: the repo-gate refactor and
  any other working-tree diffs touching `src/` are cataloged and labeled
  in-flight.
- `package.json` `pi.extensions`/`pi.skills` for registration facts.
- The `pi` extension API types (`@earendil-works/pi-coding-agent`) for
  hook signatures, verified against the installed version, not memory.
- Live behavior where cheap: reading the registered tool list from a
  session (this session's own tools) to cross-check the registration code
  path.

## Evidence required for completion

- `findings.md` in this task's directory, organized as a contract-level
  catalog:
  - One entry per registered tool: name, label, registration condition
    (ungated/gated), parameter schema (name, type, optional, enum),
    behavior summary, side effects (files written), return value, error
    behavior, edge cases, code location (function + line refs).
  - One entry per lifecycle hook: event, registration condition, behavior,
    side effects, failure mode, code location.
  - Core-module notes: art.ts artifact model, state.ts (both format
    parsers), frontmatter.ts parse/dump round-trip behavior, repo-gate.ts
    gate resolution (working-tree version, labeled in-flight).
  - A "confirmed facts" section carrying over the pre-map findings
    (schema_version wipe, legacy-slice-only machinery, task_context
    contradiction, 20 registered tools count, v3 "keep-as-ours" scope) as
    verified facts with code references, not re-derived.
  - In-flight labels wherever the working tree differs from committed
    main.
- Every catalog entry cites its code location (file + function), so R2
  and G1 can verify claims without re-reading the whole extension.

## Likely dependent tasks

- workflow-tool-usage-audit (R2): consumes the catalog as reference.
- overhaul-synthesis-grilling (G1): consumes it as the gap matrix's tool
  side.
