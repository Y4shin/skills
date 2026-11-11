---
type: task
subtype: research
title: Establish how phase instructions and the pre-open branch step reach the model
status: stable
workflow_state: done
blocked_by: []
---

## Question

The operator's design: per-phase opening and closing instructions are injected
by `tw_open` and `tw_close`, so no git instruction lives in skill prose.
`implement-ticket` creates the feature branch as its first action, before
`tw_open`. That leaves one mechanism question: how does the phase learn the
branch step before the open, and what exactly does the injection channel allow?

## What to find, with evidence

1. What a `tw_*` tool result can carry into the model's context, and whether
   instruction text returned by `tw_open` is enough (the operator's
   expectation), including any size or formatting constraints.
2. Alternative or additional channels: `session_start` context, slash-command
   expansion, prompt templates, `before_agent_start` system-prompt options. Cite
   pi's own documentation and, where it matters, its source.
3. Ordering options for the pre-open branch step:
   - a query tool the skill calls before `tw_open` (a phase asks "which branch do
     I need and what must I create");
   - `tw_open` refuses first with the step named, the model performs it, and
     reopens;
   - the previous phase's closing instructions carry the next phase's branch
     step.
4. Whether the refusal can name a template and still let the same skill file
   proceed, given that `tw_open` is the gate.
5. Whether closing instructions can run after the close's own side effects, or
   whether `tw_close` must return them before it releases the toolset.

## Why it matters

Every guard in this effort hangs off this channel. If a tool result cannot carry
the step, `implement-ticket` needs prose after all, which the operator rejected.

## Output

A short evidence note in this task's `## Notes`, with the recommended channel and
the ordering it implies, plus the pi version the evidence is pinned to.

## Notes

## Findings (research, Pi 1.5.0 docs; code re-verified in 1.4.0)

- **A tool result is a plain tool-result message.** Nothing in the harness caps
  or rewrites extension tool result text; the 50 KB / 2000-line limit is a
  tool-author obligation, and only MCP tools are capped in-harness (20 KB).
  Two real limits apply: compaction serializes tool results at 2000 characters,
  and every result stays in context for the rest of the run.
- **There is no phase-granular system-prompt channel.** `session_start` runs
  before any phase. `before_agent_start` fires once per run (one prompt), so a
  phase opened mid-run gets nothing that run. `context` and
  `context_with_system` fire before every model call and can read the active
  tool set, so they can be phase-conditional, at a per-turn token cost.
- **An extension cannot append to an expanded `SKILL.md`.** Expansion happens
  after the `input` hooks and before the run, and no hook sits between them.
  Approximations: `input` + `transform` for typed `/skill:` invocations only,
  `before_agent_start` (per run), `resources_discover` skill variants, or
  patching the model's `read` of a `SKILL.md` through `tool_result` (a hack).
- **A refusal can name a branch step, and nothing latches.** `tw_open` refusals
  are success results in the shape `Refused: <reason>. Legal next: <call>.`
  A refused open adds no tools and writes no state, so the model can perform the
  step and retry. A branch refusal is one more `GateRefusal` row.
- **A hard branch check needs git inside the tool.** `ToolContext` has no exec
  seam today; extension-side git is precedented (`pi.exec` in the bundled
  examples) and the opener tests already drive `createTools()` with a fake
  context, so the seam is testable.
- **`tw_close` can return text while releasing tools.** Hazards: a parallel tool
  batch can still execute a tool that a close removed (`executionMode:
  "sequential"` closes that), and a closing step cannot use the tools the close
  just released.

## Recommendation

Use the tool result as the channel, not a hook: `tw_open` returns the profile's
opening instructions and `tw_close` the closing instructions, both short (under
2000 characters, to survive compaction). For the pre-open branch step,
refusal-first is the smallest option: the skill says "your first action is
`tw_open`; if it refuses, do what it names and retry once", and `tw_open` checks
the branch through the new git seam and refuses with the branch to create.

Fallback A, one extra call per phase: a read-only `tw_phase_brief` query tool
returns the branch step without gating. Cost: a call per phase and a second
code path resolving the same profile, but it preserves the map's literal
ordering.

Fallback B, cheapest and weakest: the previous phase's closing instructions
carry the next phase's branch step. It breaks whenever a phase is entered
directly.

## Unresolved (operator decisions)

1. Does refusal-first violate the map fact that `implement-ticket` creates the
   feature branch as its first action, before `tw_open`? Raised as
   `branch-step-channel`.
2. Whether the guard also blocks the model's raw `bash` git commands on the
   wrong branch, which would need an exception for the command that creates it.
3. Config seam: `pi.getSettings()` inside `execute` versus direct file reads as
   `src/core/repo-gate.ts` already does.
4. Whether `tw_open` and `tw_close` should run in sequential execution mode.

## Residual risks

Tool-result text carries user-level authority, not system authority, so only the
gate binds. Opening instructions can be summarized away by compaction. Doc
citations are 1.5.0 while the repo installs 1.4.0, so re-verify on upgrade.
