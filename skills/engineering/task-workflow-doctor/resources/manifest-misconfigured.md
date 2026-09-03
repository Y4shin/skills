# `package.json` `pi.skills` / `pi.subagents` misconfigured

## Symptom

- A skill or subagent is not registered.
- Commands like `/skill:task-workflow-doctor` do not resolve.
- The Pi runtime cannot find an agent or skill.

## Missing / misconfigured artifact

`package.json` `pi.skills` or `pi.subagents` entries.

## Route

Edit `package.json` manually. Add the missing skill or subagent path under `pi.skills` or `pi.subagents.agents`, then consult the manifest documentation for the correct shape.
