## Deviation report — references-portable-and-pi

### API surface changes
- **Planned:** Two files: `references/agent-skills-spec.md` (portable format digest from the live spec) and `references/target-pi.md` (Pi-target guide). Both linked one level deep from `SKILL.md`'s references index (slice 3), each with a when-to-read note.
- **Actual:** Both files created exactly as planned — `agent-skills-spec.md` (147 lines) and `target-pi.md` (190 lines). Filenames match the slice-3 references index precisely (`references/agent-skills-spec.md`, `references/target-pi.md`). No other files created. No support-script references written (correct — slice 5 owns those). No frontmatter changes (correct — references don't touch `SKILL.md` frontmatter).
- **Impact:** None on dependent slices. The `references/` dir now has the two files slice 5 expects to find alongside its four support-script files. The references index in `SKILL.md` (slice 3) already points at both filenames, so they resolve.

### Abstraction usage
- Used/was specified: **yes**, all three specified abstractions used.
  - **Live spec rechecked:** The digest states it is "single-sourced from the live specification at [agentskills.io/specification]" and includes a "recheck that URL at authoring time" note. The frontmatter rules (name ≤64, description ≤1024, optional `license`/`compatibility`/`metadata`/`allowed-tools`, "no other fields are spec-valid") match the current live spec exactly.
  - **`tdd` companion-precedent used:** `target-pi.md` references the `tdd` skill's `tests.md` + `mocking.md` as the companion-reference precedent (line "The `tdd` skill ships `tests.md` and `mocking.md` alongside its `SKILL.md`").
  - **`tests/skills.test.ts` + `package.json` patterns for the Pi example:** The worked example (`lint-fixer`) shows the exact three-step registration: add to `pi.skills` (length 17 → 18), append to `SKILL_FILES`, bump the `toBe()` assertion, and `npm test`. Matches the actual patterns in the repo.

### Out-of-scope changes
- **None.** No support-script references written (slice 5's scope). No `SKILL.md` body changes (slice 3's scope). No script changes (slice 2's scope). No auxiliary docs (README/CHANGELOG). No `package.json` or test changes. The only files added are the two reference files specified by the slice doc.

### Cross-checks performed

1. **Validator allowed-key set vs. spec digest field list (agreement):** The slice-2 `validate_skill.mjs` `ALLOWED_KEYS` set is `{name, description, license, compatibility, allowed-tools, metadata}`. The `agent-skills-spec.md` digest lists the same six fields (2 required + 4 optional) and states "No other frontmatter fields are spec-valid." **They agree exactly.** This confirms the slice-2 bug-fix (`compatibility` included) is consistent with the slice-4 spec digest.

2. **When-to-read notes match `SKILL.md` index:** `agent-skills-spec.md` opens with "Read when authoring frontmatter or deciding structure." — matches `SKILL.md` line 324: "Read when authoring frontmatter or deciding structure." `target-pi.md` opens with "Read when the target is Pi." — matches `SKILL.md` line 329: "Read when the target is Pi." **Exact match.**

3. **Spec digest completeness (acceptance criterion 2):**
   - Name rules: ≤64, lowercase a-z/0-9 + hyphens, no leading/trailing/consecutive hyphens, must match parent dir — ✅ all present.
   - Description rules: ≤1024, non-empty, what + when — ✅ present.
   - Four optional fields: `license`, `compatibility` (≤500), `metadata` (string→string), `allowed-tools` (space-separated, experimental) — ✅ all four present with constraints.
   - "No other fields are spec-valid" — ✅ stated explicitly.
   - 64/1024/500 limits — ✅ all three stated.
   - Points to `skills-ref` — ✅ (4 references, including the GitHub URL).
   - Points to live spec URL — ✅ (`agentskills.io/specification` linked).

4. **`target-pi.md` completeness (acceptance criterion 3):**
   - `skills/<name>/` + `package.json` `pi.skills` registration — ✅ with code example.
   - `tests/skills.test.ts` coverage (`SKILL_FILES` + length assertion) — ✅ with code example.
   - Repo gate — ✅ explained (auto-disables in work repos; produced skills inherit it).
   - Companion-doc precedent (`tdd`) — ✅ referenced.
   - `disable-model-invocation` / `metadata.telemetry.capture` as harness-specific extensions — ✅ both documented with 7 explicit "not portable" / "harness-specific" / "fail external validators" / "opt-in" markers. The portable core is explicitly distinguished from the Pi extension.
   - Worked mini-example — ✅ (`lint-fixer` skill: 4 steps from scaffold to `npm test`).

5. **No duplication of `SKILL.md` content (acceptance criterion 4):** `SKILL.md` restates the *essential* frontmatter rules (name ≤64, description ≤1024, the 4 optional fields) but explicitly frames them as "Read `references/agent-skills-spec.md` for the full format spec; the essential rules:" — this is the intended summary-with-pointer pattern (progressive disclosure), not a duplication. The full rules (directory structure, name regex, progressive disclosure levels, file-ref rules, validation) live only in the digest. `target-pi.md` does not restate spec rules; it says "The portable format rules … live in `agent-skills-spec.md` — this file covers only what differs when the target is Pi." **Single-sourcing respected.**

6. **Dogfood + test suite:** `node validate_skill.mjs skills/skill-creator` → `OK` (exit 0). `npm test` → 602/602 green (first run had 1 known `bundler.test.ts` flake failure; re-run clean — pre-existing, not a regression from this slice).

### Task doc update needed?
No. No divergence from the arch spec or slice doc. The implementation matches the planned API surface, uses the specified abstractions, and satisfies all 5 acceptance criteria. No `## Implementation notes` update needed.

### User attention needed?
No. The slice is spec-compliant with zero deviations. One minor observation for slice 6's self-review (not a deviation): `agent-skills-spec.md` includes a "description guidance" section with good/poor examples — this slightly overlaps with `SKILL.md`'s frontmatter guidance (which also has description-writing tips), but the digest's version is the *spec's* guidance (what + when, keyword inclusion) while `SKILL.md`'s is the *authoring-workflow* guidance (enumerate literal phrases, add "Do NOT use for", err pushy). They're complementary, not duplicative — slice 6 should confirm this reads coherently.
