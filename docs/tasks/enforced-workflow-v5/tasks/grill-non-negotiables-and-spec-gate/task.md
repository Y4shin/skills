---
type: task
subtype: grilling
title: Map non-negotiables and the `to-spec` gate
status: stable
workflow_state: done
blocked_by:
- grill-workflow-vocabulary
---

# Map non-negotiables and the `to-spec` gate

## Decision to settle

How is a "simple" map represented, and what exactly does `to-spec` gate on?

## Parent decisions it depends on

None.

## Choices already known

- Representation: a frontmatter boolean `simple: true` on the map, a
  `subtype: simple`, or a `decisions: none` marker.
- Mutual exclusion: a simple map must not also carry decision tasks.
- Gate condition: allow `to-spec` when the decision frontier is empty and
  either the map is simple or it has at least one decision task.
- Round 1 already settled that no effort may skip the spec and ticket phases,
  so `simple` means "nothing to research or prototype first", never "skip the
  spec".

## Recommended starting answer

A boolean `simple: true` in `map.md` frontmatter, mutually exclusive with
having decision tasks, enforced by the map-writing tool. `to-spec` is allowed
only when the decision frontier is empty and the map is simple or has at least
one task. Every effort still produces a spec and at least one ticket; a
one-ticket effort is the narrow case.

## Decisions already taken (inputs from the user)

- The `simple map` and `simple effort` concepts are abandoned. No effort starts
  with nothing to grill: a small request, even a one-line bug fix, is a regular
  effort whose map carries exactly one planning task, a grilling task whose job
  is to determine the effort's non-goals and its non-negotiable facts,
  including the effort-level success test.
- Wayfinder must establish those two outputs before it may hand off to
  `to-spec`. That replaces this task's gate condition: `to-spec` is allowed
  when the map carries explicit non-goals and non-negotiable facts, not when
  "the decision frontier is empty and the map is simple or has at least one
  decision task".
- Intake no longer decides simple versus full. It always creates the effort,
  the map, and the non-negotiables grilling task, and it gathers neither the
  non-goals nor the success test.
- The vocabulary's `simple map` term is superseded, and no replacement term is
  needed: such an effort is just an effort.

## Downstream work it may create

The schema 5 field, the gate tool behind `to-spec`, and the `to-spec` and
`to-tickets` skill text.

## Settled decisions

### Q1 - The map carries the three outputs as body sections (settled)

- The map's three required outputs live as body sections, not frontmatter:
  `## Non-goals`, which absorbs the map's existing `## Out of scope`; and
  `## Non-negotiable facts`, which opens with a single bolded effort-level
  success-test line, then the facts.
- The success test gets its own line rather than its own section, so the
  reading order stays natural and the gate's check stays simple.
- The gate checks that `## Non-goals` and `## Non-negotiable facts` exist and
  are non-empty, and that the success test is named. (Narrowed later: see the
  amendment after Q3. Whether the opener also checks these sections, or checks
  only the `ready_for_spec` flag, is the next question.)
- Accepted cost: a small body-section writer has to join the tool surface,
  because `tw_set` writes scalar frontmatter only. That is preferred over
  pushing readable prose into YAML.
- Rejected: frontmatter fields (`non_goals`, `non_negotiable_facts`,
  `success_test`). Mechanically easier with the existing reader, but it pushes
  the readable content into YAML, needs list handling in `tw_set`, and the
  map's present shape is prose sections. Also rejected: renaming `## Out of
  scope` to `## Non-goals` while folding the success test into `##
  Constraints`, which would overload `Constraints` (durable rules) with a
  measurement.
- Downstream: the map template, the `tw_*` body-section writer, and the
  `to-spec` gate reader all need the two sections; `## Out of scope` is renamed
  in the map template and in every existing live map during the schema 5
  migration.

### Q2 - Every planning task writes its results back to the map, with one final reconciliation pass (settled)

- The write-back rule is general, not special to the non-negotiables task:
  every planning task (grilling, research, prototype, manual) writes its own
  results into the Wayfinder map as the final step of its run, before it marks
  itself done, through the `tw_*` map-section writer. Wayfinder never
  re-synthesizes decisions from task bodies.
- Reason: it closes the loop in the same run that produced the result, so there
  is no human Wayfinder run between a planning task finishing and the map
  reflecting it. This is the same anti-seam ruling already applied to the
  inlined per-ticket close-out and to intake's own short round.
- The single exception the user asked for: one final reconciliation pass at the
  end of the planning phase, after every planning task is done. It reads each
  task's recorded results against the map and verifies that the map actually
  reflects the decisions the tasks made, rather than trusting each write-back
  blindly.
- Intake's map template carries the sections as empty placeholders, so a gate
  refusal names missing content rather than a missing section.
- Rejected: Wayfinder synthesizing every decision from the task bodies. A
  cleaner separation of ownership, but it adds a human-invoked step before the
  gate can pass and gives two places that can drift.
- Open detail, asked next: where the one final reconciliation pass lives and
  what enforces that it happened.

### Q3 - The reconciliation is a Wayfinder step, recorded as a map frontmatter flag (settled)

