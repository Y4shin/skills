---
kind: slice
slug: self-review-and-finalize
title: Adversarial self-review (trigger test + dry-run + context/generalization review), validate, remove placeholders, finalize
task: ../task.md
mode: afk
status: todo
size: s
blocked_by:
- references-support-scripts
---

# Slice 6: Adversarial self-review + validate + finalize

## End-to-end behavior

`skill-creator` is reviewed as if a different agent were seeing it for the
first time: the trigger test (the slice-1 seeds executed against the *final*
description), an execution dry-run of a realistic request, a context review,
and a generalization review are all performed and revisions applied. The
skill passes the bundled Node validator (dogfooded) and the official
`skills-ref` validator if available. Placeholder/TODO/scaffolding files are
removed, `npm test` is green, and the skill is summarized. This is the task's
Phase 6 + 7 (validate + adversarial self-review) and the "Deliverable"
finish checklist.

## Deliverables

- **Trigger test.** Execute the slice-1 seeds against the final `description`
  (read *only* the description):
  - Should-trigger: "create a skill for reviewing Go API changes"; "turn this
    deploy runbook into a skill"; "this skill isn't triggering reliably — fix
    it".
  - Near-misses (should NOT): "write a README for my project"; "explain how
    PDFs work".
  - For each, decide: does the description contain the literal words the
    should-trigger requests use (not an abstract description of them)? Do the
    near-misses share vocabulary but describe a different job that the "Do NOT
    use for" line excludes? Revise the description (add literal phrases,
    tighten the negative boundary) until the test passes, re-checking the
    1024-char limit each time.
- **Execution dry-run.** Mentally execute "Create a skill for reviewing Go API
  changes" end-to-end through `skill-creator`: does it understand → discover
  → plan → scaffold → write → validate with no missing info, ambiguous
  decision, undiscoverable reference, undefined output shape, or hidden
  harness assumption? Also dry-run "Improve this SKILL.md" and "make this
  Claude-oriented skill portable". Note stalls; fix them. Where a script
  exists (the produced-skill script decision), the dry-run names the concrete
  script choice rather than hand-waving.
- **Context review.** Challenge every substantial section: "would a capable
  coding agent do *worse* if this section were removed?" If not, cut or shorten
  it. Then "is this needed *every* time the skill activates?" If not, move it
  to a reference. Re-confirm `SKILL.md` ≤500 lines / ≲5k tokens.
- **Generalization review.** Confirm the skill teaches the *reusable workflow
  for the class of task*, not the examples used to build it. Strip anything
  that only makes sense for skill-creator's own creation story.
- **Validate.** Run `node skills/skill-creator/scripts/validate_skill.mjs
  skills/skill-creator` (dogfood — must PASS). If `skills-ref` is installed
  locally, run it on `skills/skill-creator`; otherwise execute the manual
  checklist (frontmatter fields, naming, length, every referenced file
  present, references one level deep) and record it as passed in this slice.
- **Remove scaffolding/placeholders** — no `README`, `CHANGELOG`, install
  guide, dev diary, or `TODO`-only files in the skill; remove any empty
  resource dirs that slices 2–5 didn't populate.
- **Green suite** — `npm test` (structure tests + manifest length 16 + the
  new `tests/skill-creator-scripts.test.ts`) is green.
- **Summary** — a short note (in the finalize-task changelog, not in the skill)
  of what was created and any intentional portability limitations (Node
  helper scripts need Node; by-hand fallback documented; no `license` field;
  capability-conditional not brand-conditional).

## Acceptance criteria

- All four review lenses performed; the trigger test's should-trigger requests
  match literal words in the description and the near-misses are excluded by
  the "Do NOT use for" line; revisions applied and re-checked.
- `validate_skill.mjs skills/skill-creator` PASSes (dogfood).
- `skills-ref` run or the manual checklist recorded as passed.
- No placeholder/TODO/scaffolding/auxiliary-doc files remain in
  `skills/skill-creator/`; any unpopulated resource dirs removed.
- `SKILL.md` ≤500 lines / ≲5k tokens.
- `npm test` green.

## Test plan

- **Seams:** `npm test`, `validate_skill.mjs`, the description text, the
  references index.
- **Failure modes:** (1) a near-miss *would* trigger (e.g. "write a README"
  shares "skill" vocabulary but is doc-writing) → tighten "Do NOT use for"; (2)
  the dry-run stalls on an undiscoverable reference → fix the when-to-read
  note or move the content into the body; (3) context review finds a section
  reminding the agent what it already knows → cut it.
- **Scenarios:** the three should-trigger dry-runs complete without stalls; a
  deliberately-broken `skill-creator` (add `disable-model-invocation`) is
  rejected by `validate_skill` (regression guard).
- **Edge cases:** the official `skills-ref` may not be installable in this
  env — the manual checklist is an accepted fallback, recorded here.

## Constraints

- This slice reviews and finalizes; it does not redesign. If a review exposes
  a real design gap (not a polish item), stop and return to Wayfinder with a
  discovery rather than improvising (the return-to-Wayfinder hatch).
- No auxiliary docs created. Frontmatter stays spec-pure (name + description).
- The summary goes in the task changelog / finalize output, never in the
  skill itself.
