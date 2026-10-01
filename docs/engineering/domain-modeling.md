# domain-modeling

## What it does

`domain-modeling` builds and sharpens the project's domain model **as you
design**: challenging terms that conflict with the glossary, proposing
canonical names for fuzzy ones, stress-testing relationships with concrete
edge-case scenarios, and cross-referencing your claims against what the code
actually does. It is the active discipline; merely reading `CONTEXT.md` for
vocabulary is a habit any skill can do.

The artifacts it owns:

- **`CONTEXT.md`** at the repo root (or per-context when a
  `CONTEXT-MAP.md` splits the repo): a glossary and nothing else. Terms are
  updated inline the moment they are resolved, never batched, and the file
  stays devoid of implementation details.
- **ADRs** under `docs/adr/`, offered sparingly: only for decisions that are
  hard to reverse, surprising without context, and the result of a real
  trade-off. All three, or no ADR.
- A **domain model** on request: boundary and actors, concept catalog,
  relationship map, invariant catalog (numbered, testable), lifecycle and
  state table, terminology, and open uncertainties.

Files are created lazily: a `CONTEXT.md` appears when the first term is
resolved, an `adr/` directory when the first ADR is earned.

## When to reach for it

The model reaches for it when the discussion is changing the domain
language: a term is being challenged, a word is overloaded, a
hard-to-reverse decision needs recording, or `CONTEXT.md` / an ADR needs
writing. It runs underneath the other skills (grilling and triage call it
inline as decisions land).

## Common questions

**Our glossary says X but the code does Y. Which wins?**
The contradiction is surfaced, not papered over: "the code cancels entire
orders, you just said partial cancellation is possible; which is right?"
You decide; the glossary and the code then agree.

**Why not put implementation details in CONTEXT.md?**
It is a glossary, not a spec. Implementation decisions belong in specs and
ADRs; the glossary holds the language, which changes far more slowly.

**When is an ADR worth it?**
When changing your mind later would cost meaningfully, a future reader
would wonder why, and there were real alternatives. Skip it for reversible
or obvious choices, and skip it when only one of the three holds.

**We have multiple bounded contexts. Does it cope?**
Yes: a `CONTEXT-MAP.md` at the root points at each context's own
`CONTEXT.md` and ADR set, and the skill follows the map.

## It's working if

- Fuzzy terms get canonical definitions in the moment, and the glossary
  updates inline rather than in a cleanup pass.
- Edge-case scenarios forced precision ("is a cancelled order still an
  order?") instead of leaving the boundary implicit.
- ADRs exist only where all three criteria held, each recording the
  trade-off and the rejected alternatives.
- New code and the glossary agree; contradictions between them were caught
  in conversation, not in review.
