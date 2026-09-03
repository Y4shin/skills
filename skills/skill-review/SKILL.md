---
name: skill-review
description: Review an Agent Skill along independent criteria — audience fit / meta-noise, trigger behavior, spec conformance and portability. Use when asked to review a skill, check a SKILL.md for quality, trim bloat, or "review this skill".
---

# /skill-review — Multi-criterion skill review

Review a skill (its `SKILL.md`, references, scripts, and frontmatter) along
independent axes. A cheap **stage-0 triage** fixes the axis set up front —
core axes always run, optional axes run only for skills that exercise them —
then every selected axis runs as a **parallel sub-agent** with fresh context.

Axes:

- **Audience fit** (core) — is the body free of meta-level narrative aimed
  at the author instead of the reader-agent? (backstory, "we changed this
  from a prior version because", review-process notes, justification of
  authoring choices).
- **Trigger behavior** (core) — does the `description` reliably fire when it
  should and stay quiet on near-misses?
- **Spec conformance / portability** (core) — does the skill follow the
  portable Agent Skills spec and avoid harness-specific fields in the
  portable core?
- **Progressive disclosure / token budget** (core) — is the body lean with
  detail pushed into `references/`? (See optional axes below for a
  reference-integrity companion.)
- **Accessibility** (optional, UI-producing skills) — screen-reader and
  keyboard-accessible structure when the skill builds a UI.
- **Safety / consequential ops** (optional, destructive or mutating skills)
  — does the `description` state when the skill runs destructive commands,
  sends network traffic, or mutates state?
- **Reference integrity** (optional, skills with `references/`/`scripts/`/
  `assets/`) — do every resource path resolve, stay one level deep, and get
  linked with a "when to read" note?

Triage fixes the axis set **before any reviewer runs**. No reviewer ever
requests another axis mid-run — the plan is final once triage finishes. Every
selected axis runs as a **parallel sub-agent** with fresh context, so no axis
pollutes another or carries the authoring session's backstory. Reports are
presented side by side, never merged, never re-ranked. A skill can pass one
axis and fail another, so there is **no single winner**.

**Cap:** keep the total selected to at most **5 axes**. Triage prunes
optional axes rather than stacking beyond the cap.

## Where it fits

`skill-creator` invokes this at the end of skill authoring (phase 7). It is
**advisory**: it surfaces findings for the user and the author, but it does
not gate landing by itself.

## Process

### 1. Pin the skill under review

Resolve the target skill directory from the task context (usually a
`skills/<name>/` directory or the one just authored). Confirm it exists and
contains a `SKILL.md`. If the target is missing or has no `SKILL.md`, stop
and report why.

### 2. Triage the axis set

Fix the review plan **before spawning any reviewer**. Read the skill's
`SKILL.md` and inspect its resources to decide which axes apply:

- The four **core** axes always run: Audience fit, Trigger behavior, Spec
  conformance / portability, Progressive disclosure / token budget.
- Select an **optional** axis only when the skill exercises it:
  - **Accessibility** — the skill builds or renders a UI.
  - **Safety / consequential ops** — the skill runs destructive commands,
    sends network traffic, or mutates state.
  - **Reference integrity** — the skill has `references/`, `scripts/`, or
    `assets/`.

The plan is **final once fixed** — no reviewer may request another axis later.
Keep the total to at most **5 axes**; if that overflows, prune the lowest-value
optional axes rather than stacking beyond the cap.

Present the plan as a short preamble before the report:

```
Review plan: <core axes, all run> + <selected optional axes>
Runners: <the parallel reviewer agents that will run>
```

### 3. Spawn the planned axes in parallel

Spawn one fresh, read-only reviewer per axis in the plan. Each reads the
skill directly (the skill is disk-persisted, so fresh context does not cut
off the target). Do not pass authoring-session backstory to any reviewer.

**Audience-fit reviewer** (`tools: read, bash`)
- Read the `SKILL.md` body.
- Flag any sentence aimed at the **author** rather than the **reader-agent**:
  version-change justifications ("changed from a prior version because"),
  review-process notes ("during the grilling we found"), the skill's own
  creation history, or rationale for authoring choices.
- Distinguish reader-facing rationale (why the *system* behaves this way —
  valuable) from author-facing rationale (why the *document* was written this
  way — noise).
- Quote the offending line for each finding.
- Keep the report under 400 words.

**Trigger-behavior reviewer** (`tools: read, bash`)
- Read the `description` and the body.
- Propose should-trigger and near-miss requests and judge whether the
  description fires correctly on each.
- Flag if the description is vague, over-promising, or would false-trigger on
  a query that needs something else.
- Keep the report under 400 words.

**Spec/portability reviewer** (`tools: read, bash`)
- Read `skills/skill-creator/references/agent-skills-spec.md` for the portable
  spec, or validate by hand per the spec (name hyphen-case ≤64 == folder,
  description ≤1024, no angle brackets, only allowed frontmatter keys).
- Flag non-spec frontmatter in the portable core (harness-specific fields
  belong in an explicit, documented extension).
- Keep the report under 400 words.

**Progressive-disclosure / token-budget reviewer** (`tools: read, bash`)
- Read the `SKILL.md` body and count lines/tokens.
- Flag a body over ~500 lines / ~5000 tokens where detail belongs in
  `references/` instead.
- Flag references that are never linked from the body.
- Keep the report under 400 words.

**Accessibility reviewer** (`tools: read, bash`) *(optional)*
- Read any UI-building code or templates in the skill.
- Flag keyboard-inaccessible or screen-reader-hostile structure.
- Keep the report under 400 words.

**Safety / consequential-ops reviewer** (`tools: read, bash`) *(optional)*
- Read the `description` and the body for destructive, network, or state-
  mutating operations.
- Flag any such operation not stated explicitly in the `description`.
- Keep the report under 400 words.

**Reference-integrity reviewer** (`tools: read, bash`) *(optional)*
- Resolve every `scripts/`, `references/`, `assets/` path in the `SKILL.md`
  and linked files; confirm each points to a real file.
- Confirm references stay one level deep (no chains).
- Confirm each reference is linked with a "when to read" note.
- Keep the report under 400 words.

Append this fanout guard to each reviewer brief:

> Do not invoke `/skill-review` or spawn additional agents — perform this review directly.

### 4. Aggregate

Present the reports under verbatim headings, lightly cleaned for clarity. Do
not merge the lists or re-rank findings across axes. Include the review plan
preamble. End with a one-line per-axis worst-issue summary; do not declare an
overall winner.

```markdown
## Audience fit

<findings>

## Trigger behavior

<findings>

## Spec / portability

<findings>
```

## The audience-fit axis (meta-leakage)

This is the axis for the problem that motivates the reviewers being
*fresh-context*:

- The body of a skill is **instructions for the reader-agent**, not a
  transcript of how the skill was authored.
- Reader-facing rationale (explaining why the system behaves this way) helps
  the agent make context-dependent decisions — keep it.
- Author-facing rationale (version-change justifications, review-process
  notes, creation backstory) is noise that wastes the reader's context — flag
  it.
- A fresh-context reviewer cannot see the authoring session, so it can only
  judge what actually made it onto the page. That is the point.

## Why separate axes

A skill can pass one axis and fail another:

- **Audience fit pass, trigger fail** — the body is clean but the description
  never fires.
- **Trigger pass, spec fail** — the description is great but it uses a
  non-portable frontmatter field.

Keeping the reports separate stops one axis from masking another.
