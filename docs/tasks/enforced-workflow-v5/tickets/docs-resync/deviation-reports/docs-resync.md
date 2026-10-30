---
type: deviation report
title: Deviation report for docs-resync
status: stable
---

## Deviation report: docs-resync

Diff range: `stricter-workflow..ticket/docs-resync` (the landing branch does
not exist yet, so the template's `task/<slug>..ticket/<slug>` range is empty).
7 files, 523 insertions, 244 deletions. `tests/skills.test.ts` is green
(502 tests) and `npx tsc --noEmit` exits 0.

### API surface changes

- **Planned:** arch spec entry 20 pins one contract, "shipped prose matches
  shipped v5". The ticket enumerates the five surfaces to audit (`CONTEXT.md`,
  the top-level `README.md`, both promoted bucket READMEs, `package.json`
  `pi.skills`, the `docs/<bucket>/<skill>.md` pages) and adds one criterion:
  "`task-workflow-overview` names every user-reachable skill accurately".
- **Actual:** no tool, registry entry, skill frontmatter, or `pi.skills` entry
  changed. The shipped prose changed on the five enumerated surfaces, and the
  criterion was resolved to **user-invoked only**: `tests/skills.test.ts:3357`
  pins that each of the 10 `disable-model-invocation` skills appears as
  `/skill:<name>` in the overview's `SKILL.md`. `/skill:handoff` was the one
  skill missing from that set, and it was added to the overview's "Standalone"
  list.
- **Impact:** on the end-of-effort pass more than on any ticket, since this is
  the last one. Three consequences outlive the ticket. `CONTEXT.md` is now the
  vocabulary source later edits are measured against. The new pins make three
  surfaces self-enforcing: the README inventories against `package.json` plus
  each frontmatter, `pi.skills` against `docs/migration-target.yaml`'s
  `promoted_skills`, and `CONTEXT.md` against a retired-word blocklist with a
  `Migration`-entry exemption. Any future edit that adds a promoted skill, flips
  an invocation model, or reintroduces a retired word now fails a test instead
  of drifting.

### Abstraction usage

- Used/was specified: yes. Every pin derives its truth from an existing
  artifact rather than restating it: `promotedSkill` and `parseFrontmatter`
  (already in the file) for the invocation split, `parseYaml` over
  `docs/migration-target.yaml` for the promoted set, and the `## Language`
  block's own `**Term**:` entries for the glossary shape. The docs pages' four
  section checks and the `USER_REACHABLE_V5` block were extended, not
  duplicated. No new test helper duplicates an existing one.

### Out-of-scope changes

- **`docs/repo-gating.md`** (3 lines): the README's `## Repo gating` claim of
  "the six skills" was false, so both were fixed to "the package's skills".
  Correct against `loadGatedSkillNames` (`src/pi.ts:61`), which returns all 29
  basenames from `package.json` `pi.skills`. But the same file still says at
  line 54 "pi 0.80.10 exposes **no** extension hook", while the resolved
  dependency is `@earendil-works/pi-coding-agent` 1.0.3. The version pin was
  left in place in a file this commit was already editing, and the README now
  states the same limitation without a version (the cleaner resolution).
- **`skills/engineering/task-workflow-overview/SKILL.md`** (2 lines): adds the
  `/skill:handoff` bullet. This is the one place the change contradicts an
  earlier decision. `overview-doctor-rescope` recorded that "`/skill:handoff`
  stays where it now lives, in the deep `PHASE-BOUNDARIES` layer"
  (`tickets/overview-doctor-rescope/ticket.md:58-60`), and its deviation report
  handed the wider question to this ticket: "whether the router should also
  carry them is still a product question for `docs-resync`". Read narrowly,
  the addition satisfies this ticket's criterion and does not restore the
  handoff/prototype bridge the rescope removed: it is a Standalone bullet, not
  a main-flow step, and the Standalone list already carried grill-me, teach,
  and wait-what. Read strictly, it moves a line the previous ticket placed
  deliberately deeper. `docs/engineering/task-workflow-overview.md` was not
  updated to match, so the page and the skill now differ by that one name.
