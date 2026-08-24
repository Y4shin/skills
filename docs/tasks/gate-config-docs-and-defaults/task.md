---
kind: task
type: manual
slug: gate-config-docs-and-defaults
title: Ship default disableOnRepo patterns, document the gate, and run the manual confirmation matrix
map: gate-skills-by-repo
status: ready
blocked_by: []
---

# gate-config-docs-and-defaults — manual

## Exact prerequisite

Three concrete, mostly-human steps that finish the gate after the code is
proven:

1. **Ship the default `disableOnRepo` patterns** into the user's global
   `~/.pi/agent/settings.json` (the config home confirmed by
   `gate-config-mechanics`), so the gate is active by default in the two
   known work orgs with no hand-editing.
2. **Document the gate** in the repo's `README.md` (and/or a short
   `docs/task-workflow-gating.md`): what it does, the two config keys
   (`disableOnRepo` global, `enable` per-project override), the truth table,
   the detection rules (normalized `provider/org/repo`), and **any documented
   limitation** handed over by `gate-skills-prompt-and-help` (e.g. "the six
   skills still appear on `/help` in a work repo because pi 0.80.10 exposes
   no hook to suppress them there").
3. **Run the manual confirmation matrix** in the real example repos — the
   automated tests prove logic; this pass proves the end-to-end pi session
   behaviour in real repos.

## Owner / actor

- Steps 1–2: the implementer (this session / a subagent), editing the user's
  global settings and the repo's docs.
- Step 3: the implementer, by starting pi in each repo and inspecting the
  tool list, system prompt, `/help`, and `/skill:implement-task` behaviour.
  The user may be asked to confirm the visible result.

## Checklist / safe automation boundary

- **Do not** write into any **work** repo. The gate's whole point is
  zero work-repo config. The only files touched are this repo's docs and the
  user's **global** `~/.pi/agent/settings.json`.
- **Do not** commit the user's global settings file to this repo. It's
  outside the repo. The default patterns are added to the user's existing
  settings; a backup copy is made first.
- **Do not** mark this task done until all three steps are complete and
  the confirmation matrix is recorded in the task result.

## Evidence required to mark it done

A `confirmation-matrix.md` in the task directory recording, for each of the
four cases below, the observed state (tool list sample, system-prompt
skills-XML sample, `/help` sample, `/skill:implement-task` behaviour):

| repo | type | expected | confirmed? |
| --- | --- | --- | --- |
| `~/Projects/openai` (QNCGmbH, GitHub) | work | no `task_*`/`notify_user`/guidelines tools; no skills in prompt; `/help` per limitation note; `/skill:implement-task` blocked or warned | ☐ |
| `~/Projects/plai-api` (anwaltde, Bitbucket) | work | same as above | ☐ |
| this repo (`Y4shin/skills`) | personal | all six skills advertised; all tools registered; guidelines injection runs; `/skill:implement-task` loads normally | ☐ |
| `disableOnRepo: []` (or key removed) in global settings | disabled | everything loads everywhere (current behaviour) | ☐ |

Plus:
- A diff/snippet of the added `taskWorkflow.disableOnRepo` block in
  `~/.pi/agent/settings.json`.
- A link to the updated `README.md` / docs section.
- Any limitation notes from `gate-skills-prompt-and-help` reproduced in the
  docs verbatim.

## Dependent tasks that remain blocked

None downstream — this is the map's terminal task. When it's done, the map
is finalizable (all children done). It is blocked on the two feature tasks
being complete so the docs describe the *actual* shipped behaviour (including
limitations), not a hoped-for one.
