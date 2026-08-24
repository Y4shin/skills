# Architecture spec: gate-skills-prompt-and-help

> Task `gate-skills-prompt-and-help`, map `gate-skills-by-repo`. Stable across
> all three slice chains. Grounded in `findings.md` (V1/V2/V3) and
> `gate-config-mechanics/findings.md` (Q-B: factory gets no SettingsManager;
> gate computed at load).

## Shared notes (all slices)

- **Edit target:** `src/pi.ts` only (the factory). No new source files. The
  detection module `src/core/repo-gate.ts` and the `gate` closure variable
  from `gate-tools-and-injection` are reused as-is.
- **Reuse the gate from the previous task:** `gate-tools-and-injection`
  already computes `const gate = resolveGate(process.cwd())` at the top of
  the factory and uses it to guard the tools/injection. This task **reads
  the same `gate` variable** to register the *gated-only* handlers. Do not
  recompute the gate. The mutual-exclusivity contract:
  - `gate-tools-and-injection`: registers `before_agent_start` injection
    **only when `!gate.active`** (personal).
  - this task: registers `before_agent_start` strip **only when
    `gate.active`** (work) and `input` skill-block **only when
    `gate.active`** (work).
  - Exactly one `before_agent_start` handler from this package registers
    per repo type — never both, never neither.
- **Skill name source:** read `package.json` `pi.skills` once at load (the
  six paths) and derive the names (`basename` of each path). Pin a fallback
  list (`["task-overview","onboard-workflow","wayfinder","implement-task",
  "finalize-task","report-bug"]`) used only if the manifest read fails, with
  a diagnostic. Both slice 1 (strip) and slice 3 (input block) consume the
  same list — extract a `getGatedSkillNames()` helper (or a module constant
  computed at load) so they agree. Put it in `src/pi.ts` (not
  `src/core/repo-gate.ts` — it's a factory concern).
- **Existing abstractions to use:** `pi.on`, `ctx.ui.notify`, the `gate`
  closure, `package.json` read via `node:fs`.
- **Do NOT reimplement:** the detection; the skills manifest parsing (just
  `basename` the paths); the injection handler (already exists).
- **Tests:** extend `tests/gate-factory.test.ts` (the stub-`ExtensionAPI`
  test file from `gate-tools-and-injection`). The integration harness
  (`tests/integration/`) is still broken (`AuthStorage.inMemory` skew) — do
  not use it. Drive the recorded handlers directly.

## Slice 1 — gate-strip-skills-from-prompt (size: m, blocked_by: [])

- **Exports:** no new exports. Behaviour:
  - `if (gate.active) pi.on("before_agent_start", stripSkills)` —
    registers the strip handler only in a work repo.
  - `stripSkills(event, _ctx)` returns `{ systemPrompt: <prompt with the
    six stripped> }`. Target the **real** format (`findings.md` V1): a single
    `<available_skills>` block containing `<skill>` elements with `<name>`
    children. Remove each `<skill>…</skill>` whose `<name>` is one of the
    gated six. If that empties `<available_skills>`, drop the whole block
    plus its preamble (`\n\nThe following skills…` line that precedes it).
    On no `<available_skills>` found → diagnostic + return prompt unchanged.
- **Existing abstractions to use:** `before_agent_start` result shape
  (`BeforeAgentStartEventResult` `{ systemPrompt }` — already used by the
  injection handler).
- **Do NOT reimplement:** the skills loader.
- **Interface contract (consumed by slice 3):** the gated-skill-names list
  helper/constant. Slice 3 uses the same list to match `/skill:` names.
- **Tests:** extend `tests/gate-factory.test.ts`:
  - gated + fixture prompt with the real `<available_skills>` format
    containing the six + one non-gated skill → six removed, non-gated +
    surrounding text intact.
  - gated + fixture where the six are the only skills → whole
    `<available_skills>` block + preamble removed.
  - gated + no `<available_skills>` (format drift) → diagnostic, prompt
    unchanged.
  - personal → strip handler not registered (the injection handler is, per
    the previous task).
  `npm run typecheck` clean.

## Slice 2 — gate-suppress-help-and-skill-list (size: s, blocked_by: ["gate-strip-skills-from-prompt"])

- **Exports:** `docs/tasks/gate-skills-prompt-and-help/limitations.md` —
  the documented limitation (V2: no subtractive hook exists).
- **Behaviour:** no code. Write the limitations file and a test asserting
  its existence + that it mentions `/help`. This is the slice doc's "if no
  mechanism exists" branch, now confirmed.
- **Existing abstractions to use:** none (documentation).
- **Interface contract (consumed by `gate-config-docs-and-defaults`):** the
  limitations.md text is copied into the README by the manual task. Keep it
  to 3–5 sentences.
- **Tests:** one test in `tests/gate-factory.test.ts` asserting the file
  exists and mentions `/help` and `skill-list`. (Documentation assertion —
  guards against accidental deletion.)

## Slice 3 — gate-explicit-invocation-policy (size: m, blocked_by: ["gate-suppress-help-and-skill-list"])

- **Exports:** no new exports. Behaviour:
  - `if (gate.active) pi.on("input", gateSkillInvocation)` — registers the
    input blocker only in a work repo.
  - `gateSkillInvocation(event, ctx)`: if `event.text` starts with
    `/skill:`, parse the name (slice(7, spaceIndex-or-end)); if the name is
    one of the gated six, `ctx.ui.notify(\`task-workflow is gated in this
    work repo; not loading ${name}\`, "warning")` and return
    `{ action: "handled" }` (prevents expansion). Else return
    `{ action: "continue" }`.
- **Existing abstractions to use:** `InputEvent`/`InputEventResult`
  (`types.d.ts:621-636`), `ctx.ui.notify`.
- **Do NOT reimplement:** the name parser (mirror `_expandSkillCommand`'s
  `slice(7, spaceIndex)` from `agent-session.js:959-961`).
- **Interface contract (consumed by `gate-config-docs-and-defaults`):**
  the warning text. Keep it to one line.
- **Tests:** extend `tests/gate-factory.test.ts`:
  - gated + `/skill:implement-task` → `{action:"handled"}` + notify recorded.
  - gated + `/skill:implement-task some args` → still blocked (name parsed
    before the space).
  - gated + `/skill:oracle` (non-gated) → `{action:"continue"}`.
  - gated + `/help` (not `/skill:`) → `{action:"continue"}`.
  - personal → input handler not registered.
  `npm run typecheck` clean.

## Cross-slice notes

- All three slices touch only `src/pi.ts` (slices 1+3) /
  `docs/tasks/gate-skills-prompt-and-help/limitations.md` (slice 2) +
  `tests/gate-factory.test.ts`.
- The gated-skill-names list is shared by slices 1 and 3 — define once.
- Mutual-exclusivity with the injection handler (previous task) is a hard
  contract.

## Test gate (shared)

- Slice acceptance: `npx vitest run tests/gate-factory.test.ts` passes,
  `npx vitest run tests/repo-gate.test.ts` passes, `npm run typecheck`
  passes. The pre-existing `tests/integration/session.test.ts` failure
  (`AuthStorage.inMemory` skew) is unrelated and not a regression.
