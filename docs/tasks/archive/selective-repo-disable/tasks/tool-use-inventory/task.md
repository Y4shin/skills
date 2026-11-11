---
type: task
subtype: research
title: Inventory tw_* tool and workflow coupling across all non-gated skills
status: deprecated
workflow_state: done
blocked_by:
- non-negotiables
---

## Question

For a gated work repo (workflow family disabled), exactly which `tw_*` tools, extension behaviors, and package resources do the surviving non-gated skills and agents use or reference, and how should the gate be shaped around that usage?

## Parent decisions (settled in non-negotiables)

- Gated set: 9 workflow skills (task-workflow-overview, setup-workflow, intake, wayfinder, to-spec, to-tickets, implement-ticket, finalize-effort, task-workflow-doctor); workflow-failure stays generic.
- Tools: passive set only. Most `tw_*` tools will stay disabled, but tools genuinely used by surviving skills (leading candidate: `tw_open`/`tw_close`, used by skill-creator's nested-phase clause) may remain registered with restricted parameters rather than removed.
- `notify_user` stays available in gated repos.
- The docs/tasks write lockdown follows the workflow: off in a gated repo.

## What to establish (evidence, not preference)

1. For every non-gated skill (skills/engineering + skills/productivity minus the 9) and the package's agents (./agents), enumerate every `tw_*` reference: which tool, where (SKILL.md body, resources, header rule), and whether the reference is load-bearing (the skill fails/degrades without the tool available) or opportunistic (e.g. the tw_feedback best-effort call or the workflow-failure header).
2. Enumerate the non-tool capabilities the extension registers today (notify_user, tw_feedback source, subagents path) and which of them are workflow-bound vs generic.
3. Recommend: the exact passive tool set for gated repos, and per-tool parameter restrictions (e.g. tw_open only for non-workflow skills/phases; what tw_state/tw_state_set semantics should be when no workflow is loaded).
4. Decide where the gated-skill list lives: a static manifest list vs a derived partition of package.json pi.skills (pros/cons against today's loadGatedSkillNames in src/pi.ts).

## Evidence

Skill and resource files in skills/, src/pi.ts registrations and gate code, docs/repo-gating.md, agents/.

## Write-back

Results go to the map's ## Decisions so far (passive set + restrictions + list location), referencing this task's slug.

## Notes

Findings from a read-only subagent inventory (full findings file: ~/.pi/agent/sessions/--home-pplattner-Projects-skills--/subagent-artifacts/outputs/1c69b925-bf52-4873-a887-9367cad6ff91/tool-use-inventory/findings.md), plus the operator's Q6/Q7 follow-up decisions.

**Headline evidence (all file:line cited in the findings):**
- No non-gated skill is load-bearing on any `tw_*` tool except `tw_feedback`: workflow-failure's rung 3 instructs a call to it (degrades, does not fail without it), and 10 of 11 shipped subagents allowlist `tw_feedback` in their `tools:` line, which pi-subagents fails a child over when unavailable. `tw_feedback` must stay registered in gated repos.
- skill-creator's nested-phase clause (tw_open) is conditional, not load-bearing; its three script tools (`skill_validate`, `skill_scaffold`, `skill_discover`) are registered by `createTools()` and stripped by the gate today.
- All extension tools are registered with `defaultActive: false`; the tw_open opener activates a toolset via `pi.setActiveTools` (src/pi.ts:3664-3667, "bypass-free gate"). The initial assumption that skill_* tools were always-on was wrong; verified for the operator between the two Q6 rounds.
- `notify_user` is generic (reads `~/.unipi/config/notify/config.json`) but today sits inside the gate branch (src/pi.ts:3689).
- The strip list bug confirmed: `loadGatedSkillNames()` derives ALL 31 pi.skills basenames on the happy path (src/pi.ts:84), and the 8-name fallback is stale (missing task-workflow-doctor). Recommendation: static manifest of the gated names, one source, plus a consistency test pinning manifest to pi.skills and SKILL_REGISTRY.
- The write lockdown currently registers behind `!gate.active` (src/pi.ts:3685). Once passive tools stay registered in gated repos, the condition must become "workflow enabled in this repo", not `!gate.active`.
- tests/gate-factory.test.ts pins a stale "gated five" fixture; a test named "strips only the gated five" (line 489) no longer describes reality.
- Minor couplings for the spec's awareness: code-review reads ticket/architecture paths opportunistically (degrades with a fallback); tdd names workflow artifacts in prose only; skill-creator references/ point at docs/tasks paths that dangle in work repos (cosmetic).

**Q6 revised answer (operator):** keep `tw_open` and `tw_close` registered in gated repos, but restrict `tw_open`'s accepted skill values: either narrow the parameter enum/contract to non-gated registry entries (skill-creator) when the gate is active, or at minimum refuse gated skill names at runtime with the notify+refuse shape of gateSkillInvocation. This gives skill-creator (and any future non-gated registry entry) its full disclosure path without an active-by-default branch and without the workflow phase machinery. No skill_* tools become default-active.

**Q7 revised answer (operator, supersedes Q5 from non-negotiables):** gate workflow-failure too. All 10 workflow-adjacent skills gate off; the generic skills' header rule ("invoke workflow-failure...") becomes deliberately inert prose in gated repos, like the tw_* mentions today.

**Both fog lines resolved by this task:** the passive set is {tw_open, tw_close, tw_feedback} with tw_open restricted to non-gated registry entries; the gated-skill list becomes a static manifest with a consistency test.

**Open engineering checks handed to the spec phase (not human decisions):** whether the open-set derivation (openSkillsIn, disclosure.ts:293-330) stays sound when only skill-creator's toolset can disclose; pi-subagents' exact failure on unavailable allowlisted tools (extension asserts it at pi.ts:3749-3752, not verified against pi-subagents source); the stale gate-factory test fixture.
