---
type: deviation report
title: Deviation report for reference-coverage-suite
status: stable
---

## Deviation report: reference-coverage-suite

### API surface changes
- **Planned:** The architecture contract ("Per-ticket interface contracts")
  requires the suite to fail when a promoted SKILL.md (minus
  workflow-failure) or an agent profile lacks the canonical sentence, when
  the internals resource is missing or unreferenced, or when a new promoted
  skill ships without coverage; it must pass on the tree as the other
  tickets left it and never relax the canonical string. The "Seams" section
  names `tests/skills.test.ts` as the harness and `package.json` `pi.skills`
  as the promoted-set source.
- **Actual:** Exactly that, implemented as one new describe block
  (`canonical reference coverage (reference-coverage-suite)`, 5 tests) in
  `tests/skills.test.ts` with a single `CANONICAL_REFERENCE_SENTENCE`
  constant compared verbatim. Diff is +69 lines in `tests/skills.test.ts`
  only (`git diff main..ticket/reference-coverage-suite`).
- **Impact:** None on dependent tickets; this is the terminal ticket of the
  effort and its surface (failing tests) matches the contract.

### Abstraction usage
- Used/was specified: yes. The existing structural suite
  (`tests/skills.test.ts`) and its helpers were extended as the
  architecture prescribes; no parallel harness was built. The
  promoted-set seam (`pi.skills`) is used as the mechanical source.

### Out-of-scope changes
- Additive but within the agreed surface:
  - The workflow-failure exemption is asserted explicitly (must NOT carry
    the sentence) as a sixth assertion beyond the ticket's four numbered
    checks. This duplicates an existing fragment pin from the
    workflow-failure skill block in intent, but uses the canonical
    constant, keeping the single source of truth. Architecture line 67
    ("Every promoted SKILL.md except workflow-failure") supports this.
  - Agent profiles are enumerated by directory listing (`agents/*.md`)
    rather than a hardcoded list, matching the ticket's "no future profile
    slips through silently" intent. It matches the shipped set today.
- No removals, no edits outside `tests/skills.test.ts`.

### Ticket doc update needed?
No. The acceptance criteria are checkboxes the suite already demonstrates
(RED/GREEN mutation evidence is in the tdd result); nothing about the
ticket's stated scope or criteria drifted. If the project convention is to
record implementation choices in the ticket, an `## Implementation notes`
entry could mention the explicit exemption assertion and directory-derived
profile enumeration, but neither is a spec change.

### User attention needed?
No. No scope change, no API surface difference, additive test-only change,
full suite green (1309 passed).
