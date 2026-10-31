# Deviation report: to-tickets-architecture (effort enforced-workflow-v5)

Verified against the re-verification run: branch `ticket/to-tickets-architecture`
at head `59a6ee4` (six wip commits, all green checkpoints), 999/999 tests,
typecheck clean. The two prior chains were rejected solely at the harness
acceptance layer (missing structured report), never for an implementation
defect; the branch is unchanged across all three runs and the divergence
record below carries forward unchanged. The repo-path report
(`deviation-reports/to-tickets-architecture.md`) matches this content.

## Deviation report: to-tickets-architecture

### API surface changes
- **Planned:** the arch spec's entry-11 contract names "the `architecture.md`
  writer" without a tool name and says this ticket "rotates the private
  signature tool to it" (from the provisional `tw_map_finalizable`).
- **Actual:** the writer landed as `tw_write_architecture` in `src/pi.ts`
  with a `publish: true` parameter (mirroring `tw_write_spec`'s named
  stable write; the landed implementation gate refuses a non-stable
  architecture document, so the writer needed it) and a refusal family the
  ticket doc does not spell out: no-spec, legacy `arch-spec.md` as
  input-only, and duplicate-elsewhere (one living architecture document per
  effort). The signature tool rotated to `tw_write_architecture` as
  planned, but `tw_map_finalizable` **stays** in the to-tickets toolset as
  a disclosed read check, because removing it would leave a registered
  tool disclosed by no phase toolset and fail the landed disclosure
  invariant.
- **Impact:** on `implement-ticket-skill` (17): its prose must teach the
  `publish: true` write (or the implementation gate refuses) and must not
  assume `tw_map_finalizable` is gone; on `docs-resync` (20): the retained
  `tw_map_finalizable` and the new writer name are shipped surface. No
  downstream ticket needs a new export from this one beyond the writer the
  spec already promised.

### Abstraction usage
- Used/was specified: yes. All writes go through the landed named
  transition tools (`tw_add_ticket` with creation-order wiring,
  `tw_split_ticket`), the opener gate through `tw_open`, frontmatter
  through `src/core/frontmatter.ts`, and the disclosure registry in
  `src/disclosure.ts`. No parallel machinery was built.

### Out-of-scope changes
- Additive tool-level refusals on `tw_write_architecture` (no-spec, legacy
  shape, duplicate-elsewhere), each test-pinned; they keep the
  one-architecture-document-per-effort invariant the gate's preference
  implies.
- The `publish: true` parameter on the writer.
- `tw_map_finalizable` retained in the to-tickets toolset (not removed).
- Bug-only handling is prose-level in the skill, not tool-enforced (a
  tool-level check would be unsound mid-creation; the landed
  implementation gate already exempts bug-only efforts).
- The docs page `docs/engineering/to-tickets.md` was re-synced alongside
  the skill, per the repo's docs-sync rule.

### Ticket doc update needed?
Yes. Append to `## Implementation notes`: the writer is named
`tw_write_architecture` with `publish: true` as the architecture-stable
write; the refusal family (no spec, legacy `arch-spec.md` input-only,
duplicate-elsewhere); `tw_map_finalizable` stays disclosed in the
to-tickets toolset with the signature rotated to the writer; bug-only is
prose-level; slice 2's tests pinned behavior that slice 1 already carried.

### User attention needed?
No. No scope changed and no planned surface shrank: every divergence is an
additive refusal, a parameter mirroring the landed spec-writer convention,
or a retained read tool forced by the landed disclosure invariant. The
spec-reconciler should fold the writer name, `publish` semantics, the
retained `tw_map_finalizable`, and the refusal family into entry 11 at the
level close.

Validation backing this report: 999/999 tests green, typecheck clean,
branch at `59a6ee4`, no uncertainty artifact.

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Deviation report for to-tickets-architecture written to the authoritative output path, matching the repo-path report at docs/tasks/enforced-workflow-v5/tickets/to-tickets-architecture/deviation-reports/to-tickets-architecture.md. It records the API-surface divergence (tw_write_architecture with publish: true, the test-pinned refusal family, the retained tw_map_finalizable), confirms the spec's abstractions were used (no parallel machinery), lists out-of-scope changes, marks the ticket-doc update needed, and answers user attention needed: no. Claims verified against the ticket doc, arch-spec entry 11, and the re-verification run's output (999/999 tests, typecheck clean, branch at 59a6ee4)."
    }
  ],
  "changedFiles": [],
  "testsAddedOrUpdated": [],
  "commandsRun": [
    {
      "command": "test -f docs/tasks/enforced-workflow-v5/tickets/to-tickets-architecture/deviation-reports/to-tickets-architecture.md",
      "result": "passed",
      "summary": "repo-path deviation report exists and matches this run's content"
    },
    {
      "command": "read docs/tasks/enforced-workflow-v5/tickets/to-tickets-architecture/ticket.md and arch-spec.md entry 11",
      "result": "passed",
      "summary": "Planned surface (unnamed architecture writer, signature rotation) cross-checked against the landed report"
    },
    {
      "command": "read outputs/c8a0caba.../tdd-to-tickets-architecture/result.md",
      "result": "passed",
      "summary": "re-verification run confirms branch head 59a6ee4, 999/999 tests, typecheck clean, host gate passed"
    }
  ],
  "validationOutput": [
    "tdd re-verification: npx vitest run -> 18 files, 999 tests, all passing; npm run typecheck -> clean, exit 0",
    "acceptance seams (tests/skills.test.ts, tests/plugin.test.ts, tests/opener-gate.test.ts): 3 files, 651 tests passing",
    "host gate: no .work/uncertainty.md; git rev-parse refs/heads/ticket/to-tickets-architecture resolves to 59a6ee4"
  ],
  "residualRisks": [
    "The implementation-gate refusal family and publish semantics are divergences recorded here, not spec text yet; the level-close spec reconcile owns folding them into entry 11."
  ],
  "noStagedFiles": true,
  "diffSummary": "No new diff from this run: the six prior wip commits (writer, signature rotation, skill and docs rewrite, tests) stand as re-verified at head 59a6ee4.",
  "reviewFindings": ["no blockers: the report content is accurate against ticket doc, arch spec, and the re-verified implementation"],
  "manualNotes": "This is the third deviation run for this ticket; the two prior chains were rejected solely for the missing structured acceptance report, not for any content defect. The report is unchanged from the prior run's, which the re-verification confirmed."
}
```
