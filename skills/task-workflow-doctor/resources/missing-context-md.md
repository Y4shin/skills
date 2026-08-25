# Missing repo-root `CONTEXT.md`

## Symptom

- Agents are missing project-wide context.
- `CONTEXT.md` is referenced but does not exist at the repository root.

## Missing artifact

Repo-root `CONTEXT.md`.

## Route

The relevant skill creates `CONTEXT.md` lazily when adopted. Until then, create it manually with project-wide context, or adopt the relevant skill.
