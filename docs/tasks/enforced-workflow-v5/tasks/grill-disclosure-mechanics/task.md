---
type: task
subtype: grilling
title: Progressive disclosure mechanics
status: stable
workflow_state: ready
blocked_by: [research-pi-tool-disclosure, prototype-open-close-gating]
---

# Progressive disclosure mechanics

## Decision to settle

The concrete disclosure design: the opener and closer surface, what stays
always declared, and how orchestrator agents and subagents behave.

## Parent decisions it depends on

`research-pi-tool-disclosure` and `prototype-open-close-gating` must have
reported before this decision is taken.

## Choices already known

- One `tw_open({ skill, effort })` dispatcher versus per-skill openers such as
  `open_wayfinder`.
- Explicit `tw_close` versus auto-close on the next `tw_open` and at skill end.
- What stays always declared: only `tw_open`, or also a read-only oracle for
  the router.
- Whether orchestrator agents open their own toolset, or rely on the chain's
  per-agent `tools:` allowlists.
- Whether `deferred` plus `tool_search` is acceptable, given that it may let a
  model bypass the skill.

## Recommended starting answer

A single `tw_open({ skill, effort })` dispatcher plus `tw_close`, with at most
one workflow toolset active at a time. Only `tw_open` is always declared. The
router gets a read-only `tw_next` oracle rather than the full query set.
Orchestrator agents open their own toolset; subagents rely on their declared
`tools:` allowlists, since activation is per-agent.

## Downstream work it may create

The whole tool layer, the first step of every workflow skill, and the router's
answer path.
