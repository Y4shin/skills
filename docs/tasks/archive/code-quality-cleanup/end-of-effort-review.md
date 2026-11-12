---
type: review
title: End-of-effort review of code-quality-cleanup
pass: end-of-effort
---

# Advisory review: effort `code-quality-cleanup`

Fixed point `87615bc`; diff 28 files, +5371 / -4007. Suite green at 1605 tests
with both typechecks clean. A string-literal multiset comparison of the
pre-effort entry against the entry plus the new modules found no tool description
or refusal sentence lost or changed.

## Standards axis

Findings, in the order the reviewer ranked them:

1. `src/core/shape.ts`'s module docstring says the tool families read a value the
   same way through it, but no family imports either guard; the families hand-roll
   the same trim 35 or more times. Either those sites import the helper or the
   docstring's claim is corrected.
2. A doc comment describing `isTaskTreePath` sits above `stateIsStamped` in the
   entry, leaving two stacked blocks and `isTaskTreePath` itself undocumented.
3. `src/tools/gates.ts` imports `createTools` from the entry, closing an import
   cycle. Runtime-safe, but it makes the gates family pull in every family.
4. Repeated helpers: the graph-iteration idiom, the containment idiom, and the
   archive-segment check each appear at several sites; the git resolver repeats
   its settings-read preamble four times.
5. `activeAfterClose` takes a `closing` parameter it never reads.
6. `CHANGE_LEVELS` and three internal readers in the changeset module are
   exported only for a test, and a module-private `Bool` helper in the support
   module is dead.

The reviewer noted that findings 2, 4, 5, and 6 are pre-existing and were moved
rather than introduced, which the effort's no-churn rule asked for.

## Specification axis

Findings:

1. The architecture document forbade a new ordering comparator while the suite
   gained one, and it did not record the hyphen-insensitive collation. This was
   the sharpest finding, and the reconcile that follows this review corrects it.
2. The architecture's itemisation of the support module was narrower than what
   shipped; the reconcile now states the rule and the sample.
3. The gates-to-entry cycle was recorded inconsistently by two tickets, one
   calling it new and one calling it pre-existing. The reconcile states it once.
4. User story 23, the effort's own changeset, was undelivered at the time of
   review. The effort close owns it.
5. No single assertion pins the total surface count; the aggregate pins cover it.

The reviewer's verdict on both axes was that all code-level requirements are met
and the surface is proven by a green suite, with the outstanding items being
documentation reconciliation and the effort-close changeset.

## What the phase did about it

The reconcile ran and its output is recorded in the living architecture document,
including the corrected comparator rule, the honest support-module description,
and the single statement about the cycle. The changeset remains the effort
close's work. The standards findings are pre-existing duplication and dead
scaffolding that this effort moved without touching; they are recorded here for
the finalize triage rather than fixed inside a cleanup that was scoped to four
named findings.
