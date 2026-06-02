# prd-workflow tooling

This repo hosts the `prd-workflow` Claude Code plugin (under [plugins/prd-workflow/](plugins/prd-workflow/))
plus the build environment for its bundled Python helper.

## `prd-tool`

`prd-tool` walks a consuming repo's `docs/prd/` tree and queries/mutates the YAML
frontmatter of its planning artifacts (epics + PRDs), implementing the operations
the skills rely on: resolving slugs/issue numbers to files, asserting an artifact's
`kind` before slicing, filling issue numbers and slice lists, ticking an epic's
child PRDs, the `finalize-*` lifecycle gates, linting the tree for
non-conforming frontmatter (`list-bad-files` / `show-violations`, used by the
`adopt-prd` skill to backfill legacy PRDs, epics, and slice docs), and emitting
the provider-correct issue/PR command snippets (`forge <key>`). See
[references/artifacts.md](plugins/prd-workflow/references/artifacts.md) for the schema.

The plugin ships it as **one** self-contained zipapp: `plugins/prd-workflow/scripts/prd_tool.pyz`.

## Issue tracker providers (git host **or** non-git)

`forge` detects how the consuming repo tracks issues and PRs from its `origin` remote,
and emits the matching command snippet for each operation the skills perform:

| Provider | Selected when | Drives |
|---|---|---|
| `gh` | `origin` is GitHub | the `gh` CLI |
| `fgj` | `origin` is Forgejo / Codeberg / Gitea | the `fgj` CLI |
| `local` | **no recognised git host** — no `origin`, or not a git repo at all | the built-in local tracker |

The **`local`** provider makes the workflow usable on **non-git projects**. Instead of a
git host, issues/PRDs/epics live in a single JSON ledger at `docs/prd/tracker.json`, managed
by the bundled `prd-tool tracker` subcommands (`create`, `view`, `list`, `comment`, `close`,
`edit`, `dep`, `attach`/`detach`). The same flat model applies — epic→child via parent links,
everything else via `blocked_by` dependencies — so `*-prd-to-issues`, `analyse-issue`,
`implement-issue`, and `finalize-*` all work unchanged. There are no branches or PRs on a
non-git project: `implement-issue` writes directly to the working tree and records completion
on the issue. (A *non-empty but unrecognised* remote stays an error — `forge` prints
`UNKNOWN_FORGE` rather than guessing at an unknown host's CLI.)

## Project profile (`docs/prd/profile.md`)

The skills are written to be **project-agnostic**. Anything specific to *your* repo —
its one-line description, the docs to read for orientation, what a "vertical slice" vs
an "enabling slice" means here, your test types + run commands, the CI command, your
code conventions, and where durable knowledge gets folded on finalize — lives in a
single optional file in the consuming repo: **`docs/prd/profile.md`**.

`prd-tool profile` prints that file's contents, and each skill injects it at runtime
(alongside the `reference` and `list` injections) so the agent gets your project's
context without anything being hardcoded into the skills. Well-known sections the
skills reference by name:

| Section | Used by |
|---|---|
| `## Project` | grill-me, create-* |
| `## Orientation docs` | grill-me, create-*, analyse-issue, implement-issue |
| `## Architecture layers` | create-feature-prd, create-capability-prd, *-prd-to-issues, adopt-prd, epic-to-prds |
| `## Test infrastructure` | analyse-issue, implement-issue |
| `## CI` | implement-issue |
| `## Code conventions` | implement-issue |
| `## Knowledge destinations` | finalize-prd, finalize-epic |

The profile is **optional**: with no `docs/prd/profile.md`, `prd-tool profile` emits
nothing and the skills degrade gracefully — they still work, they just explore the
codebase for project-specific context instead of reading it from the profile.

See [plugins/prd-workflow/examples/profile.md](plugins/prd-workflow/examples/profile.md)
for a complete worked example; copy it to `docs/prd/profile.md` in your repo and edit.

## Development

```sh
nix develop            # python 3.13 + uv devshell
uv run prd-tool-build  # bundle src/prd_tool + deps → plugins/prd-workflow/scripts/prd_tool.pyz
```

Source lives in [src/prd_tool/](src/prd_tool/); the bundler is the `prd-tool-build`
console script ([src/prd_tool/_build.py](src/prd_tool/_build.py)); the bundled `.pyz`
is the build output.
