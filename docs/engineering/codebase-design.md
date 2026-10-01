# codebase-design

## What it does

`codebase-design` maps an existing codebase's architecture before a change
is proposed in it: boundaries, dependencies, reuse opportunities, and safe
extension points. It is a shared vocabulary and investigation procedure, not
an autonomous pipeline. Architecture-oriented agents (like the
architecture-scout) use it as their lens; it owns the description of what
exists, while the calling agent owns recommendations.

The vocabulary is the point: **module, interface, depth, seam, adapter,
leverage, locality**. These are the terms the other skills reach for when
they talk about shape (the tdd skill delegates to it when a seam's
placement is in question).

The investigation procedure, in order:

1. State the change boundary: requested behavior, owning capability,
   constraints, out of scope, facts separated from hypotheses.
2. Explore structure with CodeGraph first (`codegraph_explore`,
   `codegraph_search`, `codegraph_files`, `codegraph_node`), reading source
   only for details the graph misses.
3. Map boundaries: layers, packages, feature seams, and which direction
   dependencies flow across each.
4. Trace dependencies with `codegraph_callers` and impact analysis,
   distinguishing runtime from test/tooling dependencies, noting cycles.
5. Check reuse before adding: the narrowest compatible existing abstraction
   beats a new one.
6. Apply the **deletion test** to each proposed piece: what breaks if this
   is deleted? If nothing meaningful, prefer deletion.
7. Identify the safe extension point: the smallest boundary where the change
   lands without leaking implementation details or widening ownership.

## When to reach for it

The model reaches for it before designing a change in an unfamiliar or
substantive repository, and whenever module shape vocabulary is needed (a
seam's depth, an interface's width). It complements navigation tools; it
does not replace them.

## Common questions

**Is this a survey generator?**
No. The architecture-scout agent owns surveys and recommendations; this
skill owns the description and the reasoning that makes a change safe. The
output feeds a survey or an implementation handoff.

**Why prefer deletion over abstraction?**
The deletion test: an abstraction with no concrete consumer, behavior, or
boundary justifying it is speculative generality. If nothing meaningful
breaks when it is deleted, it was never load-bearing.

**Can I trust directory names to describe the architecture?**
No. Claims are confirmed through symbols, callers, tests, and configuration;
directory names are a hypothesis, not evidence.

## It's working if

- The output separates the current-state map (scope, shape, boundaries,
  dependency paths) from proposed changes.
- Important claims cite concrete file paths and symbols, not vibes.
- The recommended extension point is the smallest one that works, with
  affected callers, tests, and migration risks named.
- Open questions are surfaced as uncertainties rather than resolved by
  invention.
