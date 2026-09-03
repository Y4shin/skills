# Repo gating (auto-disable in work repos)

`task-workflow` is a **global** pi package, so by default it would load in every
repo, including work repos where it doesn't belong (the work repo has its own
canon; the `task_*` tools write to a `docs/tasks/` tree the work repo doesn't
use; the injected guidelines clutter the system prompt). The gate auto-disables
all of the package's resources in work repos based on the repo's `git origin`
remote, with **zero per-repo config**, the gate lives on the global/personal
side.

## What gets gated in a work repo

- **No tools register:** none of the `task_*` tools, and none of `notify_user`,
  `get_guidelines`, `list_guidelines`. The model never sees them.
- **No `before_agent_start` injection:** the guidelines / "Use
  `list_guidelines()`" preamble is not appended to the system prompt.
- **The six skills are stripped from the system prompt's `<available_skills>`**
  block, so the model doesn't auto-invoke them.
- **Explicit `/skill:<name>` is blocked** for the six: an `input` event handler
  returns `{action:"handled"}` and notifies "task-workflow is gated in this work
  repo; not loading <name>". (Non-task-workflow skills like `/skill:oracle` are
  unaffected.)

In a personal repo, everything works exactly as today.

## Known limitation

pi 0.80.10 exposes **no** extension hook to suppress skills from the `/help` /
skill-list surface (that surface reads from the loaded skill set, and
`resources_discover` is additive-only). So the six task-workflow skills **still
appear on `/help` in a work repo**. The gate covers the system prompt only.
Explicit `/skill:<name>` is prevented via the `input` event (see above).

## Configuration

Two layers, both read by the extension at startup (it reads the files itself;
pi gives extensions no `SettingsManager`):

- **Global** (`~/.pi/agent/settings.json`, or `PI_CODING_AGENT_DIR`): a top-level
  `taskWorkflow.disableOnRepo` array of regex strings tested against the
  normalized `provider/org/repo` remote. Empty / absent → gate disabled
  (current behaviour; everything loads everywhere).

  ```jsonc
  {
    "taskWorkflow": {
      "disableOnRepo": [
        "^github\\.com[:/]QNCGmbH/.*$",
        "^bitbucket\\.org[:/]anwaltde/.*$"
      ]
    }
  }
  ```

- **Per-project override** (`<repo>/.pi/settings.json`): a top-level
  `taskWorkflow.enable` (bool, default `true`). A repo matching a
  `disableOnRepo` pattern can set `enable: false` to re-enable the package
  locally; a non-matching repo can set `enable: false` to opt out (quiet personal
  repo). Both files are read; pi deep-merges project over global, and unknown
  top-level keys survive (the `Settings` parser does not strip them).

### Truth table

`active = (disableOnRepo matches this repo's normalized origin) AND (project.taskWorkflow.enable is not false)`

| `disableOnRepo` matches? | `project.taskWorkflow.enable` | gate active? | meaning |
| --- | --- | --- | --- |
| no | `true` / absent | **no** | personal, load everything |
| no | `false` | **yes** | personal repo opting out (escape hatch) |
| yes | `true` / absent | **yes** | work repo, gate everything (primary case) |
| yes | `false` | **no** | work-org repo re-enabled locally |
| empty / absent | * | **no** | gate disabled globally, current behaviour |

## Detection rules

The gate reads the repo's `origin` remote (walking up from `process.cwd()` to
`.git`, reading `.git/config`; falls back to `git remote get-url origin` for
gitfile-style `.git`), normalizes it to `provider/org/repo`, and tests it
against the regexes. Normalization:

- strips `scheme://` and `user@`;
- collapses the host/path `:` to `/` (so SSH `git@github.com:QNCGmbH/x.git`
  and HTTPS `https://github.com/QNCGmbH/x.git` produce the same string);
- strips a trailing `.git`;
- lowercases the host.

A repo with **no** `origin` remote (or no `.git`) is treated as personal, the
gate opt-ins on the remote, not on the absence of one. Invalid regexes in
`disableOnRepo` are skipped with a diagnostic (the extension never throws at
load; it fails open to personal on any detection error).

## Background

Design and decisions: `docs/tasks/maps/gate-skills-by-repo/map.md`. Research
findings that grounded the implementation:

- `docs/tasks/gate-config-mechanics/findings.md`, pi's `Settings` schema keeps
  unknown top-level keys; the extension factory gets no `SettingsManager` and
  reads the files itself; the `before_agent_start` result can rewrite the full
  system prompt.
- `docs/tasks/gate-skills-prompt-and-help/findings.md`, the real skills-XML
  format (`<available_skills>` with `<skill><name>` children); no subtractive
  `/help` hook; the `input` event can prevent `/skill:` expansion.
- `docs/tasks/gate-skills-prompt-and-help/limitations.md`, the `/help`
  limitation note.
