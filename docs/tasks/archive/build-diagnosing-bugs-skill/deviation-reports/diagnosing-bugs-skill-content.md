# Deviation report — diagnosing-bugs-skill-content

**Result: No deviations. Clean match to spec.**

## API surface changes

- **Planned:** `skills/diagnosing-bugs/SKILL.md` (model-invoked, 6-phase discipline, adapted from mp-skills), `package.json` `pi.skills` gains `./skills/diagnosing-bugs` (length 9→10), `tests/skills.test.ts` adds `SKILL_FILES` entry + length assertion + xref assertions.
- **Actual:** All three delivered exactly as planned. No API surface changes.
- **Impact:** None on dependent slices. Slice 2 can wire `skill: "diagnosing-bugs"` and assert `bug.md`/`tdd-worker.md` reference it.

## Abstraction usage

- Used/was specified: **Yes.** The `SKILL_FILES` + `pi.skills.length` assertion pattern was used exactly as specified (proven by `/tdd`, `/code-review`, `/task-workflow-doctor`). The `skill cross-references` describe block + `readFile`/`expect.toContain` pattern was used for the two new xref assertions. mp-skills' SKILL.md was adapted (not ported verbatim) — no mp-skills-only references (`to-spec`, `to-tickets`, standalone-session framing) appear; Phase 6 hands to `wayfinder` / `/improve-codebase-architecture` as specified.

## Out-of-scope changes

- **`docs/tasks/state.yaml` committed** — The slice branch inherited a pre-existing unstaged change (`task: None` → `task: build-diagnosing-bugs-skill`) from the parent task branch and `git add -A` pulled it into the slice commit. This is a bookkeeping artifact, not a spec deviation — the TDD worker flagged it. The land-worker should restore `state.yaml` during landing (the parent orchestrator owns it).
- No other out-of-scope changes. Slice 1 did not touch `bug.md` or `agents/tdd-worker.md` (slice 2 owns wiring), did not change `feature.md`, and did not edit the SKILL.md content beyond what slice 1 specifies.

## Contract verification (independently re-verified)

| Contract | Status |
|---|---|
| Frontmatter `name: diagnosing-bugs` | ✓ |
| Description fires on all 7 required keywords (diagnose, debug this, broken, throwing, failing, slow, performance regression) | ✓ — all present |
| No `disable-model-invocation` in frontmatter | ✓ — absent (model-invoked) |
| All 6 phases present (`## Phase 1` through `## Phase 6`) | ✓ — 6 phase headings |
| Phase 1 marked non-skippable (literal "Phase 1" + "non-skippable") | ✓ — line 11 ("Phase 1 is non-skippable") + line 19 ("## Phase 1 — Build a feedback loop (non-skippable)") |
| Skip rule: "skippable" + "recorded"/"justified" for Phases 2–6 | ✓ — line 11 ("skipped with a recorded one-line justification") |
| Redact rule | ✓ — lines 15–17 ("Redact every secret", `<REDACTED>`, build loops against env vars, signal-carrying lines) |
| 10 feedback-loop construction ways | ✓ — all 10 present (failing test, curl, CLI, headless browser, replay trace, throwaway harness, fuzz, bisect, differential, HITL bash) |
| Phase 1 completion criterion (one red-capable command, already run, shown redacted) | ✓ — lines 58–66 (four criteria: red-capable, deterministic, fast, agent-runnable) |
| Phase 3: 3–5 ranked falsifiable hypotheses + show user + AFK don't block | ✓ — "3–5 ranked, falsifiable hypotheses", format quoted, "Show the ranked list to the user before testing", "Do not block if the user is AFK" |
| Phase 4: one probe per prediction, one variable at a time, tool pref (debugger > targeted logs > never "log everything and grep"), `[DEBUG-]` tags | ✓ — all present |
| Phase 4: performance regression branch (baseline, measure first) | ✓ — "Performance regressions" paragraph |
| Phase 5: regression test before fix, only if correct seam; no-correct-seam → Phase 6 | ✓ |
| Phase 6: cleanup items (remove DEBUG, delete prototypes, state winning hypothesis) | ✓ — 5 checklist items |
| Phase 6: no-correct-seam handoff to wayfinder / `/improve-codebase-architecture`, does NOT auto-spawn | ✓ — "route to **wayfinder** or **`/improve-codebase-architecture`**", "Do **not** auto-spawn an architecture task" |
| Note: delivered via `skill:` on bug tasks; can be standalone | ✓ — line 9 |
| `package.json` `pi.skills` length 10, `./skills/diagnosing-bugs` appended after `./skills/task-workflow-doctor` | ✓ — independently verified via Node |
| `tests/skills.test.ts` `SKILL_FILES` entry | ✓ — line 87 |
| `pi.skills.length` assertion `toBe(10)` | ✓ — line 131 |
| xref: SKILL.md contains "Phase 1" + "non-skippable" | ✓ — test at lines 380–383 |
| xref: SKILL.md contains "skippable" + `(/justified|recorded/)` | ✓ — test at lines 385–388 |
| No `chain.json` / `subagent_supervisor` / `contact_supervisor` in SKILL.md | ✓ — grep exit 1 (no matches) |
| No mp-skills-only references (`to-spec`, `to-tickets`, standalone-session framing) | ✓ — grep exit 1 (no matches) |
| `npm test -- tests/skills.test.ts` green | ✓ — 112/112 independently re-run |

## Task doc update needed?

No. The task doc's `## Implementation notes` does not need updating for this slice — the land-worker will append the standard landing note.

## User attention needed?

No. The `docs/tasks/state.yaml` inclusion in the slice commit is a bookkeeping artifact that the land-worker handles during landing; no scope or API surface changed.
