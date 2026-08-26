---
kind: slice
slug: improve-arch-report-and-grilling
title: Wire the HTML report generation + grilling/no-grill + wayfinder handoff + xref tests
task: ../task.md
mode: afk
status: done
size: m
blocked_by: [improve-arch-skill-and-scout]
---

# Slice 2: Wire the report generation, grilling/no-grill, and wayfinder handoff

## End-to-end behavior

The skill's process is fully specified: the scout returns candidates → the
skill generates the HTML report (referencing vendored deps) → opens it →
stops and asks which candidate → on pick, runs grilling (or skips in no-grill
mode) → hands the decision to wayfinder. Xref tests lock the contract.

## Deliverables

- `skills/improve-codebase-architecture/SKILL.md` — complete the process
  wiring (slice 1 created the shell; this slice fills the report-generation,
  grilling, no-grill, and wayfinder-handoff prose):
  - Report generation: write to `<tmpdir>/architecture-review-<timestamp>.html`
    referencing the vendored `vendor/tailwind.min.js` + `vendor/mermaid.min.js`
    by absolute path; open it (`xdg-open`/`open`/`start`); tell the user the
    absolute path.
  - Stop and ask: "Which of these would you like to explore?"
  - Grilling (on pick): use the grilling skill/resource's one-question/frontier
    discipline; update `CONTEXT.md` lazily; offer ADRs for durable rejections.
  - No-grill mode: if the user says "don't grill me, just show the report" (or
    invoked with that flag), skip the grilling loop; the report is the whole
    output.
  - Hand to wayfinder: the grilling decision (or the picked candidate, in
    no-grill mode) becomes input to `/skill:wayfinder`, which creates the
    deepening task and wires the frontier.
- `tests/skills.test.ts` — add xref assertions:
  - the SKILL.md references `wayfinder` (the handoff).
  - the SKILL.md contains "no-grill" (the documented mode).
  - the SKILL.md references `CONTEXT.md` and `docs/adr`.

## Acceptance criteria

- The SKILL.md fully describes: report generation (vendored deps, temp file,
  open), stop-and-ask, grilling-on-pick, no-grill mode, wayfinder handoff.
- `tests/skills.test.ts` has the new xref assertions; all pass.
- `npm test -- tests/skills.test.ts` green.

## Test plan

- Seams: the structure/xref tests.
- Failure modes: a required reference dropped → xref test fails.
- Scenarios: `npm test -- tests/skills.test.ts` green; reading the SKILL.md
  shows the full process.
- Edge cases: `no chain JSON references` / `no supervisor/intercom` pass.

## Constraints

- The report references the vendored copies, NOT CDN URLs.
- The grilling loop uses the existing grilling resource's discipline (no new
  variant).
- The handoff is to wayfinder (not to-spec/to-tickets).
- Do not change slice 1's vendor files or the scout agent in this slice.
