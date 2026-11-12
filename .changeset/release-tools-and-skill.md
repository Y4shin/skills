---
"@y4shin/pi-task-workflow": minor
---

Add the `release` skill and the two tools it runs on. `/skill:release` is
user-invoked, like every deliberate act, and it prepares a release rather than
performing one: it reports the pending changesets, the versions they produce,
and the changelog section each one adds, then writes the version bump and the
root `CHANGELOG.md` only after the operator confirms. It performs no branch
operation and publishes nothing, and it follows the repository's own
`docs/releasing.md` for whatever comes after.

- `tw_release_plan` writes nothing. It reports the pending entries, the versions
  they produce, and the section text, so a plan can be reviewed before it lands,
  and a refused plan writes nothing either.
- `tw_release_apply` recomputes the plan from the tree it writes, so an entry
  staged since the preview belongs to the same release. It bumps the manifest,
  inserts the changelog section, and removes the consumed entries, and it writes
  nothing at all when it refuses.

An empty plan is its own answer: nothing is pending, so nothing moves, and that
is reported rather than worked around. The skill never stages a changeset to
make a release possible, because authoring belongs to the effort close and a
release that staged its own entry would version a change nobody described.
