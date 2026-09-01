---
kind: slice
slug: references-support-scripts
title: Write references/support-scripts.md (shared) + per-language python/js-ts/bash specifics from the grilling + wire the rule
task: ../task.md
mode: afk
status: todo
size: m
blocked_by:
- references-portable-and-pi
---

# Slice 5: Support-script references (shared + per-language, from the grilling)

## End-to-end behavior

Four files exist, seeded from the **settled decisions of the
`support-script-conventions` grilling task** (which this feature task is
blocked_by):

- `skills/skill-creator/references/support-scripts.md` — the **shared**
  backbone (read first).
- `skills/skill-creator/references/support-scripts-python.md`,
  `skills/skill-creator/references/support-scripts-js-ts.md`,
  `skills/skill-creator/references/support-scripts-bash.md` — per-language
  specifics.

The shared file carries the cross-cutting policy exactly once; the
per-language files hold only specifics and adapt a shared point only when the
language requires it (no duplication). The "choose a script language" rule in
`SKILL.md` (slice 3) is wired to point at the shared file first, then the
per-language files. After this slice the references index in `SKILL.md` is
fully resolvable.

## Prerequisite

This slice can only run after `support-script-conventions` is done (its settled
"Decisions reached" is the source content). If the grilling is still open, stop
and return to Wayfinder — do not invent the best-practices here.

## Deliverables

Read the `support-script-conventions` task's settled decisions (Q1–Q4) first;
write the four files carrying exactly those decisions.

- `references/support-scripts.md` (shared) — the cross-cutting policy, stated
  once:
  - **When to ship a script** — only for fragile/exact/repeated/numeric ops.
  - **Language choice** — match the target repo's canonical language; default
    Python; JS/TS when the host project is JS/TS; **Bash is supported but
    discouraged** (not reliably cross-platform — Windows portability varies by
    agent; tiny pure-shell glue only).
  - **Self-contained at the end-user runtime** — the end user must not need to
    install libraries or have extra CLI tools present. Either stdlib-only
    (lightest), or use libraries + a **build step** that bundles deps+script
    into one **committed** file (the per-language file names the mechanism:
    Python `zipapp`; JS/TS a bundler). Network calls (HTTP/API) are an
    acceptable dependency; what's avoided is requiring CLI tools present or
    end-user library installs. The build step + committed artifact are an
    authoring concern (the skill-author commits them), not run by the end user.
  - **By-hand fallback — a considered, safety-first choice, not a default.**
    Omit it for dangerous/irreversible/non-obvious ops (e.g. an API mutation
    such as a Forgejo operation, destructive ops, side-effect-heavy calls) —
    an agent fumbling a dangerous op by hand from outdated/poor docs is worse
    than no fallback; the skill should stop and require the script instead.
    Provide a by-hand fallback only when the path is safe, deterministic, and
    within the agent's reliable capability.
  - **Shape** — clear inputs + a single output + helpful errors (not a bare
    traceback/stack); runnable AND readable (an agent may patch it).
  - **Testing** — run on a worked example with a known answer (the per-language
    file names the runner, per Q4).
