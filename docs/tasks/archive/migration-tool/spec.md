---
type: spec
title: Run the schema migration through a disclosed tool
status: stable
---

## Problem Statement

A repo operator who installed the workflow package through `pi install` and runs `/skill:setup-workflow` on a repo whose task tree is on an older schema gets a failure before anything is written. The skill's migrate branch instructs the agent to run a CLI script that ships in the bundle, and that script cannot run from an installed copy: it starts a separate Node process on the package's TypeScript sources, and Node refuses to strip types for any file under `node_modules`. From the operator's perspective the shipped migration command is dead weight: the skill that promised the hop to the current schema fails at its first step, and migrating stays possible only for maintainers working inside a checkout of the workflow repository.

A second gap, folded in by the operator: the migrate branch's git handling creates a migration branch and switches to it, but it never defines how the work returns to the branch the operator was working on, so a run leaves the repo stranded on the migration branch.

## Solution

The migrate branch of `/skill:setup-workflow` runs the migration by calling a registered tool, `tw_migrate`, which the phase discloses through its opener (`tw_open`) and withdraws on close. The tool executes the existing migration transformation in-process, the same way every registered workflow tool loads and runs its code, and returns the migration report: the from and to schema versions, every change, and every item needing human attention. Because nothing spawns a separate Node process, the module-loading restriction that broke the installed copy cannot occur, and migration works from any installed package with no checkout of the workflow repository. The three CLI files are removed from the package, so the skill can no longer instruct an agent to run a command that fails.

The skill's prose gains an explicit branch choreography: the migration runs on a dedicated migration branch created from the branch the operator was on, the changes are fast-forwarded back onto that branch (with explicit approval when it is not `main` or `master`), and the migration branch is deleted afterward.

## User Stories

1. As a downstream repo operator, I want the migrate branch of `/skill:setup-workflow` to execute the migration through the tool it discloses, so that migrating a repo works on a copy of the package installed through `pi install`, with no checkout of the workflow repository.
2. As a downstream repo operator, I want the migration tool to return the same report the CLI printed, listing every change and every item needing human attention, so that how a migration run is reported does not change.
3. As a downstream repo operator, I want a dry-run parameter on the migration tool, so that I can preview the planned changes before anything is written.
4. As the package maintainer, I want the shipped package to carry no migration command that cannot run from an installed copy, so that the skills never instruct an agent to run a command that fails.
5. As a downstream repo operator, I want the migration to run in-process in the extension host rather than in a spawned Node child, so that the module-loading restriction that broke the CLI cannot recur.
6. As a downstream repo operator, I want the migration tool to be reachable only while the setup-workflow phase is open, so that the registered tool surface stays minimal and the tool is not callable outside its phase.
7. As a downstream repo operator, I want the migration work (tool call, test suite, commit) to happen on a dedicated migration branch created from the branch I was on, so that my current branch is never modified directly by the migration.
8. As a downstream repo operator, I want the migration changes fast-forwarded onto the branch I was on when the skill was invoked, so that the migration lands where I was working.
9. As a downstream repo operator, I want to approve the fast-forward explicitly when the skill was invoked on a branch other than `main` or `master`, so that I stay in control of what lands on my working branch.
10. As a downstream repo operator, I want the migration branch deleted after the fast-forward, so that no dangling branch is left behind.
11. As a downstream repo operator, I want the migration's existing safety guarantees unchanged (a no-op when the tree is already current, nothing written when a step fails, resumability), so that redirecting the executor does not weaken the migration.
12. As the agent running the skill on the operator's behalf, I want the tool's report to separate changes from items needing human attention, so that I can surface exactly those items to the operator.
13. As a downstream repo operator, I want the shipped documentation for the skill and its upgrade resources to describe the tool as the executor, so that no page instructs a command that no longer exists.
14. As the package maintainer, I want the domain glossary to name the migration tool as part of the registered surface, so that the project's language matches the shipped behavior.

## Implementation Decisions

The decisions below were settled during planning (the seed grilling of this effort); nothing new is settled here.

