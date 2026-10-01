# skill-review

## What it does

`skill-review` reviews a skill (its SKILL.md, references, scripts, and
frontmatter) along independent axes. A cheap **stage-0 triage** fixes the
axis set up front: four core axes always run (audience fit, trigger
behavior, spec conformance and portability, progressive disclosure and token
budget), optional axes run only when the skill exercises them (accessibility
for UI-producing skills, safety for destructive or consequential ops,
reference integrity for skills with resources). The plan is final once
triage finishes, capped at five axes, and every selected axis then runs as a
parallel sub-agent with fresh context.

Reports are presented side by side, never merged, never re-ranked: a skill
can pass one axis and fail another, so there is no single winner. Each axis
report ends with a one-line worst-issue summary.

The **audience-fit axis** is the reason reviewers run fresh: it flags
meta-level narrative aimed at the author instead of the reader-agent
(version-change justifications, review-process notes, creation backstory),
distinguishing reader-facing rationale (why the system behaves this way,
keep) from author-facing rationale (why the document was written this way,
cut). A fresh-context reviewer can only judge what made it onto the page,
which is exactly the point.

`skill-creator` invokes this review at the end of skill authoring. It is
**advisory**: findings go to you and the author; it does not gate landing by
itself.

## When to reach for it

The model reaches for it when asked to review a skill, check a SKILL.md for
quality, or trim bloat, and automatically at the end of `skill-creator`'s
authoring workflow. Reviewing eval suites or code is a different skill.

## Common questions

**Why fix the axis set before any reviewer runs?**
Mid-run axis escalation is how reviews grow scope and reviewers consume each
other's output. The plan is presented in a preamble, then frozen: no
reviewer may request another axis later.

**Why parallel fresh context instead of one thorough reviewer?**
One reviewer carries the authoring session's backstory and lets one axis's
verdict color another. Fresh reviewers each read only the skill, so
audience-fit findings come from what is actually on the page.

**What does the trigger-behavior reviewer actually do?**
Proposes should-trigger requests and near-misses, then judges whether the
description fires correctly on each, flagging vagueness, over-promising, or
false triggers.

**Does it fix the skill?**
No. It reports; the author decides. Like the code review, it is advisory.

## It's working if

- The review starts with the axis-set preamble and every selected axis's
  report appears under its own heading, unre-ranked.
- Audience-fit findings quote the offending line and separate reader-facing
  rationale from author-facing noise.
- Trigger findings come from concrete should-trigger and near-miss requests,
  not adjectives.
- Optional axes appeared only because the skill exercises them, and the
  total stayed within the five-axis cap.
- No reviewer spawned another review or asked for extra axes mid-run.
