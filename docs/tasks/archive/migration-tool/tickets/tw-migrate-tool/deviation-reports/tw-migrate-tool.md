---
type: deviation report
title: Deviation report for tw-migrate-tool
status: stable
---

## Deviation report: tw-migrate-tool

Compared: `docs/tasks/migration-tool/architecture.md` and the ticket's acceptance criteria against the implementation, `git diff effort/migration-tool..ticket/tw-migrate-tool` (9 commits, 10 files; the ticket forks from the effort branch, there is no `task/tw-migrate-tool` ref).

The frozen call contract held exactly: tool name `tw_migrate`, parameters `{ dryRun?: boolean }`, the rendered report text as the return, the setup-workflow disclosure row, the registry comment rewrite, the glossary rewrite, and in-process execution over `findRoot` plus the production `FsPort` against the untouched `migrate()` core. Full suite green (22 files, 1295 tests), both typechecks clean, working tree clean. The deviations follow.

### API surface changes

**1. The report rendering's home is a shared module, not the tool's file.**
- **Planned:** the architecture (decision 4, do-not-reimplement notes) and the ticket both say the rendering "moves from the argv wrapper into the tool, moved, not rewritten."
- **Actual:** it moved into a new module `src/migrate-report.ts` exporting `renderMigrationReport`, imported by the tool (in `src/pi.ts`) and, transitionally, by the still-shipped argv wrapper (`src/migrate-cli.ts`). Verified byte-for-byte against the old `render`: the only deltas are the rename and the added `export` keyword.
- **Why it was forced:** during this expand step the CLI still ships and must keep rendering (its shim tests stay green, and the skill still names the CLI until `reroute-migrate-branch`). The wrapper is spawned standalone under the resolve hook and cannot import `src/pi.ts`, whose runtime import `@earendil-works/pi-ai` is a devDependency (the package's runtime `dependencies` are `yaml` only), unavailable to the spawned process in an installed package. Hosting the rendering inside `src/pi.ts` would have broken the CLI's spawn or forced a second formatter, which the do-not-reimplement notes forbid. The shared module is the only placement satisfying every constraint; the spec named none for the coexistence window.
- **Impact:** `remove-migration-cli` deletes the wrapper's import and inherits `src/migrate-report.ts` as the tool's single renderer; its removal contract (pure deletion, one executor) is unchanged. `reroute-migrate-branch` writes prose against the text contract and is unaffected.

**2. The outcome carries a structured details envelope beyond the frozen text.**
- **Planned:** the call contract freezes "return the rendered report text (from and to versions, every change, every needs-human item, or the already-current no-op answer)."
- **Actual:** the text matches; the shared `outcome(text, details)` wrapper additionally carries `{ from, to, noop, dryRun, changes, needsHuman }` (counts, not the full entries).
- **Impact:** additive and conventional (the existing structured tools return details this way). Dependent prose reads the text only, so nothing downstream changes. A later consumer wanting structured change lists must extend the details; the counts are not a substitute for them.

**3. The failure surface (spec-silent) is a thrown error.**
- **Planned:** the spec does not define the tool's failure surface.
- **Actual:** the handler throws `migration failed: <reason>` (the CLI's stderr line, as a thrown error).
- **Impact:** `reroute-migrate-branch` treats tool failure the way other tools' failures are treated (surface the error); nothing parses the text. Residual risk: this path is not pinned by a test (see below).

### Abstraction usage
- Used/was specified: **yes.** The disclosure registry (row plus comment), the `defStructured`/`outcome` helpers, the shared `findRoot`, the production `FsPort`, the untouched `migrate()` core, the wrapper's rendering (moved, verified verbatim), and the public tool factory driving the executor tests. Two nuances: the shim tests' fixture builders were copied into the new test file rather than shared (they are locals of a file `remove-migration-cli` deletes, so extraction would refactor a dying file), and the open/withdraw disclosure assertions drive `tw_open`/`tw_close` through the factory in addition to importing the registry directly (the seam note names only the registry import; the factory path is stronger, exercising the real derivation).

### Out-of-scope changes
- **Four foreign test files updated**, each a data table pinning the registered surface this ticket changes: `tests/plugin.test.ts` (registered-names list), `tests/gate-factory.test.ts` (`GATED_NAMES`), `tests/integration/disclosure.test.ts` (`GATED_WORKFLOW_TOOLS`), `tests/opener-gate.test.ts` (phase-to-toolset table). Row additions only, except the next item.
- **One foreign scenario re-scenariod**, in `tests/opener-gate.test.ts`'s `tw_request_tool` refusal test: with `tw_migrate` in setup-workflow's toolset, that phase now declares two tools no other phase declares (`tw_context`, `tw_migrate`), so the old scenario (granting `tw_context` alone completes the toolset and is refused) became unreachable. The test now opens wayfinder plus the nested skill-creator, grants `tw_context` (allowed), then requests `tw_migrate` (refused as "would open another skill", naming setup-workflow). The guard's semantics are unchanged; the reachable path to the refusal moved. This is the containment property behaving as designed with the larger toolset, not a behavior change.
- The tool description is new text (the spec fixes none of it); one draft enumeration item was dropped to satisfy the retired-vocabulary standard enforced by `tests/skills.test.ts`.
- No production file outside the spec'd set changed: `skills/`, `docs/`, `README.md`, `package.json`, and `.changeset/` are absent from the diff, as planned (prose and docs rerouting is `reroute-migrate-branch`'s scope; the CLI deletion is `remove-migration-cli`'s).

### Ticket doc update needed?
**Yes.** The ticket has no `## Implementation notes` section yet; create it and append:
- The rendering lives in `src/migrate-report.ts`, shared with the CLI transitionally; `remove-migration-cli` inherits it as the tool's single renderer.
- The four foreign surface-pinning test tables gained `tw_migrate`, and the `tw_request_tool` refusal scenario in `tests/opener-gate.test.ts` was re-scenariod (wayfinder plus skill-creator open, `tw_context` granted, `tw_migrate` refused).
- The tool returns `outcome` details (`from`, `to`, `noop`, `dryRun`, `changes`, `needsHuman` counts) around the frozen text; failures throw `migration failed: <reason>`.
- The tool's failure path is not pinned by a test in `tests/tw-migrate-tool.test.ts`; the spawn-based shim failure test covers it until `remove-migration-cli` deletes those tests, so that ticket should either add a one-test pin or accept the gap knowingly.

### User attention needed?
**No.** Scope is unchanged and the frozen call contract (name, parameters, report text, disclosure) is intact. The deviations are a forced and verified placement decision, additive test maintenance, and an additive details envelope. The one item worth an eye, the failure-path coverage gap at the handoff to `remove-migration-cli`, is recorded above and in the ticket-doc update; it is not a scope change.
