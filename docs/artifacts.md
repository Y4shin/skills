# PRD + work-artifact reference

Shared by the `create-prd`, `slice-prd`, `start-issue`, `implement-issue`, `finalize-prd`, and `adopt-prd` skills.

## Three tiers

- **epic** (`kind: epic`) — a coordinated outcome that spans several PRDs. Realised on the forge as a **milestone** (not an issue). Its child PRD issues are assigned that milestone. Has no slices of its own. *Optional* — a lone PRD needs no epic.
- **PRD** (`kind: prd`) — one feature or one foundational capability. Its own issue, broken into slices. May belong to an epic (`epic:` field — the PRD issue then carries the epic's milestone) or stand alone.
- **slice** — one independently-grabbable issue: a vertical tracer-bullet.

## Canonical work directory (committed)

```
docs/prd/epics/<epic-slug>/
  epic.md                # kind: epic — the epic brief + decomposition

docs/prd/<prd-slug>/
  prd.md                 # the PRD (frontmatter below) + "## Implementation notes" log
  slices/
    <n>-<slug>.md        # one per slice/issue: spec + (after start-issue) "## Test plan"
```

## Frontmatter

### Epic (`epic.md`)

```yaml
---
kind: epic
title: <short human title>
slug: <kebab-slug>
epic_milestone: <#n>       # the epic's milestone number/id
prds:                      # ordered child PRD decomposition
  - slug: <prd-slug>
    issue: <#n>
    blocked_by: [<prd-slug>, ...]
    done: false
status: draft | prds-planned | in-progress | done
---
```

### PRD (`prd.md`)

```yaml
---
kind: prd
title: <short human title>
slug: <kebab-slug>
epic: <epic-slug>    # OPTIONAL — omit if standalone
milestone: M<NN>     # optional, docs-only milestone pointer
prd_issue: <#n>      # filled by slice-prd
slices: [<#a>, <#b>] # filled by slice-prd
status: draft | issues-created | in-progress | done
---
```

### Slice (`slices/<n>-<slug>.md`)

```yaml
---
kind: prd
title: <short human title>
slug: <kebab-slug>
issue: <#n>
prd: ../prd.md
mode: hitl | afk
analysed: false      # true once start-issue has appended a ## Test plan
---
```

## Tracker model

| Concept | Mechanism |
|---|---|
| Epic | A milestone. Child PRD issues are assigned this milestone. |
| PRD issue | An issue with `prd` label. Owns the slice issues via `blocked_by`. |
| Slice issue | An issue with `mode:hitl/afk` and `status:todo/in-progress/done` labels. |
| Ordering | Native `blocked_by` dependencies for all ordering. |
| PRD ↔ epic | The PRD issue is assigned the epic's milestone. |

## Branching model

- Each PRD has one integration branch: `prd/<prd-slug>`, branched from `main`.
- Slices branch off `prd/<prd-slug>` as `slice/<n>-<slug>`, merge back in.
- **No per-slice PR.** Only `finalize-prd` opens a PR (or merges locally on local forge).

## Lifecycle

1. `create-prd` → writes `prd.md` (status `draft`) or `epic.md` (status `draft`)
2. `slice-prd` → creates/edits the PRD issue, creates slice issues, writes slice docs (status `issues-created`)
3. `start-issue <n>` → sets `analysed: true`, appends `## Test plan` to slice doc
4. `implement-issue <n>` → TDD, merges into PRD branch, closes slice issue, **deletes slice doc**
5. `finalize-prd <slug>` → harvests knowledge, deletes PRD dir, opens/merges the single PR
6. *(if epic and last child)* `finalize-prd` also ticks the epic and finalizes it

A surviving slice doc ⇒ unfinished work. A surviving `docs/prd/<slug>/` ⇒ unfinished PRD.