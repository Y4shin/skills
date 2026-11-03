---
type: map
title: "Locally set-up repos: the core workflow with state outside the repo"
status: stable
---
# Locally set-up repos: the core workflow with state outside the repo

## Destination

The same installed task-workflow package runs in two setups: the regular setup, where the workflow's files live inside the repo, and the local setup, where the repo carries none of the workflow's files and all workflow state lives in a per-repo directory on the local machine. A locally set-up repo supports the full core arc (intake, wayfinder, to-spec, to-tickets, implement, finalize), with reduced functionality: repo-side knowledge artifacts are skipped and collected instead, and the external task tracker is handled through hooks declared in the local state. Each setup gets its own deliberate initialization step, and detection never guesses silently.

## Constraints

- One installed Pi package serves both setups; work repos receive the work's own changes but never workflow files.
- Local state is single-machine and single-operator; nothing syncs or shares it.
- Terminology: a regularly set-up repo carries the workflow's files inside the repo; a locally set-up repo keeps all workflow state outside the repo, on the local machine. The raw request's "non-set-up" framing is retracted, because a local setup is still a setup.
- How the skills serve both setups (variants, resource files, or otherwise) stays open for the spec. The local state root, its keying, its marker, and the hook declaration are settled in `## Decisions so far`; the raw request's two-variants-inside-each-skill sketch and its `~/.pi/task-workflow/external-state/` path were possibilities, and research replaced both.

## Non-goals

- No second package or fork of the workflow for work repos: the same installed package serves both setups.
- No built-in adapters for specific trackers (Jira, Linear, GitHub Issues): only the declared hook mechanism.
- No conversion between the two setups, in either direction.
- No syncing or sharing of local state across machines or people.
- No orphan detection or repair when a repo path moves or renames, in this effort.
- No zero-setup mode: a local setup is still a setup.

## Non-negotiable facts

**Success test:** In a repo that has none of the workflow's files, after a local initialization that lives entirely outside that repo, the full arc (intake, wayfinder, to-spec, to-tickets, implement, finalize) runs end to end; afterwards the repo contains the work's own changes and nothing that belongs to the workflow, and all workflow state lives under the local state root; an external task tracker was handled through a declaration, not hardcoded support.

- Nothing workflow-related is written into a locally set-up work repo; all workflow state, the initialization included, lives under the local state root.
- Initialization is explicit: when a repo has neither setup, the workflow asks which one to initialize; the regular setup initializes through `setup-workflow`, the local setup through a dedicated sister skill.
- Having both setups for one repo is an unsupported state: the workflow refuses to work until the local setup is removed.
- Regularly set-up repos behave exactly as today; the local setup is purely additive.
- Explicit degradation: in a locally set-up repo, every skipped or degraded piece is named in the run's output with the substitute's location; silent degradation is a defect.
- Knowledge artifacts (CONTEXT.md, ADRs, docs pages, changelog) are skipped in locally set-up repos: the run collects what it would normally document, guided by prose instructions describing the repo's documentation, and finalize reviews how to integrate the collected material into the repo's existing documentation. Rationale: knowledge artifacts that not everyone maintains go stale quickly.
- The external task tracker is handled through a hook system declared in the local state: hooks fire at workflow milestones (for example, when the spec exists), notify the agent to do the declared work, and can gate continuation until that work is done. No specific tracker is hardcoded. Hooks are declared only in the local state, so this effort ships them for local setups only.

## Decisions so far

- `settle-non-negotiables`: the success test, non-negotiable facts, and non-goals are settled; the tracker bridge widened into a milestone hook system declared in the local state, and the both-setups state is refused rather than resolved by preference.
- `survey-in-repo-assumptions`: one resolved workflow root (the repo's `docs/tasks` in a regular setup, the per-repo local directory in a local setup) replaces the hardcoded root at every site that resolves it, including the write lockdown, the setup stamp, and the path strings in tool descriptions. `setup-workflow`'s scaffold, the knowledge-artifact writes, and the `git add docs/tasks/` commits are skipped in local setups; the CI gate, the branch merge, and the push stay untouched because they are repository operations. `state.ts` and `frontmatter.ts` need no change; `migrate.ts` and `fs-port.ts` need an injected root.
- `research-local-state-root`: local state lives at `<agent-dir>/task-workflow/local-state/repos/<slug>-<hash12>/`, with the agent dir resolved through `getAgentDir()` rather than a hardcoded `~/.pi/agent`. The per-repo key is the canonical (symlink-resolved) repo path, rendered as a readable slug truncated from the leaf side plus 12 hex characters of its SHA-256. This was chosen over pi's session-style encoding, which was verified to collide (`/x/a/b` and `/x/a-b`), to overflow the 255-byte name limit, to leave paths outside `$HOME` with `..` in the name, and to be lexical rather than canonical. The marker is `local-setup.yaml` in that directory, holding `schema_version`, `kind: local`, `repo` (the canonical path), and `created_at`; detection reads it with a plain existence check that never creates a directory, then verifies `repo` against the detected path.
- `design-hook-mechanism`: hooks are declared in `hooks.yaml` beside the effort state file and recorded in a separate `hook-state.yaml`, keyed `<effort>/<milestone>/<hook-id>`. A hook names a milestone token, `when` (gate or notify), a scope (phase or milestone), a prose instruction, and `done_when: evidence`. Milestone tokens are the single-writer `tw_*` transitions plus the phase boundaries. A gate hook lets the milestone write land, then refuses the next transition in the established `Refused: ... Legal next: ...` shape until a new `tw_hook_done` records evidence; `tw_hook_skip` with a mandatory reason is the escape hatch for an external outage, and its use shows up in the run's degradation report. `hooks.yaml` and the recovery surfaces (`tw_open`, `before_agent_start`, `session_start`) are the delivery channel; the pi `tool_call` hook stays reserved for the write lockdown.

Decisions taken here from the research, not tied to a single task:

- Setup detection reads the local marker first (read-only), then today's `isDir(docs/tasks)` rule. A repo with neither refuses and names both initializations; a repo with both refuses until the local setup is removed. The regular path is unchanged for repos that already work.
- The local initialization counterpart owns schema upgrades of the local state (the marker and the hook declaration versions), mirroring `setup-workflow`'s migration role.
- Archiving a locally set-up effort is local only: the work repo keeps only the work's own commits, so "archived" means archived under the local state root.
- The explicit-degradation notice covers the core arc. Non-arc skills (`code-review`, `domain-modeling`, `tdd`, `improve-codebase-architecture`) keep their current behaviour and are outside this effort.
- Notify hooks are recorded like gate hooks, so the degradation report can name them. `done_when: evidence` requires a non-empty reference to the artifact that was created; typed per-hook checks are a later addition.
- Milestones that no single writer terminates are taken from the phase boundaries (`tw_open`, `tw_close`), not from new writer tools.

## Fog
