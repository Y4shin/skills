---
type: ticket
subtype: feature
title: Reconcile the end-of-effort review findings against the shipped v5
status: stable
workflow_state: ready
blocked_by: [docs-resync]
size: xl
---

## What to build

The effort's tickets all landed, and the end-of-effort review (a whole-effort
pass over `git diff 2ab1cc9...HEAD`) found twenty issues that no ticket owns.
Six of them were fixed immediately after the review; this ticket closes the
remaining fourteen and amends the three claims the code does not support.

Provenance: the review ran on 2026-10-31 with the effort at `8e1080c`, which
is the fixed point for the diff and the commit where the six already-closed
items landed. Do not re-derive the findings. Each one below names its fix and
the evidence that grounds it.

Four design decisions are already settled. Do not relitigate them:

1. The write lockdown keeps its structural claim: one new named writer for the
   ticket doc, plus two narrow path exemptions for scratch and evidence.
2. Tickets run one at a time. Level concurrency is documented behaviour that
   nothing implements, so the docs change, not the code.
3. The overview's read-only table routes each row to the phase that declares
   the tool. Read-only tools are not added to the always-declared set.
4. This is one ticket, with the four sections landing in the order below,
   because the behavioural changes constrain the prose that describes them.

## 1. Make the lockdown cover the workflow's own writes

The guard refuses the built-in `write` and `edit` on all of `docs/tasks/**`,
"independent of the active tool set" (`src/pi.ts`, `guardTaskTreeWrites` and
`isTaskTreePath`). In a session that loads this extension, three shipped
procedures therefore fail:

- `agents/tdd-worker.md` writes `.work/uncertainty.md` (the designed escape
  hatch, which the chain's host gate then looks for).
- `agents/deviation-reporter.md` writes
  `tickets/<slug>/deviation-reports/<slug>.md`.
- `agents/land-worker.md` appends `## Implementation notes` to the ticket doc
  with `edit`.

The fix has two parts.

- **Exempt scratch and evidence.** `.work/` and `deviation-reports/` sit beside
  an artifact rather than being artifacts; neither type is in `TYPE_LEAVES`.
  Narrow `isTaskTreePath` so those two segments are allowed, and name the
  exemption in `lockdownReason` and in `docs/repo-gating.md` so a refusal that
  does fire is still accurate.
- **Add `tw_write_ticket_note`.** A ticket doc is an artifact, so its
  implementation-notes append goes through a named writer: the tool replaces or
  appends the `## Implementation notes` section of a ticket in a live effort,
  refuses a non-ticket and an empty note. Disclose it to `implement-ticket`,
  which performs the landing that writes it, and point `land-worker` at it
  instead of `edit`.

Acceptance: the three procedures above complete in a session with the guard
active, and a refused write still names the named tool that would have worked.

## 2. Declare the ticket loop serial

`skills/engineering/implement-ticket/SKILL.md:53` and both autonomous
resources claim tickets within a level run concurrently.
`resources/feature/autonomous.md:71` and
`scripts/ticket-chain.js:3` say one chain runs over "the shared repo cwd", and
no worktree mechanism exists anywhere in `skills/engineering/`. Two concurrent
chains would `git checkout` different `task/<slug>` branches in one tree, and
the per-ticket `tw_state_set task <slug>` inside the loop is last-writer-wins.

Rewrite the loop as serial: the dependency levels stay, and they stay strict
barriers, but tickets run one at a time in level order. Amend the skill, both
autonomous resources, and the async-dispatch callout. Amend arch-spec story 28
and the arch-spec note that claims the shared working directory is never
corrupted. Record worktree isolation as the follow-up effort's seed rather than
implementing it here.

## 3. Route the overview's read-only table to the owning phases

`task-workflow-overview` has no `SKILL_REGISTRY` entry, so it can never open and
never discloses anything. Its read-only query table
(`skills/engineering/task-workflow-overview/SKILL.md`, "Read-only queries") and
the same table in `docs/engineering/task-workflow-overview.md` offer
`tw_finalizable`, `tw_dependency_levels`, `tw_frontier`, `tw_list`, `tw_show`,
and `tw_state`, all `defaultActive: false`. Only the `tw_next` row is live.

Rewrite each row to name the phase that declares the tool and the invocation
that opens it, keeping `tw_next` as the one directly callable answer. Then
resolve `tw_show`: it is named by this table and by no other skill, and
`src/disclosure.ts`'s comment claiming it is `skill-creator`'s private
signature tool is false, because that entry has three other private tools.
Either drop it from that toolset or keep it and correct the comment, whichever
the rewritten table needs.

## 4. Remove the retired bug substrate from live instructions

`implement-ticket/SKILL.md:201-211`, `resources/feature/autonomous.md:205`, and
`resources/bug/autonomous.md:116` still instruct frontmatter edits on
`docs/bugs/<slug>.md`, then `git mv` into `docs/bugs/archive/`, reasoning that
the path is outside the write guard. The spec retired that substrate: it is a
static archive now, and the implementation ticket is the defect's record.

Delete the bug-closure step from the skill and both resources, and repoint
`skills/engineering/code-review/SKILL.md:52` to read a `docs/bugs/` path only as
an archive reference. Pin that no live `skills/engineering/**` or
`docs/engineering/**` prose instructs a write under `docs/bugs/`.

## 5. Amend the three claims the code does not support

- **`ready_for_spec` auto-clear.** The spec says the flag clears when a
  planning task is added, reopened, or moved out of done. No writer can reopen
  or un-done anything: `tw_mark_done` and `tw_mark_blocked` refuse done items,
  and `tw_state_set` takes pointers only. `blocked_by` edges likewise cannot be
  repaired after creation. Amend `spec.md` and the arch-spec's "the auto-clear
  surface is fully landed" note to the writers that exist, and record reopen
  plus edge repair as a follow-up effort, not a silent gap.
- **The one-owner rule.** "Only `implement-ticket` sets a ticket's
  `workflow_state: done`" is false in two sanctioned ways: `wayfinder`'s
  planning-task half of `tw_mark_done`, and `tw_split_ticket`'s supersede of the
  original, which the arch spec itself sanctions. Name both exceptions in the
  prose that states the rule, in the skill and the arch spec.
- **Report-template coverage.** Story 61 says every workflow skill ends its run
  with a completion report; nine do. Name the nine run-ending skills in the
  spec instead of claiming universal coverage.

Also amend `spec.md`'s "the effort's final ticket is the documentation re-sync"
line: this ticket is now the effort's close.

## 6. Mechanical defects

- **One effort-root writer.** `tw_write_spec` and `tw_write_architecture`
  duplicate the empty-body guard, the create-or-refuse message, and the
  `readArtifactTitle(map.md) ?? basename` title fallback. Extract one
  create-or-update helper with the per-kind validation passed in.
- **One index writer.** The `docs/tasks/index.md` Live/Archived rewrite exists
  twice and has already drifted: the map-creation path sorts `live` only, the
  archive path sorts both. Extract `writeTasksIndex(root, { live, archived })`.
- **One close-out.** The per-ticket close-out is written three times, in
  `SKILL.md`, `resources/feature/autonomous.md`, and
  `resources/bug/autonomous.md`, and has drifted: the feature copy drops the
  `git rev-parse task/<ticket-slug>` detail and the source of the notes. Keep
  the canonical sequence once, point the resources at it, and leave only the
  bug-specific step in the bug resource. Pin that the numbered sequence appears
  once.
- **Doctor scope.** `task-workflow-doctor/SKILL.md` files the manifest,
  `docs/dev-env.md`, `docs/testing.md`, and `docs/adr/` rows under "Missing
  scaffolding", and one row says to edit the manifest while the same page says
  never to edit the tree. Narrow the section to the scopes the resync ticket
  defined (a missing `CONTEXT.md`, a missing `docs/tasks/`) and pin it.
- **Retired vocabulary.** The pin added by `docs-resync` checks `CONTEXT.md`
  only, so the retired terms survive elsewhere: the `tw_show` tool description
  still offers "map, task, or slice", and `implement-ticket` uses the artifact
  sense of the word. Widen the check to live prose and tool descriptions using
  targeted patterns (`slices/`, `per-slice`, `tw_slices`, `mode: hitl`, the
  retired skill names) rather than banning the English word, then fix each hit.

## 7. Gates and hygiene

- **Typecheck the tests.** `tsconfig.json` includes `src/**` only, so the
  recorded `tsc --noEmit` has never seen the roughly 6,500 changed test lines.
  Add `tsconfig.test.json` and a `typecheck:tests` script, fold it into the CI
  protocol in `docs/testing.md`, and fix the 36 errors it exposes: 12 in
  `tests/gate-factory.test.ts`, 7 in `tests/repo-gate.test.ts`, 7 in
  `tests/integration/disclosure.test.ts`, the rest type noise. They are
  test-stub signature mismatches, not product defects.
- **Widen the em-dash guard.** It checks four hardcoded files, so it cannot
  catch a new one. Run it over the corpus with the exemptions the other corpus
  checks already carry.
- **Sweep the changesets.** `.changeset/` holds four pending entries, three of
  which describe `implement-task`, a retired skill, so the next release would
  publish notes for it. Delete them and add one `major` entry for v5. The
  version bump stays a release action, not this ticket's.
- **Delete the orphaned flow map.** `docs/workflow-flows.md` is v4 prose that
  still says "v5 in flight", and nothing live links it. Delete it; the overview
  and the docs pages are the live map.
- **Retire the interim vocabulary.** "Decision task" appears in the overview and
  in a landed v4 test that pins the phrase. Change both to "planning task".
- **Delete the stale handoff.** `handoff-enforced-workflow-v5.md` at the repo
  root is a tracked 16-of-20 handoff that has drifted. Remove it.

## Acceptance criteria

- [ ] The named writer exists and is disclosed to `implement-ticket`;
      `.work/` and `deviation-reports/` are exempt from the guard; a refusal
      still names the named tool that would have worked.
- [ ] The ticket loop is documented as serial in the skill, both autonomous
      resources, and the arch spec, and the worktree gap is recorded as a
      follow-up seed.
- [ ] The overview's read-only table routes to owning phases and names no tool
      the reader cannot reach; `tw_show` is either disclosed where it is used or
      absent from the `skill-creator` toolset, with the comment corrected.
- [ ] No live prose instructs a write under `docs/bugs/`.
- [ ] The three unsupported claims in `spec.md` and the arch spec are amended,
      and reopen plus edge repair are recorded as a follow-up, not a gap.
- [ ] The two writer duplications and the triplicated close-out each have one
      implementation, with the sort drift and the dropped close-out details
      fixed.
- [ ] The doctor's "missing scaffolding" names only its two scopes.
- [ ] The retired-vocabulary pin covers live prose and tool descriptions.
- [ ] `tsc -p tsconfig.test.json` is clean and part of the recorded CI protocol.
- [ ] The em-dash guard covers the corpus.
- [ ] `.changeset/` holds exactly one major entry for v5 and no `implement-task`
      entry.
- [ ] `docs/workflow-flows.md` and `handoff-enforced-workflow-v5.md` are gone,
      "decision task" no longer appears in the overview, and
      `tests/skills.test.ts` is green.

## Blocked by

- `docs-resync`, the effort's previous last ticket. Its own amendments
  (`CONTEXT.md`, the READMEs, the retired-vocabulary pin) are the surface this
  ticket extends.

## Notes

- This ticket was opened after the effort's tickets had all landed and been
  closed out, on the strength of the end-of-effort review. That makes
  `docs-resync`'s "final ticket" framing in `spec.md` stale, which section 5
  amends.
- The six findings already closed at `8e1080c` are the reverse toolset
  invariant, the stale `FALLBACK_GATED_SKILL_NAMES`, the dead `tw_mark_blocked`
  disclosure, the stale `art.ts` comment, the em-dashes in
  `tests/pi-disclosure-apis.test.ts`, and the `pi 0.80.10` version pin. Do not
  re-open them.

## Implementation notes

The writer's reachability was settled by experiment, not by the ticket's
three options, and the experiment failed. `tw_write_ticket_note` is registered
gated and disclosed to `implement-ticket`, and `land-worker`'s `tools:`
allowlist briefly named it on the assumption that pi-core's registry refresh
activates a declarable tool a session allowlists. pi core does that for a
session the extension is loaded into, which the integration test pins, but
pi-subagents reads an agent's `tools:` frontmatter through its own loader and
refuses a gated `tw_*` name as an unavailable child tool: the landing run was
reported failed and the tool was dropped. The mechanism the ticket chose does
not exist on the agent path.

The correction keeps the one-writer decision and moves the write to the phase
that owns the tool. `land-worker`'s allowlist is `read, bash, submit_feedback`
again, its step 3 composes the note and returns it under
`## Implementation note`, and `implement-ticket` writes it through
`tw_write_ticket_note` from the landing branch before merging, committing it as
`docs(ticket): note <slug>` (SKILL.md step 8). A new invariant pins the rule
from the other side: an agent's `tools:` list may name no `tw_*` tool, so the
next agent that reaches for one fails in the suite rather than at landing. The
harness comment now records that its `tools` option is a pi-core seam and not
the agent path.

The rest of the ticket landed as designed. `tw_write_ticket_note` exists with
its refusals; `isTaskTreePath` exempts `.work/` and `deviation-reports/` with
traversal still blocked, and `lockdownReason` names both exemptions and the
writer a refused write should reroute to. `tw_show` is disclosed to
`wayfinder`, which is the phase the read-only table sends the reader to, and
stays in `skill-creator`, whose signature tool is now `skill_validate`; the
registry comment is corrected. Five doctor resources were deleted with the
narrowed scope, and `setup-workflow` stops scaffolding `docs/bugs/`, which
section 4 implies though it does not name it. The two writer duplications and
the triplicated close-out each have one home, and the index writer's sort drift
is fixed. The em-dash guard runs over the corpus and now applies the
`CORPUS_EXEMPTIONS` and `DEAD_SURFACE_EXEMPT_FILES` sets instead of only the
changelog, after its comment was found to claim exemptions the code did not
apply.

Two deviations the report raised were resolved rather than deferred, and one
scoped out. The overview's "where am I?" row named phases that could write the
state pointers but not read them, so `tw_state` joins `wayfinder`'s and
`implement-ticket`'s toolsets and an invariant now fails if a phase carries
`tw_state_set` without `tw_state`. `docs/repo-gating.md`'s Background section
pointed at four paths that no longer exist, including the retired `maps/`
subtree, and now points at the archived `gate-skills-by-repo` effort. The
report left two scope calls standing as they were: the five deleted doctor
resources and the whole-corpus em-dash rewrites, which comply with the repo
rule either way.

One known gap the ticket records rather than fixes: a missing
`docs/tasks/state.yaml` no longer has a diagnosis path in the doctor, because
the narrowed scope leaves it nothing to say. Verification at the landing tip:
`npx tsc --noEmit` and `npx tsc -p tsconfig.test.json` both exit 0, full suite
18 files and 1182 tests against the 1146 baseline at 5c7aa33. Acceptance
checkboxes stay unticked, matching every other landed ticket in this effort.
