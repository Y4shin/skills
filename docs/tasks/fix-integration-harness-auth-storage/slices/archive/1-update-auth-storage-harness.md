---
kind: slice
slug: update-auth-storage-harness
title: Align integration harness with the installed Pi auth API
task: ../task.md
mode: hitl
status: done
size: m
blocked_by: []
---

Update the integration harness's in-memory authentication/model-registry setup to match the installed Pi coding-agent API, preserving the faux provider and existing session tests.

## Acceptance criteria

- The harness initializes without an undefined `AuthStorage` export.
- All integration session tests pass.
- The full project test suite passes in the devenv shell.
- No integration tests are disabled or weakened.

## Test plan

- Seam: `createTaskSession()` in `tests/integration/harness.ts`.
- Reproduce the current `AuthStorage.inMemory()` failure before changing code.
- Verify `npx vitest run tests/integration/session.test.ts` and then `devenv shell -- npm test`.
- Check edge cases covering task tools, multi-turn state, guidelines, and fresh trees.

## Constraints and dependencies

- Use the API actually exported by the locked dependency version.
- Keep the fix limited to test harness compatibility unless a dependency update is proven necessary.
