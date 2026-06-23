---
name: prd-workflow-overview
description: Entry point for PRD/epic/slice questions in repos using the prd-workflow (docs/prd/ tree). Use when: 'is this PRD ready?', 'what's left on epic/PRD X?', 'list the PRDs / show the planning tree', 'status of epic X?', 'is the planning tree valid?', or the first PRD/epic/slice question in a fresh conversation. Routes action requests to the matching workflow skill (create-epic, implement-issue, finalize-prd, …).
allowed-tools: Bash(node *)
---

# Working with PRDs (prd-workflow)

This repo uses the **prd-workflow**: a planning tree under `docs/prd/` of epics, PRDs, and
slices, managed by a bundled helper. Wherever a command below is written as `prd_tool`, run
it as the absolute command printed here (the bundled CLI) — `prd_tool` is shorthand, not a
binary on your PATH:

!`node "${CLAUDE_SKILL_DIR}/../../scripts/prd-tool.js" toolpath`

(On opencode the same operations are exposed as native `prd_*` tools — prefer those; the
shorthand above is for the Claude/Bash path.)

If the version gate below prints a STOP block, the repo's workflow is uninitialized or out
of date — tell the user to run the named skill before any workflow operation:

!`node "${CLAUDE_SKILL_DIR}/../../scripts/prd-tool.js" workflow-gate`

The artifact schema + directory layout + lifecycle (what a "PRD", a "slice", or "ready"
actually means here):

!`node "${CLAUDE_SKILL_DIR}/../../scripts/prd-tool.js" reference`

The current planning tree (epics + PRDs with their status and issue numbers):

!`node "${CLAUDE_SKILL_DIR}/../../scripts/prd-tool.js" list`

Project profile (optional project-specific context), if present:

!`node "${CLAUDE_SKILL_DIR}/../../scripts/prd-tool.js" profile`

## Answering questions — read-only commands

Map the user's question to a command, run it, and answer **from its output**. On Claude,
run `prd_tool <…>` via Bash; on opencode, call the matching native tool. **Reply format**:
name the command you ran, quote the relevant line(s) of its stdout (and exit status when it
determines the answer, e.g. for `prd-finalizable`), then state the answer in one sentence.

| The user asks… | Run (`prd_tool` = the path above) | opencode tool |
|---|---|---|
| "Is this PRD ready (to finalize)?" | `prd_tool prd-finalizable <slug>` | `prd_finalizable` |
| "What's left / which slices are open on PRD X?" | `prd_tool slices <slug>` | `prd_slices` |
| "List the PRDs / epics / what's in progress?" | `prd_tool list [--kind … --status … --epic …]` | `prd_list` |
| "Show PRD/epic X (its frontmatter / status)." | `prd_tool show <slug>` | `prd_show` |
| "What's the issue number / file path for X?" | `prd_tool resolve <slug>` · `prd_tool get <slug> <field>` | `prd_resolve` · `prd_get` |
| "Is the epic done / what are its child PRDs?" | `prd_tool epic finalizable <slug>` · `prd_tool epic prds <slug>` | `prd_epic_finalizable` · `prd_epic_prds` |
| "Is the planning tree valid / any malformed docs?" | `prd_tool show-violations` · `prd_tool list-bad-files` | `prd_lint` |

`<slug>` is the PRD/epic directory name (or its issue number, or a path to the file/dir).
Run `prd_tool --help` for the full command surface.

**"Is this PRD ready?" specifically:** `prd-finalizable` exits 0 with "ready to finalize"
when every slice has been implemented and merged, or it lists the still-open slice numbers
otherwise. Treat that exit status + output as the answer.

## Doing work — route to the right skill

For anything that *creates or changes* artifacts, invoke the matching skill by name. Each
skill injects the exact steps and provider-correct commands:

- New coordinated multi-PRD outcome → **create-epic** → **epic-to-prds**
- New user-facing feature → **create-feature-prd** → **feature-prd-to-issues**
- New foundational / no-UI capability → **create-capability-prd** → **capability-prd-to-issues**
- Plan a slice's tests → **analyse-issue**; build a slice (strict TDD) → **implement-issue**
- Close out a PRD → **finalize-prd**; close out an epic → **finalize-epic**
- Backfill a legacy planning doc into the schema → **adopt-prd**
- Stress-test a plan with the user before writing it → **grill-me**
- Set up / upgrade the workflow in this repo → **init-prd-workflow** / **update-prd-workflow**

## Rules

- **The bundled tool is the only interface** to the planning tree: use only the commands
  documented in `prd_tool --help` (Claude/Bash) or the matching `prd_*` tools (opencode),
  and follow each action skill's injected steps exactly. No ad-hoc scripts, no invented or
  remote APIs, no hand-editing frontmatter; ad-hoc approaches drift from the schema and
  corrupt workflow state.
- Answer read-only questions from the tool's output; for actions, invoke the matching skill
  by name and follow its injected steps.
- The provider (GitHub / Forgejo / local) is detected automatically and the action skills
  emit the correct commands — trust their output.
