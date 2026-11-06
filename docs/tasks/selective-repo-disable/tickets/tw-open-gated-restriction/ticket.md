---
type: ticket
subtype: feature
title: Restrict tw_open to non-gated skills in gated repos
status: stable
workflow_state: ready
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
