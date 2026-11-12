---
type: task
subtype: grilling
title: The split seam for the extension's tool file, and this effort's ticket shape
status: deprecated
workflow_state: done
blocked_by: []
---

## The decision

Where `src/pi.ts` splits, and how the four handed-over findings become
implementation tickets.

## Facts the decision sits on

- `src/pi.ts` is 4501 lines. `createTools()` is one object literal from line
  2003 to 4116 that defines all 37 `tw_*` tools, with the planning, ticket,
  gate, changeset, and release families interleaved.
- Roughly 1900 lines of helpers sit above it: artifact resolution, the scan
  layer, the state and context helpers, the opener gate, the review artifact
  helpers, the refusal builders, and the write lockdown guard.
- `package.json` names `./src/pi.ts` as the extension entry, and the entry
  registers two `tool_call` handlers (write lockdown, then the spawn guard)
  beside the tool record and the session-start diagnostics.
- `src/disclosure.ts` (481 lines) decides which tools a phase discloses from a
  name list, so a tool's file location does not affect disclosure.

## Choices

1. **Split by family, keep the entry thin.** `src/pi.ts` keeps the extension
   entry, the handler registration, and a `createTools()` that composes group
   factories from `src/tools/`: artifacts, effort and map, tickets, gates and
   phases, changesets and release, feedback and state. Shared helpers move to
   one support module.
2. **Split by concern, two files.** Helpers move out of `pi.ts` into one
   `src/core/` module and the tool record stays where it is. Least churn, and
   `pi.ts` is still 2000 lines of tool definitions.
3. **Leave `pi.ts` and close only the three small findings.** Cheapest, and the
   finding the operator already called a judgement call stays open.

## Recommended

Choice 1, as three or four implementation tickets in dependency order, because
the finding is that one file absorbed five features, and a cleanup that leaves
the tool record whole does not answer it. Choices 2 and 3 keep the file large
enough that the next feature repeats the problem.

## Second question, same task

The four findings, as tickets: one per finding (split, shared helpers,
discriminant, README ordering), or one "cleanup" ticket that carries all four?
Recommendation: one per finding for the three that touch code, because the
split and the helper move have different verification needs and the README fix
is independent. The cost to weigh: each ticket is a branch, a chain, and a
close-out.

## Notes

### Settled by the operator

Choice 1, split by family with a thin entry, and one implementation ticket per
finding. The confirmation was given after the charting pass, against the three
choices in the task body, so the decision is made and this grilling records it
rather than re-opening it.

The shape the operator selected:

- `src/pi.ts` keeps the extension entry, the two `tool_call` handlers, and a
  `createTools()` that composes group factories.
- Group factories live under `src/tools/`: artifacts (the read-only
  inspectors), effort (map, spec, architecture, review), tickets (ticket
  lifecycle and state), gates (open, close, next, brief, migrate), release
  (changesets, release plan and apply), feedback (feedback, context,
  request_tool), and one support module for the helpers the groups share.
- Ticket order: the shared shape helpers leave the git resolver first, then the
  changeset discriminant, then the README ordering rule, then the split, which
  cites the coupling inventory the research task produces.

The size the split targets: an entry file around 250 lines. The exact number is
not a criterion; "the entry holds the entry and the composition, and no tool
family lives in it" is.

### Left open

The three fog items in the map stay open and are decided by the tickets that
touch them: where the shape helpers land (the first ticket), the discriminant's
shape (the second), and the README ordering rule (the third).
