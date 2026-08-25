# Architecture spec — build-task-workflow-doctor-skill

Source decision: `improve-architecture-evaluation` (settled grilling, Q6).
Builds a model-invoked `task-workflow-doctor` skill that diagnoses common
task-workflow issues (missing dirs/files) and routes the user to the right
skill. The doctor **diagnoses and routes**; it does not fix.

## Slice 1 — doctor-skill-and-resources (author the skill + resources + register)

### Exports

- `skills/task-workflow-doctor/SKILL.md` — model-invoked skill (no
  `disable-model-invocation`). Frontmatter `name: task-workflow-doctor`;
  `description` fires on "workflow broken", "doctor", "tasks not showing",
  "missing CONTEXT.md", "missing docs/bugs", "can't create bugs", etc. Body:
  - **Purpose:** diagnose a reported task-workflow symptom → check for the
    common missing dirs/files → route to the appropriate skill. Explicitly
    states: "The doctor diagnoses and routes; it does not fix. Run the routed
    skill to fix."
  - **Process:** ask the user for the symptom (or read what they reported);
    check each common-issue resource; report which artifact is
    missing/misconfigured and which skill/command to run.
  - A **symptom → missing artifact → skill/command** table linking to the
    per-issue resources under `resources/`.
- `skills/task-workflow-doctor/resources/` — one resource file per common
  issue (each: the missing artifact, the symptom it causes, the skill/command
  to run). Exactly these 8 files:
  - `missing-tasks-tree.md` — `docs/tasks/` missing → `/skill:onboard-workflow`
  - `missing-state-yaml.md` — `docs/tasks/state.yaml` missing → `/skill:onboard-workflow`
  - `missing-bugs-dirs.md` — `docs/bugs/` + `docs/bugs/archive/` missing → `/skill:onboard-workflow`
  - `missing-dev-env.md` — `docs/dev-env.md` missing → `/skill:onboard-workflow`
  - `missing-testing-md.md` — `docs/testing.md` missing → `/skill:onboard-workflow`
  - `missing-context-md.md` — repo-root `CONTEXT.md` missing → note (the
    relevant skill creates it lazily when adopted; until then a manual step)
  - `missing-adr-dir.md` — `docs/adr/` missing → note (the relevant skill
    creates it lazily when adopted; until then a manual step)
  - `manifest-misconfigured.md` — `package.json` `pi.skills`/`pi.subagents`
    misconfigured → manual fix (point at the manifest docs)
- `package.json` — `pi.skills` gains `"./skills/task-workflow-doctor"`
  (length 8 → 9), appended after `"./skills/code-review"`.
- `tests/skills.test.ts` — `SKILL_FILES` adds
  `"skills/task-workflow-doctor/SKILL.md"`; the `pi.skills.length` assertion
  changes from `8` to `9`.

### Existing abstractions to use

- The `SKILL_FILES` + `pi.skills.length` assertion pattern in
  `tests/skills.test.ts` — the structure-test seam, proven by `/tdd` and
  `/code-review`.
- The skill-prose structure conventions used by the existing skills
  (`---` frontmatter with `name` + `description`; `# /<name>` H1; Process
  sections; resource links).
- `onboard-workflow` as the routing target for the docs/tasks/ + docs/bugs/
  tree, `docs/tasks/state.yaml`, `docs/dev-env.md`, `docs/testing.md` —
  **reference** it (`/skill:onboard-workflow`), do not duplicate its setup
  logic.

### Do NOT reimplement

- Do not auto-fix: the doctor routes; the user runs the routed skill. Do not
  create missing dirs/files from the doctor.
- Do not duplicate `onboard-workflow` setup logic; reference it.
- Do not touch `build-improve-architecture-skill`'s scope (CONTEXT.md /
  docs/adr/ adoption is a separate, blocked task). The doctor only *notes*
  those as "create lazily via the relevant skill when adopted; until then a
  manual step".
- Do not edit the doctor SKILL.md in slice 2 (slice 2 only adds assertions).
- Avoid "chain.json", "subagent_supervisor", "contact_supervisor" patterns
  (the existing structure tests assert their absence for every skill file).

### Interface contract (for slice 2)

Slice 2 adds xref assertions that lock the routing contract. Therefore
slice 1's `skills/task-workflow-doctor/SKILL.md` MUST:
- reference `onboard-workflow` (the primary route for the docs/tasks/ +
  docs/bugs/ tree, state.yaml, dev-env, testing).
- contain the literal words `diagnoses` and `routes` (the not-a-fixer
  contract).

These are the exact strings slice 2 asserts, so they must land in slice 1.

## Slice 2 — doctor-routing-tests (add routing xref assertions)

### Exports

- `tests/skills.test.ts` — two new tests added to the existing
  `skill cross-references` describe block:
  - test that `skills/task-workflow-doctor/SKILL.md` references
    `onboard-workflow` (the primary route).
  - test that the doctor SKILL.md contains `diagnoses` and `routes` (the
    not-a-fixer contract).

### Existing abstractions to use

- The `skill cross-references` describe block + `readFile` / `expect ...
  toContain` pattern already used throughout `tests/skills.test.ts`.

### Do NOT reimplement

- Do not change the doctor SKILL.md content in this slice (slice 1 owns it).
- Do not restate or duplicate the routing table in tests; assert the contract
  strings only.

### Interface contract

No downstream slice. Contract is with the test suite: `npm test -- tests/skills.test.ts`
green; all pre-existing assertions stay green.

## Cross-slice notes

- **Dependency levels:** Level 1 = `doctor-skill-and-resources`; Level 2 =
  `doctor-routing-tests` (blocked by slice 1). Sequential, single shared
  repo cwd.
- **Not-a-fixer contract is load-bearing:** the words `diagnoses` and
  `routes` and the `onboard-workflow` reference appear in slice 1's SKILL.md
  and are asserted by slice 2. Keep them stable across both slices.
- **Test surface:** `npm test -- tests/skills.test.ts` is the gate for both
  slices. The pre-existing `session.test.ts` failures (16) reproduce on
  main and are not a regression — not in scope.
- **Resource count:** exactly 8 resource files. Slice 1's acceptance
  requires "at least 8"; the task scope lists exactly 8 — author all 8.
