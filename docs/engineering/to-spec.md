# to-spec

## What it does

`to-spec` turns the current conversation (or a wayfinder map) into a spec. It
does not interview you; it synthesizes what has already been discussed and
writes it to `docs/tasks/<effort>/spec.md`, at the effort root.

Before writing, it sketches the **seams** at which the feature will be
tested: the existing seams are preferred, the highest seam wins, and the
ideal number of new seams is one. It checks those seams with you before
proceeding. The spec itself follows a fixed template: Problem Statement,
Solution, an extensive numbered list of User Stories, Implementation
Decisions, Testing Decisions, Out of Scope, and Further Notes.

The spec file carries frontmatter (`type: spec`) and starts as
`status: draft`. When you approve it, the status flips to `stable` with
`tw_set docs/tasks/<effort>/spec.md status stable`.

## When to reach for it

Type `/skill:to-spec` when a multi-session build has been discussed and the
decisions are settled: it freezes the shared understanding into an artifact
`to-tickets` can break apart. It is the second step of the main flow, after
`/skill:wayfinder`'s map has cleared or after a long design conversation.

Skip it for single-session work that goes straight to
`/skill:implement-task`, and for work still too foggy to spec (that is
wayfinder's job first).

## Common questions

**Why are there no file paths or code snippets in the spec?**
They go stale fast. The spec records decisions, not their current
realization. The one exception: a prototype-produced snippet that encodes a
decision precisely (a state machine, a schema, a type shape) is inlined,
trimmed to the decision-rich parts.

**Draft versus stable?**
The spec is `draft` while it is being synthesized, and becomes `stable` only
when you approve it. Nothing downstream should treat a draft as agreed.

**Spec or map?**
The map (wayfinder's output) holds decisions and open questions at low
resolution. The spec is the buildable plan: user stories, implementation
decisions, and testing decisions at high resolution. The spec is written
after the decisions are made, not instead of making them.

**Do I have to re-explain everything to the skill?**
No. It works from the conversation context and the repo. If you pass an
effort slug or spec reference, it reads that too.

## It's working if

- The spec lands at `docs/tasks/<effort>/spec.md` with `type: spec`
  frontmatter, not a bare pre-v4 path.
- The user stories are long and concrete, one per aspect of the feature, in
  "As a &lt;actor&gt;, I want &lt;feature&gt;, so that &lt;benefit&gt;" form.
- Testing decisions name the seams and existing prior art before any ticket
  exists, and the seams were confirmed with you.
- Implementation decisions describe modules, interfaces, and contracts
  without pinning file paths.
- The status reads `stable` only after your explicit approval, flipped via
  the set tool.
