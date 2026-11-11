---
type: deviation report
title: Deviation report for profile-data-and-phase-briefs
status: stable
---

## Deviation report: profile-data-and-phase-briefs

Reviewed at `ticket/profile-data-and-phase-briefs` against
`task/profile-data-and-phase-briefs` (3 commits), plus the architecture document's
configuration contract and the ticket's acceptance criteria. `npx tsc --noEmit`
is clean; `npx vitest run` is 1407 passed, 3 failed, and the three failures are
`tests/skills.test.ts`'s corpus sweeps picking up the untracked `.codegraph/`
directory in this checkout (unrelated to this ticket and identical before it).

### API surface changes

**1. The `taskWorkflow.git` settings reader.**

- **Planned:** a settings reader for the `git` key, built by extending the repo
  gate's existing settings read and normalization rather than reimplementing it;
  project over global key by key, built-in defaults last; a malformed value is a
  diagnostic that falls back to the default.
- **Actual:** `readGitSettings(cwd, deps)` in `src/core/repo-gate.ts` returns
  `{ profile, trunk, trunkMerge, diagnostics }`. Four exports beyond the plan:
  `GIT_SETTINGS_DEFAULTS`, `TRUNK_MERGE_MODES` with its `TrunkMergeMode` type,
  `TrunkSettings`, and `trunkName()`. Precedence detail worth knowing: the first
  scope that carries a key decides, so an invalid value in the project file
  diagnoses and falls to the built-in default; it does not fall through to a
  valid value in the global file. That matches how the repo gate already treats a
  malformed value, but it is stricter than "project over global" read naively.
- **Impact:** ticket 2 should read the trunk through `trunkName()` and never read
  `trunk.develop` directly. Ticket 4 documents `trunkMerge` from
  `TRUNK_MERGE_MODES` (`local` | `handoff`).

**2. The `trunk` setting shape (operator-approved deviation).**

- **Planned:** the architecture's configuration block shows
  `"trunk": { "develop": false, "main": "main", "develop": "develop" }`. That
  object has a duplicate `develop` key, so no parser can represent it:
  `JSON.parse` keeps the last one and drops the switch, and TypeScript rejects
  the type.
- **Actual:** `{ "develop": false | string, "main": string }`, defaults
  `{ develop: false, main: "main" }`. `false` means the repository has no develop
  branch, so the trunk is `trunk.main`; a non-empty string names the develop
  branch, so the trunk is that name. `true`, `""`, and non-strings are rejected
  with a diagnostic that falls back to the default. Implemented as
  `TrunkSettings`, `GIT_SETTINGS_DEFAULTS.trunk`, and `trunkName()`, and covered
  by a test that `true` is rejected.
- **Impact:** the decision was taken with the supervisor during implementation,
  so the behaviour is settled. What is unfinished is the document: the
  configuration block in `docs/tasks/configurable-git-workflow/architecture.md`
  still shows the unparseable snippet. Only the appended "Corrections recorded
  during implementation" section carries the fix, and that section's H2 heading
  appears twice (an uncommitted working-tree edit this ticket did not author or
  commit). Reconcile must correct the block in place and dedupe the heading, and
  ticket 4's docs page must document the corrected shape.

**3. The profile file data contract.**

- **Planned:** each profile carries, per phase, an optional branch template,
  optional opening instructions, optional closing instructions, and an optional
  closing branch gate, plus the merge flag and the push policy; each
  implementation sub-agent gets a branch template; placeholders are `{effort}`
  and `{ticket}`. Field names and values were not specified.
- **Actual:** shipped schema is
  `{ name, merge?, push?, phases: { <phase>: { branch?, openInstructions?, closeInstructions?, closeGate? } }, agents: { <agent>: { branch? } } }`,
  in `src/profiles/default.json` and `src/profiles/flat.json`, resolved relative
  to `import.meta.url` and shipped through the package's existing
  `files: ["src"]` entry (no manifest change needed). `default` carries
  `"merge": "no-ff"` and `"push": "always"`; `flat` omits both, which reads as
  "no merge step, nothing pushed" and resolves as nulls. The bundled `default`
  keeps every instruction field empty, as the architecture specifies, so the
  branch step is generated from the templates.
