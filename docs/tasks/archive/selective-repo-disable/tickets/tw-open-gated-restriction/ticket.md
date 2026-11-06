---
type: ticket
subtype: feature
title: Restrict tw_open to non-gated skills in gated repos
status: deprecated
workflow_state: done
blocked_by:
- gated-tool-registration
size: s
---

## What to build

In a gated repo, `tw_open`'s `skill` parameter narrows to non-gated registry entries (currently exactly skill-creator), so the model never sees a gated name in the schema, and a gated name is still refused at runtime with the opener's existing refused-outcome shape (reason plus legal_next, and a notify in the spirit of the skill-invocation gate). `tw_close` needs no restriction: closing what never opened is already a handled refusal. The disclosure's open-set derivation is verified by a test to stay sound when only skill-creator's toolset can be active (a passive active set must never derive a workflow phase as open). skill-creator opened this way in a gated repo discloses its bundled tools to the model, matching the ungated experience.

## Acceptance criteria

- [ ] In the gated shape, `tw_open` offers only non-gated registry entries in its parameter schema and refuses workflow-skill names at runtime with the refused-outcome shape.
- [ ] In the gated shape, opening skill-creator activates its toolset (the three skill_* tools plus the shared reads) just as in an ungated repo.
- [ ] A test proves the open-set derivation cannot derive a workflow phase as open from the passive active set.
- [ ] In the ungated shape, `tw_open` is unchanged; the full test suite is green.

## Blocked by

- `gated-tool-registration` (tw_open must be registered in both states for its restriction to have a home).

## Implementation notes

Architecture lessons from the knowledge harvest: two spec clauses conflicted and the implementation resolved both with recorded reasons. First, the architecture's opener seam pointed the gated refusal at validateOpenArgs, but validateOpenArgs throws and the ticket requires the refused-outcome shape (reason plus legal_next), which only a returned outcome carries; the refusal therefore lands as the first check in tw_open's execute handler, with the consequence that the three manifest names with no registry entry (task-workflow-overview, task-workflow-doctor, workflow-failure) get the gated refusal instead of the unknown-skill throw, matching the /skill: invocation block, and repo-gating-docs-resync should document the refusal as covering the whole manifest. Second, the architecture preferred schema-enum narrowing, but a provider-validated union short-circuits the opener's own refusals and tw_open's bare union shipped broken on DeepSeek (the repo documents this), so the narrowing is the skill parameter description's enumerated list with the runtime refusal as the enforcement; the model never sees a gated name in the offered surface. The notify seam is broader than tw_open alone: a new optional ToolContext.notify wired from the session UI in the shared registerTool execute wrapper, best-effort, with the refused outcome always returning. Residuals recorded for the next ticket: an unknown non-manifest skill name in a gated repo still errors with the full 8-name registry list (revealing gated names on a hallucinated-name path; candidate known-limitation note for repo-gating-docs-resync), and tw_close's idle hint ("open a phase with tw_open") is imprecise in a gated repo where only skill-creator opens.

Landed from the re-verified ticket branch (e1c8dfa) with a --no-ff merge (2a39b38) onto a fresh landing branch task/tw-open-gated-restriction created from main (df0926e); the ticket branch was deleted after the merge, and the deviation report landed in commit 4543daf together with the workflow tracker's task pointer in docs/tasks/state.yaml (untouched by the landing, committed verbatim). createTools(gated) receives the gate state from the factory and defaults to false; the offered schema and the runtime refusal read that one fact. buildOpenParameters(gated) narrows the offered skill names through the new openableWhenGated() (registry minus GATED_SKILL_NAMES, today exactly skill-creator), so the offered surface cannot drift from the enforced set. The gated refusal is the first check in tw_open's execute handler, before validateOpenArgs, because validateOpenArgs throws while the ticket requires the refused-outcome shape (Refused: <reason>. Legal next: tw_open skill-creator. with details { opened: false, reason, legal_next }), which only a returned outcome carries; consequence: the three manifest names with no registry entry get the gated refusal instead of the unknown-skill throw, matching the /skill: invocation block. The narrowing is the description's enumerated list, not a parameter enum: skill stays Type.String because a provider-validated union short-circuits the opener's own refusals and tw_open's bare union shipped broken on DeepSeek (docs/testing.md records it); the runtime refusal enforces the surface. The notify (task-workflow is gated in this work repo; not opening <name>, warning, mirroring the invocation gate's message family) is best-effort through a new optional ToolContext.notify wired from ctx.ui.notify in the factory's shared execute wrapper; the refused outcome always returns, even in a UI-less harness. legal_next derives from openableWhenGated() (["tw_open skill-creator"] today), not pinned, so it scales if the kept set grows. tw_close is untouched, per the ticket; its idle hint ("Legal next: open a phase with tw_open") is slightly imprecise in a gated repo where only skill-creator opens, pre-existing message. Known limitation left in scope: in a gated repo an unknown non-manifest skill name still errors with the full 8-name registry list, revealing gated names on that hallucinated-name path (the schema never offers them); candidate known-limitation note for repo-gating-docs-resync, which also owns the pending docs/repo-gating.md resync. Verification: tests/gate-factory.test.ts 39/39 on the landed branch; the full suite and both typechecks are relative-green, failure and error sets byte-identical to main's documented node_modules version-skew baseline, with exactly the 5 new tests added to the passed count.
