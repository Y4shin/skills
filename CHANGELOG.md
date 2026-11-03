# task-workflow

## 5.3.0

### Minor Changes

- 2ecff8c: Run the schema migration through `tw_migrate`, a tool the setup-workflow phase discloses.
  
  The migrate branch of `/skill:setup-workflow` used to instruct running a CLI
  script that ships in the bundle but cannot run there: the shim spawned a Node
  child with type stripping on the package's TypeScript sources, and Node
  refuses that for any file under `node_modules`. Every installed copy failed
  before writing anything, and migrating stayed possible only inside a checkout
  of this repository.
  
  - The migration now executes in-process in the extension host through the
    registered `tw_migrate` tool, the same way every `tw_*` tool already runs on
    installed copies. It is disclosed by the `setup-workflow` phase opener and
    withdrawn by the closer, never visible by default. A spawn guard test pins
    that no step in the tool's path spawns a Node child.
  - The tool drives the untouched `migrate()` core over the production
    filesystem port and returns the same report the CLI printed (the from and to
    schema versions, every change, every item needing human attention, or the
    already-current no-op answer), plus a details envelope with the counts.
    `dryRun` is a parameter that computes and writes nothing. Failures throw
    `migration failed: <reason>`.
  - The CLI is gone: the shim, its resolve hook, and the argv wrapper are
    deleted, together with their spawn-based tests. One executor ships, the
    tool, with the report parity pinned by golden literals captured from the
    CLI before the redirect. Three structure guards keep the removal true, and
    no living file instructs a shell command for the migration.
  - The skill's migrate branch now choreographs the run: record the integration
    branch, create `migrate/schema-${from}-to-5` from it, run the tool and the
    test suite and the commit there, fast-forward the integration branch (with
    explicit approval first outside `main`/`master`, recovering by re-creating
    the migration branch from the moved tip if the fast-forward refuses), delete
    the migration branch, close the phase, and end on the integration branch.
  - The docs page, the upgrade resources, the doctor skill, and the domain
    glossary name the tool as the executor.
  
  `npm test` (22 files, 1300 tests) and both typechecks pass.
- 6efdac1: Add the `workflow-failure` skill: the escalation ladder a stuck run walks when the workflow misbehaves, a `tw_*` tool refuses, or a gate will not open. Four fixed rungs: act on the refusal's own `reason` and `legal_next`, reorient from the shipped internals reference or route to `task-workflow-doctor`, record the snag with `tw_feedback`, then stop and escalate with the five-part completion report that ends the run. Hand-editing the artifact tree, skipping a gate, and inventing a workaround are forbidden at every rung. The skill is model-invoked, registered in the promoted set, and ships its `resources/report.md`.

## 5.2.0

### Minor Changes

- 0b13289: Add `operator-communication`, the rule set for every message an agent sends the operator.
  
  A run held the style guidance in its prompt and still ended with a summary
  that only its own context could decode. The failure is not ignorance of the
  rules. It is a skipped self-check at the moment of writing, most of all in
  the closing report at the end of a long run, where the agent's context is
  full of vocabulary the operator does not have.
  
  - `skills/productivity/operator-communication/SKILL.md` holds the rules: one
    test (could a developer who saw none of the run follow this?), three checks
    the agent runs on its own draft, a selection rule for what earns a place in
    the message, a worked bad/good pair, and an explicit settlement of
    "maximize useful information per word", which agents read as "use fewer
    words". The selection rule asks whether a detail changes what the operator
    can rely on or decide, so a snag closed in the next step goes and an
    unconfirmed fix stays.
  - Every other promoted skill names the skill near its top, so the dependency
    travels with whatever skill is running.
  - The five skills that end a run with a user-facing report
    (`implement-ticket`, `finalize-effort`, `wayfinder`,
    `task-workflow-overview`, `task-workflow-doctor`) also carry the three
    checks inline at the report step. A pointer reached only at the end of a
    long run is the pointer that gets skipped.
  - `wait-what` becomes a repair command instead of a canned re-pitch. It loads
    `operator-communication` and asks for the last answer to be rewritten under
    it, keeping the detail the operator needs to judge the outcome, dropping the
    detail that carries neither of the selection rule's two questions, adding
    what is missing, applying any request appended to the command, and never
    announcing the rewrite. This is the fallback for the answer the rules did
    not prevent.
  - `wait-what` also records each invocation through `submit_feedback` with the
    fixed `kind: "wait-what"` and one sentence of `data`, so the rate at which
    the operator had to intervene is countable in the feedback table. A
    structural test pins the tool, the kind, and the literal-kind rule so the
    series cannot break silently.
  
  `docs/migration-target.yaml`, `package.json`, both bucket indexes, the
  top-level `README.md`, and the router now list the new skill. Its docs page is
  `docs/productivity/operator-communication.md`.
