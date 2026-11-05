---
type: task
subtype: grilling
title: Settle the architecture tool surface, phase gating, refactor target, and ticket unit assignments
status: stable
workflow_state: ready
blocked_by:
- unit-model-schema
- pi-lifecycle-gating
---

## Decision to settle

The workflow surface of the architecture model: which tools exist, which phase
discloses each, what the refactor-effort target is, where a ticket records its
unit assignments, and what the onboarding entry point is.

## Parent decisions it depends on

`non-negotiables` decided that the model gets phase-disclosed `tw_*` tools, that
a dedicated target covers the refactor-effort copy, and that `write` and `edit`
are blocked on `docs/architecture/`. `unit-model-schema` fixes what those tools
read and write. `pi-lifecycle-gating` reports what the harness makes possible.

## Choices already known

- The proposal's stage table assigns work to Wayfinder (survey the units likely
  affected, keep the live map read-only), `to-spec` (record scope and provisional
  new units), `to-tickets` (name where each ticket's work belongs), and
  `implement-ticket` (point workers and verifiers at units and rules, update the
  live files during close-out).
- The proposal names a user-invoked command for onboarding, outside setup and
  outside model routing.
- The refactor marker and target directory name are open. The scoped target copy
  is the proposal's proposal, not a settled decision.
- A ticket needs to record which units it intends to touch, because close-out
  compares the landed diff against that.

## What this session must pin down

- The tool list, by phase, using the existing naming conventions. At minimum:
  which tool validates the model, which writes a unit file, which records a
  ticket's unit plan, which the close-out check reads, and how the CI command is
  exposed.
- Where the target-editing tools sit relative to the phase gate: a new `tw_open`
  target, an extension of `implement-ticket`'s target, or a separate user-invoked
  command.
- The refactor marker (front matter key? a subtype? a settings flag?) and the
  target directory name.
- Where a ticket's unit assignment lives: ticket front matter, the effort's
  `architecture.md`, or a tool-written side file.
- When static facts refresh: per ticket, at effort close, or on demand, and
  whether the refresh is a tool call or a snapshot on disk.
- The onboarding entry point's name, what it is allowed to write, and how it
  differs from the ordinary phases.
- How the phase-disclosed tool list stays honest: which phase owns the write
  guard, and where the refusal messages point.

## Recommended starting answer

One read/validate tool and one writer, disclosed to Wayfinder (read-only), to
`to-tickets` (writers for provisional units and ticket assignments), and to
`implement-ticket` (writer for close-out updates), with a separate `tw_open`
target named for the target architecture so the refactor copy is scoped by the
gate rather than by convention. Tickets record intended units in the effort's
`architecture.md` through the existing architecture writer, so no new artifact
appears. Facts refresh at ticket close-out and at effort close, through the same
command CI runs.

## Downstream work this may create

The spec's tool inventory, the gate changes, the refactor marker, and the
onboarding skill's shape, which is itself a package change with registration and
docs consequences.
