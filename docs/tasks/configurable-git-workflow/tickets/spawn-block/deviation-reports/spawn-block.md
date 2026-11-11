---
type: deviation report
title: Deviation report for spawn-block
status: stable
---

## Deviation report: spawn-block

Reviewed at `ticket/spawn-block` against `task/spawn-block` (10 commits, base
`fb47105` "ticket: finalize branch-gates"), against the architecture document's
contract 3 ("A spawn block on the implementation agents"), the Guards section, and
the ticket's seven acceptance criteria. I re-ran everything in this checkout:
`npx vitest run` is 27 files, 1469 tests, all passing; `npx tsc --noEmit` and
`npx tsc -p tsconfig.test.json` are clean; `tests/spawn-guard.test.ts` alone is 28
tests green. The six changed files are `src/core/spawn-guard.ts` (new, 192 lines),
`src/core/git-profile.ts` (+75/-3), `src/pi.ts` (+54/-2),
`skills/engineering/implement-ticket/scripts/ticket-chain.js` (+26/-13),
`tests/spawn-guard.test.ts` (new, 453 lines), and `tests/skills.test.ts` (2
assertions re-pinned). Nothing is staged; the only working-tree change is the
orchestrator's `docs/tasks/state.yaml`.

### API surface changes

**1. The guard predicate is a module of its own, and it is async.**

- **Planned:** "Exports the guard predicate and its wiring in the `tool_call`
  handler"; "the ticket identity comes from the outer arguments and from a key
  that embeds the slug".
- **Actual:** `src/core/spawn-guard.ts` exports `spawnVerdict(cwd, toolName,
  input, deps): Promise<SpawnVerdict>`, where `SpawnVerdict` is
  `{ pass: true; diagnostics } | { pass: false; reason; decision }`, plus six
  further exports the ticket did not name: `KEY_SEPARATOR` (`"@"`),
  `ticketFromKey(key)`, `spawnIdentity(toolName, input)`, `isSpawnCall(toolName)`,
  and the types `SpawnIdentity`, `SpawnDecision`, `SpawnGuardDeps extends
  BriefDeps { git? }`. The wiring is `guardToolCall` in `src/pi.ts`, which now runs
  `guardTaskTreeWrites` first and `guardSpawn` second, registered under the
  existing `workflowEnabled(gate)` condition.
- **Impact:** ticket 4's prose and any docs page must describe the rule as "a
  spawn the profile gates", not as a list of five agent names: under an operator
  profile, whatever carries a branch template is gated, and under `flat` nothing
  is. The middleware surface (`spawnVerdict`, `KEY_SEPARATOR`) is importable from
  tests and from any later hook.

**2. What counts as a gated spawn: two shapes, where the ticket named one.**

- **Planned:** criterion 1 reads "a `subagent` call naming one of the five
  implementation agents". The Guards section reads "It blocks at the outer call
  using the chain's arguments and at the per-child launch using a key that embeds
  the ticket slug, because arguments passed to a child inside a workflow script do
  not reach the handler."
- **Actual:** both shapes are refused at the outer surface. `spawnIdentity` pulls
  the agent name plus `args.effort` / `args.ticket` from a `subagent` call, so the
  guard blocks (a) a direct dispatch naming a profile-gated agent and (b) a
  workflow launch whose `args` carry a ticket but name no agent, which is exactly
  the shape `implement-ticket` sends. On the per-child surface it reads the agent
  name plus the ticket in `input.key`. The two are one predicate:
  `requiredBrief` asks the agent's own profile row when an agent is named, and
  `ticketBrief` (new in `src/core/git-profile.ts`) asks the profile's ticket-scoped
  rows when only a ticket is named.
- **Impact:** this is the widest deviation and it is the right one: a guard keyed
  only on `agent` would never see the chain launch, which is the only dispatch
  that fires today. Criterion 5 holds as written (another agent, or no resolvable
  ticket, passes untouched), and all three cases are tested. Ticket 4 must write
  "the phase creates and checks out `ticket/<slug>` **before** dispatching the
  chain", because a chain launch from the effort branch is now refused. See the
  user-attention item below.

