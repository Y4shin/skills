---
type: review
title: Review of migration-tool
dispositioned: false
---

> Moved from the effort `migration-tool`: these findings are the follow-up's work.

# Review of migration-tool

The holistic close-out review, read-only toward the code. Two levels: the effort's claim (does the map's success test describe what was delivered?) and the delivered code (correctness, fit, drift, missing tests).

## The effort's claim

The map's success test: a repo that installed the package through `pi install` migrates an older-vintage tree to schema 5 through the migrate branch of `/skill:setup-workflow` alone, full report and needs-human items included, with no checkout of the workflow repository. Delivered, and met by construction plus pins:

- The migration runs entirely through the registered `tw_migrate` tool, in-process in the extension host, exactly the way every registered `tw_*` tool already runs on installed copies; the node-loading restriction that broke the CLI applies only to spawned processes, and a spawn guard test pins that no child process exists anywhere in the tool's path.
- The skill's migrate branch opens the phase and calls the tool, never a shell command; three structure guards assert no living file instructs or imports the removed CLI; the onboard and no-op branches are byte-identical, pinned by a regression test.
- Report parity is pinned by golden literals captured from the CLI before the redirect; dry-run leaves a byte-identical tree; needs-human items are separated; the tool's failure wrapper (`migration failed: <reason>`) is pinned at the tool seam.
- The core kept its guarantees untouched (verified by the reviewers and pinned by the core suite).

One honest caveat: no test literally runs an installed (node_modules) copy of the package end to end. The claim rests on the in-process mechanism being the same one every shipped tool already exercises on installed copies, plus the spawn guard. A literal installed-copy smoke run would be a heavier harness than the mechanism warrants.

The non-goals held: the transformation was never reopened, nothing moved into the tool beyond migration execution, the onboard and no-op branches are untouched, no general script-wrapping mechanism was built, no downstream repo was migrated by this effort.

## The delivered code

Verified across the whole effort: the tool registration and its disclosure row, the moved-not-rewritten rendering (byte-for-byte, one renderer), the six-step choreography with the approval gate outside `main`/`master` and the fast-forward recovery procedure, the re-synced docs page and upgrade resources, the glossary entry, the deletions, and the test surface (22 files, 1300 tests green; both typechecks clean). The end-of-effort advisory review found no hard violations on the standards axis and no wrongly implemented requirement on the spec axis; its two coverage flags were closed by the coherence pass.

## The findings and their fates

1. No release changeset existed for the effort's shipped changes. Resolved inline at the operator's instruction during this close: the changeset entry was written directly (no ticket) and committed on the effort branch.
2. The migration step enumeration is duplicated nearly verbatim across three surfaces (the tool description, the skill's migrate branch prose, the upgrade resource), with no test pinning the copies together, so a future step-list change can drift silently. Accepted as the first subject of the follow-up effort `migration-surface-polish`.
3. The opener's mandatory non-empty `effort` argument forces a dummy label into the migrate branch prose (documented as naming nothing). An effort-optional open for gateless phases would remove the workaround. Accepted as the second subject of the follow-up effort `migration-surface-polish`.
4. The removed CLI is still named by the deliberate survivors: the dated historical changelog line, the bug-archive reference, and this effort's own record. Accepted as informational by the human: it is by design of the structure guards' exemption classes, documented in the removal deviation report.
5. The installed-copy success claim is met by construction (in-process execution, spawn guard, golden parity literals) rather than by a literal end-to-end run on a node_modules-installed copy. Accepted as informational by the human: the mechanism argument is recorded rather than executed, and a literal installed-copy harness would outweigh its marginal proof value.

## Documentary state

The living architecture was reconciled before this review: the two sentences the end-of-effort reconcile had recorded as open (the unpinned tool-level failure path, the absent fast-forward recovery step) were already closed by the coherence commit, and the sections now record the as-built state. The map, the specification, and the planning task are planning-owned artifacts and are the record of what was decided; they are not edited by this close.
