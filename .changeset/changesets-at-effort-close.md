---
"@y4shin/pi-task-workflow": minor
---

The effort close authors changesets, so a release consumes entries the work
already described. `tw_write_changesets` takes the entries as a list of package,
level, and summary, reports the proposal, and writes nothing until the human
confirms; the close then writes one file per change a user of the package can
observe, in the `@changesets/cli` format, under `.changeset/` at the workspace
root.

The write is validated before anything lands: the package name must exist in the
workspace, the level must be `patch`, `minor`, or `major`, and `.changeset/config.json`
must be present and parse. A staging directory that cannot be read refuses the
write rather than being treated as empty, so a caller cannot produce a duplicate
generic entry beside an unreadable one, and duplicate entries in a single call
collapse.

The seam wraps the changesets library set rather than the command line tool,
because importing `@changesets/cli` runs its CLI and exits the process. Every
failure is a named refusal with its own legal next call, and a refusal leaves
the working tree as it found it.
