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
4. Write the candidates into `HTML-REPORT.md`'s scaffold as a self-contained
   report in the operating system temporary directory. Resolve the vendored
   Tailwind and Mermaid files from this repository by absolute path; never use
   CDN URLs. Open the generated report for the user.
5. Stop and ask the user which candidate to pursue. Do not silently pick one.

## Decision and handoff

After an explicit candidate pick, optionally run the existing grilling process
(one question at a time, following its frontier discipline) to test the design.
If the user says “don't grill me, just show the report” (or otherwise chooses
no-grill), preserve that choice and hand the selected candidate directly to
`wayfinder` as a precise planning decision. Wayfinder owns task creation and
implementation planning; this skill never auto-fixes architecture.

If grilling reveals a durable rejection, offer to record it as an ADR. During
that grilling flow, if `CONTEXT.md` is absent, create it lazily only with the
user's agreement; do not create repository context during a survey.

See [HTML-REPORT.md](HTML-REPORT.md) for the report format.
