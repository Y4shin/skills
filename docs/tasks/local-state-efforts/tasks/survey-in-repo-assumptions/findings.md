---
type: findings
title: Survey the workflow's in-repo assumptions
status: stable
---

# Survey the workflow's in-repo assumptions

## Question investigated

Which paths, tools, gates, and skill behaviors of this package assume the effort tree lives inside the working repository, and what exactly breaks when it does not. Trusted sources: `src/`, `skills/`, `tests/`, shipped `docs/`. No code, skills, or docs were modified.

## Sources

1. `src/pi.ts:201-214` - `findRoot` / `taskRoot`: the whole tool layer's root resolution.
2. `src/pi.ts:246-248, 513-529` - `isInitialized`, `loadState`/`saveState`, `profileText`.
3. `src/pi.ts:531-575` - `artifactSchemaRef`, the schema text every phase receives via `tw_context`.
4. `src/pi.ts:1334-1500` - `phaseGate`, `requireLiveEffort`.
5. `src/pi.ts:2382-2435, 2752-2790, 3085-3102` - effort create, archive, state set.
6. `src/pi.ts:3453-3528` - write lockdown: `lockdownReason`, `stateIsStamped`, `isTaskTreePath`, `guardTaskTreeWrites`.
7. `src/pi.ts:3552-3562, 3565, 3616` - extension entry: gate resolved from `process.cwd()`, tools only registered when inactive.
8. `src/core/repo-gate.ts:266-330, 337-420` - gate config and truth table.
9. `src/core/art.ts:216-243, 286-303, 318-330` - location-derived effort scoping.
10. `src/core/graph.ts:42-50` - `groupKeyOf` grouping by effort directory.
11. `src/core/migrate.ts:98-104, 803-806, 1297-1310`; `src/migrate-cli.ts:41-44`; `src/core/fs-port.ts:36-46` - migration root anchoring.
12. `src/core/state.ts:1-100`, `src/core/frontmatter.ts:1-51` - pure, path-free.
13. `src/disclosure.ts:42-60, 71-260` - registry: per-skill toolset and gate kind.
14. `docs/repo-gating.md:1-58, 62-90` - the shipped account of gating and lockdown.
15. `skills/engineering/setup-workflow/SKILL.md:22-33, 35-103` - detection and onboard scaffold.
16. `skills/engineering/wayfinder/SKILL.md:68`; `to-spec/SKILL.md:35-40`; `to-tickets/SKILL.md:70-73`; `intake/SKILL.md:88-110`.
17. `skills/engineering/implement-ticket/SKILL.md:183-221, 240-272, 284, 313`; `finalize-effort/SKILL.md:57-79, 141-168`.
18. `skills/engineering/task-workflow-doctor/SKILL.md:30-58`, `resources/missing-tasks-tree.md:1-25`; `task-workflow-overview/SKILL.md:100`, `WORKFLOW-INTERNALS.md:69, 338`.
19. `tests/migrate.test.ts:99`; `tests/art.test.ts:94-475`; `tests/opener-gate.test.ts:649-671, 848` - layout-pinning tests.
20. Repo-wide grep for `external-state`, `local state`, `~/.pi/task-workflow`: only `docs/ideas/gate-skills-by-repo.md:236` and `docs/tasks/archive/gate-skills-by-repo/tasks/gate-config-mechanics/task.md:35`. No shipped local-state machinery.

## Facts

F1. Root discovery never looks outside the repo. `findRoot` walks up from the session cwd and stops at the first directory holding `docs/tasks` or `.git`; failing both it returns the cwd (`src/pi.ts:201-210`). `taskRoot` then appends the literal `docs/tasks` (`src/pi.ts:212-214`), used at 26 sites in `src/pi.ts`. Confidence: high.

F2. The tree path is baked into the agent-facing text, not only into file I/O: 34 literal `docs/tasks` occurrences in `src/pi.ts`, including the schema block returned by `tw_context` (`src/pi.ts:531-575`), tool descriptions (`src/pi.ts:2382-2386, 2756-2757, 3022`), and refusal messages (`src/pi.ts:875, 2338`). Confidence: high.

