---
name: refine-idea
description: Free-form grill-me session to flesh out a rough idea into shared understanding, stored in docs/ideas/. One question at a time, each with a recommended answer. Use when the user has a rough idea, says "grill me", or when a request is too big or vague for create-task.
---

# Refine Idea

**Interview-only. You never write code, never edit files outside `docs/ideas/`.**
**You never start implementing. Refuse if asked.**

Runs a grill-me session: a relentless, free-form interview about an idea until
you and the user reach a shared understanding. The artifact is a fleshed-out
idea doc that `/skill:create-task` can consume.

## Idea doc

`docs/ideas/<slug>.md` (slug: kebab-case, derived from the idea; create
`docs/ideas/` if missing):

```yaml
---
kind: idea
title: <title>
slug: <slug>
status: proposed
created_at: <ISO>
grilled_at:
converted_to:
---

# <Title>

<the idea, free-form, in the user's own words>

## Open questions

- [ ] <question you still want to ask>
```

- `status`: `proposed` (captured) → `in-grilling` (session running) → `ready`
  (shared understanding reached). Terminal: `converted` (a task was created
  from it — set by create-task, which fills `converted_to`) and `dropped`
  (abandoned).
- The body is **free-form**. It starts as the raw seed and grows as answers
  arrive — add whatever sections the content calls for. No template, no fixed
  topic list.
- `## Open questions` is the only required section: your queue of things you
  still want to ask. It drives the session and survives across sessions.

## Entry modes

**New idea** (no slug, or "grill me about X"):
1. Write the seed doc immediately — the user's own words, `status: proposed`,
   your obvious first questions in the queue. Commit:
   `docs(idea): capture <slug>`. Nothing is lost if the session is abandoned.
2. Set `status: in-grilling` and start grilling.

**Existing idea** (slug given):
- `ready` → point to `/skill:create-task <slug>`; nothing to do.
- `converted` / `dropped` → say so, ask what the user wants.
- `proposed` → set `in-grilling`, build the queue from the seed, start.
- `in-grilling` → resume from the Open questions queue.

## Grilling rules

1. **One question at a time.** Never batch.
2. **Every question comes with your recommended answer** — the user reacts to
   a proposal, never a blank prompt.
3. **Explore the codebase instead of asking** whenever the answer can be found
   by reading code.
4. **Walk the decision tree.** Settle parent decisions before the choices that
   hang off them; follow the branches each answer opens. This is deliberately
   *not* a structured interview — no phases, no checklist. The idea itself
   determines what you ask.
5. **Never implement.** If asked, refuse: "This skill only refines ideas. Once
   it's ready, run `/skill:create-task <slug>`."
6. **The doc is a living artifact.** After each answer: fold the decision into
   the body in whatever structure fits, check off the answered question, and
   append any new questions the answer raised.

## Finishing

The session ends only when **no unanswered questions remain in the queue**.
Then show the doc, ask the user to confirm you share the same understanding,
and:

- Set `status: ready`, fill `grilled_at`, commit:
  `docs(idea): grill <slug> to ready`.
- Hand off: "Next: `/skill:create-task <slug>`"

If the user stops early, that's fine — commit the doc as-is. The queue
preserves exactly where the next session resumes.
