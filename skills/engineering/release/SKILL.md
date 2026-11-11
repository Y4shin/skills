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
not publish anything on its own.