- 2c1765f: Let a phase ask the operator for a tool it does not disclose, and record the answer.
  
  A phase used to have one path to a tool its own toolset did not declare: close
  the skill, open a different phase that declares it, and borrow it. That is what
  a model does when it cannot find a sanctioned route, and it steps around the
  gates the workflow exists to enforce. There is now a legal route, and it asks
  the operator.
  
  - `tw_request_tool` is always declared, next to the opener pair, so asking never
    depends on already holding the tool. It takes the tool name and one sentence
    of reason, and it puts a confirmation to the operator through the session UI.
  - Approval adds the tool to the session's active set. The grant ends at the next
    `tw_close`: closing prunes every workflow tool that no remaining open skill
    declares, which covers both the phase's own tools and anything it was granted.
  - A denial leaves the tool set unchanged. A session with no interactive UI is
    refused rather than treated as a denial, because nobody was asked.
  - A grant that would complete another skill's toolset is refused too, naming
    the skill to open instead. The open set is derived from whole toolsets, so
    that grant would make a phase look open that nobody opened; the guard keeps
    the derivation exact (granting `tw_context` while `wayfinder` is open would
    otherwise look like `setup-workflow`).
  - Every outcome (granted, denied, blocked, unavailable) is written to the
    telemetry store through `submit_feedback`, labelled as workflow feedback with
    kind `friction`. Feedback failure never undoes a grant; the result says it
    was not recorded.
  - Only this package's own `tw_*` tools are requestable. The always-declared pair
    and the closer are refused as already available, and a built-in such as `bash`
    or `write` is refused as outside the workflow surface.
  - The six phase skills now name the sanctioned route at the point where they
    state the rule, and say plainly not to close a phase early to reopen another
    one for its tools. The README, the router skill, and its docs page describe it.
  - `tw_feedback` and the requester share one feedback call path, so both address
    the installed `submit_feedback` shape the same way.
  
  `npm test` and all three typechecks pass.

### Patch Changes

- 2c1765f: Give `wayfinder` its task-creation tool, and let two phases share a tool.
  
  The planning phase's Boundary names task creation, its reconcile promotes each
  fog line into a planning task, and its escape hatch adds a new one when
  implementation turns up uncertainty. None of that was possible: `tw_add_task`
  was disclosed to `intake` alone, and the built-in write is refused under
  `docs/tasks/`, so a planning pass that needed a new task had no legal path.
  
  - `wayfinder`'s toolset gains `tw_add_task`.
  - `tw_add_task` gains an optional `blocked_by`, validated at creation the way
    ticket creation validates it: kind-scoped to existing planning tasks of the
    same effort, no self-edge, no dangling target. Edges are wired when the task
    is created, so a planning graph never needs a second pass over frontmatter
    that no tool can write.
  - The open-set derivation no longer requires every skill to own a private
    tool. A skill is open when its whole toolset is active, which is the literal
    definition and makes a shared tool legal. `assertDerivableOpenSets` refuses a
    registry where one toolset, or the union of two skills that can be open
    together, covers another, because that would make a closed skill look open.
  - The `wayfinder` charting steps no longer claim the phase creates the map or
    registers the effort in the root index. `intake` does both, and the intake
    skill now names `docs/tasks/index.md` and its sorted `## Live` list.
  
  `npm test` and all three typechecks pass.

