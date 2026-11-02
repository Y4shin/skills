---
type: ticket
subtype: feature
title: Add tw_migrate to the registered surface
status: stable
workflow_state: ready
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
