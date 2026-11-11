---
type: task
subtype: prototype
title: Prototype the changesets library wiring and diff it against a real changeset version run
status: stable
workflow_state: done
blocked_by: []
---

## Question

Does the library path produce output a real `@changesets/cli` run would accept and
match, when driven from inside a Pi extension's tool, against a scratch copy of a
real repo?

`changesets-api` established feasibility: the libraries are public, ESM, and
path-explicit, and `@changesets/cli` cannot be imported because it runs its CLI at
module scope. This task proves the behaviour.

## Alternatives to compare

1. The library composition (`writeChangeset`, `readChangesets`, `readConfig`,
   `assembleReleasePlan`, `applyReleasePlan`) driven from a tool.
2. The same composition but handing the config a remapped changelog specifier
   (`"@changesets/cli/changelog"` to `@changesets/changelog-git`) so the CLI is
   not a runtime dependency.
3. A real `changeset version` run as the control, in the same scratch repo.

## The smallest artifact

A throwaway script or scratch extension run against a scratch copy of this repo
(or a minimal fixture repo) that:

1. authors one changeset through `writeChangeset` with `format: false`;
2. reads it back through `readChangesets` and confirms the shape the CLI parses;
3. assembles and applies a release plan, producing a version bump and a
   `CHANGELOG.md` section;
4. diffs the result against a real `changeset version` run on an identical copy;
5. exercises the failure paths: no `.changeset/`, a manifest with no `version`,
   a `private` package, a malformed entry, and a name that is not in the
   workspace;
6. confirms `format: false` starts no formatter subprocess.

Throwaway code is deleted afterwards. Do not turn it into production code.

## Who must react

The operator, on the diff result and on whether the remapped changelog specifier
is acceptable.

## Decision it unblocks

`release-skill-surface`, plus the spec's release mechanics and the dependency set
the package declares.

## Evidence to record

The scratch repo layout, the exact commands and imports, the diff against the
control run, and each failure path's observed error or silent no-op.

## Notes

## Result: the library path is safe to build on

Six fixture pairs were run, each comparing the library composition against a real
`changeset version` run. Every pair came out byte-identical: `package.json` version
and key order (edits go through `jsonc-parser`), `CHANGELOG.md` placement across
four shapes (titled, untitled, empty, prose-only), the `- <sha>: ` prefix only when
the changeset file is committed, and the changeset file removed in both. Failure
messages are the CLI's own strings. `writeChangeset` output round-trips through
`parseChangesetFile` for single-line, multi-line, and scoped package names.
`changeset version` never prompted, with or without `CI=1`.

## Runtime details the design must pin rather than inherit

1. **Changelog resolution.** `config.changelog[0]` from a repo's
   `.changeset/config.json` is almost always `"@changesets/cli/changelog"`, which
   only resolves if the CLI is reachable from the directory passed as
   `contextDir`. Passing the extension's own directory without the CLI installed
   throws `ERR_MODULE_NOT_FOUND` before anything is written. Two working fixes,
   both producing identical output: pass the changelog specifier as
   `import.meta.resolve("@changesets/changelog-git")` (a `file://` URL, no
   `contextDir` needed), or remap the specifier to `@changesets/changelog-git` and
   pass a context directory that has it. The raw specifier must never be passed
   unchanged from a user's config file.
2. **Formatting.** `config.format` from a file that omits the key is `"auto"`,
   which spawns `npx prettier` (or oxfmt, dprint, deno) in any repo with a
   formatter config. A formatter that exits non-zero after `applyReleasePlan`
   starts writing leaves a half-applied tree: `package.json` and `CHANGELOG.md`
   written, changeset file not removed. Force `format: false`, verified to spawn
   nothing.
3. **Silent no-ops.** A `package.json` without a `version`, and a `private`
   package under `privatePackages.version: false`, both produce an empty plan,
   write nothing, and keep the changeset file, exactly as the CLI does. Report
   "versioned" only when the plan has releases, and treat an empty plan as a
   named outcome.
4. **Missing `.changeset/config.json`.** `readConfig` throws `ENOENT`. Falling
   back to `defaultConfig` silently versions a repo that has no Changesets setup
   at all, where the CLI exits 1. Treat it as a hard error.
5. **`applyReleasePlan` always deletes the changeset file.** A path that needs to
   keep the file cannot use it unchanged.
6. Errors arrive as plain `Error` with `code` (`ERR_MODULE_NOT_FOUND`, `ENOENT`)
   or a message string, not as CLI exit codes.

## Artifact

Fixtures and evidence remain at `/tmp/changesets-wiring-prototype` (`runs/`,
`failures/`, `fmt/`, `edge/`, `roundtrip/`, `out/`, plus a README). Nothing outside
`/tmp` was created or deleted, and the fixture is disposable.
