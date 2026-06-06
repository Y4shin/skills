---
name: analyse-issue
description: Fetch a slice issue (#n), present a structured summary, then run a focused grilling session to decide the test strategy before any code. Appends a confirmed Test plan to the issue's committed slice doc and hands off to /prd-workflow:implement-issue. Use when starting work on an issue, or when the user says "analyse"/"start on" #n. Don't use it to write code or open a PR (use implement-issue once the test plan is agreed). Provider-aware (gh/fgj/local).
allowed-tools: Bash(python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz":*), Bash(python3 ${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz:*)
---

# Analyse Issue

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" workflow-gate`

Phase 1: understand the issue, then challenge the developer to decide the right test
strategy *before* writing a line of code. The fastest honest feedback loop is the goal — a
slice must be testable, not just "covered".

Detected forge: **!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge git_type`**.
Per-provider commands come from `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge <key>`. The slice-doc/lifecycle
reference is injected below.

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" reference`

`prd_tool.pyz` is the bundled helper that reads this frontmatter — invoke it as
`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" <subcommand>` (`--help` for the full
surface). The current planning-tree inventory is injected here:

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" list`

The project profile (architecture layers, test infrastructure, orientation docs) is injected
below when available — its "Test infrastructure" section is the source for test types, file
patterns, and run commands used in Steps 2–3. If empty, explore the codebase to identify the
available test frameworks and their run commands:

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" profile`

## Step 1 — Fetch + present

Fetch the issue (form for the detected provider):

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge cmd_get_issue`

Read its `kind:` label and `Part of #<prd>` to locate the PRD and slice doc. The PRD issue # in
`Part of #<prd>` maps to its dir, and `slices` lists this PRD's surviving slice docs (the one for
`#<n>` is among them):

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" resolve <prd#> --kind prd   # → docs/prd/<slug>/prd.md
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" slices <slug>               # → the <n>-<slug>.md path
```

Read both the `prd.md` and `docs/prd/<slug>/slices/<n>-<slug>.md` in full. Load conventions
from the project profile's "Orientation docs"; if no profile exists, find and read the
relevant design/convention docs in the codebase yourself.

Present:

```
Issue:   #<n>
Title:   <title>
Kind:    feature | capability        Mode: hitl | afk
PRD:     docs/prd/<slug>/prd.md

What needs to be built:
<2–4 sentences>

Touches:
- feature    → the architecture layers it cuts through (per the profile)
- capability → API surface: <…> · first consumer: <…>
```

## Step 2 — Grill on test strategy (one question at a time)

Give your recommended answer + reasoning first, then ask. Work through in order; skip only
if a prior answer settles it:

1. "Which layers / surface does this slice touch end-to-end? (feature: list layers;
   capability: name the API surface + first consumer.)"
2. "What's the simplest test that gives honest confidence this works in *production*, not
   just in isolation?"
3. "If you run that test every few minutes while coding, is the feedback fast enough?"
4. "Walk me through the two most likely failure modes — does the test type catch both?"
5. "Do we need a real dependency (real DB, real HTTP, a real browser) here, or can it be
   faked? Is that cost worth it for this slice?"
6. "Is any part already tested elsewhere? What's the exact gap we're filling?"
7. *(ad-hoc)* If the slice raises a concern the six questions above didn't cover — an
   unusual constraint, a subtle interaction, a risk specific to this slice — ask about it.
   Stay within test strategy; don't expand into design or implementation.

**Test-type vocabulary:** use the test types, file patterns, and run commands from the
project profile's "Test infrastructure" section — pick the one giving the most confidence per
minute. If no profile exists, explore the codebase to identify the available test frameworks
(unit, integration, end-to-end) and their run commands, and use those. `none` is a valid
choice only if the slice is truly trivial or fully covered elsewhere.

**Push back when:** dev picks an isolated unit test but the slice crosses a real boundary
(DB/HTTP/UI) (→ an integration/e2e test is more honest); dev picks a heavyweight e2e test but
the logic is pure (→ a unit test is faster); dev says "no test" (→ drill in, accept only if
trivial/covered); dev proposes several types (→ keep the one with most confidence per minute
unless they test genuinely different things).

## Step 3 — Persist the test plan to the slice doc

Once confirmed, **set `analysed: true`** in the slice doc's frontmatter and **append** a
`## Test plan` section to `docs/prd/<slug>/slices/<n>-<slug>.md`:

```markdown
## Test plan

**Test type:** <one of the types from the project profile's "Test infrastructure" (or those you found in the codebase); `none` only if trivial/covered>
**Reasoning:** <one sentence>

### Assertions
- <key assertion 1>
- <key assertion 2>
- <error cases: status codes or error variants, if applicable>

### Test file
`<path following the profile's file pattern for the chosen test type>`

### Run command
`<the run command the profile maps to that test type>`
```

Commit the slice doc.
Confirm the path to the developer.

## Hand-off

Invoke `/prd-workflow:implement-issue <n>`. The spec + test plan live in
`docs/prd/<slug>/slices/<n>-<slug>.md`.

## Error handling

- If `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" forge` prints `NOT_A_GIT_REPO`, the
  directory isn't a git repo — tell the user to run `git init` first and stop.
- If it prints `UNKNOWN_FORGE`, the repo has a remote this workflow doesn't recognise (not
  GitHub/Forgejo) — surface it and stop; don't invent CLI calls. A repo with no remote resolves
  to the built-in `local` tracker — that's expected, not an error; it uses the same branch
  workflow (no remotes/PRs) and drives `prd_tool tracker` for issues.
- If `cmd_get_issue` fails (auth, wrong number), tell the user to authenticate or recheck `#n`; stop.
- If the slice doc `docs/prd/<slug>/slices/<n>-<slug>.md` is missing, the issue wasn't produced by
  this workflow — confirm the PRD/slug with the user before appending a test plan.

## Constraints

- **Spec-first** — assertions derive from acceptance criteria, never from an
  implementation.
- Don't start implementing here.
