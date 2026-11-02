---
type: ticket
subtype: feature
title: Add tw_migrate to the registered surface
status: stable
workflow_state: done
blocked_by: []
size: m
---

## What to build

The migration executes in-process in the extension host through a registered tool named `tw_migrate`. The setup-workflow phase's toolset in the disclosure registry gains the tool: the phase opener discloses it, the closer withdraws it, and the idle default set never declares it. The tool drives the existing migration transformation over the target tree through the production filesystem port, located the way every workflow tool locates the tree. It takes a dry-run flag and returns the same rendered report the CLI printed: the from and to schema versions, every change (action, path, detail), every item needing human attention (kind, path, detail), and the already-current no-op answer. A dry run computes the report and writes nothing. The report rendering moves from the argv wrapper into the tool, moved, not rewritten.

The domain glossary's Migration entry drops its "not a tool in the registered surface" clause and names `tw_migrate` as the executor the setup-workflow phase discloses. The registry entry's comment, which currently says the phase runs the migration CLI through the shell, says instead that it runs the migration through the disclosed tool.

The executor-seam coverage carries over from the spawn-based shim tests (report and tree state against fixture trees), with the spawn replaced by the tool call through the public tool factory.

## Acceptance criteria

- [ ] Opening the setup-workflow phase discloses `tw_migrate`; the matching close withdraws it; the idle default set does not declare it.
- [ ] Driven through the public tool factory over an old-vintage fixture tree, the tool migrates the tree and returns the report with the from and to versions, every change, and every needs-human item.
- [ ] With the dry-run flag set, the tool returns the plan and the tree stays byte-identical.
- [ ] An already-current tree returns the no-op answer and nothing is written.
- [ ] A fixture that produces needs-human items yields a report that separates them from changes.
- [ ] The tool executes the transformation in-process; no step spawns a Node child.
- [ ] The glossary's Migration entry names `tw_migrate` and no longer says "not a tool in the registered surface".
- [ ] The registry entry's comment says the phase runs the migration through the disclosed tool.

## Blocked by

None (can start immediately).

## Implementation notes

- Architecture lessons from the landing: the report rendering lives in the shared module `src/migrate-report.ts` (moved verbatim from the argv wrapper), imported by the tool and transitionally by the still-shipped wrapper, because the wrapper runs standalone under the resolve hook and cannot import the extension entry (its runtime import is a devDependency, unavailable to the spawned process in an installed package). `remove-migration-cli` deletes the transitional import and inherits the module as the tool's single renderer; its pure-deletion contract is unchanged.
- Four foreign registered-surface test tables gained `tw_migrate` (`tests/plugin.test.ts` registered names, `tests/gate-factory.test.ts` `GATED_NAMES`, `tests/opener-gate.test.ts` phase-to-toolset table, `tests/integration/disclosure.test.ts` `GATED_WORKFLOW_TOOLS`), and the `tw_request_tool` refusal scenario in `tests/opener-gate.test.ts` was re-scenariod: with `tw_migrate` added, setup-workflow now declares two tools no other phase declares, so granting `tw_context` no longer completes its set; the refusal path now opens wayfinder plus the nested skill-creator, grants `tw_context` (allowed), then requests `tw_migrate` (refused, naming setup-workflow). The containment guard's semantics are unchanged.
- The tool returns the conventional `outcome` details envelope (`from`, `to`, `noop`, `dryRun`, `changes`, `needsHuman` counts) around the frozen report text; failures throw `migration failed: <reason>`. That failure path is not pinned by a test in `tests/tw-migrate-tool.test.ts`: the spawn-based shim failure test covers it until `remove-migration-cli` deletes those tests, so that ticket should either add a one-test pin or accept the gap knowingly.

- Landed on `task/tw-migrate-tool` (merge 7dadf8e): `tw_migrate` is now a registered tool in the extension entry beside `tw_context`, parameters `{ dryRun?: boolean }`. It locates the tree through the shared root finder, runs the untouched `migrate()` core over the production filesystem port, fully in-process; no step spawns a Node child. It returns the rendered migration report (from and to schema versions, every change, every needs-human item, or the already-current no-op answer) wrapped in the conventional details envelope (`from`, `to`, `noop`, `dryRun`, `changes`, `needsHuman` counts); a dry run computes the report and writes nothing; failures throw `migration failed: <reason>`. The rendering moved verbatim into the shared module `src/migrate-report.ts` (see the harvest note above for why it is a module and not the extension entry). Disclosure: the setup-workflow toolset gains the tool, disclosed by the phase opener, withdrawn by the closer, never in the idle default set, registered inactive. The glossary's Migration entry names `tw_migrate` as the executor the phase discloses. Tests: nine in `tests/tw-migrate-tool.test.ts` (disclosure open/withdraw/idle-absence, registry-comment and glossary pins, executor seam through the public tool factory with golden report literals captured from the CLI shim before the change, dry-run byte-identical tree, no-op answer, needs-human separation, spawn guard), plus four foreign registered-surface tables updated. Validation at the merged tip: `npm test` 22 files, 1295 tests green; both typechecks clean. Residual risks carried to the next tickets: the tool's failure path is unpinned in the new test file (covered by the spawn-based shim failure test until `remove-migration-cli` deletes it), and skill prose, docs page, and upgrade resources still name the CLI until `reroute-migrate-branch` reroutes them, as planned.
