---
type: task
subtype: grilling
title: Settle the non-negotiables for the pr skill integration
status: stable
workflow_state: done
blocked_by: []
---

Decision to settle: this effort's non-goals, non-negotiable facts, and the effort-level success test for integrating the upstream `pr` skill into this package.

## Raw request (verbatim)

"I want to take this skill and integrate it into this repo: https://raw.githubusercontent.com/mattpocock/skills/refs/heads/main/skills/engineering/pr/SKILL.md. We need to make sure that it is properly integrated into this package's skills and so on and that it does not duplicate stuff."

## One-line destination

The upstream `pr` skill lives in this package's engineering bucket and mechanically fits the package's skill surfaces, without duplicating anything the package already does.

## Actor

Developers who install this Pi skills package, and the agents that write PR bodies for them.

## Classification

Feature.

## Stories

1. As a package user, I want my agent to reach a `pr` skill when it writes a PR body, so that the body carries a summary visual, before/after evidence, and a merge-danger assessment instead of freeform prose.
2. As a package maintainer, I want the `pr` skill in the promoted engineering bucket with its README reference, `package.json` `pi.skills` entry, bucket README line, and docs page, so that it ships and stays discoverable like every other promoted skill.
3. As a package maintainer, I want the integration checked against the existing skill set, so that nothing the package already does is duplicated.

## Constraints and known facts from intake

- Upstream skill: `pr` from mattpocock/skills (`skills/engineering/pr/SKILL.md`), itself credited in its frontmatter to Dex Horthy's show-me skill (Humanlayer). It templates PR bodies as Summary (diagram, diff-sketch, or tree), Evidence (before/after), and Merge Danger (one-way vs two-way door, blast radius).
- Adaptation stance (user's answer at intake): do not rework the upstream style; make the skill mechanically fit this package. Substance and prose stay close to upstream.
- Bucket: engineering (user confirmed at intake).
- Invocation mode: upstream is model-invoked (no `disable-model-invocation`); house rules require exactly one of the two modes in frontmatter. Derived at intake: keep model-invoked. Grilling may revisit.
- House integration surfaces that define "mechanically fits": top-level `README.md` (Model-invoked group), `skills/engineering/README.md`, `package.json` `pi.skills`, docs page at `docs/engineering/pr.md` with the four fixed sections (What it does, When to reach for it, Common questions, It's working if), and the `task-workflow-overview` router, which also lists model-invoked reference skills.
- House prose rules: no em-dashes anywhere in repo prose; the upstream text appears to contain none (verify when vendoring).
- Credits handling is open: upstream carries a `metadata.credits` frontmatter block; no skill in this package carries credits frontmatter. Keep the block, move attribution into prose, or drop it: grilling settles it.
- Duplicate check (done at intake): no `pr` skill exists anywhere in this package (skills/ tree, `package.json`, `CHANGELOG.md`, `skills/deprecated/`), and no active effort covers PR bodies. Nearest existing skills do different jobs: `resolving-merge-conflicts` works in-progress merge or rebase conflicts; `to-tickets` uses "blast radius" only as refactor vocabulary. No fold-in target.
- Lineage links: this package descends from mattpocock/skills; the archived efforts `adopt-mp-skills-way` and `compare-to-mp-skills` are the related prior work.
- Never write into pi's installed package trees (`~/.pi/agent/npm/**`, `~/.pi/agent/git/**`); test local changes through a project `.pi/settings.json` local checkout declaration or `pi -e`.

## Open decisions for grilling

- How the upstream credits block is handled.
- Whether and where the `task-workflow-overview` router lists `pr`, and whether any workflow skill (for example `implement-ticket`'s close-out) should reference it, or it stays standalone.
- The effort-level success test for the integration.

## Notes

## Grilling round 1: settled decisions (user's terms)

1. **Credits and provenance (Q1)**: Keep the upstream `metadata.credits` frontmatter block as-is. The full chain of provenance must be reflected: Dex Horthy (show-me, Humanlayer) -> Matt Pocock (`pr` in mattpocock/skills) -> this package. The chain is carried in the docs page `docs/engineering/pr.md`; the frontmatter block stays as upstream wrote it. Rejected: dropping the block; moving attribution into prose only; carrying no attribution.
2. **Trigger description (Q2)**: Keep `description: "Use when writing a PR body."` verbatim. Rejected: expanding into a house-style trigger description.
3. **Router slot (Q3)**: Both mentions in `task-workflow-overview`: a Standalone bullet and an Actions-table row ("Write a PR body | `/skill:pr`"). Rejected: single-slot mentions.
4. **Wiring (Q4)**: `pr` stays standalone; no other skill body changes beyond the router mention. Rejected: wiring a reference into `implement-ticket`'s close-out.
5. **Non-goals (Q5)**: confirmed as proposed: (1) no rework of the upstream body's substance or voice, only mechanical adjustments where house rules demand; (2) no other upstream skills vendored in this effort; (3) no edits to any other skill body except the router mention; (4) no platform- or house-specific PR conventions baked in (GitHub, Bitbucket, anwalt.de PR rules), the skill stays generic; (5) no eval-corpus entries or new tooling for `pr`, the structure and manifest tests cover it.
6. **Success test (Q6)**: confirmed as drafted: a fresh install of the package auto-invokes `pr` when its agent writes a PR body, and every promoted-set surface carries it: the `pi.skills` manifest at 32, both READMEs, the four-section docs page, the router mention, and the structure tests, with the suite green.

## Constraints and rationale

The stance from intake governs every answer: keep the upstream style, focus on mechanical fit, duplicate nothing. The mechanical-fit facts (test pins at 31, `SKILL_FILES` seam, changeset policy, docs-page sections, router precedent, registry and report-seam exclusions) are recorded in the map's `## Constraints`.

## Dependent-task implications

None: no further planning tasks are needed. The decisions are complete enough for `to-spec` to collapse into a specification.

## Remaining fog

None.
