---
type: ticket
subtype: feature
title: skill-creator bundles its scripts as a disclosed nested toolset
status: stable
workflow_state: ready
blocked_by: [disclosure-open-close-core, opener-gate-and-toolsets]
size: m
---

## What to build

`skill-creator` gains a disclosed toolset built from its bundled scripts
(`validate_skill.mjs`, `scaffold_skill.mjs`, `discover_skill.mjs`). It is the
one tool-owning discipline and the concrete justification for nested opens.

Opening `skill-creator` inside an open phase adds its toolset without closing
the phase, and closing it leaves the phase open with its own tools intact.
The scripts stop being called through the shell and become registered tools
that the discipline can call directly.

This is also the real user of the nested-open path, so the acceptance here is
the same union-and-intact assertion the disclosure ticket proves.

## Acceptance criteria

- [ ] The three bundled scripts are registered as tools.
- [ ] `skill-creator` opens nested inside a phase and adds its toolset.
- [ ] Closing `skill-creator` leaves the phase open with its own tools
      intact.
- [ ] The scripts are no longer invoked through the shell by this skill.
- [ ] `tests/skill-creator-scripts.test.ts` is green after the rewiring.

## Blocked by

- disclosure-open-close-core (nesting and the toolset activation mechanism).
- opener-gate-and-toolsets (the registry that maps `skill-creator` to its
  toolset).

## Implementation notes

Landed on `task/skill-creator-nested-toolset` (merge `9f8c9e6`, three wip
commits `a4ba562`, `ea3eb0e`, `78e1e2f` on landing point `b23966b`). Full
suite 1060/1060 green after the merge, `tsc --noEmit` clean.

- The three bundled scripts are registered as tools: `src/pi.ts` gains
  `skill_validate`, `skill_scaffold`, and `skill_discover` in `createTools()`,
  each running its bundled `*.mjs` directly (`spawnSync`, no shell) with the
  session directory as cwd; nonzero exits fail with the script's own message.
  Registered gated (`exposure: "direct"`, `defaultActive: false`), so they are
  declared only when the skill opens. Pinned by the 8 new tool-seam tests in
  `tests/skill-creator-scripts.test.ts` (30/30 total, including the 22 CLI-seam
  tests proving the bundled scripts still work from their bundled location).
- The registry entry in `src/disclosure.ts` is now
  `["tw_show", "skill_validate", "skill_scaffold", "skill_discover"]` (nested
  open, gate `none`, no target, no conflicts). A new integration test in
  `tests/integration/disclosure.test.ts` proves opening `skill-creator` inside
  an open phase adds the three script tools to the union, and closing it leaves
  the phase open with its own tools intact (script tools and `tw_show` leave,
  every phase tool stays). The pre-existing union and close tests from
  disclosure-open-close-core stay green, unmodified.
- The skill's prose teaches tools, not shell commands: SKILL.md's "Helper
  scripts" became "Bundled script tools", every `node scripts/…` command line
  is gone, the three by-hand fallbacks stay, and the docs page
  `docs/engineering/skill-creator.md` was re-synced. Seam 7 in
  `tests/skill-rewire.test.ts` pins this.
- Deviation: `tw_show` stayed in the toolset instead of leaving with the
  provisional entry. The landed union test from disclosure-open-close-core
  asserts `tw_show` in the nested declared set, and dropping it from all
  toolsets would make a registered tool dead surface, which
  `tests/opener-gate.test.ts` refuses. See the ticket's deviation report for
  the full reasoning and the three regression pins that must move together if
  a later ticket wants `tw_show` out.
- Residual risk carried from the implementation report: `skill_scaffold`
  writes on disk through its bundled script; the write lockdown guard only
  blocks the built-in `write`/`edit` on `docs/tasks/**` and does not gate
  child-process writes. Same residual-risk class the arch spec already accepts
  for the shell.