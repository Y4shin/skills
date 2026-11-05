---
type: task
subtype: grilling
title: Settle the unit file schema, selector syntax, and ownership rules
status: stable
workflow_state: ready
blocked_by:
- monorepo-multiroot
---

## Decision to settle

The unit file's front matter schema, the selector syntax, and the ownership
rules' exact wording, as a person hand-authors them during onboarding and as the
tools validate them.

## Parent decisions it depends on

`non-negotiables` fixed one source root plus exclude globs, with multi-root
conditional on `monorepo-multiroot`, and fixed that every in-scope element has
exactly one most-specific owner. `codegraph-evidence` reports what the provider
can actually resolve, so read its findings before settling this.

## Choices already known

- One Markdown file per unit under `docs/architecture/`, with front matter for a
  stable ID, parent, source selectors and declared relationships, and prose for
  responsibility, boundary and rationale. The proposal calls the schema open.
- Hierarchy is supported: a unit may own one physical package or several, and a
  child's scope must fit inside its parent's.
- Three things stay separate: language visibility, observed use, intended API and
  relationships. A caller using a public concrete implementation directly stays
  visible as an observed edge and the check can flag it.
- A declared boundary links to an executable check rather than describing one.

## What this session must pin down

- The exact front-matter keys and their types, including the stable ID's format
  and whether IDs are path-derived or free.
- The selector form. The proposal's Java example (`com.example.database` and its
  descendants) suggests package selectors; this repository needs path or glob
  selectors; Go needs package import paths. One syntax or per-language forms?
- Whether a unit file declares its children or only its parent, and which side
  the tool trusts.
- How "intended API" is written: named entry points, a list of symbols, a prose
  rule with a check link, or all three.
- How a declared dependency direction is written, and whether it must carry a
  check link to be valid.
- What a provisional new unit looks like, since planning may define units for code
  that does not exist yet.
- The minimum a human must write by hand for onboarding to succeed, because the
  operator does that in both repositories.

## Recommended starting answer

Front matter with `id` (stable, free but unique), `title`, `parent`, `sources`
(a list of selectors), `api` (entry points as symbol or package references), and
`relationships` (target unit plus allowed, forbidden, or one-way, each with an
optional `check` reference). Selectors as a small union of `path`, `package` and
`glob`, chosen per language. Prose holds the responsibility, boundary and
rationale, and nothing the tools must enforce lives in prose.

## Downstream work this may create

`check-enforcement`, `workflow-surface`, `views-and-facts-refresh`, and the
onboarding flow a human runs.
