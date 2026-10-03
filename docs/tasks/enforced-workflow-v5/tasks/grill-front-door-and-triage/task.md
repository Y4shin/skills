---
type: task
subtype: grilling
title: Front door and its relationship to triage
status: stable
workflow_state: ready
blocked_by: [grill-workflow-vocabulary]
---

# Front door and its relationship to triage

## Decision to settle

What is the single front door that always creates an effort and a map, how do
intake, inbox, and triage relate, how do bug reports enter, and who owns the
mandatory first grilling session?

## Parent decisions it depends on

None.

## Choices already known

- Name: `intake` versus `inbox`. `intake` acts (it creates the effort);
  `inbox` reads as a passive queue.
- Relationship: intake absorbs triage, or intake calls triage for externally
  reported items while `triage` stays the queue.
- Bugs: every bug becomes an effort with a simple map, or triage keeps
  minting bare bug tickets that `implement-task` picks up.
- Grilling ownership: intake owns the first grilling session, or wayfinder owns
  it and intake invokes wayfinder.

## Recommended starting answer

`intake` as the user-invoked front door that always creates an effort and a
map, and invokes `wayfinder` for the mandatory first grilling. `triage` stays
the queue for externally reported issues and hands items to `intake`. Bugs
become efforts too, on a simple map, so the bug path stops being a parallel
substrate. The `mode: human` path for human-owned work is preserved.

## Downstream work it may create

The skill surface (`intake` added, `triage` re-scoped), session-start fields
for an effort, and `setup-workflow`'s onboarding templates.
