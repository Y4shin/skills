# pi-subagents Improvements — Implementation Plan

Based on the phased analysis in `docs/pi-subagents-improvements.md`, with
assessments on priority and approach.

---

## Table of Contents

1. [What's Already Good](#whats-already-good)
2. [Phase 1 — Agent Frontmatter Hardening](#phase-1--agent-frontmatter-hardening)
3. [Phase 2 — Chain Step Metadata](#phase-2--chain-step-metadata)
4. [Phase 3 — Pipeline Slices Restructuring](#phase-3--pipeline-slices-restructuring)
5. [Phase 4 — Normalize contact_supervisor Reasons](#phase-4--normalize-contact_supervisor-reasons)
6. [Phase 5 — Extracted Chain Files](#phase-5--extracted-chain-files)
7. [Phase 6 — Dotted Names + Packaging](#phase-6--dotted-names--packaging)
8. [Phase 7 — File-Based Plan Review Extension](#phase-7--file-based-plan-review-extension)
9. [Priority Summary](#priority-summary)

---

## What's Already Good

Before diving into improvements, the current codebase gets these right:

| Practice | Status | Evidence |
|---|---|---|
| Async orchestration | ✅ | All chains use `async: true` |
| `wait()` in parent loop | ✅ | Consistent pattern across all skills |
| Single-writer thread | ✅ | No parallel writers |
| `{chain_dir}` for shared context | ✅ | Well-structured output paths |
| `acceptance: none` for planning | ✅ | Explicit reasons included |
| `contact_supervisor` escalation | ✅ | Two distinct reasons used |
| Narrow agent roles | ✅ | Each agent is laser-focused |

No changes needed for any of these.

---

## Phase 1 — Agent Frontmatter Hardening ✅

**Status:** Done. All 7 agent files have `defaultContext`, `timeoutMs`, `turnBudget`. Two agents have `fallbackModels`. TDD worker retry logic added to `implement-slice` and `pipeline-slices` parent loops.

**Verdict:** Should-do. Good defensive practice, low risk, low effort.

**Assessment:** The current agents are missing `defaultContext`, `timeoutMs`,
`turnBudget`, and `fallbackModels` — all first-class fields in pi-subagents.
None have failed in practice due to missing these, so this is insurance, not
a bug fix. The doc's note that `model: *(inherit)*` is fine and
`fallbackModels` is the more important guard is correct: if a provider goes
down mid-chain, a fallback keeps the pipeline running.

### Approach

Add `defaultContext`, `timeoutMs`, `turnBudget`, and `fallbackModels` (where
appropriate) to all 7 agent files. Leave `model` unset so agents inherit the
parent session model or `subagents.defaultModel`.

**Important constraint on limits:** Limits must not prematurely cut off work
or pressure the agent into skipping necessary steps.

- **`tdd-worker`:** Implementation can hit unforeseen issues (build tool
  quirks, test framework edge cases, subtle codebase interactions). The agent
  should have generous limits, but when it exhausts them, the parent chain
  must retry with learnings from the first attempt — not just fail the whole
  chain. The parent re-launches the tdd-worker with the prior attempt's output
  and explicit guidance on what went wrong.
- **`grill-agent`:** This agent *must* achieve shared understanding with the
  user before stopping. Artificially limiting its turns or time may pressure
  it into skipping questions it should have asked. Give it **no turn budget
  and no timeout** — it runs until the decision tree is exhausted. The only
  escape hatch is the parent cancelling the run if the user abandons the
  session.

### Reader/writer classification and defaults

| Agent | Type | `defaultContext` | `timeoutMs` | `turnBudget` | `fallbackModels` |
|---|---|---|---|---|---|
| `adhoc-refiner` | Writer (chain_dir only) | `fork` | 120_000 | maxTurns:10, graceTurns:2 | — |
| `approval-agent` | Writer (edits test plans) | `fresh` | 120_000 | maxTurns:10, graceTurns:2 | — |
| `grill-agent` | Reader (interview only) | `fresh` | *(unset — no limit)* | *(unset — no limit)* | — |
| `slice-verifier` | Reader (verify gate) | `fresh` | 120_000 | maxTurns:8, graceTurns:2 | `["anthropic/claude-haiku-4-5"]` |
| `task-summarizer` | Writer (changelog) | `fork` | 120_000 | maxTurns:10, graceTurns:2 | — |
| `tdd-worker` | Writer (code + tests) | `fork` | 600_000 | maxTurns:40, graceTurns:6 | `["anthropic/claude-sonnet-4"]` |
| `test-strategist` | Writer (test plans) | `fresh` | 120_000 | maxTurns:15, graceTurns:3 | — |

### Files to modify

- `agents/adhoc-refiner.md`
- `agents/approval-agent.md`
- `agents/grill-agent.md`
- `agents/slice-verifier.md`
- `agents/task-summarizer.md`
- `agents/tdd-worker.md`
- `agents/test-strategist.md`

### TDD worker retry mechanism

When `tdd-worker` exhausts its turn budget, the parent chain must not simply
fail. Instead:

1. Read the partial output from `{chain_dir}/tdd/result.md` — it contains what
   was completed and where the agent stopped.
2. Construct a continuation task that includes: the prior output, explicit
   instruction on what remains to be done, and any guidance derived from the
   first attempt's failure mode.
3. Re-launch `tdd-worker` with the continuation task and a fresh `turnBudget`.
4. This retry loop runs up to 2 additional attempts. If all attempts are
   exhausted, escalate to the user.

This logic lives in the parent skill (`implement-slice` and `pipeline-slices`),
not in the agent frontmatter. The agent frontmatter provides generous but
finite limits; the parent handles exhaustion gracefully.

### Steps

- 1.1 — Add `defaultContext`, `timeoutMs`, `turnBudget` to all agent files per the table above (grill-agent gets no limits)
- 1.2 — Add `fallbackModels` to `slice-verifier.md` and `tdd-worker.md`
- 1.3 — Add tdd-worker retry logic to `implement-slice` and `pipeline-slices` parent loops
- 1.4 — Verify: run `subagent({ action: "list" })` and `subagent({ action: "get", agent: "<name>" })` for each agent to confirm fields appear

---

## Phase 2 — Chain Step Metadata ✅

**Status:** Done. Added `as`, `phase`, `label` to every chain step across all 6 skills. Added `outputMode: "file-only"` to non-interview, non-approval steps. Added `timeoutMs`/`turnBudget` to the 5 skills that lacked them.

**Verdict:** Should-do. Genuine quality improvement for data flow and context
efficiency.

**Assessment:** The `as`/`{outputs.name}` pattern makes data flow explicit and
testable — when step 4 needs output from step 2 (not step 3), `{previous}`
silently gives you the wrong thing. `outputMode: "file-only"` reduces context
overhead since the parent already reads chain_dir files after completion.
`phase` and `label` are cosmetic but useful for async status displays. The
per-skill `timeoutMs`/`turnBudget` recommendations fill a real gap — currently
only `create-task` sets these.

### Approach

Add `phase`, `label`, `as`, and `outputMode` to every chain step across all 6
skills. Add `timeoutMs`/`turnBudget` to the 5 skills that currently lack them.

### Per-skill defaults

| Skill | `timeoutMs` | `turnBudget` | Notes |
|---|---|---|---|
| `create-task` | 600_000 (existing) | maxTurns:50, graceTurns:6 (existing) | Already done |
| `implement-slice` | 600_000 | maxTurns:60, graceTurns:8 | New |
| `pipeline-slices` | 600_000 per slice set | maxTurns:60, graceTurns:8 | Applied per-slice group after Phase 3 restructuring |
| `finalize-task` | 300_000 | maxTurns:30, graceTurns:5 | New |
| `revise-task` | 600_000 | maxTurns:50, graceTurns:6 | New |
| `adhoc-task` | 300_000 | maxTurns:30, graceTurns:5 | New |

### Phase names (consistent across all skills)

| Phase | When to use |
|---|---|
| `"Preparation"` | Pre-flight, setup, branch creation |
| `"Planning"` | Interview, analysis, strategy generation |
| `"Approval"` | Approval-agent steps |
| `"Implementation"` | TDD, worker implementation steps |
| `"Verification"` | Verify gate, lint, test runs |
| `"Divergence"` | Post-verify plan divergence check |
| `"Landing"` | Branch merge, archiving, state updates |
| `"Changelog"` | Summarizer steps |
| `"Cleanup"` | CI gate, knowledge harvesting |

### Files to modify

- `skills/create-task/SKILL.md`
- `skills/implement-slice/SKILL.md`
- `skills/pipeline-slices/SKILL.md`
- `skills/finalize-task/SKILL.md`
- `skills/revise-task/SKILL.md`
- `skills/adhoc-task/SKILL.md`

### Steps

- 2.1 — Add `as`, `phase`, `label` to every chain step in all 6 skills
- 2.2 — Replace `{previous}` references with `{outputs.name}` where a later step reads a specific earlier step's output
- 2.3 — Add `outputMode: "file-only"` to all non-interview, non-approval steps
- 2.4 — Add `timeoutMs` and `turnBudget` to the 5 skills currently missing them
- 2.5 — Verify: run each skill's chain in mock/dry-run mode and inspect `wait()` output for phase/label/as fields

---

## Phase 3 — Pipeline Slices Restructuring ✅

**Status:** Done. Replaced flat mega-chain with per-slice parent loop. Each slice reads from `implement-slice.chain.json` and runs as its own async subagent. State management moved to parent loop. Per-slice error handling with retry/skip/stop.

**Verdict:** Must-do. The highest-value change in the document — real
architectural improvement affecting reliability and debuggability.

**Assessment:** The current flat mega-chain has three real problems:

1. **Failure blast radius.** If slice 3 of 5 fails, the entire chain stops.
   Prior slices are already committed, but the parent has no clean way to
   retry, skip, or recover without inspecting `{chain_dir}` manually.
2. **No inter-slice observability.** The parent gets one `wait()` loop for the
   entire chain. It can't report progress or inspect results between slices.
3. **Resumability is accidental.** The current approach relies on filtering
   already-done slices via `task_slices`, but if the chain dies mid-slice,
   the setup/tdd/verify/land sequence is partially complete with no
   checkpointing.

The proposed per-slice parent loop fixes all three. It mirrors how
`implement-slice` already works — launch a single-slice chain, `wait()`,
handle results, launch the next — just in a `for` loop. The 5-step chain
for each slice (`implementSliceSteps()`) stays unchanged.

One trade-off: the parent skill becomes more imperative and longer because
state management (`task_set`, `task_state_set`) moves from the chain's land
step into the parent loop. This is worth it for the resilience gain.

### Approach

Replace the flat chain build:

```typescript
// Current: flat array of 5 × N steps
const allSteps = []
pendingSlices.forEach((slice, i) => {
  allSteps.push(...implementSliceSteps(slice, i, pendingSlices.length))
})
subagent({ async: true, chain: allSteps })
```

With a per-slice parent loop:

```typescript
// Proposed: per-slice loop
for (const [i, slice] of pendingSlices.entries()) {
  // Set state before launch
  task_set(slicePath, "status", "in-progress")
  task_state_set("active.slice", slice.slug)

  const chainRunId = subagent({
    async: true,
    chain: implementSliceSteps(slice, i, pendingSlices.length)
  })

  // Same wait + relay loop as implement-slice
  while (true) {
    await wait({ id: chainRunId })
    // ... relay interview_request and need_discussion ...
    const status = await subagent({ action: "status", id: chainRunId })
    if (status.state === "complete") break
    if (status.state === "failed") {
      // Handle failure: retry, skip, or stop
      break
    }
  }

  // Read land result and set completion state
  task_set(slicePath, "status", "done")
}
```

### Benefits

1. **Per-slice error handling** — failed slice doesn't kill the pipeline. The
   parent can retry, skip, or stop via `ask_user_question`.
2. **Per-slice progress reporting** — the parent can emit structured output
   after each slice lands.
3. **Clearer state management** — the parent updates task state *between*
   slices, not inside a chain step. State is visible in parent history.
4. **Observability** — each slice is its own async run with its own status.
5. **Resumability** — if interrupted mid-pipeline, re-running starts from the
   first non-done slice, and the parent loop naturally skips done slices.

### Step functions stay the same

The `implementSliceSteps()` function stays the same 5-step structure. Each step
gets `phase`, `label`, `as`, and `outputMode` from Phase 2. Only the
orchestration around it changes.

### State updates move to parent

The land step's state-update logic (`task_set status done`, `task_set
completed_at`, `task_state_set`) moves into the parent loop between slices.
This keeps state visible in the parent's history and makes resumption simpler.

### Files to modify

- `skills/pipeline-slices/SKILL.md`

### Steps

- 3.1 — Restructure `pipeline-slices/SKILL.md` to use per-slice parent loop instead of flat mega-chain
- 3.2 — Move state-update logic from the land step into the parent loop
- 3.3 — Add per-slice error handling with retry/skip/stop options via `ask_user_question`
- 3.4 — Verify: run `pipeline-slices` on a task with 2–3 slices, confirm per-slice async runs, error handling, and resumability

---

## Phase 4 — Normalize contact_supervisor Reasons ✅

**Status:** Done. Changed `need_discussion` to `need_decision` across both skills (7 occurrences). Aligns with documented pi-subagents API.

**Assessment:** `need_discussion` is not a documented reason in the
pi-subagents API. The README lists `need_decision`, `interview_request`, and
`progress_update` as the standard reasons. Using `need_decision` aligns with
the documented API and future-proofs against changes to the intercom channel.

However, the proposal to replace dynamically-generated `options` arrays with
static ones in the parent loop is a regression. The divergence-checker
currently tailors options to the specific situation (e.g., "Update
billing-integration's test plan" vs generic "Update slice docs"). The better
approach: use `need_decision` as the reason but still pass structured data
(via the message field or a custom field) that the parent can render into
dynamic `ask_user_question` options.

### Approach

**Child side** — change from `reason: "need_discussion"` with `JSON.stringify()`
to `reason: "need_decision"` with a markdown-formatted message:

```typescript
// Before
contact_supervisor({
  reason: "need_discussion",
  message: JSON.stringify({ summary, affectedSlices, recommendation, options })
})

// After
contact_supervisor({
  reason: "need_decision",
  message: `## Plan divergence detected

**Summary:** ${summary}

**Affected slices:** ${affectedSlices}

**Recommendation:** ${recommendation}

**Options:**
${options.map((opt, i) => `${i + 1}. **${opt.label}** — ${opt.description}`).join("\n")}
`
})
```

**Parent side** — change from `request.reason === "need_discussion"` to
`request.reason === "need_decision"`. Parse dynamic options from the message
text to build `ask_user_question` options.

### Files to modify

- `skills/implement-slice/SKILL.md`
- `skills/pipeline-slices/SKILL.md`

### Steps

- 4.1 — Update the divergence-check worker's `contact_supervisor` call to use `reason: "need_decision"`
- 4.2 — Update both parent loops (`implement-slice`, `pipeline-slices`) to handle `need_decision` instead of `need_discussion`
- 4.3 — Preserve dynamic options by extracting them from the message text or passing them alongside
- 4.4 — Verify: trigger a divergence in `implement-slice`, confirm `need_decision` fires and parent loop handles it correctly with dynamic options

---

## Phase 5 — Extracted Chain Files ✅

**Status:** Done. Created `chains/` directory with 3 chain JSON files. Added `pi.subagents.chains` to package.json. Updated 3 skills to read chain files with variable substitution.

**Verdict:** Should-do. Chain files as the enforceable source of truth;
skills as thin parameterization wrappers.

**Revised assessment:** The original criticism (duplicating prompts creates a
maintenance burden) is valid only if chain files are a *copy* of what's in the
skills. The better architecture is the reverse: chain files are the *source of
truth* for chain structure and step prompts. Skills become thin wrappers that
read the chain file, substitute runtime variables (task slug, slice slug,
etc.), and launch it.

This gives:
- **Enforceable contracts** — chain structure lives in a standalone, diffable
  file.
- **Reusability** — users can run `/run-chain skills.implement-slice --
  task=my-task slice=my-slice` directly.
- **Single source of truth** — chain structure is defined once, not embedded
  in SKILL.md prose.

### Approach

Create `.chain.json` files in a `chains/` directory for the stable workflows.
Each file defines the full chain structure with step prompts. Runtime
variables (task slug, slice slug, chain_dir paths) are expressed as template
placeholders (`{taskSlug}`, `{sliceSlug}`, `{taskPath}`, `{slicePath}`).

The SKILL.md files become orchestrators: they read the chain file, substitute
variables, add runtime context (task_profile output, task_reference output),
and pass the result to `subagent({ chain: [...] })`.

### Chains to extract

| Chain file | Stability | Variables |
|---|---|---|
| `chains/create-task.chain.json` | Fully deterministic | `{task_context}` (profile + reference injected at launch) |
| `chains/implement-slice.chain.json` | Fully deterministic | `{taskSlug}`, `{sliceSlug}`, `{slicePath}`, `{taskPath}` |
| `chains/finalize-task.chain.json` | Fully deterministic | `{taskSlug}` |

`pipeline-slices` doesn't get its own chain file — after Phase 3 it becomes a
parent loop that calls `implement-slice`'s chain once per slice.
`revise-task` dynamically composes its chain based on what needs revision, so
it stays inline. `adhoc-task` is a simple 3-step chain that can optionally be
extracted.

### How skills invoke chain files

```typescript
// SKILL.md reads the chain file, substitutes variables, launches
const chainDef = JSON.parse(bash(`cat chains/implement-slice.chain.json`))

// Substitute runtime variables into every step's task field
const steps = chainDef.steps.map(step => ({
  ...step,
  task: step.task
    .replaceAll("{taskSlug}", taskSlug)
    .replaceAll("{sliceSlug}", sliceSlug)
    .replaceAll("{slicePath}", slicePath)
    .replaceAll("{taskPath}", taskPath)
}))

// Inject runtime context (profile, reference) into relevant steps
steps[0].task = steps[0].task.replace("{task_context}", profileOutput)

subagent({ async: true, chain: steps, timeoutMs: chainDef.timeoutMs, ... })
```

The chain file carries the full step prompts; the skill only adds what's
undetermined at file-authoring time.

### Package manifest

Add `pi.subagents.chains` to `package.json` for discovery:

```json
{
  "pi": {
    "subagents": {
      "agents": ["./agents"],
      "chains": ["./chains"]
    }
  }
}
```

### Files to modify

- `chains/create-task.chain.json` (new)
- `chains/implement-slice.chain.json` (new)
- `chains/finalize-task.chain.json` (new)
- `package.json` — add `pi.subagents.chains`
- `skills/create-task/SKILL.md` — replace inline chain with chain-file invocation
- `skills/implement-slice/SKILL.md` — replace inline chain with chain-file invocation
- `skills/finalize-task/SKILL.md` — replace inline chain with chain-file invocation

### Steps

- 5.1 — Create `chains/create-task.chain.json` with the full 5-step chain and template placeholders
- 5.2 — Create `chains/implement-slice.chain.json` with the full 5-step chain and template placeholders
- 5.3 — Create `chains/finalize-task.chain.json` with the full 3-step chain and template placeholders
- 5.4 — Add `pi.subagents.chains: ["./chains"]` to `package.json`
- 5.5 — Update `create-task/SKILL.md` to read and invoke the chain file instead of building inline
- 5.6 — Update `implement-slice/SKILL.md` to read and invoke the chain file instead of building inline
- 5.7 — Update `finalize-task/SKILL.md` to read and invoke the chain file instead of building inline
- 5.8 — Verify: run `subagent({ action: "list" })` — chains appear. Run `/run-chain skills.implement-slice -- taskSlug=test sliceSlug=test` — verify it executes.

---

## Phase 6 — Dotted Names + Packaging ✅

**Status:** Done. Added `package: skills` to all 7 agent files and updated all chain step references to dotted names.

**Verdict:** Should-do. Namespace hygiene, already partially done.

**Assessment:** The `package.json` already has `pi.subagents.agents: ["./agents"]`.
Adding `package: skills` to each agent frontmatter would register them as
`skills.tdd-worker` etc., preventing collision with any future builtin or
other package's agents. In practice, names like "grill-agent" and "tdd-worker"
are distinctive enough that collision is very unlikely. This is a "do it once
and forget about it" change with no behavioral impact.

### Approach

Add `package: skills` to all 7 agent frontmatter fields, then update every
chain step reference from bare names to dotted names.

### Files to modify

- `agents/adhoc-refiner.md` — add `package: skills`
- `agents/approval-agent.md` — add `package: skills`
- `agents/grill-agent.md` — add `package: skills`
- `agents/slice-verifier.md` — add `package: skills`
- `agents/task-summarizer.md` — add `package: skills`
- `agents/tdd-worker.md` — add `package: skills`
- `agents/test-strategist.md` — add `package: skills`
- `skills/create-task/SKILL.md` — update agent references
- `skills/implement-slice/SKILL.md` — update agent references
- `skills/pipeline-slices/SKILL.md` — update agent references
- `skills/finalize-task/SKILL.md` — update agent references
- `skills/revise-task/SKILL.md` — update agent references
- `skills/adhoc-task/SKILL.md` — update agent references

### Steps

- 6.1 — Add `package: skills` to all 7 agent files
- 6.2 — Update all chain step agent references from bare names to `skills.<name>` across all 6 skills
- 6.3 — Verify: run `subagent({ action: "list" })`, confirm agents appear as `skills.*`. Run a chain, confirm it resolves to `skills.*` agents.

---

## Phase 7 — File-Based Plan Review Extension ✅

**Status:** Done. Created `src/pi/plan-review.ts` with 2 Pi tools + shared parser. Updated `approval-agent.md`, `create-task/SKILL.md`, `revise-task/SKILL.md`. Added 130+ new tests.
with a file-based review mechanism using two custom Pi tools. The user edits
a plan file in-repo using annotation blocks and a status frontmatter field.
No external dependencies, no checklist tracking, no browser UI.

**Assessment:** The current approval flow uses `contact_supervisor` with
`reason: "need_decision"` inside the `approval-agent`. The user sees a text
prompt in conversation and responds inline. This works but gives the user no
way to annotate specific sections of the plan or reference parts of it when
giving feedback. The proposed file-based mechanism lets the user open the
plan in their editor, mark sections with annotation blocks, and set a status
in the frontmatter — without any special tooling beyond what Pi already
provides.

There are two points in the workflow where the user reviews a plan:

1. **`create-task` approval step** — the `approval-agent` presents a testing
   strategy for all slices.
2. **`revise-task` approval step** — same pattern, when the task plan is
   revised.

### Overview of the review flow

The parent skill calls the approval-agent as a chain step. The agent writes
the plan to `{chain_dir}/approval/result.md`. Then the parent calls
`submit_plan_for_review` with that path. That tool:

1. Generates a random, unique slug.
2. Saves a reference copy of the plan to `~/.pi/plans/<slug>.reference.md`.
3. Writes the plan into the repo at `plans/<slug>.md` with status frontmatter
   prepended.
4. Deletes the original `{chain_dir}/approval/result.md`.
5. Returns instructions to the user and forces the agent turn to end.

The user then edits `plans/<slug>.md` directly in their editor:
- Uncomments one of the three status lines in the frontmatter.
- Optionally inserts annotation blocks referencing specific parts of the
  plan (required if status is "rejected").
- **Must not** delete or edit any existing content — only add annotation
  blocks.

When the user tells Pi they're done, the parent (or the user directly) calls
`parse_plan_review` with the slug. That tool:

1. Reads the edited file and the reference copy.
2. Computes a diff: asserts the user only added lines (no deletions, no
   edits to existing content). Compares the full text to ensure no original
   content was removed or changed.
3. Parses the frontmatter status from the edited file.
4. If rejected: asserts at least one annotation block exists.
5. Parses all annotation blocks from the diff (additions only).
6. On success: reverts the in-repo file back to the reference copy (undoes
   the user's edits), returns `OK: <status>` plus a structured list of
   feedback with line references against the original content.
7. On parse failure: returns `ERROR: <parse error message>` — the file is
   left in place so the user can fix it.

If the status is "accepted" or "discarded", the parent continues the chain
or stops. If "rejected", the parent relaunches the approval-agent with the
parsed feedback, the agent revises the plan, and the parent calls
`submit_plan_for_review` again for another review round.

### Frontmatter format

The in-repo plan file gets this frontmatter prepended:

```markdown
---
# status: accepted
# status: rejected
# status: discarded
---
```

The user uncomments exactly one of the three lines:

```markdown
---
status: rejected
# status: accepted
# status: discarded
---
```

**Status parsing rules:**
- The parser reads `status:` from the frontmatter after stripping comment
  markers (`# ` prefix).
- The value is tolerant of misspellings using a similarity check against
  the three valid values (`accepted`, `rejected`, `discarded`). Edit
  distance ≤ 2 is accepted and corrected. Examples: `rejectd` → `rejected`,
  `accepted` → `accepted`, `discardd` → `discarded`.
- If no status line can be resolved, the parser returns `ERROR: no status`.
- If status is `rejected`, at least one annotation block must exist in the
  file. If none found, the parser returns `ERROR: rejected but no
  annotations`.

### Annotation block format

Annotation blocks are inserted by the user between existing lines of the
plan. They follow this structure:

```
<<<
The exact content being referenced
(may span multiple lines)
===
The user's feedback
(may span multiple lines)
>>>
```

**Delimiter flexibility:**

| Role | Allowed characters | Example |
|---|---|---|
| Opening delimiter | Any of `( [ { <` | `<<<`, `((((`, `[[` |
| Middle delimiter | Any of `- = #` | `===`, `---`, `###` |
| Closing delimiter | Any of `) ] } >` (must match opening direction) | `>>>`, `))))`, `]]]]` |

- Any number of the character per line is valid, as long as all three
  delimiter lines have the **same length**.
- Opening and closing must use the **same character type** (angle, paren,
  bracket, or brace) and match direction (`<` pairs with `>`, `(` with `)`,
  `[` with `]`, `{` with `}`).
- The opening line and middle line may be on the same line or on separate
  lines — actually no, they MUST be separate lines. The block is:
  - Line 1: opening delimiter (any length, any allowed char)
  - Lines 2..N-1: the referenced content (one or more lines)
  - Line N: middle delimiter
  - Lines N+1..M-1: the feedback (zero or more lines for accepted,
    one or more for rejected)
  - Line M: closing delimiter
- All delimiter lines must end with the delimiter characters only (no
  trailing content).
- Any whitespace before or after delimiter lines is trimmed.

**Valid examples:**

```
<<<
The API signature changed for validate()
===
Update the test plan to expect the new signature
>>>
```

```
(((
Slice 2 depends on the refactored auth middleware
---
This dependency isn't mentioned in the original plan
)))
```

```
{{
Feature flag gate for the new payment flow
##
Add a rollback strategy section
}}
```

**Invalid examples:**

```
<<<
Content
===
Feedback
>>>>     ✗ closing length doesn't match opening length
```

```
<<<
Content
---
Feedback         ✗ middle delimiter with wrong char type for opening
>>>
```

```
<<<
Content
===
Feedback
))            ✗ closing char doesn't match opening char
```

### The `submit_plan_for_review` tool

**Name:** `submit_plan_for_review`

**Parameters:**

```typescript
{
  planFilePath: string   // Path to the plan file (e.g. a path inside chain_dir)
}
```

**Behavior:**

1. Validate the file exists and is readable.
2. Generate a random slug: 8 alphanumeric characters (e.g. `a3fK9zQ2`).
3. Ensure these directories exist (create if needed):
   - `<cwd>/plans/` (in-repo)
   - `~/.pi/plans/` (reference copies, outside repo)
4. Write a reference copy of the plan to `~/.pi/plans/<slug>.reference.md`.
5. Write the in-repo copy to `<cwd>/plans/<slug>.md` with the status
   frontmatter prepended:

   ```markdown
   ---
   # status: accepted
   # status: rejected
   # status: discarded
   ---
   (original plan content follows)
   ```

6. Delete the original `planFilePath`.
7. Return a message to the user with instructions:

   > Plan submitted for review at `plans/<slug>.md`.
   >
   > 1. Open the file in your editor.
   > 2. Uncomment one of the three status lines in the frontmatter
   >    (`accepted`, `rejected`, or `discarded`).
   > 3. If rejecting, insert annotation blocks between lines to
   >    specify what needs to change. Format:
   >    ```
   >    <<<
   >    Content you're commenting on
   >    ===
   >    Your feedback
   >    >>>
   >    ```
   > 4. Do NOT delete or edit any existing content — only add
   >    annotation blocks and uncomment the status line.
   > 5. Save the file and tell me to review it.

**Turn ending:** The tool forces the agent turn to end after returning its
result. The parent's next action waits for user input.

### The `parse_plan_review` tool

**Name:** `parse_plan_review`

**Parameters:**

```typescript
{
  slug: string   // The slug returned by submit_plan_for_review
}
```

**Validation steps (in order, fail on first error):**

1. **File existence:** Check that `<cwd>/plans/<slug>.md` exists. If not,
   return `ERROR: file plans/<slug>.md not found`.
2. **Reference exists:** Check that `~/.pi/plans/<slug>.reference.md`
   exists. If not, return `ERROR: reference copy not found`.
3. **Read both files.**
4. **Stripped-content comparison** (excluding frontmatter): Strip the
   YAML frontmatter delimiters (everything between the first `---` and the
   second `---`) from the edited file. Compare the remaining content body
   against the reference copy using a line-by-line diff.
5. **No deletions or edits assertion:** The diff must show that every line
   from the reference still exists in the edited body, in the same relative
   order. Only additions (new lines inserted between reference lines) are
   allowed. If any reference line is missing or changed (edit), return:
   `ERROR: original content modified — line <N>: <content>` listing the
   first violation.
6. **Frontmatter parsing:** Extract the YAML frontmatter. Look for a line
   matching `status: <value>`. Strip `# ` comment prefix if present.
   Apply tolerance for misspellings (edit distance ≤ 2) against
   `accepted`, `rejected`, `discarded`. If no valid status found, return:
   `ERROR: no valid status in frontmatter`.
7. **Rejection annotation check:** If status resolves to `rejected`, scan
   the diff additions for annotation blocks. If zero annotations found,
   return: `ERROR: rejected but no annotations found`.
8. **Annotation block parsing:** Scan all added lines in the diff for
   annotation blocks. A block consists of:
   - An opening delimiter line: starts with `(` / `[` / `{` / `<` repeated
     1+ times, ends after that sequence.
   - One or more content lines (the referenced plan content).
   - A middle delimiter line: starts with `-` / `=` / `#` repeated 1+
     times, ends after that sequence.
   - Zero or more feedback lines.
   - A closing delimiter line: starts with `)` / `]` / `}` / `>` repeated
     1+ times. The character must match the opening character directionally
     (`<` ↔ `>`, `(` ↔ `)`, `[` ↔ `]`, `{` ↔ `}`).
   - All three delimiter lines must have the same length (number of chars).
   - If a malformed block is found (e.g. opening without closing, middle
     without opening, wrong closing char, mismatched lengths), return:
     `ERROR: malformed annotation block at line <N>: <description>`.
9. **Line reference building:** For each valid annotation block, locate
   which line(s) the referenced content appears on in the **reference**
   (original) file. Each content line inside the annotation block is
   matched against the reference lines. The feedback is associated with
   those line numbers.

**On success:**

1. Revert the in-repo file: overwrite `<cwd>/plans/<slug>.md` with the
   reference copy contents (restoring original frontmatter-less state).
2. Return:

   ```
   OK: <status>
   
   <feedback-entry-1>
   <feedback-entry-2>
   ...
   ```

   Where each feedback entry is:

   ```
   line <N>-<M>: <feedback text>
   ```

   Example:

   ```
   OK: rejected

   line 24-26: Update the test plan to expect the new signature
   line 42: This dependency isn't mentioned in the original plan
   ```

**On failure:**

The in-repo file is left in place (not reverted) so the user can fix the
issue and try again. Return:

```
ERROR: <message>
```

### Unit tests (extensive)

The parser logic must be thoroughly unit-tested. Tests should cover:

**Frontmatter parsing:**

| Test case | Expected |
|---|---|
| Status `accepted` exactly | accepted |
| Status `rejected` exactly | rejected |
| Status `discarded` exactly | discarded |
| Misspelling `rejectd` | rejected (fuzzy match) |
| Misspelling `acceppted` | accepted (fuzzy match) |
| Misspelling `discardd` | discarded (fuzzy match) |
| Misspelling `dizzarded` (edit distance > 2) | error: no valid status |
| All three commented out | error: no valid status |
| Two uncommented (ambiguous) | error: multiple status lines |
| No frontmatter at all | error: no valid status |
| Empty frontmatter | error: no valid status |
| Extra whitespace around value | accepted |
| Capitalized `Accepted` | accepted (case-insensitive) |

**Annotation block parsing:**

| Test case | Expected |
|---|---|
| Single annotation with `<<<` / `===` / `>>>` | Parsed, content + feedback extracted |
| Annotation with `(((` / `---` / `)))` | Parsed |
| Annotation with `{{` / `##` / `}}` | Parsed |
| Annotation with `[` / `-` / `]` | Parsed |
| Variable delimiter lengths: `<<<` / `===` / `>>>` | Parsed |
| Matching lengths: `<<<<` / `====` / `>>>>` | Parsed |
| Mismatched lengths: `<<<` / `===` / `>>>>` | Error: mismatched lengths |
| Wrong closing direction: `<<<` / `===` / `)))` | Error: wrong closing char |
| Middle char doesn't match delimiters: `<<<` / `%%%` / `>>>` | Error: invalid middle delimiter |
| Opening without closing (missing last block line) | Error: unclosed annotation block |
| Closing without opening | Error: closing without opening |
| Two consecutive annotations | Both parsed |
| Annotation with empty feedback (accepted) | Parsed, empty feedback |
| Annotation with multi-line content | Parsed, both lines in content |
| Annotation with multi-line feedback | Parsed, both lines in feedback |
| Trailing text on delimiter line (e.g. `<<< comment`) | Error: delimiter line has trailing content |
| Only whitespace on content lines | Parsed (empty content) |

**Diff-based assertions:**

| Test case | Expected |
|---|---|
| User added annotation block(s) only | OK |
| User added annotation + changed a word in original content | Error: original content modified |
| User deleted a line from original | Error: original content modified |
| User added unrelated text without annotation block format | Error: unexpected addition |
| User added annotation + reordered lines | Error: original content modified |
| User added frontmatter only, no annotations, status accepted | OK: accepted |
| User added frontmatter only, no annotations, status rejected | Error: rejected but no annotations |
| User added frontmatter, status discarded, no annotations | OK: discarded |
| User added frontmatter + annotations + extra text outside blocks | Error: unexpected addition |

**Line reference building:**

| Test case | Expected |
|---|---|
| Content matches exact line in reference | Line number reported correctly |
| Content spans multiple reference lines | Line range reported correctly |
| Content exists in reference but on a different line | Correct line number(s) reported |
| Content doesn't exist in reference | Error: annotation references non-existent content |
| Partial content match (subset of a reference line) | Line number of the containing line |

### The approval-agent changes

The approval-agent's current loop:

```
1. Read proposal
2. Present via contact_supervisor({ reason: "need_decision" })
3. If approved: output confirmation, done
4. If changes requested: apply them, go to 2
```

The approval-agent's new contract:

```
1. Read proposal
2. Write the plan summary to the configured output file
3. If feedback is provided (parent passes it when re-invoking):
   - Apply each feedback item (line reference + text) to the plan
   - Revise the file
4. Output confirmation that plan is written (or revised)
```

The parent skill (create-task, revise-task) now owns the review loop:

```
1. Launch approval-agent as a chain step (writes plan to chain_dir)
2. Call submit_plan_for_review with the plan path
   → Forces turn end, user edits the file
3. User responds, call parse_plan_review with the slug
4. If parse error → user fixes the file, go to 3
5. If OK: accepted → continue the chain
6. If OK: discarded → stop
7. If OK: rejected →
   a. Relaunch approval-agent with parsed feedback
   b. Go to 2
```

### How `create-task` and `revise-task` parent loops change

Both skills currently have a parent loop that handles `interview_request`
and `need_decision` events from their chains. The approval-agent step is
currently a `need_decision` handler. After Phase 7:

**In `create-task/SKILL.md`:**

The chain's approval-agent step runs. When it completes, instead of reading
`{chain_dir}/approval/result.md` and presenting inline, the parent:

```typescript
// After approval-agent step completes (status === "complete")
const planPath = "{chain_dir}/approval/result.md"

// Submit the plan for user review — this forces turn end
const submitResult = await submit_plan_for_review({ planFilePath: planPath })
// User edits plans/<slug>.md, tells Pi they're done

// Parse the reviewed plan
const parseResult = await parse_plan_review({ slug: submitResult.slug })

if (parseResult.status === "error") {
  // User made a formatting mistake, they'll fix it and try again
  await ask_user_question({
    header: "Parse error",
    question: parseResult.error
  })
  // Re-call parse_plan_review with same slug
}

if (parseResult.status === "accepted") {
  // Continue the chain — worker writes artifact files
}

if (parseResult.status === "discarded") {
  // Stop the skill entirely
  return
}

if (parseResult.status === "rejected") {
  // Relaunch approval-agent with feedback
  const feedbackLines = parseResult.feedback  // array of { line, text }
  
  subagent({
    async: true,
    chain: [{
      agent: "skills.approval-agent",
      task: `Revise the plan at {chain_dir}/approval/result.md

User feedback:
${feedbackLines.map(f => `- line ${f.line}: ${f.text}`).join("\n")}

Apply each feedback item. Write the revised plan.`,
      output: "approval/result.md"
    }]
  })
  
  // Loop back to submit_plan_for_review
}
```

**In `revise-task/SKILL.md`:**

Same pattern — the approval-agent step is followed by
`submit_plan_for_review` + `parse_plan_review` loop instead of the inline
`contact_supervisor` handler.

### Files to create

- `src/pi/plan-review.ts` — Pi extension registering `submit_plan_for_review`
  and `parse_plan_review` tools, plus the shared parser/validation logic.
- `src/pi/plan-review.test.ts` — Unit tests for:
  - Frontmatter parsing and fuzzy matching
  - Annotation block parsing (all delimiter variants, error cases)
  - Diff-based assertions (no deletions/edits, additions only)
  - Line reference building
  - Full parse flow (frontmatter + annotations + diff validation)
- `src/pi/plan-review.test-data.ts` — Test fixtures (sample plan content,
  annotation blocks, edge cases)

### Files to modify

- `agents/approval-agent.md` — simplify: remove `contact_supervisor`
  iteration loop, just write/revise plan by applying feedback.
- `package.json` — add `src/pi/plan-review.ts` to `pi.extensions` array.
- `skills/create-task/SKILL.md` — parent loop uses
  `submit_plan_for_review` + `parse_plan_review` instead of inline
  `need_decision` handler for the approval-agent step.
- `skills/revise-task/SKILL.md` — same change.

### Steps

- 7.1 — Implement `src/pi/plan-review.ts` with:
  - `submit_plan_for_review` tool registration
  - `parse_plan_review` tool registration
  - Shared parser module: frontmatter parsing, annotation block parsing,
    diff validation, line reference building, fuzzy status matching
- 7.2 — Write extensive unit tests in `src/pi/plan-review.test.ts` covering
  all frontmatter, annotation, diff, and line-reference test cases above
- 7.3 — Register the extension in `package.json` (`pi.extensions` array)
- 7.4 — Simplify `approval-agent.md`: remove `contact_supervisor` loop,
  make it a write/revise worker
- 7.5 — Update `create-task/SKILL.md` parent loop to use
  `submit_plan_for_review` + `parse_plan_review`
- 7.6 — Update `revise-task/SKILL.md` parent loop to use
  `submit_plan_for_review` + `parse_plan_review`
- 7.7 — Verify: run `create-task`, approval-agent writes plan,
  `submit_plan_for_review` creates `plans/<slug>.md`, user edits it,
  `parse_plan_review` returns OK with feedback, approval-agent revises
  on rejection, chain continues on acceptance

---

## Priority Summary

| Priority | Phase | Effort | Impact |
|---|---|---|---|
| **High** | Phase 3 — Pipeline restructuring | Medium | Architectural: reliability, observability, resumability |
| **Medium** | Phase 2 — Chain metadata | Medium | Data flow clarity, context efficiency |
| **Medium** | Phase 1 — Agent frontmatter + retry | Low–Medium | Defensive: predictable defaults, fallback resilience, graceful exhaustion |
| **Medium** | Phase 5 — Extracted chain files | Medium | Single source of truth, enforceable contracts, `/run-chain` support |
| **Medium** | Phase 7 — File-based plan review extension | High | Custom Pi tools for in-editor plan annotation, no dependencies |
| **Low** | Phase 4 — Normalize contact_supervisor | Low | API alignment, future-proofing |
| **Low** | Phase 6 — Dotted names | Low | Namespace hygiene, collision prevention |

### Recommended execution order

1. **Phase 1** (quick win, low risk) — agent frontmatter hardening, then verify agent discovery
2. **Phase 6** (quick cleanup, no behavioral impact) — dotted names, lower risk before chain extraction
3. **Phase 5** (foundation for other phases) — extract chain files; subsequent phases edit chain files, not inline SKILL.md chains
4. **Phase 3** (highest value, most disruptive) — restructuring pipeline-slices; works on extracted chain files
5. **Phase 2** (chain metadata on top of extracted chain files) — add `as`, `phase`, `label`, `outputMode`
6. **Phase 4** (small change, depends on Phase 3 for pipeline-slices parent loop)
7. **Phase 7** (new Pi extension, depends on Phase 2+5 for stable chain structure, Phase 4 for normalized reasons)
