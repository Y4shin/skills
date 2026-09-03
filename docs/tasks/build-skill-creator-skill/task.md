---
kind: task
type: feature
slug: build-skill-creator-skill
title: Build the skill-creator Agent Skill (portable + capability-conditional, Pi-packaged)
map: portable-skill-authoring
status: ready
blocked_by:
- support-script-conventions
slices:
- scaffold-and-register
- support-scripts-node
- core-skill-body
- references-portable-and-pi
- references-support-scripts
- self-review-and-finalize
---

## Decision being implemented

From the `portable-skill-authoring` map: build `skill-creator`, a reusable
Agent Skill that helps an agent create, review, update, and improve other
Agent Skills. It ships in this `task-workflow` Pi package with spec-pure
frontmatter; by default it authors generic, minimal-capability skills, and it
carries capability-conditional rules that activate when the target agent's
capabilities (filesystem, bash/exec, network, MCP, harness extensions) are
known — with Pi as the one first-class named target. Its own helper scripts are
Node/TS; the per-language best-practices for scripts a *produced* skill bundles
are seeded by the `support-script-conventions` grilling task.

## User-visible outcome

`/skill:skill-creator` is invokable from this package; asking it e.g.
"create a skill for reviewing Go API changes", "turn this workflow into a
skill", "improve this SKILL.md", "this skill isn't triggering reliably; fix
it", or "make this Claude-oriented skill portable" produces a small, spec-
conformant, well-triggered, progressively-disclosed Agent Skill (and, when the
target is Pi, registers it in the package and adds structure tests). The skill
loads wherever `task-workflow` is installed (gated off in work repos).

## Scope

In scope:
- `skills/skill-creator/SKILL.md` — spec-pure frontmatter (`name:
  skill-creator`, `description` = trigger-designed, ≤1024) + the synthesized
  core authoring workflow (understand → discover/update-over-create → plan →
  scaffold → write frontmatter+body → validate → adversarial self-review →
  iterate), the core principles, the **capability-ceiling + capability-
  conditional rules** model, produced-skill frontmatter guidance, the
  "choose a script language" decision rule, and a one-level-deep references
  index.
- `skills/skill-creator/scripts/` — `validate_skill.mjs`, `scaffold_skill.mjs`,
  `discover_skill.mjs` (Node, dependency-light, each with a by-hand fallback),
  porting the best of sentient-agi's stdlib-Python scripts and **fixing the
  `compatibility`-omission bug**.
- `skills/skill-creator/references/` — `agent-skills-spec.md` (portable format,
  single-sourced from the current spec), `target-pi.md` (Pi-package target
  conventions), `support-scripts.md` (the **shared** support-script backbone:
  when-to-ship, language choice incl. Bash-discouraged/Windows, the
  self-contained-at-runtime dependency+build policy, the safety-first by-hand-
  fallback decision, shape/testing), plus `support-scripts-python.md`,
  `support-scripts-js-ts.md`, `support-scripts-bash.md` (per-language specifics +
  bundling policy + Bash Windows/POSIX caveats — seeded from the
  `support-script-conventions` grilling decisions; the concrete bundler/build
  template comes later from the `bundle-script-template` prototype, so this task
  is not blocked on it). A `trigger-design.md` only
  if the trigger-design detail outgrows `SKILL.md`.
- `package.json` — add `"./skills/skill-creator"` to `pi.skills` (length 15 →
  16).
- `tests/skills.test.ts` — add `"skills/skill-creator/SKILL.md"` to
  `SKILL_FILES`; bump the `pi.skills.length` assertion 15 → 16.
- `tests/skill-creator-scripts.test.ts` (new) — vitest tests for the three
  helper scripts (valid skill, bad name, missing/too-long description, unknown
  frontmatter field, scaffold create/duplicate, discover ranking).

Out of scope:
- Per-brand reference files for the ~45 Agent-Skills clients (broad catalog).
- A trigger-rate eval automation / per-client harness integration.
- Auto-generation of human-facing docs for produced skills.
- Authoring skills in a non-Agent-Skills format (Custom GPTs, plugins).
- A `license` field on `skill-creator` (ruled out by the user).

## Acceptance criteria

