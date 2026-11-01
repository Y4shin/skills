# operator-communication

## What it does

`operator-communication` is the rule set for every message an agent sends
the operator: status reports, ticket close-outs, explanations, questions,
and refusals. The operator reads the message without the agent's context.
They did not watch the tool calls, did not read the subagent receipts, and do
not hold the names the agent coined during the run.

The skill serves one test. Could a developer who saw none of the run follow
the message on the first read?

It carries three checks the agent runs on its own draft:

- **Every term is defined where it first appears.** A term names something
  the agent created, read, or decided during the run. Define it in the
  sentence that first uses it, or leave it out.
- **The first sentence gives the state of the work now.** Not the story of
  how the agent got there.
- **Nothing is labelled before it is explained.** A heading, a bold lead-in,
  or a bullet label that names something is a claim the operator cannot
  check.

It also settles a contradiction that bites in practice. "Maximize useful
information per word" means cut the words that carry no information. It does
not mean cut the words that let the operator decode the ones that remain. A
four-word label the operator has to ask about carries less information than
the two sentences that replace it, and it costs a round trip.

Clear is not the whole test, because a clear message can still be full of
detail that carries nothing. Selection has its own rule: a detail stays when
it changes what the operator can rely on or what the operator can decide. An
open uncertainty about whether the work is correct changes both. A snag the
agent hit and closed in the next step changes neither, however long the run
around it was. The same rule cuts the other way, so a message that leaves out
the detail deciding the next step fails it too.

## When to reach for it

The model loads it before the first message it sends the operator in a
session, and writes every later message under it. The moment it matters most
is the end of a long run, where the agent's context is full of the run's own
vocabulary and the operator has none of it. That is why the closing report
is the message that must pass every check.

Every promoted skill in this package names the skill near its top, so the
dependency travels with the skill that is running. The five skills that end a
run with a user-facing report (`implement-ticket`, `finalize-effort`,
`wayfinder`, `task-workflow-overview`, and `task-workflow-doctor`) also carry
the three checks inline at their report step. A pointer at the end of a long
run is the one the model skips, so those five do not rely on the pointer
alone.

## Common questions

**Why a skill rather than an `AGENTS.md` rule?**
Both forms are context pointers. A skill keeps the full rules out of the
always-loaded prompt and lets the description carry the trigger. The rules
also ship and version with the package, which a project-level file does not.

**Why give the three checks as a numbered list instead of prose?**
The failure they prevent is not ignorance of the guidance. The agent that
wrote a dense run summary had the style guidance in its prompt. The failure
is a skipped self-check at the moment of writing, so the fix is a short
checklist the agent can run against its draft.

**Does this apply to code, commit messages, or docs?**
No. It governs messages sent to the operator. Documents an agent reads are
`writing-for-agents`; project prose follows the project's own conventions.

**How does the agent tell a reportworthy snag from run noise?**
By asking whether the detail changes what the operator can rely on or decide.
A syntax error the agent introduced and fixed in the next step leaves the end
state identical, so it goes. A fix the agent cannot confirm is exactly the
case that must stay, because the operator would otherwise trust a green
build that may not hold. Process counts stay out on the same test: a retry
count or a step receipt changes no decision the operator makes.

**What is ASD-STE100 doing here?**
The skill names Simplified Technical English as the house standard where a
standard helps: one meaning per word, one word per meaning, short sentences,
active voice, no noun stacks. The same register applies to any message, so
`wait-what` can delegate here instead of describing a second voice.

**What happens when a message still fails these rules?**
The operator runs `/skill:wait-what`, which loads this skill and asks for the
last answer to be rewritten under it. The rules stay in one place and the
repair request stays one command.

## It's working if

- The operator can read a run summary without asking what a term means.
- A message opens with the state of the work now, not with the history of the
  run.
- Reports name the decision, the options, and the recommendation, rather
  than a label for the situation the agent privately built up.
- Closed snags stay out and open uncertainties stay in, on the same test.
- `wait-what` fires less often, because the first pitch landed.
