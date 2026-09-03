---
kind: slice
slug: realign-skills
title: Re-align grilling (consult-first), code-review (12-smell baseline), tdd (refactor-out-of-loop), domain-modeling (companion docs + CONTEXT-MAP + 3-criteria ADR) to Matt's current
task: ../task.md
mode: hitl
status: done
size: m
blocked_by:
- reorganize-into-buckets
---

## End-to-end behavior

Four already-shipped skills are re-aligned to Matt's current text (grilling
#1 Q13 + Q16), keeping Pi-native bits (`ask_user_question`, vendored CDN
for improve-architecture, telemetry): `grilling` (terser form + "Call the
Skill tool" wording, **CONSULT USER FIRST** per Q13 before rewriting);
`code-review` (spell out the 12-smell Fowler baseline + "repo overrides" +
"always a judgement call" rules); `tdd` (refactor-out-of-loop wording:
"Refactoring is not part of the loop. It belongs to the review stage");
`domain-modeling` (add companion `CONTEXT-FORMAT.md` + `ADR-FORMAT.md`,
multi-context `CONTEXT-MAP.md` support, 3-criteria "offer ADRs sparingly"
rule). Each keeps its telemetry wiring; no-em-dashes applied.

## Acceptance criteria

- `grilling` SKILL.md re-aligned to Matt's terser form, BUT only after user
  consultation (Q13). Pi-native `ask_user_question` interaction kept. The
  "Call the Skill tool with `<name>`" wording adopted where operative
  (adapted to Pi's invocation convention per Q14). Record the consultation
  outcome in slice notes.
- `code-review` SKILL.md spells out the 12-smell baseline (Mysterious Name
  through Refused Bequest) + the "repo overrides" + "always a judgement
  call" rules; parallel sub-agent structure kept.
- `tdd` SKILL.md states refactor is not part of the loop (belongs to
  review); red→green (not red-green-refactor); anti-patterns + seams kept.
- `domain-modeling` SKILL.md + new `CONTEXT-FORMAT.md` + `ADR-FORMAT.md`
  companions; `CONTEXT-MAP.md` multi-context support; 3 ADR criteria.
- All 4 pass `validate_skill.mjs`; telemetry preserved; no-em-dashes.
- `tests/skills.test.ts` updated (companion docs, cross-refs); `npm test`
  + typecheck green.

## Test plan

Seams: `validate_skill.mjs`, `tests/skills.test.ts`, typecheck. Failure
modes: `grilling` rewritten without consultation (violates Q13); a re-align
drops telemetry (must preserve); `tdd` still says red-green-refactor.
Scenarios: each re-aligned skill reads as Matt's current + Pi-native bits.
Edge cases: the `grilling` consultation may decide NOT to re-align (keep
  ours), that's a valid outcome; record it.

## Constraints and dependencies

- Blocked by `reorganize-into-buckets`.
- **HITL / consult-first because:** grilling #1 Q13 explicitly gates the
  `grilling` re-align on user consultation. This slice MUST pause and
  consult the user before rewriting `grilling`. The other 3 re-align
  directly.
- Grilling #1 Q13 (re-align 3, grilling consult-first), Q16 (add
  domain-modeling to the set). Q14 (invocation convention).
- Source: Matt's current `grilling`, `code-review`, `tdd`, `domain-modeling`
  (+ companions) in the gitignored clone at `6654f6b`.
