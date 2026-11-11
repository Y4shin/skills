# release

## What it does

`release` prepares a release, and it never publishes one on its own. Typing
`/skill:release` is the consent: the skill is user-invoked, so no model
decision starts a release.

It always runs the same defaults. It previews the pending changesets with
`tw_release_plan` and reports the plan (the entries, the versions they
produce, and the changelog section each release adds). Only after you confirm
that plan does it call `tw_release_apply`, which bumps the manifest, inserts
the section into the root `CHANGELOG.md`, and removes the consumed entries.

The rest of the release belongs to your repository. When the repository has a
`docs/releasing.md`, the skill reads it and follows it, step by step, as the
authority for the mechanical work of preparing and publishing. When there is
no such document, the release ends at the defaults it just applied.

Two outcomes stop it without a write. A repository with no `package.json`
carrying a name and a version, or with no `.changeset/config.json`, gets a
refusal naming which one is missing. An empty plan is reported as nothing to
release, with no version bump and no entry staged to force one. Authoring
entries belongs to `/skill:finalize-effort`.

The skill performs no branch operations. Branching is the git profile's
business, described in [`docs/git-workflows.md`](../git-workflows.md).

## When to reach for it

You reach for it when you are ready to cut a version: the work has landed,
the changesets for it are staged, and the release is a deliberate act rather
than something a model decides mid-run. In a repository that releases with
changesets, `/skill:release` does the version bump and the changelog, then
defers to your own release document for everything else.

## Common questions

**Why can't the model start a release?**
A release is a deliberate human act, and the tag, the approval, or the
publish step is usually the point past which nothing is cheap to undo. The
skill carries `disable-model-invocation`, so it runs only when it is typed.

**What if the repository has no `docs/releasing.md`?**
The defaults are the whole release: the version bump and the changelog
section. The skill reports them and stops. A repository whose release work
lives somewhere else can say so in that file, in prose.

**What if there is nothing pending?**
The skill reports that there is nothing to release and stops, with no version
bump. It never stages a changeset to make a release possible: the entries for
the work that just landed are authored at the effort close.

**Does it bump the version the preview showed?**
The apply recomputes the plan from the tree it writes, so an entry staged
since the preview is part of the same release. The skill reports the apply's
own answer rather than claiming the preview is exactly what landed.

**Does it touch branches, tags, or the registry?**
Only what your release document says. The skill runs no branch operation and
publishes nothing itself.

## It's working if

- You typed `/skill:release` and saw the pending entries, the versions they
  produce, and the changelog section before anything was written.
- The bump, the `CHANGELOG.md` section, and the removal of the consumed
  changesets happened only after you confirmed the plan.
- Your `docs/releasing.md` steps ran after the defaults, in the order that
  file gives them.
- A repository missing the manifest or the changeset config was refused with
  a reason, and a version with nothing pending was reported, not bumped.
