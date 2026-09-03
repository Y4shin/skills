---
kind: slice
slug: references-portable-and-pi
title: Write references/agent-skills-spec.md (portable format) + references/target-pi.md (Pi target)
task: ../task.md
mode: afk
status: done
size: m
blocked_by:
- core-skill-body
---

# Slice 4: Portable-spec + Pi-target references

## End-to-end behavior

`skills/skill-creator/references/` holds the two always-true reference files:
the portable Agent Skills format digest (single-sourced from the current
spec) and the Pi-package target guide. Both are linked one level deep from
  `SKILL.md` (already indexed in slice 3) with when-to-read notes, and each is
focused (a reader loads only the one it needs). After this slice the spec and
Pi facts have a single authoritative home outside the body.

## Deliverables

- `skills/skill-creator/references/agent-skills-spec.md` — the portable
  format, distilled from the current agentskills.io specification (recheck it
  live before finalizing). Cover:
  - Directory structure: `SKILL.md` (required) + optional `scripts/`,
    `references/`, `assets/`.
  - Frontmatter: required `name` (≤64, lowercase a-z/0-9 + hyphens, no
    leading/trailing/consecutive hyphens, **must match the parent dir**) and
    `description` (≤1024, no angle brackets, what + when). Optional `license`,
    `compatibility` (≤500), `metadata` (string→string map), `allowed-tools`
    (space-separated, experimental). No other fields are spec-valid.
  - Body: no format restrictions; the agent loads the whole file on
    activation, so keep it lean.
  - Progressive disclosure: metadata ~100 tokens (always), body <5000 tokens /
    <500 lines (on activation), resources as needed. File refs relative, one
    level deep; avoid deeply nested reference chains.
  - Validation: the official `skills-ref` reference library
    (github.com/agentskills/agentskills) and the manual checklist.
  - A short "when to read this" note matching the `SKILL.md` index.
- `skills/skill-creator/references/target-pi.md` — authoring a skill *for a
  Pi package* (the one first-class named target). Cover:
  - Where Pi skills live: `skills/<name>/SKILL.md`, registered in
    `package.json` `pi.skills` (`./skills/<name>`), and conventionally covered
    by `tests/skills.test.ts` (`SKILL_FILES` + a `pi.skills.length` assertion).
  - The repo gate: `task-workflow` (and so `skill-creator`) auto-disables in
    work repos; a produced Pi skill inherits that gating. State it so the
    author isn't surprised.
  - Companion reference files are an established precedent in this repo
    (the `tdd` skill ships `tests.md` + `mocking.md` alongside `SKILL.md`) —
    encouraged when they keep the main file lean; keep them one level deep.
  - **Pi-specific optional frontmatter as an explicit harness extension, not
    the portable core**: this repo's own skills use `disable-model-invocation:
    true` (model can't auto-invoke; explicit `/skill:<name>` only) and
    `metadata: telemetry.capture: "target"`. Both are **Pi-specific and not
    in the Agent Skills spec** — they fail external validators. If a produced
    Pi skill uses either, it is a deliberate "Harness-specific extension"
    (per the map's Portable-vs-extension distinction): the portable core stays
    spec-pure (name + description), and the Pi extension is opt-in and
    documented. Recommend: only add `disable-model-invocation` when the skill
    genuinely shouldn't auto-trigger; only add telemetry metadata when the
    package instrumentation expects it.
  - A worked mini-example: scaffolding + registering a tiny Pi skill, bumping
    the manifest length, adding a structure-test row.

## Acceptance criteria

- Both files exist, are non-empty, and each opens with a one-line "when to
  read this" matching the `SKILL.md` references index.
- `agent-skills-spec.md` states the exact current frontmatter rules (name +
  description required, the four optional fields, no others) and the
  64/1024/500 limits; it points to `skills-ref` and the live spec URL.
- `target-pi.md` covers the `skills/<name>/` + `package.json` + `tests`
  registration, the repo gate, the companion-doc precedent, and the
  `disable-model-invocation` / `metadata.telemetry.capture` **harness-specific
  extension** guidance (explicit that they are not portable).
- Neither file duplicates content already in `SKILL.md`; each fact has one
  home.
- `validate_skill.mjs skills/skill-creator` still PASSes (the references don't
  change frontmatter).

## Test plan

- **Seams:** the reference file text + the structure test (unchanged
  frontmatter).
- **Failure modes:** (1) the spec digest drifts from the live spec
  (e.g. omits `allowed-tools` or `metadata`) → recheck agentskills.io before
  finalizing and cross-check against `validate_skill`'s allowed-key set; (2)
  `target-pi.md` encourages spec-invalid frontmatter in the portable core →
  it must label those fields as opt-in harness extensions only.
- **Scenarios:** a fresh agent reading only `agent-skills-spec.md` can
  produce a valid `SKILL.md` frontmatter from scratch; a fresh agent reading
  only `target-pi.md` can register a new Pi skill in `package.json` + tests.
- **Edge cases:** the live spec may have added/changed an optional field since
  the task was written — the digest must reflect the *current* spec, with a
  note to recheck at authoring time.

## Constraints

- Single-source: the spec digest is the only place the frontmatter rules
  live in full; `SKILL.md` links it. Pi specifics live only in `target-pi.md`.
- Spec fields only in the portable core; Pi-only fields are explicit opt-in
  extensions (per the map).
- No `README`/`CHANGELOG` in the skill.
