## Deviation report — finalize-bug-closure

### API surface changes
- **Planned:** `type: bug` branch in `skills/finalize-task/SKILL.md` that closes the linked bug doc (`status: fixed`, `fix_commit`, root cause/fix summary, `git mv` to `docs/bugs/archive/`); reads `bug: <slug>` from task frontmatter, asks user when absent; feature path unchanged; structure test asserting `docs/bugs/archive`.
- **Actual:** Exactly as planned — new "Step 6 — Bug closure (type: bug only)" with all specified behaviors; feature path explicitly skipped when `type:` absent/`feature`; five prose assertions added to `tests/skills.test.ts`.
- **Impact:** None on dependent slices. Slice 4 (onboarding-and-routing) creates `docs/bugs/archive/`, which this step targets — contract unchanged.

### Abstraction usage
- Used/was specified: **yes.** Followed the existing `bug: <slug>` convention from `skills/report-bug/SKILL.md` (slice 1's contract); reused the `tests/skills.test.ts` cross-reference assertion pattern; did not touch `src/` or `agents/*.md`.

### Out-of-scope changes
- **Step renumbering** in finalize-task (Archive 6→7, Map finalization 7→8, Report 8→9) — mechanical consequence of inserting the new step; declared in the worker's "Notable events". Acceptable.
- One extra assertion beyond the slice doc's single "structure test": five focused assertions instead of one. More thorough, same file, same pattern. Acceptable.
- Minor: `tests/skills.test.ts` lost its trailing newline ("\ No newline at end of file"). Cosmetic; harmless.

### Divergence from acceptance criteria
- All four acceptance criteria met: `type: bug` branch present; `bug: <slug>` convention documented (in both report-bug and finalize-task prose); structure test(s) assert `docs/bugs/archive`; full suite green (165/165).
- Edge case handled as specified: `bug:` absent → ask user, do not proceed.

### Task doc update needed?
No. The `## Implementation notes` section already carries the slice-2 deviation summary; nothing new to append. The coherence-refactor mandate (restore feature.md behaviors, fix bug.md repro path) remains pending for Step 3.

### User attention needed?
**No.** Clean implementation, no scope drift, no API surface changes.
