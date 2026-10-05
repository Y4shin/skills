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

## Implementation notes

Landed from working branch `ticket/bump-dependencies` (commit `1ad927a`, merge
commit `201dd22`). `@earendil-works/pi-coding-agent` resolves to 1.0.3 with
the peer range kept open (`*`). Post-merge verification: `npm test` 785
passed across 15 files (781 baseline plus the 4 new smoke tests), `npm run
typecheck` clean, `npm ci --dry-run` green, `npm ls` clean, and `npm
outdated` empty except `@types/node` (see below).

- `@types/node` is pinned to `^24.19.1` on purpose, runtime-matched rather
  than npm-latest 26.x: `devenv.nix` pins `nodejs_24` and the runtime is
  v24.21.0, so 26.x types would describe a runtime this repo does not run.
  Not an omission.
- New devDependency `@earendil-works/pi-ai: ^1.0.3`. The 1.0.x bump hoisted
  pi-ai to the top of `node_modules` and killed the harness's old nested
dist import, so `tests/integration/harness.ts` imports
  `@earendil-works/pi-ai/compat` and `@earendil-works/pi-ai` directly; the
  dependency is declared instead of phantom.
- Major jumps beyond the load-bearing pi bump, with the green suite plus
  typecheck as the compatibility proof. Revert points if same-major
  housekeeping was the intent: `@changesets/cli` ^3.0.3, `typescript` ^7.0.2
  (native implementation, 6.x bridge skipped), `vitest` ^5.0.3, and
  `pi-subagents` 0.76.0 (exact-pin convention kept).
- The `setActiveTools` smoke test is meaningful only as a pair with the
  `defaultActive: false` test: it passes trivially on an ungated 0.80.x,
  which is why the RED run against 0.80.10 showed 3 of 4 tests failing.
- `README.md` around line 55 still says "pi 0.80.10 has no hook to suppress
  them". Stale after this bump, deferred to the `docs-resync` ticket, which
  owns the docs tree.