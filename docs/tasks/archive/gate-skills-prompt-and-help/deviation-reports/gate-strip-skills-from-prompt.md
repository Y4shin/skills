## Deviation report — gate-strip-skills-from-prompt

### API surface changes
- **Planned:** `if (gate.active) pi.on("before_agent_start", stripSkills)` — strip handler registered only in a work repo, targeting the real `<available_skills>`/`<skill><name>…</name>…</skill>` format. Returns `{ systemPrompt }`.
- **Actual:** Matches the spec exactly. The handler is registered inside `if (gate.active)` (src/pi.ts, the `if (gate.active) { pi.on("before_agent_start", stripSkills); }` block). It targets `<available_skills>` blocks with `<skill>` elements matched by their `<name>` child. When all skills are stripped, the whole block + preamble is dropped. When a non-gated skill remains, the `<available_skills>` wrapper is preserved with only the gated entries removed. On format drift (no `<available_skills>` block), a `ctx.ui.notify(..., "warning")` diagnostic is emitted and the prompt is returned unchanged. No signature deviation.
- **Impact:** None on dependent slices. Slice 3 (`gate-explicit-invocation-policy`) consumes the shared `GATED_SKILL_NAMES` constant (loaded via `loadGatedSkillNames()` from `package.json` `pi.skills`, with a `FALLBACK_GATED_SKILL_NAMES` list), which is defined at module scope and available to both slices. The interface contract is honored.

### Abstraction usage
- Used/was specified: **Yes.** The `before_agent_start` result shape `{ systemPrompt }` is reused (same as the injection handler). The `gate` closure variable from `gate-tools-and-injection` is reused — not recomputed. The gated skill names are sourced from `package.json` `pi.skills` via `basename()` of each path, with a fallback list and diagnostic, exactly as the arch spec required. The strip targets the real `formatSkillsForPrompt` format (`<available_skills>` → `<skill>` → `<name>`/`<description>`/`<location>`) confirmed in `findings.md` V1 — NOT the `<skill name="…">` attribute form the original idea/old slice doc assumed.
- The `loadGatedSkillNames()` helper is placed in `src/pi.ts` (not `src/core/repo-gate.ts`), as the arch spec specified ("a factory concern"). It uses `fileURLToPath(import.meta.url)` + `dirname` + `..` to locate `package.json` relative to the compiled `src/pi.ts` — correct for both source and `dist/` layouts.

### Out-of-scope changes
- **None for this slice.** The diff includes the `gate-tools-and-injection` changes (gate computation, tool/injection guarding, session_start diagnostics, peer-warning skip) — but those belong to the *previous* task (`gate-tools-and-injection`) and are already landed on the task branch. This slice's incremental additions are: the `loadGatedSkillNames` helper + `FALLBACK_GATED_SKILL_NAMES` + `stripSkills` function (src/pi.ts), the `if (gate.active) pi.on("before_agent_start", stripSkills)` registration, and the `before_agent_start skill strip` test describe-block (5 new tests in tests/gate-factory.test.ts). No edits to `src/core/repo-gate.ts`. No new files beyond the test additions.

### Task doc update needed?
**No.** The arch spec and slice doc were already corrected (via `findings.md` V1) to target the real `<available_skills>` format before this slice ran. The implementation conforms to the corrected spec. The only observation is that the slice doc's `## End-to-end behavior` section still mentions the old `<skill name="…">…</skill>` format (the `## Acceptance criteria` and `## Test plan` sections were corrected but the intro paragraph was not) — a stale intro, not a spec violation. The acceptance criteria and test plan are what the implementation is checked against, and those match.

### User attention needed?
**No.** The API surface matches the spec exactly. The strip handler is registered only when `gate.active`, targets the real pi skills-XML format, removes by `<name>` child match, drops the whole block when emptied, emits a fail-loud diagnostic on format drift, and is mutually exclusive with the injection handler (which registers under `if (!gate.active)`). All five new strip-related tests pass (16/16 total in `tests/gate-factory.test.ts`); typecheck is clean. The stale intro paragraph in the slice doc is cosmetic and does not affect acceptance.

VERDICT: CLEAN
