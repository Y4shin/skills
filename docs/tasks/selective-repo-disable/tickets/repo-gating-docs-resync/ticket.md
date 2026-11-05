---
type: ticket
subtype: feature
title: Re-sync docs/repo-gating.md to the narrowed gate
status: stable
workflow_state: ready
blocked_by:
- tw-open-gated-restriction
size: s
---

## What to build

`docs/repo-gating.md` describes the narrowed behaviour as the previous tickets landed it: the 10-name gated skill set, the passive tools (tw_open, tw_close, tw_feedback) and the `tw_open` restriction, the three skill-creator tools staying registered through the disclosure, `notify_user` staying available, the write lockdown on its workflow-enabled condition, and the `/help` known-limitation re-scoped to the 10 skills. The configuration contract (disableOnRepo, per-repo enable, truth table) is re-stated as unchanged. As part of the ticket, the pi-subagents launch-failure claim (an unavailable allowlisted tool fails child launch) is verified against the pi-subagents source, and the entry point's session-start warning wording and the doc's description of it are confirmed or corrected.

## Acceptance criteria

- [ ] docs/repo-gating.md matches the registered surface the implementation tickets pinned: gated skill set, passive tools, restriction, lockdown condition.
- [ ] The classification config is documented as unchanged.
- [ ] The pi-subagents launch-failure behaviour is stated from its own source, and any now-inaccurate warning wording in the entry point is corrected.
- [ ] No other repo documentation contradicts the resynced gate description.

## Blocked by

- `tw-open-gated-restriction` (docs describe the final registered surface, which this ticket completes).
