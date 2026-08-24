## Deviation report — gate-explicit-invocation-policy

### API surface changes
- **Planned:** `if (gate.active) pi.on("input", gateSkillInvocation)` — an `input` handler registered only when gated; it parses `/skill:` via `slice(7, spaceIndex)`, blocks the gated six with `{action:"handled"}` + `ctx.ui.notify(...,"warning")`, and passes everything else through with `{action:"continue"}`. Reuses the shared gated-skill-names list from slice 1.
- **Actual:** Matches the spec exactly.
  - The `input` handler `gateSkillInvocation` (`src/pi.ts:74-92`) is registered only inside `if (gate.active) { … pi.on("input", gateSkillInvocation); }` (`src/pi.ts:899-901`), inside the gated block alongside the `before_agent_start` strip handler. Confirmed by `sed -n '893,905p'`.
  - Name parser (`src/pi.ts:77-84`): `if (!text.startsWith("/skill:")) return {action:"continue"}; const spaceIndex = text.indexOf(" "); const name = text.slice(7, spaceIndex === -1 ? undefined : spaceIndex);` — mirrors `_expandSkillCommand`'s `slice(7, spaceIndex)` from `agent-session.js:959-961` exactly, with `undefined` for the no-space case (equivalent to slicing to the end).
  - Blocks only the gated six: `if (GATED_SKILL_NAMES.includes(name))` (`src/pi.ts:85`). `GATED_SKILL_NAMES` is the module-level constant from `loadGatedSkillNames()` (`src/pi.ts:64`), the same shared list slice 1's `stripSkills` uses (`src/pi.ts:129` `new Set(GATED_SKILL_NAMES)`). Single definition, as the arch spec required.
  - Returns `{action:"handled"}` after `ctx.ui.notify(\`task-workflow is gated in this work repo; not loading ${name}\`, "warning")` (`src/pi.ts:86-89`).
  - Non-gated and non-`/skill:` input → `{action:"continue"}` (`src/pi.ts:78, 91`).
  - Empty `/skill:` name (e.g. bare `/skill:`) → `{action:"continue"}` via the `if (!name)` guard (`src/pi.ts:82-84`), matching the slice doc's "Failure modes: `/skill:` with no name (pass through)".
- **Impact:** None. The API surface matches the spec; the downstream `gate-config-docs-and-defaults` task copies the one-line warning text into the README.

### Abstraction usage
- **Reused `GATED_SKILL_NAMES` from slice 1?** Yes — the shared `loadGatedSkillNames()` module constant (`src/pi.ts:64`), not duplicated. Slice 1's strip handler and slice 3's input handler both read it. Matches the arch spec's "define once" and the "Interface contract (consumed by slice 3)".
- **Used `InputEvent`/`InputEventResult` from pi?** Yes — imported as types (`src/pi.ts:17` `InputEvent, InputEventResult`) and used in the handler signature (`src/pi.ts:74-76` `async function gateSkillInvocation(event: InputEvent, ctx: ExtensionContext): Promise<InputEventResult>`).
- **Used `ctx.ui.notify`?** Yes (`src/pi.ts:86`), with the `"warning"` level.
- **Mirrored `_expandSkillCommand`'s name parser?** Yes — `slice(7, spaceIndex)` with the `undefined`-for-no-space variant.
- **No new runtime deps?** Yes — `git diff main..HEAD -- package.json package-lock.json` is empty for this slice. Only `node:fs`/`node:path`/`node:url` and the pi type imports.
- **Did NOT reimplement the detection or the injection handler?** Confirmed — the `gate` closure variable (from `gate-tools-and-injection`) is read; the injection handler is untouched.

### Out-of-scope changes
- None. The slice touched only `src/pi.ts` (the `gateSkillInvocation` function + the `if (gate.active) pi.on("input", …)` registration) and `tests/gate-factory.test.ts` (the "input skill invocation gate" describe block, 5 tests). No edits to `src/core/repo-gate.ts`, no new files, no new deps.

### Divergence from the slice doc's acceptance criteria
- ✅ `input` handler registered only when gated (`if (gate.active) pi.on("input", gateSkillInvocation)`).
- ✅ Parses `/skill:` name via `slice(7, spaceIndex)` (with `undefined` for no-space).
- ✅ Blocks only the gated six (reuses `GATED_SKILL_NAMES` from slice 1).
- ✅ Returns `{action:"handled"}` with a `ui.notify` warning for gated names.
- ✅ Non-gated `/skill:oracle` → `{action:"continue"}` (test: "work repo passes through /skill:<non-gated-name>").
- ✅ Non-`/skill:` `/help` → `{action:"continue"}` (test: "work repo passes through non-/skill: input").
- ✅ Personal → input handler not registered (test: "personal repo does not register the input handler").
- ✅ `/skill:implement-task some args` → blocked on the name before the space (test: "work repo blocks /skill:<gated-name> with trailing args").
- ✅ `/skill:` with no name → pass through (`if (!name)` guard, `src/pi.ts:82`).
- ✅ `npm run typecheck` clean; 22/22 `tests/gate-factory.test.ts` pass; full suite (excluding the known-broken `tests/integration/session.test.ts`) 227/227 pass.
- ⚠️ **Minor (test-plan coverage):** the slice doc's "Scenarios" mentions "the six gated names each blocked." The landed tests cover `implement-task` (twice: with and without args) but not all six individually. The blocking logic is a single `GATED_SKILL_NAMES.includes(name)` check — it is name-agnostic by construction — so this is a coverage breadth gap, not a correctness risk. Not a deviation from acceptance criteria.

### Task doc update needed?
No. The arch spec's slice-3 contract is honored exactly.

### User attention needed?
No. The API surface matches the spec. The one observation (not all six names tested individually) is a coverage gap, not a deviation.

VERDICT: CLEAN