## 5.1.0

### Minor Changes

- 9ebbf10: Add `tw_feedback`, the single labelled route from a workflow phase to the telemetry store.
  
  Every skill and agent sent the model to pi-telemetry's `submit_feedback`
  directly, so the workflow label lived only in prose: each block had to restate a
  kind convention, and a caller could ignore it.
  
  - `tw_feedback({ kind, data })` takes one of the pre-approved signals (`good`, `bad`, `friction`, `architecture`, `expected`) and a string or object payload, and runs pi-telemetry's `submit_feedback` through `ctx.executeTool`.
  - The wrapper reads the installed `submit_feedback` parameter schema from `ctx.tools`. When it declares a `source` input, the call is `{ source: "workflow", kind, data }`; when it does not, the call is `{ kind: "workflow.<kind>", data }`. An unreadable or unlisted schema takes the prefix form, which both shapes accept.
  - A refused nested call is surfaced with the store's reason instead of a silent success, and the install command is added when the store is not registered at all.
  - `src/core/feedback.ts` holds the pure adaptation; `tests/feedback.test.ts` pins both shapes and the refusals, and `tests/integration/feedback.test.ts` proves the contract against a real session rather than a stub.
  
  Every skill now calls `tw_feedback`, and so does every shipped agent, so the
  label is applied in one place instead of restated in 26 blocks.
  
  - All sixteen skill and resource blocks that described a feedback call now name `tw_feedback` with a bare kind, and the `workflow.<signal>` convention they carried is gone.
  - All ten agents allowlist `submit_feedback` and `tw_feedback`. Both are needed: a nested call reaches only an active tool, and a child's allowlist is its whole active set. `code-reviewer` and `skill-reviewer` instructed a feedback call while allowlisting no tool for it; they now list both. A background child loads ambient extensions, which is what makes the gated wrapper reachable, and every shipped chain dispatches with `async: true`.
  - The agent allowlist policy narrows rather than disappears: `tw_feedback` is the only gated `tw_*` tool an agent may name, because it writes telemetry rather than the tree, and an agent that names it must also name `submit_feedback`. `tests/skills.test.ts` pins both rules, and a corpus check fails any file that sends the model to `submit_feedback` for workflow feedback or gives kind guidance without naming `tw_feedback`.
- cb01375: Quote the `intake` and `wayfinder` descriptions so pi can load their frontmatter.
  
  Both descriptions carried an unquoted `": "`, which is not legal inside a YAML
  plain scalar. Pi reported `Nested mappings are not allowed in compact mappings`
  and skipped the two skills entirely.
  
  - `intake` and `wayfinder` now use double-quoted `description` values, matching the other long descriptions in this package.
  - `tests/skills.test.ts` parses every shipped `SKILL.md` and agent file with the real frontmatter parser from `src/core/frontmatter.ts`. The previous hand-rolled line scanner accepted invalid YAML, which is why CI never caught this.

## 5.0.2

### Patch Changes

- 0025c20: Declare the pi-telemetry version this package is tested against.
  
  The optional peer was `*`, which said nothing. It is now `^0.4.2`, the first
  version published to npm, and the first that follows the pi 1.4 SDK event
  shape this package runs against.
  
  The requirement stays optional: a missing extension warns at session start and
  starts nothing else, which is what the ticket chains need.
- 2b5fecf: The pi-telemetry install hint names the npm package.
  
  - The missing-dependency warning, and the two tests that pin its wording, now read `pi install npm:@y4shin/pi-telemetry` instead of pointing at the git repository, which no longer needs a clone and follows the published versions.
  - `package.json` declares `@y4shin/pi-telemetry` as an optional peer dependency. The requirement is now machine-visible, and optional keeps the install clean when the extension is absent, which is what the session warning is for.

## 5.0.1

### Patch Changes

