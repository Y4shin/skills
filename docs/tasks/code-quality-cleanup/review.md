---
type: review
title: Whole-effort review of configurable-git-workflow
dispositioned: false
---

> Moved from the effort `configurable-git-workflow`: these findings are the follow-up's work.

## The effort's claim, checked against what shipped

The map's success test asks that a repo selecting a profile gets the workflow
enforced end to end: every guarded phase opens on the required branch or is
refused, no implementation sub-agent spawns on the wrong branch, and close-out
plus the release skill turn the effort's changesets into a version bump and a
root changelog.

Delivered: settings and two profiles as data, one resolver behind both the brief
and the refusal, a generic branch gate on the openers, a profile-driven spawn
block on both dispatch surfaces and the per-child launch, changeset authoring
with a dry-run proposal and an honest dedupe, release planning and applying
behind two tools with the library set as runtime dependencies, the phase prose
and worker agents rewired with a prose guard that bans branch literals, and the
promoted user-invoked release skill. The success test holds except in one case:
when the git seam cannot read the checkout, both guards pass with a diagnostic
instead of refusing.

The map's non-goals all held: no worktree isolation, no custom profile authoring
or settings overrides, no change to the package's own release pipeline, no rebase
or cherry-pick strategies, no repo-gate redesign, no gating of the planning
phases, no branch migration, no machine-readable release recipe, no
auto-publishing. One unrequested addition was defended and recorded: the brief
tool answers for an implementation agent, which the specification did not name.

## The delivered code

Coherent and tested. 1561 tests pass and both typechecks are clean. The gates,
the resolver, and the changeset seam each sit behind a single module with an
injected dependency, so every one of them is tested without a real repository.
Two defects were found and fixed while the effort ran: a step-key separator the
workflow runtime rejects, and a bundled merge flag without its dashes.

## Findings

1. **The guards fail open when the checkout cannot be read.** Both the phase gate
   and the spawn guard pass with a diagnostic or a notification when the git seam
   is missing or git fails, which contradicts the map's non-negotiable that guards
   block rather than warn. Disposition: ticket `guard-fail-closed`.
2. **The effort close's push block contradicts its own policy sentence.** The
   prose states that a push policy of never means the phase pushes nothing, and
   the block that follows pushes unconditionally. Disposition: ticket
   `close-out-fidelity`.
3. **`closeGate` is authored data with no behaviour.** Both branch-bearing profile
   rows carry it, the brief reports it, and nothing enforces it. Disposition:
   ticket `close-out-fidelity`.
4. **The changeset writer does not resolve its effort argument.** A typo'd slug
   still writes, and the report names the effort it was given rather than the one
   that exists. Disposition: informational, accepted, because the changeset files
   carry no effort field and the risk is a wrong label rather than wrong data.
5. **The extension's tool file absorbed five features**, the spawn guard repeats
   two small helpers from the resolver, and one type assertion stands in for a
   discriminant in the changeset writer. Disposition: follow-up effort
   `code-quality-cleanup`, accepted by the operator.
6. **The README places the engineering `release` entry among productivity
   entries**, which the membership-only test does not catch. Disposition:
   follow-up effort `code-quality-cleanup`, accepted by the operator.
