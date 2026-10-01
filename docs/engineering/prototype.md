# prototype

## What it does

`prototype` builds **throwaway code that answers one design question**. The
question decides the shape, so the skill first identifies which branch it is
on:

- **"Does this logic / state model feel right?"** builds a single shareable
  HTML file: free-play buttons plus tabbed guided walkthroughs that push the
  state machine through cases that are hard to reason about on paper, and
  that a non-developer can drive.
- **"What should this look like?"** generates several radically different UI
  variations on a single route, switchable via a URL search param and a
  floating bar.

Getting the branch wrong wastes the whole prototype, so an ambiguous
question defaults to whichever branch matches the surrounding code (backend
module: logic; page or component: UI) and states the assumption up front.

Rules both branches obey: the prototype is throwaway from day one and
clearly named as such, located near the code it prototypes for; it starts
from one command (or a double-click for the HTML file); state lives in
memory, no persistence unless the question itself is about persistence (and
then a scratch store with a "wipe me" name); no tests, no polish, no
abstractions; and the full relevant state is surfaced after every action so
you can see what changed.

When done, the validated decision folds into the real code, and the
prototype itself is captured as a **primary source**: committed to a
throwaway branch, out of main, with the verdict and the question it settled
recorded alongside.

## When to reach for it

The model reaches for it when a design question needs a runnable answer: a
state model you have to feel, a UI you have to see. In the main flow it is
the detour between grilling and the spec, bridged by `/skill:handoff` in
both directions when the prototype needs a fresh session.

## Common questions

**Why throwaway instead of building the real thing better?**
Because the prototype's job is to answer a question cheaply, and code
written to be discarded is free to explore. The main branch keeps only the
validated decision; production quality happens after the answer exists.

**Where does the prototype live?**
Close to where it will actually be used (so context is obvious) but named so
a casual reader sees it is a prototype, following the project's existing
routing conventions rather than inventing a new structure.

**What happens to the answer?**
It is folded into the real code, and the prototype is committed to its own
throwaway branch with the verdict recorded. The branch is the citation: the
decision's evidence stays findable without polluting main.

**Can the user drive it?**
That is the point of both shapes: the logic demo is a double-clickable HTML
file a non-developer can walk through; the UI variants switch from a
floating bar.

## It's working if

- The prototype answers one question, and starting it took one command or
  one double-click.
- State changes are visible immediately, in full, after every interaction.
- Nothing persisted silently, and nothing about it looks like production
  code (no tests, no error handling beyond runnability).
- The validated decision landed in real code, the prototype branch exists
  as the primary source, and the question it settled is recorded.
