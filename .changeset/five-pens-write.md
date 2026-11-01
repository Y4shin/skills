---
"@y4shin/pi-task-workflow": minor
---

Add `operator-communication`, the rule set for every message an agent sends the operator.

A run held the style guidance in its prompt and still ended with a summary
that only its own context could decode. The failure is not ignorance of the
rules. It is a skipped self-check at the moment of writing, most of all in
the closing report at the end of a long run, where the agent's context is
full of vocabulary the operator does not have.

- `skills/productivity/operator-communication/SKILL.md` holds the rules: one
  test (could a developer who saw none of the run follow this?), three checks
  the agent runs on its own draft, a selection rule for what earns a place in
  the message, a worked bad/good pair, and an explicit settlement of
  "maximize useful information per word", which agents read as "use fewer
  words". The selection rule asks whether a detail changes what the operator
  can rely on or decide, so a snag closed in the next step goes and an
  unconfirmed fix stays.
- Every other promoted skill names the skill near its top, so the dependency
  travels with whatever skill is running.
- The five skills that end a run with a user-facing report
  (`implement-ticket`, `finalize-effort`, `wayfinder`,
  `task-workflow-overview`, `task-workflow-doctor`) also carry the three
  checks inline at the report step. A pointer reached only at the end of a
  long run is the pointer that gets skipped.
- `wait-what` becomes a repair command instead of a canned re-pitch. It loads
  `operator-communication` and asks for the last answer to be rewritten under
  it, keeping the detail the operator needs to judge the outcome, dropping the
  detail that carries neither of the selection rule's two questions, adding
  what is missing, applying any request appended to the command, and never
  announcing the rewrite. This is the fallback for the answer the rules did
  not prevent.
- `wait-what` also records each invocation through `submit_feedback` with the
  fixed `kind: "wait-what"` and one sentence of `data`, so the rate at which
  the operator had to intervene is countable in the feedback table. A
  structural test pins the tool, the kind, and the literal-kind rule so the
  series cannot break silently.

`docs/migration-target.yaml`, `package.json`, both bucket indexes, the
top-level `README.md`, and the router now list the new skill. Its docs page is
`docs/productivity/operator-communication.md`.