- `skills/skill-creator/{SKILL.md, scripts/*, references/*}` exist and are
  non-empty; no `README.md`/`CHANGELOG.md`/install-guide/dev-diary in the skill.
- `SKILL.md` frontmatter has only `name: skill-creator` and a non-empty
  `description` (≤1024) — **no** `disable-model-invocation`, `license`,
  `metadata`, or other non-spec field.
- The folder name equals the `name`; the description enumerates literal trigger
  phrases for every major capability (create / make / build / scaffold a skill;
  turn a workflow into a skill; improve / refactor / fix a non-triggering
  skill; review a skill for context usage; decide new-vs-existing skill; make
  a skill portable) and a "Do NOT use for …" boundary.
- `SKILL.md` body states the capability-ceiling default (assume minimal
  capabilities) and the capability-conditional rules (filesystem / bash-exec /
  network-MCP / harness-extensions), and the "Portable Agent Skills behavior"
  vs "Harness-specific extension" distinction.
- `SKILL.md` stays lean (≤500 lines / ≲5000 tokens); detailed material is in
  references, linked one level deep with when-to-read notes.
- `package.json` `pi.skills` contains `"./skills/skill-creator"` and has
  length 16; `tests/skills.test.ts` `SKILL_FILES` includes the new skill and
  asserts length 16; `npm test` is green.
- The Node validator accepts `skills/skill-creator` itself (dogfooded) and
  rejects a deliberately bad skill (bad name, missing/too-long description,
  unknown field); the three scripts' vitest tests pass.
- If `skills-ref` is runnable/installed, it accepts the skill; otherwise the
  manual checklist (frontmatter, naming, length, references present) is
  documented as passed in the self-review slice.
- Adversarial self-review is complete: trigger test (≥3 should-trigger + ≥2
  near-miss requests executed against the final description, revised if
  needed), execution dry-run of "create a skill for reviewing Go API changes",
  context review, generalization review; placeholder/TODO files removed.

## Existing abstractions to use

- `tests/skills.test.ts` structure-test pattern + manifest assertions (mirror
  the `build-tdd-reference-skill` precedent for registration + length bump).
- `package.json` `pi.skills` list. The repo's vitest + TypeScript toolchain
  for the Node helper scripts and their tests.
- sentient-agi `meta-skill-creator` `scripts/{validate,scaffold,discover}_
  skill.py` as the design source to port to Node (fixing the `compatibility`
  omission).
- DeepAgents `skill-creator` + the agentskills.io "Best practices" /
  "Optimizing descriptions" / "Using scripts" guides as the synthesis source
  for workflow, principles, and trigger design.
- The current Agent Skills spec (agentskills.io/specification) as the
  authoritative format reference; `skills-ref` as the official validator.
- The `tdd` skill as the in-repo precedent for a skill with companion reference
  files + manifest/test updates.

## Architecture / domain decisions

- **Capability-conditional, not brand-conditional.** The default produced
  skill assumes only: "agent can read the `SKILL.md` body, and optionally call
  MCP tools." Capability rules (filesystem / bash-exec / network / MCP /
  harness-specific frontmatter) live in `SKILL.md` as concise decision rules;
  deeper per-capability examples may go in references only if they outgrow the
  body. Pi is the one named target; its conventions live in
  `references/target-pi.md`.
- **Single-sourcing.** Each fact has one home: the spec digest lives in
  `references/agent-skills-spec.md` and is not paraphrased into `SKILL.md`;
  `SKILL.md` says *when* to read it. Pi specifics live only in
  `references/target-pi.md`. The per-language script best-practices live only
  in `references/support-scripts-*.md`.
- **Dogfooding.** `skill-creator`'s own Node validator validates
  `skill-creator` itself; the self-review slice runs it.

## Implementation notes

### Slice 1 — scaffold-and-register (landed)

Scaffolded `skills/skill-creator/` with `SKILL.md` (spec-pure frontmatter —
only `name: skill-creator` + a trigger-designed `description` ≤1024 enumerating
literal trigger phrases for create/make/build/scaffold, turn-a-workbook-into-a-skill,
improve/refactor/fix, review for context usage, decide new-vs-existing, and make
portable, plus a "Do NOT use for …" line) and a first-pass body: the 8-phase
core-workflow skeleton (one line each) + a capability-ceiling stub (default =
minimal capabilities; conditional rules for filesystem/bash-exec/network-MCP/
harness-extensions). Empty `scripts/` and `references/` placeholders shipped
for later slices (no placeholder files — spec forbids extraneous docs).
Trigger-test seeds recorded in the archived slice doc (3 should-trigger + 2
near-miss).

