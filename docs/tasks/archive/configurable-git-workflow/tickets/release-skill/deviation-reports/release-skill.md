---
type: deviation report
title: Deviation report for release-skill
status: stable
---

## Deviation report: release-skill

Reviewed at `task/release-skill` against `main` (seven `wip:` commits,
`bc3aa2a`), plus the architecture's Release skill paragraph, its per-ticket
contract 7, and the ticket's six acceptance criteria. Every criterion is met as
written. `npx vitest run` is 29 files / 1561 tests passed,
`npx vitest run tests/skills.test.ts` is 618 passed, and both `npm run
typecheck` and `npm run typecheck:tests` are clean. Nothing is staged; the only
dirty path is `docs/tasks/state.yaml`, the harness's task pointer.

The implementation result's own divergence list is accurate. The findings below
are what it did not cover: three of them are obligations inherited from the
blocking `release-mechanics` report that the prose did not discharge.

### API surface changes

**1. The contract named four wiring surfaces; the suite enforces eight.**

- **Planned:** contract 7 says "Adds the skill file, its bucket docs page, the
  manifest entry, and both README lines", and the ticket's sixth criterion
  repeats those four "with the structure tests green".
- **Actual:** those four, plus `docs/migration-target.yaml`
  (`promoted_skills`), `skills/engineering/task-workflow-overview/SKILL.md` and
  `docs/engineering/task-workflow-overview.md`, the two `pi.skills` count pins
  (32 to 33), the `SKILL_FILES` entry, and `SURVIVING_TOOLS`. Each extra is
  forced by a derived pin that reads the manifest: "package.json pi.skills is
  exactly the promoted set the migration target names", "task-workflow-overview
  names every user-reachable skill", and the count assertions.
- **Impact:** none downstream. This is the effort's last consumer, and no tool,
  field, chain arg, or refusal code moved. The contract's four-surface list is
  simply incomplete: the next promoted skill should expect eight.

**2. The tool surface did not move; the test allowlist did.**

- **Planned:** no tool change; contract 7 only has the skill drive the two tools
  the release-mechanics ticket shipped.
- **Actual:** `tw_release_plan` and `tw_release_apply` are untouched by this
  branch. `tests/skills.test.ts` `SURVIVING_TOOLS` gained both names because
  `expectOnlySurvivingTools` rejects any `tw_*` name in promoted prose that the
  set does not carry. Both names are in `ALWAYS_DECLARED`, so the widening is
  honest.
- **Impact:** a test pin, not a product surface. But note the consequence of
  `ALWAYS_DECLARED` plus no registry entry: `tw_release_apply` writes manifests
  with nothing open, and "once the operator confirms" in the tool description
  plus this skill's prose are the only guard (see user attention 1).

**3. The `no-config` legal next tells the reader to do what the skill forbids.**

- **Planned:** the architecture says a missing `.changeset/config.json` "is a
  hard error, because falling back to the built-in default would version a
  repository that has no changesets setup at all", and the ticket says the skill
  "refuses and names what is missing".
- **Actual:** `releaseLegalNext("no-config")` renders `run 'npx changeset init'
  in the repository, then retry tw_release_plan`, so the refusal arrives as
  `Refused: <reason>. Legal next: run 'npx changeset init' ...`. The skill then
  says "never run `npx changeset init` on the operator's behalf", and a test
  pins that sentence. The same shape, softer, on `no-version`: `add a version to
  the package.json the refusal names, then retry`.
- **Impact:** the model reads two instructions pointing opposite ways, and
  `workflow-failure`, which this skill tells it to load, makes the refusal's
  `legal_next` its first rung ("act on a refusal's own reason and legal_next").
  A session that follows rung one initialises changesets in a repository the
  architecture says must not be versioned that way. The fix is one string in
  `releaseLegalNext` (name the operator as the actor), which is a product edit
  outside this ticket, or one clarifying clause in the skill saying the legal
  next is the operator's to run.

**4. The plan reports a section per released package; the prose promises a root
changelog.**

- **Planned:** the architecture says the skill "always bumps versions through the
  changesets libraries and maintains a root `CHANGELOG.md`", and the
  release-mechanics contract says the plan reports "the changelog section text",
  singular.
- **Actual:** `tw_release_plan` returns `changelog: { package, file, text }[]`,
  one entry per released package with the absolute file it lands in. The skill
  body gets this right ("the changelog section each release adds"), but its
  frontmatter `description` and `docs/engineering/release.md` both say "the root
  `CHANGELOG.md`", and step 2 says "inserts the changelog section" without
  saying to report the files the tool names.
- **Impact:** one package repo sees no difference; a monorepo is told the wrong
  file. It also leaves the forced `changelog: false` override undocumented,
  which the release-mechanics report named as ticket 7's obligation (see user
  attention 3).

### Abstraction usage

- Used/was specified: **yes**. The skill is prose only: it calls `tw_release_plan`
  then `tw_release_apply`, reimplements none of the mechanics (no semver, no
  changeset parsing, no changelog insertion), performs no branch operation and
  no git call, matching the architecture's "It performs no branch operations".
  It carries the house preamble (`operator-communication`, then
  `workflow-failure`) that every promoted skill carries, and the docs page uses
  the four prescribed sections in order. The promoted-set wiring mirrors the
  existing entries rather than inventing a second list.
- Not used, deliberately: the named writers and the write lockdown (this ticket
  writes no artifact through a tool), `tw_open` and the registry (no phase owns a
  release), and `tw_feedback` beyond the preamble sentence.
