---
kind: finding
task: workflow-tool-usage-audit
map: task-tools-overhaul
title: How every workflow skill actually uses the extension tools (R2 audit)
date: 2026-09-14
---

# Workflow tool-usage audit findings (R2)

Method and sources: every claim below was verified against the working tree
(the map's settled source of truth), reading each in-scope `SKILL.md`, every
file under its `resources/` and companion directories, and, for tool
behavior, `src/pi.ts` and `src/core/{art,state}.ts` directly. The R1
catalog (`docs/tasks/tool-surface-inventory/findings.md`) does not exist
yet (only its `task.md` does), so per that task's trusted-source rule the
tool-behavior questions were answered from `src/pi.ts` instead of waiting.
No workflow tool was executed during this audit; tool-behavior claims are
code-verified, not run-verified (noted again under Uncovered areas).

Working-tree label (map constraint: in-flight changes are named, not
treated as provisional): the tree carries the uncommitted repo-gate
refactor (`src/core/repo-gate.ts`, `docs/repo-gating.md`), the handoff
rewrite, the new eval-review skill and its registration, and the new
task-tools-overhaul task tree. None of these change the tool surface this
audit covers: the 20 registered tools are the same set the map recorded
(`src/pi.ts` `createTools()` plus the three explicit `pi.registerTool`
calls for `notify_user`, `get_guidelines`, `list_guidelines`).

Gate context that bounds everything below: in a work repo the gate
disables all of it. `src/pi.ts` builds `GATED_SKILL_NAMES` from
`package.json` `pi.skills` basenames (all 29 promoted skills, with a
5-name fallback list), and when `gate.active` no `task_*` tool, no
`notify_user`/`get_guidelines`/`list_guidelines`, no guidelines injection,
and no gated skill load. The load-bearing analysis below describes the
ungated case, which is the case the workflow skills assume.

## Per-skill usage map

### wayfinder

`skills/engineering/wayfinder/SKILL.md`

Invokes, by heading:

- Telemetry note (top of file): "call the `telemetry_skill_context` tool
  with `{ skill_name: "wayfinder", map }` ... When you are focused on a
  specific task or slice, also pass `target` ... or `slice`". The note
  names `slice` as a telemetry parameter even though the v3 planning
  types it creates carry no slice docs (see Slice machinery).
- "The map": task creation is pure file writing. "Tasks live at
  `docs/tasks/<task-slug>/task.md` and are listed in the map's `tasks`
  array." No tool is named; none exists for creation.
- "Hand off, don't build": escape-hatch telemetry, "record that it fired
  by calling `submit_feedback({ kind: "expected", data })`".
- "Resuming": step 2, "Inspect the current frontier with `task_frontier`".
  This is the only `task_*` invocation in the whole skill.
- Final Feedback note: `submit_feedback({ kind, data })`.

Never mentions: task_show, task_get, task_set, task_set_slices,
task_resolve, task_assert_kind, task_list, task_slices, task_finalizable,
task_dependency_levels, task_map_tasks, task_map_tick, task_map_finalizable,
task_state, task_state_set, task_context, notify_user, get_guidelines,
list_guidelines, subagent, ask_user_question.

Implicit dependencies: the `docs/tasks/` tree and state.yaml that
setup-workflow scaffolds (never named here, but task_frontier fails
without the tree); CONTEXT.md and ADRs ("Entry": "inspect ... existing
`CONTEXT.md`, ADRs").

Planning resources (`skills/engineering/wayfinder/resources/`):

- `bug.md` "Task document": creates task frontmatter with `type: bug`,
  `bug: <bug-slug>`, `slices: [<slice-slug>]`; "Slice planning": creates a
  real slice doc `slices/<n>-<slice-slug>.md` with `mode: afk`, `status:
  todo`, `size`, `blocked_by`. No tool invoked.
- `feature.md` "Task document" and "Slice planning": same shape, `slices:
  [<slice-slug>, ...]`, slice docs with `mode: hitl | afk`, "Create
  `docs/tasks/<slug>/slices/<n>-<slice-slug>.md` for every slice". No tool
  invoked.
- `grilling.md`, `manual.md`, `prototype.md`, `research.md`: task
  frontmatter with the planning `type:` and "no slices". No tool invoked.

Contradiction flagged inline (full entry below): the SKILL.md "Boundary"
section says feature and bug tasks are not created by Wayfinder, yet
`resources/feature.md` and `resources/bug.md` exist precisely to create
them, and they are the only planning resources in the package that create
the legacy slice docs the implementation tools read.

### to-spec

`skills/engineering/to-spec/SKILL.md`

Invokes: nothing. Zero tools of any kind. "Process" step 3 is "Write the
spec using the template below, then save it at `docs/tasks/<slug>/spec.md`".

Never mentions: every one of the 20 extension tools, subagent, telemetry,
submit_feedback, ask_user_question. It is the only flow skill with no
telemetry note and no feedback note.

### to-tickets

`skills/engineering/to-tickets/SKILL.md`

Invokes, by heading:

- Frontmatter description: "using the task_* tools for the graph". A
  generic claim; no creation tool exists and none is named.
- "### 5. Publish the tickets under docs/tasks/", step 3: "The graph is
  now queryable via `task_dependency_levels <map-slug>` (BFS levels) and
  `task_frontier <map-slug>` (ready, unfinished tasks)." Both are
  post-hoc queries; the publication steps 1-2 (write `task.md`, register
  in the map's `tasks` array, wire `blocked_by` in a second pass) name no
  tool and are pure file editing.

Never mentions: task_show, task_get, task_set, task_set_slices,
task_resolve, task_assert_kind, task_list, task_slices, task_finalizable,
task_map_tasks, task_map_tick, task_map_finalizable, task_state,
task_state_set, task_context, notify_user, get_guidelines, list_guidelines,
subagent, telemetry_skill_context, submit_feedback, ask_user_question.

Slice prose: "### 3. Draft vertical slices" defines tracer-bullet rules
and puts `slices: [<slice-slug>, ...]` in the ticket frontmatter, but the
"### 5" publication step writes only `task.md` per ticket; no step
creates the `slices/<n>-*.md` docs and no step names `task_set_slices`.

### implement-task

`skills/engineering/implement-task/SKILL.md`

Invokes, by location:

- Telemetry note (top): "`telemetry_skill_context` tool with `{
  skill_name: "implement-task", sliceCount, map }` -- `sliceCount` = the
  number of slices in the task (from the task doc's `slices:` list or
  `task_slices`)". The `slices:` list reading is prose; the tool only
  counts legacy slice docs.
- "Async dispatch (hard rule)" note: "every `subagent(...)` call in this
  skill's resources -- feature chains, bug chains, and any fan-out --
  MUST be launched with `async: true`", followed by `wait({ id })`.
- Intro router: "Reads the task's `type` frontmatter via `task_get` and
  dispatches to the appropriate resource. If `type:` is absent, default
  to the existing feature path"; `const taskType = task_get(taskPath,
  "type") || "feature"`.
- "Skill delegation for planning types": delegation to the `research` and
  `prototype` skills; and the paragraph "When invoked with a map, work
  the ready frontier from `task_frontier`, routing each child task by its
  type."
- Final Feedback note: `submit_feedback({ kind, data })`, plus "The
  tdd-worker, slice-verifier, deviation-reporter, and land-worker agents
  also call this tool themselves".

Never mentions: task_show, task_list, task_set_slices, task_resolve,
task_assert_kind, task_map_tasks, task_map_tick, task_map_finalizable,
task_state, task_context, notify_user, list_guidelines.

Resources, per file:

- `resources/feature.md` (router): items 1-4 select human vs autonomous
  from invocation prose; item 3: "use `ask_user_question` to confirm
  whether human/manual mode is intended". No task_* tool.
- `resources/bug.md` (router): identical shape, same `ask_user_question`
  fallback.
- `resources/feature/autonomous.md`:
  - "## Step 0 -- Prerequisites": "Task doc exists with `slices:` list.
    Each slice has `## Test plan`, `size`, `blocked_by`. Run
    `task_slices <slug>` to enumerate."; `const pendingSlices =
    task_slices(taskSlug).filter(s => s.status !== "done")`; if none
    pending: "All slices done. Run `/skill:finalize-task`."
  - "## Step 1 -- Architecture spec (user-approved)": writes
    `docs/tasks/${taskSlug}/arch-spec.md`; no tool.
  - "## Step 2 -- Per-slice chain dispatch": "Call
    `task_dependency_levels <taskSlug>` to get BFS levels. The graph
    model is the same one `task_frontier` exposes";
    `levels = JSON.parse(task_dependency_levels(taskSlug)).levels`;
    `size = task_get(<slice-path>, "size")`; the subagent chain
    (tdd-worker, slice-verifier, deviation-reporter, ui-noter,
    land-worker) with `async: true`, `failFast: true`, `wait({ id:
    runId })`; the tdd-worker prompt says "Call get_guidelines for
    relevant languages."; the land-worker prompt says "Set task_set
    status done on slice."; the success path runs
    `task_set <slice-path> status done` then `task_state_set task
    <taskSlug>`; the uncertainty path runs
    `submit_feedback({ kind: "expected", data: ... })` then
    `ask_user_question({...})`; the ui-noter dispatch references an
    `agent: "ui-noter"` (see No-tool-support: no such agent definition
    exists).
  - "## Whole-task code review (advisory)": `subagent({ async: true,
    agent: "code-reviewer", skill: "code-review", ... })` then
    `wait({ id: reviewId })`.
  - "## Step 3 -- Coherence refactor": reads deviation reports, arch
    spec, combined diff; full-suite gate; no task_* tool.
  - "## Step 4 -- Report": "If all slices done: run `/skill:finalize-task
    <slug>`".
  - "## Failure toolbelt (parent never implements)": split slice N into
    "ad-hoc sub-slices Na, Nb, Nc (`slices/<N>a-<slug>.md`, conforming,
    chained via `blocked_by`; update the task doc `slices:` list; mark
    slice N `status: split`)"; `submit_feedback({ kind: "expected",
    data })` per action.
  - "## Workflow feedback": `submit_feedback`.
- `resources/feature/human.md`: "## 2. Handoff each slice to the human"
  uses `task_dependency_levels` ("Use `task_dependency_levels` and the
  task's `blocked_by` graph to process slices in dependency order");
  sections 3-4 dispatch slice-verifier, deviation-reporter, code-reviewer,
  land-worker; no task_* writes, no task_set, no task_state_set.
- `resources/bug/autonomous.md`:
  - "## Step 0  --  Prerequisites": "Bug task doc exists with `type:
    bug`, `bug: <slug>`, and a `slices:` list"; `const bugSlug =
    task_get(taskPath, "bug")`; `const slice = task_slices(taskSlug)[0]`.
  - "## Step 1  --  Single chain dispatch": `size = task_get(<slice-path>,
    "size")`; the chain (tdd-worker with skill `diagnosing-bugs`,
    slice-verifier, land-worker); tdd-worker prompt "Call get_guidelines
    for relevant languages."; land-worker prompt "Set task_set status
    done on slice."; `wait({ id: runId })`.
  - "## Code review (advisory)": code-reviewer subagent.
  - "## Step 2  --  Report": finalize pointer.
  - "## Failure toolbelt" and "## Workflow feedback": same split prose
    and `submit_feedback`.
- `resources/bug/human.md`: sections 1-4; no task_* tool; read-only
  verifier chain plus land-worker.
- `resources/research.md`, `prototype.md`, `grilling.md`, `manual.md`:
  no task_* tool anywhere. Each says "Mark the task `done` only when ..."
  (research.md, prototype.md, manual.md) or "never mark the task done
  while required human decisions remain" (grilling.md) without naming a
  tool; each ends with a `submit_feedback` Feedback note.

### finalize-task

`skills/engineering/finalize-task/SKILL.md`

Invokes, by heading:

- Telemetry note: `telemetry_skill_context` with `{ skill_name:
  "finalize-task", map }`.
- "## Step 0, Prerequisites": "`task_finalizable <slug>`, must return
  'ready to finalize' (no open slices)."
- "## Step 1, CI gate": "Run the project's CI command (from
  `task_context` profile or detected from repo tooling)"; fix-forward
  telemetry `submit_feedback({ kind: "expected", data })`.
- "## Step 2, Impeccable note check": reads
  `docs/tasks/${taskSlug}/impeccable-note-*.md`; no tool.
- "## Step 3, Knowledge harvest" through "## Step 6, Bug closure": file
  edits and git; Step 6 reads the `bug:` frontmatter by prose ("Get the
  linked bug slug from the task doc frontmatter"), never naming
  `task_get`.
- "## Step 7, Archive": "Step 7 interleaves **Pi tool calls** with shell
  commands. `task_map_tick` and `task_state_set` are tools you invoke as
  functions, **not** shell binaries"; then `task_map_tick <map-slug>
  {taskSlug}`, `task_state_set task null`, `task_state_set slice null`,
  and the git block.
- "## Step 8, Map finalization (if last child)": "If
  `task_map_finalizable` returns ready for the map".
- Final Feedback note: `submit_feedback`.

Never mentions: task_show, task_get, task_set, task_set_slices,
task_resolve, task_assert_kind, task_list, task_slices,
task_dependency_levels, task_frontier, task_map_tasks, task_state,
notify_user, get_guidelines, list_guidelines, subagent,
ask_user_question.

### task-workflow-doctor

`skills/engineering/task-workflow-doctor/SKILL.md`

Invokes: nothing. "## Process" is filesystem inspection; the "## Symptom
→ missing artifact → route" table routes to `/skill:setup-workflow` or
manual steps. Resources (`missing-tasks-tree.md`, `missing-state-yaml.md`,
`missing-bugs-dirs.md`, `missing-dev-env.md`, `missing-testing-md.md`,
`missing-context-md.md`, `missing-adr-dir.md`,
`manifest-misconfigured.md`) name zero tools;
`manifest-misconfigured.md` is the only place in the promoted skills that
mentions `package.json` `pi.subagents` (a Pi package fact, not a tool).

Implicit dependencies: `docs/tasks/state.yaml` (the
`missing-state-yaml.md` symptom "The current task or slice is lost
between sessions" assumes state.yaml actually carries that role, which
today only task_state_set and the feature pipeline maintain).

### setup-workflow

`skills/engineering/setup-workflow/SKILL.md`

Invokes: zero extension tools. Everything is file I/O.

- "## Detection": "Read `docs/tasks/state.yaml`" and branch on
  `schema_version` ("No `schema_version` field (or no `state.yaml`): the
  repo is fresh ... `schema_version` equals current: ... nothing to
  do"). "The current schema version is `3`."
- "## Onboard (fresh repo)" step 2: write state.yaml with `task: null,
  slice: null, schema_version: 3`.
- "## Migrate (old repo)" and "### Idempotence": bump `schema_version`
  after each upgrade resource; resume via a `.migration-progress`
  marker.
- Final Feedback note: `submit_feedback`.

Never mentions: all 17 task_* tools plus notify_user/get_guidelines/
list_guidelines, subagent, telemetry_skill_context, ask_user_question.

`resources/upgrade-2-to-3.md` (the only upgrade resource): historical
migration steps; mentions `ask_user_question` only as something the
grilling re-align dropped (Step 8: "drop `ask_user_question`
specificity"), mentions subagents only as agent definitions that already
existed (Summary deviation 6), and names `task_*` tools only in the
"keep-as-ours" sense via `docs/migration-target.yaml`. It invokes
nothing.

### code-review

`skills/engineering/code-review/SKILL.md`

Invokes:

- "### 3. Identify the standards sources": "Discover repo standards
  through `get_guidelines`, plus any repo override files such as
  `AGENTS.md`, `CONTEXT.md`, or `docs/standards.md`."
- "### 4. Spawn both axis reviewers in parallel": both axes "run as
  **parallel sub-agents**" (subagent), with the fanout guard "Do not
  invoke `/code-review` or spawn additional agents."

"## Where it fits" states the review "is fired by `implement-task` at the
end of the feature path and the bug path" and is advisory. The spec
source is read from task doc / arch spec / bug doc as files; no task_*
tool is used to read them.

Never mentions: every task_* tool, notify_user, list_guidelines,
telemetry, submit_feedback, ask_user_question. (`smells.md` names no
tools either.)

### tdd

`skills/engineering/tdd/SKILL.md`

Invokes: nothing. It is a reference skill consulted by tdd-worker via the
`skill: tdd` dispatch parameter ("Where it fits in this pipeline"). No
tool of any kind is named in it, `tests.md`, or `mocking.md`.

### research

`skills/engineering/research/SKILL.md`

Invokes: subagent. "Spin up a **background subagent** to do the research"
(intro), "## The background agent's job" ("Write the findings to a single
Markdown file"), "## Name distinction" positions the skill as the "how"
for `type: research` tasks that wayfinder routes.

Never mentions: every task_* tool, notify_user, get_guidelines,
list_guidelines, telemetry, submit_feedback, ask_user_question.

### prototype

`skills/engineering/prototype/SKILL.md`

Invokes: nothing. "## Pick a branch" routes to LOGIC.md or UI.md; "##
Rules that apply to both" are file and command conventions. No tool is
named (the companion `LOGIC.md`/`UI.md` files contain no tool mentions
either, grep-verified).

### grilling

`skills/engineering/grilling/SKILL.md`

Invokes: subagent, at prose level. "## Facts, ordering, and recording":
"When a frontier question needs a fact from the environment (filesystem,
tools, etc.), dispatch a sub-agent to find it; do not ask the user for
anything you could look up yourself. Do not block on it."

Never mentions: every task_* tool, notify_user, get_guidelines,
list_guidelines, telemetry_skill_context, submit_feedback. Notably no
`ask_user_question`: the v3 re-align dropped it in favor of plain text
(`skills/engineering/setup-workflow/resources/upgrade-2-to-3.md` Step 8),
so the interview is conversational only.

### domain-modeling

`skills/engineering/domain-modeling/SKILL.md`

Invokes: nothing. "## File structure" (CONTEXT.md, docs/adr/), "## During
the session" (challenge, sharpen, scenarios, update CONTEXT.md inline,
offer ADRs sparingly). Companion `ADR-FORMAT.md` and `CONTEXT-FORMAT.md`
name no tools.

### handoff

`skills/productivity/handoff/SKILL.md`

Invokes:

- "## Live subagent seeding (Pi)": "If the Pi harness can dispatch a
  subagent seeded with the handoff summary as its prompt, that is an
  alternative to writing a file: `subagent({ task: "<handoff summary>"
  })` starts a fresh-context agent that picks up now."
- "## Telemetry": "If the user passed an argument, call
  `telemetry_skill_context` with `{ skill_name: "handoff" }`" (frontmatter
  `metadata: telemetry.capture: "argument"`).

Never mentions: every task_* tool, notify_user, get_guidelines,
list_guidelines, submit_feedback, ask_user_question.

### skill-creator

`skills/engineering/skill-creator/SKILL.md`

Invokes: bash-run helper scripts (`scripts/discover_skill.mjs`,
`scaffold_skill.mjs`, `validate_skill.mjs`, "## Helper scripts"), and
subagent indirectly: "## Core workflow (8 phases)" phase 7 says "invoke
the `/skill-review` skill (via the `skill-reviewer` agent), which runs the
... axes as parallel fresh-context reviewers".

Never mentions: every task_* tool, notify_user, get_guidelines,
list_guidelines, ask_user_question.
`references/target-pi.md` documents the Pi telemetry frontmatter
(`metadata.telemetry.capture: "target"` and `telemetry_skill_context`),
which is how wayfinder/implement-task/finalize-task/handoff notes exist.

### skill-review

`skills/engineering/skill-review/SKILL.md`

Invokes: subagent. "### 3. Spawn the planned axes in parallel": "Spawn
one fresh, read-only reviewer per axis in the plan", each reviewer brief
specifying `tools: read, bash`, plus the fanout guard. "## Where it
fits": invoked by skill-creator phase 7, advisory.

Never mentions: every task_* tool, notify_user, get_guidelines,
list_guidelines, telemetry, submit_feedback, ask_user_question.

### eval-review

`skills/engineering/eval-review/SKILL.md`

Invokes: subagent. "## Mode 1: Suite review" step 3: "One fresh,
read-only reviewer per axis (`tools: read, bash`)"; step 1 mentions
`docs/evals.md` overrides. "## Mode 2: Run triage": "One deep read, no
fanout". The reference `references/isolation-checklist.md` names pi CLI
flags, no tools.

Never mentions: every task_* tool, notify_user, get_guidelines,
list_guidelines, telemetry, submit_feedback, ask_user_question. It has no
telemetry note and no feedback note, consistent with its advisory
review-only role.

### task-workflow-overview

`skills/engineering/task-workflow-overview/SKILL.md`

Invokes, by heading:

- "## The main flow: idea to ship": step 3 says tickets are declared
  "using the `task_*` tools for the graph" (generic), and step 2's
  grilling/prototype/handoff routing names skills only.
- "## Read-only queries": `task_finalizable <slug>` ("Is this task
  ready?"), `task_slices <slug>` "for legacy tasks" and `task_frontier
  <map>` ("What's left on task X?"), `task_list` ("List tasks / maps"),
  `task_show <slug>` ("Show artifact X"), `task_state` ("Where am I?"),
  plus a bash grep for the bug queue.
- "## Actions": routes to skills only.
- Final Feedback note: `submit_feedback({ kind, data })`.

Companion `PHASE-BOUNDARIES.md` "The tree": names "Subagent" as
phase-boundary option 4; no task_* tool.

## Tool-by-tool: load-bearing vs dead weight

Classification key: **load-bearing** (removing it breaks a named workflow
step), **mentioned-but-unused** (a skill names it, but no pipeline step
depends on it), **never-mentioned** (no skill names it at all).

1. `task_show`: mentioned-but-unused. Only
   `skills/engineering/task-workflow-overview/SKILL.md` "Read-only
   queries" ("Show artifact X" | `task_show <slug>`). No flow skill calls
   it in a step.
2. `task_get`: load-bearing. Router:
   `skills/engineering/implement-task/SKILL.md` intro ("Reads the task's
   `type` frontmatter via `task_get` ... `const taskType =
   task_get(taskPath, "type") || "feature"`"). Size budgets:
   `resources/feature/autonomous.md` "Step 2" (`size = task_get(<slice-path>,
   "size")`) and `resources/bug/autonomous.md` "Step 1" (same) plus
   "Step 0" (`const bugSlug = task_get(taskPath, "bug")`).
3. `task_set`: load-bearing. `resources/feature/autonomous.md` "Step 2"
   success path (`task_set <slice-path> status done`) and the land-worker
   prompt ("Set task_set status done on slice.");
   `resources/bug/autonomous.md` "Step 1" land-worker prompt (same).
4. `task_set_slices`: never-mentioned. No skill names it (grep across
   `skills/` finds only tests and `src/pi.ts` registration). The failure
   toolbelt's "update the task doc `slices:` list"
   (`resources/feature/autonomous.md` "Failure toolbelt";
   `resources/bug/autonomous.md` "Failure toolbelt") is the one workflow
   operation it exists for, and even there it is not named.
5. `task_resolve`: never-mentioned. No skill names it.
6. `task_assert_kind`: never-mentioned. No skill names it.
7. `task_list`: mentioned-but-unused. Only
   `skills/engineering/task-workflow-overview/SKILL.md` "Read-only
   queries" ("List tasks / maps" | `task_list`). No pipeline step calls
   it.
8. `task_slices`: load-bearing for the legacy pipelines only.
   `resources/feature/autonomous.md` "Step 0" ("Run `task_slices <slug>`
   to enumerate"; `const pendingSlices = task_slices(taskSlug)`),
   `resources/bug/autonomous.md` "Step 0" (`const slice =
   task_slices(taskSlug)[0]`), the implement-task telemetry note
   (sliceCount), and the router's "Read-only queries" ("for legacy
   tasks"). It enumerates only `slices/<n>-*.md` files
   (`src/pi.ts` `activeSlices`, `SLICE_RE`), never the `slices:`
   frontmatter list, so it is load-bearing exactly when legacy slice
   docs exist (see Slice machinery).
9. `task_finalizable`: load-bearing.
   `skills/engineering/finalize-task/SKILL.md` "Step 0, Prerequisites"
   ("`task_finalizable <slug>`, must return 'ready to finalize' (no open
   slices)"); also the router's "Read-only queries".
10. `task_dependency_levels`: load-bearing.
    `resources/feature/autonomous.md` "Step 2" ("Call
    `task_dependency_levels <taskSlug>` to get BFS levels";
    `levels = JSON.parse(task_dependency_levels(taskSlug)).levels`),
    `resources/feature/human.md` "2. Handoff each slice to the human"
    ("Use `task_dependency_levels` and the task's `blocked_by` graph"),
    `skills/engineering/to-tickets/SKILL.md` "### 5" (queryable-via
    mention). Its task branch is legacy-slice-only (same blind spot as
    task_slices); its map branch is the live v3 path.
11. `task_frontier`: load-bearing. `skills/engineering/wayfinder/SKILL.md`
    "Resuming" step 2 ("Inspect the current frontier with
    `task_frontier`"), `skills/engineering/implement-task/SKILL.md`
    "Skill delegation for planning types" paragraph ("work the ready
    frontier from `task_frontier`, routing each child task by its type"),
    `skills/engineering/to-tickets/SKILL.md` "### 5".
12. `task_map_tasks`: never-mentioned. No skill names it. Wayfinder
    "Resuming" inspects the frontier with `task_frontier` instead, and
    to-tickets "### 5" registers tickets in the map's `tasks` array by
    editing the map doc.
13. `task_map_tick`: load-bearing.
    `skills/engineering/finalize-task/SKILL.md` "Step 7, Archive" ("call
    the Pi tool: `task_map_tick <map-slug> {taskSlug}`").
14. `task_map_finalizable`: load-bearing.
    `skills/engineering/finalize-task/SKILL.md` "Step 8, Map finalization
    (if last child)" ("If `task_map_finalizable` returns ready for the
    map").
15. `task_state`: mentioned-but-unused. Only
    `skills/engineering/task-workflow-overview/SKILL.md` "Read-only
    queries" ("Where am I?" | `task_state`). Nothing in a pipeline reads
    it.
16. `task_state_set`: load-bearing, with a confirmed data-loss bug.
    `resources/feature/autonomous.md` "Step 2" (`task_state_set task
    <taskSlug>`) and `skills/engineering/finalize-task/SKILL.md` "Step 7"
    (`task_state_set task null`, `task_state_set slice null`). Bug
    evidence under Contradictions: every write drops `schema_version`.
17. `task_context`: mentioned-but-unused in the operative sense.
    `skills/engineering/finalize-task/SKILL.md` "Step 1, CI gate" is the
    only mention ("from `task_context` profile or detected from repo
    tooling"); the tool returns the artifact schema plus an optional
    `docs/tasks/profile.md` (`src/pi.ts` `profileText`), not a CI
    command, and no `profile.md` exists in this repo and setup-workflow
    never scaffolds one ("## Onboard (fresh repo)" steps 1-11 create no
    profile.md).
18. `notify_user`: never-mentioned. No skill names it (grep across
    `skills/`, `README.md`, and the docs pages finds nothing; only
    `docs/repo-gating.md` and archived task docs discuss it, as gate
    facts).
19. `get_guidelines`: load-bearing.
    `skills/engineering/code-review/SKILL.md` "### 3. Identify the
    standards sources" ("Discover repo standards through
    `get_guidelines`"), and the tdd-worker prompts in
    `resources/feature/autonomous.md` "Step 2" and
    `resources/bug/autonomous.md` "Step 1" ("Call get_guidelines for
    relevant languages"), matching the tdd-worker and code-reviewer
    allowlists (`agents/tdd-worker.md`, `agents/code-reviewer.md`).
20. `list_guidelines`: never-mentioned by skills. The only advertiser is
    the extension's own `before_agent_start` injection ("Use
    `list_guidelines()` to see all available sources", `src/pi.ts`). No
    skill invokes it.

## Non-extension tools named by the workflow (one line each)

- `subagent` (pi-subagents): load-bearing. Named by implement-task
  ("Async dispatch (hard rule)" plus both autonomous resources' chain
  and review dispatches), code-review "Process" step 4, skill-review
  "### 3", eval-review "Mode 1" step 3, research (whole premise),
  grilling "Facts, ordering, and recording", handoff "Live subagent
  seeding (Pi)", skill-creator phase 7, PHASE-BOUNDARIES.md "The tree",
  and task-workflow-doctor's manifest resource (registration fact).
- `telemetry_skill_context` (pi-telemetry): load-bearing for telemetry
  correlation only. wayfinder, implement-task, finalize-task telemetry
  notes; handoff "Telemetry"; documented in
  skill-creator/references/target-pi.md.
- `submit_feedback` (pi-telemetry): load-bearing for the friction loop
  (map constraint: telemetry maintained). wayfinder "Hand off, don't
  build" + note; implement-task + all six per-type resources; finalize-task
  (CI fix-forward + note); setup-workflow note; task-workflow-overview
  note; plus the agent files (tdd-worker, slice-verifier, land-worker,
  deviation-reporter, code-reviewer, skill-reviewer).
- `ask_user_question`: load-bearing for mode disambiguation and
  uncertainty escalation. implement-task/resources/feature.md item 3,
  resources/bug.md item 3, resources/feature/autonomous.md "Step 2"
  uncertainty path. (Grilling dropped it in v3,
  setup-workflow/resources/upgrade-2-to-3.md Step 8.)
- `annotate`, `annotate-diff`: never-mentioned by any skill.
- browser tools: never-mentioned as tools. diagnosing-bugs suggests
  Playwright/Puppeteer scripts run via bash (outside this audit's named
  scope); wizard/prototype mention the human's browser in prose only.
- clipboard tools: never-mentioned by any skill.
- tldraw tools: never-mentioned by any skill.

## Prose-vs-behavior contradictions

Each entry names the prose, the behavior, and the owner of each side.

1. **task_context's schema text denies the ticket phase** (confirmed
   instance from the map). Behavior: `src/pi.ts` `artifactSchemaRef()`
   ends "The map and task bodies are the specification; there is no
   separate ticket-generation phase." Prose: the v3 flow's named phases
   include exactly that phase, `skills/engineering/to-spec/SKILL.md`
   ("Process" step 3, spec at `docs/tasks/<slug>/spec.md`) and
   `skills/engineering/to-tickets/SKILL.md` ("### 5. Publish the tickets
   under docs/tasks/"), routed by
   `skills/engineering/task-workflow-overview/SKILL.md` "The main flow:
   idea to ship" step 3. Any agent that calls task_context for guidance
   is told the flow's second and third phases do not exist.
2. **task_context's documented task schema omits `slices:`**. Behavior:
   the schema text's Task section lists kind, slug, title, type, map,
   blocked_by, status, size, started_at, completed_at; no `slices` field.
   Prose: `skills/engineering/to-tickets/SKILL.md` "### 3" puts `slices:
   [<slice-slug>, ...]` in the ticket frontmatter, wayfinder's
   `resources/feature.md`/`bug.md` "Task document" do the same, and
   `skills/engineering/implement-task/SKILL.md` telemetry note reads
   sliceCount "from the task doc's `slices:` list". The flow's canonical
   task shape is undocumented by the only tool that documents the
   schema.
3. **task_slices ignores the `slices:` list the prose tells it to
   read**. Prose: `resources/feature/autonomous.md` "Step 0 --
   Prerequisites" says "Task doc exists with `slices:` list. ... Run
   `task_slices <slug>` to enumerate." Behavior: `src/pi.ts` `activeSlices`
   lists only files matching `SLICE_RE` (`slices/<n>-<slug>.md`); the
   frontmatter `slices:` list is never read by anything (the only writer
   is `task_set_slices`, which no skill calls). For a to-tickets task
   (which has the list but no slice docs), task_slices returns "(no open
   slices)", the Step 0 filter yields an empty set, and the pipeline
   jumps straight to "All slices done. Run `/skill:finalize-task`." with
   nothing implemented. Same blind spot in `task_finalizable` and in
   `task_dependency_levels`' task branch.
4. **"Ready to finalize" cannot distinguish done from never-created.**
   Behavior: `task_finalizable` is "no active slice docs"
   (`src/pi.ts`); a task with zero slice docs passes vacuously. Prose:
   `skills/engineering/finalize-task/SKILL.md` "Step 0, Prerequisites"
   treats the return as a completion gate. Combined with contradiction 3
   this is the mechanism behind the false-finalizable class (see
   No-tool-support).
5. **task_state_set silently drops state.yaml keys, including the field
   setup-workflow keys on** (map-confirmed bug, live in the tree).
   Behavior: `src/core/state.ts` `toObject` emits only `task` and
   `slice`, and `src/pi.ts` `saveState` writes exactly that, so any
   other key (today: `schema_version`) is deleted on every
   task_state_set call. Prose owners of both sides:
   `skills/engineering/setup-workflow/SKILL.md` "Detection" ("No
   `schema_version` field (or no `state.yaml`): the repo is fresh")
   and "## Onboard" step 2 (writes `schema_version: 3`), versus
   `resources/feature/autonomous.md` "Step 2" (`task_state_set task
   <taskSlug>`) and `finalize-task` "Step 7" (clear both fields). No
   skill prose mentions the interaction. Live confirmation in the
   working tree: `docs/tasks/state.yaml` currently reads `task:
   tool-surface-inventory / slice: None` with no `schema_version`, while
   `git show HEAD:docs/tasks/state.yaml` has `schema_version: 3`; the
   field was dropped again by a task_state_set write after the
   2026-09-12 restore the map records. (The literal `slice: None`
   string rather than null is a second, smaller state-shape wart: YAML
   parses it as the string "None".)
6. **Wayfinder's Boundary forbids what its own planning resources do.**
   Prose: `skills/engineering/wayfinder/SKILL.md` "Boundary" ("Feature
   and bug tasks are **not** created by Wayfinder. They are created by
   `to-tickets` after the decisions are clear.") and "The map" (type
   table lists research/prototype/grilling/manual only). Behavior:
   `skills/engineering/wayfinder/resources/feature.md` ("Use this
   resource when the task delivers new application behavior. This
   resource creates a feature task ...") and `resources/bug.md` exist,
   and they are the only resources in the package that create the
   legacy slice docs the implementation tools can see. to-tickets has
   its own competing template and creates no slice docs. So the
   feature/bug planning path that feeds the tool machinery is the one
   the SKILL.md forbids, and the sanctioned path (to-tickets) produces
   tasks the machinery cannot see.
7. **to-tickets' description claims tool support that does not exist.**
   Prose: frontmatter description ("using the task_* tools for the
   graph") and "### 5" ("The graph is now queryable via ..."). Behavior:
   the extension has no task-creation or map-registration tool; every
   creation step in "### 5" is file editing, and the only task_* tools
   that touch a map's `tasks` array are read/tick (`task_map_tasks`,
   never mentioned; `task_map_tick`, finalize only). The claim is true
   only of post-hoc queries.
8. **The land-worker prompt instructs tool calls its allowlist forbids.**
   Prose: `resources/feature/autonomous.md` "Step 2" and
   `resources/bug/autonomous.md` "Step 1" land-worker prompts say "Set
   task_set status done on slice." Behavior:
   `agents/land-worker.md` frontmatter grants `tools: read, edit, bash`
   only; land-worker has no `task_set` and no `task_*` tool, and its own
   body says "Update state.yaml" as a file edit. The same prompts are
   also duplicated by the parent's success path (`task_set <slice-path>
   status done` after `wait`), so the instruction is both unexecutable
   by the named agent and redundant with the parent's bookkeeping.
9. **The implement-task router reads only `type`; no mode field exists
   anywhere.** Prose: `skills/engineering/implement-task/SKILL.md`
   intro (`const taskType = task_get(taskPath, "type") || "feature"`)
   and the human/autonomous routers (`resources/feature.md`,
   `resources/bug.md`), which select mode from invocation prose
   ("If the prose clearly says to implement the task yourself ...").
   Behavior: the archived decision
   `docs/tasks/archive/decide-human-implementation-mode/task.md`
   ("Mode selection") made the trigger deliberately prose-only, and no
   frontmatter marker exists; the pi-harness-evals map now requires one
   (see Known-future). There is no contradiction inside the current
   prose, but the router's pseudo-code has no slot for any marker, and
   task_get is the only read primitive, so any marker lands as
   untyped prose the router must remember to read.
10. **Slice `mode: hitl | afk` is written and never read.** Prose:
    `skills/engineering/wayfinder/resources/feature.md` "Slice planning"
    and `resources/bug.md` "Slice planning" emit `mode: hitl | afk`;
    `src/pi.ts` `artifactSchemaRef` documents it. Behavior: no tool and
    no skill reads `mode` (grep for hitl/afk across `src/` and
    `skills/` finds only the two wayfinder resources and the schema
    text). The mode decision lives in invocation prose instead
    (contradiction 9), so the field is a write-only relic.
11. **setup-workflow points users at a skill name that does not exist.**
    Prose: `skills/engineering/setup-workflow/SKILL.md` "## Onboard
    (fresh repo)" step 11: "Run `/skill:task-overview` to see the full
    flow". Behavior: the router skill is
    `skills/engineering/task-workflow-overview/` (name
    `task-workflow-overview`); `docs/migration-target.yaml` also calls it
    "task-overview (name kept)". No skill named `task-overview` is
    registered (`package.json` `pi.skills`), so the onboarding report
    names a dead command.
12. **`task_map_tick`'s "harmless error" is a thrown error the skill must
    catch in prose.** Minor: `skills/engineering/finalize-task/SKILL.md`
    "Step 7" says "(If the map has no matching child task, it errors
    harmlessly; fall back to editing the map doc directly.)" while the
    tool throws `no task '<task_slug>' in map` (`src/pi.ts`). The
    skill is accurate about the fallback, but the tool's contract is
    error-on-missing, not no-op, so the "harmless" framing depends
    entirely on the caller's prose.

## No-tool-support steps (pure prose, no tool backing)

1. **Map creation and map `tasks` registration.** wayfinder "The map"
   creates `docs/tasks/maps/<slug>/map.md` and lists tasks in the
   frontmatter array by file editing; to-tickets "### 5" step 1
   registers tickets the same way. No tool creates maps, creates tasks,
   or appends to a map's `tasks` array (`task_map_tick` only flips
   `done`).
2. **Task creation generally.** wayfinder's planning resources and
   to-tickets' ticket template both write `task.md` files directly; the
   extension has no task-creation primitive at all, which is why the
   to-tickets description's "task_* tools for the graph" claim (see
   Contradictions 7) cannot be true.
3. **The spec phase.** to-spec "Process" step 3 writes
   `docs/tasks/<slug>/spec.md`; no tool resolves, lists, reads, or knows
   about spec.md. Consequence (the map's confirmed instance): on
   pi-harness-evals, the deliverable feature exists only as
   `docs/tasks/build-eval-creator-skill/spec.md` (no task.md; the
   directory holds nothing else, and the map's `tasks` array lists only
   eval-stack-research and pi-headless-isolation-spike, both `done:
   true`). Code-verified mechanics: `src/pi.ts` `mapChildInfos` skips
   any slug with no task.md, and `task_map_finalizable` reads only the
   array's `done` flags, so the map reports ready to finalize while its
   largest child exists but is invisible. The same mechanism produces
   the mirror failure: a child listed in the array whose task.md was
   never created vanishes from `task_frontier` (skipped) yet still
   blocks `task_map_finalizable` if `done: false`.
4. **Fog.** wayfinder "The map" `## Fog` is a prose-only concept; no
   tool can list unsharpened questions.
5. **The `slices:` frontmatter list.** to-tickets "### 3" and wayfinder's
   feature/bug resources write it; `task_set_slices` can write it; no
   tool reads it (see Slice machinery). The v3 flow's canonical slice
   declaration has zero readers.
6. **Slice `mode`, `started_at`, `completed_at`.** Written by the
   wayfinder resources (`mode`) or by nobody in the flow
   (`started_at`/`completed_at` appear only in the artifactSchemaRef
   text); read by no tool and no skill.
7. **The manual-mode marker (known-future).** pi-harness-evals map
   "Decisions so far" ("Manual-mode gate") requires a frontmatter marker
   that makes implement-task hard-refuse autonomous dispatch; today no
   field is defined and no router step reads one (see Known-future).
8. **ui-noter.** `resources/feature/autonomous.md` "Step 2" dispatches
   `agent: "ui-noter"` in the parallel fanout and its prompt writes
   `impeccable-note-*.md` files; no `agents/ui-noter.md` exists (the
   agents directory holds architecture-scout, code-reviewer,
   deviation-reporter, land-worker, skill-reviewer, slice-verifier,
   tdd-worker) and `package.json` `pi.subagents` points only at
   `./agents`. The downstream consumer exists (finalize-task "Step 2,
   Impeccable note check") but its producer cannot run; the check
   silently skips ("If none exist: skip this step silently"). The
   referenced `/impeccable` skill is not part of this package either.
9. **Knowledge harvest, changelog, bug closure, archiving git steps.**
   finalize-task Steps 3-7 fold docs, append CHANGELOG, edit and archive
   bug docs, and git-mv the task directory; all file/git operations, no
   tool involvement (the only tools in the skill are the five named
   above).
10. **The bug domain.** No tool covers `docs/bugs/` at all:
    `task_list` scans `docs/tasks/` only, bug closure reads the `bug:`
    field by prose, and the router's bug-queue answer is a bash grep
    (`task-workflow-overview` "Read-only queries").
11. **The current-map pointer.** The map's Fog asks whether state.yaml
    needs a first-class map pointer; today the pointer is prose-only:
    the `map:` field in task frontmatter (readable via `task_list`'s map
    filter) and the map slug passed around in skill invocations.
    `src/core/state.ts` carries only `task` and `slice`.
12. **setup-workflow's schema detection.** "## Detection" reads
    `docs/tasks/state.yaml`'s `schema_version` as a file; no tool
    exposes it (`task_state` shows task/slice only), which is what makes
    the task_state_set key-wipe (Contradictions 5) a silent corruption
    of the migration detector's input.

## Slice-machinery verdict evidence

Every invocation and prose touch of the slice machinery, named and cited,
so G1 can decide demote/freeze/delete.

Tool invocations:

- `task_slices`: `skills/engineering/implement-task/SKILL.md` telemetry
  note ("from the task doc's `slices:` list or `task_slices`");
  `resources/feature/autonomous.md` "Step 0 -- Prerequisites" (lines
  "Run `task_slices <slug>` to enumerate." and `const pendingSlices =
  task_slices(taskSlug)`); `resources/bug/autonomous.md` "Step 0 --
  Prerequisites" (`const slice = task_slices(taskSlug)[0]`);
  `skills/engineering/task-workflow-overview/SKILL.md` "Read-only
  queries" (`task_slices <slug>` "for legacy tasks"). Four call sites,
  all in the two autonomous implementation pipelines or answer-table
  prose, and all operating on legacy slice docs only.
- `task_set_slices`: zero invocations anywhere in `skills/`. Only
  `tests/plugin.test.ts` and the registration in `src/pi.ts` reference
  it. The nearest workflow prose is the failure toolbelt's "update the
  task doc `slices:` list" (`resources/feature/autonomous.md`
  "Failure toolbelt"; `resources/bug/autonomous.md` "Failure toolbelt"),
  which does not name the tool.
- `task_finalizable`: `skills/engineering/finalize-task/SKILL.md` "Step
  0, Prerequisites"; `skills/engineering/task-workflow-overview/SKILL.md`
  "Read-only queries". Its check is "no active slice docs"
  (`src/pi.ts`), i.e. legacy-doc absence, not list-derived completion.
- `task_state_set` with `slice`: exactly two prose sites, both clears:
  `finalize-task` "Step 7" (`task_state_set slice null`). Nothing in any
  skill ever sets `slice` to a value; `resources/feature/autonomous.md`
  "Step 2" sets only `task`. The state field has a clearer and no
  setter.
- `task_dependency_levels` task branch (legacy slices):
  `resources/feature/autonomous.md` "Step 2" and
  `resources/feature/human.md` "2. Handoff each slice to the human". Its
  map branch (v3 tasks) is the live path used by to-tickets "### 5" and
  wayfinder/implement-task frontier work.

Slice prose across the skills:

- `skills/engineering/wayfinder/resources/bug.md` "Slice planning": "A
  bug normally gets one default vertical slice"; slice doc frontmatter
  with `mode: afk`.
- `skills/engineering/wayfinder/resources/feature.md` "Slice planning":
  "Break the feature into tracer-bullet vertical slices"; slice docs with
  `mode: hitl | afk`.
- `skills/engineering/wayfinder/resources/{research,prototype,grilling,manual}.md`:
  each says "no slices" for its task type.
- `skills/engineering/to-tickets/SKILL.md` "### 3. Draft vertical
  slices": `<vertical-slice-rules>` and `slices: [<slice-slug>, ...]` in
  task frontmatter; "### 5" creates no slice docs.
- `resources/feature/autonomous.md`: "Step 0" (slices: list + Test plan
  + size + blocked_by per slice), "Step 2" (per-slice chains, levels),
  "Failure toolbelt" (split into `slices/<N>a-<slug>.md`, mark slice N
  `status: split`).
- `resources/bug/autonomous.md`: "Step 0" (single slice at
  `docs/tasks/${taskSlug}/slices/<n>-${slice}.md`), "Failure toolbelt"
  (same split).
- `resources/feature/human.md` and `resources/bug/human.md`: per-slice
  handoff and verification loops; no slice tool.
- `skills/engineering/finalize-task/SKILL.md` "Step 0" ("no open
  slices").
- `skills/engineering/task-workflow-overview/SKILL.md` "Read-only
  queries": `task_slices <slug>` for legacy tasks.
- `skills/engineering/tdd/SKILL.md`: "one red-green slice at a time"
  vocabulary (referenced from the router's main flow), tdd-worker
  consults it per slice.
- `agents/land-worker.md`: archives the slice doc ("git mv {slicePath}
  docs/tasks/{taskSlug}/slices/archive/..."), "Check remaining slices.
  If last, set task to done."
- `src/pi.ts` `artifactSchemaRef`: a section literally titled "###
  Legacy Slice (slices/<n>-<slug>.md)".
- `src/core/art.ts` `sliceInfoFrom` + `dependencyLevels`: the slice graph
  model (number, slug, status, size, blocked_by).

state.yaml slice field usage: `src/core/state.ts` `WorkflowState` is
`{ task, slice }` and `toObject`/`fromObject` carry both; the working
tree's `docs/tasks/state.yaml` reads `task: tool-surface-inventory` /
`slice: None` (a string, not null). Writers in the flow: only
`task_state_set` (set `task` in the feature pipeline; clear both in
finalize-task). Readers in the flow: none (`task_state` is an
answer-table query; the `slice` value feeds only `resolveArt`'s
active-task slice scan, `src/pi.ts`, which no v3 skill exercises).

Corpus check: no non-archived `docs/tasks/*/slices/` directory exists in
the tree (find shows slice directories only under `docs/tasks/archive/`),
and no live task carries slice docs. The v3 flow as prose-specified
produces zero legacy slice docs; the only producers left are wayfinder's
forbidden feature/bug resources (Contradictions 6) and the failure
toolbelt's ad-hoc splits.

Summary for G1: the slice machinery's load-bearing consumers are exactly
the two autonomous implementation pipelines, which only function when
legacy slice docs exist; the sanctioned v3 producers (to-tickets) emit a
list the machinery never reads; the tool built to write that list
(task_set_slices) has zero callers; the `slice` state field has no setter;
and the corpus contains no live legacy slices. Every slice tool also has
at least one non-slice consumer to consider before deletion:
`task_dependency_levels` and `task_frontier` have live map branches,
`task_set`/`task_get`/`task_state_set` serve non-slice fields, and
`task_finalizable` is finalize's gate regardless of slice semantics.

## Known-future requirements check

1. **Two-phase to-spec/to-tickets model.** What it implies for the tool
   surface: (a) recognition of the spec artifact or at least no
   false-ready reporting for spec-only directories; (b) creation and
   registration primitives for tickets and map children (or an explicit
   decision that creation stays file-based and the "task_* tools for the
   graph" claim is rescoped to queries); (c) a slice notion that either
   reads the `slices:` list or stops being emitted by to-tickets. What
   exists today: nothing on any of the three. `task_context`'s schema
   text actively denies the phase (Contradictions 1); a spec-only
   directory is invisible to `resolveArt` (it scans for `task.md`/
   `map.md`), to `mapChildInfos`, and to `task_map_finalizable`
   (No-tool-support 3); no tool creates anything; and the slice
   question is the entire Slice-machinery section. The only v3-aligned
   tool support that does exist is the map-side graph: `task_frontier`,
   `task_dependency_levels` (map branch), `task_map_tick`,
   `task_map_finalizable`, and `task_list`'s map filter.
2. **Manual-mode marker** (pi-harness-evals map "Decisions so far":
   "Manual-mode gate"; Fog: "Exact frontmatter field name and router
   mechanics ... To be fixed in to-spec"; the consuming spec
   `docs/tasks/build-eval-creator-skill/spec.md` "Manual-mode gate":
   "a frontmatter marker on tasks/slices makes the task router
   hard-refuse autonomous subagent dispatch and hand off to the human
   with the `/skill:` name"). What it implies: a named frontmatter field
   on tasks and/or slices, plus a router step that reads it before
   dispatch and a hard-refuse behavior. What exists today: no field is
   defined anywhere; the implement-task router reads only `type`
   (`task_get(taskPath, "type") || "feature"`), the mode routers
   (`resources/feature.md`, `resources/bug.md`) parse invocation prose,
   and the recorded decision
   (`docs/tasks/archive/decide-human-implementation-mode/task.md`) is
   deliberately prose-only with the marker recorded as its "narrow,
   documented exception". `task_get` could read any field once named,
   and `task_assert_kind` shows the shape of a refusing tool, but no
   prose reads a marker today and no tool enforces one.

## Uncovered areas

- No workflow tool was executed during this audit. All tool-behavior
  claims were verified by reading `src/pi.ts` and `src/core/{art,state}.ts`
  in the working tree; a live cross-check (for example actually running
  `task_map_finalizable` on the pi-harness-evals map, or `task_slices` on
  a to-tickets-shaped task) would upgrade Contradictions 3-4 and
  No-tool-support 3 from code-verified to run-verified.
- The R1 catalog (`docs/tasks/tool-surface-inventory/findings.md`) was
  not available (R1 concurrent, only its task.md exists); per the task
  doc's trusted-source rule `src/pi.ts` was read directly instead.
- Companion and reference files that grep showed contain no tool
  mentions were not read line-by-line: prototype's `LOGIC.md`/`UI.md`,
  domain-modeling's `ADR-FORMAT.md`/`CONTEXT-FORMAT.md`, tdd's
  `tests.md`/`mocking.md`, code-review's `smells.md`, skill-creator's
  `agent-skills-spec.md` and `support-scripts*.md` (only `target-pi.md`
  was read, for the telemetry frontmatter), and eval-review's
  `isolation-checklist.md` (read).
- Out of the named audit scope and only skimmed: `triage` (its head was
  read; it records state in `status:` frontmatter and uses
  telemetry_skill_context plus submit_feedback, but its role vocabulary
  is not in artifactSchemaRef's status enum), `diagnosing-bugs`,
  `codebase-design`, `improve-codebase-architecture`, and the remaining
  productivity skills.
- The `ui-noter` finding (No-tool-support 8) was verified by listing
  `agents/` and `package.json`; whether a pi-subagents run would fall
  back gracefully or error on an undefined agent name was not tested.
