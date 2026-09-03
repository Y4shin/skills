---
kind: task
type: grilling
slug: improve-architecture-evaluation
title: Evaluate mp-skills /improve-codebase-architecture for adoption
map: compare-to-mp-skills
status: done
blocked_by:
- adopt-mp-skills-patterns
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

## Decisions reached

### Q1 — Defer: design now, build after prerequisites (settled)

Settle the *shape* of `/improve-codebase-architecture` in this grilling (so
it's not re-asked), but raise its implementation task **blocked_by** the three
prerequisite skills the map already decided to build: `build-codebase-design-
skill`, `build-grilling-skill`, `build-domain-modeling-skill` (none of which
exist as tasks yet — the map's fog lists them as decided-but-not-created).
We design the shape now; we build it when its deps land.

**Why:** `/improve-codebase-architecture` calls `codebase-design` (vocabulary),
`grilling` (decision loop), and `domain-modeling` (inline CONTEXT/ADR edits).
None of those skills exist in this repo yet. Building it before they do would
force stubbing them or folding them in — both contradict the map's decision
(Q2 of `adopt-mp-skills-patterns`) that they are separate skills. Designing
now locks in the shape so the build is unblocked the moment the prereqs land.

**Rejected alternatives:**
- *Adopt now and build the prerequisites as part of this task.* Biggest scope;
  contradicts the map's decision that those are separate skills.
- *Skip — not worth the skill overhead.* The gap is real (no recurring
  maintenance survey); the user explicitly wants this.

**Consequences / newly opened questions:**
- The build task is raised with Wayfinder, blocked_by the three prerequisite
  build tasks (which Wayfinder must also create — they're map fog items).
- Report format → Q2
- Where the picked candidate feeds → Q3
- Exploration-agent (mp-skills names Claude Code's `Agent` tool — not
  harness-neutral) → Q4
- The grilling-loop concern (mp-skills' "10s of questions" problem) → Q5
- CONTEXT.md / ADR convention for our repo → Q6

### Q2 — HTML report with CDN deps cached in the repo (settled)

The report is a **self-contained HTML file**, matching mp-skills' visual
format (Tailwind + Mermaid, before/after diagrams, strength badges), BUT
the **CDN dependencies are cached/vendored in the repo** so the report works
offline and in locked-down environments (mp-skills' known silent-breakage
issue). The report is written to the OS temp dir and opened (not committed).

**Why:** the user wants the visual report (styled badges, before/after
diagrams — Markdown can't match it). Vendoring the CDN deps fixes mp-skills'
known offline/locked-down breakage without losing the visual richness. A
throwaway temp file keeps the survey out of git (no HTML-in-git diff noise);
the vendored assets live in the repo once.

**Tradeoff (noted, accepted):** Tailwind CDN (~407KB) + Mermaid min.js
(~3.6MB) ≈ **~4MB of third-party JS committed to the repo**. No vendoring
precedent exists here; this sets one. The report HTML references the
vendored copies via relative path (e.g. `../../vendor/tailwind.min.js` from
the temp file, or the skill inlines the absolute path at generation time).

**Rejected alternatives:**
- *Markdown in the repo.* No CDN dependency, but loses the visual report the
  user wants (styled badges, before/after diagrams).
- *HTML in the repo.* Visual + versioned, but HTML in git is awkward to
  diff/review and the report is a throwaway survey, not a durable artifact.

**Consequences:**
- New `vendor/` dir (or `docs/architecture/vendor/`) caches `tailwind.min.js`
  + `mermaid.min.js`. `.gitignore` gains nothing (we WANT these committed).
- The skill's HTML template references the vendored copies, not the CDN.
- This is the first vendored-asset precedent in this repo → the build task
  must document the convention.

### Q3 — Picked candidate feeds wayfinder (settled)

The picked candidate's grilling decision becomes input to **wayfinder**,
which creates a `type: feature` (or `type: bug`) task for the deepening,
wires it into the map/frontier, and hands to implement-task. Mirrors our
flow exactly (no new spec/ticket step).

**Why:** our flow has no `to-spec`/`to-tickets`; wayfinder owns task creation
and the dependency graph (`adopt-mp-skills-patterns` Q3: "wayfinder as pure
router"). The deepening task may have prerequisites wayfinder would catch.

**Rejected alternatives:**
- *Create the feature task directly from the grilling.* Bypasses the
  dependency-graph/frontier machinery wayfinder owns.
- *Stay a decision; the user manually takes it to wayfinder.* Simplest but
  loses the handoff.

**Consequences:**
- The grilling loop ends by handing to wayfinder (not to-spec/to-tickets).
- wayfinder creates the deepening task; the candidate's decision doc is the
  input (like a research/grilling task result).

### Q4 — Exploration via a custom architecture-scout agent (settled)

The skill spawns one fresh-context **read-only `architecture-scout` agent**
(tools: `read`, `bash`, `get_guidelines`; `defaultContext: fresh`; passed
`skill: "codebase-design"` for the vocabulary) to walk the codebase and
return candidates. A **custom** agent (not a generic scout) — the exploration
heuristic is specialized: apply the deletion test, find shallow modules
(interface nearly as complex as implementation), spot missing locality, and
speak in codebase-design vocabulary. Encoding that in the agent prompt beats
re-specifying it each run, and matches the `tdd-worker`/`code-reviewer`
precedent of role-specific agents. Harness-neutral (drops mp-skills' Claude
Code `Agent` dependency, their known issue). The skill aggregates the scout's
findings into the report.

**Why:** the user left it to judgment ("unless you see value in writing custom
agents"). There is value: the deletion-test + shallowness + codebase-design
vocabulary is a specialized heuristic worth encoding once. A custom agent also
receives the `codebase-design` skill via the `skill:` param (the proven
`/tdd`/`/code-review` delivery mechanism) instead of re-reading it per run.

**Rejected alternatives:**
- *Generic scout/reviewer subagent.* Works, but the specialized heuristic
  would be re-prompted each run and couldn't receive the codebase-design skill
  as a named reference.
- *Explore inline in the skill's own context.* Pollutes the orchestrator
  context with the whole codebase scan.
- *Multiple parallel scouts per area.* Overkill for a periodic survey.

**Consequences:**
- New `agents/architecture-scout.md` (read-only fanout? no — single agent,
  no `subagent` tool; it returns candidates, the skill writes the report).
- The build task creates this agent alongside the skill.

### Q5 — Report first, grilling only on pick, with a no-grill mode (settled)

The skill stops after the report and asks "which candidate?" — grilling
starts ONLY after the user picks one. A **documented no-grill mode** ("don't
grill me, just show the report") is part of the skill. Our grilling-resource
discipline (one question, recommended answer, frontier recomputation) bounds
the loop once it runs.

**Why:** directly addresses mp-skills' loudest complaint ("10s or 100s of
questions", "borderline unusable") by making the escape a documented mode
instead of an open issue. Our grilling resource already bounds the loop, so
once it runs it won't spiral.

**Rejected alternatives:**
- *Grilling mandatory after the report.* Inherits the "borderline unusable"
  complaint; no escape.
- *Report only, no grilling.* Loses the decision-tree walk that turns a
  candidate into an implementable deepening.

**Consequences:**
- The skill SKILL.md documents the no-grill mode explicitly.
- The grilling loop, when invoked, uses the existing grilling resource's
  one-question/frontier discipline (no new grilling variant).

### Q6 — Adopt repo-root CONTEXT.md + docs/adr/, plus a task-workflow-doctor
skill (settled)

Adopt **repo-root `CONTEXT.md`** (domain glossary) + **`docs/adr/`**
(decision records), matching mp-skills exactly. The skill reads them if
present; the grilling loop creates `CONTEXT.md` lazily and offers ADRs for
durable rejections. Optional — the skill works without them.

**PLUS a new `task-workflow-doctor` skill** (model-invoked): invoked when
something is wrong with the task workflow, it diagnoses common issues and
tells the user which skill to run. Its resources cover the common missing-
file/dir cases — `CONTEXT.md` missing, `docs/adr/` missing, the `docs/tasks/`
tree missing, `docs/bugs/` missing, `docs/bugs/archive/` missing,
`docs/dev-env.md` missing, `docs/testing.md` missing — and routes to the
appropriate skill (`onboard-workflow` for the docs/tasks/ + docs/bugs/ tree,
the relevant skill for CONTEXT.md/ADRs, etc.).

**Why:** the user chose mp-skills' exact `CONTEXT.md` placement (repo-root,
not `docs/`) — faithful to mp-skills, and `CONTEXT.md` is the conventional
name AI tools look for at repo root. The `task-workflow-doctor` is the user's
addition: a self-help skill for when the workflow is broken or incomplete,
with resources for common issues (missing dirs/files) that tell the user to
run the appropriate skill. This generalizes the "is the workflow set up?"
check beyond this skill's own CONTEXT.md/ADR needs.

**Rejected alternatives:**
- *`docs/context.md` (lowercase, under docs/).* Breaks the mp-skills
  convention the user chose and the AI-tool-recognized repo-root `CONTEXT.md`
  name.
- *No CONTEXT/ADR convention.* Loses the domain-language discipline.

**Consequences:**
- `/improve-codebase-architecture` reads repo-root `CONTEXT.md` +
  `docs/adr/*.md`; creates `CONTEXT.md` lazily; offers ADRs for durable
  rejections.
- **New `task-workflow-doctor` skill** (model-invoked) + its resources dir — a
  separate build task, raised with Wayfinder. NOT part of the
  improve-architecture build task (it's a general workflow-health skill, not
  specific to architecture review).
- `onboard-workflow` may need updating to optionally create `CONTEXT.md` +
  `docs/adr/` (or that becomes a doctor-recommended manual step). → noted as
  downstream fog for the doctor task.

## Completion evidence

The task's design tree is fully visited (Q1–Q6). The decision, in the
user's terms:

- **Decision:** Build `/improve-codebase-architecture` as a periodic-
  maintenance survey (not part of the build loop): an `architecture-scout`
  agent (custom, read-only, passed `skill: "codebase-design"`) walks the
  codebase for deepening opportunities; the skill writes a self-contained
  HTML report (Tailwind + Mermaid, before/after diagrams, strength badges)
  to the OS temp dir with the **CDN dependencies vendored in the repo**
  (~4MB) so it works offline; the report stops and asks which candidate;
  grilling runs only on an explicit pick (with a documented no-grill mode);
  the grilling decision feeds **wayfinder** (not to-spec/to-tickets), which
  creates the deepening task. Reads repo-root `CONTEXT.md` + `docs/adr/`
  (mp-skills convention), creates lazily, offers ADRs for durable rejections.
  **Deferred:** implementation blocked_by the three prerequisite skills
  (codebase-design, grilling, domain-modeling — decided but not yet built).
  **Plus a new `task-workflow-doctor` skill** (separate task) for diagnosing
  common workflow issues (missing CONTEXT.md/ADRs/docs dirs) and routing to
  the right skill.

- **Important alternatives considered:**
  - Build now / build prerequisites in this task / skip (rejected: prereq
    gap / scope / gap is real).
  - Markdown in repo / HTML in repo (rejected: loses visual / HTML-in-git).
  - Create task directly / manual handoff (rejected: bypasses graph / loses
    handoff).
  - Generic scout / inline / parallel scouts (rejected: heuristic worth
    encoding / context pollution / overkill).
  - Mandatory grilling / report only (rejected: unusable / loses decision
    walk).
  - `docs/context.md` / no convention (rejected: breaks mp-skills convention
    / loses domain language).

- **Constraints and rationale:**
  - Must work in the Pi harness; scout via `subagent({...})` (harness-neutral,
    not Claude Code's `Agent` tool).
  - The three prerequisites are map-decided separate skills — this task does
    not fold them in.
  - Vendoring ~4MB of CDN JS is a new precedent, accepted for offline
    reliability.
  - wayfinder owns the graph; the candidate feeds it, not a spec/ticket step.

- **Dependent-task implications:**
  - The `build-improve-architecture-skill` feature task is raised blocked_by
    `build-codebase-design-skill`, `build-grilling-skill`,
    `build-domain-modeling-skill` (Wayfinder must also create these three —
    they're map fog items).
  - A **separate** `build-task-workflow-doctor-skill` task is raised (not
    blocked_by the architecture prereqs — the doctor is general workflow
    health, though it should know about CONTEXT.md/ADRs once they exist).
  - `improve-architecture-evaluation` sibling done; `bug-workflow-enhancements`
    is the last open grilling sibling.

- **Remaining fog / newly discovered work:**
  - Build task `build-improve-architecture-skill` (feature, blocked_by the
    three prereqs) — precise enough to state.
  - Build task `build-task-workflow-doctor-skill` (feature) — the doctor skill
    + its resources dir (common-issue diagnosis → route to the right skill).
    Precise enough to state.
  - Should `onboard-workflow` optionally create `CONTEXT.md` + `docs/adr/`?
    Noted as downstream fog for the doctor task.
  - Map fog: the three prerequisite build tasks (codebase-design, grilling,
    domain-modeling) are still unbuilt — this task can't graduate to a build
    until Wayfinder creates them.

## Newly created work

Raise two implementation tasks with Wayfinder:

- **`build-improve-architecture-skill`** (`type: feature`, `blocked_by:
  [build-codebase-design-skill, build-grilling-skill,
  build-domain-modeling-skill]`) — the architecture-scout agent, the HTML
  report skill (with vendored CDN deps), the no-grill mode, the wayfinder
  handoff, the CONTEXT.md/ADR reads.

- **`build-task-workflow-doctor-skill`** (`type: feature`) — the
  task-workflow-doctor skill (model-invoked) + resources for common issues
  (missing CONTEXT.md/docs/adr/docs/tasks/docs/bugs/docs/bugs/archive/
  docs/dev-env.md/docs/testing.md) that routes to the appropriate skill.

## Recommended starting answer

Adopt it. The user explicitly wants something like this. It's a recurring
maintenance practice (run every few days), not part of the main workflow,
so it doesn't conflict with the two-phase model. Requires /codebase-design
vocabulary to be in place first (being built in Phase 1).