- Dev tooling only; nothing a consumer installs changes.
  
  - `pi-subagents` moves to `^0.84.0`, the version the host already runs, so the ticket-chain and end-of-effort scripts are no longer typed against an API the runtime does not execute.
  - `@earendil-works/pi-coding-agent` moves to `^1.4.0` and `pi-ai` to 1.4.0, so the typecheck runs against the SDK the host loads.
  - `typebox` 1.4.3, `vitest` 5.0.5, and `@types/node` 24.19.2, plus an `overrides.undici` pin at `^8.12.3`.
  - `npm audit` drops from 6 advisories (3 high) to 3 moderate, all one upstream `minimatch` entry inside the pi SDK; `npm audit --omit=dev` remains 0, and the only runtime dependency is still `yaml`.

## 5.0.0

### Major Changes

- 88be912: task-workflow v5: the enforced workflow. The workflow is now a set of phases, each opened by an opener that checks its preconditions and discloses only that phase's tools.
  
  - **Two graph kinds.** Planning tasks (`tasks/<slug>/task.md`) and implementation tickets (`tickets/<slug>/ticket.md`), with kind-scoped `blocked_by` edges and a frontier computed per kind. `intake` is the single front door and always creates an effort with a map and one non-negotiables grilling task; every bug report enters as an effort too, and `docs/bugs/` becomes a static archive.
  - **Schema 5.** `architecture.md` and `type: architecture` replace `arch-spec.md` and `type: arch spec`, a `review` artifact type joins them, the map gains `ready_for_spec` and `origin_effort`, and `## Out of scope` becomes `## Non-goals` beside a new `## Non-negotiable facts`. The migration CLI carries any vintage forward in one idempotent hop, archives included.
  - **Progressive disclosure.** The gated `tw_*` tools register `exposure: "direct"`, `defaultActive: false`; `tw_open` checks the phase precondition and activates the toolset in one call, `tw_close` removes only what no open skill still needs, and `tw_next` answers in every state. `skill-creator` nests its bundled script tools inside an open phase.
  - **Named writers and a write lockdown.** Every write to `docs/tasks/**` goes through a named tool, and the built-in `write` and `edit` are refused there in every phase. Scratch and evidence (`.work/`, `deviation-reports/`) are exempt, and a ticket's implementation notes have their own writer.
  - **`finalize-effort`** runs the whole-effort review, triages every finding, and archives the effort only once every finding is dispositioned.
  - **Retired:** the `triage`, `implement-task`, and `finalize-task` skills, the `slice` and `slices/` vocabulary, `docs/tasks/maps/`, `mode: hitl`/`afk` as a task marker, and the shell mutation scan.
  
  Hardening after the effort closed, from two end-to-end rehearsal runs:
  
  - **The close reconciles the living architecture and records it.** `finalize-effort` holds `tw_write_architecture` and reconciles before the holistic review, section by section through a new `section` argument, so a correction no longer resends the whole document. The outcome is recorded through `tw_write_review`'s `reconcile` argument (`done:`, `none:`, `unavailable:`) and `tw_archive_effort` refuses a finalize review without one.
  - **The opener's refusals reach the model.** `tw_open` takes a plain object instead of a discriminated union, so an unknown skill or a missing target produces the opener's own refusal naming the legal next call rather than a provider-side schema error; `tw_close` is declared in every state and refuses when nothing is open.
  - **Two more gates.** `to-tickets` requires a published spec (`tickets-ready`), and `tw_finalize_map` refuses while `## Fog` holds any line.
  - **Two more writers.** `tw_write_task_note` records a planning task's `## Notes` (the grilling resource demanded a body write no tool offered), and the write lockdown exempts an unstamped tree so onboarding can create it.
  - **The ticket chain runs on schema-5 tickets.** A bug ticket no longer requires a separate bug doc and reproduction (the body is the defect record), the deviation reporter runs on a fresh context, verdict gates read the marker anywhere and re-dispatch once only when no verdict was stated, and every step carries its own timeout.
  - **The close closes.** The archive clears the state map pointer, skips the advisory review, and refuses a review with undispositioned findings; planning-artifact and documentary findings stay informational so a close converges.
  - **pi-telemetry is a required install.** Every shipped subagent lists `submit_feedback`, and pi-subagents fails a child whose allowlisted tool is unavailable, so the chain does not launch without it.
