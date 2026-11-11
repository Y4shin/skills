---
type: review
title: End-of-effort review of configurable-git-workflow
pass: end-of-effort
---

## Fixed point

The task passed `main` as the fixed point, which is unusable because the effort
landed directly on the trunk: `git diff main...HEAD` is empty. The review used
`b0f18df`, the parent of the effort's intake commit, giving 79 files and about
11,200 added lines across 97 commits. Two non-effort file groups in that window
(the tree-sitter planning documents and one reviewer-agent rewording) are
excluded from the findings.

Evidence produced during the review: typecheck clean, and the full suite at 29
files and 1561 tests, all passing.

## Standards findings

1. **The always-declared tool set is documented as a quartet.** `WORKFLOW-INTERNALS.md`
   said four tools are active in every state while seven are, and its by-phase
   table omitted the changeset writer from the effort close. *Closed by the
   coherence commit.*
2. **Two comments in the extension and the repo gate documented the wrong thing.**
   Both said "the dispatcher quartet is always declared", and a settings-reader
   doc comment sat above a different function. *Closed by the coherence commit.*
3. **Duplicated helpers.** `spawn-guard.ts` repeats `text()` and `isObject()`
   from `git-profile.ts`, in two modules that both claim to share one resolver.
   *Open.*
4. **One file absorbed five features.** `src/pi.ts` gained the git-profile
   wiring, the spawn guard, the phase brief, the changeset writer, and the release
   pair, growing past 4300 lines. *Open, judgement call.*
5. **A type assertion stands in for a discriminant.** The changeset writer tells
   the proposal and write shapes apart with `resolved as WriteOutcome` rather than
   a discriminant field. *Open.*
6. **README bucket grouping.** The engineering `release` entry sits between a
   productivity entry and another, which the membership-only test does not catch.
   *Open, cosmetic.*

No em-dashes in added prose, and the promoted-set wiring is complete and
tool-enforced.

## Specification findings

1. **`closeGate` is inert.** Both branch-bearing profile rows carry it, the brief
   reports it, and nothing enforces it. Data with no behaviour. *Open, minor: no
   spec line defines a close-time gate.*
2. **The docs page documented the broken merge flag.** `docs/git-workflows.md`
   said `no-ff` while the profile carried `--no-ff`. *Closed by the coherence
   commit.*
3. **The effort close's push step contradicts its own policy sentence.** The prose
   says a push policy of never means the phase pushes nothing, and the block that
   follows pushes unconditionally. *Open.*
4. **The guards fail open when the git seam cannot read the checkout.** The map
   says guards block and do not warn; the phase gate and the spawn guard both pass
   with a diagnostic or a notification when the seam is missing or git fails. A
   readable but wrong branch does refuse correctly, so this concerns only the
   seam-failure path, and it was a deliberate choice made during implementation.
   *Open, and the sharpest mismatch between the map's wording and the shipped
   behaviour.*

Everything else checked clean: three settings keys only, two flat profiles, an
unconfigured repo running `default` with an effort branch, planning phases and
`flat` gating nothing, the spawn block on both surfaces, the three forced
changeset behaviours, the release skill user-invoked with both stopping outcomes,
no branch operations in the release skill, and no worktree, rebase, custom-profile,
release-pipeline, or repo-gate scope creep.

## Worst issue per axis

- **Standards:** the always-declared set doubled while two mechanical references
  still described a quartet, so the router's own internals document contradicted
  the shipped surface. Fixed in the coherence commit, but it shows that a tool
  surface addition has documents that no test reads.
- **Spec:** the guards fail open when the git seam cannot read the checkout, which
  contradicts the map's "guards block, they do not warn".
