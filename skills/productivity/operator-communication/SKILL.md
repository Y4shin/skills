---
name: operator-communication
description: How to write every message you send the operator, including status reports, ticket close-outs, explanations, questions, and refusals. Use before composing a reply longer than a few lines, and always before the closing report that ends a run. Not for authoring skills, AGENTS.md, or docs an agent reads; use writing-for-agents for those.
---

# Operator communication

If a `tw_*` tool or the workflow misbehaves, refuses you, or otherwise surprises you, invoke the `workflow-failure` skill before improvising.

The operator reads your message without your context. They did not watch the
tool calls, did not read the subagent receipts, and do not hold the names you
coined during the run. Every rule below serves one test:

**Could a developer who saw none of this run follow the message on the first
read?**

## When this applies

Load this skill before the first message you send the operator in a session,
and write every later message under it. It matters most at the end of a long
run. There your context is full of the run's own vocabulary and the operator
has none of it, so the closing report is the message that must pass every
check, not the one that gets the least attention.

It does not apply to code, commit messages, or files written under `docs/`.

## The three checks

Run these on the draft, not on the intent.

1. **Every term is defined where it first appears.** A term names something
   you created, read, or decided during this run: a file, a test, a helper, a
   rule, a ticket, an abstraction of yours. Define it in the sentence that
   first uses it, or leave it out. The operator cannot recover it.
2. **The first sentence gives the state of the work now.** Not the story of
   how you got there, and not the plan for what comes next.
3. **Nothing is labelled before it is explained.** A heading, a bold lead-in,
   or a bullet label that names something is a claim the operator cannot
   check. State the fact first, then name it.

## Short is not the goal

"Maximize useful information per word" means cut the words that carry no
information. It does not mean cut the words that let the operator decode the
ones that remain. A four-word label the operator has to ask about carries
less information than the two sentences that replace it, and it costs a round
trip.

Two habits cause more damage than length:

- **A label standing in for a fact.** "Two fences pull against criteria"
  names your private abstraction. The content was two plain sentences.
- **An identifier standing in for a description.** `rawMemberPaths` is a good
  name inside the code and a useless one in a message.

## What earns a place

Legibility is not the only test. A message can be clear and still be full of
detail that carries nothing. Two questions decide whether a detail stays:

- **Does it change what the operator can rely on?** An uncertainty about
  whether the work is correct counts, because it changes what the operator
  can trust. A failure you recovered from in the next step does not, because
  the end state is the same as if it had never happened.
- **Does it change what the operator can decide?** An option, a cost, a
  constraint, or a risk counts. A fixture, a helper, a retry count, or a step
  receipt does not.

A detail that answers both questions "no" is out, even when it filled 45
minutes of the run.

> Cut: "The build failed on a syntax error I had just introduced. I fixed it
> and the build went green."
>
> Keep: "The build is green, but I cannot confirm the fix is the real one. The
> failure may return on a cold cache."

Both are snags. One is closed and the other is open, and only the open one
changes what the operator can rely on. Selection cuts in both directions: a
message can also be missing the detail that decides the next step.

## Worked example

Bad:

> The raw-member rule is narrower than its criterion: only the by-partlabel
> spelling is refused, so `drift-check` would miss a by-id mount.

Good:

> The rule that stops a mount from naming a raw member of an array only
> catches one spelling of the disk name. A declaration that names the same
> member as `/dev/disk/by-id/...` still passes evaluation. `drift-check`
> reuses that list of names, so it would miss the same case.

Same facts. The second states the subject, then the gap, then the
consequence.

## Shape

- Lead with the outcome or the current state.
- One topic per paragraph. Short sentences, active voice, simple tense. Put a
  condition before the action it governs.
- Use a list for a genuine set. Use a heading only when the message has
  sections the operator will navigate. Never a template for its own sake.
- State what you verified and what you did not. A claim you could not check
  stays a claim you could not check.
- Decisions: what needs deciding, why it matters, the practical options, and
  your recommendation.
- No em-dashes, no idioms, no promotional adjectives, and no closing sentence
  that restates the opening.

## Language

Plain English carrying the project's own vocabulary. Follow `CONTEXT.md` when
the repository has one, and use its terms instead of inventing synonyms. Where
a standard serves, ASD-STE100 Simplified Technical English is the house
choice: one meaning per word, one word per meaning, short sentences, active
voice, no noun stacks.

## Refusals, failures, and bad news

The same shape as good news. What is now true, usually that nothing changed
and here is the state. What blocks it. What the operator can choose. Never a
wall of receipts; one pointer to the detail.
