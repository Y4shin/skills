---
"@y4shin/pi-task-workflow": minor
---

Let a phase ask the operator for a tool it does not disclose, and record the answer.

A phase used to have one path to a tool its own toolset did not declare: close
the skill, open a different phase that declares it, and borrow it. That is what
a model does when it cannot find a sanctioned route, and it steps around the
gates the workflow exists to enforce. There is now a legal route, and it asks
the operator.

- `tw_request_tool` is always declared, next to the opener pair, so asking never
  depends on already holding the tool. It takes the tool name and one sentence
  of reason, and it puts a confirmation to the operator through the session UI.
- Approval adds the tool to the session's active set. The grant ends at the next
  `tw_close`: closing prunes every workflow tool that no remaining open skill
  declares, which covers both the phase's own tools and anything it was granted.
- A denial leaves the tool set unchanged. A session with no interactive UI is
  refused rather than treated as a denial, because nobody was asked.
- A grant that would complete another skill's toolset is refused too, naming
  the skill to open instead. The open set is derived from whole toolsets, so
  that grant would make a phase look open that nobody opened; the guard keeps
  the derivation exact (granting `tw_context` while `wayfinder` is open would
  otherwise look like `setup-workflow`).
- Every outcome (granted, denied, blocked, unavailable) is written to the
  telemetry store through `submit_feedback`, labelled as workflow feedback with
  kind `friction`. Feedback failure never undoes a grant; the result says it
  was not recorded.
- Only this package's own `tw_*` tools are requestable. The always-declared pair
  and the closer are refused as already available, and a built-in such as `bash`
  or `write` is refused as outside the workflow surface.
- The six phase skills now name the sanctioned route at the point where they
  state the rule, and say plainly not to close a phase early to reopen another
  one for its tools. The README, the router skill, and its docs page describe it.
- `tw_feedback` and the requester share one feedback call path, so both address
  the installed `submit_feedback` shape the same way.

`npm test` and all three typechecks pass.
