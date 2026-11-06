---
type: spec
title: Integrate the pr skill into the package
status: stable
---

# Spec: Integrate the pr skill into the package

> Synthesizes the settled record of the `add-pr-skill` effort: the map at `docs/tasks/add-pr-skill/map.md` and the `non-negotiables` grilling task's notes. Continues ADR 0001 (largely adopt Matt Pocock's skills way; his side wins by default).

## Problem Statement

The package ships a promoted set of skills for daily code work, but nothing in it guides how a PR body is written. When an agent working with this package writes a PR description, the output is freeform prose: no summary visual, no before and after evidence, no assessment of how dangerous the merge is. A reviewer starts from zero and cannot tell a one-way door from a two-way one. Upstream, the mattpocock/skills repo this package descends from carries a mature `pr` skill that templates exactly this, and this package carries nothing that covers the job.

## Solution

Vendor the upstream `pr` skill into the package as a promoted, model-invoked engineering skill, keeping its body and voice byte-close to upstream, and fit it mechanically into every surface the package uses for its promoted set. After the integration, a fresh install of the package auto-invokes the skill whenever its agent writes a PR body, producing bodies built from a summary visual, before and after evidence, and a merge-danger assessment (one-way versus two-way door, blast radius), while the package's manifest, READMEs, docs page, router, and structure tests all carry the skill consistently.

## User Stories

1. As a developer who installs this package, I want my agent to reach a `pr` skill whenever it writes a PR body, so that the body follows a proven template instead of freeform prose.
2. As a developer who installs this package, I want the PR body to open with a summary visual (diagram, diff-sketch, or tree), so that a reviewer grasps the change's shape before reading prose.
3. As a developer who installs this package, I want the PR body to show before and after evidence (screenshots, test runs, console output), so that the claim that it works is backed by something checkable.
4. As a developer who installs this package, I want the PR body to state the merge danger (one-way or two-way door, blast radius), so that I and my reviewers can judge the risk of merging.
5. As a developer who installs this package, I want the skill to arrive with the same `pi install` as every other promoted skill, so that no extra setup is needed.
6. As a reviewer reading a PR written by an agent with this package, I want the body's structure to be predictable (Summary, Evidence, Merge Danger), so that I can find the risk assessment without hunting.
7. As a developer working in any repo where this package is installed, I want the skill to stay generic with no platform-specific PR conventions, so that it applies to GitHub, Bitbucket, and any other host.
8. As a package maintainer, I want the skill in the promoted engineering bucket, so that it ships with the package and follows the same rules as its peers.
9. As a package maintainer, I want the manifest, the top-level README, the bucket README, the docs page, and the router to carry the new skill consistently, so that the package surfaces never disagree about what is shipped.
10. As a package maintainer, I want the upstream attribution preserved with its full chain (Dex Horthy's show-me at Humanlayer, then Matt Pocock's `pr` in mattpocock/skills, then this package), so that the skill's provenance stays traceable.
11. As a package maintainer, I want the structure tests extended to cover the new skill, so that a future edit that breaks the wiring goes red in CI.
12. As a package maintainer, I want a changeset declaring the minor bump, so that the release flow picks the change up.
13. As a package reader browsing the docs tree, I want a docs page for the skill with the four standard sections, so that I can learn when to reach for it without opening its SKILL.md.
14. As a package maintainer, I want the router's standalone list and actions table both to mention the skill, so that the package's which-skill-when map stays complete.

## Implementation Decisions

All decisions below were settled in planning (the map and the `non-negotiables` grilling task); nothing new is settled here.

- Vendoring stance: the upstream `pr` skill's body and voice are kept; only mechanical adjustments where house rules demand. The upstream text is verified em-dash-free, so no prose adjustment is expected. The trigger description stays verbatim: "Use when writing a PR body."
- Location and invocation: the skill lands in the engineering bucket as a model-invoked skill (no disable-model-invocation), exactly one of the house's two invocation modes, expressed in frontmatter only.
- Credits and provenance: the upstream `metadata.credits` frontmatter block is kept byte-for-byte; the full provenance chain (Dex Horthy's show-me at Humanlayer -> Matt Pocock's `pr` in mattpocock/skills -> vendored into this package) is reflected in the skill's docs page.
- Promoted-set wiring: the package manifest's skills list grows from 31 to 32 entries; the top-level README gains the skill in its Model-invoked group; the engineering bucket README gains its one-line entry; the docs page is created with the four fixed sections (What it does, When to reach for it, Common questions, It's working if); the router skill gains both a Standalone bullet and an Actions row ("Write a PR body").
- Test wiring: the structure-test file list gains the new SKILL.md, so the standard structure assertions cover it (frontmatter name and description, no chain JSON references, no supervisor patterns, valid YAML); the two pinned manifest-count assertions move from 31 to 32. The report-resource seam and the phase registry are not touched, because the skill is neither a run-ending workflow skill nor a phase with its own toolset.
- Release wiring: one changeset declaring a minor bump, per the release policy that every behavior change adds one.
- Standalone wiring: no other skill body changes; no references into or out of the workflow phases; auto-invocation through the description is the only trigger path.
- No duplication: no existing skill writes PR bodies (the merge-conflict skill resolves in-progress conflicts; the ticket-graph skill only borrows "blast radius" as vocabulary), and the new skill changes none of them.

## Testing Decisions

- What makes a good test here: assert external structure, not implementation. The suite checks presence and shape of artifacts: frontmatter parses and carries name and description, the manifest contains the skill and matches its pinned count, the README groups list it, the docs page carries its four section headings, and the corpus-wide no-em-dash invariant holds.
- Surfaces tested: the new SKILL.md through the existing structure tests; the manifest count through its two existing pins; the docs page through the existing docs-page assertion pattern (four section headings).
- Prior art: the structure tests that already cover every promoted skill; the docs-page assertions used when a previous skill joined the package; the em-dash corpus sweep.
- No new tooling and no eval-corpus entries (a non-goal): the existing suite is extended, not replaced.

## Out of Scope

Consistent with the map's non-goals:

- No rework of the upstream body's substance or voice; only mechanical adjustments where house rules demand.
- No other upstream skills vendored in this effort.
- No edits to any other skill body except the router mention.
- No platform- or house-specific PR conventions baked in (GitHub, Bitbucket, anwalt.de PR rules); the skill stays generic.
- No eval-corpus entries or new tooling for the skill; the structure and manifest tests cover it.

## Further Notes

- The effort-level success test: a fresh install of the package auto-invokes `pr` when its agent writes a PR body, and every promoted-set surface carries it (the manifest at 32, both READMEs, the four-section docs page, the router mention, and the structure tests), with the suite green.
- Local testing must never write into pi's installed package trees; changes are tested through a project-local checkout declaration or a one-run extension load.
- Lineage: this package descends from mattpocock/skills under the largely-adopt posture of ADR 0001, whose on-conflict default (Matt's side wins) is the same spirit as the byte-close vendoring here; the archived efforts `adopt-mp-skills-way` and `compare-to-mp-skills` are the prior adoption records.

> The architecture content in this specification is archival: the living architecture document is [architecture.md](architecture.md); update it there, not here.
