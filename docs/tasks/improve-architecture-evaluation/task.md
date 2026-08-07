---
kind: task
type: grilling
slug: improve-architecture-evaluation
title: Evaluate mp-skills /improve-codebase-architecture for adoption
map: compare-to-mp-skills
status: ready
blocked_by: [adopt-mp-skills-patterns]
---

## Decision to settle

Should we build an /improve-codebase-architecture skill based on mp-skills'
approach (HTML report with deepening opportunities, grilling loop)?

## Context

mp-skills' /improve-codebase-architecture:
1. Explores the codebase for shallow modules, tight coupling, untested areas
2. Presents candidates as a self-contained HTML report (Mermaid before/after
   diagrams, Tailwind, recommendation strength badges)
3. Grills through whichever candidate the user picks
4. Uses /codebase-design vocabulary (module, depth, seam, leverage, locality)
5. Runs /domain-modeling inline as decisions crystallize

Our workflow has nothing comparable — architecture quality is addressed only
when wayfinder discovers it during planning. There's no recurring maintenance
survey, no visual report, no dedicated deepening practice.

## Recommended starting answer

Adopt it. The user explicitly wants something like this. It's a recurring
maintenance practice (run every few days), not part of the main workflow,
so it doesn't conflict with the two-phase model. Requires /codebase-design
vocabulary to be in place first (being built in Phase 1).