Registered the skill in `package.json` `pi.skills` and `tests/skills.test.ts`
(`SKILL_FILES` + length assertion).

**Manifest-number correction (intentional, per arch spec):** the manifest is at
**17**, not the task doc's stale "15 → 16". The arch spec documents that
`wait-what` had already been added (taking the manifest to 16) before this
task's slices ran, so adding `skill-creator` reaches 17. Implementation note:
at this slice's base commit the manifest was in fact still at **15** and
`skills/wait-what/` was untracked, so the slice registered **both**
`./skills/wait-what` and `./skills/skill-creator` (and added `wait-what` to
`SKILL_FILES`) to arrive at the arch-spec-mandated 17. `skill-creator`'s own
frontmatter remains spec-pure (`wait-what` is a separate Pi-only skill with
`disable-model-invocation`). `pi.skills.length === 17`; the assertion is
`toBe(17)`; `SKILL_FILES` gained both rows. Full suite was green at handoff
(580/580).

### Slice 2 — support-scripts-node (landed)

Added the three Node helper scripts to `skills/skill-creator/scripts/`:
`validate_skill.mjs` (uses the repo's existing `yaml` ^2.6.1 dep for robust
parsing rather than a hand-rolled minimal parser — the smaller-risk option
flagged in the slice doc; accepts a skill *directory* path, matching the
arch spec's `<skill-dir>` interface), `scaffold_skill.mjs` (normalize-name →
create folder → write `SKILL.md` template + selected resource dirs; refuses to
overwrite an existing skill), and `discover_skill.mjs` (scan immediate
subdirs for `SKILL.md`, rank by name-similarity + token overlap-coefficient on
the smaller set, print candidates ≥ threshold with an "UPDATE over create"
hint). Each script carries a by-hand fallback in its header comment.

Fixed the `compatibility`-omission bug: `validate_skill.mjs`'s allowed
frontmatter keys = `name, description, license, compatibility,
allowed-tools, metadata` — it **accepts** a skill carrying `compatibility:`
and **rejects** `disable-model-invocation` (and any other unknown key).

Added 22 vitest cases in `tests/skill-creator-scripts.test.ts` covering:
validate PASS/FAIL paths (bad name, missing description, >1024 description,
unknown field, `compatibility`-accepted, `disable-model-invocation`-rejected,
1024-boundary PASS / 1025 FAIL, trailing-hyphen FAIL, description-with-colon);
scaffold create + refuse-overwrite; discover ranking above threshold; and the
dogfood assertion (`validate_skill.mjs skills/skill-creator` → PASS).

Added a "Helper scripts" section to `skills/skill-creator/SKILL.md` stating
when to run each (validate before finishing; discover before scaffolding a
new skill; scaffold only for new skills) with the by-hand fallback
one-liners.

The merge also carried the parent-side commit `chore: commit untracked
wait-what skill` (`skills/wait-what/SKILL.md`), which slice 1 registered in
the manifest but hadn't committed on the task branch — needed for the
task-branch tests to pass. Full suite green at handoff (602/602).

### Slice 3 — core-skill-body (landed)

Replaced the slice-1 skeleton body with the full synthesized core in
`skills/skill-creator/SKILL.md`: the capability-ceiling default (assume only
that the agent can read the body + optionally call MCP tools) + the four
capability-conditional rules (filesystem → reference/inspect/update-over-
create; bash/exec → bundle+run a script; network/specific-MCP → express as a
tool call or documented dependency; harness-specific frontmatter → keep the
portable core intact and add the bit as an explicit extension) with the
"Portable vs harness-specific extension" distinction; the 8-phase workflow
(understand → discover/update-over-create → plan → scaffold → write
frontmatter+body → validate → adversarial self-review → iterate), each with a
concrete reason; produced-skill frontmatter guidance (`name`/`description` rules
+ 4 optional spec fields — `license`, `compatibility`, `allowed-tools`,
`metadata` — each with a justification, and the rule that harness-specific
fields like a vendor `disable-model-invocation` stay out of the portable core);
the core principles (assume capable, match rigidity to fragility, progressive
disclosure body <500 lines ≲5k tokens / references one level deep, single-source
each fact, explain the why, favor procedures, provide defaults not menus,
gotchas are highest-value); the "choose a script language" decision rule (bundle
only for exact/fragile/repeated ops; match the target repo's canonical language;
default Python; Bash supported but discouraged for cross-platform; self-contained
at runtime; safety-first by-hand fallback) pointing to the 5 support-script
references; "what not to include / no surprise"; and a one-level-deep references
index (the 6 reference files + the optional `trigger-design.md`), each with a
when-to-read note.

