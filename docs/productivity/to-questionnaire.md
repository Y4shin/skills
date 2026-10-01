# to-questionnaire

## What it does

`to-questionnaire` turns a decision you cannot answer alone into a
**questionnaire**: a Markdown document you hand to one person to fill in
async, or work through together in a meeting. The recipient holds knowledge
you lack; the questionnaire pulls it out of them.

The discipline is **grill the send, not the subject**: it interviews you
only about the send, which you can always answer, never about the subject
matter itself (that is the recipient's knowledge). Two exchanges:

1. **Who is it going to?** Role, expertise, relationship to you. This fixes
   the tone and how much context the document must carry.
2. **What do you need back?** The specific decisions or facts you cannot
   resolve alone. This is the **gap** between what the recipient knows and
   what you need.

Then it writes the questionnaire to `to-questionnaire-<slug>.md` in the
current directory and reports the path. The document is framed as a
discovery questionnaire: purpose and decision riding on it, sender and
recipient, a one-paragraph context orientation, answer guidance (deadline,
effort, partial answers and "I don't know" are useful), then questions
grouped under theme headings, **most-important-first** because async means
you may only get one pass. Every question is one idea, never compound, with
an answer stub beneath it, and a one-line "why this matters" only where the
question could be misread. A closing catch-all sweeps up what was not asked.

## When to reach for it

The model reaches for it when a decision depends on someone else's
knowledge and a live conversation is not happening: a vendor contact, a
domain expert, a maintainer of another repo. Ask for "a questionnaire for X
about Y".

## Common questions

**Why interview me about the send instead of the topic?**
You cannot answer the recipient's part (that is why the questionnaire
exists), but you always know who it goes to and what you need back. Those
two answers shape every question in the document.

**Why most-important-first?**
Async recipients stop reading. If you only get one pass, the questions that
block your decision must be answered, so they come first.

**Why one idea per question?**
Compound questions get compound, useless answers ("mostly yes, except the
part we discussed"). One idea, one stub, one usable answer.

**Meeting or async?**
Both work. The document is written for async (one pass, self-contained
context), which also makes the meeting version faster.

## It's working if

- The file exists at `to-questionnaire-<slug>.md` and covers every item you
  named in the "what do you need back" exchange.
- The questions target the gap: things the recipient knows and you do not,
  not things you could have looked up.
- Each question is a single idea with an answer stub, ordered by importance
  under theme headings.
- The context paragraph orients someone who was not in your head, without
  becoming a page of background.
