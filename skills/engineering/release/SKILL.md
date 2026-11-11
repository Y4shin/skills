---
name: release
description: Run a release. Bumps the versions the pending changesets name, maintains the root CHANGELOG.md, then follows the repository's own release document. Use when you type the release command and want the versions and the changelog prepared.
disable-model-invocation: true
---

# Release

Every message to the operator follows the `operator-communication`
skill: load it before your first message.

If a `tw_*` tool or the workflow misbehaves, refuses you, or otherwise surprises you, invoke the `workflow-failure` skill before improvising.

A release is a deliberate human act, so this skill runs only when you are
typed. It prepares the release: the version bump and the changelog. It does
not publish anything on its own, and it performs no branch operations.

## 1. Report the plan

Call `tw_release_plan`. It writes nothing: it reports the pending changesets,
the versions they produce, and the changelog section each release adds.

Report the plan to the operator: the entries, the versions, and the section
text, so the release can be reviewed before anything lands.

A refused plan writes nothing either. Report the refusal's reason, as the
tool gave it, and stop: the reason names what to fix.

## 2. Apply on confirmation

Ask the operator to confirm that plan. Only after the operator confirms does
anything get written: call `tw_release_apply`.

The apply recomputes the plan from the tree it writes, so an entry staged
since the preview belongs to the same release. Report the apply's own answer
and never claim that the preview is exactly what landed.

It bumps the manifest, inserts the changelog section, and removes the
consumed changesets, and it writes nothing at all when it refuses. Report
the files it wrote and the files it removed, and stop when it refuses, naming
the same reason the plan would have.

## 3. Follow the repository's release document

The bump and the changelog are this skill's own defaults, and they run every
time. The rest of the release belongs to the repository: when the repository
has a `docs/releasing.md`, read it and follow it, step by step.

That file is the authority for the mechanical work of preparing and
publishing. Where it names a script, a workflow, an approval step, or an
environment, run that, in its order. It is prose, so read it before acting
rather than assuming what a release in this repository involves, and never
replace a step it names with the way another repository does it.

When the repository has no `docs/releasing.md`, there is nothing further to
follow: report the versions and the changelog section that landed, and stop.

## When the repository is not set up for it

Two files are the whole setup, and a repository missing either one gets a
refusal. Report the refusal's reason, as the tool gave it, and stop. Nothing
has been written.

- A `package.json` at the repository root carrying a name and a version. That
  is all it needs: no scripts, no dependencies, no entry point. A manifest
  without a version cannot be bumped, and the refusal names it.
- A `.changeset/config.json`, which is the repository saying it versions
  through changesets. Its absence is not a gap to fill with a built-in
  default: that would version a repository that has no changesets setup at
  all.

Never create the missing file, never run `npx changeset init` on the
operator's behalf, and never bump a manifest the refusal did not name. A
missing `.changeset/config.json` is a hard error, not a default.

## Nothing to release

An empty plan is its own answer, and it is not a failure: the repository has
nothing pending, so nothing moves. Say that plainly, that there is nothing to
release, and stop. No version bump happens, no changelog section is written,
and no changeset file is consumed. The reason names the case when nothing is
pending and the plan is still empty, such as a private package this config
does not version.

Never stage a changeset to make a release possible. Authoring belongs to the
effort close, where `/skill:finalize-effort` proposes the entries for the work
that just landed and writes them once the human confirms. A release that
staged its own entry would version a change nobody described.
