---
kind: slice
slug: improve-arch-skill-and-scout
title: Author the /improve-codebase-architecture skill + architecture-scout agent + vendor deps
task: ../task.md
mode: afk
status: done
size: l
blocked_by: []
---

# Slice 1: Author the skill + scout agent + vendor the CDN deps

## End-to-end behavior

The `/improve-codebase-architecture` skill exists, the `architecture-scout`
agent exists, the CDN deps are vendored, and both are registered. After this
slice the skill is invokable and the structure tests pass.

## Deliverables

- `skills/improve-codebase-architecture/SKILL.md` — frontmatter (`name: improve-codebase-architecture`, `description`, `disable-model-invocation: true` since it's a periodic survey). Body: the survey process (explore via the scout → write the HTML report to the OS temp dir → open it → stop and ask which candidate → optional grilling on pick → hand the decision to wayfinder); the no-grill mode ("don't grill me, just show the report"); reads repo-root `CONTEXT.md` + `docs/adr/*.md` if present (creates CONTEXT.md lazily during grilling, offers ADRs for durable rejections); references `codebase-design` vocabulary; link to `HTML-REPORT.md`.
- `skills/improve-codebase-architecture/HTML-REPORT.md` — the HTML scaffold: Tailwind + Mermaid loaded from the vendored copies (NOT CDN URLs), candidate cards (Files, Problem, Solution, Benefits in locality/leverage terms, before/after diagram, strength badge: Strong/Worth exploring/Speculative), Top recommendation section, ADR-conflict callout pattern. Adapted from mp-skills.
- `skills/improve-codebase-architecture/vendor/tailwind.min.js` — vendored Tailwind (~407KB; download from https://cdn.tailwindcss.com).
- `skills/improve-codebase-architecture/vendor/mermaid.min.js` — vendored Mermaid v11 min.js (~3.6MB; download from https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js).
- `agents/architecture-scout.md` — frontmatter (`name: architecture-scout`, `description`, `tools: read, bash, get_guidelines`, `inheritProjectContext: true`, `defaultContext: fresh`). Prompt: walk the codebase for deepening opportunities (shallow modules, tight coupling, missing locality, untested areas); apply the deletion test; bias toward recently-changed paths (`git log --oneline`); speak in codebase-design vocabulary (module, interface, depth, seam, adapter, leverage, locality); read `CONTEXT.md` + `docs/adr/` first; return candidates (files, problem, solution, benefits, strength). Read-only; no edits.
- `package.json` — add `"./skills/improve-codebase-architecture"` to `pi.skills` (length 9 → 10, accounting for the doctor skill landing first if it does; otherwise 8 → 9 — confirm the current length at implementation time).
- `tests/skills.test.ts` — add `"skills/improve-codebase-architecture/SKILL.md"` to `SKILL_FILES`; update `pi.skills.length`; add `"agents/architecture-scout.md"` to `AGENT_FILES`; xref assertions (the SKILL.md references `architecture-scout` and `wayfinder` and `codebase-design`).

## Acceptance criteria

- The SKILL.md + HTML-REPORT.md exist and are non-empty.
- The vendor dir contains both JS files (non-empty; ~4MB total).
- `agents/architecture-scout.md` exists with the required frontmatter.
- `package.json` `pi.skills` contains the new skill (length bumped correctly).
- `tests/skills.test.ts` green with the new entries.
- The SKILL.md documents the no-grill mode and the wayfinder handoff.

## Test plan

- Seams: the structure tests (SKILL_FILES, pi.skills.length, AGENT_FILES, xrefs).
- Failure modes: manifest length mismatch; missing frontmatter; vendor files missing.
- Scenarios: `npm test -- tests/skills.test.ts` green.
- Edge cases: `no chain JSON references` / `no supervisor/intercom` tests pass.

## Constraints

- Download the vendor files from the CDN URLs once; commit them. Do NOT use
  CDN URLs in the HTML template — reference the vendored copies.
- The scout is read-only (no `write`/`edit`); it returns candidates, the skill
  writes the report.
- Adapt mp-skills content (scout via subagent, hand to wayfinder, no-grill
  mode); do not port verbatim.
