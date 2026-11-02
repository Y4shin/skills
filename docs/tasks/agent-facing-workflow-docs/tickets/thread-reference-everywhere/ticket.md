---
type: ticket
subtype: feature
title: Thread the reference sentence through skills and agent profiles
status: stable
workflow_state: ready
blocked_by:
- create-workflow-failure-skill
size: m
---

## What to build

One verbatim, standardized reference sentence in every remaining promoted
surface, so any agent that loads a skill or a subagent profile learns the
same next move when the workflow misbehaves. The sentence is the canonical
one recorded in the architecture document; it is asserted verbatim by the
coverage test ticket, so it must not be paraphrased anywhere:

> If a `tw_*` tool or the workflow misbehaves, refuses you, or otherwise
> surprises you, invoke the `workflow-failure` skill before improvising.

Coverage:

- Every promoted SKILL.md in the engineering and productivity buckets,
  except `workflow-failure` (must not reference itself) and
  `task-workflow-overview` (handled by write-workflow-internals). The line
  goes directly after the operator-communication preamble where one
  exists, otherwise at the top of the body.
- Every subagent profile under `agents/`, same sentence, same placement
  rule (profiles without `tw_*` context still carry it verbatim;
  uniformity outweighs phrasing fit).

Nothing else changes in the touched files: no drive-by edits, no
restating the ladder, no reformatted prose.

## Acceptance criteria

- [ ] The canonical sentence appears verbatim in every promoted SKILL.md
      except the two exclusions, in the specified position.
- [ ] The canonical sentence appears verbatim in every agents/ profile.
- [ ] No other content in the touched files is modified (diff shows only
      added lines plus nothing else).
- [ ] The touched files' own instructions still read coherently with the
      line added (spot-checked across buckets).

## Blocked by

- `create-workflow-failure-skill` (the sentence names a skill that must
  exist and ship).
