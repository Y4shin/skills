---
description: Break a capability PRD (kind:capability) into
  independently-grabbable enabling slices (foundational surface, each with a
  first consumer), wire the PRD issue + slices with native dependencies (and
  assign the PRD issue to the epic's milestone when under an epic), and write
  committed slice docs. Use after /create-capability-prd. Don't use it on a
  feature PRD (use feature-prd-to-issues) or to author the PRD itself (use
  create-capability-prd). Provider-aware (gh/fgj/local).
---

> **opencode native tools.** This build exposes the artifact-frontmatter operations as
> native tools — **prefer them** over shelling out to the CLI for these: `prd_show`,
> `prd_get`, `prd_set`, `prd_set_slices`, `prd_resolve`, `prd_assert_kind`, `prd_list`,
> `prd_slices`, `prd_finalizable`, `prd_lint`, `prd_epic_prds`, `prd_epic_set_prd_issue`,
> `prd_epic_prd_issue`, `prd_epic_tick`, `prd_epic_finalizable`. The !`…` header
> injections below (workflow-gate, reference, list, profile, forge snippets) still run
> via the bundled CLI — that is by design (a command can't call a tool).


# Capability PRD → Issues

Wherever a command below is written as `prd_tool`, run it as the absolute command printed
here (the bundled CLI) — `prd_tool` is shorthand, not a binary on your PATH:

!`node ".opencode/scripts/prd-tool.js" toolpath`

!`node ".opencode/scripts/prd-tool.js" workflow-gate`

Convert a `kind: capability` PRD into independently-grabbable issues using **enabling
slices**, wired with the flat native tracker model (see the injected reference): the PRD issue
is `blocked_by` its slices; under an epic, the PRD issue is assigned that epic's milestone.
Capabilities are foundational (no UI to demo), so acceptance is a **consumer test**, not a
demoable screen.

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
— its "Architecture layers → Capability" section defines what an enabling slice means here.
If empty, explore the codebase to learn the layering and the libraries/host this work extends:

!`node ".opencode/scripts/prd-tool.js" profile`

## Step 0 — Provider + PRD

Verify auth, then locate the PRD at `docs/prd/<slug>/prd.md` and **assert `kind: capability`** —
the helper exits non-zero (and points at `/feature-prd-to-issues`) on a mismatch:

```bash
prd_tool assert-kind <slug> capability
```

!`node ".opencode/scripts/prd-tool.js" forge auth_check`

Ensure the label scheme exists (idempotent):

!`node ".opencode/scripts/prd-tool.js" forge ensure_labels`

## Step 1 — Explore (if needed)

Explore the surface this capability extends — the library/package, host module, or shared
component named in the project profile's "Architecture layers → Capability" (and its orientation
docs). Slice descriptions must respect that layering and any manifest/contract the profile
calls out. If no profile exists, explore the codebase to learn the layering and the owning
modules yourself.

## Step 2 — Draft enabling slices

Break the PRD into **enabling slices**. Each slice is a thin unit of new foundational surface
(API / shared library / macro / host capability) that **names its first real consumer**.

<enabling-slice-rules>
- Each slice ships a thin, coherent piece of the surface — prefer many thin slices.
- Each slice names a concrete first consumer (a downstream call site) so it isn't a
  speculative layer.
- Acceptance = a **consumer test**: a test in the owning module/package **plus** a downstream
  consumer exercising it (the forms come from the project profile's test infrastructure).
- A completed slice is independently mergeable.
</enabling-slice-rules>

Each slice is **HITL** (needs a human design decision) or **AFK** (autonomous). Prefer AFK.

## Step 3 — Quiz the user

Present the breakdown as a numbered list; per slice: **Title**, **Type (HITL/AFK)**,
**Blocked by**, **Surface + first consumer**. Ask: granularity right? dependencies correct?
does each slice name a real consumer? merge/split any? HITL vs AFK correct? Iterate until
approved.

## Step 4 — Publish (flat native model, dependency order, blockers first)

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
     — set the real title + body and ensure labels `prd`, `kind:capability` (keep its milestone).
     Get the number with:
     ```bash
     prd_tool epic prd-issue <epic-slug> <slug>
     ```
   - **Else (standalone):** create a new PRD issue (labels `prd`, `kind:capability`; no milestone).
   - Record the number as `prd_issue:`:
     ```bash
     prd_tool set <slug> prd_issue <prd#>
     ```
2. For each slice, in dependency order (slices carry **no** milestone):
   - Create the issue with labels `kind:capability`, `mode:hitl|afk`, `status:todo`. Body uses
     the template below (`Part of #<prd>` + blockers).
   - Add **PRD `blocked_by` this slice**.
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
The surface this slice adds (types, functions, interfaces — whatever forms the surface) **and
its first consumer**. Describe the surface precisely; inline a type/signature snippet when it
encodes the decision better than prose.

## Acceptance criteria
- [ ] surface builds + its own unit test passes
- [ ] first consumer (<downstream call site>) exercises it in a test
- [ ] any compile-time / type-level guarantees have their own checks (if applicable)

## Blocked by
- #<n> — <reason>   (or "None — can start immediately")
</issue-template>

After publishing, report: `#<n> · <title> · HITL|AFK · consumer: <x> · blocked-by: …` per
slice, the PRD issue number, and (if under an epic) the epic milestone it was assigned to.

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

- **kind:capability only** — abort on a feature PRD.
- **English**; **no speculative scope** — every surface names a consumer or it's deferred.
- **Tracker rule:** an epic is a milestone (the PRD issue joins it via `--milestone`); PRD↔slice
  and all ordering are native dependencies. There are no epic issues or sub-issues.
- Do not modify unrelated issues.