**3. `PhaseBrief` and `GateDecision` gained `base`, and `ticketBrief` is a new
resolver entry point.**

- **Planned:** contract 3 depends on ticket 1 "for the resolver"; nothing about the
  brief shape.
- **Actual:** `PhaseBrief.base: string | null` and `GateDecision.base: string |
  null` ("what the required branch is created off"), resolved by `branchBase()`,
  the helper that used to be `branchStep()` and now renders the step text from the
  same value. `phaseBrief`'s step string is byte-identical to before for both
  phases (the suite pins it). `effortBranchOf` now returns `null` on an empty
  effort slug, so a surface with no effort resolves "the effort branch" instead of
  a branch literally named `effort/`.
- **Impact:** additive on a landed API (`branch-gates` consumes `brief.step` and
  `brief.branch` and is unaffected; 1469 tests green). Ticket 4 documents the
  refusal text, which now names the base: "create and check out `ticket/one` off
  `effort/an-effort`" at the outer surface, and "off the effort branch" at the
  per-child surface, where no effort slug exists.

**4. The chain's step keys change shape: `<step>@<ticket>`.**

- **Planned:** "the chain's step keys embed the ticket slug, so the identity
  survives into the per-child call where the arguments do not."
- **Actual:** `ticket-chain.js` gained `stepKey(step) = step + "@" + args.ticket`
  and every key goes through it: `gate`, `gate-retry`, `tdd`, `verify`,
  `deviation`, `land`. `KEY_SEPARATOR` is written twice (once in the extension,
  once in the workflow script, which cannot import it) and a test pins the two
  characters together. `@` was chosen over `:` because a key can name an output
  file and a colon is illegal in a Windows filename.
- **Impact:** two small ones nobody has recorded. First, per pi-subagents 0.84's
  configuration docs, a workflow child's progress-record id is
  `subagents/<workflow-run>.<key>` and a key containing characters outside
  `[A-Za-z0-9_+-]` is not used as is: it is truncated to 12 characters with
  substitutions plus a short hash. So "gate" becomes "gate-spawn-b-<hash>" in
  FleetView and the status records, and the readable step name is gone from that
  surface. Second, `runs.state` keys use the same format, so a future mission
  workflow that wants to read a step's state by name inherits the separator.
  Neither affects behaviour, and `result.failed` still reports the bare step name
  ("gate", "tdd", ...), so the prose that branches on `result.failed` is intact.

**5. The guard fails open on a checkout it cannot read, and says so.**

- **Planned:** nothing; the Guards section only says a blocked spawn fails its
  step.
- **Actual:** a `pass: true` verdict may carry diagnostics, and `guardSpawn`
  reports each one through `ctx.ui.notify("task-workflow spawn guard: ...")`
  before letting the spawn through. Unlike `tw_open`, which puts diagnostics in
  the result text and details, a hook has no result payload, so the operator
  channel is the only place to put it.
