# Repo gating (auto-disable in work repos)

`task-workflow` is a **global** pi package, so by default it would load in every
repo, including work repos where it doesn't belong (the work repo has its own
canon; the `tw_*` tools write to a `docs/tasks/` tree the work repo doesn't
use). The gate auto-disables
all of the package's resources in work repos based on the repo's `git origin`
remote, with **zero per-repo config** required to get the default behaviour:
the patterns live on the global/personal side, and any individual repo can
override them locally.

## What gets gated in a work repo

- **No tools register:** none of the `tw_*` tools, and none of `notify_user`.
  The model never sees them.
- **The six skills are stripped from the system prompt's `<available_skills>`**
  block, so the model doesn't auto-invoke them.
- **Explicit `/skill:<name>` is blocked** for the six: an `input` event handler
  returns `{action:"handled"}` and notifies "task-workflow is gated in this work
  repo; not loading <name>". (Non-task-workflow skills like `/skill:oracle` are
  unaffected.)

In a personal repo, everything works exactly as today.

## Write lockdown on docs/tasks (personal repos)

In a personal repo (gate inactive), where the `tw_*` tools are the writers of
the `docs/tasks/` tree, a `tool_call` event handler refuses the built-in
`write` and `edit` on any path under `docs/tasks/**`. The named `tw_*` tools
are the only writers of the tree.

- **Relative and absolute paths both match.** Relative paths resolve against
  the session cwd, absolute paths are taken as given; both are normalized
  before the containment check, so `..` traversal cannot slip past and a
  sibling directory such as `docs/tasks-archive` does not match.
- **Independent of the active tool set.** The guard is a hook, not a declared
  tool, so it blocks in every phase, including while a skill's toolset is open.
- **`docs/bugs/**` is not guarded.** The bug substrate retires in schema 5;
  the guard scope is `docs/tasks/**` only.
- **Reading stays allowed.** `read` and `bash` can read the tree freely, and
  the human's editor is unaffected.
- **No `bash` command-string scan exists.** A command string cannot be gated
  soundly, so the previous heuristic idea was dropped rather than kept; every
  mutating operation that needs `bash` (the archive move, the `git mv`, the
  changelog write) belongs in a `tw_*` tool instead.

**Residual risk, accepted and documented:** a model that insists can still
mutate the tree through `bash` (`rm`, `git`, `python -c`, and so on), because
a command string cannot be gated soundly. The protection is that no
legitimate path needs the shell on the tree, not that the shell is blocked.

## Known limitation

pi 0.80.10 exposes **no** extension hook to suppress skills from the `/help` /
skill-list surface (that surface reads from the loaded skill set, and
`resources_discover` is additive-only). So the six task-workflow skills **still
appear on `/help` in a work repo**. The gate covers the system prompt only.
Explicit `/skill:<name>` is prevented via the `input` event (see above).

## Configuration

Two layers, both read by the extension at startup (it reads the files itself;
pi gives extensions no `SettingsManager`). They have **different jobs**: the
global side lists which remotes are work repos; a repo can override that verdict
locally. `enable` means exactly what it says.

- **Global** (`~/.pi/agent/settings.json`, or `PI_CODING_AGENT_DIR`): a top-level
  `taskWorkflow.disableOnRepo` array of regex strings tested against the
  normalized `provider/org/repo` remote. Empty / absent → gate disabled
  (current behaviour; everything loads everywhere). A global `enable` key is
  **ignored**; the global side configures patterns, not a default switch.

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
  `taskWorkflow.enable` (bool). It is **authoritative and means what it says**:

  - `true` → the package is forced **on** for this repo, patterns ignored.
  - `false` → the package is forced **off** for this repo, patterns ignored.
  - absent → fall back to `disableOnRepo` (match gates the repo, no-match loads
    it).

  So a repo that a global pattern marks as work can opt back in with
  `enable: true`, and a personal repo can opt out with `enable: false`. Both
  files are read; unknown top-level keys survive (the `Settings` parser does not
  strip them).

### Truth table

`active = (local enable === true) ? false : (local enable === false) ? true : (disableOnRepo matches this repo's normalized origin)`

| local `enable` | `disableOnRepo` matches? | gate active? | meaning |
| --- | --- | --- | --- |
| `true` | any | **no** | forced on locally |
| `false` | any | **yes** | forced off locally |
| absent | yes | **yes** | work repo, auto-gated (primary case) |
| absent | no | **no** | personal repo, auto-loaded |
| absent | (empty/absent patterns) | **no** | gate disabled globally, current behaviour |

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
