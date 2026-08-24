# Architecture spec — build-tdd-reference-skill

Source decision: `tdd-skill-comparison` (settled grilling). Implements the
seven settled questions: add a model-invoked `/tdd` reference skill, agree
seams in the arch spec (features) / repro (bugs), narrow the tdd-worker loop
to RED→GREEN, move refactor to implement-task Step 3, ship companion reference
docs, deliver the skill via the `skill:` subagent param, keep the slice-verifier
pass/fail.

## Slice 1 — tdd-skill-content (author the skill + register)

### Exports (public API surface)

- `skills/tdd/SKILL.md` — model-invoked skill; frontmatter `name: tdd`,
  `description` fires on test-quality/seams/red-green.
- `skills/tdd/tests.md` — good/bad test examples (TS-flavored).
- `skills/tdd/mocking.md` — when-to-mock guidelines (system boundaries only).
- `package.json` `pi.skills` gains `"./skills/tdd"` (length 6 → 7).
- `tests/skills.test.ts` — `SKILL_FILES` adds `"skills/tdd/SKILL.md"`;
  `pi.skills.length` assertion 6 → 7.

### Existing abstractions to use

- `SKILL_FILES` array + `pi.skills.length` assertion pattern in
  `tests/skills.test.ts` (the structure-test seam for registering a skill).
- mp-skills' `/tdd` content at
  `~/Projects/mp-skills/skills/engineering/tdd/{SKILL.md,tests.md,mocking.md}`
  as the source to adapt from, not port verbatim.

### Do NOT reimplement

- Don't port mp-skills verbatim. Adapt to our pipeline: no `to-spec`; seams
  via arch spec; loop is red→green; refactor at implement-task Step 3 (not
  `/code-review`).
- Don't bake content into `agents/tdd-worker.md` (slice 2's job, and only as
  a reference line).
- Don't add test-quality judgment to the slice-verifier.

### Interface contract (for slice 2)

Slice 2 wires `skill: "tdd"` into the dispatch sites. The skill must exist
and be registered before slice 2 runs — that's why slice 2 is `blocked_by`
slice 1. Slice 2 depends on: the skill dir at `skills/tdd/`, the `name: tdd`
frontmatter (the `skill:` param references the skill name), and the manifest
entry.

## Slice 2 — tdd-pipeline-wiring (wire it in + narrow the loop + own refactor)

### Exports (public API surface)

- `agents/tdd-worker.md` — Step 3 loop narrows to RED→GREEN (inline REFACTOR
  removed); new one-line consult instruction added; frontmatter unchanged.
- `skills/implement-task/resources/feature.md` — tdd-worker chain step gains
  `skill: "tdd"`; Step 1 arch-spec template gains a **Seams** bullet; Step 3
  prose sharpened to own the refactor step.
- `skills/implement-task/resources/bug.md` — tdd-worker chain step gains
  `skill: "tdd"`. No arch-spec/Seams/Step-3 change (bug path stays lean).

### Existing abstractions to use

- The `skill:` subagent param (pi-subagents SKILL.md lines 75–76) — inject the
  reference into the fresh-context worker.
- The existing Step 3 coherence-refactor pass in `feature.md` — already
  parent-owned; sharpen the prose, don't invent a stage.
- The existing `agents/tdd-worker.md` structure (frontmatter + Steps) — edit
  in place.

### Do NOT reimplement

- Don't move refactor to a `/code-review` skill (doesn't exist; sibling task
  owns that).
- Don't add test-quality judgment to the slice-verifier (sibling task).
- Don't change the bug path's leanness (no arch spec, no Step 3, no seam
  field — repro is the seam).

### Interface contract

No downstream slice depends on slice 2 (it's the last slice). The contract is
with the existing test suite: all cross-reference assertions (`feature.md`
references tdd-worker/slice-verifier/land-worker/deviation-reporter/
task_dependency_levels; `bug.md` references tdd-worker/slice-verifier/land-worker
+ red-first rule; both keep "split" before "retry" + "parent never implements")
must remain green.

## Cross-slice notes

- **Refactor safety:** slice 2 lands all three file changes (tdd-worker
  narrowing, feature.md wiring+Seams+Step 3, bug.md wiring) together so
  refactor always has a home — no transient state where the worker shed
  REFACTOR but Step 3 doesn't yet own it.
- **Test surface:** `npm test` (vitest) is the landing gate for both slices.
  Slice 1's seam is the structure tests; slice 2's seam is the cross-reference
  tests + the full suite.
- **No `codebase-design` dependency:** the `/tdd` SKILL.md may reference
  `codebase-design` vocabulary, but only if that skill exists. It doesn't yet
  (a map fog item), so state seam terms inline.
