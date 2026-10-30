---
type: ticket
subtype: feature
title: Documentation re-sync against the implemented v5
status: stable
workflow_state: ready
blocked_by: [bump-dependencies, schema5-artifact-model, planning-transition-tools, write-lockdown-guard, migrate-v4-to-v5, migration-target-and-upgrade-resource, implementation-transition-tools, disclosure-open-close-core, opener-gate-and-toolsets, wayfinder-reconcile-and-passes, to-tickets-architecture, grilling-delegation-fix, skill-report-resources, skill-creator-nested-toolset, intake-skill, to-spec-rescope, implement-ticket-skill, finalize-effort-skill, overview-doctor-rescope]
size: l
---

## What to build

The effort's final ticket. Audit the shipped documentation against the
implemented v5 and fix what drifted. This is a re-sync pass, not a rewrite:
the intervening tickets keep the manifest and prose current as they land, and
this ticket catches whatever slipped.

Audit and fix:

- `CONTEXT.md`: the ubiquitous language for v5 (effort, map, planning task,
  implementation ticket, specification, architecture, report, front door,
  the retired legacy terms kept only in the migration layer).
- the top-level `README.md`: the skill inventory and the phase flow.
- `skills/engineering/README.md` and `skills/productivity/README.md`: the
  promoted skill lists, with user-invoked and model-invoked grouping.
- `package.json`'s `pi.skills` array: exactly the promoted set.
- the `docs/<bucket>/<skill>.md` pages: every promoted skill has a page with
  the four sections, and retired skills have none.

`task-workflow-overview` is re-synced whenever a user-reachable skill was
added, renamed, or re-scoped; verify it one last time here.

## Acceptance criteria

- [ ] `CONTEXT.md` matches the v5 vocabulary and carries the agreed glossary.
- [ ] The top-level `README.md` and both promoted bucket READMEs list exactly
      the shipped skills, grouped by invocation model.
- [ ] `package.json` `pi.skills` matches the promoted set; no retired or
      non-promoted skill appears.
- [ ] Every promoted skill has a docs page with the four required sections;
      no retired skill has one.
- [ ] `task-workflow-overview` names every user-reachable skill accurately.
- [ ] No em-dashes in the re-synced prose.
- [ ] `tests/skills.test.ts` and the doc-page tests are green.

## Blocked by

- Every other ticket in the effort. This pass audits the final state, so it
  cannot run until the state is final.