# An opener refused

## Symptom

- `tw_open` returned `opened: false`. Nothing opened, so no phase tools were
  disclosed.
- The refusal carries a `reason` and a `legal_next` list. `tw_next` repeats
  the current state.

## Diagnose

Read the `reason`, then route to `legal_next`. The opener names the legal
next calls by design; a refused open activates nothing, so there is no
workaround to find. The doctor's job ends at naming the route.

## Refusal shapes and their routes

| The reason names | Route |
|---|---|
| unknown effort | `/skill:intake`, which creates the effort |
| missing target | retry `tw_open` with the target ticket slug |
| blocked target | release the blocker the reason names, then reopen |
| done target | nothing to implement; if every ticket is done, `/skill:finalize-effort` |
| not ready (planning incomplete, or the map is not ready for the spec) | `/skill:wayfinder`: work the frontier and run the reconcile |
| an effort with a spec but no tickets | `/skill:to-tickets` |
| a missing or unstable architecture document | `/skill:to-tickets`: the architecture document is its output, never drafted here |
| a conflicting open skill | `tw_close` the named skill, then reopen |
| undispositioned findings on archive | disposition the review findings in `/skill:finalize-effort` |

## What not to do

- Do not reopen through another skill or path: the toolset stays closed by
  design until the precondition passes.
- Do not create the missing artifact by hand under `docs/tasks/`: the write
  guard refuses it, and the owning tool or skill is the route.
