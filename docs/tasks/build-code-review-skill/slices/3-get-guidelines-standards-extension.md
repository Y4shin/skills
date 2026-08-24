---
kind: slice
slug: get-guidelines-standards-extension
title: Extend get_guidelines to discover a repo override file and surface the smell baseline floor
task: ../task.md
mode: afk
status: todo
size: l
blocked_by: [code-review-skill-content]
---

# Slice 3: Extend get_guidelines (repo override + smell baseline floor)

## End-to-end behavior

`get_guidelines` discovers repo standards files (`AGENTS.md`/`CLAUDE.md`/
`CONTEXT.md`/`docs/standards.md` in addition to the existing
`docs/*-guidelines.md`/`*-conventions.md`/`*-practices.md`/`testing.md`) and
serves them by language/topic. When no repo standards match the request, it
surfaces the 12-smell Fowler baseline as the floor. `list_guidelines` reports
the baseline as a source when in effect. The existing tdd-worker usage is
unchanged.

## Deliverables

### `src/pi.ts` — `discoverGuidelines`

- In addition to the existing `docs/` discovery, also discover repo-root
  `AGENTS.md`, `CLAUDE.md`, `CONTEXT.md`, and `docs/standards.md` as
  standards sources. Give them a `topic` of `"standards"` (and the filename)
  so they are retrievable via `get_guidelines({ topic: "standards" })` and
  via language-agnostic calls.
- Do not double-count files already covered by the existing rules.

### `src/pi.ts` — `get_guidelines`

- When a call matches no repo standards for the requested language/topic,
  append the **12-smell Fowler baseline** (the same content as
  `skills/code-review/smells.md`) as a floor, clearly labelled
  ("Smell baseline (floor — no repo standards found for this request)").
- "If there is a reason to include it" = when the repo-standards match set
  is empty for the request. When repo standards ARE found, do NOT append
  the baseline (repo overrides, per mp-skills' rule).
- Keep the existing behavior (return matched repo standards) intact when
  matches exist.

### `src/pi.ts` — `list_guidelines`

- When the smell baseline is in effect (i.e. it would be served to a
  no-match request), report it as a source: `Smell baseline (Fowler 12) —
  served as the floor when no repo standards match`.

### Tests — `tests/guidelines.test.ts` (new) or extend `tests/skills.test.ts`

- Unit tests for the extension (no pi runtime needed — test the
  `discoverGuidelines`/`get_guidelines` logic via the stub-pattern already
  used by `tests/gate-factory.test.ts`, or by direct function import where
  possible):
  1. `discoverGuidelines` picks up `AGENTS.md`/`CLAUDE.md`/`CONTEXT.md`/
     `docs/standards.md` when present (use a tmp dir fixture).
  2. `get_guidelines` returns the smell baseline floor when no repo
     standards match a request.
  3. `get_guidelines` does NOT append the baseline when repo standards match
     (repo overrides).
  4. `list_guidelines` reports the baseline as a source when in effect.
  5. Existing behavior regression: a `docs/typescript-guidelines.md` fixture
     is still discovered and served as before.

## Acceptance criteria

- `discoverGuidelines` discovers `AGENTS.md`/`CLAUDE.md`/`CONTEXT.md`/
  `docs/standards.md` in addition to the existing `docs/*-guidelines.md`
  family.
- `get_guidelines` returns the smell baseline floor when no repo standards
  match; does not append it when they do.
- `list_guidelines` reports the baseline when in effect.
- New unit tests pass; `tests/skills.test.ts` still green; the existing
  `docs/testing.md`-documented behavior (guidelines injection at
  `before_agent_start`) is unchanged.
- `npm run typecheck` clean.

## Test plan

- Seams: the extension's `discoverGuidelines`/`get_guidelines`/`list_guidelines`
  functions are the seam; unit tests with tmp-dir fixtures.
- Failure modes:
  1. Baseline appended even when repo standards match → "repo overrides"
     rule broken → regression test 3 fails.
  2. Repo override files not discovered → regression test 1 fails.
  3. Existing `docs/*-guidelines.md` discovery breaks → regression test 5
     fails.
- Scenarios: a tmp repo with only an `AGENTS.md` → `get_guidelines({})`
  returns the standards + (if no lang/topic match) the baseline; a tmp repo
  with `docs/typescript-guidelines.md` → `get_guidelines({ language:
  "typescript" })` returns the repo guidelines WITHOUT the baseline.
- Edge cases: no docs dir at all → baseline is the only thing served;
  `list_guidelines` reports it. `docs/standards.md` should not be
  double-counted with the `docs/*-guidelines.md` rule.

## Constraints

- Keep one source of truth for the 12 smells: the canonical text lives in
  `skills/code-review/smells.md` (slice 1). The `get_guidelines` baseline
  should reference or inline the same list; if inlining, keep it in sync
  with `smells.md` (a single constant in `src/pi.ts` is acceptable, but
  note the duplication risk).
- Do not break the existing `before_agent_start` guidelines-injection
  behavior or the `session_compact` reset.
- Do not invent a parallel standards-discovery path; extend the existing
  `discoverGuidelines`.
- The gate (`gate.active`) must still suppress `get_guidelines` as before
  (it's registered under `if (!gate.active)`).