- The one final reconciliation pass lives in Wayfinder, which becomes
  idempotent: the same skill that creates the map runs the `reconcile` step
  once the planning frontier is empty. It reads every done planning task's
  recorded results against the map, fixes what is missing through the
  `tw_*` writer, then marks the map finalized.
- Amendment to the earlier proposal: it does NOT leave a prose reconciliation
  note. It sets a frontmatter flag on the map meaning "finalized and ready for
  `to-spec`" (working name `ready_for_spec: true`; the final spelling belongs
  to schema 5). The flag is the reconciliation record.
- `to-spec`'s opener checks the flag and the empty planning frontier. A run
  that finishes every task and goes straight to `to-spec` is refused with a
  message telling the human to run Wayfinder for the final reconciliation.
- Rejected: a `## Reconciliation` prose note (prose is not checkable, and the
  flag is the honest signal); reconciliation as the first step of `to-spec`
  (it blurs the phase boundary the gate exists to draw); reconciliation as its
  own planning task (a verifier that is itself a write-back, and one more task
  per effort).

### Amended Q1 and Q2 - The map is reference-oriented, not an inlined specification (settled)

- The map does not inline the decisions as prose. The synthesis step at the
  end of each planning task exists so that the task's results are findable by
  later tasks and by `to-spec`; it records short statements plus references to
  the task files, and does not reproduce the reasoning.
- The long-form decisions live in the task files. Keeping a fully fleshed-out
  specification live on the map during the whole Wayfinder process would leave
  little for `to-spec` to do and duplicates it.
- Consequence for Q1: `## Non-goals` and `## Non-negotiable facts` stay, but as
  short map-level anchors (the success test is one line under the latter),
  while the `Decisions so far` index carries references to the task files
  rather than inlined decision bodies. `## Out of scope` is still absorbed into
  `## Non-goals`.
- Consequence for Q2: writing back means "record a short statement and a
  pointer to this task's file", not "copy this task's decision text into the
  map".
- Still open, asked next: whether the `to-spec` gate checks only the flag plus
  the empty frontier, or also the presence of the anchors, and whether the
  anchors are statements or references.

### Q4 - The preconditions live in the flag-setting tool; `to-spec` checks only the flag (settled)

- The `ready_for_spec` flag is set by a dedicated Wayfinder-side tool that runs
  every precondition: the planning frontier is empty, `## Non-goals` exists and
  is non-empty, and `## Non-negotiable facts` exists, is non-empty, and names
  the success test. If any check fails, the tool refuses to set the flag and
  reports exactly what is missing.
- `to-spec`'s opener checks only `ready_for_spec: true`. It trusts the flag,
  because the flag can only be set through the checking tool.
- Rationale (the user's): if `to-spec` re-checked the sections, a Wayfinder
  mistake would surface as `to-spec` reporting that Wayfinder did it wrong,
  which is a strange workflow. The producer of the flag owns the check; the
  consumer owns only the flag.
- The anchors stay as short statements on the map, not references, per the
  recommendation the user accepted here.
- Consequence: a new tool joins the surface, roughly `tw_finalize_map` (name to
  settle with schema 5), distinct from `tw_set`, because it must be impossible
  to flip the flag without the checks. `tw_set` must not be able to write
  `ready_for_spec`.

### Q4 amendment - the flag check lives in the opener tool, not in skill prose (settled)

- Correction from the user: "`to-spec` checks only the flag" is right in
  spirit, but the check belongs to the phase's opener tool, the initial tool
  call every phase skill runs. That call does two jobs: (a) it checks whether
  the phase is allowed right now, and (b) it progressively discloses or enables
  the tools the phase needs. The `ready_for_spec` check is precondition (a) for
  the `to-spec` phase, so it lives in the opener, never in `to-spec`'s prose.
- Consequence: the opener's refusal is what tells the human that the map is not
  finalized and that Wayfinder's reconcile pass must run. The `to-spec` skill's
  prose only tells the agent to call the opener first.

### Q5 - `ready_for_spec` auto-clears when the plan changes (settled)

- Yes. Adding, reopening, or moving a planning task out of `done`, or any map
  edit through the section writer or a normal `tw_set` on the map, clears
  `ready_for_spec`. The flag-setting tool is the only writer that sets it, and
  it sets it last.
- The user's reasoning: they would rather not allow modifying the plan after
  the flag was set, but forbidding modification outright at this point would
  cause more problems than it solves, so modification stays allowed and the
  flag simply auto-clears, which forces one more Wayfinder pass.
- Consequence: any post-reconcile plan change makes `to-spec` refuse again
  with a pointer back to Wayfinder, whose reconcile pass re-runs the
  preconditions and re-sets the flag.

### Frontier empty

Q1 to Q5 are settled. No decision in this task remains open.

## Human confirmation

- The user confirmed the Q1 to Q5 summary as the shared understanding, with two
  refinements: the `ready_for_spec` check lives in the `to-spec` phase's opener
  tool and not in skill prose (recorded as the Q4 amendment), and every skill
  that runs a grilling session must delegate to the `grilling` skill (recorded
  in `grill-skill-surface`). The planning task is done on that basis.
