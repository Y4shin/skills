## Deviation report — scaffold-and-register

### API surface changes
- **Planned:** `skills/skill-creator/SKILL.md` with spec-pure frontmatter (`name: skill-creator` + `description` ≤1024 only), a skeleton body (8-phase workflow outline + capability-ceiling stub), empty `scripts/`/`references/` dirs, trigger-test seeds in the slice doc, registration in `package.json` `pi.skills` and `tests/skills.test.ts`.
- **Actual:** Exactly as planned. Frontmatter parses to `{name, description}` only (verified via the repo's `parseFrontmatter` regex). Description is 593 chars, no angle brackets, contains literal phrases for all 12 checked capabilities (create, make, build, scaffold, turn, improve, refactor, fix, review, decide, portable, "Do NOT use for"). Body is 55 lines: capability-ceiling section with 4 conditional rules (filesystem, bash/exec, network/MCP, harness extensions), 8-phase workflow skeleton (8 numbered phases, one line each), "Helper scripts" placeholder comment for slice 2, "References" placeholder comment for slice 3. Empty `scripts/` and `references/` dirs exist on disk. Trigger-test seeds (3 should-trigger + 2 near-miss) appended to the slice doc.
- **Impact:** None on dependent slices. Slice 2 can populate `scripts/` and the "Helper scripts" section; slice 3 can replace the body and fill the "References" index. The placeholder HTML comments are clear markers.

### Manifest-number correction (spec-compliant, NOT a deviation)
- The arch spec explicitly corrects the task doc's stale "15 → 16" to **17** (because `wait-what` was already added, bringing the manifest to 16 before this task). The implementation targets 17 correctly: `pi.skills.length` is 17, the assertion is `toBe(17)`, and `SKILL_FILES` has both `wait-what/SKILL.md` and `skill-creator/SKILL.md` added. The slice doc says "length 16" — the arch spec overrides this. **This is spec-compliant, not a deviation.**
- **Note:** The tdd-worker also added `"./skills/wait-what"` to `pi.skills` in `package.json` and `"skills/wait-what/SKILL.md"` to `SKILL_FILES`, which was missing from the repo's tracking despite `wait-what` already existing as a skill. This is a side-fix that was necessary to reach the correct count of 17 and to make `npm test` pass (the manifest test would have failed at `toBe(17)` without it). It is in scope per the arch spec's ground-fact correction.

### Abstraction usage
- Used/was specified: **yes.** The implementation mirrors the `tests/skills.test.ts` `SKILL_FILES` array + `pi.skills.length` assertion pattern (the `build-tdd-reference-skill` precedent). The `tdd` skill's frontmatter shape (`name` + `description` only, no Pi-only fields) was used as the spec-pure template. The `parseFrontmatter` regex in the test file handles single-line `name:` + `description:` correctly (no block scalars introduced, per the arch spec's warning).

### Out-of-scope changes
- **`wait-what` registration fix:** The tdd-worker added `"./skills/wait-what"` to `package.json` `pi.skills` and `"skills/wait-what/SKILL.md"` to `SKILL_FILES` in `tests/skills.test.ts`. The `wait-what` skill existed on disk but was not registered in the manifest or test file. This was necessary to reach the correct count (17) and make the manifest test pass. It is a side-fix enabled by the arch spec's ground-fact correction. **Impact:** benign — `wait-what` is now correctly registered; the structure tests now cover it.
- No other out-of-scope changes. No validator, no scaffold script, no body content beyond the skeleton, no references — all correctly deferred to slices 2–5.

### Divergence from slice doc's acceptance criteria
- **"package.json pi.skills contains ./skills/skill-creator and has length 16"** — the arch spec overrides this to 17. The implementation uses 17. **Spec-compliant.**
- **"tests/skills.test.ts SKILL_FILES includes the new file and asserts length 16"** — same override; assertion is `toBe(17)`. **Spec-compliant.**
- All other acceptance criteria met exactly:
  - ✅ `SKILL.md` exists; frontmatter parses to exactly `{name, description}`.
  - ✅ `description` is 1–1024 chars (593), no angle brackets, contains literal phrases for ≥6 capabilities (12 found) + "Do NOT use for" clause.
  - ✅ Folder name (`skill-creator`) equals the `name` field.
  - ✅ `npm test` is green (580/580 tests pass); the new skill passes structure tests (name + description >5 + no `.chain.json` + no `subagent_supervisor`).
  - ✅ Trigger-test seeds (≥3 + ≥2) recorded in the slice doc.
- **Minor note (not a deviation):** the empty `scripts/` and `references/` dirs exist on disk but are not tracked by git (git doesn't track empty dirs). The slice doc explicitly says "empty dirs are fine because later slices populate them" — so this is expected. Slice 2 will add files to `scripts/`, making it trackable.

### Task doc update needed?
- **No.** The task doc's "15 → 16" / "length 16" prose is stale, but the arch spec already documents the correction and instructs workers not to edit the task doc prose. The `## Implementation notes` section should record (when the land-worker lands this slice) that the manifest was bumped to 17 (not 16) and that `wait-what` was registered as a side-fix.

### User attention needed?
- **No.** No scope change, no API surface difference. The manifest-number correction (17 vs 16) is arch-spec-approved. The `wait-what` side-fix is benign and necessary.
