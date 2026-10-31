---
type: deviation report
title: Deviation report for bump-dependencies
status: stable
---

## Deviation report: bump-dependencies

### API surface changes
- **Planned:** The arch spec's contract for ticket 1: export a 1.0.0-capable
  toolchain and a smoke test for `exposure`, `defaultActive`, `setActiveTools`,
  and `tool_search`; no downstream API of its own. The ticket adds: every
  dependency at its latest compatible release, the `@earendil-works/pi-coding-agent`
  peer range kept open, `package-lock.json` regenerated with no stale entries,
  `npm test` and `npm run typecheck` green, and no production behavior changes
  beyond what the bump forces.
- **Actual:** Delivered exactly that. Four files changed: `package.json`
  (ranges), `package-lock.json` (regenerated from scratch, zero 0.80.x entries,
  root package metadata refreshed from a stale 2.10.0 to the 4.0.0 that
  `package.json` declares), `tests/integration/harness.ts` (forced import fix),
  and the new `tests/pi-disclosure-apis.test.ts` (4 behavioral tests through
  the integration harness, the spec's named seam). `src/` is untouched, so
  there is no new or changed production API. The smoke test is a test seam,
  not a consumed module; downstream tickets consume the installed 1.0.3
  toolchain, which the version test pins at 1.0.0 or later.
- **Impact:** None on dependent tickets. `disclosure-open-close-core` and
  `opener-gate-and-toolsets` get what they were promised: a toolchain with the
  four disclosure APIs. The one shared-surface change is the harness's pi-ai
  import rewrite: the nested-open integration test (ticket 8,
  `disclosure-open-close-core`) extends the same
  `tests/integration/harness.ts`, and the new explicit
  `@earendil-works/pi-ai` devDependency makes that import a declared
  dependency instead of a phantom nested path.

Deviations from the ticket's letter, all deliberate and documented by the
tdd-worker:

1. `@types/node` was pinned to `^24.19.1`, not npm-latest `^26`. "Latest
   compatible" was read as runtime-matched: `devenv.nix` pins `nodejs_24` and
   the runtime is v24.21.0, so 26.x types would describe a runtime this repo
   does not run.
2. Majors beyond the load-bearing pi bump were taken: `typescript`
   5.9.3 → 7.0.2 (two majors, the native implementation, skipping the 6.x
   bridge), `vitest` 2 → 5, `@changesets/cli` 2 → 3, and `pi-subagents`
   0.34.0 → 0.76.0 (exact-pin convention kept). The full suite plus
   typecheck is the compatibility proof; if the intent was same-major
   housekeeping, those ranges are the named revert points.
3. A new devDependency `@earendil-works/pi-ai: ^1.0.3` was added. The old
   harness imported it through a deep nested dist path inside 0.80.x's
   node_modules layout; the bump hoisted pi-ai and killed that path, so the
   import was made direct and the dependency explicit.

### Abstraction usage
- Used/was specified: yes. The smoke test extends
  `tests/integration/harness.ts` (the spec's integration seam,
  `createTaskSession` on the faux provider) rather than building a parallel
  harness. Nothing under the spec's "Do not reimplement" was touched: no
  production code changed at all, the gate-factory stub was not modified,
  and no second extension entry was created.

### Out-of-scope changes
- The harness import rewrite in `tests/integration/harness.ts` is nominally
  outside "update dependencies", but it is exactly the ticket's "fix
  whatever the bump breaks" clause, and the arch spec's open risk ("if the
  bump exposes API drift beyond `exposure`/`defaultActive`, that drift lands
  in ticket 1") predicted this class of drift and directed it here.
- The stale `README.md` line (around line 55, "pi 0.80.10 has no hook to
  suppress them") was deliberately left untouched; the docs tree belongs to
  `docs-resync`. A deferred defect, not a change.
- Nothing else moved: no skills, no docs pages, no `src/` files.

### Ticket doc update needed?
Yes. Append an `## Implementation notes` section recording: the
`@types/node` runtime-matched pin (deliberate, not an omission); the explicit
`@earendil-works/pi-ai` devDependency and the harness import change that
forced it; the major-version jumps with their revert points; the stale
`README.md:55` line deferred to `docs-resync`; and that the `setActiveTools`
smoke test is meaningful only as a pair with `defaultActive` (it passes
trivially on an ungated 0.80.x, which is why the RED demonstration showed
3 of 4 failing).

### User attention needed?
No. Scope is unchanged and the export contract holds: the toolchain and the
smoke test exist, and no downstream API surface was introduced or altered.
The judgment calls above (the types pin, the major jumps) are documented,
reversible, and do not change what dependent tickets consume.
