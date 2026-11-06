---
type: architecture
title: Integrate the pr skill into the package
status: stable
---

# Architecture: Integrate the pr skill into the package

Produced from the stable specification at `docs/tasks/add-pr-skill/spec.md`, whose architecture content is inlined below in full and is archival from this write. One ticket, `vendor-pr-skill`, delivers the whole slice: the docs-resync tests require the manifest, the migration target, and both READMEs to move together, so the change is one vertical tracer bullet, not layered tickets.

## Inlined from the specification

### Implementation Decisions

All decisions below were settled in planning (the map and the `non-negotiables` grilling task); nothing new is settled here.

- Vendoring stance: the upstream `pr` skill's body and voice are kept; only mechanical adjustments where house rules demand. The upstream text is verified em-dash-free, so no prose adjustment is expected. The trigger description stays verbatim: "Use when writing a PR body."
- Location and invocation: the skill lands in the engineering bucket as a model-invoked skill (no disable-model-invocation), exactly one of the house's two invocation modes, expressed in frontmatter only.
- Credits and provenance: the upstream `metadata.credits` frontmatter block is kept byte-for-byte; the full provenance chain (Dex Horthy's show-me at Humanlayer -> Matt Pocock's `pr` in mattpocock/skills -> vendored into this package) is reflected in the skill's docs page.
- Promoted-set wiring: the package manifest's skills list grows from 31 to 32 entries; the top-level README gains the skill in its Model-invoked group; the engineering bucket README gains its one-line entry; the docs page is created with the four fixed sections (What it does, When to reach for it, Common questions, It's working if); the router skill gains both a Standalone bullet and an Actions row ("Write a PR body").
- Test wiring: the structure-test file list gains the new SKILL.md, so the standard structure assertions cover it (frontmatter name and description, no chain JSON references, no supervisor patterns, valid YAML); the two pinned manifest-count assertions move from 31 to 32. The report-resource seam and the phase registry are not touched, because the skill is neither a run-ending workflow skill nor a phase with its own toolset.
- Release wiring: one changeset declaring a minor bump, per the release policy that every behavior change adds one.
- Standalone wiring: no other skill body changes; no references into or out of the workflow phases; auto-invocation through the description is the only trigger path.
- No duplication: no existing skill writes PR bodies (the merge-conflict skill resolves in-progress conflicts; the ticket-graph skill only borrows "blast radius" as vocabulary), and the new skill changes none of them.

### Testing Decisions

- What makes a good test here: assert external structure, not implementation. The suite checks presence and shape of artifacts: frontmatter parses and carries name and description, the manifest contains the skill and matches its pinned count, the README groups list it, the docs page carries its four section headings, and the corpus-wide no-em-dash invariant holds.
- Surfaces tested: the new SKILL.md through the existing structure tests; the manifest count through its two existing pins; the docs page through the existing docs-page assertion pattern (four section headings).
- Prior art: the structure tests that already cover every promoted skill; the docs-page assertions used when a previous skill joined the package; the em-dash corpus sweep.
- No new tooling and no eval-corpus entries (a non-goal): the existing suite is extended, not replaced.

## Surface map (the seams)

Nine surfaces move together in the single ticket; partial landings go red by design.

1. Skill file `skills/engineering/pr/SKILL.md` (new): upstream frontmatter and body, byte-close, credits block included. Guarded by the structure tests and the em-dash corpus sweep.
2. Manifest `package.json`: `pi.skills` gains `./skills/engineering/pr`; both pinned counts (`toBe(31)`, two sites) become 32.
3. Migration target `docs/migration-target.yaml`: `promoted_skills.engineering` gains `pr`. Found while drafting the ticket; the spec carried it inside promoted-set wiring. A docs-resync test requires exact agreement with the manifest.
4. Top-level `README.md`: the Model-invoked group gains the skill link; the docs-resync test requires the group to list exactly the promoted set.
5. Bucket README `skills/engineering/README.md`: the Model-invoked group gains the one-line entry; same exact-set guard.
6. Docs page `docs/engineering/pr.md` (new): the four fixed sections, carrying the full provenance chain. Model on an existing engineering page such as `resolving-merge-conflicts`.
7. Router `skills/engineering/task-workflow-overview/SKILL.md`: a Standalone bullet plus an Actions row ("Write a PR body").
8. Tests `tests/skills.test.ts`: the structure-test file list gains the skill file; both count pins read 32.
9. Changeset: one new file under `.changeset/`, frontmatter `"@y4shin/pi-task-workflow": minor`, body as the changelog line.

## Existing abstractions to use

- The docs-resync test block derives the expected sets from the manifest and frontmatter (`promotedWithInvocation`, `linkedSkills`); the ticket adds no new test logic, only the file-list entry and the two count pins.
- The structure tests iterate the file list, so listing the new skill covers frontmatter, description, chain-JSON, supervisor-pattern, and YAML checks automatically.
- The docs-page four-section pattern and the em-dash corpus sweep are established; nothing new to build.
- The changeset format is fixed in `docs/releasing.md`: frontmatter with the package name and level, body as the changelog line.

## Do-not-reimplement

- No `SKILL_REGISTRY` entry: the registry holds only `tw_open`-gated phase skills with toolsets; `pr` is a plain model-invoked skill.
- No `WORKFLOW_SKILLS` report-seam edit: that seam covers run-ending workflow skills only.
- No eval-corpus entries or new tooling for the skill.
- No rework of the upstream body, trigger description, or credits block: byte-close vendoring; the upstream text is verified em-dash-free.
- No edits to any other skill body except the router's two mentions.
- No platform- or house-specific PR conventions baked in (GitHub, Bitbucket, anwalt.de PR rules).
- Never write into pi's installed package trees when testing; use a project-local checkout declaration or a one-run extension load.

## Per-ticket contract

- `vendor-pr-skill` (feature, size s, no blockers): hands the effort the completed, green wiring: all nine surfaces above in one change, the suite green, and the effort's success test satisfied (a fresh install auto-invokes `pr` when its agent writes a PR body; every promoted-set surface carries it). Nothing inside this effort depends on it; it is the whole graph.
