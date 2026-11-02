---
type: review
title: End-of-effort review of agent-facing-workflow-docs
pass: end-of-effort
---

Advisory whole-effort review (two axes: Standards and Spec) over the full
effort diff (32 commits, 70 files, +2132/-4). Both axes came back with no
blocking findings; suite green (1308/1308 after the coherence sweep),
typechecks clean. The coherence pass folded the three composed
inconsistencies into `tests/skills.test.ts` (position-pinning comment,
removed duplicate exemption assertion, hoisted shared constants for the
internals resource) as commit `refactor(coherence): agent-facing-workflow-docs`.

## Standards findings

- **Weak, worth a ruling:** AGENTS.md says a behaviour change to a promoted
  skill re-syncs its docs page. The reference sentence changed 29 promoted
  SKILL.md files and re-synced zero existing docs pages. The pages are
  human-facing and the sentence is deliberately invisible to the four
  sections, so this may be intended; on the letter of the rule, though, 29
  skills changed behaviour with stale docs pages.
- **Shotgun surgery (judgement, not violation):** shipping one skill forced
  edits across ~10 convention surfaces. The scatter is convention-mandated,
  but the skill-creator runbook is the natural single home for the list.
- **Gate relaxation inside a feature ticket:** `CORPUS_SKIP_DIRS` gained
  `.agents` and `dist` (gitignored, never shipped, environment-driven).
  Defensible, but a corpus-test relaxation smuggled into a feature ticket
  deserves its own scrutiny.
- **Formatting noise:** the changelog prepend inserted five consecutive
  blank lines before the new entries.
- Duplicated Code (the sentence in 40 files) is deliberate and mechanically
  pinned by the coverage suite; not reported as a smell.

## Spec findings

- **No missing or wrongly implemented requirements:** all ladder-rung,
  threading, internals-reference, coverage-suite, and out-of-scope
  constraints verified in the diff.
- **Ownership-boundary creep (minor):** create-workflow-failure-skill
  landed edits outside its architecture-assigned ownership
  (migration-target.yaml, changeset, test-manifest maintenance,
  CORPUS_SKIP_DIRS), self-reported in its deviation report. The architecture
  reconcile recorded these additions in the Interface contracts section.
- **Spec-internal conflict (drafting defect):** create-workflow-failure-skill's
  criterion "the full existing test suite stays green" contradicted the
  router-row ownership assignment; the designed-red hand-off ran per
  operator protocol and the final state is green. The reconcile replaced the
  impossible criterion with the designed one-red-test hand-off.
- **Additive sixth assertion (benign):** reference-coverage-suite asserted
  the exemption direction beyond its four numbered checks; within contract
  intent, deviation-reported, and recorded by the reconcile.
