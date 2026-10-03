---
type: task
subtype: grilling
title: finalize-effort scope and follow-up mechanics
status: stable
workflow_state: ready
blocked_by: []
---

# finalize-effort scope and follow-up mechanics

## Decision to settle

What `finalize-effort` owns, and what happens when its holistic review finds
problems.

## Parent decisions it depends on

None.

## Choices already known

- Whether `finalize-effort` absorbs the advisory whole-effort review currently
  inside `end-of-effort.js`, so exactly one holistic pass exists per effort.
- Whether `finalize-effort` owns the archive, taking Step 7 out of
  `finalize-task`.
- Follow-up effort: auto-create, or propose and require a human yes.
- How the link is recorded: an `origin_effort` frontmatter field, a
  `follow_up_of` edge, or a findings artifact referenced from the new map.

## Recommended starting answer

`finalize-effort` absorbs the whole-effort review and owns the archive; it is
read-only toward the code it reviews. Findings are written to an effort review
artifact and proposed as a follow-up effort, which is created only after a
human yes, linked by an `origin_effort` field plus the artifact. Trivial
in-scope items become ordinary follow-up tickets instead.

## Downstream work it may create

Schema fields, the plan-ticket pipeline that carries the review artifact, and
`finalize-task`'s narrowed scope.
