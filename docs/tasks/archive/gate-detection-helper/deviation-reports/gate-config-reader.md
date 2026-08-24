## Deviation report — gate-config-reader

### API surface changes
- **Planned:** `readGateConfig(cwd, deps?): { disableOnRepo, enable,
  diagnostics }` — reads **only config** (no origin, no `isWorkRepo`).
  `resolveGate(cwd, deps?): { active, reason, diagnostics }` — composes
  `readOriginRemote(cwd)` → `readGateConfig(cwd)` → `isWorkRepo(origin,
  disableOnRepo, enable)`, merging diagnostics.
- **Actual:** Both functions match the spec exactly.
  - `readGateConfig` (`src/core/repo-gate.ts:237`) reads global
    (`$PI_CODING_AGENT_DIR/settings.json` or `~/.pi/agent/settings.json`) and
    project (`<repo-root>/.pi/settings.json`) settings, extracts
    `taskWorkflow.disableOnRepo` and `taskWorkflow.enable`, returns the
    `{ disableOnRepo, enable, diagnostics }` shape. **It does not call
    `isWorkRepo` or `readOriginRemote`** (verified by grepping the function
    body — clean). The `isWorkRepo` reference at line 140 is in the
    `resolveGate` docblock, not in `readGateConfig`.
  - `resolveGate` (`src/core/repo-gate.ts:337`) composes the three helpers in
    the exact order the spec requires:
    `readOriginRemote(cwd)` → `readGateConfig(cwd)` →
    `isWorkRepo(origin, config.disableOnRepo, config.enable)`, then merges
    `config.diagnostics` and `decision.diagnostics`.
- **Impact:** None — the actual API surface matches the spec. The downstream
  task (`gate-tools-and-injection`) calls `resolveGate(cwd)` and branches on
  `.active`, exactly as the interface contract specifies.

### Abstraction usage
- **Reused `readOriginRemote` from slice 1?** Yes — `resolveGate` calls it
  directly.
- **Reused `isWorkRepo` from slice 1?** Yes — `resolveGate` calls it with the
  slice-1 signature `(origin, patterns, enable)`.
- **Reused `walkToGitRoot` from slice 1?** Yes — `readGateConfig` uses it to
  resolve the repo root for the project settings path.
- **No new runtime deps?** Yes — `git diff main..HEAD -- package.json
  package-lock.json` is empty. Only `node:fs`, `node:os`, `node:path`,
  `node:child_process` are imported.
- **Fail-open on read errors?** Yes — `readSettingsJson` wraps `readFile` +
  `JSON.parse` in a try/catch; `ENOENT` is silent (returns `null`), other
  errors push a diagnostic and return `null`. `readGateConfig` never throws.
  Missing/malformed files contribute `[]`/`true` defaults with diagnostics.
  This matches the arch spec's fail-open policy.

### Out-of-scope changes
- None. The slice touched only `src/core/repo-gate.ts` (appended
  `readGateConfig` + `resolveGate` + private helpers) and
  `tests/repo-gate.test.ts` (added `readGateConfig` unit tests + `resolveGate`
  integration tests). No edits to `src/pi.ts`, no new files, no new deps.
- **Note:** The slice doc was not yet archived (still at
  `slices/2-gate-config-reader.md`, not `slices/archive/`); the land-worker
  has not yet run. This is expected mid-chain — the deviation reporter runs
  before the lander.

### Divergence from the slice doc's acceptance criteria
- ✅ `readGateConfig` returns `{ disableOnRepo: string[], enable: boolean,
  diagnostics: string[] }`.
- ✅ Missing key → `disableOnRepo: []`, `enable: true`, no diagnostics (test:
  "missing settings files returns defaults with no diagnostics").
- ✅ Non-array `disableOnRepo` → `[]` + diagnostic (test: "coerces non-array
  disableOnRepo to [] with diagnostic").
- ✅ Non-boolean `enable` → `true` + diagnostic (test: "defaults non-boolean
  enable to true with diagnostic").
- ✅ Invalid regex inside the array → skipped + diagnostic, rest kept (test:
  "skips invalid regex entries and keeps the rest").
- ✅ Integration: QNCGmbH SSH origin + global work pattern → active (test:
  "QNCGmbH SSH origin is active with global work pattern").
- ✅ Personal HTTPS origin + same pattern → not active (test: "personal HTTPS
  origin is not active with the same work pattern").
- ✅ `enable: false` in project override on QNCGmbH repo → not active,
  "re-enabled locally" (test: "project enable:false re-enables a work
  repo").
- ✅ `npm run typecheck` passes (clean, no errors).
- ✅ `npx vitest run tests/repo-gate.test.ts` — 38 tests pass.
- ⚠️ The slice doc's "Test plan" mentions an `anwaltde Bitbucket` scenario ×
  `enable` true/false. The actual tests cover QNCGmbH (GitHub) and
  Y4shin/skills (personal) but **not** an anwaltde Bitbucket fixture. This is
  a minor test-plan shortfall, not an acceptance-criteria divergence (the
  acceptance criteria only mention the QNCGmbH and personal-repo cases; the
  Bitbucket case was in the test-plan "Scenarios" section). The detection
  logic is identical for any provider (the patterns are provider-agnostic
  regex), so this is a coverage gap, not a correctness risk.

### Task doc update needed?
**No.** The arch spec's slice-2 contract was updated before this slice ran
(to match slice 1's `isWorkRepo(origin, ...)` signature), and the
implementation conforms to it. No further arch-spec edits needed.

### User attention needed?
**No.** The API surface matches the spec exactly. The only observation is
the missing anwaltde Bitbucket test scenario, which is a coverage gap in
the test plan, not a deviation from acceptance criteria. The downstream
`gate-tools-and-injection` task can call `resolveGate(cwd)` as-is.
