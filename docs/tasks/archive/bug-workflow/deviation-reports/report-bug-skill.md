## Deviation report — report-bug-skill

Implementation reviewed: commit `939f810` on `slice/report-bug-skill`
(diff `task/bug-workflow..slice/report-bug-skill`: `skills/report-bug/SKILL.md`
new, `package.json`, `tests/skills.test.ts`, `.gitignore`).
Full suite independently re-run: 154/154 green; working tree clean.

### API surface changes

1. **Manifest skill count (spec stale, implementation correct)**
   - **Planned:** slice doc + arch spec: "manifest test expects 6 skills".
   - **Actual:** test expects 7 (`task-overview`, `onboard-workflow`,
     `refine-idea`, `create-task`, `implement-task`, `finalize-task` +
     `report-bug`).
   - **Impact:** none on dependent slices — the spec's count was a stale
     codebase claim (baseline was already 6 after refine-idea was
     registered in `b716fe3`; arch spec was drafted against a mental
     baseline of 5). Slice 2 adds no skill, so 7 remains correct.

2. **Promoted-task frontmatter contract is under-specified in the skill**
   - **Planned (contract):** promotion writes task frontmatter
     `type: bug` + `bug: <slug>`, and the task must be *conforming*
     (implement-task requires `slices:` list in task.md).
   - **Actual:** SKILL.md §5 lists frontmatter as "`type: bug`,
     `bug: <bug-slug>`, title, status, dates" — omits `kind: task`,
     `slug`, `slices:`, `description`.
   - **Impact:** LOW/MODERATE — the written slice file is mentioned, but
     a literal reading could produce a task.md missing `slices:`,
     breaking implement-task's Step 0 prerequisite for bug tasks
     (this is slice 2's downstream consumer). No API change vs spec;
     the spec contract is present but incompletely enumerated.
     Recommend tightening prose in the coherence refactor.

### Abstraction usage

- Used/was specified: **yes.** Extended `tests/skills.test.ts` via the
  existing `SKILL_FILES`/helpers pattern (no new test files); no `src/`
  changes; no `agents/` changes; `skills/report-bug/resources/` not
  created (correctly left for the follow-up).

### Out-of-scope changes

- **Added:** `.gitignore` entry `.pi-subagents/`. Not in acceptance
  criteria. Harmless and useful (keeps runtime artifacts untracked) —
  recommend keeping, noting here for transparency.
- Skill otherwise stays within scope; guardrails even encode the two
  test-plan edge cases (repro-schemas optional, dev-env.md missing →
  ask user).

### Acceptance-criteria divergence detail

| Criterion | Status |
|---|---|
| SKILL.md exists, name+description frontmatter, 5 flow steps | ✅ met |
| `package.json` registers `./skills/report-bug` | ✅ met |
| Prose states en-bloc capture, dev-env.md governance (incl. forbid path), repro.md, test rule, triage, conforming-slice promotion | ✅ met |
| tests/skills.test.ts: SKILL_FILES + report-bug; **manifest 6** | ⚠️ count is **7** (spec stale — see above) |
| Full suite green | ✅ 154/154 |

Minor prose-level observations (not blocking):
- Trivial path says "current branch / main" in the intro but
  "Commit directly to `main`" in step 5 — spec decided direct-to-main;
  drop the "current branch" hedge in coherence refactor.
- Bug-doc frontmatter includes `confirmed_by`, but §4 never instructs
  filling it on reproduction.
- Assumes `docs/bugs/` and `docs/bugs/archive/` exist (slice 4's
  onboarding creates them); first-bug edge on repos onboarded before
  that change would benefit from `mkdir -p`.

### Task doc update needed?

**Yes** — append to `docs/tasks/bug-workflow/task.md` ## Implementation notes:

> Slice 1 (report-bug-skill): manifest skill count is 7, not 6 —
> spec/slice-doc baseline claim was stale (refine-idea made 6 at
> baseline; +report-bug = 7). Skill promotion frontmatter should
> enumerate the full task schema (`kind`, `slug`, `slices:`, `type: bug`,
> `bug: <slug>`) — tighten in coherence refactor. `.gitignore` gained
> `.pi-subagents/` (out-of-scope but kept).

### User attention needed?

**No.** Scope unchanged; interface contract for slices 2–4 (bug-doc
path + status lifecycle, `type: bug` + `bug: <slug>`, repro.md
placement, `/skill:report-bug`) is implemented exactly as spec'd. The
only true deviation is a stale spec claim that the implementation
resolved correctly.
