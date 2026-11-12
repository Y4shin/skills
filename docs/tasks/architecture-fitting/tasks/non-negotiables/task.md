---
type: task
subtype: grilling
title: Settle the architecture fitting non-negotiables
status: stable
workflow_state: done
blocked_by: []
---

## Decision to settle

The effort's non-goals and non-negotiable facts, including the effort-level
success test, for a standalone skill that fits an architecture over a
codebase and updates an existing architecture to the current code via git
diffs.

## Recorded facts from intake

**Raw request (verbatim):**

> Basically, I want to change the order of implementation up a bit. I want
> to first create a new effort, that has one goal: create a skill,
> (supported by tools), that takes a codebase and fits such an architecture
> over it (the whole AU, sub-AU, and static code analysis stuff), as well as
> a skill (or sub-mode of the main skill), that takes the codebase as it is,
> and an existing architecture (which always should have a git commit hash of
> when it was created attached to it) and then uses git code diffs to create
> a modified version of the architecture of the old version of the code by
> updating it to be in-line with the current version of the code, while
> highlighting the parts that changed since then, so a user can easily check
> out what changed on an architectural level. What is to happen with the old
> architecture-tracking effort I will yet decide, leave it as is for now.

**Destination (one line, the user's words):** a standalone skill, supported
by tools, that fits an architecture (architectural units, sub-units, static
code analysis) over a codebase, plus a skill or sub-mode that takes the
codebase as it is and an existing architecture with its creation commit
hash, and uses git code diffs to produce an updated architecture in line
with the current code, highlighting the parts that changed since then.

**Actor:** both the operator and agents. The operator uses the skill to
understand code changes, and existing codebases they are new to, on an
architectural level. Agents mainly need the birds-eye view of the codebase,
which they usually utterly lack, so they can plan code changes that are
more architecturally sound; the diffs are less for them.

**Classification:** feature.

**Stories:**

1. As an operator, I point the skill at a codebase that has no architecture
   yet, so that I get an architecture fitted over it: units, sub-units,
   ownership and boundaries, backed by static code analysis. The skill asks
   where to write the result, suggesting `${REPO_ROOT}/docs/architecture/`
   as the default; any location is allowed, even outside the repo, for
   repos where the architecture cannot be committed with the repo.
2. As an operator, I point the skill at the current codebase together with
   an existing architecture and the commit hash it was created at, so that
   I get an updated architecture in line with the current code. The skill
   always asks where to source the comparison architecture from.
3. As an operator, I read the update's highlighted changes, so that I see
   what changed on an architectural level since the old version without
   re-reading the whole model.
4. As an operator, I rely on every architecture carrying the commit hash of
   the code state it describes, so that I always know which code it
   reflects.
5. As a package developer, I want the core logic, instructions and prose
   that create these architecture descriptions usable independently of the
   user-facing skill, so that other skills can reuse it without going
   through the user-facing skill's input and output wiring.

**Constraints:**

- Every architecture carries the git commit hash of the code state it was
  created from.
- No canonical architecture location is enforced. The default write target
  is `${REPO_ROOT}/docs/architecture/`, but the skill asks before writing
  where to write to, and always asks where to source the comparison
  architecture from. Writing outside the repo is supported.
- The update capability may be a separate skill or a sub-mode of the main
  skill; undecided at intake.
- The live `architecture-tracking` effort is left as-is; what happens to it
  is an open decision for the operator. This effort reorders the
  implementation: the standalone fitting and updating skill comes before
  the workflow-integration work that effort planned.
- Related live effort: `architecture-tracking`
  (`docs/tasks/architecture-tracking/map.md`). Its unit model design
  (architectural units, ownership rules, facts provider, evidence)
  is the design this effort builds on, and its planning tasks
  (`unit-model-schema`, `tree-sitter-provider`, `views-and-facts-refresh`,
  `boundary-check-tooling`) overlap this effort's scope. Its map also
  names the retirement of `codebase-design` and
  `improve-codebase-architecture`, which is a decision the operator has
  deferred.

## Notes

## Shared-understanding confirmation, 2026-11-12

The operator explicitly confirmed the settled scope and success test:

- Exercise fit, diff, and update on this TypeScript repository and a real Go repository. Fit produces reviewed units, sub-units, source ownership, and static-code evidence. Diff produces a full updated architecture with highlights and useful change notes. Update turns that reviewed copy into a clean authoritative architecture without reinterpretation.
- Every architecture records its code commit. Fit, diff, and update analyze clean `HEAD`, using a detached worktree at `HEAD` when the working tree is dirty.
- Fit asks before writing, suggests `${REPO_ROOT}/docs/architecture/`, and allows destinations outside the repository. Diff and update always ask for the source architecture. Diff refuses a missing or invalid base commit rather than guessing.
- Preserve the fitted assignments, including agent-authored assignments. Refresh tool-derived facts and make localized unit or sub-unit additions where needed. Broader redesign requires operator agreement.
- Update consumes only the reviewed diff and removes review markup. The source architecture remains unchanged unless replacement is explicitly confirmed.
- Core architecture instructions and logic remain reusable without the user-facing input and output flow.
- This effort leaves `architecture-tracking` and the existing architecture skills unchanged. It adds no task-workflow integration, no dirty-tree support, and no validated support claim beyond TypeScript and Go.

No non-negotiable decision remains open. Detailed schemas, extraction design, review-markup representation, and packaging are downstream planning work rather than unsettled effort-level facts.

## Round 1 answers, 2026-11-12

- **Acceptance coverage:** TypeScript and Go. Prove architecture fitting and updating in this TypeScript repository and a real Go repository. Keep the model language-agnostic, but make no unproven support claim for other languages. Rejected for this version: all five target languages as an acceptance gate, and TypeScript only.
- **Fitting authority:** guided fitting. Static analysis supplies evidence and proposes architectural units, sub-units, source ownership, and relationships. The user reviews and corrects the proposal before the final architecture is written. Rejected: fully automatic fitting without review, and facts-only extraction with no proposed architecture.
- **Update range:** initially discussed as the source architecture's recorded base commit to the current working-tree state, whether clean or dirty. The exact representation of dirty-tree provenance was left for round 2.
- **Output modes:** the original two-mode design is incomplete. In addition to creating a new architecture and producing an annotated architecture diff, the effort needs an update mode that turns the reviewed diff into a new authoritative architecture with no diff annotations. Rejected: treating an annotated diff as the authoritative copy, and requiring a clean recreation from scratch for ordinary updates.

## Round 2 answers, 2026-11-12

- **Update range correction:** dirty working-tree support is dropped because it conflicts with the mandatory commit-hash provenance. Diff always compares the source architecture's recorded base commit to current `HEAD`. If the working tree is dirty, the tooling checks `HEAD` out in a detached worktree and analyzes that clean state instead of the working tree.
- **Diff and update:** update consumes the reviewed diff. A diff architecture is already a complete updated copy, with incorporated changes highlighted and change notes added where useful. Turning it into a clean authoritative architecture neither needs the old architecture as a reference nor repeats architectural interpretation. Update removes the diff annotations and change-only notes.
- **Interpretation stability:** preserve the fitted architecture as it is, including module and file assignments that an agent originally proposed rather than a human wrote. New code should join an existing architectural unit when it fits, with new sub-units created where needed. Do not re-evaluate the whole design from scratch. Always adjust facts derived through tools from the code. An agent may propose broader rethinking only when the code change is substantial enough to warrant it, and must align that decision with the operator before applying it.
- **Authority handoff:** only after explicit confirmation. Write the clean result to the requested destination and leave the source untouched unless the user explicitly chooses to replace it. Confirmation makes the new copy authoritative.

### Alternatives rejected across both rounds

- Fully automatic fitting without review, and facts-only extraction with no proposed architecture.
- Dirty working-tree analysis, snapshot commits to represent dirty state, and dirty-state fingerprints. The operator chose clean-`HEAD` analysis instead.
- Repeating the base-to-code comparison during update, or combining annotated and clean output into one operation.
- Re-fitting the entire architecture during diff or update, and preserving only human-authored content while allowing agent-authored assignments to drift.
- Automatic replacement of the source architecture, and a mandatory versioned-copy index.

### Consequences and remaining confirmation

The success test must exercise fit, diff, and clean update in TypeScript and Go. The diff operation produces a full highlighted architecture, not merely a change report. Update is the mechanical removal of review markup from that reviewed full copy. The final shared-understanding summary must confirm the non-goals, provenance rules, preservation rules, and effort boundary against `architecture-tracking`.

## Round 1 answers, 2026-11-07

- **Acceptance coverage:** TypeScript and Go. Prove architecture fitting and updating in this TypeScript repository and a real Go repository. Keep the model language-agnostic, but make no unproven support claim for other languages. Rejected for this version: all five target languages as an acceptance gate, and TypeScript only.
- **Fitting authority:** guided fitting. Static analysis supplies evidence and proposes architectural units, sub-units, source ownership, and relationships. The user reviews and corrects the proposal before the final architecture is written. Rejected: fully automatic fitting without review, and facts-only extraction with no proposed architecture.
- **Update range:** the source architecture's recorded base commit to the current working-tree state, whether that working tree is clean or dirty. The earlier choices of HEAD-only or arbitrary committed targets do not express the requested behavior. Exact provenance for a dirty tree remains to be settled because no commit identifies that state by itself.
- **Output modes:** the original two-mode design is incomplete. In addition to creating a new architecture and producing an annotated architecture diff, the effort needs an update mode that turns the reviewed diff into a new authoritative architecture with no diff annotations. The clean copy must preserve the original interpretation rather than re-fitting from scratch. Rejected: treating an annotated diff as the authoritative copy, and requiring a clean recreation from scratch for ordinary updates. The interaction between diff and update remains to be settled.

### Consequences and remaining questions

The success test must exercise all three operations: fit, diff, and update. Dirty working-tree provenance needs an explicit representation. The next round must settle whether update consumes the reviewed diff, which existing architecture content is preserved by default, and how the new authoritative copy replaces or supersedes the old one.
