## Deviation report — onboarding-and-routing

### API surface changes
- **Planned:** route string `/skill:report-bug`; triage grep
  `grep -l "status: reported" docs/bugs/*.md`; `docs/bugs/archive/` +
  `docs/dev-env.md` template creation with no-clobber on re-run.
- **Actual:** exactly as planned. Route string and grep pattern match
  the arch-spec contract verbatim; onboard-workflow creates
  `docs/bugs/` + `docs/bugs/archive/` (with `.gitkeep` note) and a
  `docs/dev-env.md` template step with an explicit no-clobber clause.
- **Impact:** none on other slices. The contract strings consumers
  rely on (report-bug invocation name, `status: reported` lifecycle
  value) are intact.

### Abstraction usage
- Used/was specified: **yes.** Extended `tests/skills.test.ts` in the
  existing "skill cross-references" suite using the existing
  `readFile` helper — no new test files, no new helpers. No `src/` or
  `agents/*.md` changes, as the spec required.

### Out-of-scope changes
- Minor, in-scope-adjacent only: the onboard-workflow frontmatter
  `description` was updated to mention the new artifacts
  (`docs/bugs/`, `docs/dev-env.md`), and the final report line now
  mentions `/skill:report-bug`. Both are natural consequences of the
  slice, not scope creep.
- One nit (non-blocking): the `.gitkeep` note ("Empty directories get
  a `.gitkeep`") is stated for all created dirs, not just
  `docs/bugs/archive/` — slightly broader than the slice text but
  matches existing repo practice (docs/ideas/.gitkeep etc.).

### Acceptance-criteria check
- ✅ onboard prose includes `docs/bugs/archive/` + `docs/dev-env.md`
  template creation
- ✅ task-overview routes bug reports (`/skill:report-bug`) and lists
  the triage-queue query
- ✅ 6 prose/structure tests added, all asserting the above
- ✅ Full suite green (171/171, verified by re-running `npm test`)
- ✅ Edge case covered: no-clobber clause stated in prose + asserted
  by test

### Task doc update needed?
No — nothing durable beyond what the slice doc already records. (The
coherence-refactor mandate for slices 1–2 deviations is already
recorded in `task.md`.)

### User attention needed?
**No.** No API surface changes, no out-of-scope additions, all
acceptance criteria met.