F3. Effort scoping is derived from the path string, not from a root object. `effortDirOf` looks for the `docs`/`tasks` pair, and when that pair is absent falls back to the first bare `tasks` segment (`src/core/art.ts:216-222`); `isV4TaskPath` requires the `docs/tasks` pair and returns false otherwise (`src/core/art.ts:296-303`); `effortKeyOf` and `groupKeyOf` inherit that (`src/core/art.ts:318-330`, `src/core/graph.ts:42-50`). A tree relocated to, say, `<state>/repos/<repo>/<effort>/tasks/<task>/task.md` would key each task to `<task>` rather than the effort. Confidence: high for the code; medium for how badly a given local layout breaks (layout-dependent).

F4. Gate detection is origin-based only. `resolveGate` reads the git `origin` and `disableOnRepo` regexes from the global settings file plus an `enable` override from `<repo>/.pi/settings.json` (`src/core/repo-gate.ts:266-330, 337-420`); it is resolved once from `process.cwd()` at extension load (`src/pi.ts:3552-3562`). Nothing anywhere inspects `docs/tasks` to decide the gate. Confidence: high.

F5. No tool refuses because the repo is not set up. In a gate-inactive repo with no `docs/tasks`: all `tw_*` tools register (`src/pi.ts:3565-3616`); `tw_list` answers `"(no docs/tasks directory)"` (`src/pi.ts:1736`); `tw_open` on an effort-gated skill refuses with `no live effort '<x>'...; no efforts exist yet` and legal next `run intake` (`src/pi.ts:1468-1476`); `intake` opens because its gate is `none` (`src/disclosure.ts:78-100`); `tw_create_effort` creates `docs/tasks/<effort>/map.md` and an index, `tw_state_set` creates `docs/tasks` and writes `state.yaml` without a schema stamp (`src/pi.ts:2382-2435, 3085-3102`; `toObject` never stamps, `src/core/state.ts:88-100`). So an uninitialized repo is silently half-initialized into a regular setup, and nothing routes to `setup-workflow`. Confidence: high.

F6. The write lockdown is repo-relative and stamp-gated. `isTaskTreePath` computes `relative(taskRoot(findRoot(cwd)), resolved)` and requires a non-`..` result plus a numeric `schema_version` in `docs/tasks/state.yaml` (`src/pi.ts:3487-3506`). A local tree outside the repo is never covered, and an unstamped tree is unprotected (`docs/repo-gating.md:18-58` documents both properties from the other direction). Confidence: high.

F7. The only initialization signal in the package is `docs/tasks/state.yaml.schema_version` (`src/pi.ts:3487-3494`; `skills/engineering/setup-workflow/SKILL.md:22-33`; `task-workflow-doctor/SKILL.md:30-35`). "Fresh" and "locally set up" are indistinguishable to `setup-workflow`, whose only branches are onboard, migrate, no-op (`setup-workflow/SKILL.md:24-33`). Confidence: high.

F8. Migration owns a repo-relative bundle: `TASK_ROOT = "docs/tasks"` and four derived constants (`src/core/migrate.ts:98-104`), a `TreePort` over the repo root (`src/core/fs-port.ts:36-46`), a CLI whose `--root` defaults to `process.cwd()` (`src/migrate-cli.ts:41-44`), and an explicit ownership rule that markdown elsewhere in the repo is out of scope (`src/core/migrate.ts:803-806`). Confidence: high.

F9. `state.ts` and `frontmatter.ts` are pure and path-free (`src/core/state.ts:1-100`, `src/core/frontmatter.ts:1-51`); `art.ts`, `graph.ts`, `feedback.ts` are pure over paths they are handed. The path assumptions live in `pi.ts` (resolution) and in `art.ts` (path parsing), not in the data model. Confidence: high.

F10. No detection of a foreign `docs/tasks` tree exists. `findRoot` treats any `docs/tasks` as the workflow root (`src/pi.ts:204`); `docs/repo-gating.md:1-8` states as a premise that a work repo "doesn't use" that tree; the doctor's missing-scaffolding table has no row for a tree that is not ours (`task-workflow-doctor/SKILL.md:45-58`). Same for the both-setups state: no code path reads any local state (source 20). Confidence: high.

F11. Arc skills read repo-side knowledge artifacts: `wayfinder/SKILL.md:68` (CONTEXT.md, ADRs, active efforts, profile), `to-spec/SKILL.md:37`, `to-tickets/SKILL.md:72` (both "read `CONTEXT.md` if it exists", "respect ADRs"), `implement-ticket/SKILL.md:191, 284, 313` (`docs/testing.md` as the test protocol and CI-command source), `finalize-effort/SKILL.md:57-79` (holistic review reads the changelog and the whole record). Outside the arc: `code-review/SKILL.md:68-69` (AGENTS.md, CONTEXT.md, docs/standards.md, docs/testing.md), `domain-modeling` writes CONTEXT.md and `docs/adr/`. Confidence: high.

