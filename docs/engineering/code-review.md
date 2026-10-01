# code-review

## What it does

`code-review` reviews the diff between HEAD and a pinned fixed point along
two independent axes: **Standards** (is it built right for this repo?) and
**Spec** (does it do what the spec asked?). Both axes run as parallel
sub-agents with fresh context; their reports are presented side by side,
never merged, never re-ranked. A change can pass one axis and fail the
other, so there is no single winner.

The **spec source** depends on what the diff delivers: a feature ticket
reviews against its ticket doc (`docs/tasks/<effort>/tickets/<ticket-slug>/ticket.md`)
plus the effort-root architecture spec
(`docs/tasks/<effort>/arch-spec.md`); a bug ticket reviews against the bug
doc (`docs/bugs/<slug>.md`) and its reproduction from the ticket body; a
whole-effort review takes the ticket docs plus the arch spec.

The **standards sources** are read directly: `AGENTS.md` and `CONTEXT.md`
at the repo root, `docs/standards.md` when present, and `docs/testing.md`.
There is no guidelines tool in the middle. On top of whatever the repo
documents, the Standards axis always carries a **smell baseline**: twelve
Fowler code smells, each a labelled judgement call ("possible Feature
Envy"), skipped where tooling already enforces, and always overridden by a
documented repo standard.

The review is **advisory**: `implement-task` fires it at the end of the
feature and bug paths, before finalize, but it does not gate landing.

## When to reach for it

The model reaches for it when asked to review changes, check standards,
compare against a spec, or "review since X". You can type
`/skill:code-review` with the fixed point. It expects a resolvable fixed
point and a non-empty diff; it stops and says so otherwise.

## Common questions

**Standards pass, spec fail: which is it?**
Both, independently. The code can follow every convention and implement the
wrong thing, or do exactly what the spec asked and break repo conventions.
Keeping the reports separate stops one axis from masking the other.

**Does a finding block the merge?**
No. It surfaces findings for you and the coherence refactor step. Landing is
gated by the CI gate and verification, not by the review.

**Why read the standards files directly?**
One fewer moving part: the reviewer reads the repo's actual conventions from
their canonical homes, so the review cannot drift from what the repo says
about itself.

**What if there is no spec?**
The spec reviewer reports "no spec available" rather than inventing
requirements.

## It's working if

- The reports appear under verbatim `## Standards` and `## Spec` headings,
  each ending in a one-line worst-issue summary, with no overall winner
  declared.
- Standards findings cite the file and rule, or name a smell and quote the
  hunk, and distinguish hard violations from judgement calls.
- Spec findings quote the spec line for each gap, scope creep, or wrong
  implementation.
- Both reviewers ran with fresh context and a fanout guard (no nested
  reviews, no extra agents).
