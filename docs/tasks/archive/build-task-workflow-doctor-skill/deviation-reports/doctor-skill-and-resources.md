## Deviation report — doctor-skill-and-resources

### API surface changes
- **Planned:** `skills/task-workflow-doctor/SKILL.md` (model-invoked, frontmatter `name: task-workflow-doctor`, description firing on workflow-health symptoms, body with purpose/process/symptom→artifact→route table, not-a-fixer statement); exactly 8 resource files under `resources/`; `package.json` `pi.skills` gains `"./skills/task-workflow-doctor"` appended after `"./skills/code-review"` (8 → 9); `tests/skills.test.ts` `SKILL_FILES` adds the doctor entry + `pi.skills.length` assertion 8 → 9.
- **Actual:** Exactly as planned. No API surface changes.
- **Impact:** None. The interface contract for slice 2 (SKILL.md contains literal `diagnoses`, `routes`, and references `onboard-workflow`) is satisfied, so slice 2's xref assertions will pass against the landed content.

### Abstraction usage
- Used/was specified: yes. The `SKILL_FILES` + `pi.skills.length` assertion pattern was used exactly as specified. The skill-prose structure conventions (frontmatter, `# /<name>` H1, process sections, resource links) were followed. `onboard-workflow` is referenced (6 occurrences in SKILL.md) as the routing target; its setup logic was not duplicated.

### Out-of-scope changes
- None. No files were changed outside the 11 deliverables listed in the slice doc. `docs/tasks/state.yaml` shows as a working-tree modification but was not committed to the slice branch — it is the task-workflow state marker, correctly left out of the diff.

### Load-bearing contract verification (independent)

| Contract | Expected | Actual | ✓ |
|---|---|---|---|
| `diagnoses` in SKILL.md | present | 2 occurrences | ✓ |
| `routes` in SKILL.md | present | 2 occurrences | ✓ |
| `onboard-workflow` reference in SKILL.md | present | 6 occurrences | ✓ |
| Resource file count | exactly 8 | 8 files | ✓ |
| Resource file names | 8 specified names | all 8 match | ✓ |
| `package.json` `pi.skills` length | 9 | 9 | ✓ |
| `pi.skills` entry position | appended after `./skills/code-review` | appended after `./skills/code-review` | ✓ |
| `tests/skills.test.ts` `SKILL_FILES` entry | `skills/task-workflow-doctor/SKILL.md` added | added | ✓ |
| `pi.skills.length` assertion | `toBe(9)` | `toBe(9)` | ✓ |
| Forbidden terms in SKILL.md | none (`chain.json`, `subagent_supervisor`, `contact_supervisor`) | none found (grep exit 1) | ✓ |
| `name: task-workflow-doctor` frontmatter | present | present | ✓ |
| `description` length > 5 chars | yes | 211 chars | ✓ |
| Not-a-fixer statement | "The doctor diagnoses and routes; it does not fix. Run the routed skill to fix." | present (line 14) | ✓ |
| `npm test -- tests/skills.test.ts` | green | 104/104 passed (independently re-run) | ✓ |

### Slice doc acceptance criteria check

- "SKILL.md + at least 8 resource files exist and are non-empty" — ✓ (1 SKILL.md + 8 resources, all non-empty, 341–503 bytes each)
- "SKILL.md frontmatter has `name: task-workflow-doctor` and a description > 5 chars" — ✓
- "SKILL.md states the doctor diagnoses and routes (does not auto-fix)" — ✓ (explicit statement on line 14)
- "package.json `pi.skills` contains `"./skills/task-workflow-doctor"` and has length 9" — ✓
- "tests/skills.test.ts `SKILL_FILES` includes the doctor skill; the length assertion expects 9" — ✓
- "npm test -- tests/skills.test.ts green" — ✓ (104 passed, independently re-run)

### Task doc update needed?
No. The `## Implementation notes` section was seeded (empty) by the orchestrator before dispatch. No deviations to record — the implementation is a clean match to spec.

### User attention needed?
No. The implementation matches the arch spec and slice doc exactly with no API surface changes or scope widening.
