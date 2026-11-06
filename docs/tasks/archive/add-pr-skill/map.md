---
type: map
title: Integrate the pr skill into the package
status: deprecated
ready_for_spec: true
---
# Integrate the pr skill into the package

## Destination

The upstream `pr` skill (from mattpocock/skills, itself crediting Dex Horthy's show-me skill at Humanlayer) is vendored at `skills/engineering/pr/SKILL.md`, body and voice kept close to upstream, and mechanically fitted into the promoted set: the `package.json` `pi.skills` manifest grows from 31 to 32 entries, the top-level `README.md` lists it in its Model-invoked group, `skills/engineering/README.md` carries its one-line entry, the docs page `docs/engineering/pr.md` presents its four fixed sections, the `task-workflow-overview` router mentions it, `tests/skills.test.ts` covers it in its structure tests, and a changeset declares the release. Nothing the package already does is duplicated.

## Constraints

- Bucket: `skills/engineering/` (user-confirmed at intake).
- Invocation mode: model-invoked, as upstream (no `disable-model-invocation`); the house allows exactly one of the two modes, in frontmatter only.
- Upstream body is verified em-dash-free; the corpus-wide test in `tests/skills.test.ts` (the "no file in the corpus carries an em-dash" check) enforces the ban on every file.
- Test seams that move when a skill joins: `SKILL_FILES` in `tests/skills.test.ts` gains `skills/engineering/pr/SKILL.md` (structure tests: name, description, no chain JSON, no supervisor patterns, valid YAML); the two pinned counts `toBe(31)` in `tests/skills.test.ts` become 32.
- Test seams that do not move: the `WORKFLOW_SKILLS` seam in `tests/skill-rewire.test.ts` covers run-ending workflow skills only, and `pr` is not one; `SKILL_REGISTRY` in `src/disclosure.ts` holds only the `tw_open`-gated phase skills, and `pr` carries no phase tools.
- Release policy (`docs/releasing.md`): every behavior change adds one changeset under `.changeset/`; a new promoted skill is a minor bump.
- Docs page: `docs/engineering/pr.md` with the four fixed sections (What it does, When to reach for it, Common questions, It's working if).
- Router: every promoted skill appears somewhere in `task-workflow-overview` (Standalone list, References underneath, on-ramps, or the Actions table); which slot `pr` takes is a grilling decision.
- Upstream frontmatter carries a `metadata.credits` block; no skill in this package carries one; how attribution is preserved is a grilling decision.
- Never write into pi's installed package trees (`~/.pi/agent/npm/**`, `~/.pi/agent/git/**`); test local changes through a project `.pi/settings.json` local-checkout declaration or `pi -e`.
- Lineage: this package descends from mattpocock/skills; the archived efforts `adopt-mp-skills-way` and `compare-to-mp-skills` are the prior adoption records.

## Non-goals

- No rework of the upstream body's substance or voice; only mechanical adjustments where house rules demand.
- No other upstream skills vendored in this effort.
- No edits to any other skill body except the `task-workflow-overview` router mention.
- No platform- or house-specific PR conventions baked in (GitHub, Bitbucket, anwalt.de PR rules); the skill stays generic.
- No eval-corpus entries or new tooling for `pr`; the structure and manifest tests cover it.

## Non-negotiable facts

**Success test:** a fresh install of the package auto-invokes `pr` when its agent writes a PR body, and every promoted-set surface carries it: the `pi.skills` manifest at 32, both READMEs, the four-section docs page, the router mention, and the structure tests, with the suite green.

- The skill lands at `skills/engineering/pr/SKILL.md`: model-invoked, upstream description verbatim, body kept byte-close to upstream (upstream is verified em-dash-free, so no prose adjustment is expected).
- The upstream `metadata.credits` block is kept byte-for-byte; the full provenance chain (Dex Horthy's show-me at Humanlayer -> Matt Pocock's `pr` in mattpocock/skills -> this package) is reflected in `docs/engineering/pr.md`.
- The promoted-set wiring is mandatory and complete: `package.json` `pi.skills` at 32 (both `toBe(31)` pins in `tests/skills.test.ts` become 32), `SKILL_FILES` in `tests/skills.test.ts` gains `skills/engineering/pr/SKILL.md`, the top-level `README.md` Model-invoked group, `skills/engineering/README.md`, `docs/engineering/pr.md` with its four fixed sections, both router mentions, and one changeset under `.changeset/`.
- Nothing the package already does is duplicated: no existing skill writes PR bodies.
- `pr` takes no `SKILL_REGISTRY` entry and does not join the `WORKFLOW_SKILLS` report seam.

## Decisions so far

- All six grilling decisions were settled by the non-negotiables task; the full record (answers, rejected options, rationale) lives in its task Notes.
- Credits and provenance: the upstream `metadata.credits` frontmatter block stays byte-for-byte; the full chain, Dex Horthy's show-me at Humanlayer -> Matt Pocock's `pr` in mattpocock/skills -> vendored into this package, is reflected in the docs page `docs/engineering/pr.md` (settled in `non-negotiables`).
- Trigger description: upstream `description: "Use when writing a PR body."` stays verbatim (`non-negotiables`).
- Router: `task-workflow-overview` gains both a Standalone bullet and an Actions row, "Write a PR body | `/skill:pr`" (`non-negotiables`).
- Wiring: `pr` is standalone; no other skill body changes beyond the router (`non-negotiables`).

## Fog


