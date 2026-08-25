## Deviation report — diagnosing-bugs-pipeline-wiring

### API surface changes
- **Planned:** bug.md tdd-worker dispatch passes `skill: "diagnosing-bugs"` + explicit "You are on a `type: bug` task" instruction line; tdd-worker.md gains path-agnostic `/diagnosing-bugs` line; tests/skills.test.ts gains two xref assertions.
- **Actual:** Exactly as planned. The `skill:` param changed from `"tdd"` to `"diagnosing-bugs"` (replaced, not added alongside). The arch spec's cross-slice notes explicitly anticipated this: "if the `skill:` field is single-valued, `diagnosing-bugs` is the bug-path value (the tdd-worker still gets TDD guidance from its agent definition)." The tdd-worker's `/tdd` consult line in Constraints remains, so TDD guidance is preserved.
- **Impact:** None on dependent slices — this is the last slice. The bug-signal contract (skill presence + instruction line) is satisfied.

### Abstraction usage
- Used/was specified: yes — the `skill:` subagent param pattern (proven by /tdd and /code-review) and the `skill cross-references` describe block + `readFile`/`expect.toContain` pattern used as specified. The existing bug.md xref assertions (tdd-worker, slice-verifier, land-worker, code-reviewer, red-first rule, "split" before "retry" + "parent never implements") all remain green.

### Out-of-scope changes
- None. The diff is exactly 3 files: `skills/implement-task/resources/bug.md`, `agents/tdd-worker.md`, `tests/skills.test.ts`. No bookkeeping artifacts in the diff (no state.yaml, no slice archive docs).
- `skills/diagnosing-bugs/SKILL.md` NOT changed (slice 1 owns it) — confirmed empty diff.
- `skills/implement-task/resources/feature.md` NOT changed — confirmed empty diff.
- No `chain.json` / `subagent_supervisor` / `contact_supervisor` introduced (the 2 grep hits in tests/skills.test.ts are the existing assertions that assert *absence* of those patterns, not introductions).

### Divergence from slice doc's acceptance criteria
- None. All 5 acceptance criteria satisfied:
  1. bug.md dispatch passes `skill: "diagnosing-bugs"` AND includes the explicit "You are on a type: bug task" instruction line ✓
  2. tdd-worker.md has the path-agnostic "If the dispatch passes `/diagnosing-bugs`…" line (line 48, immediately after the `/tdd` consult line on line 47); frontmatter unchanged ✓
  3. tests/skills.test.ts has the two new xref assertions; all pass ✓
  4. Existing xref tests still pass (bug.md: tdd-worker/slice-verifier/land-worker/code-reviewer + red-first rule; "split" before "retry" + "parent never implements") ✓
  5. `npm test -- tests/skills.test.ts` green (114/114) ✓

### Task doc update needed?
No — the `## Implementation notes` section does not need updating for this slice. The land-worker appends a one-line note.

### User attention needed?
No — no scope change, no API surface divergence from the spec. The `skill:` param replacement (not addition) was explicitly anticipated and approved by the arch spec's cross-slice notes.