- Not used, and it should have been: `refusal.code`. The blocking ticket's report
  asked this skill to "separate `empty-plan` ... from the other six" and to
  branch "by code, not by `versions.length`". The prose separates the outcomes
  and never reads `versions.length`, but it tells the reader to recognise
  nothing-to-release from the reason's wording ("The reason names the case when
  nothing is pending and the plan is still empty"). `refusal` carries
  `{ code, reason }`, so the durable branch was available and the advisory one
  was taken. The tests pin the wording, not the code, so a reworded reason
  drifts silently.

### Out-of-scope changes

- Added `skills/engineering/release/SKILL.md` (88 lines): three numbered steps
  (plan and report, confirm then apply, follow `docs/releasing.md`) and two
  stopping outcomes (not set up for changesets, nothing to release), plus the
  no-branch-operations statement.
- Added `docs/engineering/release.md` (72 lines), four sections in order,
  shipped by the existing `docs/engineering` entry in `package.json` `files`,
  and linking `../git-workflows.md`, which exists.
- `tests/skills.test.ts`: the new `describe` block (six tests, one per
  criterion plus the wiring), the `SKILL_FILES` entry, the `SURVIVING_TOOLS`
  pair, and the two count pins.
- `skills/engineering/task-workflow-overview/SKILL.md` and its docs page:
  forced by the derived router test, not chosen.
- `docs/migration-target.yaml`: forced by the promoted-set equality test.
- One cosmetic slip the tests cannot see: the top-level `README.md`
  user-invoked list is grouped engineering then productivity, and `release` (an
  engineering skill) is inserted inside the productivity block, between
  `handoff` and `teach`. The bucket README appends it at the end of its
  user-invoked list, which matches that file's workflow ordering, so only the
  top-level list is out of place.
- Not done, each consistent with the siblings: no `docs/tasks/CHANGELOG.md`
  entry (every finished sibling got one through the parent's `docs(ticket): note
  <slug>` commit); no `ticket: finalize release-skill` commit, so the ticket doc
  is still `workflow_state: ready`; no `architecture.md` amendment for items 3
  and 4 above, and the architecture still carries its duplicated
  `## Corrections recorded during implementation` heading, which was already
  stale before this ticket.
- Nothing removed.
- Untouched, correctly: `src/pi.ts`, `src/disclosure.ts`,
  `src/core/changesets.ts`, and `docs/releasing.md` (the skill defers to that
  file whatever it says, so editing it would move the authority the
  architecture places there).

### Ticket doc update needed?

**yes.** The ticket doc is still `workflow_state: ready` and has no
`## Implementation notes`, while all seven siblings carry one with
`### What landed` and `### Lessons`. Append, in that shape:

- **What landed:** the user-invoked `release` skill (frontmatter with
  `disable-model-invocation: true`), its three steps and two stopping outcomes,
  the four contract surfaces plus the four derived ones, the docs page, and the
  six new tests; verification numbers (29 files / 1561 tests, 618 in
  `tests/skills.test.ts`, both typechecks clean); `workflow_state: done`.
- **Lessons:** the `no-config` legal next contradicts the skill's prohibition
  (item 3 above); `refusal.code` was available and the prose branches on wording
  instead; the plan reports one changelog section per released package while the
  architecture and this skill's description say "root"; the forced
  `changelog: false` override is documented nowhere an operator reads; a gated
  work repo loads `/skill:release` and registers neither tool; the
  prose-position assertions (`plan` before `confirm` before `apply`, the
  document section after the apply) pin order, so a later rewrite that reorders
  sections while keeping the behaviour needs the assertions re-read; and two
  regexes in the new tests are alternations that pass on either half
  (`/never create|never runs? \`npx changeset init\`/i`,
  `/no version bump|nothing is bumped|does not bump/i`), so neither prohibition
  is pinned on its own.
- **Divergences:** the architecture points at a `## Divergence from plan`
  section that none of this effort's ticket docs has. The convention in practice
  is `## Implementation notes` with `### What landed` / `### Lessons`; record
  them there, as the siblings did.

### User attention needed?

**yes**, three items. None changes this ticket's scope; two outlive it.

1. **The refusal text argues against the skill.** `releaseLegalNext("no-config")`
   instructs the reader to run `npx changeset init`, which the skill forbids in
   as many words, and `workflow-failure`'s first rung is to obey that text. Fix
   either the string (name the operator as the actor) or the skill (say the
   legal next is the operator's to run). The contradiction is live in the
   shipped prose and cannot be settled inside this ticket's file set.
2. **`release` is reachable in a gated work repo where its tools never
   register.** `GATED_SKILL_NAMES` does not list `release`, so the skill stays in
   the prompt and the typed command loads it, while `GATED_REGISTERED_TOOLS` is
   `tw_open`, `tw_close`, `tw_feedback` only, so both tools the skill's first
   step calls are absent. The architecture settled the tool stance ("none of them
   registers in a gated repo") and never decided the skill's reachability, so the
   implementer could not close it without an out-of-ticket edit to
   `src/disclosure.ts`. Either `release` joins the gated manifest, so a work repo
   refuses the command up front, or the skill's prose says it needs an ungated
   repository. Worth a deliberate decision at the effort close, since the
   repository this skill's own `docs/releasing.md` lives in is the shape that
   triggers it.
3. **The changelog promise is narrower than the prose.** The mechanics write one
   section per released package and force a changelog even when the config says
   `changelog: false`, because the architecture says "always maintains a root
   `CHANGELOG.md`". `docs/engineering/release.md` is the only operator-facing
   place either fact could be read, and it says "root" without the override. The
   skill never promises the preview equals the file, which covers the other half
   of the release-mechanics report's concern, so this item is documentation only.

No provider-schema caveat applies: no tool schema, no `tw_open` union, and no
agent `tools:` allowlist changed on this branch.
