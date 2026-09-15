---
"task-workflow": minor
---

New `eval-review` skill: multi-criterion review of Inspect-based eval suites
for the pi harness (contract validity, outcome grading, isolation and
baseline-vs-treatment soundness, scorer integrity, with optional
simulated-user integrity and trial/saturation axes), plus a single-pass
run-triage mode classifying failures as scorer bug, skill defect, or spec
mismatch. Companion to the planned `eval-creator`.