- **Impact:** these names are now the contract for any operator-authored custom
  profile and for tickets 2 and 4. Ticket 2 consumes `openInstructions`,
  `closeInstructions`, and `closeGate`. The `merge` and `push` value vocabulary
  is invented here and nothing in this ticket consumes either field, so renaming
  is cheap now and expensive once ticket 4 writes the docs page. Ticket 4 should
  confirm the vocabulary before documenting it.

**4. The resolver's two functions.**

- **Planned:** one module exporting a function that returns a phase brief and one
  that returns a gate decision, so the brief and the opener's refusal cannot
  disagree.
- **Actual:** `phaseBrief(cwd, { name, effort, ticket? }, deps)` returns
  `{ profile, kind: "phase" | "agent" | "unknown", branch, step, openInstructions, closeInstructions, closeGate, merge, push, diagnostics }`.
  `gateDecision(cwd, { ...request, currentBranch }, deps)` returns
  `{ pass, profile, branch, currentBranch, step, reason, diagnostics }` and reads
  the same resolution. `deps` is `BriefDeps extends ReadGateConfigDeps, ProfileDeps`,
  so tests inject both settings paths and `profilesDir`.
- **Impact:** `step` is populated only for a phase row, because a sub-agent's
  branch is created by the dispatch, so `gateDecision` on one of the five agents
  returns `step: null`. Ticket 3 must compose its own next-call sentence for the
  spawn refusal instead of reusing a step. Ticket 2 uses `brief.step`,
  `openInstructions`, `closeInstructions`, and `gateDecision` as planned.

**5. `tw_phase_brief`.**

- **Planned:** read-only, needs no open phase, takes a skill name, an effort slug,
  and a ticket slug when the phase is ticket-shaped; returns the resolved branch,
  the branch step, and the phase's instruction text; says so plainly when the
  phase requires no branch; none of this effort's four new tools registers in a
  gated repo.
- **Actual:** as planned, with parameters `skill`, `effort`, and optional
  `ticket`. The details payload mirrors the brief
  (`profile`, `kind`, `branch`, `branch_step`, `instructions`,
  `closing_instructions`, `close_gate`, `merge`, `push`, `diagnostics`). Two
  narrowings: `skill` is validated against the six `SKILL_REGISTRY` phases, so it
  refuses the five implementation agent names the resolver supports (naming the
  phases and the legal next call); and an empty `effort` throws instead of
  returning a refusal, unlike every other refused input on this surface.
  `activeByDefault: true` and membership in `ALWAYS_DECLARED` (and therefore
  `OPEN_CLOSE_TOOLS`) make it declared in every state; it is registered only when
  the gate is inactive, so the gated surface is unchanged.
- **Impact:** ticket 3 cannot obtain an agent brief through the tool and must call
  the resolver. Ticket 4's prose must tell each phase to call `tw_phase_brief`
  before `tw_open`, and must never describe it as an opener: always-declared but
  in no toolset is the invariant that keeps it from deriving a closed phase as
  open.

**6. Fallback posture for a broken profile.**

- **Planned:** a missing profile file, an unknown profile name, or malformed JSON
  is a diagnostic that falls back to `default` rather than a crash.
- **Actual:** a schema violation (non-object root, non-object block, non-string
  field, or a profile name that is not a plain name) also diagnoses and discards
  the whole file, so the resolver answers from `default`; the profile is never
  partially applied. When `default` itself cannot be read, resolution degrades to
  `EMPTY_PROFILE` (`name: "none"`, every phase and agent unguarded) with a
  diagnostic.
- **Impact:** a custom profile with one bad key silently gates on the effort
  branch instead of applying the rest, which is deliberate (a partial profile
  would gate less than its author intended) but is a behaviour ticket 4 should
  state in the docs. The third, unguarded state is beyond the spec's two-level
  fallback and is only reachable with a broken install.

### Abstraction usage

