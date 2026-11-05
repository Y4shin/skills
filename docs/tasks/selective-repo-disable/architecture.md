---
type: architecture
title: Loosen repo gating to task-workflow resources only
status: stable
---

## Settled architecture (from the specification)

- **Gated skill set is a static manifest of 10 names**: task-workflow-overview, setup-workflow, intake, wayfinder, to-spec, to-tickets, implement-ticket, finalize-effort, task-workflow-doctor, workflow-failure. The manifest lives next to the skill registry it mirrors. It replaces `loadGatedSkillNames()`, whose all-basenames derivation and stale hardcoded fallback both disappear. The generic skills' one-line workflow-failure header rule becomes accepted inert prose in gated repos; no header rewording anywhere.
- **Tool registration splits by the gate**: in a gated repo, only `tw_open`, `tw_close`, and `tw_feedback` register from the `tw_*` set, plus `notify_user` (which moves out of today's ungated-only branch; it is generic and reads only the user's ntfy config). Every other `tw_*` tool, including all writers and the dispatcher companions `tw_next` and `tw_request_tool`, stays unregistered. In an ungated repo the full set registers as today.
- **skill-creator's bundled tools also register in gated repos**: `skill_validate`, `skill_scaffold`, and `skill_discover` are generic, workflow-independent, and the only tools a kept skill's disclosure activates. They register as today (inactive), so the restricted `tw_open` can disclose skill-creator's toolset to the model in a gated repo. Without this, the disclosure path would find nothing to activate, which is exactly the "kept in name only" failure the non-negotiable facts forbid.
- **`tw_open` is restricted in gated repos to non-gated registry entries**: its `skill` parameter accepts only registry entries whose names are not in the gated manifest (currently exactly `skill-creator`); asking for a gated name is refused at runtime with a notify answer in the shape of the existing skill-invocation gate. The restriction lives inside `tw_open`'s own gate; enumerated narrowing of the parameter schema is preferred so the model never even sees a hopeless value, with the runtime refusal as the belt next to the suspenders. `tw_close` needs no restriction (closing what does not open is already a handled refusal). No `skill_*` tool becomes default-active; they activate through the disclosure exactly as today. The disclosure's open-set derivation must be verified to stay sound when only `skill-creator`'s toolset can ever be active.
- **The write lockdown registers on 'workflow enabled', not 'gate inactive'**: today the guard hooks register inside the gate-inactive branch, which coincides with the workflow being on. Once passive tools register in gated repos the two conditions diverge, so the guard gets its own explicit condition tied to the workflow being enabled in that repo. Refusal texts and exemptions are unchanged.
- **Session-start behavior in gated repos**: the skill-strip and `/skill:`-invocation block hooks keep firing (strips now cover only the manifest's 10). The gate diagnostics still notify. The active-tool-set replay from transcript (`restoreDeclaredSetFromTranscript`) is workflow-bound and stays ungated-only. The peer-extension checks (pi-subagents, pi-telemetry present) stay, since the package still depends on them for `tw_feedback` and the subagents in gated repos.
- **`tw_feedback` registration is unconditional**: it is claimed by 10 of the 11 shipped subagent allowlists, and pi-subagents refuses to launch a child whose allowlisted tool is unavailable (the extension's own assertion; implementation verifies it against the pi-subagents source before relying on the exact failure shape).
- **Repo-classification contract unchanged**: `disableOnRepo` regex list, per-repo `taskWorkflow.enable` boolean override, normalization, and the truth table all keep their shape and semantics from `docs/repo-gating.md`.
- **Documentation**: `docs/repo-gating.md` is re-synced to the narrowed behaviour, including the smaller strip set, the three passive tools plus the three skill-creator tools, the `tw_open` restriction, and the same known `/help` limitation, now scoped to the 10 skills.

## Existing abstractions to stand on

- The skill registry tables in the disclosure module, which already partition every workflow phase (name, gate, toolset, conflicts); the manifest belongs beside them.
- The existing gate resolver and its truth table in the repo-gate core module; the classification logic is not touched.
- The prompt-strip and skill-invocation handlers in the extension entry point, which already read a name set; they continue to read a name set, just the manifest's.
- The opener's own refusal machinery (`validateOpenArgs`, refused-outcome shape with `reason` and `legal_next`), which reused for the gated-name refusal keeps one refusal language.
- The gate-factory test seam (stub extension API capturing tools, handlers, notifications) in the existing test suite; new dual-state tests extend it instead of inventing a second fixture style.
- The static-name diagnostics channel (`SKILL_NAME_DIAGNOSTICS` notified at session start) survives for the package.json read failure, which the consistency test makes near-impossible anyway.

## Do-not-reimplement

- Do not invent a second keep-list or per-skill metadata flag on top of the manifest; the registry already has the gate/conflict shape, and a second mechanism is what replaced the derivation.
- Do not keep `loadGatedSkillNames` as a fallback path with different names: one list, one source, pinned by the consistency test.
- Do not make the skill-creator script tools default-active in the gated branch to compensate for the disclosure; the restricted `tw_open` is the activation path in both gate states, and a second activation rule is exactly the drift this effort removes.
- Do not copy the write-guard refusal text into a new guard; the existing guard moves behind the new condition as-is.

## Seams

- **Manifest seam**: one exported constant next to the registry; the strip list, the invocation block, and `tw_open`'s restriction all consume it.
- **Registration seam**: the tool-registration loop and `notify_user` registration in the extension entry point branch on gate state; the set of names each state contributes is a pure function of the gate result.
- **Opener seam**: `tw_open`'s parameter construction (`buildOpenParameters`) and its argument validation are where the gated narrowing and refusal land; no other tool sees the restriction.
- **Condition seam**: a small "workflow enabled in this repo" predicate separates the lockdown and `restoreDeclaredSetFromTranscript` from the passive tool registration; today both are glued to one boolean.
- **Docs seam**: `docs/repo-gating.md` is the single narrative contract; the CHANGELOG entry happens at ticket close-out, not here.

## Per-ticket contracts

- **gated-skill-manifest exports**: a named constant with the 10 names, plus its consistency rule (manifest names are exactly the registry workflow skills, and every one is a `pi.skills` basename). Consumers: the prompt strip, the `/skill:` block, and the `tw_open` restriction in the next tickets. Verifiable on its own: the consistency test fails on a renamed or added skill.
- **gated-tool-registration exports**: the registration split (passive set + skill-creator tools + `notify_user` in gated repos, full set in ungated repos) and the new "workflow enabled" condition that owns the lockdown and the declared-set replay. Export to the next ticket: `tw_open` is registered in both states, so its restriction has a place to live. Verifiable on its own: the dual gate-state factory assertions pass against the stub extension API.
- **tw-open-gated-restriction exports**: a `tw_open` that, in gated repos, offers and accepts only non-gated registry entries, refusing gated names with the opener's refused-outcome shape; plus a proof (test) that the open-set derivation cannot derive a workflow skill as open from the passive active set. Verifiable on its own: the stubbed `tw_open` refuses workflow names and opens skill-creator in the gated shape.
- **repo-gating-docs-resync delivers**: a re-synced `docs/repo-gating.md` (strip set, passive tools, `tw_open` restriction, lockdown condition, re-scoped `/help` limitation) and the verified pi-subagents failure-shape note, either correcting or confirming the entry point's warning wording. Verifiable on its own: the doc matches the registered surface that ticket two and three's tests pin.

## Engineering checks handed from planning

- Disclosure soundness when only skill-creator can disclose (resolved as a test inside `tw-open-gated-restriction`).
- Exact pi-subagents launch-failure shape for unavailable allowlisted tools (verified against the pi-subagents source inside `repo-gating-docs-resync`).
- The stale gate-factory fixture cleanup (absorbed by `gated-tool-registration`).
