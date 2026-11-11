---
type: task
subtype: grilling
title: Settle how a phase learns its branch step, and how far the wrong-branch guard reaches
status: deprecated
workflow_state: done
blocked_by: []
---

## Decision to settle

How a phase learns its branch step, and how far the wrong-branch guard reaches.
The research in `instruction-channel` and `spawn-block-feasibility` turned this
from a blank into a choice with named costs.

## The conflict to resolve first

The map's non-negotiable facts say `implement-ticket` creates the feature branch
as its first action, before `tw_open`, so the open can gate on it. The cheapest
channel is the opposite order: `tw_open` refuses first and names the branch to
create, the model creates it, then reopens. Both work; they differ in where the
literal first action sits and in whether a new tool is needed.

## Choices

1. **Refusal-first.** The skill's only git sentence is "your first action is
   `tw_open`; if it refuses, do what it names and retry once". The refusal names
   the branch. No new tool, no new hook, and the map's "before `tw_open`" line is
   revised.
2. **A read-only query tool** (`tw_phase_brief`) that returns the phase's branch
   step and required branch without gating, so the skill's first action can be
   the branch work, then `tw_open`. Preserves the current map wording at the cost
   of one call per phase and a second resolution path.
3. **Both**: the query tool for the pre-open step, and the refusal as a
   backstop when a model skips the call.

## Second question in the same task

Whether the guard also blocks the model's raw `bash` git commands that move to
the wrong branch, or only gates the phase opens and the sub-agent spawns. A
blanket bash block would also block the command that creates the branch, so it
needs an exception for the configured branch templates if it is wanted at all.

## Third, smaller

Whether `tw_open` and `tw_close` run in sequential execution mode, so a parallel
tool batch cannot execute a tool that a close just released.

## Recommended starting answer

Option 1 for the pre-open step, because it needs no new tool and the refusal is
already the natural shape of the gate, and the map's wording changes to
"`tw_open` refuses and names the branch to create". Leave raw `bash` unguarded
in this effort, because the phase open and the spawn block already stand between
the model and the wrong branch, and record that as a fog item if mis-branching
appears. Set sequential execution on the two openers.

## Downstream

The spec's opener section, the profile schema's instruction fields, and the
implement-ticket skill's "Open first" block.

## Notes

## Round 1 settled (operator's answers)

- **Both channels, as recommended.** A read-only `tw_phase_brief` returns the
  phase's branch step and required branch without gating. The phase performs the
  branch work, then `tw_open` gates hard on the result. The refusal naming the
  branch stays as the backstop for a model that skips the call. This preserves
  the map's ordering, so `implement-ticket` still creates the effort branch
  before `tw_open`.
- **No bash-level guard.** Raw `bash` git commands are not intercepted. The
  phase open and the sub-agent spawn block are the enforcement points, and the
  operator chose to keep it simple: "let's keep it simple for now".
- **Sequential execution on the openers.** `tw_open` and `tw_close` opt out of
  the harness's parallel tool batch, so a sibling call cannot execute a tool a
  close just released.

## Recorded consequence for dependents

The query tool is a second resolution path for the same profile, so the spec must
keep both paths on one resolver. The refusal text and the `tw_phase_brief` output
come from the same profile entry and must not drift.
