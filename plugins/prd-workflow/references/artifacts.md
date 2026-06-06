# PRD + work-artifact reference

Shared by the `create-epic`, `epic-to-prds`, `create-*-prd`, `*-prd-to-issues`,
`analyse-issue`, `implement-issue`, `finalize-prd`, and `finalize-epic` skills. Defines the
three planning tiers, the committed work directory, the tracker shape, and the lifecycle that
keeps it self-cleaning.

## Three tiers

- **epic** (`kind: epic`) — a coordinated outcome that spans several PRDs ("a set of plugins
  that do X"). Realised on the forge as a **milestone** (not an issue): its child PRD issues are
  assigned that milestone. Has no slices of its own. *Optional* — a lone PRD needs no epic.
- **PRD** (`kind: feature | capability`) — one plugin feature, or one foundational capability.
  Its own issue, broken into slices. May belong to an epic (`epic:` field — the PRD issue then
  carries the epic's milestone) or stand alone.
- **slice** — one independently-grabbable issue: a vertical tracer-bullet (feature) or an
  enabling unit + first consumer (capability).

## Canonical work directory (committed)

All planning artifacts live under `docs/prd/<slug>/`, version-controlled so any agent picking
up an issue reads the full spec straight from the repo:

```
docs/prd/epics/<epic-slug>/
  epic.md                # kind: epic — the epic brief + decomposition; NO slices/ subdir

docs/prd/<prd-slug>/
  prd.md                 # the PRD (frontmatter below) + an "## Implementation notes" log
  slices/
    <n>-<slug>.md        # one per slice/issue: spec + (after analyse-issue) "## Test plan"
```

Epics live in their own `docs/prd/epics/` namespace; PRDs sit directly under `docs/prd/`. They
are linked by the PRD's `epic:` field, **not** by nesting — the epic outlives its children
(each child dir self-deletes at `finalize-prd`, but the epic dir survives until `finalize-epic`,
so keeping their directories independent keeps the self-cleaning rules unambiguous). `<slug>` is
the artifact's `slug:`. `<n>` is the slice's issue number once it exists.

## Workflow versioning

The prd-workflow's set of conventions is versioned. The repo's version is stored in the dotfile
`docs/prd/.workflow-version` (a bare integer; **absent ⇒ version 0**, the pre-versioning
baseline). The bundled tool targets a current version and every operational skill injects
`prd_tool.pyz workflow-gate`, which **refuses to run** (and points at the remedy) unless the
stored version matches:

- no version file ⇒ run **`/prd-workflow:init-prd-workflow`** if the workflow has never been used
  here (stamps the **current** version directly, assuming a fresh start), or
  **`/prd-workflow:update-prd-workflow`** if there's prior prd-workflow data to carry forward
  (a missing file is treated as **v0** and migrated forward);
- stored version behind the tool ⇒ run **`/prd-workflow:update-prd-workflow`** (migrates forward,
  running each version's provider-aware migration steps, then stamps the new version).

When the repo is current the gate emits nothing — zero added context. The init/update skills are
thin shells whose actual instructions come from the tool on demand, so an up-to-date repo never
pays for migration text. `.workflow-version` lives alongside the artifacts but is **not** garbage-
collected with them.

## Frontmatter

### Epic (`epic.md`)

```yaml
---
kind: epic
title: <short human title>   # also the milestone's title — child PRD issues join it by this
slug: <kebab-slug>
epic_milestone: <#n>       # filled by epic-to-prds: the epic's milestone number/id
prds:                      # filled by epic-to-prds: the ordered decomposition
  - slug: <prd-slug>
    kind: feature | capability
    issue: <#n>            # the child PRD's issue once created (null until then)
    blocked_by: [<prd-slug>, ...]
status: draft              # draft | prds-planned | in-progress | done
---
```

### PRD (`prd.md`)

```yaml
---
kind: feature        # feature | capability — drives which prd-to-issues variant consumes it
title: <short human title>
slug: <kebab-slug>   # dir name + branch/issue slugs
epic: <epic-slug>    # OPTIONAL — present when this PRD belongs to an epic; omit if standalone
                     #   when set, the PRD issue is assigned the epic's milestone
milestone: M<NN>     # optional, docs-only — a plain text pointer to a docs/impl/ milestone.
                     #   NOT a forge milestone (the forge milestone is the epic).
prd_issue: <#n>      # filled by *-prd-to-issues: this PRD's own issue (label: prd)
slices: [<#a>, <#b>] # filled by *-prd-to-issues: child (slice) issue numbers
status: draft        # draft | issues-created | in-progress | done
---
```

`feature-prd-to-issues` asserts `kind: feature`; `capability-prd-to-issues` asserts
`kind: capability`; `epic-to-prds` asserts `kind: epic`. Each refuses a mismatched artifact and
points at the correct skill.

### Slice (`slices/<n>-<slug>.md`)

```yaml
---
kind: feature        # feature | capability — inherited from the parent PRD
title: <short human title>
slug: <kebab-slug>   # the slice slug; the file is <issue>-<slug>.md
issue: <#n>          # this slice's own issue number
prd: ../prd.md       # parent PRD, relative to the slice doc
mode: hitl           # hitl | afk
analysed: false      # true once analyse-issue has appended a ## Test plan
---
```

`(feature|capability)-prd-to-issues` writes this when it creates the slice issue (with
`analysed: false`); `analyse-issue` flips it to `true` and appends `## Test plan` to the body;
`implement-issue` reads both the field and the plan. The body follows the template at the bottom
of this file.

## Tracker shape (flat, native primitives)

The tracker uses **milestones** (an epic *is* a milestone) and **native issue dependencies** —
on a git host (GitHub via `gh`; Forgejo/Codeberg via the bundled native REST client
`prd_tool forgejo`, **not** the `fgj` CLI), or the built-in **local tracker**
(`docs/prd/tracker.json`) when the repo has no recognised git host (a git repo with no `origin`
remote). The model is identical across all three; run `prd_tool.pyz forge <key>` — `forge keys`
for the list — for the exact per-provider commands. Two mechanisms, each with one job:

- **Milestone (the epic)** — an **epic is a milestone**, never an issue. Each child PRD issue
  *joins* the epic by being assigned that milestone (at create, via `--milestone "<epic-title>"`).
  Slices carry no milestone. There are **no epic issues and no sub-issues** of any kind.
- **Dependency (`blocked_by`)** expresses **all ordering**: a PRD issue is `blocked_by` its slice
  issues (it can't close until its slices land); slice `blocked_by` slice for intra-PRD ordering;
  PRD `blocked_by` PRD for cross-PRD order within an epic.

A **standalone PRD** (no `epic:`) simply has no milestone; its PRD issue is `blocked_by` its
slices, ordered by dependencies.

Epic↔PRD membership is the milestone; PRD↔slice membership is recoverable from the committed
`slices/<n>-<slug>.md` docs and the `PRD blocked_by slice` dependency edges.

## Branching model

A PRD is one feature; its slices are tracer-bullets of it. They share **one integration
branch**, `prd/<prd-slug>`, cut from `main` at the first slice:

- Each slice is built on a short-lived branch off `prd/<prd-slug>` and **merged back into it —
  no per-slice PR**. A slice runs only **its own** test before merging; it never waits on the
  whole-suite CI gate. Merging a slice closes its issue, resolving that `PRD blocked_by slice`
  edge.
- `finalize-prd` opens the **only** PR — `prd/<prd-slug>` → `main`, `Closes #<prd-issue>` —
  carrying every slice plus the harvested docs and the PRD-dir cleanup. The **full CI gate runs
  once, on that PR**.

On a `local` forge (git with no remote), the branch workflow is identical — only remote
operations (fetch, push) are skipped. At finalize, the PRD branch merges into `main` locally
instead of via a PR. The tracker model above is identical across all providers.

## Lifecycle / garbage collection

Artifacts are **deleted as their work lands**, so the presence of a file is itself state:

1. *(optional)* `create-epic` → writes `epic.md` (status `draft`).
2. *(optional)* `epic-to-prds` → creates the epic **milestone**, records `epic_milestone:`, writes
   the ordered `prds:` plan + `## Decomposition`, status `prds-planned`. Hands off to the per-child
   `create-*-prd`.
3. `create-(feature|capability)-prd` → writes `prd.md` (status `draft`); carries `epic:` when
   created in an epic context.
4. `(feature|capability)-prd-to-issues` → creates the PRD issue (assigned the epic's milestone
   when under an epic) + slice issues, adds the native dependencies (PRD `blocked_by` each slice),
   writes one `slices/<n>-<slug>.md` per slice, fills `prd_issue:` + `slices:`, status
   `issues-created`.
5. `analyse-issue <n>` → sets `analysed: true` in frontmatter and appends a `## Test plan`
   section to that slice's doc.
6. `implement-issue <n>` → merges the slice into the PRD branch (no per-slice PR), closes the
   slice issue, appends a note to `prd.md` `## Implementation notes`, then **deletes
   `slices/<n>-<slug>.md`**. A surviving slice doc ⇒ unfinished work. Only the slice's own test
   runs here — the full CI gate is deferred to step 7.
7. `finalize-prd <slug>` → once `slices/` is empty, migrates durable knowledge into the
   project's permanent docs, ticks the epic's `prds[]` entry if any, **deletes
   `docs/prd/<prd-slug>/`**, then opens the **single PRD PR** (`prd/<prd-slug>` → `main`) where
   the **full CI gate** runs; merging it closes the PRD issue (on `local`, finalize closes it
   directly). This is the one PR and one gate for the whole PRD.
8. *(optional)* `finalize-epic <slug>` → once every child PRD is finalized, migrates
   epic-level knowledge into `docs/design/` + `docs/impl/`, **closes the epic milestone**, then
   **deletes `docs/prd/epics/<epic-slug>/`**.

## Slice doc template (`slices/<n>-<slug>.md`)

```markdown
---
kind: feature        # feature | capability — inherited from the parent PRD
title: <short human title>
slug: <kebab-slug>   # the slice slug; the file is <issue>-<slug>.md
issue: <#n>          # this slice's own issue number
prd: ../prd.md       # parent PRD, relative to the slice doc
mode: hitl           # hitl | afk
analysed: false      # true once analyse-issue has appended a ## Test plan
---

# Slice #<n> — <title>

## What to build
<end-to-end behaviour (feature) OR API surface + first consumer (capability)>

## Acceptance criteria
- [ ] …

## Blocked by
- #<n> — <reason>  |  None — can start immediately
<!-- also realised as a native `blocked_by` dependency in the tracker -->

## Test plan          ← appended by analyse-issue
…
```