1. **Executor redirection.** The migrate branch calls the registered tool `tw_migrate`, never a shell command. The tool joins the setup-workflow phase's toolset in the disclosure registry: disclosed by the phase opener, withdrawn by the closer, never declared in the default idle set, never active by default. The registry entry's comment, which currently says the phase runs the migration CLI through the shell, is updated to say it runs the migration through the disclosed tool.
2. **In-process execution.** The tool calls the existing migration transformation (the pure function over the tree port) directly, in-process in the extension host, with the production filesystem port over the target tree's root, located the same way every workflow tool locates the tree. It never spawns a Node child process. The module-loading restriction that broke the CLI applies only to spawned processes, so it cannot recur.
3. **Tool contract.** Migration execution only. The tool takes a dry-run flag and returns the rendered migration report, the same rendering the CLI produced: the from and to schema versions, every change (action, path, detail), every item needing human attention (kind, path, detail), and the already-current no-op answer. A dry run computes the report and writes nothing. Backup-branch handling, the test-suite run, the commit, the fast-forward, and the surfacing of needs-human items stay with the skill.
4. **Removals.** The CLI shim, its TypeScript resolve hook, and the argv wrapper CLI are deleted. The report rendering moves from the wrapper into the tool. The tool becomes the only migration executor the package ships.
5. **Unchanged core.** The transformation, its step semantics, its report semantics, its idempotence, its progress marker (an optimization, not the source of truth), and its atomicity guarantees (every rewrite verified before anything lands; a failure leaves the tree untouched) are not reopened by this effort.
6. **Skill prose, migrate branch.** The migrate branch is rewritten: the tool call replaces the shell command, and the branch choreography is made explicit: (a) record the branch the agent was on when the skill was invoked (the integration branch); (b) create the migration branch (`migrate/schema-${from}-to-5`) from it; (c) run the migration tool, the test suite, and the commit on the migration branch; (d) fast-forward the integration branch to the migration branch's tip, asking for explicit user approval first when the integration branch is not `main` or `master`; (e) delete the migration branch after the fast-forward, because it is dangling and no history is lost; (f) end the run on the integration branch. The dry-run prose moves from a CLI flag to the tool parameter, and the backup-branch safety prose follows the new choreography.
7. **Skill prose, other branches.** The onboard and no-op branches of the skill are untouched.
8. **Glossary.** The Migration entry in the domain glossary loses its "not a tool in the registered surface" clause and names `tw_migrate` as the executor the setup-workflow phase discloses.
9. **Documentation.** The skill's docs page is re-synced to the new executor and branch choreography, per the repo rule that a behavior change re-syncs the promoted skill's page. The upgrade resources are checked for stale executor references and reworded where they name the CLI.

## Testing Decisions

- A good test drives the public contract and asserts externally visible results: the tool's returned report and the state of the fixture tree on disk. The transformation's internals already have their own suite and are not re-tested through the tool.
- The tool is tested through the public tool factory (the same import the existing structure tests use), called over real fixture trees on disk: an old-vintage fixture migrates and the report matches; a dry run reports the plan and leaves the tree byte-identical; an already-current tree gets the no-op answer; a fixture that produces needs-human items yields a report that separates them from changes.
- The disclosure tests assert the new toolset membership: the tool is disclosed by the setup-workflow open, withdrawn by the close, and absent from the default set. Prior art: the existing disclosure, opener-gate, and disclosure-API tests.
- The skill prose structure tests keep asserting the safety themes (backup, dry-run, idempotence) and gain assertions for the tool as the executor. Prior art: the existing setup-workflow reference tests in the structure test suite, including the ones asserting the target-state spec reference and the promoted-skill registration.
- The executor-seam coverage carries over from the current spawn-based shim tests (exit code plus stdout report against a fixture tree), with the spawn replaced by the tool call.
- The removed CLI files take their tests with them: no CLI coverage remains because no CLI remains.

## Out of Scope

- Reopening the migration transformation itself: same steps, same report semantics, idempotence, resume marker, atomicity.
- Moving backup-branch creation, the test-suite run, the commit, the fast-forward, or needs-human surfacing into the tool; those stay with the skill.
- Touching the onboard and no-op branches of `setup-workflow`.
- Building a general bundled-CLI-to-tool mechanism usable by other scripts.
- Migrating any downstream repo as part of this effort.

## Further Notes

- The motivating defect, verified during intake: the CLI shipped in the npm bundle but could not run there. The shim spawned a Node child with type stripping on the package's TypeScript sources, and Node refuses that for any file under `node_modules`, so the migrate branch failed on every installed copy before writing anything. The effort is classified as a feature (the executor redirection); no separate bug ticket exists.
- The branch choreography was folded into this effort by the operator, judged too small to be its own effort.
- The removed CLI was the only documented way to run the migration outside the skill; after this effort the skill's migrate branch is the only executor. Anyone who called the shim directly moves to the skill.
- Consequence for the ticket graph: the modules in play are the disclosure registry, the extension entry (the tool definition and its rendering), the migration core (unchanged, imported), the skill file, the upgrade resources, the skill's docs page, the domain glossary, and the test suite.

> The architecture content in this specification is archival: the living architecture document is [architecture.md](architecture.md); update it there, not here.
