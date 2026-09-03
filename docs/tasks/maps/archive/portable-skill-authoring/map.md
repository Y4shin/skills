---
kind: map
slug: portable-skill-authoring
title: A skill-creator skill that authors portable Agent Skills (incl. for Pi)
status: active
tasks:
- slug: support-script-conventions
  blocked_by: []
  done: true
- slug: build-skill-creator-skill
  blocked_by:
  - support-script-conventions
  done: true
- slug: bundle-script-template
  blocked_by:
  - support-script-conventions
  done: true
- slug: fold-bundle-templates-into-refs
  blocked_by:
  - build-skill-creator-skill
  done: true
---

## Destination

A reusable **`skill-creator`** Agent Skill that helps an AI coding agent
create, review, update, and improve other Agent Skills, distributed as part
of this `task-workflow` Pi package. The skill itself conforms to the open
Agent Skills specification (agentskills.io) and is as portable as the
package allows; its frontmatter stays spec-pure (only `name` + `description`)
so the skill folder is also directly usable as a standalone Agent Skill in any
harness that consumes the format.

What `skill-creator` *authors* are Agent Skills. **By default it authors
generic skills that assume only the bare-minimum target-agent capabilities**
(roughly: the agent can read the `SKILL.md` body and, optionally, call MCP
tools). On top of that default, `skill-creator` carries a small set of
**capability-conditional rules**, "if the target agent supports filesystem
access, do X", "if it supports bash tool-calls, include a runnable script for
Y", "if it needs network/MCP server Z, …". These rules are keyed on
*target-agent capabilities*, not on harness brands; when the target's
capabilities are specified (or the target is a named harness the skill knows),
the relevant rules activate. The one named harness the skill treats
first-class is **Pi** (the package it ships in): it knows how to author,
register, and test a skill for a Pi package, and how to keep the portable core
distinct from Pi-specific extensions.

The skill teaches how to produce **small, reliable, discoverable, maintainable
skills**, progressive disclosure, single-sourcing, trigger-word descriptions,
degrees of freedom matched to fragility, rather than bloated prompt dumps. It
synthesizes the strongest ideas from the DeepAgents `skill-creator` and the
sentient-agi `meta-skill-creator` into a smaller, coherent skill grounded in the
**current** Agent Skills specification, and stands on its own: future agents
using it do not need to read those source repositories.

Done = `skills/skill-creator/` exists (spec-pure `SKILL.md`, Node/TS helper
scripts with by-hand fallbacks, and focused references), is registered in
`package.json` `pi.skills` and covered by `tests/skills.test.ts`, passes
structure tests, the helper scripts pass their vitest tests, the official
`skills-ref` validator (or the bundled Node validator) accepts it, and an
adversarial self-review (trigger test + execution dry-run + context review +
generalization review) is complete.

## Constraints

- The deliverable is part of this `task-workflow` Pi package. `skill-creator`
  lives at `skills/skill-creator/`, is listed in `package.json` `pi.skills`
  (length 15 → 16), and is covered by `tests/skills.test.ts`
  (`SKILL_FILES` + the `pi.skills.length` assertion). It loads wherever
  `task-workflow` is installed and is auto-disabled in work repos by the repo
  gate, same as the other 15 skills.
- **Spec purity:** `skill-creator`'s own frontmatter uses only Agent Skills
  spec fields, `name` + `description`, and **nothing else**. This repo's own
  skills use a Pi-only `disable-model-invocation` field that is **not** in the
  spec and fails both reference validators; the new skill must not. A
  `skill-creator` *wants* to auto-trigger on "create a skill", so it should be
  model-invocable by default anyway. No `license` field (subject to this
  repo's license if/when it has one); no `compatibility`/`allowed-tools`/
  `metadata` unless a concrete reason appears.
- **The Agent Skills specification wins** over the task proposal on any
  format/compat conflict. Implementation must follow the current spec
  (agentskills.io/specification), rechecking optional fields, not the
  snapshot in the proposal.
- **Capability-conditional, not brand-conditional.** The per-harness
  differences are expressed as capability rules + one named target (Pi). No
  per-brand reference file for each of the ~45 Agent-Skills clients, the
  broad catalog is out of scope; the generic + Pi targets are in scope.
- **skill-creator's own helper scripts are Node/TS** (this repo's canonical
  language), dependency-light, each with a by-hand fallback for harnesses that
  can't run them, and tested with vitest. (Trade-off: a harness without Node
  uses the by-hand fallback; accepted, the repo is Node-canonical.)
