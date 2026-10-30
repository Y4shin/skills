---
type: ticket
subtype: feature
title: Documentation re-sync against the implemented v5
status: stable
workflow_state: done
blocked_by:
- bump-dependencies
- schema5-artifact-model
- planning-transition-tools
- write-lockdown-guard
- migrate-v4-to-v5
- migration-target-and-upgrade-resource
- implementation-transition-tools
- disclosure-open-close-core
- opener-gate-and-toolsets
- wayfinder-reconcile-and-passes
- to-tickets-architecture
- grilling-delegation-fix
- skill-report-resources
- skill-creator-nested-toolset
- intake-skill
- to-spec-rescope
- implement-ticket-skill
- finalize-effort-skill
- overview-doctor-rescope
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

## Implementation notes

- Landed on `task/docs-resync`, merged `--no-ff` at 2f07afa. The work is seven
  commits, 5a652b3 through a4d919c (each pin landing RED first, then the prose
  that satisfies it, then the two orchestrator fix-ups), and the deviation
  report at `deviation-reports/docs-resync.md` lands with it.
- The re-sync derives every pin rather than restating it. The top-level README
  and both bucket READMEs are checked against `package.json` `pi.skills` plus
  each `SKILL.md`'s `disable-model-invocation`, so a promoted-set or
  invocation-model change fails a test instead of drifting; `pi.skills` is
  separately checked against `docs/migration-target.yaml`'s `promoted_skills`,
  the shipped schema-5 target; `CONTEXT.md`'s glossary is checked for the
  pinned v5 terms, for an `_Avoid_` line per term, and for the absence of the
  retired vocabulary. Ten pins, six of which failed RED before any prose
  changed.
- `CONTEXT.md` was rebuilt in place: 29 `## Language` entries, each with an
  `_Avoid_` line, plus a rebuilt `## Relationships` and a rebuilt `## Flagged
  ambiguities`. The `Migration` entry is the one block exempted from the
  retired-vocabulary pin, since it exists to record what the reshape renames;
  the rest of the live language uses none of the retired stem.
- Four deviations were resolved before landing, beyond the plan's
  user-invoked-only reading of the router criterion:
  1. The criterion "names every user-reachable skill accurately" was resolved
     to the full promoted set, not user-invoked only, because `AGENTS.md`
     defines a model-invoked skill as model- or user-reachable. The router
     gained `/skill:tdd`, `/skill:code-review` and `/skill:skill-creator`,
     its "Vocabulary underneath" section became "References underneath"
     (four references, not two), and the pin now covers all 28 non-router
     promoted skills. That answers the product question
     `overview-doctor-rescope` deferred here, in the wide direction rather
     than the narrow one.
  2. `skills/deprecated/README.md` no longer retires `report-bug` in favor of
     `triage`, which is itself retired; it names `intake` instead, so a
     retired skill names a live replacement, which is what `CONTEXT.md`'s
     `Promoted skill` entry now states as vocabulary.
  3. `docs/agents/README.md` dropped the `triage-labels.md` bullet, a config
     surface with no producer in v5.
  4. `docs/repo-gating.md` dropped its stale "pi 0.80.10" version pin, matching
     the README, which states the same `/help` limitation without a version.
- Three stale sites were deferred, not dropped, on the deviation report's
  judgement, and belong to the end-of-effort inconsistency pass:
  - `docs/workflow-flows.md` still carries v4 prose (decision tasks,
    `schema_version: 4`). That is a whole-document rewrite, not a re-sync, and
    the ticket does not name the file.
  - The "decision task" phrasing in the overview. A landed v4 test pins
    `/decision tasks/i` there, so the canonical-form change belongs to that
    test's owner; `CONTEXT.md` records the term as a flagged ambiguity instead
    of banning the word.
  - The `docs/bugs/` instructions in `implement-ticket` and `code-review`. They
    tell a phase to write a substrate v5 retires, which is behavioural prose
    rather than presentation, so it is out of scope here but must stay on the
    end-of-effort list.
- Verification: no linter is configured in this repo, so `npx tsc --noEmit`
  (exit 0) is the static gate. `tests/skills.test.ts` is green at 502 tests,
  and the full suite is green at 18 files / 1145 tests against the 1135-test
  baseline at 9918ced. Acceptance checkboxes are left unticked, matching every
  other landed ticket in this effort.
- `docs/tasks/state.yaml` landed in the docs commit as it stood (the
  dispatcher's `task:` pointer), unedited.