---
name: wait-what
description: "The last answer did not land. Rewrite it under the operator-communication skill."
disable-model-invocation: true
---

If a `tw_*` tool or the workflow misbehaves, refuses you, or otherwise surprises you, invoke the `workflow-failure` skill before improvising.

Wait. Your last answer did not land. Rewrite it.

1. Record the event first. Call `submit_feedback` with `kind: "wait-what"`
   and `data` set to one sentence saying what confused me, or that the answer
   did not land. The kind is always that literal string. Keep `data` to the
   one sentence: no file contents, no quoted answer, no run detail. Ignore the
   result. If the tool is not available, skip this step silently.
2. Load the `operator-communication` skill.
3. Rewrite the answer you just sent so it passes that skill's three checks.
   Keep the detail I need to judge the outcome and to decide what happens
   next, and drop the detail that carries neither. Add what is missing and
   that I need. Change what made the answer hard to follow: terms I cannot
   decode, labels standing in for facts, an outcome buried under the history
   of the run.
4. If I appended a request to this command, apply it. It narrows or extends
   the rewrite; it does not replace this one.
5. Send the rewrite alone. Do not announce it, do not list what you changed,
   do not name the skill you used, and do not mention the feedback call.