- **Produced-skill helper scripts are language-flexible**: the produced skill
  bundles a script in its own `scripts/` only when an operation is
  fragile/exact/repeated; the language matches the target repo/project's
  canonical language (default **Python** when unconstrained), kept
  dependency-light with a by-hand fallback, tested on a worked example.
  Per-language best-practices live in references, seeded by the
  `support-script-conventions` grilling task.
- Skills the task forbids in *produced* skills (`README.md`, `CHANGELOG.md`,
  install guides, dev diaries) are also forbidden in `skill-creator` itself.
- A produced skill's license is the author's/project's choice; `skill-creator`
  teaches that the spec's optional `license` field exists for when they want
  to state one. `skill-creator` declares none.

## Decisions so far

- **Distribution (grilling Q1).** `skill-creator` ships in this Pi package:
  `skills/skill-creator/`, registered in `package.json` `pi.skills` (→16) and
  `tests/skills.test.ts`, frontmatter spec-pure so the folder is also a valid
  standalone Agent Skill. This matches the `build-tdd-reference-skill`
  precedent. (Rejected: standalone outside the package, not exercised by the
  repo's tests; unregistered in `skills/`, unusual, easy to re-add by
  accident, and the `create-task` redirect is the existing precedent we are
  *not* following.)
- **Authoring model (grilling Q1, the central design).** By default
  `skill-creator` authors generic, minimal-capability skills (assume at most
  some MCP); it carries **capability-conditional rules** keyed on target-agent
  capabilities (filesystem, bash/exec, network, MCP servers, harness-specific
  frontmatter/extensions) that activate when the target is specified. Pi is
  the one named target (its package conventions). This replaces per-brand
  targeting and is more "harness-agnostic" than either prior art, both of which
  assume a capable filesystem+exec agent.
- **Verified client landscape (fact, not a decision).** The Agent Skills
  format is the **one** portable format consumed by Claude Code, "ChatGPT &
  Codex", Cursor, GitHub Copilot, VS Code, Gemini CLI, OpenCode, **pi**, and
  ~40 others (agentskills.io Client Showcase). Claude Code uses
  `.claude/skills/` + `SKILL.md`; Codex "builds on the open agent skills
  standard". So "author for arbitrary harnesses" = produce one spec-conformant
  skill + per-target install location + optional extensions, loaded on demand.
- **Name (grilling Q2).** `skill-creator`, the de-facto name both DeepAgents
  and sentient-agi use; best recognition for "create/make/build a skill".
  Known risk (accepted as a non-issue): name collision if another
  `skill-creator` is installed in the same setup, the description
  disambiguates and the user manages their install set. (Rejected: `skill-author` / `agent-skill-creator`
 , no collision but less recognition.)
- **skill-creator's own support scripts (grilling Q3).** Node/TS: a minimal
  frontmatter validator, a scaffolder, and a discoverer, dependency-light,
  each with a by-hand fallback, porting the best of sentient-agi's
  stdlib-Python scripts and **fixing sentient's validator bug** (it omits the
  spec-allowed `compatibility` field). Tested with vitest. (Trade-off: less
  portable than stdlib Python across harnesses without Node, the by-hand
  fallback covers it; accepted because the repo is Node-canonical.)
