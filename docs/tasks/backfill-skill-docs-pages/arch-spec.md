# Architecture spec: backfill-skill-docs-pages

Status: approved by the user (2026-10-01, approval conversation). Scope: 27
new human-facing docs pages plus a re-sync check of the 2 existing ones
(`eval-review`, `handoff`), and structure tests extending
`tests/skills.test.ts`. No changes to SKILL.md files, agents, `src/`, or
extension code; content flows from skills to docs, never back. The arch
spec lives in this ticket's v3-shape directory (the transitional
convention the last two tickets used; the effort-root rule applies
post-migration).

## The page contract (all 29 promoted skills)

- Page at `docs/<bucket>/<skill-name>.md`, H1 is the skill name (matching
  the existing `eval-review`/`handoff` style).
- Four sections in order: `## What it does`, `## When to reach for it`,
  `## Common questions`, `## It's working if` (the AGENTS.md mandate; both
  existing pages already conform).
- Content is a human-facing distillation of the skill's `SKILL.md` (plus
  its resources where they change the story), not a copy: what it does,
  when to type `/skill:<name>`, the questions users actually ask, and
  observable success signals. The user-invoked vs model-invoked split is
  stated where it matters.
- No em-dashes anywhere (repo-wide prose rule). Any `tw_*` tool named must
  be in the surviving set.

## The v4 truth (overhaul-changed skills)

The seven flow skills the overhaul rewrote (wayfinder, to-spec, to-tickets,
task-workflow-overview, task-workflow-doctor, implement-task,
finalize-task) describe the v4 flow: the effort-grouped tree
(`docs/tasks/<effort>/` holding `map.md`, `spec.md`, `tasks/` decision
items, `tickets/` implementation units), the task/ticket vocabulary, the
surviving `tw_*` tools, and `mode: human` hard-refusal where relevant.
The setup-workflow page documents the v4 detection and migration branches
(schema_version 4, upgrade-3-to-4); the code-review and tdd pages describe
the standards direct reads (the execution-skills ticket rewrote them).
This repo's own tree stays v3 until the user runs the migration; the pages
describe what the skills write now, which is v4.

## Existing abstractions to use

- `package.json` `pi.skills` as the promoted-set single source of truth;
  the presence test derives from it, never from a hardcoded list.
- `tests/skills.test.ts` patterns: the `SKILL_FILES` describe loops,
  `parseFrontmatter`, and the `SURVIVING_TOOLS` set with
  `expectOnlySurvivingTools` (planning-skills section).
- The two existing pages as the tone and density reference.

## Do NOT reimplement

- No new test file; extend `tests/skills.test.ts` (the task doc names it).
- No docs tooling or scripts.
- No bucket-README or top-level-README changes; pages only.
- No pages for `misc/`, `in-progress/`, `deprecated/` skills.

## Seams (the only places the tdd-worker writes assertions)

All in `tests/skills.test.ts`:

1. **Presence:** for every entry in `pkg.pi.skills`,
   `docs/<bucket>/<skill-name>.md` exists. Red today: 27 missing.
2. **Four sections:** every page carries the four H2 headings in order.
3. **No non-promoted pages:** for every skill directory under `misc/`,
   `in-progress/`, `deprecated/`, the mirrored docs path must not exist.
4. **Only surviving tools:** every `tw_*` name appearing in any page is in
   `SURVIVING_TOOLS` (the corpus-wide deleted-names sweep covers the pages
   as a side effect; this seam pins the positive set).
5. **v4-flow fact:** each of the seven flow pages matches
   `docs/tasks/<effort>/` (the effort-grouped path distinguishes v4 prose
   from the v3 `maps/` subtree).

## Interface contract

None: this is the last ticket on the `task-tools-overhaul` frontier; the
pages are the user-facing surface, and nothing consumes them
programmatically except the structure tests.

## Branch model

Landing branch `task/backfill-skill-docs-pages` off
`task/overhaul-dead-surface` (the landing-branch chaining rule from
overhaul-execution-skills). Working branch
`ticket/backfill-skill-docs-pages` off the landing branch; the land-worker
merges with `--no-ff` and deletes it. Budget: size `l` (45 minutes).
