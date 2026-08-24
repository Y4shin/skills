# Architecture spec — build-code-review-skill

Source decision: `code-review-evaluation` (settled grilling, Q1–Q7). Builds a
model-invoked `/code-review` skill (two-axis: Standards + Spec), a
`code-reviewer` fanout agent, extends our `get_guidelines` tool, and wires the
review into implement-task's feature and bug paths.

## Slice 1 — code-review-skill-content (author the skill + register)

### Exports

- `skills/code-review/SKILL.md` — model-invoked skill; two-axis (Standards +
  Spec) parallel review process, no-single-winner aggregation, the fanout
  guard, spec-source per task type (feature: task doc + arch spec; bug: bug
  doc + repro), link to `smells.md`.
- `skills/code-review/smells.md` — the 12 Fowler smells (what it is → how to
  fix).
- `package.json` `pi.skills` gains `"./skills/code-review"` (length 7 → 8).
- `tests/skills.test.ts` — `SKILL_FILES` adds `"skills/code-review/SKILL.md"`;
  `pi.skills.length` assertion 7 → 8.

### Existing abstractions to use

- `SKILL_FILES` + `pi.skills.length` assertion pattern in
  `tests/skills.test.ts` (the structure-test seam — proven by the `/tdd` skill
  just landed).
- mp-skills' `/code-review` SKILL.md + docs as the source to adapt from (not
  port verbatim — our spec source differs per task type; review fires at
  implement-task not `/implement`; no `docs/agents/issue-tracker.md`).

### Do NOT reimplement

- Don't port mp-skills verbatim. Adapt to our pipeline.
- Don't create the agent or wire implement-task (slice 2) or touch
  `get_guidelines` (slice 3).
- Don't invent a parallel standards-discovery path.

### Interface contract (for slices 2 & 3)

Slice 2 wires `skill: "code-review"` and references the skill name — so
`name: code-review` frontmatter must exist and the skill must be registered.
Slice 3's `get_guidelines` baseline must match `smells.md` (single source of
truth: the canonical smell text lives in `smells.md`; slice 3
references/inlines the same list).

## Slice 2 — code-review-agent-and-dispatch (agent + implement-task wiring)

### Exports

- `agents/code-reviewer.md` — fanout agent (`tools: read, bash, get_guidelines,
  subagent`; `defaultContext: fresh`; `inheritProjectContext: true`); prompt
  spawns two read-only parallel axis reviewers (Standards: `read,bash,
  get_guidelines`; Spec: `read,bash`), aggregates side by side (never merged),
  carries the no-respawn guard.
- `skills/implement-task/resources/feature.md` — review dispatch before Step 3
  (coherence refactor); `subagent({ agent: "code-reviewer", skill:
  "code-review", ... })`, spec source = task doc + arch spec; advisory; Step 3
  uses findings.
- `skills/implement-task/resources/bug.md` — review dispatch after the single
  chain; spec source = bug doc + repro; advisory.
- `tests/skills.test.ts` — `AGENT_FILES` adds `"agents/code-reviewer.md"`;
  xref assertions: feature.md and bug.md reference `code-reviewer`.

### Existing abstractions to use

- The `skill:` subagent param (proven by `/tdd` wiring).
- The fanout-agent pattern (`tools: subagent` on a child — pi-subagents
  SKILL.md line 13, 207).
- The existing `agents/*.md` frontmatter conventions (structure tests assert
  `inheritProjectContext: true`, `defaultContext`, `tools`, `description`).
- The existing implement-task feature.md Step 3 (coherence refactor) — review
  feeds it, doesn't replace it.

### Do NOT reimplement

- Don't move refactor into /code-review (Step 3 keeps it).
- Don't add a Spec axis to deviation-reporter or Standards axis to
  slice-verifier.
- Don't make the review a gate (advisory).

### Interface contract

No downstream slice. Contract is with the test suite: all existing xref
assertions stay green; the new `code-reviewer` agent passes frontmatter
tests; feature.md/bug.md keep all existing agent refs + the failure toolbelt.

## Slice 3 — get-guidelines-standards-extension (extend our tool)

### Exports

- `src/pi.ts` — `discoverGuidelines` also discovers repo-root
  `AGENTS.md`/`CLAUDE.md`/`CONTEXT.md` + `docs/standards.md` (topic
  `standards`); `get_guidelines` appends the 12-smell baseline floor when no
  repo standards match a request (repo overrides → no baseline when matches
  exist); `list_guidelines` reports the baseline when in effect.
- `tests/guidelines.test.ts` (new) — unit tests for the extension using
  tmp-dir fixtures (stub/real `discoverGuidelines`).

### Existing abstractions to use

- The existing `discoverGuidelines`/`get_guidelines`/`list_guidelines` in
  `src/pi.ts` (lines 816–946) — extend in place.
- The `tests/gate-factory.test.ts` stub-`ExtensionAPI` pattern for testing
  the factory without a pi runtime (referenced in `docs/testing.md`).
- The canonical 12-smell text from `skills/code-review/smells.md` (slice 1)
  — single source of truth.

### Do NOT reimplement

- Don't invent a parallel standards-discovery path.
- Don't break the existing `before_agent_start` injection or
  `session_compact` reset.
- Don't change gate behavior (`get_guidelines` stays registered under
  `if (!gate.active)`).

### Interface contract

The `code-reviewer` agent (slice 2) and the Standards axis children call
`get_guidelines` and rely on it returning repo standards + the baseline floor.
Slice 3's contract: `get_guidelines({})` returns repo standards when present,
else the baseline; `get_guidelines({ topic: "standards" })` returns the
override files.

## Cross-slice notes

- **Dependency levels:** Level 1 = `code-review-skill-content`; Level 2 =
  `code-review-agent-and-dispatch` + `get-guidelines-standards-extension`
  (both blocked by slice 1). Level 2's two slices share the repo cwd and both
  edit `tests/skills.test.ts`, so they run sequentially within the level
  (slice 2 then slice 3 — slice 2 first since it adds the `code-reviewer`
  agent + xref tests that slice 3's tests must not break).
- **Single source of truth for smells:** `skills/code-review/smells.md`
  (slice 1) is canonical. Slice 3's `get_guidelines` baseline must match it
  — slice 3 should reference the same content (inline constant in `src/pi.ts`
  is acceptable but carries a duplication risk; note it).
- **Fanout guard everywhere:** the "do not re-invoke /code-review or spawn
  additional agents" guard appears in both the SKILL.md (slice 1) and the
  agent prompt (slice 2) — mp-skills' known 50+ agent bug.
- **Test surface:** `npm test -- tests/skills.test.ts` is the gate for slices
  1 & 2; `npm test` (incl. the new `tests/guidelines.test.ts`) for slice 3.
  The 16 pre-existing `session.test.ts` failures reproduce on main and are
  not a regression.
