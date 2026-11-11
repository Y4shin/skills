---
type: review
title: Whole-effort review of configurable-git-workflow
dispositioned: true
reconcile: "done: the architecture was reconciled at the end-of-effort pass and then corrected twice by the close-out repairs, which removed the fail-open convention from the guards section, recorded the closing gate as enforced, and added the two correction entries for the step-key separator and the merge-flag dashes, so the living document matches the shipped surfaces."
---

## The effort's claim, checked against what shipped

The map's success test asks that a repo selecting a profile gets the workflow
enforced end to end: every guarded phase opens on the required branch or is
refused, no implementation sub-agent spawns on the wrong branch, and close-out
plus the release skill turn the effort's changesets into a version bump and a
root changelog.

It holds as written. Ten tickets shipped: settings and the two profiles as data,
one resolver behind the brief and every refusal, a branch gate on the openers, a
profile-driven spawn block on both dispatch surfaces and the per-child launch,
changeset authoring with a dry-run proposal and an honest dedupe, release
planning and applying behind two tools with the changesets libraries as runtime
dependencies, the phase prose and worker agents rewired with a prose guard that
bans branch literals and hand-written pushes, the promoted user-invoked release
skill, and two close-out repairs that made the guards fail closed and the closing
gate real.

The map's non-goals all held: no worktree isolation, no custom profile authoring
or settings overrides, no change to the package's own release pipeline, no rebase
or cherry-pick strategies, no repo-gate redesign, no gating of the planning
phases, no branch migration, no machine-readable release recipe, no
auto-publishing.

## What changed since the first review pass

The first pass found three behavioural gaps. Two became tickets and landed:
guards now refuse and block when the checkout cannot be read, and the close-out's
push follows the profile's policy while the closing gate is enforced at close.
One remained informational and stands: the changeset writer does not resolve its
effort argument, which is a wrong label rather than wrong data. The code-quality
and documentation-ordering findings moved to the follow-up effort
`code-quality-cleanup`.

## The delivered code

1588 tests pass and both typechecks are clean. The gates, the resolver, the spawn
guard, and the changeset seam each sit behind a single module with an injected
dependency, so none of them needs a real repository to test. Two defects were
found by the work itself and fixed while it ran: a step-key separator the workflow
runtime rejects, and a bundled merge flag without its dashes. The architecture
document records six corrections and an explicit list of what is not built yet.

## Findings

No open findings. Each finding from the first pass is recorded below with where
it went, and this pass adds none.

1. Guards failed open when the checkout could not be read. Closed by ticket
   `guard-fail-closed`.
2. The close-out's push block contradicted its own policy sentence. Closed by
   ticket `close-out-fidelity`.
3. The profile's closing gate was authored and unenforced. Closed by ticket
   `close-out-fidelity`.
4. The changeset writer does not resolve its effort argument. Accepted as
   informational: a wrong label, not wrong data.

## Dispositions

- Guards failed open when the checkout could not be read; closed by ticket guard-fail-closed, which landed and is done.: ticket `guard-fail-closed`
- The close-out's push block contradicted its own policy sentence; closed by ticket close-out-fidelity, which landed and is done.: ticket `close-out-fidelity`
- The profile's closing gate was authored and unenforced; closed by ticket close-out-fidelity, which landed and is done.: ticket `close-out-fidelity`
- The changeset writer does not resolve its effort argument, so a typo'd slug still writes and the report names the effort it was given; accepted because the risk is a wrong label, not wrong data.: informational (accepted)
