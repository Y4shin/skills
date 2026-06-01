# prd-workflow tooling

This repo hosts the `prd-workflow` Claude Code plugin (under [plugins/prd-workflow/](plugins/prd-workflow/))
plus the build environment for its bundled Python helper.

## `prd-tool`

`prd-tool` walks a consuming repo's `docs/prd/` tree and queries/mutates the YAML
frontmatter of its planning artifacts (epics + PRDs), implementing the operations
the skills rely on: resolving slugs/issue numbers to files, asserting an artifact's
`kind` before slicing, filling issue numbers and slice lists, ticking an epic's
child PRDs, the `finalize-*` lifecycle gates, and linting the tree for
non-conforming frontmatter (`list-bad-files` / `show-violations`, used by the
`adopt-prd` skill to backfill legacy PRDs, epics, and slice docs). See [references/artifacts.md](plugins/prd-workflow/references/artifacts.md)
for the schema.

The plugin ships it as **one** self-contained zipapp: `plugins/prd-workflow/scripts/prd_tool.pyz`.

## Development

```sh
nix develop            # python 3.13 + uv devshell
uv run prd-tool-build  # bundle src/prd_tool + deps → plugins/prd-workflow/scripts/prd_tool.pyz
```

Source lives in [src/prd_tool/](src/prd_tool/); the bundler is the `prd-tool-build`
console script ([src/prd_tool/_build.py](src/prd_tool/_build.py)); the bundled `.pyz`
is the build output.
