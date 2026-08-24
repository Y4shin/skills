## Deviation report — gate-suppress-help-and-skill-list

### API surface changes
- **Planned:** Write `docs/tasks/gate-skills-prompt-and-help/limitations.md` documenting the V2 finding (no subtractive hook exists for `/help`/skill-list). Add one guard test in `tests/gate-factory.test.ts` asserting the file exists and mentions `/help` and `skill-list`. No suppression code.
- **Actual:** Exactly that. `limitations.md` (5 lines, 3 sentences — within the arch spec's "3–5 sentences" guidance) records: "pi 0.80.10 exposes no extension hook to suppress skills from `/help`/skill-list; the gate covers the system prompt only. `/help` will still list the six task-workflow skills in a work repo. Explicit `/skill:<name>` is prevented via the `input` event (see slice 3)." One test ("limitations.md exists and documents the /help and skill-list gap") asserts the file exists and contains `/help` and `skill-list`.
- **Impact:** None. The limitation text is available for `gate-config-docs-and-defaults` to copy into the README, per the interface contract.

### Abstraction usage
- Used/was specified: **yes (N/A — documentation slice).** No abstractions to use per the arch spec ("Existing abstractions to use: none (documentation)"). The test uses `existsSync` + `readFileSync` from `node:fs` to assert the file — standard, no new deps.

### Out-of-scope changes
- **None.** The slice touched exactly 2 files: `limitations.md` (new) and `tests/gate-factory.test.ts` (+12 lines for the test block + 1 import). No `src/pi.ts` changes (confirmed: `git show <commit> -- src/pi.ts` is empty). No new source files, no new deps, no suppression code attempted.

### Divergence from the slice doc's acceptance criteria
- ✅ `limitations.md` exists and records the V2 limitation text.
- ✅ The text mentions `/help`/skill-list and references slice 3's `input` event.
- ✅ One test in `tests/gate-factory.test.ts` asserts the file exists and mentions `/help` and `skill-list`.
- ✅ No suppression code written (no `src/pi.ts` changes).
- ✅ `npm run typecheck` passes clean.
- ✅ `npx vitest run tests/gate-factory.test.ts` — 17 tests pass (16 from slice 1 + 1 new).
- Minor: the test also asserts `content.toContain("skill-list")` (the arch spec said "mentions `/help` and `skill-list`" — both are checked). No divergence.

### Task doc update needed?
**No.** The slice is a pure documentation + guard-test slice; it conforms exactly to the arch spec and the corrected slice doc.

### User attention needed?
**No.** No scope change, no API surface change, no suppression code. The limitation is documented as the spec required.
