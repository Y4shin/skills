# Known limitation: `/help` and skill-list surface

pi 0.80.10 exposes no extension hook to suppress skills from `/help`/skill-list; the gate covers the system prompt only.
`/help` will still list the six task-workflow skills in a work repo.
Explicit `/skill:<name>` is prevented via the `input` event (see slice 3).
