---
name: epic-to-prds
description: Decompose an epic (kind:epic) into an ordered set of child PRDs, create the epic milestone (an epic is a milestone, not an issue), and hand off to /prd-workflow:create-feature-prd or /prd-workflow:create-capability-prd per child with seeded context. Use after /prd-workflow:create-epic. Don't use it on a feature/capability PRD (use the matching prd-to-issues skill). Provider-aware (gh/fgj/local).
allowed-tools: Bash(python3 *)
---

# Epic → PRDs

Wherever a command below is written as `prd_tool`, run it as the absolute command printed
here (the bundled CLI) — `prd_tool` is shorthand, not a binary on your PATH:

!`python3 "${CLAUDE_SKILL_DIR}/../../scripts/prd_tool.pyz" toolpath`

!`python3 "${CLAUDE_SKILL_DIR}/../../scripts/prd_tool.pyz" workflow-gate`

Convert a `kind: epic` artifact into an **ordered decomposition plan** of child PRDs and an
**epic milestone** that will group them (an epic is a milestone, not an issue — child PRD issues
join it). This skill plans + hands off — it does **not** write the
child PRD bodies (each child gets its own deep `/prd-workflow:create-*-prd` grilling so the
specs stay sharp).

Detected forge: **!`python3 "${CLAUDE_SKILL_DIR}/../../scripts/prd_tool.pyz" forge git_type`** — !`python3 "${CLAUDE_SKILL_DIR}/../../scripts/prd_tool.pyz" forge ownership_note`

Per-provider commands come from `prd_tool forge <key>`, injected at
the step that uses them. The PRD/artifact reference (three tiers + frontmatter + tracker shape +
lifecycle) is injected below.

!`python3 "${CLAUDE_SKILL_DIR}/../../scripts/prd_tool.pyz" reference`

`prd_tool` is the bundled helper that reads/writes this frontmatter — invoke it as
`prd_tool <subcommand>` (`--help` for the full
surface). The current planning-tree inventory is injected here:

!`python3 "${CLAUDE_SKILL_DIR}/../../scripts/prd_tool.pyz" list`

The project profile (architecture layers) is injected below when available — its "Architecture
layers" section grounds the feature-vs-capability split in Step 1. If empty, infer the split
from what each child delivers and the codebase:

!`python3 "${CLAUDE_SKILL_DIR}/../../scripts/prd_tool.pyz" profile`

## Step 0 — Provider + epic

Verify auth, then locate the epic at `docs/prd/epics/<slug>/epic.md` and **assert `kind: epic`** —
the helper exits non-zero (and names the right skill) on a mismatch:

```bash
prd_tool assert-kind <slug> epic
```

!`python3 "${CLAUDE_SKILL_DIR}/../../scripts/prd_tool.pyz" forge auth_check`

Ensure the label scheme exists (idempotent — the placeholder PRD issues created in Step 3 carry
`prd` / `kind:*` / `status:todo`):

!`python3 "${CLAUDE_SKILL_DIR}/../../scripts/prd_tool.pyz" forge ensure_labels`

## Step 1 — Draft the child-PRD decomposition

Break the epic into the **fewest coherent PRDs** that each stand alone as a feature or a
capability:

<decomposition-rules>
- Each child is exactly one PRD: a `kind: feature` (one component's user-facing behaviour) or
  a `kind: capability` (one foundational unit — see the project profile's "Architecture layers
  → Capability" — named with its first consumer).
- Put the **shared / foundational work** into capability PRD(s) that land **before** the
  feature PRDs that consume them.
- Give each child a slug, a one-line scope, and its `blocked_by` (other child slugs).
- Prefer a small number of substantial PRDs — the slices inside each are where granularity
  lives, not here.
</decomposition-rules>

## Step 2 — Quiz the user

Present the decomposition as a numbered list; per child: **slug**, **kind (feature/capability)**,
**one-line scope**, **blocked-by**. Ask: right split into feature vs capability? foundational
work correctly front-loaded? dependency order correct? merge/split any? Iterate until approved.

## Step 3 — Create the epic milestone, the PRD issues, and record the plan

All PRD issues are created **now, up front** (as placeholders), so the milestone's progress bar
reflects the *whole* epic from the start — not just the PRDs already built. Each is filled in
later (not recreated) by its `/prd-workflow:*-prd-to-issues` run.

Create-milestone form, create-issue form, and dependency form for the detected provider:

!`python3 "${CLAUDE_SKILL_DIR}/../../scripts/prd_tool.pyz" forge cmd_create_milestone`
!`python3 "${CLAUDE_SKILL_DIR}/../../scripts/prd_tool.pyz" forge cmd_create_issue`
!`python3 "${CLAUDE_SKILL_DIR}/../../scripts/prd_tool.pyz" forge cmd_add_dependency`

1. **Create the epic milestone**, titled the epic's `title:` (child PRD issues join it by that
   title). Record the number it prints as `epic_milestone:`:
   ```bash
   prd_tool set <slug> epic_milestone <ms#>
   ```
2. Fill `prds:` in `epic.md` with the ordered plan (`slug`, `kind`, `issue: null`, `blocked_by`)
   by editing the file directly (it's a structured block), then write the `## Decomposition`
   section (the same list, with rationale). Verify with
   `prd_tool epic prds <slug>`.
3. **Create one placeholder PRD issue per child**, in plan order — labels `prd`, `kind:<kind>`,
   `status:todo`, assigned the epic milestone (`--milestone "<epic-title>"`), body a short
   placeholder (e.g. *"Placeholder — filled in when this PRD is built via
   /prd-workflow:\<feature|capability\>-prd-to-issues."*). Record each number:
   ```bash
   prd_tool epic set-prd-issue <slug> <prd-slug> <#>
   ```
4. **Wire the PRD↔PRD order**: for each child's `blocked_by`, add **PRD `blocked_by` PRD** edges
   between the issues you just created (all of them exist now).
5. Set the status, then commit the `docs/prd/epics/<slug>/` changes:
   ```bash
   prd_tool set <slug> status prds-planned
   ```

Each child PRD issue now exists as a placeholder. The per-child
`/prd-workflow:create-*-prd` → `/prd-workflow:*-prd-to-issues` runs **edit** their placeholder
(they do not create a second issue) and add the slice issues under it.

## Step 4 — Hand off (dependency order, unblocked children first)

For each child, in dependency order, print the command to run, seeding the epic context:

- capability → `/prd-workflow:create-capability-prd` for `<scope>` — set `epic: <epic-slug>` in
  its frontmatter.
- feature → `/prd-workflow:create-feature-prd` for `<scope>` — set `epic: <epic-slug>` in its
  frontmatter.

Tell the user to start with the unblocked children. As each child finishes
`/prd-workflow:*-prd-to-issues`, its PRD issue is assigned this epic's milestone and its
`prds[].issue` is filled.

After publishing, report: the epic milestone number, and `<slug> · feature|capability ·
blocked-by: …` per child.

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
  workflow — stop and say so rather than guessing the frontmatter schema or decomposition plan.

## Constraints

- **kind:epic only** — abort on a feature/capability PRD.
- **English**; **no speculative scope** — every child PRD earns its place in the outcome.
- Plan + hand off only — do not write child PRD bodies or create slice issues here.
- Do not modify unrelated issues.