- **Produced-skill support scripts (grilling Q3).** Language-flexible: ship a
  script only when an operation is fragile/exact/repeated; pick the language
  to match the target repo's canonical language (default Python when
  unconstrained); keep it dependency-light with a by-hand fallback; test on a
  worked example. Per-language best-practices for **Python**, **JS/TS**, and **Bash**
  live in `references/support-scripts-*.md`, **seeded by the
  `support-script-conventions` grilling task** (the user asked for that grilling
  task explicitly).
- **License (grilling Q4).** No `license` field on `skill-creator` (subject to
  this repo's license if/when it has one); produced-skill license is the
  author's/project's choice. `skill-creator` teaches the spec's optional
  `license`/`compatibility`/`allowed-tools`/`metadata` fields and when each is
  justified, and to keep the portable core free of harness-specific fields.
- **Source synthesis (facts).** Confirmed against the live spec:
  `name` ≤64 lowercase/digits/hyphens matching the folder, `description` ≤1024;
  optional `license`, `compatibility` (≤500), `metadata` (string→string),
  `allowed-tools` (experimental); optional `scripts/`/`references/`/`assets/`;
  progressive disclosure (body <500 lines / <5000 tokens; references one level
  deep; file refs relative); official validator = `skills-ref` at
  github.com/agentskills/agentskills. DeepAgents and sentient-agi both
  converge on: understand-with-examples → discover/update-over-create → plan
  reusable contents → scaffold → write → validate → self-reflect → iterate;
  trigger descriptions that enumerate literal phrases; "explain why, not
  what"; "what not to include"; "principle of no surprise".

- **v1 scope confirmed (refinement).** Bash is **in** v1 for produced-skill
  scripts, the third well-known target language; the
  `support-script-conventions` grilling and the three support-script references
  (Python, JS/TS, Bash) all cover it. The `skill-creator` name collision with
  other skill-creators is a non-issue (accepted). The trigger-rate eval harness
  is overkill for now, out of v1. Non-Agent-Skills "skill"-like artifacts
  (Custom GPTs, plugins) are out of scope.
- **Support-script grilling Q1 (settled).** The three per-language support-script
  references get a **shared** file `references/support-scripts.md` (the common
  backbone) + per-language specifics files (single-sourced; a point is adapted
  in a per-language file only when needed). Backbone accepted with three
  refinements: (1) **Bash is supported but discouraged**, Windows portability
  varies by agent (some Windows agents have no POSIX shell); tiny pure-shell
  glue only, prefer Python for anything cross-platform. (2) **Produced-skill
  scripts must be self-contained at the end-user runtime**, the end user must
  not need to install libraries or have extra CLI tools present. Two ways:
  stdlib-only (lightest), or use libraries + a **build step** that bundles
  deps+script into one **committed** file (Python `zipapp`; JS/TS a bundler).
  Network calls are an acceptable dependency; what we avoid is requiring CLI
  tools present or end-user library installs. (3) **By-hand fallback is not a
  default**, a considered, safety-first choice: for dangerous / irreversible /
  non-obvious ops (e.g. a Forgejo API mutation), OMIT the fallback and
  stop/require-the-script, because an agent fumbling a dangerous op by hand
  (outdated/poor API docs) is worse than no fallback. Provide a by-hand fallback
  only when the path is safe, deterministic, and within the agent's reliable
  capability. skill-creator teaches this by-hand safety decision in its own
  body. Bash specifics settled (Q2): default `bash`+`set -euo pipefail`, or
  `#!/bin/sh` only for POSIX-only max-portability scripts (no `pipefail` in
  POSIX); Windows discouragement stated up top in the Bash reference. **Q3
  settled the JS/TS bundling policy** (endorsed; keep readable source + commit a
  runnable artifact; `.ts` only with a committed runnable artifact); **the
  specific bundler + build setup + artifact shape are deferred to a
  `bundle-script-template` prototype** (created now, blocked by the grilling),
  whose optimum path per language becomes a template a later follow-up folds
  into the references. Testing (Q4): run on a worked example against the
  **committed bundled artifact** (not only the source); use the project's
  runner if present, else a direct run. **Q5/Q6/Q7, a default stack by
  concern**: 17 concern-slots (CLI, HTTP, config/env/secrets, logging/pretty
  output, validation/schemas, FS/globbing, process/subprocess, OpenAPI client,
  local web UI, local REST server, retry/backoff, simple output templating,
  markdown/HTML, diffing/patching, date/time, tabular data, git ops) get one
  default library per slot per language, chosen by settled standards (permissive
  license default; copyleft allowed only when outstanding AND the target repo
  is license-compatible, in which case the slot carries two alternatives).
  The fills live in the per-language references; the standards in the shared one.
  The library fills are being chosen now (Q7).
- **`bundle-script-template` prototype settled (Q3-deferred, now resolved).**
  The prototype picked the per-language bundle template, **Python: `zipapp`
  (stdlib)** over `shiv` (which needs a wheel + console-script + fights
  externally-managed pythons); **JS/TS: the project's existing bundler if it has
  one (Vite lib-mode in this repo, per `scripts/build.ts`), else `esbuild`**
  over `rollup` (which needs 3 plugins for CJS interop). It also smoke-tested
  all 17 Q7 picks at the floor (Python 3.10 / Node 20 LTS): **all 17 pass per
  language**, bundled into a self-contained artifact that runs on the bare floor
  runtime. Findings at `docs/tasks/bundle-script-template/findings.md`; folded
  into the references by `fold-bundle-templates-into-refs` (blocked on
  `build-skill-creator-skill`).
- **Floor is a target, not a recommendation (clarified post-prototype).** The
  floor stays Python 3.10 / Node 20 LTS: it is a *minimum-compatibility target*,
  not a recommendation, so a produced skill still runs on EOL-but-widely-
  installed runtimes (long-tail machines, locked CI, conda, Ubuntu LTS, Apple's
  Xcode CLT python). nixpkgs dropping the *packaging* of both is a test-tooling
  pin (use `nixos-25.05`), NOT a floor change. The references target the floor
  without recommending it; the min-version contract already says "install at
  least X" with the agent-must-consult-user-before-installing remark.

## Fog

- Whether to later add spec-optional fields to `skill-creator`'s own
  frontmatter (`compatibility` to document the Node requirement, `allowed-tools`,
  Pi `metadata`). Kept minimal (name + description) for v1 per the user's
  lean; the Node requirement is stated in the body + by-hand fallbacks.
- skill-creator's own Node/TS helper scripts reduce its *own* run-anywhere
  portability vs sentient's stdlib-Python choice (a harness without Node falls
  back to by-hand). Known, accepted; the by-hand fallback is the escape hatch.
