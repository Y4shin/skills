---
"@y4shin/pi-task-workflow": minor
---

The workflow's git habits are configuration now, not code. Three keys under
`taskWorkflow.git` decide them, read from `.pi/settings.json` with
`~/.pi/agent/settings.json` honoured underneath, and the built-in defaults last.

- `profile` selects a bundled profile. `default` is what a repository that
  configures nothing gets; `flat` requires no branch anywhere, blocks no spawn,
  and lands nothing, for a repository that keeps the habits it already has or for
  a directory that is not a git checkout at all.
- `trunk` names the branch an effort branch is created off and landed into,
  with `{"develop": false, "main": "main"}` as the default and a develop branch
  named by setting `develop` to it.
- `trunkMerge` is `local` or `handoff`. `local` merges into the trunk on your
  machine and deletes the effort branch; `handoff` pushes the effort branch and
  prints the pull request for you to open instead.

A profile is a flat JSON file carrying, per phase, an optional branch template,
optional opening and closing instructions, and an optional closing gate, plus a
merge flag and a push policy of `always` or `never`, and per implementation
sub-agent an optional branch template. Templates use `{effort}` and `{ticket}`.

`tw_phase_brief` answers what a phase needs before it opens: the resolved
branch, the step that creates it, and the instruction text. An unknown profile
name, a malformed profile file, or a wrong-typed setting is a diagnostic carried
in the brief, never a crash. No profile name appears in a branch of code, so the
two bundled profiles are selected by a settings key alone.
