---
type: map
title: Loosen repo gating to task-workflow resources only
status: stable
ready_for_spec: true
---
# Loosen repo gating to task-workflow resources only

## Destination

In a work repo (gate active), only the task workflow is gone: the 10
workflow-family skills are stripped and their `/skill:` invocations
blocked, the mutating `tw_*` tools are not registered, and the docs/tasks
write lockdown does not fire. Everything else the package ships (all
generic engineering and productivity skills, skill-creator's full tool path
through the restricted tw_open, notify_user, tw_feedback, and the
subagents) loads and behaves as in an ungated repo. The classification
config (`taskWorkflow.disableOnRepo`, per-repo `taskWorkflow.enable`) is
untouched in shape and meaning.

## Constraints

- The gate's repo-classification contract stays unchanged: global
  `disableOnRepo` regexes and per-repo `taskWorkflow.enable` keep their truth
  table from docs/repo-gating.md.
- skill-creator's nested-phase clause uses `tw_open`/`tw_close` (user's note,
  confirmed by intake code reach). A kept skill must not be kept in name only.
- The docs/tasks write lockdown is a task-workflow concern: it is enabled
  exactly when the workflow is enabled in that repo (user's decision).
- pi exposes no hook to hide resources from `/help`; that limitation is
  inherited, not fixed here.
- Passive tools that stay in a gated repo get restricted parameters rather
  than full behaviour (user's steering of Q2).

## Non-goals

- Changing how a repo is classified as a work repo: `disableOnRepo` patterns
  and the per-repo `taskWorkflow.enable` override keep their current shape
  and truth table.
- Dropping repo gating entirely, or shipping a static keep-list mechanism
  (intake boundary answer).
- Rewording the generic skills' headers around workflow-failure: the header
  rule is accepted as inert prose in gated repos (all 10 workflow skills
  gate off, per the revised Q7).
- Hiding the package's resources from `/help`: pi offers no hook; the
  existing documented limitation just narrows to the gated set.
- Making any `skill_*` tool default-active, or giving tw_open a heuristic
  keep-list of passable commands; the restriction is on its skill names
  only.
- Reorganising the skills taxonomy or moving efforts.

## Non-negotiable facts

**Success test:** in a gated work repo, the model sees none of the 10
workflow-family skills and no mutating `tw_*` tool, the docs/tasks write
lockdown does not fire, and every non-gated skill, skill-creator's full
disclosure path (via the restricted tw_open), `tw_feedback`, `notify_user`,
and the subagents load and are invocable; in an ungated repo, nothing
visibly changes from today.

- The gate today over-strips: `loadGatedSkillNames()` (src/pi.ts:84)
  derives the strip list from ALL 31 package.json pi.skills basenames,
  with a stale hardcoded fallback of 8 names missing task-workflow-doctor
  (tool-use-inventory).
- All extension tools register `defaultActive: false`; only the tw_open
  disclosure activates their toolsets (src/pi.ts:3664-3667). Passive
  keeping therefore means registering `tw_open`/`tw_close`/`tw_feedback`
  and restricting tw_open's skill parameter to non-gated registry entries
  (verified while settling Q6: the skill_* tools are behind tw_open today).
- `tw_feedback` is load-bearing beyond the workflow: 10 of 11 agents under
  ./agents allowlist it, and pi-subagents fails a child whose allowlisted
  tool is unavailable (pi.ts:3749-3752; asserted by this package, not yet
  verified against pi-subagents source).
- skill-creator degrades, never fails, without its script tools: each has
  an explicit by-hand fallback (SKILL.md:321-338); with the restricted
  tw_open kept, it needs no fallback in practice.
- Both the write lockdown registration and `notify_user` sit inside the
  ungated branch today (src/pi.ts:3685, 3689); the gated/ungated split must
  re-place them deliberately.

## Decisions so far

- non-negotiables: the gate narrows to the task workflow. In a work repo,
  the mutating `tw_*` tools stay gated, `notify_user` stays registered, the
  docs/tasks write lockdown follows the workflow switch, and the repo
  classification config stays unchanged.
- tool-use-inventory, plus the operator's revised Q5/Q7: the workflow family
  that gates off is the full set of 10 skills (task-workflow-overview,
  setup-workflow, intake, wayfinder, to-spec, to-tickets, implement-ticket,
  finalize-effort, task-workflow-doctor, workflow-failure). The generic
  skills' header rule referencing workflow-failure becomes deliberately
  inert prose in gated repos.
- tool-use-inventory: the passive tool set in a gated repo is `tw_open`,
  `tw_close`, and `tw_feedback`. All three are justified by evidence:
  `tw_open`/`tw_close` give skill-creator's nested-phase clause its
  disclosure path; `tw_feedback` is allowlisted by 10 of 11 shipped
  subagents and is the only specific `tw_*` call any staying skill
  instructs. Every other `tw_*` tool stays unregistered.
- tool-use-inventory, operator's revised Q6: `tw_open` in a gated repo keeps
  its tool signature but is restricted to non-gated registry entries
  (currently only skill-creator): either the parameter enum is narrowed when
  the gate is active, or gated skill names are refused at runtime with the
  notify shape of gateSkillInvocation. No `skill_*` tool becomes
  default-active; they flow through tw_open as today.
- tool-use-inventory: the gated-skill list stops being a derived artefact.
  A static manifest of the 10 names (next to SKILL_REGISTRY in
  disclosure.ts) replaces loadGatedSkillNames' all-of-pi.skills derivation,
  pinned by a consistency test against package.json pi.skills and
  SKILL_REGISTRY. The stale 8-name fallback goes with it.
- tool-use-inventory: the write lockdown's registration condition changes
  from `!gate.active` to "the workflow is enabled in this repo", since the
  two conditions diverge once passive tools register in gated repos.

## Fog
