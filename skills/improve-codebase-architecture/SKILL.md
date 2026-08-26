---
name: improve-codebase-architecture
description: Survey a repository for high-leverage architecture deepening opportunities and hand a selected candidate to Wayfinder.
disable-model-invocation: true
---

# /improve-codebase-architecture

Run this periodic, user-invoked survey without changing application code.

## Survey

1. Read the repository-root `CONTEXT.md` when it exists and inspect
   `docs/adr/*.md` when that directory exists. Treat both as constraints and
   record conflicts rather than silently overriding them.
2. Dispatch the read-only `architecture-scout` agent with the `codebase-design`
   skill. Ask it to explore the repository, biasing toward paths in
   `git log --oneline`, and return candidates with files, problem, solution,
   benefits, and a Strong/Worth exploring/Speculative strength.
3. Have the scout apply the deletion test and use codebase-design vocabulary:
   module, interface, depth, seam, adapter, leverage, and locality.
4. Generate the report from `HTML-REPORT.md`'s scaffold. For each scout
   candidate, render its title, strength, files, problem, smallest safe
   solution, benefits, and before/after Mermaid diagram. Write the completed
   self-contained HTML to `<tmpdir>/architecture-review-<timestamp>.html`
   (use the operating system temp directory and a timestamp; do not write the
   report into the repository). Resolve `vendor/tailwind.min.js` and
   `vendor/mermaid.min.js` from this repository to absolute paths and replace
   the scaffold placeholders with those paths. Never use CDN URLs.
5. Open the generated file with the platform opener (`xdg-open` on Linux,
   `open` on macOS, or `start` on Windows), and tell the user its absolute
   path. Then stop and ask exactly: Which of these would you like to explore? Do not silently choose
   a candidate.

## Decision and handoff

Only after the user explicitly picks a candidate, offer the no-grill branch or
run the existing `/grilling` skill/resource. Grilling uses its established
one question at a time using the design-tree and frontier discipline: ask a focused
question with a recommended answer, record the response, and recompute the
frontier before continuing. Do not invent a new grilling variant. If grilling
reveals a durable rejection, offer to record the decision as an ADR under
`docs/adr/`. Update `CONTEXT.md` lazily during grilling only when it is absent
and the user agrees; never create context during the survey itself.

If the user says “don't grill me, just show the report” (or invokes this skill
with the no-grill flag), skip the grilling loop; the report is the whole survey
output and no design decision is inferred from it. After a candidate is picked,
pass that picked candidate directly to `/skill:wayfinder` in no-grill mode. In
normal mode, pass the settled grilling decision (including constraints,
rejections, and downstream consequences) to `/skill:wayfinder`; hand this
settled decision to wayfinder. Wayfinder owns
creating the deepening task and wiring the frontier; this skill never creates
implementation tasks or auto-fixes application code.

See [HTML-REPORT.md](HTML-REPORT.md) for the report format.
