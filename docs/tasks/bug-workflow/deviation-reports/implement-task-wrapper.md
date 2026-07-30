## Deviation report — implement-task-wrapper

Reviewed: `git diff task/bug-workflow..slice/implement-task-wrapper`
(SKILL.md −254 lines, +resources/feature.md 223, +resources/bug.md 90,
tests/skills.test.ts +60). Full suite: 160/160 green.

### API surface changes

**Planned (slice doc + arch spec):**
- Wrapper `SKILL.md`: `task_get type`, absent → `feature`, dispatch to
  resources; all execution detail in the resource files.
- `resources/feature.md`: current implement-task body **moved, mostly
  unchanged** (acceptance criterion: "preserves current behavior").
- `resources/bug.md`: lean chain, spec = bug doc + repro.md + slice doc
  (repro.md location after promotion: next to `task.md`, per slice-1
  contract and arch spec).

**Actual:**
- Wrapper: as planned. ✅
- `resources/bug.md`: as planned, EXCEPT the repro.md path — Step 0
  reads `docs/bugs/${bugSlug}/repro.md` (lines 7, 14). That is the
  *pre-promotion* location; the promotion contract (slice-1 skill:
  "Move `repro.md` … next to `task.md`"; arch spec slice 2) puts it at
  `docs/tasks/<taskSlug>/repro.md`. Also inconsistent on its face:
  `docs/bugs/<slug>.md` is a file, so `docs/bugs/<slug>/repro.md`
  implies a same-named directory. ❌
- `resources/feature.md`: moved, but **not** "mostly unchanged" — the
  old SKILL.md's chain-result processing block (old lines 176–216) was
  dropped. What was lost beyond the intended retry-strategy
  replacement:
  1. **uncertainty.md routing** (worker writes `.work/uncertainty.md`
     → parent asks user → deletes file → re-runs chain with
     resolution): gone, not replaced by the failure toolbelt.
  2. **Success-path parent bookkeeping**: `task_set <slice-path>
     status done` + `task_state_set task <taskSlug>` after landing:
     gone (`task_set` survives inside the land-worker prompt;
     `task_state_set task` survives nowhere).
  3. **After-each-level review**: read deviation reports for
     user-attention flags, update the arch spec for pending slices,
     the submit_workflow_feedback nuance, and the non-blocking
     ui-noter mention: gone.
  
  The retry/escalation *strategy* parts of that block were
  intentionally superseded by the failure toolbelt (split-first →
  retry +50% → escalate) — that replacement is per spec. Items 1–3 are
  not failure strategy; their removal is unapproved behavior loss.

**Impact on dependent slices:**
- Slice 3 (finalize-bug-closure), slice 4 (onboarding/routing): no
  impact — the wrapper dispatch contract they rely on is intact.
- Runtime consumers of bug.md: would look for repro.md in the wrong
  place. Should be fixed before any real bug task runs (coherence
  refactor candidate, or a direct one-line fix).
- Feature-path behavior regression only surfaces when the new
  implement-task is next used (uncertainty flow, per-level review).

### Abstraction usage

- Used/was specified: **yes.** `tests/skills.test.ts` helpers reused,
  no new test files, no `src/` or `agents/` changes, chain agent names
  unchanged, xref tests correctly retargeted (assertions for
  task_dependency_levels, tdd-worker, slice-verifier, land-worker,
  deviation-reporter now read `resources/feature.md`), new bug.md
  assertions incl. red-first rule and split-before-retry ordering.

### Out-of-scope changes

- Scope *reduction* in feature.md (the three dropped behaviors above)
  — reduction rather than addition, but unapproved.
- bug.md: uncertainty routing absent although the slice doc says
  "Retry/uncertainty routing: same subagent-dispatch discipline as
  feature.md" (moot while feature.md lacks it too — restore together).
- bug.md Step 0 hardcodes `const slice = task_slices(taskSlug)[0]`
  (single-slice assumption). Tension with its own split toolbelt,
  which creates Na/Nb/Nc sub-slices — after a split, `[0]` is
  arbitrarily the first. Low impact; by design bug tasks start with
  one slice.
- Observation (NOT this slice's deviation; inherited prose): both
  resources' chain pseudocode still specifies
  `turnBudget: { maxTurns, graceTurns }`, which the actual subagent
  runtime rejected during slice-1 dispatch ("not allowed on chain
  steps"). Doc/runtime mismatch worth cleaning up globally.

### Acceptance criteria divergence

| Criterion | Status |
|---|---|
| Wrapper reads type, dispatches, both resources exist | ✅ |
| feature.md preserves current behavior | ❌ (3 dropped behaviors) |
| bug.md implements the lean chain | ⚠️ (repro.md path wrong) |
| Failure toolbelt in both, split-first order | ✅ |
| Cross-ref tests retargeted + new bug.md assertions | ✅ |
| Full test suite green | ✅ (160/160) |

### Task doc update needed?

**Yes** — append to `## Implementation notes`:
- bug.md repro.md path corrected to `docs/tasks/<taskSlug>/repro.md`
  (or flag as outstanding coherence-refactor item).
- Known doc/runtime mismatch: `turnBudget` unsupported on chain steps;
  prose in both resources is stale.
- feature.md uncertainty routing + after-level review: restored (or
  consciously dropped with user sign-off).

### User attention needed?

**Yes** — two items:
1. feature.md silently lost uncertainty routing, `task_state_set
   task`, and the per-level deviation-report review. Restore or
   ratify the removal (I recommend restore — none of it was covered
   by the approved toolbelt redesign).
2. bug.md's repro.md path contradicts the slice-1 promotion contract;
   one-line fix to `docs/tasks/<taskSlug>/repro.md`.
