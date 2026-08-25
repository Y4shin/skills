# Architecture spec — build-diagnosing-bugs-skill

Source decision: `bug-workflow-enhancements` (settled grilling, Q1–Q6). Builds
a model-invoked `/diagnosing-bugs` skill (mp-skills' 6-phase debugging
discipline, adapted) and wires it into the bug pipeline so the tdd-worker
gets the feedback-loop / hypothesis / instrumentation discipline on every
`type: bug` task.

Current manifest length is **9** (the doctor skill landed). This task bumps it
to **10**.

## Slice 1 — diagnosing-bugs-skill-content (author the skill + register)

### Exports

- `skills/diagnosing-bugs/SKILL.md` — model-invoked skill (no
  `disable-model-invocation`). Frontmatter `name: diagnosing-bugs`;
  `description` fires on "diagnose", "debug this", "broken", "throwing",
  "failing", "slow", "performance regression". Body adapted from mp-skills
  (NOT ported verbatim — our tdd-worker is a fresh-context agent with budgets;
  the skill guides via `skill:`, not as a standalone session; Phase 6 hands to
  wayfinder not to-spec/to-tickets). Sections:
  - **Redact** rule — redact every secret before showing commands/outputs;
    build loops against env vars; quote only signal-carrying lines.
  - **Phase 1 — Build a feedback loop (non-skippable).** "This is the skill."
    A tight, red-capable, deterministic, fast, agent-runnable pass/fail
    signal. The 10 ways to construct one (failing test, curl, CLI, headless
    browser, replay trace, throwaway harness, fuzz, bisect, differential,
    HITL bash). Tighten the loop. Non-deterministic bugs: raise the
    reproduction rate. When you genuinely cannot build a loop, stop and say
    so; do NOT proceed to hypothesise. Completion criterion: one red-capable
    command, already run, shown redacted. **Phase 1 is non-skippable.**
  - **Phase 2 — Reproduce + minimise.** Confirm the loop catches the user's
    exact symptom; shrink to the smallest scenario that still goes red.
  - **Phase 3 — Hypothesise.** 3–5 ranked falsifiable hypotheses (format: "If
    <X> is the cause, then <changing Y> will…"). Show the user before testing
    (cheap checkpoint, don't block if AFK).
  - **Phase 4 — Instrument.** One probe per Phase-3 prediction; change one
    variable at a time. Tool preference: debugger/REPL > targeted logs >
    never "log everything and grep". Tag debug logs `[DEBUG-xxxx]`.
  - **Phase 5 — Fix + regression test.** Write the regression test before the
    fix — only if a correct seam exists. If no correct seam, that's the
    finding → Phase 6. Turn the minimised repro into a failing test, watch it
    fail, apply the fix, watch it pass, re-run the Phase 1 loop.
  - **Phase 6 — Cleanup.** Remove `[DEBUG-]` instrumentation; delete throwaway
    prototypes; state the winning hypothesis. **No-correct-seam handoff:** if
    Phase 5 found no correct seam, record the finding (the architecture
    prevents locking the bug down) in `## Divergence from plan` /
    `uncertainty.md`, surfaced to the parent → wayfinder or
    `/improve-codebase-architecture`. Does NOT auto-spawn an architecture task.
  - **Skip rule:** Phases 2–6 are skippable with a recorded one-line
    justification in the worker's output (e.g. "Phase 2 skipped — repro is
    already minimal"). Phase 1 is non-skippable.
  - A note: this skill is delivered to the tdd-worker via `skill:` on bug
    tasks; it can also be invoked standalone.
- `package.json` — `pi.skills` gains `"./skills/diagnosing-bugs"` (length
  9 → 10), appended after `"./skills/task-workflow-doctor"`.
- `tests/skills.test.ts` — `SKILL_FILES` adds
  `"skills/diagnosing-bugs/SKILL.md"`; the `pi.skills.length` assertion
  changes from `9` to `10`; add xref assertions:
  - the SKILL.md contains `Phase 1` and `non-skippable`.
  - the SKILL.md contains the skip-with-reason rule (the words `skippable`
    and `justified` or `recorded`).

### Existing abstractions to use

- The `SKILL_FILES` + `pi.skills.length` assertion pattern in
  `tests/skills.test.ts` — proven by `/tdd`, `/code-review`, and
  `/task-workflow-doctor`.
- The skill-prose structure conventions (frontmatter `name`+`description`;
  `# /<name>` H1; Process sections).
- mp-skills' `skills/engineering/diagnosing-bugs/SKILL.md` as the source to
  adapt from (at `~/Projects/mp-skills/skills/engineering/diagnosing-bugs/`).

### Do NOT reimplement

- Do not port mp-skills verbatim. Adapt to our pipeline (delivered via
  `skill:` to the tdd-worker; hands to wayfinder; not a standalone session).
- Do not wire bug.md or touch agents/tdd-worker.md (slice 2 owns wiring).
- Do not make the phases mandatory (Phase 1 non-skippable; 2–6 skippable with
  reason).
- Do not auto-spawn architecture tasks from Phase 6.
- Avoid `chain.json`, `subagent_supervisor`, `contact_supervisor` patterns
  (existing structure tests assert their absence for every skill file).

### Interface contract (for slice 2)

Slice 2 adds xref assertions and wires the skill. Therefore slice 1's
`skills/diagnosing-bugs/SKILL.md` MUST contain the literal strings slice 2's
tests will look for — but slice 2's tests assert `bug.md` and `tdd-worker.md`
reference `diagnosing-bugs`, not the SKILL.md content. Slice 1's own xref
assertions (added in slice 1) assert the SKILL.md contains `Phase 1` +
`non-skippable` + the skip rule. These must land in slice 1.

The skill name `diagnosing-bugs` in the frontmatter is load-bearing: slice 2
registers `skill: "diagnosing-bugs"` in bug.md and the package manifest entry
`./skills/diagnosing-bugs` must resolve to this skill.

## Slice 2 — diagnosing-bugs-pipeline-wiring (wire bug.md + tdd-worker + xref tests)

### Exports

- `skills/implement-task/resources/bug.md` — the tdd-worker chain step gains
  `skill: "diagnosing-bugs"` on the `subagent({...})` call (alongside the
  existing `skill: "tdd"` — note: the current bug.md passes a single `skill:
  "tdd"`; this slice changes it so the bug dispatch passes
  `diagnosing-bugs`). The explicit instruction line is added to the dispatch
  `task:` prompt: "You are on a `type: bug` task; consult the
  `/diagnosing-bugs` skill for the 6-phase debugging discipline (Phase 1
  non-skippable; others skippable with a recorded reason)." All existing
  agent references (tdd-worker, slice-verifier, land-worker, code-reviewer)
  and the failure toolbelt ("split" before "retry", "parent never
  implements") and the red-first test rule stay intact.
- `agents/tdd-worker.md` — add a path-agnostic line near the existing `/tdd`
  consult line in the Constraints section: "If the dispatch passes
  `/diagnosing-bugs`, you are on a bug task — follow it for the 6-phase
  debugging discipline." Frontmatter unchanged.
- `tests/skills.test.ts` — add xref assertions:
  - `bug.md` references `diagnosing-bugs` (the skill is wired).
  - `tdd-worker.md` references `diagnosing-bugs` (the path-agnostic line).

### Existing abstractions to use

- The `skill:` subagent param (proven by `/tdd` and `/code-review` wiring).
  Note: the current bug.md `subagent` call passes `skill: "tdd"` as a single
  string. The tdd-worker agent definition declares `skill: tdd` is consulted
  via the `skill:` param. Slice 2 makes the bug dispatch pass
  `diagnosing-bugs` — keep the existing `skill: "tdd"` if the chain currently
  passes it, and add `diagnosing-bugs` per the tdd-worker's existing
  `skill:`-on-subagent pattern. (Inspect bug.md's current `subagent` call:
  it passes `skill: "tdd"`. The implement-task feature resource passes
  `skill: "tdd"` too. Determine whether to pass both or replace — the task
  doc says "add `skill: "diagnosing-bugs"` alongside the existing
  `skill: "tdd"`". If the `subagent` `skill:` field accepts only one value,
  the bug dispatch should pass `diagnosing-bugs` (the bug-specific skill)
  since the tdd-worker still consults `/tdd` via its agent Constraints line
  regardless. Prefer: pass `skill: "diagnosing-bugs"` on bug tasks, keeping
  the tdd-worker's `/tdd` consult line as the always-on TDD reference. The
  key contract is that bug.md references `diagnosing-bugs` and the
  instruction line is present.)
- The `skill cross-references` describe block + `readFile`/`expect.toContain`
  pattern.
- The existing bug.md xref assertions (tdd-worker, slice-verifier, land-worker,
  code-reviewer, red-first rule, "split" before "retry" + "parent never
  implements") — keep them green.

### Do NOT reimplement

- Do not change the 6-phase content in the SKILL.md (slice 1 owns it).
- Do not change `feature.md` (it does not pass `diagnosing-bugs`).
- Do not sniff frontmatter or infer bug-ness from prompt wording — the
  bug-signal is the skill's *presence* (bug.md passes it; feature.md doesn't)
  + the explicit instruction line.
- Do not change `agents/tdd-worker.md` frontmatter.

### Interface contract

No downstream slice. Contract is with the test suite: `npm test -- tests/skills.test.ts`
green; all pre-existing assertions stay green; the two new xref assertions
pass.

## Cross-slice notes

- **Dependency levels:** Level 1 = `diagnosing-bugs-skill-content`; Level 2 =
  `diagnosing-bugs-pipeline-wiring` (blocked by slice 1). Sequential, single
  shared repo cwd.
- **Skill name is load-bearing:** `diagnosing-bugs` appears in the
  frontmatter (slice 1), the package manifest entry (slice 1), the bug.md
  `skill:` param + instruction line (slice 2), the tdd-worker path-agnostic
  line (slice 2), and the xref assertions (both slices). Keep it stable.
- **Test surface:** `npm test -- tests/skills.test.ts` is the gate for both
  slices. The pre-existing `session.test.ts` failures (16) reproduce on main
  and are not a regression — out of scope.
- **Single source of truth for the 6 phases:** `skills/diagnosing-bugs/SKILL.md`
  (slice 1). Slice 2 only references the skill name; it does not restate the
  phases.
- **`skill:` param mechanics:** inspect bug.md's current `subagent` call —
  it passes `skill: "tdd"`. Slice 2 changes the bug dispatch to pass
  `diagnosing-bugs` (the bug-specific discipline), since the tdd-worker
  always consults `/tdd` via its agent Constraints line regardless. The
  task doc's "alongside the existing `skill: "tdd"`" phrasing should be
  read as "the bug path now also gets the diagnosing-bugs discipline"; if
  the `skill:` field is single-valued, `diagnosing-bugs` is the bug-path
  value (the tdd-worker still gets TDD guidance from its agent definition).
  Confirm the `skill:` field's arity at implementation time and choose the
  option that keeps both xref assertions green and the instruction line
  present.
