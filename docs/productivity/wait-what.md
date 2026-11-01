# wait-what

## What it does

`wait-what` is the repair request for an answer that did not land. Invoking it
stops the current direction and asks for the last answer to be rewritten under
[`operator-communication`](./operator-communication.md).

The rewrite is constrained instead of re-explained. The skill names the
governing rules, asks for the detail the operator needs to judge the outcome,
and forbids the usual non-repair: announcing the rewrite, listing the
changes, or naming the style guide it applied. The operator gets the
corrected answer, not a report about the correction.

Anything typed after the command is applied as an additional request. That
text narrows or extends the rewrite, and it does not replace it, so
`/skill:wait-what` plus a specific complaint works in one step.

Every run also records itself. Step one of the skill is a `submit_feedback`
call with `kind: "wait-what"` and one sentence of `data`, written before the
rewrite. One fixed kind makes the series countable with a single query, so
the rate of "the operator had to intervene" is a number rather than an
impression.

## When to reach for it

Type `/skill:wait-what` the moment an answer leaves you confused rather than
informed. It is user-invoked and deliberately blunt; there is no polite
phrasing to remember.

It is also the fallback for the case `operator-communication` did not
prevent: the agent wrote a summary only its own context could decode. Run it
rather than asking "can you explain that again", which invites the same
vocabulary and the same density back.

## Common questions

**Why does it load `operator-communication` instead of restating the rules?**
The rules live in one place, so a fix to them reaches this skill too. The
`wait-what` body carries the *request*; the rules carry the standard.

**Why forbid announcing the rewrite?**
Without that line the agent tends to answer with "here is a clearer version"
and a list of what it changed. That is another message to read instead of the
answer that was asked for. The three checks in `operator-communication` are
the agent's business, not the operator's.

**Why does it ask for the detail the operator needs, rather than every fact?**
A rule to keep every fact blocks the rewrite from pruning, and a cluttered
answer is one of the two things this command fixes. The test is the one in
`operator-communication`'s "What earns a place" section: a detail stays when
it changes what the operator can rely on or decide. A syntax error fixed in
the next step changes neither and goes. An open uncertainty about whether the
fix is real changes both and stays.

**What happened to Simplified Technical English and `CONTEXT.md`?**
Both moved into `operator-communication`, where they apply to every message
rather than only to a repair. `wait-what` now inherits them by pointing at
that skill.

**Is this an insult to the writer?**
It is a repair request, not a judgment. The answer did not land; the cheapest
fix is a constrained rewrite, and everyone keeps moving.

**Why is the feedback call in the skill rather than in the extension?**
The extension can see an invocation but not intent, and `skill_invoke` events
already record that a command ran. The feedback row exists to label the run
as a comprehension failure and carry one sentence of what went wrong, which
only the model can write. The trade-off is that a model step can be skipped,
while `skill_invoke` cannot, so treat the two as a primary count and a
descriptive sample rather than as one series.

## It's working if

- The reply to the command is the rewritten answer, with no preamble about
  what changed.
- One `wait-what` feedback row exists per invocation, so the rate is
  measurable.
- The rewrite keeps what decides the outcome and how to read it, drops the
  closed snags, and fills a gap the original left open.
- A complaint typed after the command lands in the same reply, so a second
  round is not needed.
- `wait-what` fires less often over time, because the first answer passed the
  three checks.
