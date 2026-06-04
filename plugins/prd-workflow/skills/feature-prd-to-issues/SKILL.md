---
name: feature-prd-to-issues
description: Break a feature PRD (kind:feature) into independently-grabbable issues as tracer-bullet vertical slices, wire the PRD issue + slices with native dependencies (and sub-issues under an epic), and write committed slice docs. Use after /prd-workflow:create-feature-prd, or when converting a feature spec into work issues. Don't use it on a capability PRD (use capability-prd-to-issues) or to author the PRD itself (use create-feature-prd). Provider-aware (gh/fgj/local).
allowed-tools: Bash(python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz":*), Bash(python3 ${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz:*)
---

# Feature PRD → Issues

Convert a `kind: feature` PRD into a set of independently-grabbable issues using
**tracer-bullet vertical slices**, wired with the flat native tracker model (see the injected
reference): the PRD issue is `blocked_by` its slices; if the PRD belongs to an epic, the PRD
and every slice attach as native sub-issues of that epic.

Detected forge: **!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge git_type`** — !`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge ownership_note`

Per-provider commands come from `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge <key>`, injected at the step that
uses them. The PRD/artifact reference (frontmatter + `docs/prd/<slug>/` layout + lifecycle)
is injected below.

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" reference`

`prd_tool.pyz` is the bundled helper that reads/writes this frontmatter — invoke it as
`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" <subcommand>` (`--help` for the full
surface). The current planning-tree inventory is injected here:

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" list`

The project profile (architecture layers, orientation docs) is injected below when available
— its "Architecture layers → Feature" section defines what a vertical slice means here. If
empty, explore the codebase to learn the layering and domain glossary:

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" profile`

## Step 0 — Provider + PRD

Verify auth, then locate the PRD at `docs/prd/<slug>/prd.md` and **assert `kind: feature`** —
the helper exits non-zero (and points at `/prd-workflow:capability-prd-to-issues`) on a
mismatch:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" assert-kind <slug> feature
```

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge auth_check`

Ensure the label scheme exists (idempotent):

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge ensure_labels`

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
- Each slice has a concrete, single-test acceptance — pairs with `/prd-workflow:analyse-issue` →
  `/prd-workflow:implement-issue`.
</vertical-slice-rules>

Each slice is **HITL** (needs human interaction — a design/architecture decision) or
**AFK** (implementable + mergeable autonomously). Prefer AFK where possible.

## Step 3 — Quiz the user

Present the breakdown as a numbered list; per slice: **Title**, **Type (HITL/AFK)**,
**Blocked by**, **User stories covered**. Ask: granularity right? dependencies correct?
merge/split any? HITL vs AFK correct? Iterate until approved.

## Step 4 — Publish (flat native model)

Read the injected reference for the tracker rule: **sub-issue = epic-only; dependencies =
everything else.** Check `prd.md` frontmatter for an `epic:` field — present ⇒ this PRD belongs
to an epic; absent ⇒ standalone.

Create-issue form for the detected provider:

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge cmd_create_issue`

Add a native dependency (make `<issue#>` blocked-by `<blocker#>`):

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge cmd_add_dependency`

Attach a child as a sub-issue of the **epic** (only used when `epic:` is set):

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge cmd_attach_subissue`

1. **Create the PRD issue** (labels `prd`, `kind:feature`): body = PRD summary. It is a regular
   issue — it does **not** own the slices as sub-issues. Record its number as `prd_issue:`:
   ```bash
   python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" set <slug> prd_issue <prd#>
   ```
2. For each slice, in dependency order:
   - Create the issue with labels `kind:feature`, `mode:hitl|afk`, `status:todo` (+
     `milestone:M<NN>`). Body uses the template below (`Part of #<prd>` + blockers).
   - Add **PRD `blocked_by` this slice** (the PRD can't close until its slices land).
   - For each blocker in the slice's `## Blocked by`, add **slice `blocked_by` blocker**.
   - Write `docs/prd/<slug>/slices/<n>-<slug>.md` from the template in `references/artifacts.md`.
3. **If `epic:` is set** (`prd_tool.pyz get <slug> epic`)**:** attach the PRD issue **and every
   slice issue** as native sub-issues of the epic (`epic_issue:` from
   `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" get <epic-slug> epic_issue`). Add any
   **PRD `blocked_by` PRD** edges the epic's `prds[].blocked_by` calls for. Then record the link
   on the epic and set its status:
   ```bash
   python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" epic set-prd-issue <epic-slug> <slug> <prd#>
   python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" set <epic-slug> status in-progress
   ```
   (also tick its checklist item on the epic issue).
4. Record the slices + status on the PRD, then commit the `docs/prd/` changes (PRD dir, and the
   epic dir if touched):
   ```bash
   python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" set-slices <slug> <#a> <#b> ...
   python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" set <slug> status issues-created
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
number, and (if under an epic) the epic issue number with its updated checklist.

## Error handling

- If `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge` prints `NOT_A_GIT_REPO`, the
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
- **Tracker rule:** sub-issue parenting is epic-only; PRD↔slice and all ordering are native
  dependencies. The PRD issue never owns slices as sub-issues.
- Do not modify unrelated issues.
