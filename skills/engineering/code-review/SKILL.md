---
name: code-review
description: Review changes since a fixed point along two axes - Standards (is it built right?) and Spec (is it the right thing?). Use when asked to review, check standards, compare to spec, look for smells, or "review since X".
---

# /code-review - Two-axis change review

Review the diff between `HEAD` and a pinned fixed point along two independent
axes:

- **Standards** - is the code built right for this repo?
- **Spec** - does the change do what the task spec asked for?

Both axes run as **parallel sub-agents** so neither pollutes the other. Their
reports are presented side by side, never merged, never re-ranked. A change
can pass one axis and fail the other, so there is **no single winner**.

## Where it fits

The review is fired by `implement-task` at the end of the feature path and the
bug path, immediately before finalize. It is **advisory**: it surfaces findings
for the user and for the coherence refactor step, but it does **not** gate
landing or finalize.

## Process

### 1. Pin the fixed point

Use the fixed point the task context provides, typically the branch point of
the current slice or the commit where the task started. Capture the diff with
the three-dot form:

```bash
git diff <fixed-point>...HEAD
```

Before spawning reviewers, confirm both of the following:

- `git rev-parse <fixed-point>` resolves.
- The diff is non-empty.

A bad reference or empty diff stops here.

### 2. Identify the spec source

The spec source depends on the task type:

- **Feature:** the task doc (`docs/tasks/<taskSlug>/task.md`) and the
  architecture spec (`docs/tasks/<taskSlug>/arch-spec.md`).
- **Bug:** the bug doc (`docs/bugs/<slug>.md`) and the repro steps it contains.

If no spec is available, say so. Do not invent requirements.

### 3. Identify the standards sources

Discover repo standards through `get_guidelines`, plus any repo override files
such as `AGENTS.md`, `CONTEXT.md`, or `docs/standards.md`.

On top of whatever the repo documents, the Standards axis always carries the
**smell baseline** below: a fixed set of Fowler code smells (_Refactoring_,
ch.3) that applies even when a repo documents nothing. Two rules bind it:

- **The repo overrides.** A documented repo standard always wins; where it
  endorses something the baseline would flag, suppress the smell.
- **Always a judgement call.** Each smell is a labelled heuristic ("possible
  Feature Envy"), never a hard violation. Skip anything tooling already
  enforces.

Each smell reads _what it is_ then _how to fix_; match it against the diff:

- **Mysterious Name**: a function, variable, or type whose name does not
  reveal what it does or holds. Rename it; if no honest name comes, the design's
  murky.
- **Duplicated Code**: the same logic shape appears in more than one hunk or
  file in the change. Extract the shared shape, call it from both.
- **Feature Envy**: a method that reaches into another object's data more than
  its own. Move the method onto the data it envies.
- **Data Clumps**: the same few fields or params keep travelling together (a
  type wanting to be born). Bundle them into one type, pass that.
- **Primitive Obsession**: a primitive or string standing in for a domain
  concept that deserves its own type. Give the concept its own small type.
- **Repeated Switches**: the same `switch`/`if`-cascade on the same type recurs
  across the change. Replace with polymorphism, or one map both sites share.
- **Shotgun Surgery**: one logical change forces scattered edits across many
  files in the diff. Gather what changes together into one module.
- **Divergent Change**: one file or module is edited for several unrelated
  reasons. Split so each module changes for one reason.
- **Speculative Generality**: abstraction, parameters, or hooks added for
  needs the spec does not have. Delete it; inline back until a real need shows.
- **Message Chains**: long `a.b().c().d()` navigation the caller should not
  depend on. Hide the walk behind one method on the first object.
- **Middle Man**: a class or function that mostly just delegates onward. Cut
  it, call the real target direct.
- **Refused Bequest**: a subclass or implementer that ignores or overrides
  most of what it inherits. Drop the inheritance, use composition.

The full smell definitions also live in [smells.md](smells.md) for the
sub-agent prompt (paste them in full; the sub-agent has no other access).

### 4. Spawn both axis reviewers in parallel

**Standards reviewer** receives the diff, the standards sources, and the
smell baseline (pasted in full from step 3). Its brief: report breaches of
documented standards (cite the file and rule) and any smell that appears in
the diff (name the smell and quote the hunk). Distinguish hard violations from
judgement calls: documented-standard breaches can be hard, but baseline smells
are always judgement calls, and a documented repo standard overrides the
baseline. Skip anything tooling enforces. Under 400 words.

**Spec reviewer** receives the diff and the spec source. Its brief: report
missing or partial requirements, scope creep, and requirements implemented
wrongly. Quote the spec line for each finding. If there is no spec, report
"no spec available" rather than inventing requirements. Under 400 words.

Append the following fanout guard to both reviewer briefs:

> Do not invoke `/code-review` or spawn additional agents. Perform this review
> directly.

### 5. Aggregate

Present the two reports under verbatim `## Standards` and `## Spec` headings,
lightly cleaned for clarity. Do not merge the lists or rerank findings across
axes.

End with a one-line per-axis worst-issue summary. Do not declare an overall
winner.

## Why two axes

A change can pass one axis and fail the other:

- **Standards pass, Spec fail** - the code follows every convention but
  implements the wrong thing.
- **Spec pass, Standards fail** - the change does exactly what the spec asked
  but breaks repo conventions.

Keeping the reports separate stops one axis from masking the other.
