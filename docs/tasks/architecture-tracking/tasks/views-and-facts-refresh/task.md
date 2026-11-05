---
type: task
subtype: grilling
title: Settle the repository and effort views, their artifacts, and when facts refresh
status: stable
workflow_state: ready
blocked_by:
- unit-model-schema
- codegraph-evidence
---

## Decision to settle

What the two views are, where they are produced, and when the facts behind them
are refreshed.

The proposal asks for a repository view (an index plus consistent diagrams, with
drill-down into sub-units, cross-boundary symbols and source evidence) and an
effort view (the affected part of the graph, which tickets change which units,
and after implementation where the diff actually landed). This session decides
what of that is v1, and what a reader gets to keep in the tree.

## Parent decisions it depends on

`unit-model-schema` fixes what can be rendered. `codegraph-evidence` reports
what the facts can honestly support, including the coverage gaps the view must
report rather than smooth over.

## Choices already known

- The proposal names Mermaid as a candidate renderer, and does not say whether
  output is committed or generated on demand.
- A dependency that is merely permitted can remain unused; the view must not
  present it as a violation.
- The effort view is described as something rendered on demand for a human
  reviewing the effort.
- Inventory coverage and dependency coverage must be reported separately.

## What this session must pin down

- Repository view: committed artifacts in `docs/architecture/`, generated on
  demand into a temp directory, or generated into the tree and ignored by git.
  Each option has a different review story and a different staleness story.
- Whether diagrams are Mermaid source in Markdown, an HTML page, or an image, and
  what happens when the graph is large.
- Drill-down: is it one page with links, one file per unit, or a searchable
  index? What does a reader follow to reach source evidence?
- Effort view: when it renders, where it lands, and whether it survives the
  effort's archive.
- Facts refresh: refreshed at ticket close-out, at effort close, or on demand, and
  whether staleness is visible in the view or silent.
- How a gap in analysis appears in a rendered view, so that "no edges" never
  reads as "no dependency".

## Recommended starting answer

The repository view is generated on demand into the tree, with the generated files
listed in `.gitignore` and the generator run by the same command CI uses; the unit
Markdown stays the only committed source. The effort view renders into the
effort directory at close, and stays with the archived effort as evidence.
Diagrams are Mermaid source inside Markdown, one index page plus one page per
sub-unit, with each edge linking to its evidence. Every view states the refresh
timestamp and the analysis gaps in the same place it states the counts.

## Downstream work this may create

The spec's view section, the renderer tickets, and the CI command's usage
documentation.
