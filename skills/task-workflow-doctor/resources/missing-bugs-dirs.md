# Missing `docs/bugs/` and `docs/bugs/archive/`

## Symptom

- Cannot create bugs.
- Cannot archive fixed bugs.
- `/skill:report-bug` or `/skill:finalize-task` fail because bug directories are missing.

## Missing artifact

- `docs/bugs/`
- `docs/bugs/archive/`

## Route

Run `/skill:onboard-workflow` to create the bugs directory structure.
