---
type: ticket
subtype: feature
title: Create the workflow-failure skill
status: stable
workflow_state: done
blocked_by: []
size: m
---

## What to build

The new promoted, model-invoked engineering skill `workflow-failure`: the
one place that owns the workflow escalation ladder. A stuck agent invokes
it, instructions walk it through the rungs in fixed order, and it ends
either in a resolved route or in an escalation report to the operator.

The ladder, exactly this order:

1. Act on the refusal's own `reason` and `legal_next` first; an opener
   refusal names its legal next moves by design.
2. Reorient from the shipped internals reference under
   `task-workflow-overview`, or route to `task-workflow-doctor` when the
   tree itself is the problem (legacy layout, missing scaffolding, failed
   migration). The ladder diagnoses nothing the doctor already owns.
3. Record the snag with `tw_feedback` so the failure becomes workflow
   telemetry.
4. Stop and escalate with the five-part completion report naming the failed
   step, the refusal reason, and the decision the operator must make; the
   report ends the run (no blocking interactive question mid-run).

Forbidden at every rung, stated verbatim in the SKILL.md: hand-editing the
artifact tree, skipping a gate, inventing a workaround.

The skill follows the task-workflow-doctor shape: frontmatter with a
model-invoked description tuned for trigger (workflow problem, tool
refusal, stuck mid-phase), the operator-communication preamble, ladder
section, routing notes, a `resources/report.md` report resource, and the
feedback note.

Convention sync, all of it part of this ticket: package skill-list
registration, top-level README reference (name linked to its SKILL.md),
engineering bucket README one-liner under model-invoked, the
`docs/engineering/workflow-failure.md` page with the four standard
sections (What it does; When to reach for it; Common questions; It's
working if), and any new CONTEXT.md glossary entries the skill introduces
(e.g. the ladder, an escalation rung).

This ticket does NOT touch: the task-workflow-overview directory (router
row and reference sentence belong to write-workflow-internals), other
skills' SKILL.md files, the agents/ profiles, or the canonical reference
sentence tests.

## Acceptance criteria

- [ ] The skill directory exists with a SKILL.md whose ladder matches the
      architecture's rung order and forbidden moves verbatim in spirit.
- [ ] The skill is registered in the package's promoted-skill list and
      ships inside the package file set.
- [ ] Top-level README and engineering bucket README reference it (linked
      name, model-invoked grouping).
- [ ] The four-section docs page exists.
- [ ] CONTEXT.md gains the new domain terms, each with an Avoid line.
- [ ] The full existing test suite stays green (the structural tests that
      derive from the promoted set now cover the new skill).
- [ ] The SKILL.md references the internals resource and the doctor as
      routes, and carries the tw_feedback note.

## Blocked by

- None (can start immediately).

## Implementation notes

Knowledge harvest: creating a promoted skill in this repo carries two convention surfaces beyond the documented list (`pi.skills`, READMEs, docs page, router): `docs/migration-target.yaml` has a promoted-skills section and the repo practices a changeset per release-relevant change; both landed here and should be folded into the skill-creator runbook rather than rediscovered. Sequencing lesson: the derived test 'task-workflow-overview names every user-reachable skill' fires in the gap between a skill-creation ticket and the ticket owning the router row; the architecture's file-ownership assignment makes the CI gate red by exactly one designed test between close-outs. Operator-approved protocol for this effort: close out designed-red and re-green at the owning ticket's close-out.

Landed: `workflow-failure` is the promoted, model-invoked engineering skill owning the workflow escalation ladder: refusal reason/legal_next first; reorient from WORKFLOW-INTERNALS.md or route to task-workflow-doctor; tw_feedback snag recording; stop and escalate with the five-part report (in resources/report.md) that ends the run. Ships SKILL.md with the ladder, the forbidden moves (hand-editing the artifact tree, skipping a gate, inventing a workaround), routing notes, and the feedback note. Convention sync: package skill list (30 to 31), top-level and engineering README references (model-invoked), the four-section docs page, CONTEXT.md glossary entries (Ladder, Escalation rung), docs/migration-target.yaml promoted-skills entry, and a minor changeset. Tests: new describe block in tests/skills.test.ts, WORKFLOW_SKILLS entry in tests/skill-rewire.test.ts. Suite: 1303 passed, 1 intentionally red (task-workflow-overview router-row test), owned by workflow-internals-reference per the architecture; the gate re-greens at that ticket's close-out.
