# to-spec

## What it does

`to-spec` synthesizes the effort's spec from the settled record: the map and
the planning tasks' recorded results. It writes the specification to
`docs/tasks/<effort>/spec.md`, at the effort root. Nothing is asked that
planning already settled, and the phase runs no question round of its own;
when a decision is missing, the run returns to `wayfinder` rather than
settling it in the spec.

The spec carries `type: spec` frontmatter and the full section set: Problem
Statement, Solution, an extensive numbered list of User Stories,
Implementation Decisions (the settled implementation decisions), Testing
Decisions, Out of Scope, and Further Notes. The spec is written through
`tw_write_spec`, the only writer of the spec, and starts as `status: draft`.
When you approve it, a publish write flips the status to `stable`.

The architecture is not written here: `to-tickets` produces the living
architecture document, and the spec's architecture content is what planning
already settled. Once that document exists, a note is added to this spec
marking its architecture content as archival; nothing is deleted.

## When to reach for it

Type `/skill:to-spec <effort-slug>` after `wayfinder` has reconciled the
effort's map: it collapses the map's linked decisions into the buildable
plan `to-tickets` breaks apart. The opener refuses the phase until planning
is reconciled, and the refusal points back to Wayfinder.

Skip it when there is nothing to plan and nothing to build (wayfinder
records that in the map), not when the plan is still foggy: that is
wayfinder's job first.

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
No. It synthesizes from the settled record: the map and the planning tasks'
recorded results. If you pass an effort slug, it reads those.

**Where does the architecture live?**
Not in this phase. `to-tickets` produces `architecture.md` and the spec's
architecture content becomes archival; the spec itself is never trimmed.

## It's working if

- The spec lands at `docs/tasks/<effort>/spec.md` with `type: spec`
  frontmatter, written through `tw_write_spec`.
- The spec carries the full section set, including the settled
  implementation and testing decisions from planning.
- The user stories are long and concrete, one per aspect of the feature, in
  "As a &lt;actor&gt;, I want &lt;feature&gt;, so that &lt;benefit&gt;" form.
- No new decision was settled during the write: a missing one sent the run
  back to Wayfinder instead.
- The spec is `stable` only after your approval.

The report at the end follows the shape in
`resources/report.md`: the spec's state, your approval ask, the next step,
what is blocked, and one pointer to the spec.
