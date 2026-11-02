---
type: ticket
subtype: feature
title: Thread the reference sentence through skills and agent profiles
status: stable
workflow_state: done
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

## Implementation notes

Knowledge harvest: 'top of the body' needs one interpretation for titled files without the standard preamble: the first prose paragraph after the H1, never above the document title (slot ruled in by the coherence criterion; the mechanical contract is unaffected because it asserts verbatim presence only). A seam collision between the TDD red-green discipline and 'tests/' ownership assigned to a later ticket resolves cleanly with an untracked ticket-local checker inside the ticket's .work/ directory: the loop gets its executable seam, the source tree keeps its ownership split untouched. When threading one canonical sentence across ~40 files, a single enumerated-touchpoint checker (derived from the promoted-set manifest) doubles as both the RED condition and the GREEN proof.

Landed: the canonical reference sentence is threaded verbatim through all 40 owned surfaces (29 promoted SKILL.md files minus the two exclusions, plus all 11 agents/ profiles), exactly two added lines and zero deletions per file, placement after the preamble or in the first prose slot. Verified independently by file-by-file scan and the ticket-local checker; full suite 1304 passed, 0 failed. Chained off main at the finalize merge of workflow-internals-reference.
