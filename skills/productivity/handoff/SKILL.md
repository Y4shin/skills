---
name: handoff
description: Create, write, or generate a handoff document that compacts the current conversation so a fresh agent can pick up the work where you left off. Use when the user asks to hand off, hand over, pass off, or transfer the session, conversation, work, or context to another agent, a colleague, or a new session, harness, or directory; when switching from Claude to Codex or another harness; when forking a side task to a second agent working in parallel; or when the user says to write a handoff, prepare a handoff file, or pass the current thread to a fresh agent. Writes to the OS temp directory by default and always confirms the destination with the user before writing; a user-specified path overrides. Do NOT use for end-of-phase cleanup in the same session and same harness, use /compact instead, or for durable project documentation that belongs in CLAUDE.md or AGENTS.md.
disable-model-invocation: true
metadata:
  telemetry.capture: "argument"
---

# Handoff

User-invoked. Reachable only when the human types `/skill:handoff`. The model
will not auto-invoke it.

Write a handoff document that compacts the current conversation so a fresh
agent can continue the work where you left off. A handoff is a **transit
document**: it exists to move work across a boundary the session itself
cannot cross (a new harness, a new directory, a colleague, or a parallel
fork), not to archive it.

## Before writing: confirm the destination

Always confirm where the file will be written before you write it. Propose a
destination and ask the user to confirm or override:

1. If the user passed a path-like argument, or asked for a specific file,
   that path is the proposed destination.
2. Otherwise default to the OS temp directory with a readable name, e.g.
   `handoff-<short-topic>-<timestamp>.md` under `$TMPDIR` (or `/tmp` where
   `TMPDIR` is unset). Use `mktemp` or the equivalent so the path is stable
   and reportable.
3. Do not default to the repo root or the workspace. A handoff is disposable
   and must not become a tracked file that drifts from reality.

State the proposed path and ask the user to confirm or change it. Write only
after they confirm. Report the final path back when done.

If the user passed an argument that is not a path, treat it as a description
of what the next session will focus on and tailor the document to it.

## What goes in the document

Capture the **live thread**, not the settled record:

- What is in flight right now, why it matters, and the immediate next step.
- Any unverified belief flagged as a belief, not a fact. The next agent
  treats the document as a contract and will not re-check it, so a claim
  written as fact ("X is done", "Y is not built") becomes a false premise for
  everything that follows. Downgrade anything you only assumed.
- A **Suggested skills** section naming which skills the next agent should
  reach for. Model-invoked skills only: another skill cannot invoke a
  user-invoked skill, only the human can, by typing `/skill:<name>`.

Reference, do not copy, anything already written down: specs, plans, ADRs,
issues, commits, diffs. Link them by path or URL. This keeps the file small
and keeps the settled detail in one place instead of two that drift.

Redact secrets before writing: API keys, tokens, passwords, personally
identifiable information.

## When to hand off at all

A handoff file is the move only when something has to **travel** outside the
current session: swapping harness (Claude to Codex), moving to another
directory or repo, sending the work to a colleague, or forking a side task to
a second agent while you keep working. For end-of-phase cleanup in the same
harness and same directory, `/compact` is the right move, not a handoff
file.

## Live subagent seeding (Pi)

If the Pi harness can dispatch a subagent seeded with the handoff summary as
its prompt, that is an alternative to writing a file:
`subagent({ task: "<handoff summary>" })` starts a fresh-context agent that
picks up now. This is a phase-boundary decision: the file travels across
harnesses and sessions; the live subagent picks up immediately but is
harness-local. When in doubt, write the file (portable) and offer to seed a
subagent as well.

## Gotchas

- Temp is cleared between sessions on some setups (Codex, `/private/tmp` on
  reboot). If the next session is delayed or runs under a different harness,
  copy the file somewhere durable as soon as it is written.
- Point the next agent at the file path; do not paste the summary into a
  shell command. A summary with backticks or `$(...)` gets silently truncated
  when interpolated.
- The file is disposable. Delete it, or keep it out of git, once the next
  agent has picked up.

## Telemetry

If the user passed an argument, call `telemetry_skill_context` with
`{ skill_name: "handoff" }` so the invocation is correlated to its target.
No telemetry for argumentless invocations; the skill produces no durable
state to track.
