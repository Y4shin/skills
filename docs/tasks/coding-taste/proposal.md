# Coding taste in Pi Task Workflow

This is a working design for `@y4shin/pi-task-workflow`. The goal is to help the implementation agent choose readable, maintainable approaches that fit together across tickets. The package should express both language-specific preferences and broader design judgment, such as when the variation in a feature justifies a strategy interface.

The existing `tdd-worker` reads project conventions and nearby code. The Standards reviewer checks the diff against documented rules and maintainability heuristics, and the coherence pass can fix inconsistencies across tickets in an effort. This design adds more specific guidance before implementation and targeted feedback while the worker can still act on it.

## Guidance

- Ship small Markdown rule files with a stable rule ID and front matter that describes when each rule applies. Use language or file extension as the first filter. Narrow further by the kind of work, such as introducing a public API, touching persistence, or using inheritance. Keep broadly applicable defaults small and load more specific guidance as it becomes relevant. Path globs are optional and outside the initial design.
- Write rules in terms of the preferred approach, why it matters, and when an exception makes sense. Distinguish requirements from defaults that can yield to a project convention. A rule can exist as guidance alone. Where a check implements the same policy, have its finding refer to the Markdown rule by ID so the worker can read the rationale.
- Let users disable bundled rules by ID in global or project Pi settings. Allow trusted projects to contribute Markdown rules. The exact settings layout and precedence are open. The working default is that disabling a rule suppresses both its guidance and its linked check.
- Pass a short pointer to relevant guidance at the implementation worker's start. Use the ticket as evidence of what the worker is about to do and the edited code as evidence of which more specific rules apply.

## Checks and finding state

- Enable rule delivery and live checks automatically for the lifetime of `tdd-worker`, which writes both implementation code and tests. Keep feedback mode opt-in in the parent session. Live activation starts watching for changes. The pipeline's separate pre-TDD snapshot supplies the verification baseline.
- Listen for file changes and tool completions. Changes schedule checks for affected scopes. Tool completion helps collect results, while the turn boundary controls automatic delivery. Give each check the repository root and changed paths. Checks may inspect other files or resolve symbols when a rule needs that context. The first bundled rules can be simple while the check interface supports cross-file analysis from the start.
- Have checks return current observations. A finding carries a stable rule ID, a message, exactly one severity (`advisory`, `warning`, or `error`), and a file location when applicable. The checker or its adapter identifies the scope covered and whether the run completed. Existing linters can plug in through thin adapters that map their output into the same format. An exit status indicating violations is a completed check. A failure to run the linter leaves the previous result unverified.
- Keep lifecycle state in a session-local finding registry. For each finding, track when it was first seen, whether it persists, and whether it was already delivered. Reconcile results by check and scope. A fresh, completed result can clear a finding when it covers the relevant scope and the finding is absent. Keep prior state when a run fails or covers a different scope. Discard stale results when a newer edit or check supersedes them. Choose an identity that survives ordinary line shifts so the same issue stays the same issue across edits.
- Treat findings observed by the live registry as **first seen**. Use the verifier's snapshot comparison to determine which findings the ticket introduced. The live registry can track delivery without maintaining a separate pre-edit baseline for each file.

## Delivery to the worker

Pi defines a turn as one model response plus its tool calls. A run can contain several turns before returning control. Use turn end to batch automatic feedback and keep findings available through a pull tool. [Pi extension lifecycle](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#turn_start--turn_end)

| Severity | Delivery |
| --- | --- |
| `error` | At turn end, inject one compact batch of eligible errors that are still present. Track delivery per finding so an unchanged error stays available without repeating on each turn. |
| `warning` | Hold while the file is actively being edited. Start with roughly two additional turns after the last edit as a tentative quiet period. Recheck that the warning still applies before including it in a turn-end batch. |
| `advisory` | Keep it pull-only. Tell the worker when to consult the advisory tool. The first green checkpoint is one candidate. |

`pi-lens` offers useful examples of checking freshness and distinguishing pre-existing findings. It also shows how separate inline and turn-end channels can surface the same blocker twice. Use one automatic delivery path in this workflow. [pi-lens turn-end reporting](https://github.com/apmantza/pi-lens/blob/v4.4.8/clients/runtime-turn.ts#L1908)

## Integration with the ticket pipeline

1. **Before TDD**, run the enabled checks across the codebase and save a snapshot of all findings for this ticket.
2. **During TDD**, keep rule delivery and live checks enabled for the worker. The live registry controls when feedback reaches the worker as it writes code and tests.
3. **During verification**, give `slice-verifier` the full enabled rule set as one input to its review. Require it to call a tool that runs the checks across the codebase once against the completed change, takes a second snapshot, and compares it with the pre-TDD snapshot. Use the same checks and configuration for both snapshots. Report the warnings and errors introduced by the ticket, including findings in untouched files. The first version only needs to identify introduced findings.
4. **Return a verdict to the coordinator.** The verifier reports findings and their counts without editing code. Findings within the verification limits can pass through to the end-of-effort review for triage and any cleanup it routes. If the findings exceed the limits, fail verification and let the coordinator decide how to proceed. The verification limits must be explicit. Their shape and values are open.

## Initial scope and follow-ups

The first version covers bundled Markdown guidance, settings overrides, trusted project Markdown, a few bundled checks, automatic feedback during TDD, a session-local registry, severity-based delivery, and snapshot-based verification. Reuse existing language tooling when it can express a rule precisely. For example, Java's `extends` syntax is visible in a single file, while determining whether the parent is concrete can require type resolution. Use the existing Standards reviewer for choices that require broader judgment.

Later, let a trusted project declare an external checker command in any language. Give it a versioned JSON request and require a structured response in the common findings format. Treat permission to execute a project command as a separate opt-in from trusting its Markdown, with the grant stored outside the checkout. A trained classifier remains a possible experiment for a narrow smell once there are reviewed examples and counterexamples to measure it against.

## Open decisions

- Choose the initial language, bundled rules, and second-level rule selectors.
- Specify the settings keys, override precedence, trust mechanism, and finding identity.
- Decide how live checks declare and invalidate cross-file scope.
- Verify the Pi lifecycle hooks and extension loading in the actual worker session. Decide how to handle results still pending at turn end and warnings still queued at worker completion.
- Define the shape and values of the verification limits for introduced warnings and errors.

