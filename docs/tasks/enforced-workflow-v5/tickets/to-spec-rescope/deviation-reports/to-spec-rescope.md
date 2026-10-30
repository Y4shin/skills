---
type: deviation report
title: Deviation report for to-spec-rescope
status: stable
---

## Deviation report: to-spec-rescope

Reviewed diff: `9eed462..ticket/to-spec-rescope` (the landing branch
`task/to-spec-rescope` does not exist at deviation time; `9eed462` is the
ticket branch's parent, so once the landing branch is created there this is
exactly `task/to-spec-rescope..ticket/to-spec-rescope`). One commit,
`13aac06`, touching `skills/engineering/to-spec/SKILL.md`,
`docs/engineering/to-spec.md`, and `tests/skills.test.ts`.

### API surface changes
- **Planned:** arch-spec entry 16: "exports the gated spec phase. Contract:
  checks only `ready_for_spec`; no seam or architecture interview."
- **Actual:** no API surface changed, as planned. The `ready_for_spec` flag
  gate, the refusal with the Wayfinder pointer, and the toolset all landed
  upstream by `opener-gate-and-toolsets` and `disclosure-open-close-core`
  and were reused as-is (confirmed in `src/pi.ts` lines 688-703, 1003 and
  `tests/opener-gate.test.ts`'s "the to-spec flag gate" describe block). This
  ticket's surface is prose and prose-seam tests: the seam/architecture
  interview (old step 2) is gone, the skill now synthesizes from the settled
  record, writes through `tw_write_spec` (draft, then `publish: true`), and
  keeps the full section set with `Out of Scope` tied to the map's
  `## Non-goals`.
- **Impact:** none on dependent tickets. `docs-resync`'s audit will find the
  docs page already re-synced on this surface (see out-of-scope note).

### Abstraction usage
- Used/was specified: yes. `tw_write_spec` as the only spec writer,
  `tw_open`/`tw_close to-spec` phase framing, the landed flag gate, and the
  existing prose-seam test helpers (`expectOnlySurvivingTools`,
  `extractFrontmatterTemplates`, `assertTemplateConforms`). No
  reimplementations.

### Out-of-scope changes
- `docs/engineering/to-spec.md` re-synced in the same ticket. The ticket doc
  does not name the docs page, but the repo's standing rule (AGENTS.md)
  mandates re-syncing a promoted skill's docs page when its behavior changes;
  the seam-interview narrative had to leave the human-facing page too.
- One new test asserts a phrase the prose must contain ("only writer of the
  spec"), derived from the to-tickets precedent ("only writer of the
  architecture document") and the named-writer contract in the arch spec.
- A `submit_feedback` pointer paragraph was appended to `SKILL.md`,
  matching the shape the landed `skill-report-resources` convention gives
  the other workflow skills.
- One wip commit covers all six acceptance criteria (they share one file and
  one prose rewrite) rather than one `wip:` commit per criterion.

### Ticket doc update needed?
- No: the land step's standard implementation note suffices; nothing beyond
  the normal landing record.

### User attention needed?
- No: no scope change and no API-surface difference. The docs-page addition
  is standing-rule-grounded and named above for completeness.
