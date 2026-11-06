# Repo gating (auto-disable the workflow in work repos)

`task-workflow` is a **global** pi package, so by default it would load in every
repo, including work repos where the workflow doesn't belong (the work repo has
its own canon; the `tw_*` writers produce a `docs/tasks/` tree the work repo
doesn't use). The gate disables the workflow in work repos based on the repo's
`git origin` remote, with **zero per-repo config** required to get the default
behaviour: the patterns live on the global/personal side, and any individual
repo can override them locally.

The gate is a *narrowing*, not a full switch-off. In a gated repo a small
passive surface stays registered (the opener, the closer, the feedback
wrapper, `notify_user`, and skill-creator's bundled script tools), and the one
non-workflow discipline, `skill-creator`, stays openable. Everything that
writes the planning tree stays unregistered. In a personal repo, the full
surface works exactly as today.

## What gets gated in a work repo

- **Tool registration splits by gate state.** A gated repo registers exactly
  the passive `tw_*` set (`tw_open`, `tw_close`, `tw_feedback`), plus
  skill-creator's bundled script tools (`skill_validate`, `skill_scaffold`,
  `skill_discover`, registered inactive exactly as in an ungated repo), plus
  `notify_user` (generic: it reads only the user's ntfy config). Every other
  `tw_*` tool, including all writers and the dispatcher companions `tw_next`
  and `tw_request_tool`, stays unregistered: the model never sees them. An
  ungated repo registers the full surface.
- **The ten workflow skills are stripped from the system prompt's
  `<available_skills>` block**, so the model doesn't auto-invoke them. The
  strip list is a static manifest of ten names: `task-workflow-overview`,
  `setup-workflow`, `intake`, `wayfinder`, `to-spec`, `to-tickets`,
  `implement-ticket`, `finalize-effort`, `task-workflow-doctor`,
  `workflow-failure`. `skill-creator` is not in the manifest and stays
  visible.
- **Explicit `/skill:<gated-name>` is blocked** for the ten manifest names: an
  `input` event handler returns `{action:"handled"}` and notifies
  "task-workflow is gated in this work repo; not loading <name>".
  (Non-gated skills like `/skill:oracle` or `/skill:skill-creator` are
  unaffected.)
- **`tw_open` is restricted to non-gated registry entries.** In a gated repo
  the opener's `skill` parameter offers only the registry entries whose names
  are outside the manifest (today exactly `skill-creator`), and a manifest
  name is refused at runtime in the opener's own refused-outcome shape
  (reason plus legal next calls) with the same warning notify family. The
  refusal covers the **whole manifest**, including the three names that have
  no registry entry (`task-workflow-overview`, `task-workflow-doctor`,
  `workflow-failure`), so a workflow skill does not open in a work repo
  whatever its phase gate would say about the tree. `tw_close` needs no
  restriction: closing what never opened is already a handled refusal.
- **No `skill_*` tool is default-active.** The three script tools register
  inactive in both gate states and activate only through the disclosure: the
  restricted `tw_open` is the activation path for skill-creator's toolset in
  a gated repo exactly as the unrestricted opener is in a personal one.

## What stays available in a work repo

- **`skill-creator` opens and works.** Open it with `tw_open skill-creator`;
  the open activates the bundled tools plus the shared reads, matching the
  ungated experience. This is deliberate: the authoring discipline is
  workflow-independent, and a kept skill that could not activate its tools
  would be kept in name only.
- **`notify_user` stays registered** in both gate states.
- **Reading stays allowed everywhere**: `read` and `bash` can read any tree,
  and the human's editor is unaffected.
- **Session start still reports**: the gate diagnostics notify in both gate
  states, and so do the peer-extension checks (pi-subagents, pi-telemetry),
  which matter in a gated repo too (the shipped subagents launch there and
  their allowlists name `tw_feedback`, which registers there).

## Subagent launch behaviour (verified against the pi-subagents source)

The shipped subagents list `tw_feedback` (and `submit_feedback`) in their
`tools` allowlist, and `tw_feedback` registers in gated repos exactly for that
reason. What happens when a listed tool is unavailable is stated from
pi-subagents 0.34.0's own source, and confirmed against pi's `--tools`
handling:

- **pi-subagents performs no launch-time check of the allowlist.** The
  extension passes the agent's `tools` list to the child as pi's `--tools`
  argument and spawns; nothing in the launch path (foreground or background
  runner) refuses a child whose listed tool never registers.
- **A child still launches when a listed tool is missing.** pi silently
  ignores allowlisted names that never register: only registered tools enter
  the child's registry, and unknown names in `--tools` produce no error and
  no warning.
- **The cost is the feedback row, not the launch.** Without pi-telemetry a
  child's `tw_feedback` call fails at call time ("the workflow feedback was
  not recorded ... pi-telemetry is not installed"), so workflow feedback from
  children is lost; the chain itself still runs.

The session-start warning when pi-telemetry is missing states exactly this
shape: the child still launches, the allowlist is not checked at launch, and
each child's feedback call fails.

## Write lockdown on docs/tasks (wherever the workflow is enabled)

Wherever the task workflow is enabled in a repo (today that coincides with
the gate being inactive, but the lockdown keys on its own
"workflow enabled" condition, not on the gate branch), a `tool_call` event
handler refuses the built-in `write` and `edit` on any path under
`docs/tasks/**`. The named `tw_*` tools are the only writers of the tree.

- **Relative and absolute paths both match.** Relative paths resolve against
  the session cwd, absolute paths are taken as given; both are normalized
  before the containment check, so `..` traversal cannot slip past and a
  sibling directory such as `docs/tasks-archive` does not match.
- **Independent of the active tool set.** The guard is a hook, not a declared
  tool, so it blocks in every phase, including while a skill's toolset is open.
- **Two segments are exempt: `.work/` and `deviation-reports/`.** They sit
  beside an artifact rather than being artifacts (neither is an artifact
  leaf), and two shipped procedures write them: the tdd-worker's uncertainty
  stop (`.work/uncertainty.md`) and the deviation reporter
  (`deviation-reports/<slug>.md`). A refusal still names the exemption and
  the named tool that would have worked, so a model that hits the guard can
  reroute.
- **`docs/bugs/**` is not guarded.** The bug substrate retires in schema 5;
  the guard scope is `docs/tasks/**` only.
- **Reading stays allowed.** `read` and `bash` can read the tree freely, and
  the human's editor is unaffected.
- **No `bash` command-string scan exists.** A command string cannot be gated
  soundly, so the previous heuristic idea was dropped rather than kept; every
  mutating operation that needs `bash` (the archive move, the `git mv`, the
  changelog write) belongs in a `tw_*` tool instead.
- **The ticket doc's implementation notes have a named writer.**
  `tw_write_ticket_note` replaces or appends the `## Implementation notes`
  section of a live-effort ticket, so a landing note needs no `edit` on the
  tree. The landing worker reports the note and the phase that owns the tool
  writes it, so the write never depends on a child session loading this
  extension: an allowlisted tool name does not load extension code.

**Residual risk, accepted and documented:** a model that insists can still
mutate the tree through `bash` (`rm`, `git`, `python -c`, and so on), because
a command string cannot be gated soundly. The protection is that no
legitimate path needs the shell on the tree, not that the shell is blocked.

The lockdown never fires in a gated repo (the workflow is not enabled there,
and the writers are not registered anyway); it fires only where the workflow
runs.

## Known limitation

pi exposes **no** extension hook to suppress skills from the `/help` /
skill-list surface (that surface reads from the loaded skill set, and
`resources_discover` is additive-only). So the **ten gated workflow skills
still appear on `/help` in a work repo**; the gap is scoped to them, and
`skill-creator` (which is not stripped) appears as it does anywhere. The gate
covers the system prompt only. Explicit `/skill:<name>` for a gated name is
prevented via the `input` event (see above).

Two smaller rough edges are known and accepted in a gated repo:

- An **unknown non-manifest skill name** passed to `tw_open` still errors with
  the full registry list (all eight entries), which reveals the workflow skill
  names on that hallucinated-name path. The schema never offers them; only a
  fabricated name reaches the error.
- `tw_close`'s idle hint ("open a phase with tw_open") is imprecise in a gated
  repo, where only `skill-creator` opens; the message predates the narrowing
  and is shared with the ungated shape.

## Configuration

**The classification contract is unchanged by the narrowing**: the
`disableOnRepo` regex list, the per-repo `taskWorkflow.enable` boolean
override, normalization, and the truth table below keep their shape and
semantics. What changed is what a match disables (the workflow, not the whole
package), not when the gate fires.

Two layers, both read by the extension at startup (it reads the files itself;
pi gives extensions no `SettingsManager`). They have **different jobs**: the
global side lists which remotes are work repos; a repo can override that
verdict locally. `enable` means exactly what it says.

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

Design and decisions: `docs/tasks/archive/gate-skills-by-repo/map.md` (the
original gate) and `docs/tasks/selective-repo-disable/architecture.md` (the
narrowing). The research that grounded the implementation lives under the
archived effort: `tasks/gate-config-mechanics/findings.md` records that pi's
`Settings` schema keeps unknown top-level keys, the extension factory gets no
`SettingsManager` and reads the files itself, and the `before_agent_start`
result can rewrite the full system prompt; `tasks/gate-skills-prompt-and-help/slices/archive/`
holds the skills-XML format (`<available_skills>` with `<skill><name>` children), the
absence of a subtractive `/help` hook, the `/help` limitation note, and the
`input` event's ability to prevent `/skill:` expansion.
