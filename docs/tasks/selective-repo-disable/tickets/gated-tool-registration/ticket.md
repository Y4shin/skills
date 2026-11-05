---
type: ticket
subtype: feature
title: Split tool registration by gate state and re-key the write lockdown
status: stable
workflow_state: ready
blocked_by:
- gated-skill-manifest
size: m
---

## What to build

In a gated (work) repo, the extension registers the passive tool set `tw_open`, `tw_close`, `tw_feedback`, the three skill-creator tools (`skill_validate`, `skill_scaffold`, `skill_discover`, registered inactive as today), and `notify_user` (which moves out of the ungated-only branch of the entry point); every other `tw_*` tool stays unregistered. In an ungated repo the registration surface is unchanged. The `docs/tasks/**` write lockdown stops registering behind the plain "gate inactive" boolean and gets its own explicit "workflow enabled in this repo" condition, with refusal wording and the two exemption segments unchanged; the transcript declared-set replay stays on the same workflow-enabled condition. The stale "gated five" factory fixture and its now-flawed strip assertions are replaced by dual gate-state factory tests: gated registers exactly the passive set plus the skill-creator tools plus `notify_user`, ungated registers the full surface.

## Acceptance criteria

- [ ] In the gated shape, the registered tool set is exactly {tw_open, tw_close, tw_feedback, skill_validate, skill_scaffold, skill_discover, notify_user}.
- [ ] In the ungated shape, the full tool set and `notify_user` register as today; no visible change.
- [ ] The write lockdown fires in an ungated repo and does not fire in a gated repo, driven by an explicit workflow-enabled predicate, not by the gate boolean.
- [ ] `restoreDeclaredSetFromTranscript` is skipped in gated repos.
- [ ] The dual gate-state factory tests pass; the stale fixture and its test are replaced; the full test suite is green.

## Blocked by

- `gated-skill-manifest` (the manifest is consumed by the strip and invocation handlers whose behaviour these tests pin).
