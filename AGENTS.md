# AGENTS.md — task-workflow

Pi package for a task-oriented planning workflow:
task → slices → TDD → finalize. Everything lives in `docs/tasks/` under
version control with no external issue tracker.

## Repository layout

```
skills/             ← SKILL.md files (one per sub-directory)
  create-task/        Inline task definition and per-slice testing interviews
  implement-slice/    Build a single slice (TDD → verify → diverge → land)
  pipeline-slices/    Build all remaining slices in one autonomous chain
  revise-task/        Inline revision of a task or (re-)analysis of slices
  finalize-task/      CI gate, harvest knowledge, archive, merge
  onboard-workflow/   Initialize docs/tasks/ in a fresh repo
  migrate-workflow/   Convert docs/prd/ → docs/tasks/
  resume-workflow/    Read state + artifacts, report current position
  task-workflow-overview/  Entry point: routes queries and actions
  adhoc-task/         Ephemeral TDD for small one-off work
  archive/            Obsolete skills
agents/             ← PiSubAgent definitions (tdd-worker, slice-verifier, etc.)
src/pi/             ← Extension source (task_* native tools, guidelines)
docs/               ← Package documentation
tests/              ← Integration tests
tools/              ← Developer tooling and demos
```

## Architecture

### Three-phase workflow

1. **create-task** — the only interactive phase. The parent agent interviews
   the user directly via `ask_user_question` — no subagents involved. Test
   plans are formalized by test-strategist (non-interactive subagent).
2. **pipeline-slices** or **implement-slice** — autonomous TDD implementation.
   Subagents never ask the user questions. When uncertain, they write a
   structured artifact and fail; the parent resolves and retries.
3. **finalize-task** — CI gate, knowledge harvesting, changelog, archive, merge.

### Subagent usage

| Skill | Subagent use |
|---|---|
| create-task | test-strategist (non-interactive, writes test plans) |
| implement-slice | worker → tdd-worker → slice-verifier → worker → worker (all non-interactive) |
| pipeline-slices | Same chain repeated per slice |
| revise-task | test-strategist (non-interactive, if slices re-analysed) |
| finalize-task | worker → task-summarizer → worker |

Subagents **never use `contact_supervisor` or `subagent_supervisor`**. When
they encounter uncertainty, they write a structured artifact and fail. The
parent reads the artifact, resolves the question (with the user if needed),
and retries.

### Agent roster

| Agent | Role | Interactive? |
|---|---|---|
| `test-strategist` | Designs test plans from requirements and failure modes | No |
| `tdd-worker` | RED → GREEN → REFACTOR implementation; writes uncertainty artifact on ambiguity | No |
| `slice-verifier` | Hard lint + test gate | No |
| `worker` | Generic implementation, landing, and archival tasks | No |
| `task-summarizer` | Writes changelog entries | No |
| `grill-agent` | *(deprecated)* — moved inline into create-task/revise-task skills | — |
| `approval-agent` | *(deprecated)* — parent owns approval inline | — |

All agents run with `context: "fresh"` and `inheritProjectContext: true`.

### Interactive design pattern

Interactive questioning (grill-agent, approval-agent) has been moved from
subagents into the parent skills. The parent agent uses `ask_user_question`
directly:

- **create-task**: Parent interviews user for task definition and per-slice
  testing strategy, one question at a time with recommended answers.
- **revise-task**: Parent reads current state, interviews user about changes,
  applies edits directly.

Non-interactive work (TDD, verification, test plan writing, archival) is
still delegated to subagents.

### Fail-with-context pattern

Subagents never ask the user questions. When uncertain, they:

1. Write a structured artifact (e.g. `uncertainty.md`, `divergence.md`)
2. Fail the chain step
3. The parent detects the failure, reads the artifact, resolves (via
   `ask_user_question` if needed), and retries with the resolution

This avoids the fragile supervisor/intercom bridge entirely.

### Task tools

The extension registers 18 `task_*` native tools (`task_show`, `task_set`,
`task_list`, `task_slices`, `task_state`, etc.) that are the ONLY interface
to the `docs/tasks/` tree. Never shell out or hand-edit frontmatter — use
the tools.

## Conventions

### Skills

- Every skill is a `skills/<name>/SKILL.md` with YAML frontmatter
  (`name`, `description`).
- Skills own all interactive questioning via `ask_user_question`.
- Template variables `{chain_dir}`, `{previous}`, `{task}` are used in chain
  step task prompts for context flow between steps.
- Acceptance is disabled (`level: "none"`) for planning steps; the workflow's
  own gates (user approval, worker finalization) verify enough.

### Versioning

- Source of truth: `package.json` `version` (kept in sync with `package-lock.json`).
- Tags: annotated `vX.Y.Z` (never lightweight).
- Release commits: `chore: release vX.Y.Z`.
- Use `.pi/skills/release/SKILL.md` (`/skill:release`).

### No editing the installed copy

**Never edit files under `/home/patric/.pi/agent/git/codeberg.org/Yashin/skills/`**
or any `~/.pi/` path. That is the installed/cached copy. Always work in the
working copy at this repo's root. After publishing, refresh the installed copy
with `pi update task-workflow`.

## Testing

```sh
npm test          # vitest run
npm run typecheck # tsc --noEmit
```

Integration tests in `tests/` exercise the extension tools and agent chains.
Developer demos in `tools/` are not part of the test suite.

## Package manifest

`package.json` `pi` block is the single source of truth for auto-discovery:

```json
"pi": {
  "extensions": ["./src/pi/index.ts", "./src/pi/guidelines.ts", ...],
  "skills": ["./skills/create-task", "./skills/finalize-task", ...],
  "subagents": { "agents": ["./agents"] }
}
```

No build step — Pi discovers skills and agents from the manifest at runtime.
