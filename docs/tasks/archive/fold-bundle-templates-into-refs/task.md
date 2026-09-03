---
kind: task
type: feature
slug: fold-bundle-templates-into-refs
title: Fold the bundle templates + verified 17-slot stack into the support-script references
map: portable-skill-authoring
status: done
blocked_by:
- build-skill-creator-skill
slices:
- fold-templates-and-stack
---

## Decision being implemented

The `bundle-script-template` prototype (done; findings at
`docs/tasks/bundle-script-template/findings.md`) answered both of its
questions with evidence: it picked the optimum per-language bundle template
(Python `zipapp`/stdlib; JS/TS "the project's existing bundler, else
`esbuild`") and smoke-tested all 17 grilling-settled default-stack picks at
the floor runtimes (Python 3.10 / Node 20 LTS) — **all 17 pass per language**,
bundled into a self-contained artifact that runs on the bare floor runtime.

The `build-skill-creator-skill` feature task ships the support-script
references with **policy-level bundling guidance + a pointer** in its
`references-support-scripts` slice, deliberately not blocked on the prototype
(that slice's body says: "the concrete bundler/build template comes later
from the `bundle-script-template` prototype, so this task is not blocked on
it"). This follow-up replaces that pointer with the concrete, verified
template + the verified stack table.

## User-visible outcome

A skill authored by `skill-creator` that needs a bundled helper script gets a
concrete, copy-pasteable build template per language (build command, artifact
shape, where the committed artifact lives, the keep-readable-source note) and
a verified default-stack table (17 concern-slots × {Python, JS/TS}) — not a
"pick a bundler" pointer. The references are the single source an agent reads
to bundle a produced skill's helper.

## Scope

In scope:
- `skills/skill-creator/references/support-scripts-python.md` — add the
  concrete **Python bundle template**: the `zipapp` (stdlib) build sequence
  (`uv pip install --target` vendoring → compose the zip root →
  `python -m zipapp -m "pkg.cli:main" -o helper.pyz -c`), the keep-readable-
  source note, the min-version contract (check `sys.version_info`, error with
  "install at least 3.10", agent-must-consult-user-before-installing), and
  the bare-floor run invocation (`python3 helper.pyz`, no venv/`PYTHONPATH`).
  Note `shiv`/`pex` as heavier pip-driven alternatives that were rejected
  (friction: wheel + console-script + fights externally-managed pythons).
- `skills/skill-creator/references/support-scripts-js-ts.md` — add the
  concrete **JS/TS bundle template**: the esbuild programmatic-API build
  (with the conditional `createRequire` banner using a namespace import
  alias to avoid collisions; `external: ["node:*"]`; `--format=esm`),
  the "use the project's existing bundler if it has one (Vite lib-mode in
  this repo, per `scripts/build.ts`); else esbuild" heuristic, the
  keep-readable-`.ts`-source + committed-`.mjs` note, the `.ts`-only-with-a-
  committed-artifact rule, and the min-version contract (check
  `process.versions.node`, error with "install at least Node 20"). Record
  the three API gotchas found by the smoke test (diff-match-patch's class is
  `diff_match_patch`; tinyexec exports `exec`/`x` not `execa`; the
  createRequire-banner collision and its namespace-alias fix).
- Both per-language references: add the **verified 17-slot default-stack
  table** from the findings (the Q7 table, now confirmed by the smoke test),
  with a one-line "verified at the floor (3.10 / Node 20) via the
  `bundle-script-template` prototype" note and a link to the findings doc.
- `skills/skill-creator/references/support-scripts.md` (the shared backbone)
  — if needed, add a one-line note that the per-language files now carry the
  concrete bundle template + verified stack (so the backbone's "the build
  template is provided by the prototype" pointer resolves). No other change
  to the shared backbone.

Out of scope:
- Changing the declared floor (3.10 / Node 20). The floor is a minimum-
  compatibility target, not a recommendation; it stays. (See the findings
  doc's meta-finding: nixpkgs dropped the *packaging* of both, which is a
  test-tooling pin, not a floor change.)
- Re-picking any library slot — all 17 pass at the floor.
- Any change to `SKILL.md`, the Node helper scripts, `package.json`, or
  `tests/` — those are owned by `build-skill-creator-skill` and are done by
  the time this task runs (it's blocked on that task).

## Acceptance criteria

- `support-scripts-python.md` contains the `zipapp` build template (the
  3-step sequence above) and the verified Python stack table; the template
  is copy-pasteable and self-contained (no "pick a bundler" deferral).
- `support-scripts-js-ts.md` contains the esbuild/Vite template (with the
  conditional createRequire banner + namespace-alias fix), the
  "existing-bundler-else-esbuild" heuristic, the `.ts`-only-with-committed-
  `.mjs` rule, the three API gotchas, and the verified JS/TS stack table.
- Both tables link the findings doc as the verification evidence.
- The shared `support-scripts.md` backbone is consistent with the per-
  language files (no stale "template comes later from the prototype" pointer).
- `npm test` stays green (this task edits only reference markdown; no test
  assertions change, but the suite must not regress).

## Existing abstractions to use

- `docs/tasks/bundle-script-template/findings.md` — the source of truth for
  the templates, the verified pass/fail table, the API gotchas, and the
  floor-test devenv nixpkgs-pin note.
- `docs/tasks/support-script-conventions/task.md` — the Q7 table (the picks)
  and the Q-version-floor settlement (3.10 / Node 20 + min-version
  contract).
- The `build-skill-creator-skill` slice `references-support-scripts` output
  (the reference files this task edits into) — this task is blocked on it.
- The repo's `scripts/build.ts` as the existing-bundler precedent for the
  JS/TS "use the project's existing bundler" heuristic.

## Architecture / domain decisions

- **Single-sourcing.** The template + verified table live in the per-language
  reference files only; `SKILL.md` keeps its policy-level pointer to
  "references/support-scripts-*.md for the concrete bundle template." The
  shared backbone (`support-scripts.md`) does not repeat the template.
- **Evidence-backed.** Every row of the stack table is verified by the
  prototype (pass at the floor); the findings doc is the citation. No row
  is asserted without the smoke-test evidence.
- **Floor is a target, not a recommendation.** The references target 3.10 /
  Node 20 as the minimum and state the min-version contract; they do not
  *recommend* those versions (non-normative "prefer the current LTS where
  you control the runtime" guidance is allowed). The nixpkgs-packaging-drop
  is a test-tooling pin carried by the follow-up that sets up the references'
  own floor-test devenv (if any), not by this task.

## Implementation notes

### Slice 1: fold-templates-and-stack

Folded the concrete bundle templates + verified 17-slot stack tables + API
gotchas from the `bundle-script-template` findings into the two per-language
reference files and resolved the stale "template comes later" pointer in the
shared backbone.

- `skills/skill-creator/references/support-scripts-python.md` (+77/-12):
  added the `zipapp` 3-step build sequence (vendor via
  `uv pip install --python "$(command -v python3)" --target` to pin the floor
  3.10 → compose zip root → `python -m zipapp -m "pkg.cli:main" -o helper.pyz
  -c`), the keep-readable-source note, the min-version contract
  (`sys.version_info` check + "install at least 3.10" + agent-consults-user
  remark), the bare-floor run invocation, the `shiv`/`pex` rejected-with-
  friction-reason note, and the verified 17-slot Python stack table (Q7
  Python column; 18 rows with the 13a/13b split) with the "verified at Python
  3.10 via the `bundle-script-template` prototype" note + findings link.
- `skills/skill-creator/references/support-scripts-js-ts.md` (+127/-12):
  added the esbuild programmatic-API build (conditional `createRequire`
  banner via a `import * as _nodeModule from "node:module"` namespace import
  alias to avoid the collision; `external: ["node:"]`; `format: "esm"`), the
  "existing-bundler-else-esbuild" heuristic (citing `scripts/build.ts` as the
  Vite precedent in this repo), the `.ts`-only-with-committed-`.mjs` rule, the
  min-version contract (`process.versions.node` check + "install at least Node
  20"), the keep-readable-source note, the three API gotchas
  (`diff_match_patch` lowercase class; `tinyexec` `exec`/`x` not `execa`;
  `createRequire` collision + namespace-alias fix), and the verified 17-slot
  JS/TS stack table (Q7 JS/TS column; 18 rows) with the same verification note
  + findings link.
- `skills/skill-creator/references/support-scripts.md` (+4/-7): resolved the
  stale "template comes later from the prototype" / "fold-bundle-templates-
  into-refs folds the verified template" pointer to instead point at the
  per-language files ("the concrete build recipe is now folded into
  `support-scripts-python.md` and `support-scripts-js-ts.md` — each carries
  the verified bundle template + the verified 17-slot stack table for its
  language").

No floor change (still Python 3.10 / Node 20 LTS — a minimum-compatibility
target, not a recommendation). No library re-pick (all 17 pass at the floor).
No `SKILL.md`, script, `package.json`, or test changes — only the three
reference markdown files. Deviation report recorded zero deviations from the
spec. Full suite 602/602 green, typecheck clean, validate-dogfood PASS.