**Size:** 354 lines / ~3550 tokens (≤500 / ≲5000 — lean). **Frontmatter**
unchanged (still only `name: skill-creator` + the slice-1 trigger-designed
`description` ≤1024 — spec-pure, no `disable-model-invocation`/`license`/
`metadata`). The slice-2 "Helper scripts" section is preserved (unchanged).
**No references written** — the body names the 6 reference files + optional
`trigger-design.md` that slices 4–5 will create; this slice's acceptance is
naming presence, not file presence. The tdd-worker reported zero deviations.
Full suite green at handoff (602/602).

### Slice 4 — references-portable-and-pi (landed)

Added the two always-true reference files to
`skills/skill-creator/references/`:

- **`agent-skills-spec.md`** — the portable Agent Skills format digest,
  single-sourced from the live spec at agentskills.io/specification (with a
  recheck-at-authoring-time note). Covers directory structure (`SKILL.md`
  required + optional `scripts/`/`references/`/`assets/`); frontmatter rules —
  `name` (≤64, lowercase a-z/0-9 + hyphens, no leading/trailing/consecutive,
  must match parent dir) and `description` (≤1024, no angle brackets, what +
  when) required, with exactly the four optional fields (`license`,
  `compatibility` ≤500, `metadata` string→string map, `allowed-tools`
  space-separated + experimental), and **no others** spec-valid; body has no
  format restrictions but the whole file loads on activation so keep it lean;
  progressive disclosure (metadata ~100 tokens always, body <5000 tokens /
  <500 lines on activation, resources as needed); file refs relative and one
  level deep (no nested reference chains); validation via `skills-ref` with a
  manual-checklist fallback. Opens with "Read when authoring frontmatter or
  deciding structure" matching the slice-3 references index.

- **`target-pi.md`** — authoring a skill for a Pi package (the one first-class
  named target). Covers where Pi skills live (`skills/<name>/SKILL.md`,
  registered in `package.json` `pi.skills` as `"./skills/<name>"`,
  conventionally covered by `tests/skills.test.ts` via the `SKILL_FILES` array
  + a `pi.skills.length` assertion); the repo gate (task-workflow + so
  skill-creator auto-disables in work repos, and a produced Pi skill inherits
  that gating — stated so the author isn't surprised); the companion-doc
  precedent (the `tdd` skill ships `tests.md` + `mocking.md` alongside
  `SKILL.md`, encouraged when it keeps the main file lean, one level deep);
  the Pi-specific frontmatter **`disable-model-invocation: true`** and
  **`metadata.telemetry.capture: "target"`** as explicit harness-specific
  extensions **not in the portable core** — both fail external validators like
  `skills-ref`; if a produced Pi skill uses either it is a deliberate opt-in
  extension (per the map's Portable-vs-extension distinction) and the
  portable core stays spec-pure (name + description + the 4 optional spec
  fields), with recommendations to add them only when there is a real reason;
  and a worked mini-example (scaffold `lint-fixer`, register in `package.json`,
  bump the manifest length, add a structure-test row, run tests). Opens with
  "Read when the target is Pi" matching the slice-3 references index.

**Single-source:** no duplication with `SKILL.md` — the spec digest is the
only place the full frontmatter rules live (the body links it and says *when*
to read it); the Pi specifics live only in `target-pi.md`. The validator's
allowed-key set (`name, description, license, compatibility, allowed-tools,
metadata`) was cross-checked against the spec digest's optional-field list.
Frontmatter unchanged (still spec-pure). The tdd-worker reported zero
deviations; both files match the slice-3 references index. Full suite green at
handoff (602/602).
