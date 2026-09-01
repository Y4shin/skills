---
kind: slice
slug: support-scripts-node
title: Port the helper scripts to Node/TS, fix the compatibility bug, add by-hand fallbacks + vitest tests
task: ../task.md
mode: afk
status: todo
size: m
blocked_by:
- scaffold-and-register
---

# Slice 2: skill-creator's own support scripts (Node/TS)

## End-to-end behavior

`skills/skill-creator/scripts/` holds three dependency-light Node scripts —
`validate_skill.mjs`, `scaffold_skill.mjs`, `discover_skill.mjs` — that port
the best of sentient-agi's stdlib-Python helpers, **fix the `compatibility`
omission** (sentient's validator wrongly rejects the spec-allowed
`compatibility` field), and each document a by-hand fallback for harnesses
that can't run them. They are unit-tested with vitest in a new
`tests/skill-creator-scripts.test.ts`, and `validate_skill.mjs` is dogfooded
on `skills/skill-creator/` itself. `SKILL.md` gains a "Helper scripts"
section that says when to run each and gives the by-hand fallback.

## Deliverables

- `skills/skill-creator/scripts/validate_skill.mjs` — accepts a skill folder
  path; checks: `SKILL.md` exists; opens with `---` and a closing `---`;
  `name` present, lowercase/digits/hyphens, ≤64, no leading/trailing/consecutive
  hyphens, equals the folder name; `description` present, ≤1024, no angle
  brackets; **allowed frontmatter keys = `name, description, license,
  compatibility, allowed-tools, metadata`** (this is the bug-fix: include
  `compatibility`); reports the first error with a helpful message and exits
  non-zero on failure. Minimal YAML parse (top-level `key: value`, quoted
  values, `|`/`>` block scalars) — no `yaml` dependency needed for validation,
  but the repo *does* depend on `yaml` (^2.6.1) so using it is acceptable; pick
  the smaller-surface option and keep it dependency-light.
- `scripts/scaffold_skill.mjs` — `<skill-name> --path <dir> [--resources
  scripts,references,assets]` — normalizes the name, creates the folder,
  writes a `SKILL.md` template (`name` + a TODO `description`), and selected
  resource dirs; refuses to overwrite an existing skill ("to UPDATE, edit in
  place"). Mirror sentient's `scaffold_skill.py` UX.
- `scripts/discover_skill.mjs` — `"<intent>" --skills-dir <dir> [--threshold
  0.4] [--json]` — scans immediate subdirs for `SKILL.md`, parses `name` +
  `description`, ranks by name similarity + token-overlap (overlap coefficient
  on the smaller set, like sentient), prints candidates ≥ threshold with a
  "UPDATE over create" hint. Used for the "discover before create" rule.
- Each script's top docstring/comment states a by-hand fallback (e.g.
  validate: "confirm by hand that `SKILL.md` opens with `---`, has `name`
  hyphen-case ≤64 == folder, and `description` ≤1024 no angle brackets").
- `tests/skill-creator-scripts.test.ts` — cases:
  - `validate_skill` accepts a valid temp skill (PASS), and rejects: bad name
    (`Skill_Name`), missing `description`, description >1024, unknown
    frontmatter key (e.g. `disable-model-invocation`), and **accepts** a skill
    carrying `compatibility` (the bug-fix assertion).
  - `scaffold_skill` creates a new skill dir + `SKILL.md` with normalized
    name; refuses to overwrite.
  - `discover_skill` ranks a known skill above an irrelevant one above the
    threshold.
  - Dogfood: `validate_skill.mjs skills/skill-creator` returns PASS (run it
    in the test or a script step).
- `skills/skill-creator/SKILL.md` — add a "Helper scripts" section (when to run
  each: validate before finishing; discover before scaffolding a new skill to
  avoid a near-duplicate; scaffold only for new skills) + the by-hand fallback
  one-liners. (The full "choose a script language" *for produced skills* rule
  is slice 3; this slice is about skill-creator's *own* helpers.)

## Acceptance criteria

- The three `.mjs` files exist, are executable-meaningful (`node …`), and have
  zero third-party runtime deps beyond what the repo already ships (stdlib
  only, or the already-depended `yaml`).
- `validate_skill.mjs` PASSes on `skills/skill-creator` and on `skills/tdd`,
  and FAILs on each deliberately-bad temp skill with a clear message.
- `validate_skill.mjs` **accepts** a skill whose frontmatter includes
  `compatibility:` (regression test for the bug-fix) and **rejects**
  `disable-model-invocation`.
- `tests/skill-creator-scripts.test.ts` passes; `npm test` green (it runs via
  the `test` script's vitest).

## Test plan

- **Seams:** the script CLIs (stdout/stdexit) and the `SKILL.md`
  "Helper scripts" text.
- **Failure modes:** (1) the minimal YAML parser mishandles a quoted
  description with a colon → validate wrongly accepts/rejects; mitigate by
  testing a description containing a colon, or by using the `yaml` dep for
  robust parsing; (2) discover's overlap score is unstable on tiny queries →
  keep sentient's "overlap on the smaller set" formulation and a threshold;
  (3) scaffold overwrites an existing skill → guard exists + tested.
- **Scenarios:** create a temp skill with `scaffold_skill`, break each field
  and confirm `validate_skill` reports the right error, fix and confirm PASS;
  run `validate_skill skills/skill-creator` and confirm PASS (dogfood).
- **Edge cases:** description exactly 1024 chars (boundary, PASS) and 1025
  (FAIL); `name` with a trailing hyphen (FAIL); a real harness that can't run
  node — the by-hand fallback is documented and sufficient.

## Constraints

- Node/TS, dependency-light, by-hand fallback for each — per the map. The
  spec forbids auxiliary docs, so put by-hand fallbacks in the script's own
  header comment + `SKILL.md`, not in a separate `README`.
- Fix (don't inherit) sentient's `compatibility` omission.
- Don't touch the references (slices 4–5) or the full body (slice 3) here.
- These scripts are skill-creator's *own* helpers; the *produced-skill* script
  guidance is slice 3 + the slice-5 references.
