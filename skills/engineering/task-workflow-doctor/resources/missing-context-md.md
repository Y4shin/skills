# Missing repo-root `CONTEXT.md`

## Symptom

- Agents are missing project-wide context.
- `CONTEXT.md` is referenced but does not exist at the repository root.

## Missing artifact

Repo-root `CONTEXT.md`: the project's domain glossary.

## Route

Run `/skill:setup-workflow` (onboard branch). It writes `CONTEXT.md` at the
repo root with the project's ubiquitous language. If the file exists and is
merely stale, that is `domain-modeling` work, not a missing-scaffolding
diagnosis.
