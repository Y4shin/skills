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

### Slice 5 — references-support-scripts (landed)

Added the four support-script reference files to
`skills/skill-creator/references/`, seeded from the
`support-script-conventions` grilling decisions (Q1–Q7):

- **`support-scripts.md`** (shared backbone, read first) — the cross-cutting
  policy stated once: when to ship a script (only for fragile/exact/repeated/
  numeric ops); language choice (match the target repo's canonical language;
  default Python; JS/TS when the host project is JS/TS; **Bash supported but
  discouraged** — not reliably cross-platform, Windows portability varies by
  agent, tiny pure-shell glue only); self-contained at the end-user runtime
  (stdlib-only lightest, or libraries + a **build step** bundling deps+script
  into one **committed** file — Python `zipapp` / JS-TS bundler; network calls
  are an acceptable dependency, what's avoided is requiring CLI tools present
  or end-user library installs; the build step + committed artifact are an
  authoring concern, not run by the end user); **by-hand fallback — a
  considered, safety-first choice, not a default** (omit for
  dangerous/irreversible/non-obvious ops such as a Forgejo API mutation or
  destructive ops — an agent fumbling a dangerous op by hand from outdated
  docs is worse than no fallback; the skill should stop and require the
  script; provide a by-hand fallback only when the path is safe,
  deterministic, and within the agent's reliable capability); shape (clear
  inputs + single output + helpful errors, runnable AND readable); testing
  (run on a worked example with a known answer — the per-language file names
  the runner); the **Q7 17-slot default-stack table** (the recommended default
  dependency stack with selection standards + the axios/pydantic/jsonschema
  caveats: axios for HTTP, pydantic/jsonschema for input validation, all
  bundleable and broadly available); and a verification note citing the
  bundle-script-template findings (the concrete bundle templates come from
  the follow-up `bundle-script-template` prototype and are **not folded**
  here).
- **`support-scripts-python.md`** — shebang (`#!/usr/bin/env python3`);
  stdlib-only OR `zipapp` bundling when libraries are used (the build step
  produces a committed `__main__.zip`/zipapp the end user runs with `python
  script.zipapp`) — stated at the policy level with a pointer to the
  forthcoming template (the concrete zipapp recipe is deferred to
  `bundle-script-template`); `argparse`/stdin inputs; exit codes; the
  **known-good-literal vs recomputed-value anti-pattern** for numeric
  scripts; testing on a worked example; by-hand fallback per the shared
  safety decision (points back — does not restate it).
- **`support-scripts-js-ts.md`** — the **Node-runtime portability trade-off**
  (a Node/TS script needs a runtime the target harness may not have — a
  non-default by-hand/stop fallback per the shared decision); **bundling
  endorsed** — when a helper needs libraries, bundle deps+script into one
  **committed** runnable artifact and **keep the readable source** for
  patching; `.ts` is fine **iff** a committed runnable artifact
  (`.mjs`/`.js`) is produced (never ship a `.ts` needing `tsc`/`tsx` at the
  end-user runtime); use the target project's existing bundler if it has one,
  else an **esbuild** heuristic — stated at the policy level with a pointer
  to the forthcoming template (the specific bundler + build setup + artifact
  shape are deferred to `bundle-script-template`). Testing per Q4.
- **`support-scripts-bash.md`** — **discouraged, Windows-fragile** (states
  the Windows caveat); only tiny pure-shell glue; the Q2 default (`bash` +
  `set -euo pipefail`, or `#!/bin/sh` for max POSIX when the script stays
  POSIX); POSIX-vs-GNU coreutils portability; quoting/word-splitting pitfalls;
  keep to stdlib coreutils only (avoid requiring external CLI tools such as
  `jq` — **prefer Python for JSON/structured data**, which also sidesteps
  Bash's Windows fragility); shellcheck testing; the by-hand fallback per the
  shared safety decision.

**Single-source:** the cross-cutting policy lives in the shared file once;
per-language files carry only their specifics and point back. The by-hand-
fallback safety stance appears in the shared file and is concisely present in
`SKILL.md` (slice 3), not duplicated in each per-language file. Concrete bundle
templates **not folded** — deferred to the `fold-bundle-templates-into-refs`
follow-up task. No `SKILL.md` change needed (slice 3 already wired the cross-
refs). The tdd-worker reported zero deviations; all four files match the
slice-3 references index. Full suite green at handoff (602/602).

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

### Slice 6 — self-review-and-finalize (landed)

Slice 6 (the last slice) ran the adversarial self-review — all four lenses
pass: **trigger test** — the 3 should-trigger requests ("create a skill for
reviewing Go API changes"; "turn this deploy runbook into a skill"; "this
skill isn't triggering reliably — fix it") match literal words in the final
`description`, and the 2 near-misses ("write a README for my project";
"explain how PDFs work") share vocabulary but describe a different job that the
"Do NOT use for" line excludes; **execution dry-run** of "create a skill for
reviewing Go API changes" + "improve this SKILL.md" + "make this Claude-oriented
skill portable" completes understand → discover → plan → scaffold → write →
validate with no stalls, missing info, ambiguous decisions, undiscoverable
references, or hidden harness assumptions; **context review** — every
substantial section earns its tokens (a capable agent would do worse if any
were removed), none needed moving to a reference; **generalization review** —
the skill teaches the reusable workflow for the class of task, not its own
creation story (nothing strip-able that only makes sense for skill-creator's
build).

**Both validators pass:** dogfood `node
skills/skill-creator/scripts/validate_skill.mjs skills/skill-creator` = OK, and
official `skills-ref` v0.1.5 = "Valid skill".

**Two polish fixes** (not redesign — no return-to-Wayfinder hatch triggered):
(1) renamed the misleading slice-2 test from "rejects description containing a
colon" to "accepts description containing a colon" (the test was already an
accept-PATH test — the old name contradicted what it asserted); (2) clarified
the slice-3 `SKILL.md` progressive-disclosure example from `api-errors.md` (a
specific filename that doesn't exist in the skill) to a `<topic>-errors.md`
placeholder with a "This is a hypothetical example, not a real file in this
skill." note, so a reader doesn't go looking for a nonexistent reference.

**No placeholder/TODO/scaffolding/auxiliary-doc files remain** in
`skills/skill-creator/` (no `README`, `CHANGELOG`, install guide, dev diary, or
`TODO`-only files; no empty resource dirs). `SKILL.md` is 356 lines / ~3657
tokens (≤500 / ≲5000 — lean). Frontmatter unchanged (still only
`name: skill-creator` + the trigger-designed `description`). The tdd-worker
reported zero deviations. `npm test` green at handoff (602/602).
