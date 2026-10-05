---
type: ticket
subtype: feature
title: Full dependency update pass, including pi-coding-agent 1.0.0
status: stable
workflow_state: ready
blocked_by: []
size: m
---

## What to build

The repository's dependency set brought current in one pass. Update every
dependency and devDependency in `package.json` to its latest compatible
release, keep the `@earendil-works/pi-coding-agent` peer range open, and
regenerate `package-lock.json` from the result.

The load-bearing bump is `@earendil-works/pi-coding-agent` to 1.0.0, because
the progressive-disclosure work depends on `exposure`, `defaultActive`,
`setActiveTools`, and `tool_search`, none of which exist in the currently
resolved 0.80.10. The rest of the pass is housekeeping: the manifest has been
sitting for a while, and doing it once here avoids a scattered trail of small
bumps through the effort.

Fix whatever the bump breaks: type imports, SDK signatures, and test
harnesses. The full suite must be green on the updated set.

## Acceptance criteria

- [ ] Every dependency and devDependency in `package.json` is at its latest
      compatible release, and `package-lock.json` is regenerated and
      committed with no stale entries.
- [ ] `@earendil-works/pi-coding-agent` resolves to 1.0.0 or later.
- [ ] A smoke test asserts the four APIs the disclosure work needs
      (`exposure`, `defaultActive`, `setActiveTools`, `tool_search`) are
      present on the installed package.
- [ ] `npm test` and `npm run typecheck` are green.
- [ ] No production behavior changes beyond what the bump forces.

## Blocked by

- None (can start immediately).