- (Graduated to `fold-bundle-templates-into-refs`.) The Python `zipapp` template
  + the JS/TS bundler/template are now provided by the `bundle-script-template`
  prototype (done) and folded into the references by that follow-up feature
  task, blocked on `build-skill-creator-skill`'s `references-support-scripts`
  slice. Until then, slice 5 ships policy-level guidance + a pointer.

## Out of scope

- Porting or wholesale-copying the sentient-agi or DeepAgents `skill-creator`.
- A per-brand reference file for each of the ~45 Agent-Skills clients (broad
  catalog). The capability-conditional model + the generic + Pi targets cover
  the intended "author for arbitrary harnesses" goal.
- Building a trigger-rate eval automation / per-client harness integration
  (e.g. `claude -p --output-format json` scripting). v1 uses the manual
  trigger test.
- Auto-generation of human-facing docs for produced skills. The task
  explicitly forbids `README.md`/`CHANGELOG.md`/install guides/dev diaries in
  produced skills; `skill-creator` forbids them too.
- Making `skill-creator` non-spec-pure (e.g. Pi's `disable-model-invocation`
  on it). Ruled out by the portability requirement.
- Adding a `license` field to `skill-creator`. Ruled out by the user.
- Authoring skills in a non-Agent-Skills format (e.g. a Claude Code "plugin"
  or a Custom GPT). `skill-creator` authors Agent-Skills-format skills that
  install into any supporting client.
