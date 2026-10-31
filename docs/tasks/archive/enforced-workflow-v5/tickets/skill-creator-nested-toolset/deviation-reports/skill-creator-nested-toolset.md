# Deviation report: skill-creator-nested-toolset (effort enforced-workflow-v5)

Verified against branch `ticket/skill-creator-nested-toolset` (three wip
commits on `b23966b`), 1060/1060 suite green, typecheck clean, working tree
clean apart from the parent-owned `docs/tasks/state.yaml` pointer. Ticket
doc, arch spec entry 14, and the landed diff were cross-checked directly.

## Deviation report: skill-creator-nested-toolset

### API surface changes
- **Planned:** the ticket says the three bundled scripts
  (`validate_skill.mjs`, `scaffold_skill.mjs`, `discover_skill.mjs`) are
  registered as tools; the arch spec's entry-14 contract names only
  "the disclosed nested toolset" and requires that the skill "opens inside a
  phase without closing it". The spec's progressivedisclosure section says
  the toolset is built "from its bundled scripts". No tool names are
  specified anywhere in the spec.
- **Actual:** three wrapper tools named `skill_validate`, `skill_scaffold`,
  `skill_discover` (not `tw_*`) in `src/pi.ts`'s `createTools()`, each
  running its bundled `.mjs` via `spawnSync` (no shell) with the session
  directory as cwd and a 30-second timeout; the registry entry in
  `src/disclosure.ts` is
  `["tw_show", "skill_validate", "skill_scaffold", "skill_discover"]`, with
  the bundled-scripts comment replaced. The skill's prose teaches the three
  tool names, no shell command lines, by-hand fallbacks retained; the docs
  page re-synced.
- **Impact:** on `docs-resync` (20): the three tool names and the
  script-tools section are shipped surface, so the docs audit must reflect
  them (the docs page was already re-synced here). No downstream
  implementation ticket consumes these tools; the nesting behavior contract
  is unchanged from the spec.

### Abstraction usage
- Used/was specified: **yes**. Everything routes through the landed
  abstractions: registration in `src/pi.ts` (the single extension surface),
  the toolset registry entry in `src/disclosure.ts` (one entry in
  `SKILL_REGISTRY`, gated `exposure: "direct"`, `defaultActive: false`),
  the nested-open path from `disclosure-open-close-core`, and the pin tables
  in `tests/opener-gate.test.ts`, `tests/plugin.test.ts`,
  `tests/gate-factory.test.ts`. No parallel mechanism was invented.

### Out-of-scope changes
- **`tw_show` stayed in the toolset instead of leaving with the provisional
  entry.** The ticket's wording ("gains a disclosed toolset built from its
  bundled scripts") and the provisional comment could be read as replacing
  the entry wholesale. Keeping `tw_show` is deliberate and is the registry's
  own precedent (entry 11 kept `tw_map_finalizable` for the same reason):
  the landed union test asserts `tw_show` is declared when nested, and
  removing it from every toolset would leave a registered tool disclosed by
  no phase, which `tests/opener-gate.test.ts` refuses. The signature tool
  stays `tw_show`; nothing downstream moves. If a later ticket wants it out,
  three regression pins (the integration union test, the disclosure tests'
  nested/close assertions, and a new disclosure home) must move together.
- **Registry pin tables updated as part of landing the entry** (the
  established precedent of tickets 9-11): `tests/opener-gate.test.ts`
  toolset table, `tests/plugin.test.ts` registration list, gate-factory
  `GATED_NAMES`.
- Nothing was removed: no file or tool was deleted that the ticket did not
  call out.

### Ticket doc update needed?
Yes, minor: append `## Implementation notes` recording (a) the three tool
names and their `spawnSync` wrappers in `src/pi.ts`, (b) the registry entry
`["tw_show", "skill_validate", "skill_scaffold", "skill_discover"]` with
`tw_show` deliberately retained as the private signature tool, (c) the
prose/rewire change and docs re-sync, (d) the pin-table updates as
established precedent. All five acceptance criteria are met on the branch.

### User attention needed?
No. No scope changed: the toolset substitution is exactly what the ticket
planned, the `tw_show` retention is a registry invariant the prior tickets
already set, and the `skill_*` naming is additive surface (the spec named no
tool names). The residual risks are of the accepted class (child-process
writes are not gated by the write guard; a hung spawn times out at 30
seconds) and are recorded in the implementation notes for the coherence
pass and `docs-resync`.
