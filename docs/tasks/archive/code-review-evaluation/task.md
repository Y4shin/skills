---
kind: task
type: grilling
slug: code-review-evaluation
title: Evaluate mp-skills /code-review for adoption
map: compare-to-mp-skills
status: done
blocked_by:
- adopt-mp-skills-patterns
---

## Decision to settle

Should we build a /code-review skill based on mp-skills' two-axis (Standards +
Spec) parallel sub-agent review?

## Context

mp-skills' /code-review is a two-axis review run as parallel sub-agents:

- **Standards** — does the code follow the repo's documented coding standards
  plus a fixed 12-smell Fowler baseline (Mysterious Name, Duplicated Code,
  Feature Envy, Data Clumps, Primitive Obsession, Repeated Switches, Shotgun
  Surgery, Divergent Change, Speculative Generality, Message Chains, Middle
  Man, Refused Bequest)?
- **Spec** — does it faithfully implement the originating issue/spec?

Parallel sub-agents prevent one axis from polluting the other. Reports are
presented side by side, not merged.

Our workflow currently has no code review skill — quality is enforced through
TDD (tdd-worker), verification (slice-verifier runs lint + tests), and the
CI gate in finalize-task. There's no human-readable review, no standards
baseline, and no explicit spec-vs-implementation comparison at the end.

## Recommended starting answer

Adopt it. Code review is complementary to TDD/CI — it catches things automated
gates miss (spec drift, design smells, naming, structure). The parallel
sub-agent pattern is already proven in our architecture. Start as a
model-invoked skill that fires at the end of implement-task.