- **`README.md` `## What v5 enforces`**: a new six-bullet section replacing
  "What changed from v1". The ticket asked for "the skill inventory and the
  phase flow", and this goes beyond both, though the deleted section was the
  largest source of false claims in the file ("3 agents instead of 7", "6
  skills instead of 10", "Legacy slice resolution preserved").
- **Two stale docs the audit list did not reach, both small and both left
  stale.**
  - `skills/deprecated/README.md:9-12` still says `report-bug` is "Retired in
    favor of `triage` ... the spot-fix path is being folded into `triage`".
    `triage` is itself retired and replaced by `intake`, so a retired skill now
    names another retired skill as its replacement, in the future tense. This
    directly contradicts the line `CONTEXT.md` now states as vocabulary:
    "a retired one names its replacement" (`**Promoted skill**`).
  - `docs/agents/README.md:16` still lists `triage-labels.md`, "mapped to the
    canonical triage roles, when `triage` is configured". No triage-role entry
    survives in `CONTEXT.md`, and `intake` records no such roles, so the file
    describes a config surface with no producer.
- **Three deferrals, judged individually.** `docs/workflow-flows.md` (v4 prose)
  is defensible: it is a whole document rewrite, not a re-sync, and the ticket
  does not name it. "Decision task" in the overview is defensible: a landed v4
  test pins the phrase there, so the canonical-form change belongs to that
  test's owner, and `CONTEXT.md` records it as a flagged ambiguity instead of
  banning it. `docs/bugs/` in `code-review` and `implement-ticket` is the
  weakest of the three: `implement-ticket/SKILL.md:204-210` and both autonomous
  resources instruct the model to `git mv docs/bugs/<slug>.md` and to trust
  that "`docs/bugs/` is outside the write guard's scope", while the spec says
  `docs/bugs/` "retires as a live substrate and survives only as an archive and
  for the migration layer". That is behavioral prose telling a phase to write a
  retired substrate, not a documentation presentation issue, so deferring it is
  right for this ticket; it does need to be carried into the end-of-effort
  inconsistency list rather than dropped.
- **`src/pi.ts:53` `FALLBACK_GATED_SKILL_NAMES`** is stale: it lists
  `implement-task` and `finalize-task` (both retired) and omits every v5 phase
  skill. The gating path is only reached when `package.json` cannot be read, so
  it is dead in practice, but the docs now assert "the package's skills are
  stripped" and the fallback would strip a different set. Source, not docs, and
  pre-existing.

### Ticket doc update needed?

Yes. Append to `## Implementation notes`:

The re-sync derives every pin rather than restating it. The top-level README and
both bucket READMEs are checked against `package.json` `pi.skills` plus each
`SKILL.md`'s `disable-model-invocation`, so a promoted-set or invocation-model
change fails a test instead of drifting; `pi.skills` is separately checked
against `docs/migration-target.yaml`'s `promoted_skills`; `CONTEXT.md`'s
glossary is checked for the pinned v5 terms, for an `_Avoid_` line per term, and
for the absence of the retired vocabulary (the `Migration` entry is the one
exempted block, since it records what the reshape renames). Ten pins, six of
which failed RED before the prose changed.

The criterion "names every user-reachable skill accurately" was resolved to
**user-invoked**: the overview must name the 10 `disable-model-invocation`
skills, and `/skill:handoff` was the only one missing, so it joins the
Standalone list. `code-review`, `tdd`, and `skill-creator` remain unnamed, which
leaves the product question `overview-doctor-rescope` deferred to this ticket
answered narrowly rather than closed.

`CONTEXT.md` was rebuilt in place: 29 `## Language` entries with `_Avoid_`
lines, a rebuilt `## Relationships`, and a `## Flagged ambiguities` section that
resolves "ticket", "task", "decision task", "spec", and "issue tracker" without
using the retired stem. The glossary documents only live language; the spec's
compatibility-layer rule, that a retired word may appear in the upgrade
resources, the migration prose, the migration module, and old-shape readers, is
not stated in any shipped document, so the record of where those words are
still legal lives only in the effort's spec.

Verification: `tests/skills.test.ts` 502 tests green, full suite 18 files and
1145 tests green against the 1135 baseline at `9918ced`, `npx tsc --noEmit`
exit 0. No linter is configured in this repo. Acceptance checkboxes stay
unticked, matching every other landed ticket in this effort.

### User attention needed?

Yes, two items, neither a blocker.

1. **The router's scope is still open.** The prior ticket explicitly deferred to
   this one "whether the router should also carry" `code-review`,
   `skill-creator`, and `tdd`, and `AGENTS.md` calls a router that never
   mentions a user-reachable skill "a router that lies" (and defines a
   model-invoked skill as "model- or user-reachable"). This ticket pinned the
   narrower reading, user-invoked only, so the router still never names those
   three. Confirm the narrow reading is the intended one, or a follow-up effort
   widens it.
2. **`skills/deprecated/README.md` names a retired skill as a replacement.**
   `report-bug` says it was retired in favor of `triage`, which is gone and
   replaced by `intake`. It is a one-line fix, it contradicts the vocabulary
   this ticket just established, and it was not in the audit list. Fix it here
   or carry it to the end-of-effort pass.
