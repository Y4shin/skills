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
