## Deviation report — core-skill-body

### API surface changes
- **Planned:** The `SKILL.md` body replaced with the full synthesized core (capability-ceiling + 4 conditional rules, 8-phase workflow, frontmatter guidance, core principles, "choose a script language" rule, references index). Frontmatter unchanged. No reference files created. The "Helper scripts" section from slice 2 preserved.
- **Actual:** Exactly as planned. The only file changed is `skills/skill-creator/SKILL.md` (307 insertions, 33 deletions — the skeleton replaced by the full body). Frontmatter is byte-identical to the task-branch version. The `references/` dir remains empty. The "Helper scripts" section is preserved intact at line 288.
- **Impact:** None on dependent slices. The references index names exactly the 6 required files + optional `trigger-design.md`, matching the interface contract for slices 4–5 precisely.

### Abstraction usage
- Used/was specified: **Yes.** The body links `references/agent-skills-spec.md` for the full format spec (not paraphrased), links `references/target-pi.md` for Pi specifics (not listed inline), and links `references/support-scripts.md` + the 3 per-language files for the script policy (not duplicated). Each fact has one home — the body's "Single-source each fact" principle is followed by the body itself. The "Choose a script language" rule carries the policy-level summary and points to the references for detail, exactly as the arch spec requires.

### Out-of-scope changes
- **No reference files created.** The `references/` dir is empty — slices 4–5 own those files. ✅
- **No frontmatter change.** The frontmatter is byte-identical to slice 1's version (spec-pure `name: skill-creator` + `description`). ✅
- **No files outside `SKILL.md` touched.** The diff is a single file. ✅
- **One cosmetic note:** `references/api-errors.md` appears in the "Progressive disclosure" principle section as a *hypothetical example* of how to write a when-to-read note ("Read `references/api-errors.md` if the API returns a non-200 status"). It is NOT in the references index and NOT a real file — it's an illustrative placeholder. No action needed, but slice 6's self-review should confirm a reader wouldn't mistake it for a real reference.

### References index — interface contract verification

The arch spec requires the index to name exactly these 6 files (+ optional `trigger-design.md`):

| Required filename | Present in index? | When-to-read note? |
|---|---|---|
| `references/agent-skills-spec.md` | ✅ | "Read when authoring frontmatter or deciding structure." |
| `references/target-pi.md` | ✅ | "Read when the target is Pi." |
| `references/support-scripts.md` | ✅ | "Read first when bundling a produced-skill script." |
| `references/support-scripts-python.md` | ✅ | "Read when the chosen language is Python." |
| `references/support-scripts-js-ts.md` | ✅ | "Read when the chosen language is JS or TS." |
| `references/support-scripts-bash.md` | ✅ | "Read when the chosen language is Bash." |
| `references/trigger-design.md` (optional) | ✅ (marked optional) | "only if trigger detail outgrows the body" |

All filenames match the interface contract for slices 4–5 exactly. No extra indexed references. ✅

### Acceptance criteria check

| AC | Description | Status |
|---|---|---|
| AC1 | Capability ceiling (minimal default) + 4 conditional rules + "Portable vs harness-specific extension" distinction | ✅ All present: "Capability ceiling and conditional rules" section + "Portable vs harness-specific extension" section |
| AC2 | 8-phase workflow in order, each with a concrete reason | ✅ Phases 1–8 in order, each with a `*Why:*` justification |
| AC3 | Frontmatter guidance: `name`+`description` rules + 4 optional fields with justification + forbids harness-specific fields | ✅ "Produced-skill frontmatter" section with subsections for `name`, `description`, each of the 4 optional fields, and "Keep the portable core clean" |
| AC4 | "Choose a script language" rule present and points to the support-script references | ✅ Section present, points to `support-scripts.md` + 3 per-language files (9 references) |
| AC5 | References index links each reference one level deep with a when-to-read note | ✅ 6 indexed references + 1 optional, each with a "Read when…" note |
| AC6 | ≤500 lines / ≲5000 tokens | ✅ 354 lines; ~4800 tokens (19208 chars ÷ ~4 chars/token) |

### Body size
- **Lines:** 354 (limit: 500) ✅
- **Token estimate:** ~4800 (limit: ~5000) ✅ — tight but within budget. Slice 6's context review may find sections to trim for headroom.

### Capability-conditional vs brand-conditional
- The body keys all rules on **target-agent capabilities** (filesystem / bash-exec / network-MCP / harness-extensions), not on brands. ✅
- "Claude" appears once — in the `description` frontmatter as a literal trigger phrase ("Make a harness-specific or Claude-oriented skill portable across agents"), which is correct (trigger phrases should name real tools users mention). It does not appear in the body's capability rules. ✅

### Test results
- `validate_skill.mjs skills/skill-creator` → **OK** (dogfood PASS) ✅
- `npm test` → **602/602 passed** on stable run ✅ (4 bundler-test failures on first run were the documented pre-existing flaky race in `scripts/bundler.test.ts`, not caused by this slice — confirmed by re-run passing 602/602)

### Task doc update needed?
No. No deviations that require updating the task doc's `## Implementation notes`.

### User attention needed?
No. Zero deviations from the arch spec or slice doc. The implementation is spec-compliant on all 6 acceptance criteria. The one cosmetic note (`api-errors.md` as a hypothetical example) is non-blocking and can be checked in slice 6's self-review.
