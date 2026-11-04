---
type: task
subtype: grilling
title: Settle the coding taste non-negotiables
status: stable
workflow_state: ready
blocked_by: []
---

## Decision to settle

The non-goals and non-negotiable facts for the effort that implements the
coding taste proposal, including the effort-level success test: what must be
true for the operator to say the pipeline now steers the implementation
worker toward readable, maintainable approaches that fit together across
tickets, without turning the worker's turns into a stream of lint noise.

## Raw request (verbatim)

> Now do the same for @docs/coding-taste-workflow-proposal.md

Context of "the same": create an effort for implementing the proposal and move
the proposal Markdown into the effort directory.

## Destination (one line)

The proposal at `docs/tasks/coding-taste/proposal.md` is implemented: bundled
Markdown rules with stable IDs, project overrides and trusted project rules, a
short rule pointer at the worker's start, live checks with a session-local
finding registry and severity-based delivery during TDD, and snapshot-based
verification of the findings a ticket introduced.

## Actor

The implementation worker agent, which has to pick an approach while it still
can act on guidance, and the engineer who reads the resulting code and wants
it to match the repo's conventions. The slice verifier is the third reader: it
gains a rule set and a snapshot comparison as inputs.

## Classification

Feature.

## Stories

- As an engineer, I want the worker to receive the project's preferred
  approaches at the start of its work, so that it builds the fitting thing
  instead of an approach I have to rework later.
- As an implementation worker, I want guidance filtered by language and by the
  kind of work I am doing, so that I load the rules that apply and am not
  buried in ones that do not.
- As an implementation worker, I want errors delivered in one batch at turn
  end while I can still fix them, so that a violation does not survive to
  verification or repeat on every turn.
- As a slice verifier, I want a pre-TDD snapshot and a post-change snapshot
  over the same checks and configuration, so that I report the findings this
  ticket introduced, including in files the ticket did not touch.
- As an engineer, I want to disable a bundled rule by ID and let a trusted
  project contribute its own rules, so that the package's defaults do not
  fight a repository's conventions.

## Constraints (recorded, not derived)

- The proposal is a working design, not a fixed spec. Its `## Open decisions`
  section lists what the effort must settle: the initial language, bundled
  rules, and second-level selectors; the settings keys, override precedence,
  trust mechanism, and finding identity; how live checks declare and invalidate
  cross-file scope; verification of the Pi lifecycle hooks and extension
  loading inside the real worker session, including results still pending at
  turn end and warnings still queued at worker completion; and the shape and
  values of the verification limits.
- Named initial scope: bundled Markdown guidance, settings overrides, trusted
  project Markdown, a few bundled checks, automatic feedback during TDD, a
  session-local finding registry, severity-based delivery, and snapshot-based
  verification. External checker commands and the trained-classifier
  experiment are explicitly later, not initial.
- A finding carries a stable rule ID, a message, exactly one severity
  (`advisory`, `warning` or `error`), and a location when applicable. The
  checker or adapter states the scope it covered and whether the run completed.
  A linter exit status indicating violations counts as a completed check; a
  failure to run leaves the previous result unverified.
- One automatic delivery path only. `error` batches at turn end, `warning`
  waits out a quiet period after the last edit and is rechecked before
  delivery, `advisory` is pull-only. The proposal names `pi-lens` as an example
  of what to avoid: the same blocker surfacing twice through separate inline
  and turn-end channels.
- Finding identity must survive ordinary line shifts, and findings observed by
  the live registry are treated as first seen; only the snapshot comparison
  decides what the ticket introduced.
- Reuse existing language tooling where it expresses a rule precisely. The
  Standards reviewer keeps the choices that need broader judgment.
- Verification limits must be explicit and their shape and values settled
  during planning. Findings within the limits pass to the end-of-effort review;
  beyond them, verification fails and the coordinator decides.
- Language-agnostic. The check interface supports cross-file analysis from the
  start, even while the first bundled rules stay simple.
- Testing the extension: never write into pi's installed package trees
  (`~/.pi/agent/npm/**`, `~/.pi/agent/git/**`). A local checkout is declared in
  a project `.pi/settings.json`, or loaded for one run with
  `pi -e /path/to/extension`. Ask the operator before any write there.
- The open decisions are large enough that this effort likely needs further
  planning tasks (research on the Pi lifecycle hooks and on existing linter
  adapters, a prototype of the finding registry and the snapshot diff, a
  grilling of the verification limits and the delivery policy) before a spec
  can be written. Wayfinder decides which.
