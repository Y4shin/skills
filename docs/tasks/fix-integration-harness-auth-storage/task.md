---
kind: task
type: bug
slug: fix-integration-harness-auth-storage
title: Fix integration harness AuthStorage API compatibility
status: ready
bug: integration-harness-auth-storage-export
slices:
  - update-auth-storage-harness
---

## User story

As a maintainer, I want the integration harness to work with the installed Pi coding-agent API so the full test suite can run instead of failing during session setup.

## Boundaries

In scope:

- Inspect the installed `@earendil-works/pi-coding-agent` exports and update `tests/integration/harness.ts` to use the supported in-memory auth/model-registry setup.
- Preserve the faux-provider test behavior and existing integration test intent.
- Add or update regression coverage for harness initialization.

Out of scope:

- Changing production task tools or workflow behavior.
- Replacing the Pi dependency without evidence that the dependency version is wrong.
- Suppressing or excluding integration tests.

## Acceptance criteria

- `tests/integration/session.test.ts` initializes successfully.
- The 16 currently failing integration tests pass.
- The existing 286 passing tests remain green.
- The fix is compatible with the dependency versions declared by the repository.

## Test plan

- Reproduce with `devenv shell -- npm test` before the fix.
- Add a regression check for the in-memory harness setup if the existing integration tests do not adequately cover the import/API contract.
- Run `devenv shell -- npm test` after the fix.

## Root cause and suspected seam

The harness assumes `AuthStorage.inMemory()` is exported from the installed Pi coding-agent package, but that export is undefined in the currently installed API. The regression seam is `createTaskSession()` in `tests/integration/harness.ts`.
