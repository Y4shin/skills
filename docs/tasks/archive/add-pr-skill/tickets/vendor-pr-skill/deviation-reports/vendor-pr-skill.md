---
type: deviation report
title: Deviation report for vendor-pr-skill
status: stable
---

## Deviation report: vendor-pr-skill

Review basis: the effort architecture
(`docs/tasks/add-pr-skill/architecture.md`, surface map and
do-not-reimplement notes), the ticket's ten acceptance criteria, the
implementation record, and the branch diff. The `task/vendor-pr-skill`
base branch the role expects does not exist in this repo; the ticket
branch forks from the planning commit `8136f4e`, so the review diff is
`8136f4e..ticket/vendor-pr-skill` (nine files, 246 insertions, exactly
the nine surfaces). Upstream was fetched live for this review:
mattpocock/skills main at commit
`4ae2317ddb22b046e26455e4f9c9b3aaaf62212d`, matching the implementer's
fetch. The suite was re-run for this review: 23 files, 1362 tests
green; `npm run typecheck` and `npm run typecheck:tests` clean; no
em-dash in any changed file.

### API surface changes

- **Planned:** the skill lands with the upstream frontmatter intact and
  the body byte-close: the vendoring stance allows "only mechanical
  adjustments where house rules demand" and the ticket expected none
  ("none expected; the text is verified em-dash-free"). The trigger
  description stays verbatim: "Use when writing a PR body."
- **Actual:** the frontmatter is byte-identical to upstream (verified
  by `cmp` against the fetched upstream file, `metadata.credits` block
  included). The body differs from upstream by exactly one insertion:
  the house preamble (the `operator-communication` line plus the
  canonical `workflow-failure` reference sentence) between the
  frontmatter and "Use this template for writing the PR body:";
  everything above and below the insertion is byte-identical (verified
  by `diff`). The em-dash prediction held. One nuance the implementation
  record glosses: only the canonical reference sentence is
  verbatim-forced, by the `reference-coverage-suite` in
  `tests/skills.test.ts` (a manifest-driven loop that fires for every
  newly promoted skill, exempting only `workflow-failure` itself); the
  `operator-communication` preamble is pinned by no test, it follows
  the house convention carried by 30 of the 32 promoted skills. The
  record's claim that "all 31 existing promoted skills carry" the line
  overstates: `operator-communication` itself and the user-invoked
  `wait-what` do not (29 of the then-31 carried it). Every other planned
  surface landed as specified: manifest entry and both count pins at
  32, migration-target entry, both README Model-invoked groups, the
  four-section docs page with the full provenance chain, the router's
  Standalone bullet and Actions row, the structure-test file-list
  entry, one minor changeset.
- **Impact:** none on behavior. The invocation surface (frontmatter,
  description, model-invoked mode) is untouched, so auto-invocation
  works exactly as the effort's success test requires, and no
  dependent tickets exist (this ticket is the effort's whole graph).
  The only consumers affected are readers diffing the vendored body
  against upstream for provenance.

### Abstraction usage

- Used/was specified: yes. The `SKILL_FILES` structure-test entry,
  both manifest-count pins, the manifest-derived docs-resync sets
  (`promotedWithInvocation` / `linkedSkills`), the docs-page
  four-section pattern, the em-dash corpus sweep, and the changeset
  format. No new test logic beyond the file-list entry and the two
  pins; no `SKILL_REGISTRY` entry, no `WORKFLOW_SKILLS` report-seam
  edit (`src/` is untouched in the diff), no eval-corpus entries.

### Out-of-scope changes

- None. The diff touches exactly the nine surfaces and nothing else.
  Upstream's `agents/openai.yaml` and `CREDITS.md` were deliberately
  not vendored (the house is Pi-native, frontmatter only; attribution
  lives in the credits block and the docs page), consistent with the
  surface map. The inline annotation next to the migration-target
  entry ("# vendored from mattpocock/skills; writes a PR body") matches
  that file's commenting style; not a scope change.

### Ticket doc update needed?

Yes: append an `## Implementation notes` section recording (1) the
vendored body carries the house preamble, forced by the
`reference-coverage-suite` seam, which neither the ticket nor the
architecture's surface map lists; the "none expected" remark was wrong
about there being no mechanical adjustment, though the ticket's
allowance ("except where a house rule demands a mechanical adjustment")
covers what happened; (2) the upstream revision vendored:
mattpocock/skills main, commit
`4ae2317ddb22b046e26455e4f9c9b3aaaf62212d` at fetch time, not pinned
anywhere in the repo; (3) upstream's `agents/openai.yaml` and
`CREDITS.md` deliberately not vendored.

### User attention needed?

No. Scope is unchanged (all nine planned surfaces, nothing added or
dropped) and the API surface is identical to upstream. The one body
addition is invisible to auto-invocation and to every dependent
surface; anyone tracking provenance byte-for-byte should read the API
surface changes above, but nothing needs a human decision.
