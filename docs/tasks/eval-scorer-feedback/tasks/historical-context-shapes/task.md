---
type: task
subtype: research
title: What the session records carry for CONTEXT.md, and with what fidelity
status: stable
workflow_state: ready
blocked_by: []
---

# What the session records actually carry for CONTEXT.md, and with what fidelity

## Decision to settle

Review section 1 requires the judge to receive only the `CONTEXT.md` content the
evaluated agent actually saw in that session, with its timing, its source in the
record, and whether that content was complete or truncated. The harness today
records only that a read happened and how many minutes before
(`evals/lib/sessions.ts`). No file text is captured anywhere.

Answer, with evidence from this machine's stored sessions: for each mechanism
that can expose `CONTEXT.md` to an agent, does the transcript retain the text,
and in what shape.

Mechanisms to check, at minimum:

- A file-read tool call and its result payload: how much of the file the result
  carried, and whether truncation or windowing is visible.
- `CONTEXT.md` text reaching the agent through session initialization, project
  instructions, or an assembled system-prompt section.
- Any other recorded mechanism that made the text visible.

## What the answer must state

- The record shapes that carry the text, named by their JSON paths or section
  names, with counts across the session corpus.
- How often the text is recoverable in full, how often truncated, and how the
  truncation shows in the record.
- How repeated loads of a changed file appear, and what timing evidence
  survives, so a deterministic version policy can follow from evidence instead
  of assumption.
- Which cases must be reported as "loaded but contents unrecoverable", so the
  scorer can represent that state rather than substituting the current file.

## Evidence standard

Real session records on this machine, not the repository's present
`CONTEXT.md`. Quote the record shape and give counts. Where the corpus is thin
for a mechanism, say so with the count instead of generalising.

Do not copy session content into the repository. Quote only the minimum
structure needed to describe a shape, and keep extracted text under
`~/.pi/agent/evals/`.

## Non-goals

- Choosing the extraction format or the scorer's vocabulary context block. That
  belongs to implementation once the shapes are known.
- Any judgement about whether the recovered vocabulary is good.
