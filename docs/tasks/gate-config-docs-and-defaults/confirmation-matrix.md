# Confirmation matrix — gate-skills-by-repo

> Manual confirmation pass for task `gate-config-docs-and-defaults`. The
> automated tests (`tests/repo-gate.test.ts`, `tests/gate-factory.test.ts`)
> prove the logic; this matrix proves the end-to-end pi session behaviour in
> real repos. **Template** — to be filled in by the user after regenerating
> the NixOS config (see step 1 below) so the global `taskWorkflow.disableOnRepo`
> patterns are live.

## Prerequisite — step 1 (done)

The default `disableOnRepo` patterns were added to the NixOS-managed global
settings at `~/nixos/modules/home-manager/applications/pi/settings.nix`
(`programs.pi-coding-agent.settings.taskWorkflow.disableOnRepo`):

```nix
taskWorkflow.disableOnRepo = [
  "^github\\.com[:/]QNCGmbH/.*$"
  "^bitbucket\\.org[:/]anwaltde/.*$"
];
```

⚠️ **Regenerate the NixOS config** (`home-manager switch` / `nixos-rebuild`)
so `~/.pi/agent/settings.json` picks up the new `taskWorkflow` block, then run
the matrix below. Until regenerated, the gate is not active in real sessions.

## Step 2 — documentation (done)

- `README.md` — added a "Repo gating (auto-disable in work repos)" section
  linking to the full docs.
- `docs/repo-gating.md` — full truth table, detection rules, configuration
  (global `disableOnRepo` + per-project `enable` override), and the verbatim
  `/help` limitation note from
  `docs/tasks/gate-skills-prompt-and-help/limitations.md`.

## Step 3 — manual confirmation matrix (template — fill in after regen)

For each row, start a pi session in the repo and inspect: the tool list
(`pi`'s tool registry), the system prompt's `<available_skills>` block, the
`/help` surface, and the behaviour of `/skill:implement-task`. Record the
observed state and mark confirmed.

| repo | type | expected | observed | confirmed? |
| --- | --- | --- | --- | --- |
| `~/Projects/openai` (QNCGmbH, GitHub) | work | no `task_*` / `notify_user` / `get_guidelines` / `list_guidelines` tools; no six skills in system-prompt `<available_skills>`; `/help` still lists the six (known limitation); `/skill:implement-task` blocked with "gated in this work repo" notify | _ | ☐ |
| `~/Projects/plai-api` (anwaltde, Bitbucket) | work | same as above | _ | ☐ |
| this repo (`~/.pi/agent/git/github.com/Y4shin/skills`) | personal | all six skills advertised in `<available_skills>`; all tools registered; guidelines injection runs; `/skill:implement-task` loads normally | _ | ☐ |
| `disableOnRepo: []` (or key removed) in global settings | disabled | everything loads everywhere (current behaviour) | _ | ☐ |

### How to inspect each cell

- **Tool list:** in a pi session, ask the model to list available tools, or
  check `/help`'s tool section. Look for the absence/presence of `task_show`,
  `task_list`, `notify_user`, `get_guidelines`, `list_guidelines`.
- **System prompt skills:** start a turn and inspect the assembled system
  prompt (pi exposes it via the `context` event / debug). Look for the
  `<available_skills>` block and whether the six task-workflow skill names
  appear in it.
- **`/help`:** run `/help` and check whether the six skills are listed (they
  will be — that's the known limitation; confirm it's only `/help` and not the
  system prompt).
- **`/skill:implement-task`:** run it in a work repo; expect a notify
  "task-workflow is gated in this work repo; not loading implement-task" and
  no skill load. In a personal repo, expect it to load normally.
- **Gate-disabled case:** temporarily remove the `taskWorkflow.disableOnRepo`
  block (or set it to `[]`) in the global settings, regenerate, and confirm
  everything loads in a work repo. **Restore the block afterwards.**

## Remaining risks / follow-up

- The `/help` limitation is permanent for pi 0.80.10; revisit if a future pi
  adds a subtractive skill-list hook.
- The `tests/integration/session.test.ts` harness is broken on this machine
  (`AuthStorage.inMemory` undefined — a version skew in the installed
  `@earendil-works/pi-coding-agent`). This is pre-existing, unrelated to the
  gate, and tracked separately. The gate's own tests
  (`tests/repo-gate.test.ts`, `tests/gate-factory.test.ts`) pass and are the
  gate's acceptance evidence.