- Used/was specified: **yes**.
- Settings precedence and merge order were extended, not reimplemented:
  `settingsPaths()` is extracted out of `readGateConfig` and shared by both
  readers, so the global agent dir (`$PI_CODING_AGENT_DIR` or `~/.pi/agent`) and
  the project `.pi` path resolve in exactly one place.
  `readSettingsJson`, `getTaskWorkflow`, and `walkToGitRoot` are reused, and the
  repo gate's "malformed value is a diagnostic naming the key and the default"
  shape is reused verbatim for the git keys.
- The profile read seam is the arch's seam: `profilesDir` plus `readFileSync`,
  replaced with fixtures in tests.
- The disclosure set was reused rather than re-listed: `ALWAYS_DECLARED` gained
  the new tool and `OPEN_CLOSE_TOOLS` derives from it, so the open-set derivation
  excludes the tool for free.
- The tool surface reuses `defStructured`, `outcome`, `refusedOuttext`, and
  `SKILL_REGISTRY`; no new refusal vocabulary was invented.
- Not yet used, correctly: the opener's refusal text shape. `gateDecision.reason`
  is a plain sentence, and rendering it through the opener vocabulary is ticket
  2's contract.

### Out-of-scope changes

- `settingsPaths()` extracted from `readGateConfig` in `src/core/repo-gate.ts`.
  A behaviour-preserving refactor required by "extend the existing reader"; the
  repo-gate suite is green.
- `src/disclosure.ts`: `tw_phase_brief` added to `ALWAYS_DECLARED` with its
  explanatory comment; `OPEN_CLOSE_TOOLS` inherits the entry.
- Three foreign test pins updated for the new surface, not to force them green:
  `FULL_TOOL_SURFACE` in `tests/gate-factory.test.ts`, that file's always-declared
  registration test (renamed and keyed on `ALWAYS_DECLARED` instead of a literal
  quartet), and the registration list in `tests/plugin.test.ts`. The opener-gate
  test needed no edit because the tool is exempt through `ALWAYS_DECLARED`.
- Nothing else: no opener wiring, no git seam, no spawn guard, no skill prose, no
  docs page, no manifest or README change (the profiles ride the existing `src`
  files entry). Two additions came from the architecture's per-ticket contract
  rather than speculation: `gateDecision` and the profile-level `merge`/`push`
  fields.
- The working tree carries an uncommitted
  `docs/tasks/configurable-git-workflow/architecture.md` edit ("Corrections
  recorded during implementation") that this ticket did not author and did not
  commit. It is not part of the ticket branch, and its H2 heading is duplicated.
- Nit: `tests/gate-factory.test.ts:986` keeps a stray over-indented
  `const byName` line (eight spaces where six belong) left behind by the edit. The
  repo has no formatter configured to catch it.
- Untested paths, both unreachable through the bundled profiles: a phase whose
  branch template is `{ticket}` (the `isTicketTemplate`/`effortBranchOf` branch
  step) and the "template needs a ticket slug" diagnostic. A future custom
  profile that gates a phase on a ticket branch is the first thing to exercise
  them.

### Ticket doc update needed?

**Yes.** Append to `## Implementation notes`:

- the shipped profile schema and its exact field names, with
  `src/profiles/default.json` and `src/profiles/flat.json` as the two files and
  the package's existing `src` files entry as the reason they ship;
- the corrected `trunk` shape and the `trunkName()` rule, cross-referenced to the
  architecture's corrections section;
- that `tw_phase_brief` is in `ALWAYS_DECLARED`, `activeByDefault: true`,
  registered only outside gated repos, and refuses any name outside the six
  phases (including the five agent names the resolver still resolves);
- the whole-profile fallback rule and the `EMPTY_PROFILE` degradation, plus the
  fact that an invalid project value falls to the default rather than to the
  global value;
- the `merge: "no-ff"` and `push: "always"` vocabulary, flagged as the point
  ticket 4 should confirm before documenting.

### User attention needed?

**Yes**, for two reasons, neither of which blocks this ticket:

1. The architecture's configuration block is still wrong on `trunk`, and the
   correction lives only in an uncommitted, doubly-heading'd appended section.
   The code is right; the document reconcile is not done.
2. The profile field names and the `merge`/`push` values were invented here and
   become the operator-facing contract the moment ticket 4 writes the docs page.
   Confirming or renaming them before then is cheap.
