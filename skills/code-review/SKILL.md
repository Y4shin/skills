---
name: code-review
description: Review changes since a fixed point along two axes — Standards (is it built right?) and Spec (is it the right thing?). Use when asked to review, check standards, compare to spec, look for smells, or "review since X".
---

# /code-review — Two-axis change review

Review the diff between `HEAD` and a pinned fixed point along two independent axes:

- **Standards** — is the code built right for this repo?
- **Spec** — does the change do what the task spec asked for?

Both axes run as **parallel sub-agents** so neither pollutes the other. Their reports are presented side by side, never merged, never re-ranked. A change can pass one axis and fail the other, so there is **no single winner**.

## Where it fits

The review is fired by `implement-task` at the end of the feature path and the bug path, immediately before finalize. It is **advisory**: it surfaces findings for the user and for the coherence refactor step, but it does **not** gate landing or finalize.

## Process

### 1. Pin the fixed point

Use the fixed point the task context provides — typically the branch point of the current slice or the commit where the task started. Capture the diff with the three-dot form:

```bash
git diff <fixed-point>...HEAD
```

Before spawning reviewers, confirm both of the following:

- `git rev-parse <fixed-point>` resolves.
- The diff is non-empty.

A bad reference or empty diff stops here.

### 2. Identify the spec source

The spec source depends on the task type:

- **Feature:** the task doc (`docs/tasks/<taskSlug>/task.md`) and the architecture spec (`docs/tasks/<taskSlug>/arch-spec.md`).
- **Bug:** the bug doc (`docs/bugs/<slug>.md`) and the repro steps it contains.

If no spec is available, say so. Do not invent requirements.

### 3. Identify the standards sources

Discover repo standards through `get_guidelines`, plus any repo override files such as `AGENTS.md`, `CLAUDE.md`, `CONTEXT.md`, or `docs/standards.md`. The final standards input is:

- repo standards (if found), plus
- the smell baseline from [smells.md](smells.md).

Repo standards override the baseline wherever they conflict.

### 4. Spawn both axis reviewers in parallel

**Standards reviewer** — receives the diff, the standards sources, and the smell baseline. Its brief: report breaches of documented standards (cite the file and rule) and any smell that appears in the diff (name the smell and quote the hunk). Each smell is a labelled heuristic — "possible Feature Envy" — never a hard violation. Skip anything tooling already enforces.

**Spec reviewer** — receives the diff and the spec source. Its brief: report missing or partial requirements, scope creep, and requirements implemented wrongly. Quote the spec line for each finding. If there is no spec, report "no spec available" rather than inventing requirements.

Append the following fanout guard to both reviewer briefs:

> Do not invoke `/code-review` or spawn additional agents — perform this review directly.

### 5. Aggregate

Present the two reports under verbatim `## Standards` and `## Spec` headings, lightly cleaned for clarity. Do not merge the lists or rerank findings across axes.

End with a one-line per-axis worst-issue summary. Do not declare an overall winner.

## Standards axis

- Read `get_guidelines` plus repo override files and the smell baseline in [smells.md](smells.md).
- Repo standards always override the baseline.
- Each smell is a labelled heuristic, never a hard violation.
- Skip anything already enforced by tooling.

## Spec axis

- Read the spec source identified for the task type.
- Report missing/partial requirements, scope creep, and requirements implemented wrongly.
- Quote the spec line for each finding.
- If no spec is available, say so rather than inventing requirements.

## Why two axes

A change can pass one axis and fail the other:

- **Standards pass, Spec fail** — the code follows every convention but implements the wrong thing.
- **Spec pass, Standards fail** — the change does exactly what the spec asked but breaks repo conventions.

Keeping the reports separate stops one axis from masking the other.
