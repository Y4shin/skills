---
"@y4shin/pi-task-workflow": minor
---

An implementation sub-agent no longer starts off its ticket branch. A dispatch
commits on `ticket/{ticket}`, so the guard fails the step before any worker
starts, with a reason naming the branch to create and the base to create it
from.

Both surfaces a spawn arrives on are covered: the outer `subagent` call, where a
direct dispatch names the agent and a workflow launch carries the effort and
ticket in its args, and the per-child `subagent_launch` call, where a workflow
child's args never reach a handler and the identity is therefore a step key that
embeds the ticket slug. The separator in that key is a dot, which the workflow
runtime accepts and every platform allows in a filename.

The pass-or-refuse rule is the phase brief's own, so a spawn refusal and a phase
refusal cannot disagree. An agent row with no branch, an agent the profile does
not name, and a call carrying no ticket identity all pass untouched, and a guard
that cannot run reports what it could not read instead of passing silently.
