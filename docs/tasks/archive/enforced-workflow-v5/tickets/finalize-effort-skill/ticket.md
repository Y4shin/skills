---
type: ticket
subtype: feature
title: finalize-effort runs the holistic review, triages findings, and archives
status: deprecated
workflow_state: done
blocked_by:
- implementation-transition-tools
- disclosure-open-close-core
- opener-gate-and-toolsets
size: l
---

## What to build

`finalize-effort`, the model-invoked skill that absorbs the whole-effort
review and owns the archive. It is read-only toward the code it reviews and
runs one holistic pass per effort, so there is no second advisory review.

It triages every finding:

- an in-scope finding becomes an implementation ticket in the current effort,
  which stays unarchived and returns to the frontier;
- an out-of-scope or large finding becomes a proposed follow-up effort;
- a purely informational finding stays in the review artifact.

A follow-up effort is created only after a human yes. It is linked by an
additive `origin_effort` field on its map frontmatter, a field on the child,
not a graph edge, so it never enters frontier or `blocked_by` semantics. The
review artifact is moved, not copied, into the follow-up effort's directory.
The origin's review artifact still records the disposition, including the
follow-up effort's slug, so the trail reads in both directions.

An effort does not archive while a finding is undispositioned: every finding
must be resolved into tickets, turned into a follow-up effort the user
accepted and that now exists, or explicitly accepted by the user as
informational. This archive precondition is a gate, so it lives in the
finalize-effort tooling.

The skill writes the review artifact at the effort root as `type: review`,
moves it when a follow-up is accepted, and performs the archive move through
the named archive tool.

## Acceptance criteria

- [ ] `finalize-effort` exists as a model-invoked skill and opens through
      `tw_open`.
- [ ] It runs one holistic review pass and is read-only toward the code.
- [ ] Every finding is dispositioned into a ticket, an accepted follow-up, or
      an explicit informational acceptance.
- [ ] A follow-up is created only after a human yes, linked by
      `origin_effort`, with the review artifact moved into it.
- [ ] The effort does not archive while a finding is undispositioned, and the
      precondition lives in the tooling.
- [ ] The archive move uses the named tool, not the shell.
- [ ] `tests/skills.test.ts` is green.

## Blocked by

- implementation-transition-tools (ticket creation, the review artifact
  write, and the archive move).
- disclosure-open-close-core (the skill opens through `tw_open`).
- opener-gate-and-toolsets (the finalize-effort gate).

## Implementation notes

- Landed on `task/finalize-effort-skill`, merged `--no-ff` at 6b8519b on top
  of 383aa22 (the working branch was a linear descendant of that tip, so the
  merge commit is the only new history). The work is 1faacb6 (the review
  writer and the `origin_effort` link), 3d9d17e (the skill, its report
  resource, its docs page, and the shipped surface), b2ad69b (the review path
  accepted on a rewrite), and e8f2fd5 (the toolset reorder). 13 files, 1110
  insertions.
- The review writer is `tw_write_review` (`selector`, `content`, `title`,
  `findings`, `follow_up`), the only writer of
  `docs/tasks/<effort>/review.md`; it writes `type: review` and the
  tool-owned `## Dispositions` section. `dispositioned` turns true only when
  `findings` is supplied and every entry carries a disposition: an absent
  list is a first pass and leaves the flag closed, an empty list closes it as
  "(no findings)". That flag is what the landed archive gate in
  `tw_archive_effort` already read, so the gate was consumed unchanged.
- The cross-effort move is the same tool's `follow_up` mode, not a second
  writer. It leaves two artifacts: the accepted child receives the findings
  body with `dispositioned: false` (the inherited findings are not triaged
  inside the child yet), and the origin keeps the disposition record naming
  the follow-up slug with `dispositioned: true`, so the origin archives and
  the trail reads in both directions. The spec pins neither flag on the
  child, so the consequence is that a follow-up cannot archive until it
  re-triages the inherited findings through the same writer.
- `origin_effort` is an optional `tw_create_effort` argument, validated
  against a live effort and written only when supplied. It stays a map field
  only (`src/core/art.ts`), with no reference in `src/core/graph.ts`, so it
  never enters frontier or `blocked_by` semantics, as the spec requires.
- The `finalize-effort` toolset lists `tw_archive_effort` first because
  `signatureToolOf` returns the first tool private to the skill, and the
  registry comment already claimed the archive move was that signature. The
  computed value had been `tw_finalizable`; the reorder makes the derived
  value match the documented contract, and a new test pins it, so a future
  tool in this toolset must not be inserted ahead of `tw_archive_effort`.
- Verification: no linter is configured in this repo, so `npx tsc --noEmit`
  (exit 0) is the static gate. The full suite is green at 18 files / 1135
  tests against the 1104-test baseline at 383aa22. The ticket's own seam
  tests, `tests/skills.test.ts`, `tests/skill-rewire.test.ts`,
  `tests/plugin.test.ts`, `tests/gate-factory.test.ts`, and
  `tests/opener-gate.test.ts`, are all green.
- Two test surfaces moved beyond the dispatch because existing contracts
  required it: `SURVIVING_TOOLS` in `tests/skills.test.ts` gained
  `tw_create_effort` as well as `tw_write_review` (the new prose names both),
  and `WORKFLOW_SKILLS` in `tests/skill-rewire.test.ts` gained
  `finalize-effort` so the per-skill report seam covers the new resource.
- One piece of surface this ticket needed but did not own: the top-level
  `README.md` carried no skill inventory or Model-invoked section, so it
  gained a grouped list of all 29 promoted skills (each name linked to its
  `SKILL.md`) for `finalize-effort` to sit under Model-invoked and for the
  AGENTS.md README mandate to hold. `docs-resync` should audit that inventory
  rather than treat it as frozen. Pre-existing drift left alone in a file this
  ticket edited: `skills/engineering/README.md:31` links
  `./report-bug/SKILL.md`, but `report-bug` lives under `skills/deprecated/`;
  that is `docs-resync`'s to fix as well.
- Acceptance boxes stay unticked, matching every other landed ticket in this
  effort. The criteria were checked against the merged tree and recorded
  here instead.
- The deviation report at `deviation-reports/finalize-effort-skill.md` is
  folded into this landing docs commit. Its "user attention needed" item, the
  new README inventory, is the `docs-resync` audit note above; no other item
  is outstanding work.