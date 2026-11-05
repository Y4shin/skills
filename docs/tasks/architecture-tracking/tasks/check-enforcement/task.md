---
type: task
subtype: grilling
title: Settle whether boundaries are linked to authored checks or generated from the model
status: stable
workflow_state: ready
blocked_by:
- unit-model-schema
- boundary-check-tooling
---

## Decision to settle

Whether v1 generates executable checks from the model's declared relationships,
links to authored checks only, or both. The operator deliberately recorded this
as neither a goal nor a non-goal, expecting this session to settle it.

## Parent decisions it depends on

`unit-model-schema` fixes what a relationship declaration can say.
`boundary-check-tooling` reports what existing tools can express, and whether the
mapping from a declaration to a tool rule is mechanical.

## Choices already known

- The proposal says linking an authored rule to an executable check is
  sufficient for an initial version, and calls generation a possible follow-up.
- Generating checks means a per-language emitter: an arch-test source file, a
  `go-arch-lint` config, an ESLint boundaries config. It can only enforce what is
  mechanically derivable from unit-level declarations.
- The enforced direction of the effort is that declared boundaries have checks
  behind them. Both options satisfy that; only one adds a code generator.

## What this session must pin down

- Does the answer differ by language? Generation may be cheap for one target and
  expensive for another.
- If generation is in, which languages, and what artifact does it emit, and who
  regenerates it and when (a `tw_*` writer, a repository command, CI)?
- If linking only, what happens when a declared boundary has no check: refused,
  warned, or accepted with the gap reported in the view.
- Whether the two integration targets can demonstrate the chosen mechanism in
  v1, since acceptance runs in both.

## Recommended starting answer

Linking only in v1, with a declared boundary that has no check reported as an
analysis gap in the view, and generation left to a follow-up. The reason is that
generation needs a stable schema and a per-language backend, and this effort is
still settling the schema in `unit-model-schema`; a generator built on a moving
schema is the expensive way to learn the schema was wrong.

## Downstream work this may create

The spec's mechanism section, the view's gap reporting, and possibly a ticket for
a first emitter.
