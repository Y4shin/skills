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

## Implementation notes

Architecture lessons from the knowledge harvest: the effort's settled fact that pi-subagents refuses to launch a child whose allowlisted tool is unavailable was recorded from this package's own assumption, not verified, and propagated into the session-start warning, README, the skill-creator reference, and two pinned tests. The ticket's pre-authorized verify-then-confirmed-or-corrected arm falsified it against the pi-subagents source (0.34.0 forwards the tools list to pi unvalidated; no availability assertion anywhere in the launch path) and empirically (pi --tools totally_bogus_tool exits 0 with an empty tools section). The durable lesson: a claim about another package's behavior becomes settled fact only after verification against that package's source; the real cost of a missing allowlisted tool is the lost tw_feedback row, not a failed launch, and the corrected wording pins 0.34.0 behavior, so a future upstream launch-time check would stale it again. Residual decision taken by the close-out: the effort's planning records that still state the pre-verification claim (map.md's hedge, tasks/tool-use-inventory/task.md's flat statement) are left as historical records, not annotated; the living architecture document is corrected by the end-of-effort reconcile step, and dated records stay untouched per the repo's own convention. The root CHANGELOG's historical 5.2.x entry carrying the old claim stays as append-only history; the correcting statement ships in this ticket's docs/tasks changelog entry.
