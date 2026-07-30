---
kind: idea
title: Bug workflow (report, track, fix)
slug: bug-workflow
status: proposed
created_at: 2026-07-30T14:05:09Z
grilled_at:
converted_to:
---

# Bug workflow (report, track, fix)

The workflow can plan and execute ideas/features/tasks, but has no way to
report, maintain a list of, or fix bugs — except creating a standalone
task, whose interview asks questions irrelevant to bugs (user stories,
boundaries, slice breakdown, per-slice testing strategy). Vague bug reports
get bounced to refine-idea, and implement-task demands arch-spec + slice
chains even for a one-line fix.

Gap is threefold: **report** (lightweight capture without an interview),
**track** (a persistent list with status), **fix** (a lightweight path that
skips arch-spec/chain ceremony for small fixes).

## Proposed design

### New artifact: `docs/bugs/<slug>.md`

Plain markdown + frontmatter, same pattern as ideas — no `task_*` tool
support needed initially (ideas work via grep too).

```yaml
---
title: Crash on empty config file
status: reported        # reported → confirmed → fixing → fixed | wontfix | promoted
severity: major         # critical | major | minor | trivial
reported: 2026-07-30
confirmed_by:           # commit or agent run that reproduced it
fix_branch:             # bug/<slug>
fix_commit:             # filled on fixed
promoted_to:            # task slug, when fix outgrew the lightweight path
---
```

Body sections: Observed / Expected / Reproduction / Suspected area
(agent-filled from codebase exploration, not user interview) / Root cause /
Fix summary.

Key difference from tasks: a bug doc captures a **defect observation**, not
a **change plan**. No user stories, no boundaries, no slices.

### New skill: `report-bug` (lightweight capture)

Goal: *never interrogate the reporter.*

- Takes free-form input (`/skill:report-bug "parser crashes on empty config"`).
- Asks at most what's missing from: observed, expected, reproduction,
  severity guess. One question at a time with recommended answers, all
  skippable — unknowns recorded as `unknown`, never blocking.
- Agent fills the rest by exploring: suspected area, duplicate check
  (`grep docs/bugs/`).
- Writes doc with `status: reported`, commits, done. Never implements.

### New skill: `fix-bug` (lightweight TDD path)

1. **Confirm**: reproduce; write a failing test capturing it. Status →
   `confirmed`. Can't reproduce → one targeted question or `wontfix` with
   rationale.
2. **Size gate** (agent judgment, the only triage moment):
   - Small (root cause obvious, ~1 layer, no API surface change) → proceed.
   - Not small → **promote**: `/skill:create-task` seeded from the bug doc
     (root-cause analysis = the task's codebase-context section for free),
     bug `status: promoted`, `promoted_to: <task>`.
3. **Fix**: TDD red → fix → green → full suite. Non-trivial fixes route
   through a single `tdd-worker` + `slice-verifier` chain (no land-worker /
   slice machinery — one branch, no slices).
4. **Close**: fill root cause + fix summary, status → `fixed`, one-line
   entry in `docs/tasks/CHANGELOG.md` (bugs share the task changelog),
   archive to `docs/bugs/archive/` on merge. Branch `bug/<slug>` merged
   `--no-ff` like tasks.

### Integration points

- task-overview routing: report → `/skill:report-bug`, fix →
  `/skill:fix-bug`; triage queue = `grep -l "status: reported" docs/bugs/*.md`.
- implement-task workers can write a `docs/bugs/` doc for out-of-scope
  product defects found mid-task (bridge to existing deviation channels).
- Severity → priority stays human-owned; no auto-scheduling.

### Non-goals (v1)

- No severity automation, SLAs, assignment.
- No `task_*` tool / state.yaml extension — bugs live outside the planning
  tree until promoted. Add a `bug` kind later only if grep gets painful.

## Open questions

- [ ] Two skills or one? (Split `report-bug` / `fix-bug` so a bug can sit
  queued without triggering a fix session. Alternative: one `bug` skill
  with a mode flag.)
- [ ] Promotion threshold: default gate is "root cause known + single
  layer + no API change = small". Stricter (always promote non-trivial) or
  looser (allow medium fixes directly)?
- [ ] Duplicate handling: link-only, or merge docs?
- [ ] Should bug fixes get deviation-reporter treatment, or is
  verify + changelog enough? (Recommendation: skip it.)
