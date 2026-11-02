---
type: deviation report
title: Deviation report for create-workflow-failure-skill
status: stable
---

## Deviation report: create-workflow-failure-skill

### API surface changes
- **Planned:** The ticket exports the `workflow-failure` skill (SKILL.md with the fixed four-rung ladder and its `resources/report.md` five-part report), registration in `package.json` `pi.skills`, top-level README and engineering bucket README references (model-invoked grouping), the docs page `docs/engineering/workflow-failure.md` with the four standard sections, and new CONTEXT.md glossary entries. The architecture's file-ownership list assigns exactly: CONTEXT.md, `package.json`, top-level `README.md`, engineering bucket `README.md`, the new docs page, and the skill directory itself.
- **Actual:** All of the above landed as specified and match the architecture's ladder contract verbatim in spirit (rung order: refusal `reason`/`legal_next` first; reorient from `WORKFLOW-INTERNALS.md` or route to `task-workflow-doctor`; `tw_feedback` recording; stop-and-escalate ending the run; the three forbidden moves stated in the SKILL.md). In addition, the ticket touched files outside its ownership list (details under Out-of-scope changes below).
- **Impact:** On dependent tickets, the exported surface is exactly as contracted: `workflow-internals-reference` can reference the skill by name and add the router row; `thread-reference-everywhere` routes all other SKILL.md references through the canonical sentence; `reference-coverage-suite` can assert on the ladder and the doctor-shape report resource (its seam-4 `WORKFLOW_SKILLS` entry is already present). One interface-relevant consequence: the derived test "task-workflow-overview names every user-reachable skill" is **red on this branch by design**; the router row must land in `workflow-internals-reference` before the suite returns fully green. Any CI gate run between the two tickets fails with exactly that one failure.

### Abstraction usage
- Used/was specified: **yes.** The ticket built on `tests/skills.test.ts` (extended with a new describe block rather than a parallel harness), followed the `task-workflow-doctor` shape for the SKILL.md and the report resource (passing that seam's exact five-H2 assertions in `tests/skill-rewire.test.ts`), followed the sibling four-section docs-page pattern, and kept the ladder's doctor-routing claims consistent with the shipped doctor. `src/` was untouched, as required.

### Out-of-scope changes
Additions, none removals:
1. **`docs/migration-target.yaml` gained one `promoted_skills` line.** Not in the ticket's convention-sync list, but forced by the derived seam that `pi.skills` and the migration target must name the same promoted set. Justified, but it is a file the ticket did not own.
2. **`.changeset/workflow-failure-ladder.md` (minor changeset).** Not in the ticket list; follows the repo convention that every skill-adding feature ships a changeset. Benign.
3. **Test-file edits beyond the derived seams:** `SKILL_FILES` entry and three manifest-count bumps (mandated by `docs/testing.md`), a new describe block in `tests/skills.test.ts` (in-scope, "build on this file"), and the `WORKFLOW_SKILLS` entry in `tests/skill-rewire.test.ts` (sanctioned by the seam's own comment, but the ticket's do-not-touch clause mentions "the canonical reference sentence tests"; the coverage tests themselves were correctly left to `reference-coverage-suite`).
4. **`CORPUS_SKIP_DIRS` in `tests/skills.test.ts` gained `.agents` and `dist`** to exclude local gitignored directories from the em-dash corpus walk. Environment-driven (dirty local checkout, not CI), aligned with the test's own stated skip rule, but it is a test relaxation-adjacent edit made by a feature ticket.

Departures from acceptance criteria:
- "The full existing test suite stays green" is **not met on this branch**: one designed red test (`task-workflow-overview names every user-reachable skill`) awaits the `workflow-internals-reference` router row. This follows the architecture's explicit ownership assignment, so it is a spec-internal conflict, not an implementation failure.

### Ticket doc update needed?
Yes. Append to `## Implementation notes`:
- Registered 31st promoted skill; convention sync done including two files not in the ticket's list: `docs/migration-target.yaml` (forced by the pi.skills/migration-target seam) and a minor changeset (repo convention for skill-adding features).
- Test suite is 1303 passed / 1 failed where the single failure ("task-workflow-overview names every user-reachable skill") is the designed cross-ticket hand-off to `workflow-internals-reference`, per the architecture's ownership division.
- `CORPUS_SKIP_DIRS` extended with `.agents` and `dist` to handle local gitignored directories; environment-driven only.

### User attention needed?
Yes (mild). Reason: the branch intentionally ships with one red test until `workflow-internals-reference` lands; a maintainer running the suite mid-effort will see a failure and should know it is planned, not broken. Also worth a glance are the two root-level out-of-ticket edits (`docs/migration-target.yaml`, `.changeset/`), both conventional and low-risk but outside the ownership list the architecture wrote down.

### Deviation from spec summary
No API-surface mismatch: the skill's ladder, report shape, naming, and references match the architecture exactly. The deviations are all ownership-boundary relaxations (migration target, changeset, test-maintenance entries) that were forced by existing seams or repo conventions, plus one acceptance criterion ("suite stays green") that cannot hold until the next ticket because the ticket doc and the architecture's file-ownership division conflict on the router-row test.
