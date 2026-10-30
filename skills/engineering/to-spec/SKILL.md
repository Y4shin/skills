---
name: to-spec
description: "Synthesize the effort's spec at docs/tasks/<effort>/spec.md from the settled record (the map and the planning tasks); nothing is asked that planning already settled. The opener is the gate."
disable-model-invocation: true
---

# To Spec

`to-spec` synthesizes the effort's specification from the settled record: the
map and the planning tasks' recorded results. No phase-owned question round
runs here, and nothing new is asked that planning already settled. The
architecture is `to-tickets`' output, not written here; the spec's
architecture content is what planning already settled, recorded in
`## Implementation Decisions`.

## Open first

Every run starts by opening the skill: call `tw_open` with
`{ skill: "to-spec", effort: "<effort-slug>" }` (the effort slug is the
directory name under `docs/tasks/`). The opener is the gate: it checks the
phase preconditions against the artifact tree, refuses with the legal next
calls when they fail, and activates the toolset only when they pass. Work only
through the tools the opener discloses, and close the phase with
`tw_close to-spec` when it releases.

## Synthesize from the settled record

1. Load the map at `docs/tasks/<effort>/map.md` and the done planning tasks
   whose results it records. Use the project's domain glossary vocabulary
   throughout the spec (read `CONTEXT.md` if it exists), and respect any ADRs
   in the area you are touching.
2. Write the spec through `tw_write_spec`, the only writer of the spec, at
   `docs/tasks/<effort>/spec.md` (the effort root). The write is draft while
   it is being synthesized; a publish write (`publish: true`) flips the
   status to `stable` once the user approves the spec.

## The spec

The file carries frontmatter and the full section set:

```yaml
---
type: spec
title: <title>
status: draft   # stable once the user approves the spec
---
```

<spec-template>

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A LONG, numbered list of user stories. Each user story should be in the format
of:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I
   can make better informed decisions about my spending
</user-story-example>

This list of user stories should be extremely extensive and cover all aspects
of the feature.

## Implementation Decisions

The settled implementation decisions, from the map and the planning tasks:
the modules that will be built or modified, the interfaces of those modules
that will be modified, technical clarifications, architectural decisions,
schema changes, API contracts, and specific interactions. Nothing new is
settled here; what planning already settled is what this section records. If
a decision is missing, return to Wayfinder rather than settling it here.

Do NOT include specific file paths or code snippets. They may end up being
outdated very quickly.

Exception: if a prototype produced a snippet that encodes a decision more
precisely than prose can (state machine, reducer, schema, type shape), inline
it within the relevant decision and note briefly that it came from a
prototype. Trim to the decision-rich parts, not a working demo, just the
important bits.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external behavior, not
  implementation details)
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)

## Out of Scope

The things that are out of scope for this spec, consistent with the map's
`## Non-goals`.

## Further Notes

Any further notes about the feature.

</spec-template>

The architecture content is what planning already settled and recorded in
`## Implementation Decisions`. When `to-tickets` later produces the living
architecture document, its write adds a note to this spec marking that
content as archival; nothing is deleted from the spec.

## Report

End the run with the completion report in
[resources/report.md](resources/report.md): the fixed five-part shape,
tuned for this skill. A refusal, failure, or escalation is the same shape.

> **Feedback:** if the phase hits a snag (a spec write the tools could not
> express, or something that worked notably well), call
> `submit_feedback({ kind, data })` autonomously to record it. `kind` is a
> short category (`good`, `bad`, `friction`, `architecture`); `data` is one
> or two specific, actionable sentences about the *workflow*, not the
> project work. Requires the `pi-telemetry` extension (`submit_feedback`
> tool).
