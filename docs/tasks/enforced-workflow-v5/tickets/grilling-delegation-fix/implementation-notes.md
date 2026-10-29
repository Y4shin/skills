# Implementation note: grilling-delegation-fix

Landed by the tdd-worker on `ticket/grilling-delegation-fix`.

1. The spec-side re-sync of the archival architecture content, already
   migrated to `arch-spec.md` by to-tickets-architecture, is recorded here so
   the docs-resync coherence pass does not repeat it. The delegation decision
   now lives in the arch spec and in `spec.md`'s archival content; the
   `grilling` section of each names the round-based frontier method with the
   `grilling` skill as its only home, and the router correction is recorded in
   the arch spec's per-ticket contract (entry 12) and in `spec.md`'s
   "Every grilling session delegates to the `grilling` skill" decision.
2. `improve-codebase-architecture` was corrected in both the skill and its
   docs page; `implement-task/SKILL.md` already delegated grilling (the
   prior ticket's work) and only its docs page needed the same wording
   narrowed away from "one question at a time".
3. The prose seam (`tests/skill-rewire.test.ts`) now pins the delegation in
   both files, and `tests/skills.test.ts` pins the router correction.
