# AGENTS.md — task-workflow

Pi package for a task-oriented planning workflow:
task → slices → TDD → finalize. Everything lives in `docs/tasks/` under
version control with no external issue tracker.

## Repository layout

```
skills/             ← SKILL.md files (one per sub-directory)
  create-task/        One interactive session: task def + per-slice test plans
  implement-slice/    Build a single slice (TDD → verify → diverge → land)
  pipeline-slices/    Build all remaining slices in one autonomous chain
  revise-task/        Dynamically revise a task or (re-)analyse slices
  finalize-task/      CI gate, harvest knowledge, archive, merge
  onboard-workflow/   Initialize docs/tasks/ in a fresh repo
  migrate-workflow/   Convert docs/prd/ → docs/tasks/
  resume-workflow/    Read state + artifacts, report current position
  task-workflow-overview/  Entry point: routes queries and actions
  adhoc-task/         Ephemeral TDD for small one-off work
  archive/            Obsolete skills (design-test-strategy, develop-tdd, etc.)
agents/             ← PiSubAgent definitions (tdd-worker, grill-agent, etc.)
src/pi/             ← Extension source (task_* native tools, guidelines, startup checks)
docs/               ← Package documentation (artifacts reference, guidelines)
tests/              ← Integration tests
tools/              ← Developer tooling and demos
```

## Architecture

### Three-phase workflow

1. **create-task** — the only interactive phase. User defines the task AND
   reviews test strategies for all slices in one sitting.
2. **pipeline-slices** or **implement-slice** — autonomous TDD implementation.
   Agents ask only when uncertain or when plan divergences threaten remaining
   slices.
3. **finalize-task** — CI gate, knowledge harvesting, changelog, archive, merge.

### Subagent chains

All orchestrator skills dispatch `subagent({ chain: [...] })`:

| Skill | Chain |
|---|---|
| create-task | grill-agent → grill-agent → test-strategist → approval-agent → worker |
| implement-slice | worker → tdd-worker → slice-verifier → worker → worker |
| pipeline-slices | implement-slice steps repeated for each remaining slice |
| revise-task | Dynamic: composed at runtime based on what needs changing |
| finalize-task | worker → task-summarizer → worker |

Interactive chains (`grill-agent`, `approval-agent`) use
`contact_supervisor` for user interaction. The parent agent's loop
(`wait()` → `subagent_supervisor({ action: "pending" })` → relay → reply)
is the bridge.

### Agent roster

| Agent | Role |
|---|---|
| `grill-agent` | Autonomous interviewer — explores codebase first, asks one question at a time |
| `approval-agent` | Presents plans for approval, handles revise-re-present loop |
| `test-strategist` | Designs test plans from requirements and failure modes |
| `tdd-worker` | RED → GREEN → REFACTOR implementation |
| `slice-verifier` | Hard lint + test gate |
| `task-summarizer` | Writes changelog entries |

All agents run with `context: "fresh"` and `inheritProjectContext: true`.

### Task tools

The extension registers 18 `task_*` native tools (`task_show`, `task_set`,
`task_list`, `task_slices`, `task_state`, etc.) that are the ONLY interface
to the `docs/tasks/` tree. Never shell out or hand-edit frontmatter — use
the tools.

## Conventions

### Skills

- Every skill is a `skills/<name>/SKILL.md` with YAML frontmatter
  (`name`, `description`).
- Skills that dispatch chains include the full parent loop in the SKILL.md.
- Template variables `{chain_dir}`, `{previous}`, `{task}` are used in chain
  step task prompts for context flow between steps.
- Acceptance is disabled (`level: "none"`) for planning/interview steps;
  the workflow's own gates (user approval, worker finalization) verify enough.

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