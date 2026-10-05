---
type: ticket
subtype: feature
title: Opener-as-gate preconditions and the per-skill toolset registry
status: stable
workflow_state: ready
blocked_by: [planning-transition-tools, implementation-transition-tools, disclosure-open-close-core]
size: l
---

## What to build

The opener becomes the gate. `tw_open` performs that phase's precondition
checks, refuses and names the legal next calls when they fail, and activates
the phase toolset only when they pass. A refused open activates nothing.

The registry is one table: skill to toolset, plus skill to preconditions.
Gate logic lives only here, computed from the real tree through the
`art.ts`/`graph.ts` seams. No preconditions are duplicated in skill prose,
and the host `gate:` commands stay where they already are.

The refusals to cover, each with a named legal next call:

- missing target;
- blocked target (the reason names the blocker);
- done target;
- not-ready target;
- unknown effort;
- effort with a spec and no tickets (legal next: run `to-tickets`);
- effort with every ticket done (legal next: run `finalize-effort`).

Phase-specific gates: `to-spec` checks only `ready_for_spec`, so a run that
finished every planning task but skipped reconciliation is refused with a
pointer back to Wayfinder. `implement-ticket` refuses when
`architecture.md`/`arch-spec.md` is missing or not stable, and never drafts
one. `finalize-effort` refuses while a finding is undispositioned.

## Acceptance criteria

- [ ] Every refusal above is returned, leaves the toolset closed, and names
      the legal next calls.
- [ ] A legal target activates the correct toolset and returns
      `details.opened === true`.
- [ ] `to-spec` refuses when `ready_for_spec` is false and opens when it is
      true.
- [ ] `implement-ticket` refuses on a missing or unstable architecture
      document and never drafts one.
- [ ] `finalize-effort` refuses while a finding is undispositioned.
- [ ] The phase-to-toolset registry is the single source; no gate prose
      remains in the skills.
- [ ] The opener is the only gate at skill entry; host `gate:` commands are
      unchanged.

## Blocked by

- planning-transition-tools (the planning preconditions read the flag and the
  map sections).
- implementation-transition-tools (the implementation preconditions read
  ticket state and the architecture document).
- disclosure-open-close-core (the opener, the toolset activation, and the
  refusal shape must exist first).