- **Impact:** this is the convention the `branch-gates` deviation report flagged
  for exactly this ticket ("if its spawn guard copies this convention, nothing
  enforces the ticket branch either"). It did copy it. A session whose `pi.exec`
  cannot reach git spawns workers with a notification and no enforcement. The
  fail-closed variant is a one-line change in `spawnVerdict`, and the decision is
  the operator's, not this ticket's.

**6. One `tool_call` handler, not two.**

- **Planned:** "The extension already registers a `tool_call` handler; the spawn
  guard lives there."
- **Actual:** instead of a second `pi.on("tool_call", ...)`, `src/pi.ts` composes
  `guardToolCall = guardTaskTreeWrites ?? guardSpawn` and registers that. The
  hook-count test in `tests/gate-factory.test.ts` (which asserts one handler)
  passes unchanged, and the write lockdown keeps priority, so a `write` into
  `docs/tasks/` is still refused by the lockdown's reason rather than possibly by
  the spawn guard's.
- **Impact:** none on dependents; noted because it is a refactor of an existing
  registration rather than a new one, and because the lockdown-first order is now
  load bearing but untested as an ordering.

### Abstraction usage

- **Used/was specified: yes**, with two abstentions and one divergence in degree.
  The guard reuses the opener refusal vocabulary and the resolver's own
  `decideFromBrief`, so a spawn refusal and a phase refusal cannot disagree (the
  architecture's "resolver seam" decision, honoured literally). It reuses
  `readCheckout` and the `GitRun` seam shape rather than spawning git itself, the
  profile data rather than a five-name list, the fake-context test pattern from
  the opener tests, and the chain's named-step conventions.
- **Abstention 1: a second `GitRun` closure.** `guardSpawn` builds
  `git: async (args) => pi.exec("git", args, { cwd: ctx.cwd })` inline, which is
  character-for-character the closure already sitting in the tool-context
  construction at `src/pi.ts:4069`. The `branch-gates` report predicted this
  ("it must build its own `GitRun` from `pi.exec`, ... a second copy is the likely
  outcome unless it is factored out"). It is not a defect: the `tool_call` context
  is `ExtensionContext`, which carries neither `git` nor `profilesDir`, so the
  hook cannot reach the `ToolContext` seams at all. The two copies should be one
  exported factory before a third caller appears.
- **Abstention 2: no `profilesDir` seam.** `SpawnGuardDeps extends BriefDeps`, so
  the guard accepts a profile fixture directory, but nothing passes one, and the
  tests select profiles the only way the hook allows: a temp `.pi/settings.json`
  plus `PI_CODING_AGENT_DIR`. A test of a custom profile reaching the guard would
  need a real file, which is exactly what `profilesDir` exists to avoid.
- **Divergence in degree: "the five agents" is read as "the profile's agents".**
  Correct per the architecture ("no profile name appears in a branch of code"),
  and worth stating plainly because two of the five (`implement-preconditions`,
  `slice-verifier`) never commit. Gating them is stricter than the doc comment's
  rationale ("a dispatch of an implementation agent commits on the ticket
  branch"), and it is what makes even the chain's first gate step refuse off the
  effort branch.

### Out-of-scope changes

- **Additions:**
  - `src/core/spawn-guard.ts`: the whole module, including five exports beyond the
    predicate (`KEY_SEPARATOR`, `ticketFromKey`, `spawnIdentity`, `isSpawnCall`,
    and the three types) and `SpawnGuardDeps.git`.
  - `src/core/git-profile.ts`: `ticketBrief`, `PhaseBrief.base`, `GateDecision.base`,
    and the `effortBranchOf` empty-slug fix.
  - `src/pi.ts`: `guardSpawn` and `guardToolCall`, and the `notify` on a diagnostic
    pass.
  - `ticket-chain.js`: `stepKey` and its seven call sites.
  - `tests/skills.test.ts`: five assertions re-pinned, not deleted (the `chain call
    shapes` block asserted literal `runs.run("gate"/"tdd"/"verify"/"land"` keys,
    which criterion 4 replaces). The guards keep their intent: keyed, awaited
    `runs.run`, gate before tdd, no retired chain API. This is a foreign test file
    that `workflow-prose` also edits, so expect a small conflict.
- **Removals:** none. No behaviour was deleted from the chain, the resolver, or the
  lockdown.
- **Explicitly not done:**
  - **No documentation.** The architecture assigns the git-profile docs page to
    `workflow-prose`, and this ticket carries no docs criterion. But the spawn
    block is new enforcement surface: `docs/repo-gating.md` documents the sibling
    `tool_call` lockdown and says nothing about spawns, so a reader who hits a
    refusal has no page describing it. The profiles page is the natural home; the
    lockdown section is the other candidate. One of them must take it.
  - **No end-to-end coverage of the per-child surface.** `subagent_launch` does not
    exist in the pinned `pi-subagents` (`^0.84.0`, resolved 0.84.0; `grep -r
    subagent_launch node_modules/pi-subagents` finds nothing, and the bundle
    registers only `subagent`). The surface is written to the documented input
    shape and covered by unit tests against a simulated call; it cannot be
    exercised against the installed package. The outer block is the surface that
    fires today.
  - **`tasks`, `chain`, and `parallel` fanout shapes are not guarded.** Only
    `agent` plus `args`, and the per-child key, identify a spawn. No shipped
    procedure dispatches the five agents through those shapes, but nothing refuses
    a model that did.
  - **`closeGate` is still unenforced** (reported by `branch-gates`, untouched
    here).
  - **No test drives a real git process**; the suite asserts the exact `pi.exec`
    call and `cwd` through a stub, matching this effort's seam-summary convention
    for everything except the temporary-repository case.

### Ticket doc update needed?

**Yes.** The ticket doc has no `## Implementation notes` section yet. Append one
with:

- The guard is `spawnVerdict` in `src/core/spawn-guard.ts`, wired through one
  `tool_call` handler (`guardToolCall`) that runs the write lockdown first and the
  spawn guard second. It registers only where the workflow is enabled.
- It blocks two outer shapes, not one: a `subagent` call naming a profile-gated
  agent, and a workflow launch whose `args` carry a ticket. It blocks the per-child
  `subagent_launch` by reading the slug after the last `@` in `input.key`.
- The rule is profile-driven: what carries a branch template is gated, which under
  `default` is the five implementation agents and under `flat` is nothing.
- The refusal reuses the opener vocabulary and is returned as `{ block: true,
  reason }`, never thrown, so the blocked step fails and the session continues. It
  names the current branch, the required branch, and the base to create it off.
- A checkout the git seam cannot read **passes** with `ctx.ui.notify`, inheriting
  the branch gate's fail-open convention.
- Chain step keys are `<step>@<ticket>` via `stepKey()`, and `KEY_SEPARATOR` (in
  the extension) is pinned to the script's literal by a test.
- Resolver additions consumed here: `ticketBrief`, `PhaseBrief.base`,
  `GateDecision.base`.
- Known gap: the per-child surface is untested end to end because the pinned
  pi-subagents has no `subagent_launch`; the installed pin should be revisited.

### User attention needed?

**Yes**, on three points.

1. **The implementation phase cannot dispatch between this ticket and
   `workflow-prose` (ticket 4).** Today's `implement-ticket` prose creates the
   effort branch and dispatches `ticket-chain.js` from it, and the chain's
   `tdd-worker` creates `ticket/<slug>` itself. After this ticket that chain
   launch carries `args.ticket` and is refused, because the checkout is
   `effort/<effort>` and the required branch is `ticket/<slug>`. The refusal names
   the exact remedy and nothing latches, so the gap is crossable by hand (create
   and check out the ticket branch before dispatching) or by
   `taskWorkflow.git.profile: "flat"`, which makes the guard inert. The clean
   resolution is to land `workflow-prose` next; a split of that ticket's prose
   change into an earlier land would remove the window entirely.
2. **The guard fails open, matching the branch gate.** A session whose git seam
   fails spawns workers on an unverified checkout with a notification. Consistency
   with the openers argues for it; the ticket's "never blocked off-branch work"
   intent argues against. It is a one-line flip in `spawnVerdict`, and it should be
   decided once for both enforcement points rather than twice.
3. **The per-child surface rests on an uninstalled package version.** The design
   comes from a feasibility note pinned to pi-subagents 0.86.0; this repo pins
   `^0.84.0`, whose bundle has no `subagent_launch`. If the pin never moves, the
   per-child block is dead code that the suite keeps green. Worth a decision
   (raise the pin in a later ticket, or record the surface as speculative).