F12. Arc skills write repo-side knowledge artifacts: `implement-ticket/SKILL.md:203-208` (knowledge harvest into `docs/testing.md` and "any other relevant docs under `docs/`"), `setup-workflow/SKILL.md:35-103` (the whole regular scaffold: `docs/tasks/{archive,out-of-scope}`, `docs/adr`, `docs/agents`, `CONTEXT.md`, `AGENTS.md`, `docs/testing.md`, `docs/dev-env.md`, one commit). Confidence: high.

F13. Several arc steps are git-coupled to the artifact tree being tracked in the repo: `git add docs/tasks/ && git commit` for ticket notes plus the state pointer (`implement-ticket/SKILL.md:248, 258-259`), `git add docs/tasks/CHANGELOG.md` (`:214`), the archive commit `git add docs/tasks/ && git commit -m "chore: archive <effort>"` (`finalize-effort/SKILL.md:163-164`). The branch mechanics do not depend on the tree: CI gate and merge (`implement-ticket/SKILL.md:183-198`), landing-branch merge, branch delete, push (`:265-270`). Confidence: high.

F14. The only per-repo switch a local setup could use today is itself a repo file, `<repo>/.pi/settings.json` with `taskWorkflow.enable` (`src/core/repo-gate.ts:266-300`, an `enable` read from the project file only; `docs/repo-gating.md:56-90`). Confidence: high.

F15. Tests pin the in-repo layout: `tests/migrate.test.ts:99` ("a repo with no docs/tasks lands on the schema-5 scaffold"), path fixtures `/repo/docs/tasks/eff/...` throughout `tests/art.test.ts:94-475`, opener/gate tests keyed to effort slugs (`tests/opener-gate.test.ts:649-671`), and a skill-content test matrix (`tests/skills.test.ts`, `tests/skill-rewire.test.ts`). Confidence: high.

## Assumptions

A1. The local setup is expected to reuse the same `tw_*` tools rather than a parallel tool family: nothing in the map forbids a parallel family, but "one installed package serves both setups" plus per-skill reduction implies the tools stay. Confidence: medium.
A2. `art.ts` path parsing can be satisfied most cheaply by keeping a `docs/tasks`-shaped suffix inside the local state root (for example `<state>/repos/<repo>/docs/tasks/...`) instead of parameterizing the parser. Confidence: medium.
A3. The local setup does not need the write lockdown at all, because the local tree is not the work product and the operator owns that directory. Confidence: low; this is a product call, not a code fact.
A4. `docs/repo-gating.md`'s claim that a work repo has no `docs/tasks` holds for the target repos, so a foreign `docs/tasks` is rare rather than routine. Confidence: medium.

## Findings: what breaks, and the disposition each item needs

