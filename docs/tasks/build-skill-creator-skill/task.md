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
