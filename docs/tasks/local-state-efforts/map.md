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
- The implementation shape stays open for the spec: how the skills serve both setups (variants, resource files, or otherwise), where supporting material lives, and the exact local-state layout and naming. The raw request's two-variants-inside-each-skill sketch and its `~/.pi/task-workflow/external-state/` path are possibilities, not decisions.

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

## Fog

- The shape of the collected documentation and of finalize's integration review, and whether that review is built in or an instance of the hook system.
- Whether the local initialization counterpart owns schema upgrades of existing local state, mirroring setup-workflow's migration role.
