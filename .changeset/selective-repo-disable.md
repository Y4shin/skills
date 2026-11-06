---
"@y4shin/pi-task-workflow": minor
---

Narrow the work-repo gate to the task workflow only: gated repos strip the 10 workflow skills and register just the passive tools (`tw_open`, `tw_close`, `tw_feedback`), the skill-creator tools and `notify_user`, with `tw_open` restricted to non-gated skills; every generic skill stays usable there, and ungated repos are unchanged, as is the repo-classification config. The `docs/tasks` write lockdown no longer fires in gated repos. Peer warnings and docs now state the verified pi-subagents 0.84.0 behaviour: install pi-telemetry before dispatching subagent chains.
