---
title: Update integration harness for the installed AuthStorage API
status: promoted
severity: major
reported: 2026-08-26
confirmed_by: devenv shell -- npm test
fix_commit:
promoted_to: fix-integration-harness-auth-storage
---

## Observed

The full integration test suite fails before running its assertions because `AuthStorage.inMemory()` is accessed from an undefined export in `tests/integration/harness.ts`.

## Expected

The integration harness should construct its in-memory authentication and model registry using the API exported by the installed `@earendil-works/pi-coding-agent` version, allowing all integration tests to run.

## Reproduction

From the repository root:

```bash
devenv shell -- npm test
```

The failure occurs at `tests/integration/harness.ts:138`; 16 integration tests fail with `Cannot read properties of undefined (reading 'inMemory')`. The other 286 tests pass.

## Suspected area

`tests/integration/harness.ts` imports `AuthStorage` using an API shape that no longer matches the installed Pi coding-agent package (`0.80.10`).

## Root cause

To be determined by the follow-up bug task.

## Fix summary

Not fixed yet. Promoted to `fix-integration-harness-auth-storage`.
