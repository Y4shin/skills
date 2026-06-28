---
description: Break a feature PRD (kind:feature) into independently-grabbable
  issues as tracer-bullet vertical slices, wire the PRD issue + slices with
  native dependencies (and assign the PRD issue to the epic's milestone when
  under an epic), and write committed slice docs. Use after /create-feature-prd,
  or when converting a feature spec into work issues. Don't use it on a
  capability PRD (use capability-prd-to-issues) or to author the PRD itself (use
  create-feature-prd). Provider-aware (gh/fgj/local).
model: openrouter/deepseek/deepseek-v4-flash
---

> **opencode native tools.** This build exposes the artifact-frontmatter operations as
> native tools — **prefer them** over shelling out to the CLI for these: `prd_show`,
> `prd_get`, `prd_set`, `prd_set_slices`, `prd_resolve`, `prd_assert_kind`, `prd_list`,
> `prd_slices`, `prd_finalizable`, `prd_lint`, `prd_epic_prds`, `prd_epic_set_prd_issue`,
> `prd_epic_prd_issue`, `prd_epic_tick`, `prd_epic_finalizable`. The !`…` header
> injections below (workflow-gate, reference, list, profile, forge snippets) still run
> via the bundled CLI — that is by design (a command can't call a tool).


# Feature PRD → Issues

Wherever a command below is written as `prd_tool`, run it as the absolute command printed
here (the bundled CLI) — `prd_tool` is shorthand, not a binary on your PATH:

!`node ".opencode/scripts/prd-tool.js" toolpath`

!`node ".opencode/scripts/prd-tool.js" workflow-gate`

Convert a `kind: feature` PRD into a set of independently-grabbable issues using
**tracer-bullet vertical slices**, wired with the flat native tracker model (see the injected
reference): the PRD issue is `blocked_by` its slices; if the PRD belongs to an epic, the PRD
issue is assigned that epic's milestone.

Detected forge: **!`node ".opencode/scripts/prd-tool.js" forge git_type`** — !`node ".opencode/scripts/prd-tool.js" forge ownership_note`

Per-provider commands come from `prd_tool forge <key>`, injected at the step that
uses them. The PRD/artifact reference (frontmatter + `docs/prd/<slug>/` layout + lifecycle)
is injected below.

!`node ".opencode/scripts/prd-tool.js" reference`

`prd_tool` is the bundled helper that reads/writes this frontmatter — invoke it as
`prd_tool <subcommand>` (`--help` for the full
surface). The current planning-tree inventory is injected here:

!`node ".opencode/scripts/prd-tool.js" list`

The project profile (architecture layers, orientation docs) is injected below when available
— its "Architecture layers → Feature" section defines what a vertical slice means here. If
empty, explore the codebase to learn the layering and domain glossary:

!`node ".opencode/scripts/prd-tool.js" profile`

## Step 0 — Provider + PRD

Verify auth, then locate the PRD at `docs/prd/<slug>/prd.md` and **assert `kind: feature`** —
the helper exits non-zero (and points at `/capability-prd-to-issues`) on a
mismatch:

```bash
prd_tool assert-kind <slug> feature
```

!`node ".opencode/scripts/prd-tool.js" forge auth_check`

Ensure the label scheme exists (idempotent):

!`node ".opencode/scripts/prd-tool.js" forge ensure_labels`

## Step 1 — Explore (if needed)

If you haven't already explored the area, do so. Slice titles/descriptions must use the
project's domain glossary and layering as described in the project profile's "Architecture
layers" (and its orientation docs). If no profile exists, explore the codebase to learn the
layers, their on-disk locations, and any manifest/contract the work must respect.

## Step 2 — Draft vertical slices

Break the PRD into **tracer bullet** issues. Each slice cuts a narrow but COMPLETE path
through every relevant layer end-to-end — NOT a horizontal slice of one layer.

<vertical-slice-rules>
- Each slice delivers a complete path through the project profile's "Architecture layers →
  Feature" — every relevant layer, end-to-end, plus a test.
- A completed slice is demoable / verifiable on its own.
- Prefer many thin slices over few thick ones.
- Each slice has a concrete, single-test acceptance — pairs with `/analyse-issue` →
  `/implement-issue`.
</vertical-slice-rules>

Each slice is **HITL** (needs human interaction — a design/architecture decision) or
**AFK** (implementable + mergeable autonomously). Prefer AFK where possible.

## Step 3 — Quiz the user

Present the breakdown as a numbered list; per slice: **Title**, **Type (HITL/AFK)**,
**Blocked by**, **User stories covered**. Ask: granularity right? dependencies correct?
merge/split any? HITL vs AFK correct? Iterate until approved.

## Step 4 — Publish (flat native model)

Read the injected reference for the tracker rule: **an epic is a milestone (a PRD issue joins it
via `--milestone`); native dependencies express all ordering.** Check `prd.md` frontmatter for an
`epic:` field — present ⇒ this PRD belongs to an epic; absent ⇒ standalone (no milestone).

When this PRD belongs to an epic, its PRD issue **already exists** as a placeholder created by
`/epic-to-prds` (assigned the epic milestone) — you **edit** it in place; do **not**
create a second issue. Only a standalone PRD creates a fresh issue. Forms for the detected
provider (edit fills a placeholder; create is standalone-only; dependency wires slices):

!`node ".opencode/scripts/prd-tool.js" forge cmd_edit_issue`
!`node ".opencode/scripts/prd-tool.js" forge cmd_create_issue`
!`node ".opencode/scripts/prd-tool.js" forge cmd_add_dependency`

1. **The PRD issue** (body = PRD summary):
   - **If `epic:` is set** (`prd_tool get <slug> epic`): find the placeholder and **edit** it
     — set the real title + body and ensure labels `prd`, `kind:feature` (keep its milestone). Get
     the number with:
     ```bash
     prd_tool epic prd-issue <epic-slug> <slug>
     ```
   - **Else (standalone):** create a new PRD issue (labels `prd`, `kind:feature`; no milestone).
   - Record the number as `prd_issue:`:
     ```bash
     prd_tool set <slug> prd_issue <prd#>
     ```
2. For each slice, in dependency order (slices carry **no** milestone):
   - Create the issue with labels `kind:feature`, `mode:hitl|afk`, `status:todo`. Body uses the
     template below (`Part of #<prd>` + blockers).
   - Add **PRD `blocked_by` this slice** (the PRD can't close until its slices land).
   - For each blocker in the slice's `## Blocked by`, add **slice `blocked_by` blocker**.
   - Write `docs/prd/<slug>/slices/<n>-<slug>.md` from the template in `references/artifacts.md`.
3. **If `epic:` is set:** the epic already recorded this PRD's issue and the PRD↔PRD order (wired
   by `/epic-to-prds`). Just move the epic to in-progress:
   ```bash
   prd_tool set <epic-slug> status in-progress
   ```
4. Record the slices + status on the PRD, then commit the `docs/prd/` changes (PRD dir, and the
   epic dir if touched):
   ```bash
   prd_tool set-slices <slug> <#a> <#b> ...
   prd_tool set <slug> status issues-created
   ```

<issue-template>
## Part of
#<prd> (PRD: `docs/prd/<slug>/prd.md`)

## What to build
End-to-end behaviour of this vertical slice — not layer-by-layer implementation. Avoid file
paths / code snippets unless a snippet encodes a decision more precisely than prose (state
machine, schema, type shape).

## Acceptance criteria
- [ ] …

## Blocked by
- #<n> — <reason>   (or "None — can start immediately")
</issue-template>

After publishing, report: `#<n> · <title> · HITL|AFK · blocked-by: …` per slice, the PRD issue
number, and (if under an epic) the epic milestone it was assigned to.

## Error handling

- If `prd_tool forge` prints `NOT_A_GIT_REPO`, the
  directory isn't a git repo — tell the user to run `git init` first and stop.
- If it prints `UNKNOWN_FORGE`, the repo has a remote this workflow doesn't recognise (not
  GitHub/Forgejo) — surface it and stop; don't invent CLI calls. A repo with no remote resolves
  to the built-in `local` tracker — that's expected, not an error; it uses the same branch
  workflow (no remotes/PRs) and drives `prd_tool tracker` for issues.
- If `auth_check` reports unauthenticated, tell the user to authenticate (`gh auth login` /
  `fgj login`) and stop before creating anything.
- If the injected `references/artifacts.md` is empty/missing, the repo isn't set up for this
  workflow — stop and say so rather than guessing the frontmatter schema or slice template.

## Constraints

- **kind:feature only** — abort on a capability PRD.
- **English**; **no speculative scope** — surface gaps as questions, don't invent slices.
- **Tracker rule:** an epic is a milestone (the PRD issue joins it via `--milestone`); PRD↔slice
  and all ordering are native dependencies. There are no epic issues or sub-issues.
- Do not modify unrelated issues.
