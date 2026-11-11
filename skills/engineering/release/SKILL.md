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

A refused plan writes nothing either. Report the refusal's reason and stop;
the reason names which of the three it is, a missing manifest, a missing
`.changeset/config.json`, or a pending entry the release cannot read.

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
