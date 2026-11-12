---
type: review
title: Whole-effort review of code-quality-cleanup
dispositioned: true
reconcile: "done: the architecture was reconciled at the end-of-effort pass and re-recorded through the architecture writer, correcting the ordering-comparator rule, describing the support module by its rule rather than a short list, and stating the gates-to-entry cycle once; the per-ticket contracts now record what each ticket actually delivered, including the factory conversion the trim performed."
---

## What the effort set out to do, and what shipped

The effort inherited four findings from the archived `configurable-git-workflow`
effort and set out to close them without changing behaviour.

It closed all four. The extension's 4501-line file became an entry of 578 lines
plus seven family modules under `src/tools/` and one support module; the two
generic shape guards moved to `src/core/shape.ts`, below both the core modules and
the tool modules; the changeset writer's two outcomes carry a `kind`
discriminant; and the top-level README's skill lists are ordered by a rule the
suite now enforces.

The tool surface is identical: the same 41 registered names, the same argument
schemas, the same refusal texts, the same disclosure sets, the same bundled
profiles. The suite proves that rather than asserting it, at 1608 tests with both
typechecks clean.

## What it did beyond the four findings

Two things, both recorded rather than smuggled in.

The README ordering rule needed a collation, because plain string order sorts
`code-review` above `codebase-design` and would have moved a second entry. The
effort chose dictionary order with hyphens ignored, stated it in the README, and
holds it in one named comparator in the suite.

The advisory review found that this effort had written a docstring claiming the
tool families read values through the shape module, which no family does. A sixth
ticket corrected the docstring and pinned its importers, so the claim is now
testable instead of aspirational.

## What was deliberately left alone

The advisory review also found pre-existing duplication and dead scaffolding: the
shipped shape module's neighbours hand-roll the same trim about thirty-five times,
the gates family repeats a graph idiom, the git resolver repeats a settings
preamble four times, a close helper takes an unused parameter, a module-private
helper is dead, and one module exports internals only a test reads. All of it was
present before this effort, the specification's no-churn rule puts it out of
scope, and the effort moved it without editing it. Those findings are recorded
here so the next person does not have to rediscover them.

One seam is recorded but not collapsed: the changeset handler reads `dryRun` for
its printed branches and `kind` for its narrowing, so one question has two
sources. They cannot disagree under the current call shape.

## Findings

Every finding from the two reviews is recorded with where it went. Nothing is
open.

## Dispositions

- The extension's tool file had absorbed five features and grew past 4300 lines; closed by the extraction and the trim tickets.: ticket `extract-tool-families`
- The six families were left as named constants by the extraction and the entry enumerated them; closed by the trim converting them to factories.: ticket `trim-the-entry`
- The two generic shape guards lived in a module about git branches; closed by moving them to src/core/shape.ts.: ticket `shape-helpers-module`
- The changeset writer told its proposal and write outcomes apart with a type assertion; closed by the kind discriminant.: ticket `changeset-discriminant`
- The README placed the skill lists in an order nothing enforced; closed by the ordering rule and its assertion.: ticket `readme-order`
- This effort's own shape module docstring claimed consumers it did not have; closed by correcting it and pinning its importers.: ticket `shape-docstring-truth`
- Pre-existing duplication and dead scaffolding: the hand-rolled trims in the tool families, the repeated graph and containment idioms, the four-times settings preamble in the git resolver, the unused close parameter, the dead module-private helper, and the test-only exports. Accepted as informational because all of it predates the effort and the specification's no-churn rule puts it out of scope; the advisory review keeps the detail.: informational (accepted)
- The gates family imports the entry, so the two form an import cycle. Accepted as informational: it is safe because the binding is a hoisted declaration read at call time, it is now stated once in the architecture document, and moving the composition out of the entry would cost more than the cycle.: informational (accepted)
- Registration order changed to family-grouped in 18 of 40 positions. Accepted as informational: no test pins order, every surface assertion sorts, and tools resolve by name.: informational (accepted)
