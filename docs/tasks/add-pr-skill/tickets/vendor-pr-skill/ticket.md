---
type: ticket
subtype: feature
title: Vendor the pr skill into the promoted set
status: stable
workflow_state: ready
blocked_by: []
size: s
---

## What to build

The end-to-end behaviour: a fresh install of this package auto-invokes a `pr` skill whenever its agent writes a PR body, and every promoted-set surface carries the skill. The skill is the upstream `pr` from mattpocock/skills, vendored byte-close: frontmatter untouched (the verbatim trigger description and the credits block included), body unchanged except where a house rule demands a mechanical adjustment (none expected; the text is verified em-dash-free).

Because the docs-resync tests require the manifest, the migration target, and both READMEs to list exactly the same promoted set, all wiring lands in this one change: the manifest entry and both count pins at 32, the migration-target entry, the top-level README's Model-invoked group, the bucket README's Model-invoked group, the four-section docs page carrying the full provenance chain (Dex Horthy's show-me at Humanlayer, then Matt Pocock's `pr` in mattpocock/skills, then this package), the router's Standalone bullet and Actions row ("Write a PR body"), the structure-test file-list entry, and one changeset declaring the minor bump.

The exact surface map, the existing test abstractions to reuse, and the do-not-reimplement notes are in the effort's architecture document; work from it.

## Acceptance criteria

- [ ] The `pr` skill exists in the engineering bucket, model-invoked, with the upstream frontmatter intact (verbatim description, credits block) and the body byte-close to upstream.
- [ ] The package manifest lists the skill; both pinned manifest-count assertions read 32.
- [ ] The shipped migration target agrees exactly with the manifest (the docs-resync test passes).
- [ ] The top-level README lists the skill in its Model-invoked group and the bucket README in its Model-invoked group (the exact-set docs-resync tests pass).
- [ ] The docs page exists with the four fixed sections (What it does, When to reach for it, Common questions, It's working if) and carries the full provenance chain.
- [ ] The router carries both mentions: a Standalone bullet and an Actions row ("Write a PR body").
- [ ] The structure tests cover the new SKILL.md: frontmatter name and description, no chain JSON references, no supervisor patterns, valid YAML.
- [ ] One changeset declares the minor bump.
- [ ] The full suite is green.
- [ ] No other skill body changed; no phase-registry entry; no report-seam edit; no eval-corpus entries.

## Blocked by

None (can start immediately).
