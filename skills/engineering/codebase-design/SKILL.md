---
name: codebase-design
description: Map an existing codebase's architecture, boundaries, dependencies, reuse opportunities, and safe extension points before proposing a change.
---

# /codebase-design, Codebase design reference

Use this model-invoked reference before designing a change in an unfamiliar or
substantive repository. It is a shared vocabulary and investigation procedure,
not an autonomous implementation pipeline. It complements (and does not
replace) repository navigation tools, CodeGraph, or the architecture survey.

## Boundary and ownership

This skill owns the description of the architecture that exists today and the
reasoning that makes a proposed change safe: component boundaries, dependency
direction, existing extension points, and reuse or deletion options. The
calling architecture-oriented agent (for example, `architecture-scout`) owns
its survey, recommendations, and human handoff. Implementation skills own code
changes. Do not create an architecture survey, scout agent, or new navigation
tool here.

Pi-native means using the tools and skills available in this package. Do not
assume Claude Code commands, skills.sh conventions, or another agent harness.

## Exploration vocabulary and procedure

1. **State the change boundary.** Name the requested behavior, the likely
   owning capability, explicit constraints, and what is out of scope. Separate
   observed facts from hypotheses.
2. **Explore structure.** Use CodeGraph structure/file exploration first, then
   symbol lookup to find the relevant modules, types, entry points, and tests.
   Use `codegraph_explore`, `codegraph_search`, `codegraph_files`, and
   `codegraph_node` as appropriate; inspect source when a literal or generated
   detail is not represented in the graph.
3. **Map boundaries.** Identify layers, packages, feature seams, public
   interfaces, persistence or process boundaries, and ownership. Record where
   data or control crosses each boundary and which direction dependencies flow.
4. **Trace dependencies.** Follow callers and callees from the entry point,
   then use impact analysis to find consumers and tests. Use
   `codegraph_callers` and impact exploration rather than guessing from names.
   Distinguish runtime dependencies from test/build/tooling dependencies and
   note cycles or unstable inward dependencies.
5. **Check reuse before adding.** Search for an existing abstraction, helper,
   adapter, convention, or extension point that already expresses the need.
   Prefer the narrowest compatible reuse; explain why a new abstraction is
   necessary if no suitable one exists.
6. **Apply a deletion test.** For each proposed file, abstraction, layer, or
   dependency, ask: “What breaks if this is deleted?” A concrete consumer,
   behavior, or boundary should justify it. If nothing meaningful breaks,
   prefer deletion or omission over speculative generality.
7. **Identify safe extension points.** Recommend the smallest boundary where a
   change can be made without leaking implementation details or widening
   ownership. Include affected callers, tests, migration risks, and the
   smallest useful verification seam.

Do not infer architecture solely from directory names. Confirm claims through
symbols, callers/callees, tests, and configuration. Do not treat dependency
counts or graph shape as design quality without explaining the behavior and
ownership they represent.

## Expected output

Return a concise architecture map suitable for an architecture survey or
implementation handoff:

- **Scope:** requested change, constraints, and out of scope.
- **Current shape:** relevant components and their responsibilities.
- **Boundaries:** interface/process/data seams and ownership at each seam.
- **Dependency paths:** entry point → callers/callees/consumers, including risks.
- **Reuse and deletion tests:** existing pieces to reuse and candidates to omit.
- **Safe extension point:** recommended owner and smallest verification seam.
- **Open questions:** uncertainties that require evidence or human decision.

Cite concrete file paths and symbols for important claims. Keep proposed
changes separate from the current-state map, and stop to ask for clarification
when the evidence cannot distinguish materially different designs.
