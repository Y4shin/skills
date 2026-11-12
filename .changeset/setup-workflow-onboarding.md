---
"@y4shin/pi-task-workflow": minor
---

Onboarding a fresh repo no longer seeds the project's own documents from
templates. `docs/testing.md`, `docs/dev-env.md`, and `CONTEXT.md` are written by a
bootstrapping effort instead, because a fresh repository cannot answer what its
test commands are, what its development environment needs, or which domain terms
its code will speak, and a template is a stub the later skills read as an answer.

The onboard branch now asks whether plans, designs, or specifications already
exist, tells the operator to place them under `docs/` and states plainly that
nothing reads them automatically, then offers the bootstrapping effort through
`/skill:intake`, where the operator names the project and points at that material.
