# Architecture spec: overhaul-tw-rename

Status: awaiting user approval.
Scope: a mechanical rename of the tool family from the `task_` prefix to the
`tw_` prefix across the whole package: `src/pi.ts`, `skills/`, `tests/`,
`README.md`, `CONTEXT.md`, `docs/testing.md`, `docs/migration-target.yaml`,
`rewrite-plan.md`, and the live (non-archived) `docs/tasks/` tree. No
behavior, contract, or description-text changes beyond the prefix.

## The rename

| Old | New |
|---|---|
| `task_show` | `tw_show` |
| `task_get` | `tw_get` |
| `task_set` | `tw_set` |
| `task_set_slices` | `tw_set_slices` |
| `task_resolve` | `tw_resolve` |
| `task_assert_kind` | `tw_assert_kind` |
| `task_list` | `tw_list` |
| `task_slices` | `tw_slices` |
| `task_finalizable` | `tw_finalizable` |
| `task_dependency_levels` | `tw_dependency_levels` |
| `task_frontier` | `tw_frontier` |
| `task_map_tasks` | `tw_map_tasks` |
| `task_map_tick` | `tw_map_tick` |
| `task_map_finalizable` | `tw_map_finalizable` |
| `task_state` | `tw_state` |
| `task_state_set` | `tw_state_set` |
| `task_context` | `tw_context` |

The soon-to-die tools (`resolve`, `assert_kind`, `map_tasks`, `map_tick`,
`slices`, `set_slices`) rename too, so `overhaul-dead-surface` stays a pure
no-references-remain deletion. `notify_user` is untouched (it never carried
the prefix). The word `task` everywhere else (task docs, task slugs, the
`task` state pointer, `docs/tasks/` paths, "task" as prose) is untouched:
the rename covers exactly the 17 tool identifiers above.

## Sweep plan

1. **Longest-first identifier replacement** over the file set, so
   `tw_map_finalizable` never half-matches `tw_finalizable`. Order the
   table by descending old-name length; apply as whole-word replacements
   (word boundary on both sides, so `tw_finalizable` inside
   `tw_map_finalizable` is never seen twice).
2. **File set**: every file under the package root that grep finds carrying
   an old-prefix reference, excluding `node_modules/`, `.git/`, and
   `docs/tasks/archive/` (archived task docs are historical records; their
   prose describes what ran at the time and stays as written). The live
   `docs/tasks/` tree (map doc, handoff, findings, live task docs) **is**
   swept: the acceptance criterion is zero old-prefix references package-wide
   outside the archive.
3. **Verify**: after the sweep, `grep -rn '\btask_\(show\|get\|set\|set_slices\|resolve\|assert_kind\|list\|slices\|finalizable\|dependency_levels\|frontier\|map_tasks\|map_tick\|map_finalizable\|state\|state_set\|context\)\b' --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=archive .` returns zero hits.

## What must keep working

- `src/pi.ts`: tool registrations, the `task_`-prefixed label derivation
  (`name.replace(/^task_/, "")` becomes `^tw_`), and any internal references.
- `tests/plugin.test.ts`, `tests/graph.test.ts`, `tests/gate-factory.test.ts`,
  `tests/integration/session.test.ts`, `tests/skills.test.ts`: every tool call
  and every prose assertion that names a tool.
- `skills/`: every SKILL.md and resource that names a tool (wayfinder,
  to-spec, to-tickets, implement-task and its resources, finalize-task,
  doctor, task-workflow-overview, setup-workflow).
- `README.md`, `CONTEXT.md`, `docs/testing.md`, `docs/migration-target.yaml`,
  `rewrite-plan.md`: prose references rename with everything else (these are
  living docs, not historical records).
- The full suite (`npx vitest run`) and `npm run typecheck` stay green.

## Do NOT

- No semantic edits: no description rewrites, no behavior changes, no
  reformatting beyond the identifier replacement. The diff should be
  prefix-only on every touched line.
- Do not touch `docs/tasks/archive/`: archived docs keep the names that were
  live when they ran.
- Do not rename `notify_user`, the `task` state pointer, `docs/tasks/`
  paths, task slugs, or the word "task" in prose.
- Do not touch `package.json` (no tool names in it) or skill names
  (implement-task, finalize-task, etc. keep their names; the rename is the
  tool prefix only, per round 7: the vocabulary sweep beyond the prefix is
  "maybe later").
- Do not fix the implement-task async-dispatch prose (`wait({ id })`,
  `chain`/`parallel`) here: those are recorded feedback items owned by
  `overhaul-execution-skills`. If a renamed line contains them, rename the
  tool name and leave the rest byte-identical.

## Seams (need approval)

1. **Tool contract**: every tool invoked under its new `tw_` name through
   the registered-tool interface against fixture trees (the existing
   plugin/graph test pattern, renamed).
2. **Corpus check**: the package-wide grep above is itself the acceptance
   test for "no old-prefix reference remains"; run it as a test assertion
   (a structure test in `tests/skills.test.ts` or a standalone check) so it
   cannot regress.

## Test plan

- The existing suite, renamed: every `task_*` call site in `tests/` becomes
  the `tw_*` equivalent; assertions on tool names in prose
  (`tests/skills.test.ts`) expect the new names.
- New corpus assertion: zero old-prefix hits outside the archive (the grep
  from the sweep plan, encoded as a test).
- No new behavior tests: the rename changes no behavior.

## Constraints and dependencies

- Size `m`: chain budgets 40 turns / 400s.
- Design context: decision record
  `docs/tasks/overhaul-synthesis-grilling/task.md`, round 7 (the rename
  ruling: `tw_show`, `tw_get`, `tw_set`, `tw_list`, `tw_frontier`,
  `tw_dependency_levels`, `tw_map_finalizable`, `tw_state`, `tw_state_set`,
  `tw_context`; the dying tools rename with the family).
- No em-dashes in any prose this workflow writes (the rename must not
  introduce any; existing lines are otherwise byte-identical).
