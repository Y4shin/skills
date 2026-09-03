---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
metadata:
  invocation: user
  telemetry.capture: "argument"
---

# Handoff

User-invoked. Reachable only when the human types `/skill:handoff`. The model
will not reach for it on its own.

Write a handoff document summarising the current conversation so a fresh agent
can continue the work. Save it to the temporary directory of the user's OS, not
the current workspace.

Include a "suggested skills" section in the document, naming which skills the
next agent should reach for (model-invoked skills only; user-invoked skills
cannot be called by another skill, only by the human typing them).

Do not duplicate content already captured in other artifacts (specs, plans,
ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally
identifiable information.

If the user passed arguments, treat them as a description of what the next
session will focus on and tailor the doc accordingly.

## Background-agent seeding (Pi subagents)

Inspired by Matt Pocock's `claude-handoff` skill, which seeds a fresh
background agent with the handoff summary as its prompt: if the Pi harness
supports dispatching a subagent seeded with the handoff document, do so
(`subagent({ task: "<handoff summary>" })`) instead of just writing the file.
The subagent starts with a fresh context and picks up the work immediately.
Whether to seed a live subagent or write a portable file is a phase-boundary
decision: the file travels across harnesses and sessions; the live subagent
picks up now but is harness-local.

## Telemetry

If the user passed an argument (the focus of the next session), call
`telemetry_skill_context` with `{ skill_name: "handoff" }` so the invocation
is correlated to its target. No telemetry for argumentless invocations; the
skill produces no durable state to track.
