---
name: grilling-with-ui
description: Model-invoked, Pi-native browser-visualized grilling — drive a live design-tree graph (rounds, nodes, edges, summary) through the grilling CLI. The UI variant of /grilling.
---

# /grilling-with-ui — browser-visualized decision interviews

Use this reusable, model-invoked skill when a user asks to grill, stress-test,
or make a plan/decision explicit **and wants a live visual graph** of the
grilling as it progresses. It is the browser-visualized variant of the
`/grilling` skill, based on Matt Pocock's canonical grilling skill:
https://raw.githubusercontent.com/mattpocock/skills/refs/heads/main/skills/productivity/grilling/SKILL.md

This skill is a **standalone opt-in**. It is not wired into Wayfinder's
`type: grilling` path (that path uses the text-based `/grilling` skill). Reach
for it when a long, multi-round grilling benefits from a visual the user can
watch in the browser.

The goal is shared understanding, not a performance of questioning. Preserve
the user's decisions, expose trade-offs, and do not silently invent answers.

## Design tree and frontier

Map the subject as a **design tree**: each decision branches into the decisions
that depend on it. Record the known facts, decisions, alternatives, rationale,
constraints, and downstream consequences as the conversation progresses.

Work in **rounds**. The **frontier** is every decision whose prerequisites are
already settled. Recompute it after each answer. Ask the whole currently
unblocked frontier in one round, rather than enforcing one question per
assistant turn. A question that depends on another question still open in this
round belongs to a later round.

For every frontier question, be focused and provide a concrete recommended answer (with the rationale and any rejected alternatives). Do not answer on the user's behalf.

## Driving the grilling visualizer (CLI)

A grilling is driven end-to-end through the grilling CLI
(`skills/grilling-with-ui/grilling-cli.mjs`). The CLI manages a visual graph that the
user sees in their browser: rows = rounds, nodes = questions, edges =
dependencies/contradictions/references, plus a running summary sidebar. The
user answers in the browser per round; you read answers back and continue.

You interact with the CLI exclusively through bash. You never touch the
internal state files or the state directory directly — always use the
`--state <key>` handle returned by `start`.

### Launching a session

At the beginning of a grilling, start the visualizer (the `--open` flag opens
the browser for the human at the desk; omit it for a headless/agent-only run):

```bash
node skills/grilling-with-ui/grilling-cli.mjs start --open
```

This prints the server URL (the browser auto-opens) and returns a `--state <key>`
handle. **You only ever hold the `--state <key>` string** — never the underlying
state directory path. Use this key for every subsequent command.

### Building the graph (update)

As you identify questions and their dependencies, add them to the graph using
`update` subcommands. These mutate the graph state safely; they do not trigger
a browser re-render on their own (use `refresh` for that).

Add a question to the graph (the id is a 5-word slug):

```bash
node skills/grilling-with-ui/grilling-cli.mjs update add-question --state <key> \
  --id <five-word-slug> --title "<question title>" --body "<focused question and choices>" \
  --rec "<concrete recommendation and why>" --round <n> --deps <comma-separated-ids>
```

Add an edge between questions (dependency, contradiction, or reference):

```bash
node skills/grilling-with-ui/grilling-cli.mjs update add-edge --state <key> \
  --id <edge-id> --from <question-id> --to <question-id> --type dep|contra|ref
```

Promote a question to a later round:

```bash
node skills/grilling-with-ui/grilling-cli.mjs update promote --state <key> \
  --id <question-id> --to-round <n>
```

Maintain the running summary sidebar after each round:

```bash
node skills/grilling-with-ui/grilling-cli.mjs update set-summary --state <key> \
  --text "running summary of decisions, trade-offs, and open questions so far"
```

Resolve a contradiction edge when the conflict is settled:

```bash
node skills/grilling-with-ui/grilling-cli.mjs update resolve-contradiction --state <key> \
  --edge <edge-id>
```

Record a user's answer to a question (for headless/agent-driven rounds; the
browser's Send-all-answers button is the primary path for a human at the desk):

```bash
node skills/grilling-with-ui/grilling-cli.mjs update answer --state <key> \
  --id <question-id> --value "the user's answer"
```

This sets the answer, marks the question answered, and (if in-round)
transitions `in-round → round-done` — the same effect as the browser submit.

Rewrite a question's dependency list (correct a poisoned frontier):

```bash
node skills/grilling-with-ui/grilling-cli.mjs update set-deps --state <key> \
  --id <question-id> --deps <comma-separated-ids>
```

### The round loop

Each round follows this sequence:

1. **Build**: use `update add-question` and `update add-edge` to register the
   current frontier questions for this round (and `update promote` to move
   questions between rounds if needed).

2. **Open the round**: transition the page state to `in-round` and signal the
   browser to re-render:

   ```bash
   node skills/grilling-with-ui/grilling-cli.mjs update set-state --state <key> in-round
   node skills/grilling-with-ui/grilling-cli.mjs refresh --state <key>
   ```

3. **Block on the user**: wait until the user has submitted their answers for
   the round (the page state transitions to `round-done` when they submit):

   ```bash
   node skills/grilling-with-ui/grilling-cli.mjs wait --state <key> round-done
   ```

4. **Read answers**: retrieve the user's answers and the current state:

   ```bash
   node skills/grilling-with-ui/grilling-cli.mjs get --state <key> answers
   ```

   You can also read subsets: `get --state <key> frontier`, `get --state <key>
   summary`, `get --state <key> questions`, `get --state <key> state`, or
   `get --state <key> edges`.

5. **Record and recompute**: record each answer in the relevant task or
   planning artifact in the user's terms. Update the running summary with
   `update set-summary`. Recompute the frontier — settle parent decisions
   before dependent choices. If the frontier is non-empty, go to step 1 for
   the next round.

### Completion gate

Continue until the frontier is empty: every branch of the design tree has been
visited, every prerequisite is settled, and nothing remains silently assumed.

Then drive the completion gate:

1. Transition to `final-review` and signal the browser:

   ```bash
   node skills/grilling-with-ui/grilling-cli.mjs update set-state --state <key> final-review
   node skills/grilling-with-ui/grilling-cli.mjs refresh --state <key>
   ```

2. Wait for the user's verdict on the shared understanding:

   ```bash
   node skills/grilling-with-ui/grilling-cli.mjs wait --state <key> accepted
   ```

   Or, if the user rejects:

   ```bash
   node skills/grilling-with-ui/grilling-cli.mjs wait --state <key> rejected
   ```

3. **On `accepted`**: the shared understanding is confirmed. Emit the markdown
   summary and stop the server:

   ```bash
   node skills/grilling-with-ui/grilling-cli.mjs finalize --state <key>
   ```

   (For an agent-driven verdict without the browser, use `update accept` — it
   transitions `final-review → accepted` directly.)

   If `finalize` returns non-zero (the coast is not clear — there are still
   unanswered questions, unresolved contradictions, or a non-empty frontier),
   report to the user what is still unresolved and continue grilling.

4. **On `rejected`**: the user has identified a gap in the shared
   understanding. The transition is `rejected` → `in-round`: resume `in-round`
   to address the gap named in the rejection feedback, then re-reach
   `final-review`. For an agent-driven verdict, use `update reject --feedback
   <text>` — it transitions `final-review → rejected → in-round` and records
   the feedback in the summary:

   ```bash
   node skills/grilling-with-ui/grilling-cli.mjs update set-state --state <key> in-round
   node skills/grilling-with-ui/grilling-cli.mjs refresh --state <key>
   ```

   Address the gap, then re-enter the completion gate from step 1.

Do not act on the plan, mark a grilling task complete, or hand off
implementation until the user explicitly accepts the shared understanding.

To stop the server without finalizing (e.g. to abort a grilling), use `stop`:

```bash
node skills/grilling-with-ui/grilling-cli.mjs stop --state <key>
```

## Facts, ordering, and recording

Finding facts is the agent's job, never the user's. When a question needs facts
from the repository or environment, inspect them with Pi's repository/task tools
(and use available architecture/navigation tools) before asking. Ask the user
only for decisions that cannot be looked up. Never guess a prerequisite fact.

Order questions by prerequisites: settle parent decisions before dependent
choices. After each round, record the user's answer in the relevant task or
planning artifact in the user's terms. Keep a decision index when the current
Wayfinder or task resource provides one. Preserve settled decisions; do not
re-ask them. For each settled decision, retain important rejected options,
trade-offs, constraints, rationale, and downstream consequences. If an answer
creates work precise enough to state, hand it off through Wayfinder's existing
task workflow rather than duplicating task routing here.

## Completion gate

Continue until the frontier is empty: every branch of the design tree has been
visited, every prerequisite is settled, and nothing remains silently assumed.
Then summarize the decision, alternatives, trade-offs, constraints, and
consequences and ask the user to confirm that shared understanding has been
reached. Do not act on the plan, mark a grilling task complete, or hand off
implementation until that explicit confirmation. Keep task-specific resources
as the operational adapters for their own artifacts and handoffs.
