---
type: spec
title: Loosen repo gating to task-workflow resources only
status: stable
---

## Problem Statement

This package installs globally and loads in every repository. To keep the
task workflow out of organisation-managed work repos, the extension gates
itself off there (configured by `taskWorkflow.disableOnRepo` patterns and
the per-repo `taskWorkflow.enable` override, documented in
`docs/repo-gating.md`).

Today's gate bans the package almost completely: no `tw_*` tools and no
`notify_user` register, and every skill the package ships is stripped from
the system prompt and blocked from `/skill:` invocation. The derivation
behind it (`loadGatedSkillNames()`) takes the names of all 31 shipped
skills on its happy path, with a hardcoded fallback of 8 names that is
already stale (it omits `task-workflow-doctor`).

The operator uses many of those skills outside the task workflow:
`skill-creator`, `operator-communication`, `code-review`, `tdd`, and the
rest of the generic engineering and productivity set are valuable in work
repos too. With the all-or-nothing gate, every one of them is unavailable
there, even though they write nothing into the workflow's `docs/tasks/`
tree and need none of its machinery beyond small, passive pieces.

## Solution

Narrow the gate to the task workflow. In a work repo, the 10
workflow-family skills are stripped and blocked, the mutating `tw_*` tools
never register, and the `docs/tasks` write lockdown does not fire.
Everything else the package ships stays: all generic engineering and
productivity skills, skill-creator in full (its skill plus its three
bundled tools `skill_validate`, `skill_scaffold`, `skill_discover`,
reached through a restricted `tw_open`), `tw_feedback`, `notify_user`,
and the shipped subagents. The passive tool set is exactly `tw_open`,
`tw_close`, and `tw_feedback`, with `tw_open` refusing the workflow
skills' names. The repo-classification configuration is untouched: a repo
that was gated stays gated, only the meaning of "off" narrows. In a
personal repo, nothing visibly changes from today.

## User Stories

1. As the operator working in a work repo, I want the 10 workflow-family
   skills stripped from the prompt, so that the model stops routing to a
   workflow the repo does not use.
2. As the operator working in a work repo, I want explicit
   `/skill:<workflow-skill>` invocations blocked with a clear notice, so
   that I get an honest refusal instead of a half-loaded phase.
3. As the operator working in a work repo, I want no mutating `tw_*` tool to
   register, so that nothing in the package can write into a `docs/tasks/`
   tree there.
4. As the operator working in a work repo, I want the `docs/tasks` write
   lockdown to not fire, so that its refusal text (which names `tw_*`
   tools as the only tree writers) never appears as a contradiction in a
   repo where the tree is someone else's.
5. As the operator working in a work repo, I want every generic skill
   (skill-creator, skill-review, tdd, code-review, code-review's peers in
   engineering, and all productivity skills) available and invocable, so
   that I keep the package's generic value where I do most of my work.
6. As the operator using skill-creator in a work repo, I want its nested
   disclosure path (`tw_open` opening skill-creator's toolset, including
   `skill_validate`, `skill_scaffold`, `skill_discover`) to work, so that
   the skill is fully functional rather than falling back to by-hand
   script invocation.
7. As the operator using skill-creator in a work repo, I want `tw_open` to
   refuse any workflow-skill name with the same notify-and-refuse shape as
   the existing skill strip, so that the acceptance surface of the passive
   tool is sealed against the gated set.
8. As the operator dispatching the shipped subagents (such as
   `skill-reviewer` or `code-reviewer`) in a work repo, I want `tw_feedback`
   registered, so that their `tools:` allowlists resolve and the children
   do not fail at launch.
9. As the operator using workflow escalation patterns, I want `tw_feedback`
   registered, so that the instructed feedback call in any remaining
   workflow-minded context still has a target.
10. As the operator in a work repo, I want `notify_user` registered, so
    that long-running work can still notify me through my ntfy setup.
11. As the operator, I want the existing configuration
    (`taskWorkflow.disableOnRepo` and per-repo `taskWorkflow.enable`) to
    keep working unchanged, so that no repo's classification setting needs
    migration.
12. As the operator in a personal repo, I want no visible change, so that
    this effort cannot regress the daily workflow.
13. As the maintainer of the package, I want the gated-skill list to be a
    static manifest pinned by a consistency test against `package.json`'s
    `pi.skills` and the skill registry, so that adding or renaming a skill
    cannot silently widen or narrow the strip again (the all-31-stripping
    derivation and the stale 8-name fallback both did that).
14. As a downstream user of the package, I want the gating documentation in
    `docs/repo-gating.md` to describe the narrowed behaviour, so that I can
    reason about what my work repo will and will not see.

## Implementation Decisions

- **Gated skill set is a static manifest of 10 names**: task-workflow-
  overview, setup-workflow, intake, wayfinder, to-spec, to-tickets,
  implement-ticket, finalize-effort, task-workflow-doctor, workflow-failure.
  The manifest lives next to the skill registry it mirrors. It replaces
  `loadGatedSkillNames()`, whose all-basenames derivation and stale
  hardcoded fallback both disappear. The generic skills' one-line
  workflow-failure header rule becomes accepted inert prose in gated
  repos; no header rewording anywhere.
