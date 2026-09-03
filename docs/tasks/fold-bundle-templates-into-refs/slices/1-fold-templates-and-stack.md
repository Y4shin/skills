---
kind: slice
slug: fold-templates-and-stack
title: Fold the bundle templates + verified stack into support-scripts-python.md and support-scripts-js-ts.md
task: ../task.md
mode: afk
status: todo
size: m
blocked_by: []
---

## End-to-end behavior

The two per-language support-script references
(`skills/skill-creator/references/support-scripts-python.md` and
`-js-ts.md`) gain the concrete, copy-pasteable bundle template and the
verified 17-slot default-stack table, replacing the policy-level "template
comes later from the prototype" pointer that the `references-support-scripts`
slice of `build-skill-creator-skill` leaves. An agent reading either
reference can then bundle a produced skill's helper script end-to-end
without consulting the prototype's findings doc.

## Acceptance criteria

- `support-scripts-python.md` has a "Bundle template (Python)" section with
  the `zipapp` 3-step build sequence (vendor via `uv pip install --target` →
  compose zip root → `python -m zipapp -m "pkg.cli:main" -o helper.pyz -c`),
  the keep-readable-source note, the min-version contract
  (`sys.version_info` check + "install at least 3.10" + agent-consults-user
  remark), and the bare-floor run invocation. `shiv`/`pex` noted as
  rejected heavier alternatives with the friction reason.
- `support-scripts-python.md` has the verified 17-slot Python stack table
  (the Q7 Python column) with a "verified at Python 3.10 via the
  `bundle-script-template` prototype" note + link to the findings doc.
- `support-scripts-js-ts.md` has a "Bundle template (JS/TS)" section with
  the esbuild programmatic-API build (conditional `createRequire` banner
  via namespace import alias to avoid collisions; `external: ["node:*"]`;
  `--format=esm`), the "existing-bundler-else-esbuild" heuristic (citing
  `scripts/build.ts` as the Vite precedent in this repo), the `.ts`-only-
  with-committed-`.mjs` rule, the min-version contract, and the three API
  gotchas (diff-match-patch's `diff_match_patch` class; tinyexec's
  `exec`/`x` exports; the createRequire-banner collision + namespace-alias
  fix).
- `support-scripts-js-ts.md` has the verified 17-slot JS/TS stack table
  (the Q7 JS/TS column) with the same verification note + findings link.
- The shared `support-scripts.md` backbone no longer carries a stale
  "template comes later from the prototype" pointer (it's resolved); it
  points to the per-language files for the concrete template.
- `npm test` is green (reference-markdown-only change; no test assertions
  change, but the suite must pass).

## Test plan

Seams:
- The reference files are markdown; the "test" is structural + link
  integrity, not runtime. The repo's `tests/skills.test.ts` structure
  checks are the regression seam.

Failure modes:
- A stale pointer in the shared backbone contradicts the per-language
  files (reader confusion).
- A stack-table row drifts from the Q7 picks or the findings' verified
  results (misinformation).
- The esbuild template's banner snippet, if copied verbatim, has the
  collision bug (must use the namespace-alias form).
- The Python template, if copied verbatim, uses `uv venv --python python3`
  without the absolute-path pin (resolves uv's managed newer CPython
  instead of the floor 3.10) — the template must use
  `--python "$(command -v python3)"` or equivalent.

Scenarios:
- An agent reads `support-scripts-python.md` alone and bundles a Python
  helper with one third-party dep into a `.pyz` that runs on bare 3.10.
- An agent reads `support-scripts-js-ts.md` alone and bundles a TS helper
  with a CJS dep into a `.mjs` that runs on bare Node 20, using the
  namespace-alias banner.
- Both tables' row counts = 17 and match the Q7 picks exactly.

Edge cases:
- A produced skill whose target repo already has a bundler (Vite/webpack):
  the JS/TS reference's heuristic steers to the existing bundler, not esbuild.
- A produced skill with only ESM-native deps: the JS/TS template's banner
  is conditional (omit `createRequire` when no CJS deps).

## Constraints and dependencies

- Blocked on `build-skill-creator-skill` (its `references-support-scripts`
  slice creates the files this slice edits).
- Source of truth: `docs/tasks/bundle-script-template/findings.md` +
  `docs/tasks/support-script-conventions/task.md` (Q7 table).
- No change to the declared floor (3.10 / Node 20); no re-pick of any slot.
- Edits only the three reference markdown files; no `SKILL.md`, script,
  `package.json`, or test changes.
