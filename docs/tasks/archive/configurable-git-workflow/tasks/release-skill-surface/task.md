---
type: task
subtype: grilling
title: Settle the release skill's surface, defaults, and how a repo declares its own steps
status: deprecated
workflow_state: done
blocked_by: []
---

## Decision to settle

What the release skill is, what it does by default, and how a repository's
`docs/releasing.md` extends the default without replacing it.

## Settled already

- The defaults run every time: a version bump from the pending changesets, and
  maintenance of a `CHANGELOG.md` at the repo root.
- `docs/releasing.md` steps run on top of the defaults, for the mechanical work
  of preparing and staging package releases.
- This package's own pipeline (`scripts/release.sh`, the tag-triggered workflow,
  the 2FA approval) keeps its shape; the skill defers to those files.

## Choices still open

1. **Name and invocation.** `release` as a user-invoked skill (the human types
   it, which suits a release being a deliberate act), a model-invoked skill, or
   a mode of `finalize-effort`. If it is promoted, it needs the entries in the
   manifest, both READMEs, and a docs page.
2. **The version bump target** in a repo with no obvious manifest: the nearest
   `package.json`, a key the repo declares, or refuse and ask.
3. **The default `CHANGELOG.md` shape**: newest first, one section per version
   with the changeset bodies as bullets, and whether an unreleased section is
   kept.
4. **How `docs/releasing.md` declares steps.** Prose the agent reads and follows,
   or a convention with a machine-readable part (a fenced command list, a named
   section). The operator's wording suggests prose with the skill adapting.
5. **The boundary between the skill and this package's own `scripts/release.sh`.**
   The skill must not reimplement the local and remote halves here, but must
   still work in a repo that has no such script.
6. **What the skill does when no changesets are pending**, given
   `changeset-contract` may allow a release with none.

## Recommended starting answer

A user-invoked `release` skill in the engineering bucket, promoted, so a release
stays a deliberate human act. It always: collects pending changesets, bumps the
version in the manifest it finds (nearest `package.json`, else the path the repo
declares, else it asks), and rewrites the root `CHANGELOG.md` newest first. Then
it follows `docs/releasing.md` when present, step by step, treating that file as
the authority for the mechanical release work. When nothing is pending, it says
so and stops without a bump.

## Downstream

The spec's release section, and the promoted-set wiring once the skill exists.

## Notes

## Round settled (operator's answers)

- **Name and reach**: `release`, a promoted, user-invoked skill. The model cannot
  start a release on its own.
- **A repo with no manifest**: refuse and state that the defaults need a
  `package.json` with a name and a version. Confirmed sufficient by the prototype:
  a manifest carrying only `name` and `version` at the repo root is enough, with no
  scripts, dependencies, or entry point, and the repo also needs
  `.changeset/config.json`.
- **`docs/releasing.md`**: prose the agent reads and follows, as this repo's file
  already is. No machine-readable block.

## Consequences recorded

The skill always runs the defaults (version bump through the changesets libraries,
root `CHANGELOG.md`), then follows `docs/releasing.md` when present. It owns
nothing about branches. It reports an empty release plan as a named outcome, and
it treats a missing `.changeset/config.json` as a hard error.
