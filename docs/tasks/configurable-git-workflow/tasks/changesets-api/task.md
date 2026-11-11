---
type: task
subtype: research
title: Establish whether changesets can be driven programmatically without the CLI installed
status: stable
workflow_state: done
blocked_by: []
---

## Question

Can the changesets functionality be used programmatically from this extension, so
the package writes and consumes `.changeset/` files without requiring the user to
install or invoke `@changesets/cli`?

The operator's direction: pull changesets into this package as a dependency,
drive it from our own tools, stay strictly file-compatible with the CLI, and keep
working when the user has no CLI installed.

## What to establish, with evidence

1. Which packages expose importable APIs: `changesets`,
   `@changesets/cli`, and the scoped helpers such as `@changesets/parse`,
   `@changesets/read`, `@changesets/write`, `@changesets/config`,
   `@changesets/assemble-release-plan`, `@changesets/apply-release-plan`. Cite
   the versions and whether each is documented as public.
2. Their runtime shape: ESM or CJS, Node version floor, synchronous or
   promise-based, and whether they operate on a cwd or accept explicit paths and
   config objects.
3. What minimum a repo must provide: `.changeset/config.json`, a package
   manifest, a package name, and what the defaults are for a single-package repo
   with no changeset config at all.
4. Dependency weight and licensing, and how a Pi extension would carry them: a
   normal dependency in `package.json`, or bundled the way this extension ships
   today.
5. The failure modes: a repo with no git metadata, a monorepo, a package name
   that does not match the changeset frontmatter, and a malformed entry.
6. The fallback, if the APIs turn out to be internal or awkward: implementing the
   subset ourselves (parse and write the frontmatter, apply a version bump,
   assemble a changelog). Say how much of the CLI behaviour that leaves out.

## Decision this unblocks

`release-skill-surface`. The release skill's "bump versions and maintain a root
`CHANGELOG.md`" default depends on whether it can call a library or has to
implement the mechanics.

## Output

An evidence note in this task's `## Notes` with the recommendation and its
confidence, pinned to the versions checked, plus an explicit statement of whether
a `prototype` task is needed to validate the chosen path.

## Notes

## Findings (packages pinned: @changesets/cli 3.0.3 devDependency; libraries at the versions below)

- **`@changesets/cli` is not importable as a library.** Its entry point runs the
  CLI at module scope: it parses `process.argv` and calls `process.exit`.
  Importing it from the extension would parse Pi's arguments and kill the
  process. Its one safe subpath, `@changesets/cli/changelog`, is a two-line
  re-export of `@changesets/changelog-git`.
- **The libraries are public and path-explicit.** Verified signatures:
  `parseChangesetFile(contents)` (sync, throws on malformed input),
  `readChangesets(rootDir, sinceRef?)`, `writeChangeset(cs, rootDir, {format})`
  (returns the generated slug), `readConfig(cwd?, packages?)`,
  `assembleReleasePlan(changesets, packages, config, preState, snapshot?)` (sync),
  `applyReleasePlan(plan, packages, config?, snapshot?, contextDir?)`. All MIT,
  all ESM with a Node floor of `^22.11 || ^24 || >=26`, which the Pi harness floor
  (`>=22.19`) satisfies. `@manypkg/get-packages` 3.1.0 supplies the `Packages`
  object, and in v3 its keys are `rootPackage` and `rootDir`.
- **Driving the libraries reproduces `changeset version`**, because the CLI's own
  version command is exactly that sequence over the same functions. File
  compatibility is structural, not aspirational.
- **Extension packaging**: the libraries must be runtime `dependencies`, not
  devDependencies, because consumers do not install devDependencies; bundling is
  hostile to `apply-release-plan`, which resolves the configured changelog module
  and preserves `package.json` formatting through `jsonc-parser` edits. Library
  set weight is about 1.48 MB on disk.
- **Pi's loader imports them cleanly**: jiti imports `@changesets/read` and
  `@changesets/write` and returns their named exports.
- **Minimum a repo must provide**: a `package.json` with a `name` reachable
  upwards (a missing manifest or name throws), and a `.changeset/config.json`
  (a missing directory or file throws). A manifest with no `version` does not
  throw: `assembleReleasePlan` silently returns an empty plan, as it does for a
  `private` package under the default config. Both are silent no-ops that leave
  the changeset file in place, so the consumer must treat an empty plan as a
  refusal, not as success.
- **Formatting side effects**: with `format: "auto"` (the default, and absent
  from this repo's config) both `writeChangeset` and `applyReleasePlan` run a
  formatter subprocess when the repo has one configured. `format: false` skips
  it.
- **Monorepos are handled** by the libraries; linked and fixed groups, dependent
  range rewrites, ignore lists, prerelease state, and per-package changelog
  styles all come from them.
- **Repo drift noticed**: `.changeset/config.json` pins the `@changesets/config`
  3.1.4 schema while 4.0.1 is current, and it omits `format`.

## Recommendation

Depend on the libraries, not the CLI: `@changesets/config` 4.0.1,
`@changesets/read` 1.0.1, `@changesets/write` 1.0.1, `@changesets/parse` 1.0.0,
`@changesets/assemble-release-plan` 7.0.0, `@changesets/apply-release-plan`
8.1.1, and `@manypkg/get-packages` 3.1.0, with `@changesets/cli` staying a
devDependency. Author through `writeChangeset` with `format: false` and validate
the package name against `getPackages` first. Consume through `getPackages` →
`readConfig` → `readChangesets` → `assembleReleasePlan` → `applyReleasePlan`.
Refuse when `.changeset/config.json` is absent rather than inventing one, and
treat an empty release plan as a refusal.

Confidence: high on the API shape, the ESM and Node constraints, the path and
config arguments, the CLI-not-importable finding, and the file-compatibility
argument. Medium on the changelog-specifier remap producing byte-identical output
everywhere, because that was verified by reading, not by running both paths.

## Unresolved

1. Whether to remap `"@changesets/cli/changelog"` to `@changesets/changelog-git`
   when building the config (keeps the CLI out of runtime deps) or add the CLI as
   a runtime dependency purely for resolution.
2. Whether to adopt `@changesets/get-release-plan` 5.0.2 as one call instead of
   the four-call composition. It also reads prerelease state.
3. Whether to force `format: false` or honour `"auto"`.
4. How a repo with no manifest is handled, which belongs to
   `release-skill-surface`.
5. Node 23 and 25 users hit an engine warning; decide whether to gate with a
   message.

## Verdict

A small wiring prototype is warranted, not a feasibility spike. Feasibility is
established. What is unproven by reading is end-to-end behaviour inside a Pi tool:
identical output versus a real `changeset version` run, a round trip the CLI
accepts, `format: false` avoiding subprocesses, the empty-plan refusal, and the
missing-`.changeset` path. Created as `changesets-wiring-prototype`.