- **Tool registration splits by the gate**: in a gated repo, only
  `tw_open`, `tw_close`, and `tw_feedback` register from the `tw_*` set,
  plus `notify_user` (which moves out of today's ungated-only branch; it
  is generic and reads only the user's ntfy config). Every other `tw_*`
  tool, including all writers and the dispatcher companions `tw_next` and
  `tw_request_tool`, stays unregistered. In an ungated repo the full set
  registers as today.
- **skill-creator's bundled tools also register in gated repos**:
  `skill_validate`, `skill_scaffold`, and `skill_discover` are generic,
  workflow-independent, and the only tools a kept skill's disclosure
  activates. They register as today (inactive), so the restricted
  `tw_open` can disclose skill-creator's toolset to the model in a gated
  repo. Without this, the disclosure path would find nothing to activate,
  which is exactly the "kept in name only" failure the non-negotiable
  facts forbid.
- **`tw_open` is restricted in gated repos to non-gated registry entries**:
  its `skill` parameter accepts only registry entries whose names are not
  in the gated manifest (currently exactly `skill-creator`); asking for a
  gated name is refused at runtime with a notify answer in the shape of
  the existing skill-invocation gate. The restriction lives inside
  `tw_open`'s own gate; enumerated narrowing of the parameter schema is
  preferred so the model never even sees a hopeless value, with the
  runtime refusal as the belt next to the suspenders. `tw_close` needs no
  restriction (closing what does not open is already a handled refusal).
  No `skill_*` tool becomes default-active; they activate through the
  disclosure exactly as today. The disclosure's open-set derivation must
  be verified to stay sound when only `skill-creator`'s toolset can ever
  be active.
- **The write lockdown registers on 'workflow enabled', not
  'gate inactive'**: today the guard hooks register inside the
  gate-inactive branch, which coincides with the workflow being on. Once
  passive tools register in gated repos the two conditions diverge, so
  the guard gets its own explicit condition tied to the workflow being
  enabled in that repo. Refusal texts and exemptions are unchanged.
- **Session-start behavior in gated repos**: the skill-strip and
  `/skill:`-invocation block hooks keep firing (strips now cover only the
  manifest's 10). The gate diagnostics still notify. The active-tool-set
  replay from transcript (`restoreDeclaredSetFromTranscript`) is
  workflow-bound and stays ungated-only. The peer-extension checks
  (pi-subagents, pi-telemetry present) stay, since the package still
  depends on them for `tw_feedback` and the subagents in gated repos.
- **`tw_feedback` registration is unconditional**: it is claimed by 10 of
  the 11 shipped subagent allowlists, and pi-subagents refuses to launch
  a child whose allowlisted tool is unavailable (the extension's own
  assertion; the spec phase records it and implementation verifies it
  against the pi-subagents source before relying on the exact failure
  shape).
- **Repo-classification contract unchanged**: `disableOnRepo` regex list,
  per-repo `taskWorkflow.enable` boolean override, normalization, and the
  truth table all keep their shape and semantics from
  `docs/repo-gating.md`.
- **Documentation**: `docs/repo-gating.md` is re-synced to the narrowed
  behaviour, including the smaller strip set, the three passive tools plus
  the three skill-creator tools, the `tw_open` restriction, and the same
  known `/help` limitation, now scoped to the 10 skills.

## Testing Decisions

Good tests here assert external behaviour of the extension entry point
under both gate states: which tools are registered and with what active
state, which skill names are stripped from the prompt block, which
`/skill:` invocations are answered by a refusal notice, and whether a
write to `docs/tasks/**` is refused. They do not reach into internal
helper shapes; as before, the gate-factory pattern in the existing test
suite is the seam.

- Modules covered: the extension entry point's gated and ungated branches
  (tool registration set, lockdown condition, notify_user placement), the
  skill-strip and invocation-gate handlers against the static manifest,
  and `tw_open`'s skill restriction in the gated shape.
- The stale gate-factory fixture ("gated five", with a test asserting the
  old strip set) is replaced by cases for both gate states: ungated
  registers the full surface; gated registers exactly the passive set,
  the three skill-creator tools, and `notify_user`, and refuses
  workflow-skill names through both the prompt strip and `tw_open`.
- A consistency test pins the static manifest bidirectionally: every
  manifest name is a basename under `pi.skills`, every registry-bound
  workflow skill is in the manifest, and the manifest holds exactly the
  settled 10 names.
- Prior art: the existing gate tests and the skill-registry tests in the
  repo's vitest suite; same factories, extended rather than replaced.

## Out of Scope

Consistent with the map's non-goals:

- Changing how a repo is classified as a work repo (pattern list, per-repo
  override, normalization, truth table).
- Dropping repo gating entirely or shipping a static keep-list mechanism.
- Rewording the generic skills' headers around workflow-failure; the rule
  is accepted inert prose in gated repos.
- Hiding package resources from `/help` (no pi hook exists; the documented
  limitation narrows to the 10 skills only).
- Making any `skill_*` tool default-active, or extending `tw_open`'s
  restriction beyond skill names.
- Reorganising the skills taxonomy or moving efforts.

## Further Notes

- The inventory that underpins the passive-set and manifest decisions is
  recorded in the `tool-use-inventory` planning task, including per-file
  citations and a full findings document.
- Three recorded engineering checks ride along into implementation rather
  than being settled here: disclosure soundness when only `skill-creator`
  can disclose; the exact pi-subagents launch-failure shape for an
  unavailable allowlisted tool; and the gate-factory fixture cleanup.
- The one existing ADR (0001, adopting the skills baseline) does not
  conflict with this spec; the architectural tracking effort may choose
  to record the narrowed gate as a follow-up entry.

> The architecture content in this specification is archival: the living architecture document is [architecture.md](architecture.md); update it there, not here.