| # | Assumption | Breaks without the in-repo tree | Disposition |
|---|---|---|---|
| 1 | Tree at `<repo>/docs/tasks` (F1) | Every `tw_*` call resolves to the wrong place or creates the tree in the repo | re-anchor |
| 2 | Literal `docs/tasks` in tool descriptions, schema, refusal text (F2) | The agent is told paths that are not the real ones; its own writes and reads then mislead | re-anchor |
| 3 | Effort grouping from the `docs/tasks` pair (F3) | Wrong effort keys, so frontiers, gates, anomalies, archive scoping are wrong | re-anchor or constrain the layout (needs the spec's layout choice) |
| 4 | Write lockdown scoped to the session repo (F6) | Local artifacts are freely writable by built-in write/edit, so the "only named writers" invariant vanishes | ask (apply it to the local root, or drop it and say so) |
| 5 | Initialization signal is `state.yaml` schema stamp (F7) | A locally set-up repo reads as "fresh"; the same repo reads as "fresh" to `setup-workflow`, which then scaffolds a regular setup into it | re-anchor (an equivalent stamp in the local root, read first) |
| 6 | Tool layer trusts that setup already happened (F5) | Silent half-initialization into a regular setup instead of a refusal | re-anchor: an explicit refusal naming both setups |
| 7 | Detection from the repo's `.pi/settings.json` (F14) | Contradicts "work repos receive no workflow files" | ask |
| 8 | Migration over the repo root and bundle (F8) | The local sister skill has no schema hop; reusing `migrate()` needs a root plus layout parameter | re-anchor (parameterize) or explicitly skip |
| 9 | `setup-workflow` is pure repo scaffold (F12) | Running it locally writes the whole regular setup into the work repo | skip (sister skill replaces it) |
| 10 | CONTEXT.md / ADR reads (F11) | Degraded context only, already worded as "if it exists" | skip, and name the degradation in the run output |
| 11 | Knowledge-artifact writes: harvest, docs pages, changelog, ADRs (F12) | Writes into a work repo, against a non-negotiable | skip and collect; finalize integrates |
| 12 | Tree commits and archive commit (F13) | `git add docs/tasks/` stages nothing; the "commit the move" step is meaningless | skip (the branch merge, CI gate, and push stay) |
| 13 | `finalize-effort`'s archive is an in-tree move plus index rewrite (F13, F1) | Works once re-anchored, but the archive leaves no repo trace, which changes what "archived" means | re-anchor; the spec should state the local archive is local-only |
| 14 | Foreign `docs/tasks` (F10) | Silent takeover of a tree that is not the workflow's | ask; needs a marker, not a directory name |
| 15 | Both setups (F10, F7) | Undetectable today: no local state is read anywhere | re-anchor (local stamp plus repo stamp, both checked) |
| 16 | Non-arc skills reading repo docs (`code-review`, `domain-modeling`, `improve-codebase-architecture`, `tdd`) | They keep working, they just find and write fewer docs; `domain-modeling` would create CONTEXT.md and `docs/adr/` in the work repo | skip and warn; these are outside the core arc and outside the success test |

## Recommendation (decision input for the spec)

Re-anchor one seam, not sixteen call sites. Introduce a single resolved "workflow root" object (repo path when regular, local state dir when local, plus the layout suffix) and route `findRoot`/`taskRoot`, the lockdown, the stamp check, the gate verdict, and the tool descriptions' path strings through it; `state.ts`/`frontmatter.ts` need nothing, `migrate.ts`/`fs-port.ts` need an injected root, and `art.ts` needs either a `docs/tasks`-shaped suffix kept inside the local root or a parameterized parser. Make setup detection three-way (regular stamp, local stamp, neither) in one place, with the "neither" case refusing and naming both initializations; that also gives the both-setups refusal a single home. Explicitly skipping is correct for the whole of `setup-workflow`, for knowledge-artifact writes, and for the tree commits; the branch merge, the CI gate, and the push are repository operations and survive untouched.

## Impact on dependents

- The spec: the table above is its re-anchor, skip and ask list; rows 3, 4, 7 and 14 are the ones it must decide rather than inherit.
- `research-local-state-root`: layout constraints now include "keep effort grouping derivable" (row 3). Keeping a `docs/tasks` suffix inside the state root is the cheapest option and needs no `art.ts` change.
- `design-hook-mechanism`: unaffected by path resolution, but its milestone points coincide with the steps this survey marks "skip" (changelog, harvest) and "keep" (CI gate, merge), so the hook payload should carry the same distinction.
- Test surface: rows 1, 2, 3 and 5 all have pinning tests (`tests/art.test.ts:94-475`, `tests/migrate.test.ts:99`, `tests/opener-gate.test.ts:649-671`, `tests/skills.test.ts`), so the seam has to exist before the behavior moves.

## Open questions

1. Detection that does not write into the work repo: global settings keyed by repo path or git remote, an environment variable, or accepting one `.pi/settings.json` file (F14)? The map's non-negotiable forbids the last without saying so explicitly.
2. Does the write lockdown apply to the local tree? If yes, `isTaskTreePath` must accept a root outside the session cwd; if no, the spec must state that local artifacts have no enforced sole-writer.
3. Should `tw_*` tools refuse in a repo with neither setup, or should `setup-workflow` alone own detection and the tools keep working opportunistically (F5)?
4. What marks a tree as the workflow's own rather than a foreign `docs/tasks` (a stamp file and not a directory name)?
5. After archiving locally, is the effort's record still discoverable in the work repo at all, or is "the repo contains only the work's changes" satisfied by the work's own commit history (row 13)?
6. Do the non-arc skills that read repo docs get the same degradation notice, or is degradation scoped to the arc (row 16)?
