# prd-workflow tooling

This repo hosts the `prd-workflow` plugin for **two** agent harnesses, both driven
by a single TypeScript implementation of the `prd-tool` CLI:

- **Claude Code** — [plugins/prd-workflow/](plugins/prd-workflow/): 15 skills whose
  <code>!\`…\`</code> injections call the bundled CLI.
- **opencode** — [plugins/prd-workflow-opencode/](plugins/prd-workflow-opencode/): a
  ready-to-copy `.opencode/` overlay — 14 operational steps as `/…` commands, the
  `prd-workflow-overview` orientation doc as an auto-invokable **skill**, and a plugin
  that registers the agent operations as native `prd_*` tools. Generated from the same
  `SKILL.md` sources.

The workflow itself is unchanged: epic → PRD → vertical-slice issues → TDD implement →
finalize, with a knowledge harvest, across GitHub (`gh`), Forgejo/Codeberg (native REST
client), or a built-in local tracker for repos without a remote.

## `prd-tool` (single TypeScript source)

`prd-tool` walks a consuming repo's `docs/prd/` tree and queries/mutates the YAML
frontmatter of its planning artifacts (epics + PRDs): resolving slugs/issue numbers to
files, asserting an artifact's `kind` before slicing, filling issue numbers and slice
lists, ticking an epic's child PRDs, the `finalize-*` lifecycle gates, linting the tree
(`list-bad-files` / `show-violations`, used by `adopt-prd`), and emitting the
provider-correct issue/PR command snippets (`forge <key>`). See
[references/artifacts.md](plugins/prd-workflow/references/artifacts.md) for the schema.

Source lives in [src/](src/):

```
src/core/      frontmatter, model, validate, workflow, forge, forgejo, tracker, reference
src/cli.ts     the CLI (every subcommand; exact stdout shapes + exit codes)
src/plugin.ts  the opencode plugin (native prd_* tools, reusing the CLI in-process)
```

The build ([build.mjs](build.mjs), esbuild) emits two self-contained bundles and
distributes them:

| Output | Used by |
|---|---|
| `dist/prd-tool.js` → `plugins/prd-workflow/scripts/prd-tool.js` and the opencode overlay's `scripts/` | the <code>!\`…\`</code> header injections in both plugins |
| `dist/plugin.js` → the opencode overlay's `plugin/prd-workflow.js` | the native `prd_*` tools (opencode, model-invoked) |

Both bundles are runtime-agnostic (`#!/usr/bin/env node`; `bun` works too). The
opencode command files are regenerated from each `SKILL.md` (path/handoff rewrites +
a native-tools note), so the `SKILL.md` files stay the single source of truth.

## Issue tracker providers (git host **or** non-git)

`forge` detects how the consuming repo tracks issues/PRs from its `origin` remote (a
`.prdrc` `[forge]` section can override), and emits the matching command snippet:

| Provider | Selected when | Drives |
|---|---|---|
| `gh` | `origin` is GitHub | the `gh` CLI |
| `fgj` | `origin` is Forgejo / Codeberg / Gitea | the bundled native REST client (`prd-tool forgejo …`) |
| `local` | **no recognised git host** | the built-in local tracker (`docs/prd/tracker.json`) |

The `local` provider makes the workflow usable on non-git projects, using the same
flat model (epic = milestone; everything else via `blocked_by` dependencies) and the
same branch workflow without remotes/PRs.

## Project profile (`docs/prd/profile.md`)

The skills/commands are project-agnostic; anything specific to *your* repo lives in an
optional `docs/prd/profile.md` (`prd-tool profile` prints it, and each skill injects it
at runtime). See [examples/profile.md](plugins/prd-workflow/examples/profile.md) for a
worked example. With no profile the skills degrade gracefully.

## Development

```sh
nix develop   # node 20 (or use your own node ≥ 18)
npm install
npm run build # esbuild → dist/*.js, copied into both plugins + opencode overlay regenerated
npm test      # vitest (ports the former pytest suite)
npm run typecheck
```

The shipped artifacts are committed: `plugins/prd-workflow/scripts/prd-tool.js` and the
[plugins/prd-workflow-opencode/](plugins/prd-workflow-opencode/) overlay.
