# task-workflow

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