- `references/support-scripts-python.md` — Python specifics: shebang
  (`#!/usr/bin/env python3`); stdlib-only OR `zipapp` bundling when libraries
  are used (the build step produces a committed `__main__.zip`/zipapp the end
  user runs with `python script.zipapp`); `argparse`/stdin inputs; exit codes;
  the known-good-literal vs recomputed-value anti-pattern for numeric scripts;
  testing per Q4; by-hand fallback per the shared safety decision (point back
  to it — don't restate).
  - The concrete `zipapp` build recipe (one-file command, entrypoint, where
    the committed artifact lives) is provided by the `bundle-script-template`
    prototype; until that lands, the reference states the `zipapp` path at the
    policy level and points to the forthcoming template.
- `references/support-scripts-js-ts.md` — JS/TS specifics: Node/Deno/Bun
  runtime + the **portability trade-off that a Node/TS script needs a runtime
  the target harness may not have** (a non-default by-hand/stop fallback per the
  shared decision); **bundling is endorsed** — when a helper needs libraries,
  bundle deps+script into one **committed** runnable artifact and **keep the
  readable source** for patching; `.ts` is fine **iff** a committed runnable
  artifact (`.mjs`/`.js`) is produced (never ship a `.ts` needing `tsc`/`tsx` at
  the end-user runtime); use the target project's existing bundler if it has
  one. The **specific bundler + build setup + artifact shape are deferred to the
  `bundle-script-template` prototype** (which researches ergonomics/performance
  and picks an optimum path that becomes a template); until it lands, name no
  bundler and state the path at the policy level. Testing per Q4.
- `references/support-scripts-bash.md` — Bash specifics: **discouraged, Windows-
  fragile** (state the Windows caveat per Q2); only tiny pure-shell glue; the
  Q2 default (`bash` + `set -euo pipefail`, or `#!/bin/sh` for max POSIX when
  the script stays POSIX); POSIX-vs-GNU coreutils portability;
  quoting/word-splitting pitfalls; keep to stdlib coreutils only (avoid
  requiring external CLI tools such as `jq` — prefer Python for JSON/structured
  data, which also sidesteps Bash's Windows fragility); shellcheck testing; the
  by-hand fallback per the shared safety decision.
- `SKILL.md` — confirm the "choose a script language" rule (slice 3) points at
  `references/support-scripts.md` first, then the per-language file for the
  chosen language; lift Q1's by-hand-fallback safety decision into the body
  (slice 3 already carries a concise version) — keep the detail in the shared
  reference (single-source).

## Acceptance criteria

- All four files exist and are non-empty; the shared file opens with the
  cross-cutting policy (language choice, self-contained+build, by-hand-fallback
  safety, shape, testing) stated **once**.
- No per-language file restates the cross-cutting policy; each points back to
  the shared file and carries only its specifics (shebang, bundling mechanism,
  caveats, runner).
- `support-scripts-python.md` includes the known-good-literal vs
  recomputed-value anti-pattern and the `zipapp`-bundling path.
- `support-scripts-js-ts.md` covers the Node-runtime portability trade-off,
  endorses bundling into a committed artifact, and the `.ts`-build-step note.
- `support-scripts-bash.md` states the Windows discouragement, the Q2
  `bash`+`set -euo pipefail` (or POSIX `sh`) default, coreutils portability, and
  the "prefer Python for JSON/structured data" boundary.
- The by-hand-fallback safety stance (omit for dangerous ops; the Forgejo
  example; stop-and-require-the-script) appears in the shared file and is
  concisely present in `SKILL.md` (slice 3), not duplicated in each per-language
  file.
- Content is faithful to the `support-script-conventions` settled decisions
  (Q1–Q4); none silently dropped or added.
- All four files are linked one level deep from `SKILL.md`'s references index
  (the shared file first).
- `validate_skill.mjs skills/skill-creator` still PASSes.

## Test plan

- **Seams:** the reference file text + the `SKILL.md` cross-reference.
- **Failure modes:** (1) the cross-cutting policy is duplicated across the
  per-language files instead of living once in the shared file → single-source;
  (2) the by-hand-fallback safety is weakened back to "every script has a
  fallback" → must read as a considered, safety-first choice; (3) the
  dependency policy reads as "stdlib-only, no builds" → must allow the
  bundled-committed-artifact path; (4) Bash is presented as co-equal to
  Python → must be discouraged/Windows-fragile.
- **Scenarios:** a fresh agent reading only the shared file knows the policy
  for *whether* to bundle a script and *when* a by-hand fallback is safe;
  reading the Python file, it can ship a stdlib-or-`zipapp` script tested on a
  worked example; reading the JS/TS file, it can bundle deps into a committed
  artifact and decide `.mjs` vs `.ts`; reading the Bash file, it writes a
  `set -euo pipefail`, coreutils-only, shellcheck-clean glue script and knows
  when to stop and use Python instead.
- **Edge cases:** a produced skill in a repo whose canonical language is none
  of Python/JS/TS/Bash (e.g. Ruby/Go) — the rule says "match the canonical
  language"; other languages are intentionally out of scope (the grilling
  covered the three well-known ones; a fourth would be a Wayfinder follow-up).

## Constraints

- Source = the `support-script-conventions` grilling decisions (Q1–Q4). If the
  grilling isn't done, stop and return to Wayfinder.
- Single-source the cross-cutting policy in the shared file; per-language
  specifics live only in their file.
- No auxiliary docs; no changing frontmatter.
