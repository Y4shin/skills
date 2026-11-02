---
type: ticket
subtype: feature
title: Remove the migration CLI from the package
status: stable
workflow_state: ready
blocked_by:
- reroute-migrate-branch
size: s
---

## What to build

The package ships no migration CLI. The shim script, its TypeScript resolve hook, and the argv wrapper are deleted, together with the spawn-based tests that covered them: their coverage lives in the tool tests landed with `tw-migrate-tool`. Remaining references in living files (the filesystem port's header comment, test comments) are reworded so nothing names the removed CLI; archives stay as historical record and are untouched. The tool is the only migration executor the package ships.

## Acceptance criteria

- [ ] The three CLI files no longer exist in the package.
- [ ] The spawn-based shim tests are deleted; their coverage lives in the tool tests.
- [ ] No living file (source, skill, docs, resources, tests) instructs or imports the removed CLI; the archive is untouched.
- [ ] The full test suite and the typecheck pass with the CLI removed.

## Blocked by

- `reroute-migrate-branch` (no living prose references the CLI before it is deleted).
