---
kind: task
type: grilling
slug: support-script-conventions
title: Best-practices for helper scripts a produced skill bundles in scripts/ (Python + JS/TS + Bash)
map: portable-skill-authoring
status: done
blocked_by: []
---

## Decision to settle

What best-practices & recommendations should `skill-creator` encode for the
**helper/support scripts that a *produced* skill bundles in its own `scripts/`**
directory — for **Python**, **JS/TS**, and **Bash**?

(Not to be confused with `skill-creator`'s *own* support scripts — those are
Node/TS, decided in the map. This task is about the scripts a skill-author
writes *into the skill being created*.)

The output of this grilling settles the policy that the
`build-skill-creator-skill` feature task seeds into a **shared** file,
`skills/skill-creator/references/support-scripts.md`, plus three per-language
specifics files, `references/support-scripts-python.md`,
`references/support-scripts-js-ts.md`, and `references/support-scripts-bash.md`.

## Parent decisions it depends on

- From the map: `skill-creator` authors generic, minimal-capability skills by
  default; capability-conditional rules activate when the target's
  capabilities are specified. A produced skill bundles a script in `scripts/`
  only when an operation is fragile, exact, or repeated.
- From the map: the produced-skill script language matches the target
  repo/project's canonical language (default **Python**), with Bash now in v1.
- From the map: `skill-creator`'s own support scripts are Node/TS; the
  *produced-skill* script language is a separate, context-dependent decision.

## Pre-grilling starting synthesis

The two prior arts (DeepAgents `skill-creator`, sentient-agi
`meta-skill-creator`) and the agentskills.io "Using scripts in skills" /
"Best practices" guidance converge on this backbone (refined by Q1 below):

- When to ship a script vs prose — fragile / exact / repeated / numeric ops
  belong in a script; judgment steps stay as prose.
- Language selection — match the target repo's canonical language; default
  Python; JS/TS when the host project is JS/TS; Bash for tiny pure-shell glue.
- Portability / dependencies — prefer the standard library; document any dep.
- By-hand fallback — every script step has a plain "do it by hand" path.
- Shape — clear inputs, a single output, helpful errors; runnable AND readable.
- Testing — run on a worked example with a known answer.

(Items marked refined below are superseded by the Q1 decision.)

## Decisions reached

### Q1 — Shared backbone + structure (settled)

The shared backbone is **not** repeated in each per-language file. The shared
parts live in one shared file, `references/support-scripts.md` (read first);
the three per-language files hold only language-specifics and any point that
needs to adapt the shared guidance. (Rejected: repeating the backbone verbatim
in all three — violates single-sourcing.)

The shared backbone, **as accepted with three refinements**:

- **When to ship a script** — only for fragile / exact / repeated / numeric
  ops. (unchanged)
- **Language choice — refined:** match the target repo's canonical language;
  default **Python**; **JS/TS** when the host project is JS/TS; **Bash is
  supported but discouraged** — it is not reliably cross-platform (Windows
  portability varies by agent; some Windows agents have no POSIX shell), so
  use it only for tiny pure-shell glue and prefer Python for anything that must
  run on Windows.
- **Dependencies & build — refined (the twist):** a produced skill's scripts
  must be **self-contained at the end-user's runtime** — the end user must not
  need to install libraries or have extra CLI tools present. Two ways there:
  1. **stdlib-only** (lightest; no deps).
  2. **use libraries, but add a build step** that bundles the dependencies and
     the script into **one file**, and **commit the built artifact into the git
     tree** so it is ready to use — Python: `zipapp`; JS/TS: a bundler.
  Network resources (HTTP/API calls) ARE an acceptable dependency; what we
  avoid is requiring the end user's environment to have specific **CLI tools**
  installed or to **install libraries**. The build step + committed artifact
  are an authoring concern (the skill-author commits them), not run by the end
  user. (Rejected: a flat "stdlib-only, no build steps" — too restrictive; a
  committed bundled artifact is a legitimate, often-better way to keep the
  end-user runtime dependency-free while using libraries.)
- **By-hand fallback — refined (NOT a default):** it is a **considered,
  safety-first choice, not a default**. The skill-author must weigh (a) can the
  agent even do it by hand? and (b) is the by-hand path *safe*? For ops that are
  dangerous, irreversible, or non-obvious (e.g. an API mutation such as a
  Forgejo operation, destructive ops, side-effect-heavy calls), a by-hand
  fallback the agent tries to replicate is *worse* than none — the agent may
  find outdated/poor API docs and fumble a dangerous op "by any means
  necessary". In those cases **omit the by-hand fallback**; the skill should
  stop and require the script (or a human) rather than hand the agent a recipe
  to execute badly. Provide a by-hand fallback only when the path is safe,
  deterministic, and within the agent's reliable capability. **`skill-creator`
  teaches this as a decision in its own `SKILL.md` body** (not only in the
  support-scripts reference), with the safety examples. (Rejected: "every
  script MUST have a by-hand fallback" — unsafe for dangerous ops.)
- **Shape / Testing** (unchanged): clear inputs + single output + helpful
  errors; runnable AND readable; test on a worked example with a known answer.

**Net newly opened questions (grilled next):**
- Q2 — Bash specifics: `bash` + `set -euo pipefail` vs POSIX `#!/bin/sh` as the
  default, and how the reference phrases the Windows discouragement.
- Q3 — JS/TS specifics: given bundling is endorsed, the default bundler and the
  source-vs-committed-artifact shape.
- Q4 — testing runner: use the target project's existing runner, or a
  self-contained worked example the agent can run without the project's setup?

### Q2 — Bash specifics (settled)

- **2a — default shell/strictness:** recommend `#!/usr/bin/env bash` + `set -euo
  pipefail` by default (ergonomic; catches unset vars / failed commands / pipe
  failures); fall back to `#!/bin/sh` (POSIX) only when the script stays within
  POSIX and max portability is wanted — and note `pipefail` is **not** POSIX, so
  a POSIX `sh` script cannot rely on it (use explicit `||` checks instead).
  (Rejected: `sh`-only as the default — loses too much; blanket `bash`-only —
  less portable when POSIX suffices.)
- **2b — Windows discouragement phrasing:** a clear discouragement sentence up
  top in `support-scripts-bash.md` — "Bash is discouraged; prefer Python for
  anything that must run on Windows (some Windows agents have no POSIX shell)"
  — then document Bash normally. (Rejected: a loud warning banner that buries
  the actual Bash guidance — strong enough to steer authors to Python, not so
  loud it hides the content for the cases where Bash is genuinely the right
  tool.)

**Net newly opened:** Q3 (JS/TS bundler + source-vs-committed-artifact shape),
Q4 (testing runner).

### Q3 — JS/TS specifics (settled; bundler choice deferred to a prototype)

The policy is settled; the **specific bundler + build setup + artifact shape**
is **deferred to a `bundle-script-template` prototype task** (raised with
Wayfinder), which tries the pattern for both Python and JS/TS against
restrictions the user hands it, researches ergonomics/performance, and picks an
optimum path per language that becomes a template folded into the per-language
reference. Slice 5 therefore writes policy-level bundling + a pointer, not a
named bundler — so the feature isn't blocked on the prototype.

- **Bundling endorsed; source kept.** When a produced JS/TS helper needs
  libraries, bundle deps+script into one **committed** file, and **keep the
  readable source** (`script.ts`/`script.mjs`) for patching alongside the
  committed artifact. (Rejected: artifact-only — loses the readable/patchable
  source the "runnable AND readable" principle wants.) The specific bundler +
  artifact shape are chosen by the `bundle-script-template` prototype
  (Q3-deferred), not pre-baked here.
- **`.ts` only with a committed runnable artifact.** Ship `.ts` source **iff**
  the build step commits a runnable artifact (`.mjs`/`.js`); never ship a `.ts`
  that needs `tsc`/`tsx` at the end user's runtime. (The end-user runtime stays
  dependency-free per Q1.)
- **Bundler heuristic (refine via the prototype):** use the target project's
  existing bundler if it has one; if none, the `bundle-script-template`
  prototype picks a default (esbuild/rollup/etc. on research). Until the
  prototype lands, the reference names no bundler.

### Q4 — Testing (settled as guidance, not a decision)

Test the helper on a worked example with a known answer (the shared backbone).
The one non-obvious bit: run that test against the **committed bundled
artifact** (the `.pyz`/`.mjs` the end user actually runs), not only the source
— for stdlib-only scripts the source *is* the artifact, but when bundling, testing
only the source doesn't prove the self-contained artifact works. If the skill
lives in a project with a test runner (pytest/vitest/etc.), use it; otherwise run
the script directly on a known input and assert the output. Don't force a test
framework onto a skill that has none.

### Q5 — Selection standards for the default-stack fills (settled)

Hard gates (disqualify): (1) bundles into one self-contained file (pure-Python,
no C/Rust extensions; JS with no native modules / dynamic imports that break the
bundler); (2) no required external binaries / no native runtime; (3)
cross-platform where the script must run (no Windows-fragile defaults);
(4) **license — permissive (MIT/Apache-2.0/BSD/ISC) by default; copyleft
(GPL/AGPL) allowed only conditionally** — when (a) the copyleft candidate is
**outstandingly** better than the permissive alternative AND (b) the produced
skill's target repo uses a license-compatible (copyleft-compatible) license;
otherwise permissive wins; (5) actively maintained, not abandoned.

Ranking (pick the best survivor): (6) lean footprint; (7) zero-config ergonomic
defaults; (8) stable low-churn API; (9) plain low-magic readable usage;
(10) well-documented + model-familiar; (11) standard formats/protocols;
(12) safe-by-default; (13) cross-language parallelism (tiebreaker only — never
force a worse pick for symmetry).

Meta-rule: one default per slot with a one-line why. **Exception:** when a
copyleft candidate qualifies under standard 4's conditional, the slot carries
**two alternatives** — the permissive default (always safe) + the copyleft
alternative (use only when the target repo is license-compatible), condition
stated. Otherwise note an alternative only when materially different. If no
candidate clears the hard gates, the slot stays "no default — use stdlib / your
judgment".

**Version floor (cross-cutting standard).** Python floor = **3.10**; Node floor
= **Node 20 LTS**. (3.9 is what Apple's Xcode CLT ships at `/usr/bin/python3`,
but 3.10 is the realistic mid-2026 "available to anyone" floor — most installs
get a newer python3 via brew/pyenv/uv in minutes; pinning to 3.9 would force
stale, unmaintained library majors.) **Min-version contract:** every produced
helper script **declares its minimum supported runtime** and, if run on an
older one, **errors with a useful message** telling the user to install at least
that version — **with a remark that, if an agent reads that error, it must
consult the user before installing anything.** This keeps the runtime floor
explicit and human-gated, never silently installing an interpreter.

Consequence: pin **majors that satisfy the floor** — Python: click/jsonschema/
tenacity/markdown-it-py/dulwich latest (≥3.10); JS/TS: commander **14.x** (≥20,
not 15.x which needs Node 22), p-retry 6.2.x (≥16.17), execa 9.6.x (Node ≥20.5;
8.x for a stricter 20.0). Row 2 JS HTTP: at the Node-20 floor the default is the
**built-in `fetch`** (Node ≥18) / `node:undici` (built-in); the `undici` npm
package is an opt-in for its advanced client API on Node 22+.
### Q-version-floor — Runtime floor + min-version contract (settled)

Python **3.10**, Node **20 LTS**. Every produced helper script declares its
minimum supported runtime and, if run older, errors with a useful "install at
least X" message — **with a remark that an agent reading that error must
consult the user before installing anything** (never silently install an
interpreter). Pin majors that satisfy the floor (see the Q5 floor note for the
concrete pins).

### Q6 — Default-stack slot set (settled; fills next)

The default stack is organized by **concern** (Python + JS/TS only; Bash stays
coreutils-only/discouraged). The build/project-shape slot is owned by the
`bundle-script-template` prototype, not here. Refined slot set:

1. CLI parsing · 2. HTTP requests · 3. config/env/secrets · 4. logging & pretty
terminal output · 5. validation/schemas · 6. filesystem traversal/globbing ·
7. process/subprocess · 8. OpenAPI-spec REST client (codegen) · 9. local
interactive web UI/dashboard · 10. local HTTP/REST API server · 11.
retry/backoff · 12. output templating (simple templates, not AST codegen) ·
13. markdown/HTML parsing & rendering · 14. diffing/patching text · 15.
date/time · 16. tabular data (CSV/TSV/Excel) · 17. git operations.

(Trimmed as less likely for a skill helper: DB access, cross-run disk cache,
PDF/doc processing — say if any should come back.)

### Q7 — Default-stack fills (settled row-by-row)

Chosen per slot per language against the Q5 standards; **one pick per cell**
(alternatives dropped unless a genuinely strong reason); **stdlib/zero-dep slots
are "no entry — table not consulted."**

| # | Slot | Python | JS/TS |
|---|------|--------|-------|
| 1 | CLI parsing | `click` (pure-Py, BSD, ~1MB, 0 deps, bundles) | `commander` (pure JS, MIT, 0 deps, mature 15.x; `citty` smaller but pre-1.0) |
| 2 | HTTP requests | `httpx` (sync+async, pure-Py deps, MIT) | `undici` (ships with Node, 0 deps; global `fetch` suffices for basic) — **❌ axios** (supply-chain backdoor Mar 2026, UNC1069) |
| 3 | config/env/secrets | `PyYAML` (YAML default; match surrounding tooling) + stdlib `json`/`os` | `yaml` (eemeli, 0 deps) |
| 4 | formatting (LLM-facing) | *(plain text — no entry)* | *(plain text — no entry)* |
| 5 | validation/schemas | `marshmallow` (pure-Py, MIT, ~0 deps at 3.10) | `zod` (MIT, 0 deps, pure JS) |
| 6 | FS traversal/globbing | *(stdlib `pathlib`/`glob` — no entry)* | `tinyglobby` (MIT, 2 deps, pure JS) |
| 7 | process/subprocess | *(stdlib `subprocess` — no entry)* | `tinyexec` (MIT, 0 deps, ≥18, pure JS) |
| 8 | OpenAPI client (codegen) | `datamodel-code-generator` (≥3.10; gen **dataclasses/TypedDict** = 0 runtime deps) | `@hey-api/openapi-ts` (gen **fetch-based** client = 0 runtime deps via `globalThis.fetch`, Node 18+) |
| 9 | local interactive web UI | `bottle` (single file, 0 deps, MIT) + SimpleTemplate + **vendored htmx** | `hono` (0 deps, MIT) + **vendored htmx** |
| 10 | local REST API server | `bottle` (JSON endpoints; no UI layer) | `hono` (JSON endpoints; no UI layer) |
| 11 | retry/backoff | `tenacity` (Apache-2.0, 0 deps, ≥3.10, pure-Py) | `async-retry` (MIT, 1 dep, no engine floor = at latest on Node 20, pure JS) |
| 12 | output templating (simple) | `jinja2` (BSD-3, 1 dep `MarkupSafe`, ≥3.7, pure-Py) | `eta` (MIT, 0 deps, ≥20, pure JS) |
| 13a | markdown render | `mistune` (BSD-3, 0 deps, ≥3.8, pure-Py, 464 KB) | `marked` (MIT, 0 deps, ≥20, 469 KB) |
| 13b | HTML parse | `beautifulsoup4` (MIT, ≥3.7, pure-Py + stdlib `html.parser` backend) | `cheerio` (MIT, ≥20.18, pure JS, 988 KB) |
| 14 | diffing/patching text | *(stdlib `difflib` — no entry)* | `diff-match-patch` (Apache-2.0, 0 deps, any Node, pure JS, 108 KB) |
| 15 | date/time | *(stdlib `datetime` (`fromisoformat`/`zoneinfo` since 3.9) — no entry)* | `date-fns` (MIT, 0 deps, tree-shakeable per-function) |
| 16 | tabular (CSV/TSV) | *(stdlib `csv` — no entry)* | `papaparse` (MIT, 0 deps, 348 KB, pure JS) |
| 17 | git operations | `dulwich` (MIT, ≥3.10, pure-Py fallback; C accelerators optional; no git binary) | `isomorphic-git` (MIT, ≥14.17, 4 pure-JS deps; no git binary) |

**Row 3 — config/env/secrets (settled).** Config defaults to **YAML**, scoped by
merging `XDG_CONFIG_HOME/<app>/config.yaml` + repo-local `config.yaml`; secrets
stay in **environment variables** (stdlib `os`/`process.env`), never in the
config file. Python `PyYAML` (pure-Py fallback, bundles; MIT; ≥3.8); JS/TS
`yaml` (eemeli, **0 deps**, ISC; ≥14.6) over `js-yaml` (1 dep). **Caveat:** the
config format **follows the surrounding tooling** — if the repo predominantly
uses JSON/TOML/INI, use that (stdlib where available) and only default to YAML
when unconstrained. ❌ `tomllib` (3.11+, too new for the 3.10 floor).

**Row 4 — formatting (settled, simplified).** The skill helper's consumer is
an **LLM**, which reads plain text — ANSI color/bold/spinners are noise (and
can confuse parsing), and interactive UI (spinners, prompts, progress, tables)
is **irrelevant to an LLM**. So the **default is plain text — no formatting
library** (stdlib, no entry). Color/formatting is **opt-in, only when the
script is *actually expected to be used by humans*** (not merely when output
could be shown to one): then Python `rich` (~3 MB + 3 deps; note the cost) / JS
`picocolors` (0 deps, ISC — the only minimal formatter at the Node-20 floor;
chalk 6 / ansi-styles 7 need Node 22). Interactive UI (`ora`, `@clack/prompts`,
`ink`, `cli-table3`) is **not a default** — exclude unless a script is
explicitly human-interactive.

**Row 5 — validation/schemas (settled).** Python `marshmallow` (MIT, ≥3.10,
pure-Python, ~0 deps at the floor — `typing-extensions` only at <3.11; ~460 KB;
standalone Schema+fields, defines-and-validates in one place, model-familiar,
bundles into a zipapp). Chosen over `pydantic` and `jsonschema` because **both
pull a compiled Rust core** (`pydantic-core` / `rpds-py`) at latest that **fails
gate-1** for a self-contained zipapp bundle — they're noted as "use when not
bundling (target repo already ships them)". JS/TS `zod` 4.x (MIT, **0 deps**,
pure JS, de-facto, model-familiar; bundles trivially) over `ajv` (JSON Schema,
4 deps) — use `ajv` only when the contract is explicitly JSON Schema.

**Row 6 — filesystem traversal/globbing (settled).** Python = **stdlib**
(`pathlib.Path.rglob`/`.glob`, `os.walk`) — no entry. JS/TS `tinyglobby` (MIT,
≥12, 2 deps `fdir`+`picomatch`, pure JS, ~196 KB, bundles) — the modern lean
globber, chosen over `fast-glob` (5 deps, heavier) and bare `fdir` (a walker,
needs picomatch for globbing).

**Row 7 — process/subprocess (settled).** Python = **stdlib `subprocess`**
(no entry). JS/TS `tinyexec` (MIT, **0 deps**, ≥18, pure JS) — a minimal
promise wrapper over `node:child_process`, chosen over `execa` (latest 10.x
needs Node 22 → ❌; 9.6.1 needs ≥20.5 and pulls **13 deps**, 744 KB — heavier
than the concern warrants). `execa` noted as the ergonomic upgrade when a
script needs its streaming/pipe conveniences.

**Row 8 — OpenAPI client / codegen (settled).** This is an **authoring-time**
concern — the codegen tool runs at authoring time; only the **generated client
code** ships (committed), so the gate that matters is "generates bundle-
friendly runtime code". Python `datamodel-code-generator` (≥3.10): generate
**dataclasses or TypedDict** (stdlib → **zero runtime deps**) — not pydantic/
msgspec (compiled cores, gate-1 fail at runtime). JS/TS `@hey-api/openapi-ts`
(MIT): generates a **`fetch`-based** client (`@hey-api/client-fetch`) that uses
`globalThis.fetch` (built-in since Node 18, **no `node-fetch`/`undici`-npm
dep**) → **zero runtime deps, runs on Node 20**. (The codegen tool itself needs
Node 22 — that's authoring-time, not the end-user runtime, so it's fine.)

**Row 9 — local interactive web UI / dashboard (settled).** This slot is
**rarely appropriate** for a skill helper whose consumer is an LLM — an LLM
doesn't browse; default to **emitting plain text/JSON the LLM reads**. A web
UI only fits when the script's explicit purpose is a **human-facing
dashboard**. When it does: Python `bottle` (MIT, **single file** `bottle.py`
~176 KB, **zero deps**, pure-Python, at-floor; built-in SimpleTemplate
engine, routing, static files, server adapters — 30× lighter than Flask's
~5.3 MB / 6 deps and bundles trivially) over Flask (deps) and FastAPI
(pydantic-core, gate-1 fail). JS/TS `hono` (MIT, **0 deps**, ≥16.9, pure JS,
web-standard) over fastify/express (deps). **htmx is vendored** — the single
~14 KB JS file is committed into `assets/` so the UI is **fully offline**
(no CDN fetch at runtime, consistent with the self-contained policy).

**Row 10 — local REST API server (settled).** Sibling of row 9 but for
**JSON to clients** (not a human UI) — a programmatic interface an LLM or
client calls (mock server, local tool API). The row-9 "LLM doesn't browse"
guard does **not** apply here — a REST API is a legitimate programmatic
surface. Same server picks, minus the UI layer: Python `bottle` (JSON
endpoints, no templates/htmx); JS/TS `hono` (JSON endpoints, no htmx). Both
zero-dep, at-floor, pure-language, bundle trivially.

**Row 11 — retry/backoff (settled).** Python `tenacity` (Apache-2.0, **0
deps**, ≥3.10, pure-Python, ~240 KB; decorators, exponential backoff,
conditions, hooks — the de-facto). JS/TS `async-retry` (MIT, 1 dep `retry`,
**no `engines.node` declared** → at latest on Node 20, no pinning needed; pure
JS, promise-based with `bail()` and randomized exponential backoff) — chosen
over `p-retry` (latest 8.x needs Node 22; pinning 6.2.x would be 2 stale
majors, a maintenance liability) and `cockatiel` (latest 4.x needs Node 22).

**Row 12 — output templating (settled).** Python `jinja2` (BSD-3-Clause, 1
dep `MarkupSafe` (pure-Py, ~112 KB), ≥3.7, pure-Python, ~1.4 MB total; the
de-facto template engine — Django-style, auto-escaping, filters, inheritance).
JS/TS `eta` (MIT, **0 deps**, ≥20, pure JS, ~248 KB; modern, fast, TS-native,
template-string-based) over `handlebars` (~3.1 MB, heavier) and `mustache`
(~196 KB, logic-less only — less capable). Note: row 9's `bottle` ships its
own SimpleTemplate; use `jinja2` only when the script needs standalone
templating outside a bottle app.

**Row 13 — markdown/HTML parse+render (settled, split 13a/13b).** Markdown
render and HTML parse are genuinely different operations (no single lean lib
does both well) — split. **13a markdown render:** Python `mistune` (BSD-3,
**0 deps** at the floor, ≥3.8, pure-Python, ~464 KB; CommonMark-compliant,
mature, plugin system for tables/footnotes) over `markdown-it-py` (507 KB + 1
dep) and `marko` (341 KB, leanest, less mature). JS/TS `marked` (MIT, **0
deps**, ≥20, ~469 KB; fast, de-facto) over `markdown-it` (2.4 MB, deps).
**13b HTML parse:** Python `beautifulsoup4` (MIT, ≥3.7, pure-Python; uses
**stdlib `html.parser`** as backend — no `lxml` compiled dep, gate-1 safe)
over `lxml` (C, gate-1 fail). JS/TS `cheerio` (MIT, ≥20.18, pure JS, jQuery-
like, de-facto).

**Row 14 — diffing/patching text (settled).** Python = **stdlib `difflib`**
(no entry). JS/TS `diff-match-patch` (Apache-2.0, **0 deps**, any Node, pure
JS, ~108 KB; Google's diff + patch + merge at char-level with fuzzy matching)
— 9× leaner than `jsdiff`/`diff` (~1 MB) and covers the common skill-helper
need (compute a diff, apply/merge a patch). `jsdiff` noted as the full-
featured alternative (unified-diff output format, JSON diff) for when those
specific outputs are needed.

**Row 15 — date/time (settled).** Python = **stdlib `datetime`**
(`fromisoformat` since 3.7, `zoneinfo` since 3.9 — no entry at the 3.10 floor).
JS/TS `date-fns` (MIT, **0 deps**, tree-shakeable per-function; immutable,
functional, TS-native) — chosen because **we bundle anyway** (per the self-
contained policy), so tree-shaking is free and only the imported functions ship
in the committed artifact, making it leaner in practice than `dayjs` (7 KB
single file, but monolithic) or `luxon` (256 KB).

**Row 16 — tabular data (settled, CSV only).** **Excel dropped entirely** —
the slot is CSV/TSV only. Excel (.xlsx) is a binary format where both Python
`openpyxl` (~2.9 MB) and JS `exceljs` (~23 MB) are heavy for a skill helper;
use CSV instead (and convert at the boundary if a user hands an .xlsx). Python
= **stdlib `csv`** (no entry). JS/TS `papaparse` (MIT, **0 deps**, ~348 KB, pure
JS; sync/browser-oriented, simple) over `csv-parse` (~1.7 MB, streaming — heavier
than the common skill-helper case warrants).

**Row 17 — git operations (settled).** Both are **pure-language Git
implementations** — no git binary required (gate-2 safe), at-floor,
bundle-friendly — the ideal outcome for the self-contained policy. Python
`dulwich` (MIT, ≥3.10): C accelerators (`_pack.so`/`_diff_tree.so`/
`_objects.so`) are **optional speed accelerators** — dulwich gracefully
falls back to pure-Python for all common ops (init, add, commit, status, refs,
diff, log), so it bundles into a zipapp safely; no accidental hard dependency
on the C path. `urllib3` dep is only for remote smart-HTTP ops (push/pull), not
local. JS/TS `isomorphic-git` (MIT, ≥14.17, 4 pure-JS deps, no git binary).
Both chosen over `GitPython`/`simple-git` (shell out to the git CLI = gate-2
fail) and `pygit2`/`nodegit` (native bindings = gate-1 fail).

Rows filled so far: 1–17 (all). The Q7 table is complete.


## What downstream work the answer may create#
## What downstream work the answer may create#
## What downstream work the answer may create 
## What downstream work the answer may createW
## What downstream work the answer may createh
## What downstream work the answer may createa
## What downstream work the answer may createt
## What downstream work the answer may create 
## What downstream work the answer may created
## What downstream work the answer may createo
## What downstream work the answer may createw
## What downstream work the answer may createn
## What downstream work the answer may creates
## What downstream work the answer may createt
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may createa
## What downstream work the answer may createm
## What downstream work the answer may create 
## What downstream work the answer may createw
## What downstream work the answer may createo
## What downstream work the answer may creater
## What downstream work the answer may createk
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may createa
## What downstream work the answer may createn
## What downstream work the answer may creates
## What downstream work the answer may createw
## What downstream work the answer may createe
## What downstream work the answer may creater
## What downstream work the answer may create 
## What downstream work the answer may createm
## What downstream work the answer may createa
## What downstream work the answer may createy
## What downstream work the answer may create 
## What downstream work the answer may createc
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may createa
## What downstream work the answer may createt
## What downstream work the answer may createe
## What downstream work the answer may create

## What downstream work the answer may create

## What downstream work the answer may create-
## What downstream work the answer may create 
## What downstream work the answer may createT
## What downstream work the answer may createh
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may creates
## What downstream work the answer may createe
## What downstream work the answer may createt
## What downstream work the answer may createt
## What downstream work the answer may createl
## What downstream work the answer may createe
## What downstream work the answer may created
## What downstream work the answer may create 
## What downstream work the answer may created
## What downstream work the answer may createe
## What downstream work the answer may createc
## What downstream work the answer may createi
## What downstream work the answer may creates
## What downstream work the answer may createi
## What downstream work the answer may createo
## What downstream work the answer may createn
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may createa
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may createc
## What downstream work the answer may createo
## What downstream work the answer may createn
## What downstream work the answer may creates
## What downstream work the answer may createu
## What downstream work the answer may createm
## What downstream work the answer may createe
## What downstream work the answer may created
## What downstream work the answer may create 
## What downstream work the answer may createb
## What downstream work the answer may createy
## What downstream work the answer may create 
## What downstream work the answer may creates
## What downstream work the answer may createl
## What downstream work the answer may createi
## What downstream work the answer may createc
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may create5
## What downstream work the answer may create 
## What downstream work the answer may create(
## What downstream work the answer may create`
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may createf
## What downstream work the answer may createe
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may createn
## What downstream work the answer may createc
## What downstream work the answer may createe
## What downstream work the answer may creates
## What downstream work the answer may create-
## What downstream work the answer may creates
## What downstream work the answer may createu
## What downstream work the answer may createp
## What downstream work the answer may createp
## What downstream work the answer may createo
## What downstream work the answer may creater
## What downstream work the answer may createt
## What downstream work the answer may create-
## What downstream work the answer may creates
## What downstream work the answer may createc
## What downstream work the answer may creater
## What downstream work the answer may createi
## What downstream work the answer may createp
## What downstream work the answer may createt
## What downstream work the answer may creates
## What downstream work the answer may create`
## What downstream work the answer may create)
## What downstream work the answer may create

## What downstream work the answer may create 
## What downstream work the answer may create 
## What downstream work the answer may createo
## What downstream work the answer may createf
## What downstream work the answer may create 
## What downstream work the answer may create`
## What downstream work the answer may createb
## What downstream work the answer may createu
## What downstream work the answer may createi
## What downstream work the answer may createl
## What downstream work the answer may created
## What downstream work the answer may create-
## What downstream work the answer may creates
## What downstream work the answer may createk
## What downstream work the answer may createi
## What downstream work the answer may createl
## What downstream work the answer may createl
## What downstream work the answer may create-
## What downstream work the answer may createc
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may createa
## What downstream work the answer may createt
## What downstream work the answer may createo
## What downstream work the answer may creater
## What downstream work the answer may create-
## What downstream work the answer may creates
## What downstream work the answer may createk
## What downstream work the answer may createi
## What downstream work the answer may createl
## What downstream work the answer may createl
## What downstream work the answer may create`
## What downstream work the answer may create,
## What downstream work the answer may create 
## What downstream work the answer may createw
## What downstream work the answer may createh
## What downstream work the answer may createi
## What downstream work the answer may createc
## What downstream work the answer may createh
## What downstream work the answer may create 
## What downstream work the answer may createw
## What downstream work the answer may creater
## What downstream work the answer may createi
## What downstream work the answer may createt
## What downstream work the answer may createe
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may creates
## What downstream work the answer may createh
## What downstream work the answer may createa
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may created
## What downstream work the answer may create

## What downstream work the answer may create 
## What downstream work the answer may create 
## What downstream work the answer may create`
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may createf
## What downstream work the answer may createe
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may createn
## What downstream work the answer may createc
## What downstream work the answer may createe
## What downstream work the answer may creates
## What downstream work the answer may create/
## What downstream work the answer may creates
## What downstream work the answer may createu
## What downstream work the answer may createp
## What downstream work the answer may createp
## What downstream work the answer may createo
## What downstream work the answer may creater
## What downstream work the answer may createt
## What downstream work the answer may create-
## What downstream work the answer may creates
## What downstream work the answer may createc
## What downstream work the answer may creater
## What downstream work the answer may createi
## What downstream work the answer may createp
## What downstream work the answer may createt
## What downstream work the answer may creates
## What downstream work the answer may create.
## What downstream work the answer may createm
## What downstream work the answer may created
## What downstream work the answer may create`
## What downstream work the answer may create 
## What downstream work the answer may createp
## What downstream work the answer may createl
## What downstream work the answer may createu
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may create`
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may createf
## What downstream work the answer may createe
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may createn
## What downstream work the answer may createc
## What downstream work the answer may createe
## What downstream work the answer may creates
## What downstream work the answer may create/
## What downstream work the answer may creates
## What downstream work the answer may createu
## What downstream work the answer may createp
## What downstream work the answer may createp
## What downstream work the answer may createo
## What downstream work the answer may creater
## What downstream work the answer may createt
## What downstream work the answer may create-
## What downstream work the answer may creates
## What downstream work the answer may createc
## What downstream work the answer may creater
## What downstream work the answer may createi
## What downstream work the answer may createp
## What downstream work the answer may createt
## What downstream work the answer may creates
## What downstream work the answer may create-
## What downstream work the answer may createp
## What downstream work the answer may createy
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createo
## What downstream work the answer may createn
## What downstream work the answer may create.
## What downstream work the answer may createm
## What downstream work the answer may created
## What downstream work the answer may create`
## What downstream work the answer may create,
## What downstream work the answer may create

## What downstream work the answer may create 
## What downstream work the answer may create 
## What downstream work the answer may create`
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may createf
## What downstream work the answer may createe
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may createn
## What downstream work the answer may createc
## What downstream work the answer may createe
## What downstream work the answer may creates
## What downstream work the answer may create/
## What downstream work the answer may creates
## What downstream work the answer may createu
## What downstream work the answer may createp
## What downstream work the answer may createp
## What downstream work the answer may createo
## What downstream work the answer may creater
## What downstream work the answer may createt
## What downstream work the answer may create-
## What downstream work the answer may creates
## What downstream work the answer may createc
## What downstream work the answer may creater
## What downstream work the answer may createi
## What downstream work the answer may createp
## What downstream work the answer may createt
## What downstream work the answer may creates
## What downstream work the answer may create-
## What downstream work the answer may createj
## What downstream work the answer may creates
## What downstream work the answer may create-
## What downstream work the answer may createt
## What downstream work the answer may creates
## What downstream work the answer may create.
## What downstream work the answer may createm
## What downstream work the answer may created
## What downstream work the answer may create`
## What downstream work the answer may create,
## What downstream work the answer may create 
## What downstream work the answer may createa
## What downstream work the answer may createn
## What downstream work the answer may created
## What downstream work the answer may create 
## What downstream work the answer may create`
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may createf
## What downstream work the answer may createe
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may createn
## What downstream work the answer may createc
## What downstream work the answer may createe
## What downstream work the answer may creates
## What downstream work the answer may create/
## What downstream work the answer may creates
## What downstream work the answer may createu
## What downstream work the answer may createp
## What downstream work the answer may createp
## What downstream work the answer may createo
## What downstream work the answer may creater
## What downstream work the answer may createt
## What downstream work the answer may create-
## What downstream work the answer may creates
## What downstream work the answer may createc
## What downstream work the answer may creater
## What downstream work the answer may createi
## What downstream work the answer may createp
## What downstream work the answer may createt
## What downstream work the answer may creates
## What downstream work the answer may create-
## What downstream work the answer may createb
## What downstream work the answer may createa
## What downstream work the answer may creates
## What downstream work the answer may createh
## What downstream work the answer may create.
## What downstream work the answer may createm
## What downstream work the answer may created
## What downstream work the answer may create`
## What downstream work the answer may create

## What downstream work the answer may create 
## What downstream work the answer may create 
## What downstream work the answer may createa
## What downstream work the answer may createn
## What downstream work the answer may created
## What downstream work the answer may create 
## What downstream work the answer may createw
## What downstream work the answer may createi
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createe
## What downstream work the answer may createm
## What downstream work the answer may create 
## What downstream work the answer may createi
## What downstream work the answer may createn
## What downstream work the answer may createt
## What downstream work the answer may createo
## What downstream work the answer may create 
## What downstream work the answer may create`
## What downstream work the answer may createS
## What downstream work the answer may createK
## What downstream work the answer may createI
## What downstream work the answer may createL
## What downstream work the answer may createL
## What downstream work the answer may create.
## What downstream work the answer may createm
## What downstream work the answer may created
## What downstream work the answer may create`
## What downstream work the answer may create'
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may create"
## What downstream work the answer may createc
## What downstream work the answer may createh
## What downstream work the answer may createo
## What downstream work the answer may createo
## What downstream work the answer may creates
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may createa
## What downstream work the answer may create 
## What downstream work the answer may creates
## What downstream work the answer may createc
## What downstream work the answer may creater
## What downstream work the answer may createi
## What downstream work the answer may createp
## What downstream work the answer may createt
## What downstream work the answer may create 
## What downstream work the answer may createl
## What downstream work the answer may createa
## What downstream work the answer may createn
## What downstream work the answer may createg
## What downstream work the answer may createu
## What downstream work the answer may createa
## What downstream work the answer may createg
## What downstream work the answer may createe
## What downstream work the answer may create"
## What downstream work the answer may create 
## What downstream work the answer may creater
## What downstream work the answer may createu
## What downstream work the answer may createl
## What downstream work the answer may createe
## What downstream work the answer may create.
## What downstream work the answer may create

## What downstream work the answer may create-
## What downstream work the answer may create 
## What downstream work the answer may create*
## What downstream work the answer may create*
## What downstream work the answer may createQ
## What downstream work the answer may create5
## What downstream work the answer may create/
## What downstream work the answer may createQ
## What downstream work the answer may create6
## What downstream work the answer may create/
## What downstream work the answer may createQ
## What downstream work the answer may create7
## What downstream work the answer may create 
## What downstream work the answer may create—
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may created
## What downstream work the answer may createe
## What downstream work the answer may createf
## What downstream work the answer may createa
## What downstream work the answer may createu
## What downstream work the answer may createl
## What downstream work the answer may createt
## What downstream work the answer may create 
## What downstream work the answer may creates
## What downstream work the answer may createt
## What downstream work the answer may createa
## What downstream work the answer may createc
## What downstream work the answer may createk
## What downstream work the answer may create*
## What downstream work the answer may create*
## What downstream work the answer may create 
## What downstream work the answer may create(
## What downstream work the answer may creates
## What downstream work the answer may createe
## What downstream work the answer may createl
## What downstream work the answer may createe
## What downstream work the answer may createc
## What downstream work the answer may createt
## What downstream work the answer may createi
## What downstream work the answer may createo
## What downstream work the answer may createn
## What downstream work the answer may create 
## What downstream work the answer may creates
## What downstream work the answer may createt
## What downstream work the answer may createa
## What downstream work the answer may createn
## What downstream work the answer may created
## What downstream work the answer may createa
## What downstream work the answer may creater
## What downstream work the answer may created
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may create+
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may create1
## What downstream work the answer may create7
## What downstream work the answer may create-
## What downstream work the answer may creates
## What downstream work the answer may createl
## What downstream work the answer may createo
## What downstream work the answer may createt
## What downstream work the answer may create 
## What downstream work the answer may createc
## What downstream work the answer may createo
## What downstream work the answer may createn
## What downstream work the answer may createc
## What downstream work the answer may createe
## What downstream work the answer may creater
## What downstream work the answer may createn
## What downstream work the answer may create 
## What downstream work the answer may creates
## What downstream work the answer may createe
## What downstream work the answer may createt
## What downstream work the answer may create

## What downstream work the answer may create 
## What downstream work the answer may create 
## What downstream work the answer may create+
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createe
## What downstream work the answer may createi
## What downstream work the answer may creater
## What downstream work the answer may create 
## What downstream work the answer may createl
## What downstream work the answer may createi
## What downstream work the answer may createb
## What downstream work the answer may creater
## What downstream work the answer may createa
## What downstream work the answer may creater
## What downstream work the answer may createy
## What downstream work the answer may create 
## What downstream work the answer may createf
## What downstream work the answer may createi
## What downstream work the answer may createl
## What downstream work the answer may createl
## What downstream work the answer may creates
## What downstream work the answer may create)
## What downstream work the answer may create 
## What downstream work the answer may createi
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may createc
## What downstream work the answer may createo
## What downstream work the answer may createn
## What downstream work the answer may creates
## What downstream work the answer may createu
## What downstream work the answer may createm
## What downstream work the answer may createe
## What downstream work the answer may created
## What downstream work the answer may create 
## What downstream work the answer may createb
## What downstream work the answer may createy
## What downstream work the answer may create 
## What downstream work the answer may creates
## What downstream work the answer may createl
## What downstream work the answer may createi
## What downstream work the answer may createc
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may create5
## What downstream work the answer may create:
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may createf
## What downstream work the answer may createi
## What downstream work the answer may createl
## What downstream work the answer may createl
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may createl
## What downstream work the answer may createi
## What downstream work the answer may createv
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may createi
## What downstream work the answer may createn
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createe
## What downstream work the answer may create

## What downstream work the answer may create 
## What downstream work the answer may create 
## What downstream work the answer may createp
## What downstream work the answer may createe
## What downstream work the answer may creater
## What downstream work the answer may create-
## What downstream work the answer may createl
## What downstream work the answer may createa
## What downstream work the answer may createn
## What downstream work the answer may createg
## What downstream work the answer may createu
## What downstream work the answer may createa
## What downstream work the answer may createg
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may create`
## What downstream work the answer may creates
## What downstream work the answer may createu
## What downstream work the answer may createp
## What downstream work the answer may createp
## What downstream work the answer may createo
## What downstream work the answer may creater
## What downstream work the answer may createt
## What downstream work the answer may create-
## What downstream work the answer may creates
## What downstream work the answer may createc
## What downstream work the answer may creater
## What downstream work the answer may createi
## What downstream work the answer may createp
## What downstream work the answer may createt
## What downstream work the answer may creates
## What downstream work the answer may create-
## What downstream work the answer may create{
## What downstream work the answer may createp
## What downstream work the answer may createy
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createo
## What downstream work the answer may createn
## What downstream work the answer may create,
## What downstream work the answer may createj
## What downstream work the answer may creates
## What downstream work the answer may create-
## What downstream work the answer may createt
## What downstream work the answer may creates
## What downstream work the answer may create}
## What downstream work the answer may create.
## What downstream work the answer may createm
## What downstream work the answer may created
## What downstream work the answer may create`
## What downstream work the answer may create 
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may createf
## What downstream work the answer may createe
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may createn
## What downstream work the answer may createc
## What downstream work the answer may createe
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may create(
## What downstream work the answer may createo
## What downstream work the answer may createn
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may created
## What downstream work the answer may createe
## What downstream work the answer may createf
## What downstream work the answer may createa
## What downstream work the answer may createu
## What downstream work the answer may createl
## What downstream work the answer may createt
## What downstream work the answer may create 
## What downstream work the answer may createp
## What downstream work the answer may createe
## What downstream work the answer may creater
## What downstream work the answer may create

## What downstream work the answer may create 
## What downstream work the answer may create 
## What downstream work the answer may creates
## What downstream work the answer may createl
## What downstream work the answer may createo
## What downstream work the answer may createt
## What downstream work the answer may create 
## What downstream work the answer may create+
## What downstream work the answer may create 
## What downstream work the answer may createa
## What downstream work the answer may create 
## What downstream work the answer may createc
## What downstream work the answer may createo
## What downstream work the answer may createn
## What downstream work the answer may created
## What downstream work the answer may createi
## What downstream work the answer may createt
## What downstream work the answer may createi
## What downstream work the answer may createo
## What downstream work the answer may createn
## What downstream work the answer may createa
## What downstream work the answer may createl
## What downstream work the answer may create 
## What downstream work the answer may createc
## What downstream work the answer may createo
## What downstream work the answer may createp
## What downstream work the answer may createy
## What downstream work the answer may createl
## What downstream work the answer may createe
## What downstream work the answer may createf
## What downstream work the answer may createt
## What downstream work the answer may create 
## What downstream work the answer may createa
## What downstream work the answer may createl
## What downstream work the answer may createt
## What downstream work the answer may createe
## What downstream work the answer may creater
## What downstream work the answer may createn
## What downstream work the answer may createa
## What downstream work the answer may createt
## What downstream work the answer may createi
## What downstream work the answer may createv
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may createw
## What downstream work the answer may createh
## What downstream work the answer may createe
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may createo
## What downstream work the answer may createn
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may createq
## What downstream work the answer may createu
## What downstream work the answer may createa
## What downstream work the answer may createl
## What downstream work the answer may createi
## What downstream work the answer may createf
## What downstream work the answer may createi
## What downstream work the answer may createe
## What downstream work the answer may creates
## What downstream work the answer may create)
## What downstream work the answer may create,
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may creates
## What downstream work the answer may createt
## What downstream work the answer may createa
## What downstream work the answer may createn
## What downstream work the answer may created
## What downstream work the answer may createa
## What downstream work the answer may creater
## What downstream work the answer may created
## What downstream work the answer may creates
## What downstream work the answer may create

## What downstream work the answer may create 
## What downstream work the answer may create 
## What downstream work the answer may createi
## What downstream work the answer may createn
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may creates
## What downstream work the answer may createh
## What downstream work the answer may createa
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may created
## What downstream work the answer may create 
## What downstream work the answer may create`
## What downstream work the answer may creates
## What downstream work the answer may createu
## What downstream work the answer may createp
## What downstream work the answer may createp
## What downstream work the answer may createo
## What downstream work the answer may creater
## What downstream work the answer may createt
## What downstream work the answer may create-
## What downstream work the answer may creates
## What downstream work the answer may createc
## What downstream work the answer may creater
## What downstream work the answer may createi
## What downstream work the answer may createp
## What downstream work the answer may createt
## What downstream work the answer may creates
## What downstream work the answer may create.
## What downstream work the answer may createm
## What downstream work the answer may created
## What downstream work the answer may create`
## What downstream work the answer may create.
## What downstream work the answer may create

## What downstream work the answer may create-
## What downstream work the answer may create 
## What downstream work the answer may create*
## What downstream work the answer may create*
## What downstream work the answer may createN
## What downstream work the answer may createe
## What downstream work the answer may createw
## What downstream work the answer may createl
## What downstream work the answer may createy
## What downstream work the answer may create 
## What downstream work the answer may createc
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may createa
## What downstream work the answer may createt
## What downstream work the answer may createe
## What downstream work the answer may created
## What downstream work the answer may create 
## What downstream work the answer may createw
## What downstream work the answer may createo
## What downstream work the answer may creater
## What downstream work the answer may createk
## What downstream work the answer may create 
## What downstream work the answer may create(
## What downstream work the answer may createQ
## What downstream work the answer may create3
## What downstream work the answer may create)
## What downstream work the answer may create:
## What downstream work the answer may create*
## What downstream work the answer may create*
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may create`
## What downstream work the answer may createb
## What downstream work the answer may createu
## What downstream work the answer may createn
## What downstream work the answer may created
## What downstream work the answer may createl
## What downstream work the answer may createe
## What downstream work the answer may create-
## What downstream work the answer may creates
## What downstream work the answer may createc
## What downstream work the answer may creater
## What downstream work the answer may createi
## What downstream work the answer may createp
## What downstream work the answer may createt
## What downstream work the answer may create-
## What downstream work the answer may createt
## What downstream work the answer may createe
## What downstream work the answer may createm
## What downstream work the answer may createp
## What downstream work the answer may createl
## What downstream work the answer may createa
## What downstream work the answer may createt
## What downstream work the answer may createe
## What downstream work the answer may create`
## What downstream work the answer may create 
## What downstream work the answer may create*
## What downstream work the answer may create*
## What downstream work the answer may createp
## What downstream work the answer may creater
## What downstream work the answer may createo
## What downstream work the answer may createt
## What downstream work the answer may createo
## What downstream work the answer may createt
## What downstream work the answer may createy
## What downstream work the answer may createp
## What downstream work the answer may createe
## What downstream work the answer may create*
## What downstream work the answer may create*
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createa
## What downstream work the answer may creates
## What downstream work the answer may createk
## What downstream work the answer may create

## What downstream work the answer may create 
## What downstream work the answer may create 
## What downstream work the answer may createi
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may creater
## What downstream work the answer may createa
## What downstream work the answer may createi
## What downstream work the answer may creates
## What downstream work the answer may createe
## What downstream work the answer may created
## What downstream work the answer may create 
## What downstream work the answer may createw
## What downstream work the answer may createi
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may create 
## What downstream work the answer may createW
## What downstream work the answer may createa
## What downstream work the answer may createy
## What downstream work the answer may createf
## What downstream work the answer may createi
## What downstream work the answer may createn
## What downstream work the answer may created
## What downstream work the answer may createe
## What downstream work the answer may creater
## What downstream work the answer may create 
## What downstream work the answer may create(
## What downstream work the answer may createc
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may createa
## What downstream work the answer may createt
## What downstream work the answer may createe
## What downstream work the answer may created
## What downstream work the answer may create 
## What downstream work the answer may createn
## What downstream work the answer may createo
## What downstream work the answer may createw
## What downstream work the answer may create,
## What downstream work the answer may create 
## What downstream work the answer may createb
## What downstream work the answer may createl
## What downstream work the answer may createo
## What downstream work the answer may createc
## What downstream work the answer may createk
## What downstream work the answer may createe
## What downstream work the answer may created
## What downstream work the answer may create_
## What downstream work the answer may createb
## What downstream work the answer may createy
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createi
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may createg
## What downstream work the answer may creater
## What downstream work the answer may createi
## What downstream work the answer may createl
## What downstream work the answer may createl
## What downstream work the answer may createi
## What downstream work the answer may createn
## What downstream work the answer may createg
## What downstream work the answer may create)
## What downstream work the answer may create.
## What downstream work the answer may create 
## What downstream work the answer may createI
## What downstream work the answer may createt
## What downstream work the answer may create 
## What downstream work the answer may createb
## What downstream work the answer may createu
## What downstream work the answer may createi
## What downstream work the answer may createl
## What downstream work the answer may created
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may createa
## What downstream work the answer may create

## What downstream work the answer may create 
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may creater
## What downstream work the answer may createo
## What downstream work the answer may createw
## What downstream work the answer may createa
## What downstream work the answer may createw
## What downstream work the answer may createa
## What downstream work the answer may createy
## What downstream work the answer may create 
## What downstream work the answer may createp
## What downstream work the answer may creater
## What downstream work the answer may createo
## What downstream work the answer may createj
## What downstream work the answer may createe
## What downstream work the answer may createc
## What downstream work the answer may createt
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createa
## What downstream work the answer may createt
## What downstream work the answer may create 
## What downstream work the answer may creates
## What downstream work the answer may createe
## What downstream work the answer may createt
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may createu
## What downstream work the answer may createp
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may createb
## What downstream work the answer may createu
## What downstream work the answer may createn
## What downstream work the answer may created
## What downstream work the answer may createl
## What downstream work the answer may createe
## What downstream work the answer may created
## What downstream work the answer may create-
## What downstream work the answer may creates
## What downstream work the answer may createe
## What downstream work the answer may createl
## What downstream work the answer may createf
## What downstream work the answer may create-
## What downstream work the answer may createc
## What downstream work the answer may createo
## What downstream work the answer may createn
## What downstream work the answer may createt
## What downstream work the answer may createa
## What downstream work the answer may createi
## What downstream work the answer may createn
## What downstream work the answer may createe
## What downstream work the answer may created
## What downstream work the answer may create-
## What downstream work the answer may creates
## What downstream work the answer may createc
## What downstream work the answer may creater
## What downstream work the answer may createi
## What downstream work the answer may createp
## What downstream work the answer may createt
## What downstream work the answer may create 
## What downstream work the answer may createp
## What downstream work the answer may createa
## What downstream work the answer may createt
## What downstream work the answer may createt
## What downstream work the answer may createe
## What downstream work the answer may creater
## What downstream work the answer may createn
## What downstream work the answer may create

## What downstream work the answer may create 
## What downstream work the answer may create 
## What downstream work the answer may createf
## What downstream work the answer may createo
## What downstream work the answer may creater
## What downstream work the answer may create 
## What downstream work the answer may create*
## What downstream work the answer may create*
## What downstream work the answer may createb
## What downstream work the answer may createo
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may create 
## What downstream work the answer may createP
## What downstream work the answer may createy
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createo
## What downstream work the answer may createn
## What downstream work the answer may create 
## What downstream work the answer may createa
## What downstream work the answer may createn
## What downstream work the answer may created
## What downstream work the answer may create 
## What downstream work the answer may createJ
## What downstream work the answer may createS
## What downstream work the answer may create/
## What downstream work the answer may createT
## What downstream work the answer may createS
## What downstream work the answer may create*
## What downstream work the answer may create*
## What downstream work the answer may create 
## What downstream work the answer may createa
## What downstream work the answer may createg
## What downstream work the answer may createa
## What downstream work the answer may createi
## What downstream work the answer may createn
## What downstream work the answer may creates
## What downstream work the answer may createt
## What downstream work the answer may create 
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may creates
## What downstream work the answer may createt
## What downstream work the answer may creater
## What downstream work the answer may createi
## What downstream work the answer may createc
## What downstream work the answer may createt
## What downstream work the answer may createi
## What downstream work the answer may createo
## What downstream work the answer may createn
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may createu
## What downstream work the answer may creates
## What downstream work the answer may createe
## What downstream work the answer may creater
## What downstream work the answer may create 
## What downstream work the answer may createp
## What downstream work the answer may creater
## What downstream work the answer may createo
## What downstream work the answer may createv
## What downstream work the answer may createi
## What downstream work the answer may created
## What downstream work the answer may createe
## What downstream work the answer may creates
## What downstream work the answer may create,
## What downstream work the answer may create

## What downstream work the answer may create 
## What downstream work the answer may create 
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may creates
## What downstream work the answer may createe
## What downstream work the answer may createa
## What downstream work the answer may creater
## What downstream work the answer may createc
## What downstream work the answer may createh
## What downstream work the answer may createe
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may createe
## What downstream work the answer may creater
## What downstream work the answer may createg
## What downstream work the answer may createo
## What downstream work the answer may createn
## What downstream work the answer may createo
## What downstream work the answer may createm
## What downstream work the answer may createi
## What downstream work the answer may createc
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may create+
## What downstream work the answer may create 
## What downstream work the answer may createp
## What downstream work the answer may createe
## What downstream work the answer may creater
## What downstream work the answer may createf
## What downstream work the answer may createo
## What downstream work the answer may creater
## What downstream work the answer may createm
## What downstream work the answer may createa
## What downstream work the answer may createn
## What downstream work the answer may createc
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may createo
## What downstream work the answer may createf
## What downstream work the answer may create 
## What downstream work the answer may createc
## What downstream work the answer may createa
## What downstream work the answer may createn
## What downstream work the answer may created
## What downstream work the answer may createi
## What downstream work the answer may created
## What downstream work the answer may createa
## What downstream work the answer may createt
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may createb
## What downstream work the answer may createu
## What downstream work the answer may createn
## What downstream work the answer may created
## What downstream work the answer may createl
## What downstream work the answer may createe
## What downstream work the answer may creater
## What downstream work the answer may creates
## What downstream work the answer may create,
## What downstream work the answer may create 
## What downstream work the answer may createa
## What downstream work the answer may createn
## What downstream work the answer may created
## What downstream work the answer may create 
## What downstream work the answer may createp
## What downstream work the answer may createi
## What downstream work the answer may createc
## What downstream work the answer may createk
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may createa
## What downstream work the answer may createn
## What downstream work the answer may create

## What downstream work the answer may create 
## What downstream work the answer may create 
## What downstream work the answer may createo
## What downstream work the answer may createp
## What downstream work the answer may createt
## What downstream work the answer may createi
## What downstream work the answer may createm
## What downstream work the answer may createu
## What downstream work the answer may createm
## What downstream work the answer may create 
## What downstream work the answer may createp
## What downstream work the answer may createa
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may create 
## What downstream work the answer may createp
## What downstream work the answer may createe
## What downstream work the answer may creater
## What downstream work the answer may create 
## What downstream work the answer may createl
## What downstream work the answer may createa
## What downstream work the answer may createn
## What downstream work the answer may createg
## What downstream work the answer may createu
## What downstream work the answer may createa
## What downstream work the answer may createg
## What downstream work the answer may createe
## What downstream work the answer may create.
## What downstream work the answer may create 
## What downstream work the answer may createT
## What downstream work the answer may createh
## What downstream work the answer may createa
## What downstream work the answer may createt
## What downstream work the answer may create 
## What downstream work the answer may createo
## What downstream work the answer may createp
## What downstream work the answer may createt
## What downstream work the answer may createi
## What downstream work the answer may createm
## What downstream work the answer may createu
## What downstream work the answer may createm
## What downstream work the answer may create 
## What downstream work the answer may createp
## What downstream work the answer may createa
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may create 
## What downstream work the answer may createb
## What downstream work the answer may createe
## What downstream work the answer may createc
## What downstream work the answer may createo
## What downstream work the answer may createm
## What downstream work the answer may createe
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may createa
## What downstream work the answer may create 
## What downstream work the answer may create*
## What downstream work the answer may create*
## What downstream work the answer may createt
## What downstream work the answer may createe
## What downstream work the answer may createm
## What downstream work the answer may createp
## What downstream work the answer may createl
## What downstream work the answer may createa
## What downstream work the answer may createt
## What downstream work the answer may createe
## What downstream work the answer may create*
## What downstream work the answer may create*
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createa
## What downstream work the answer may createt
## What downstream work the answer may create 
## What downstream work the answer may createa
## What downstream work the answer may create

## What downstream work the answer may create 
## What downstream work the answer may create 
## What downstream work the answer may createf
## What downstream work the answer may createo
## What downstream work the answer may createl
## What downstream work the answer may createl
## What downstream work the answer may createo
## What downstream work the answer may createw
## What downstream work the answer may create-
## What downstream work the answer may createu
## What downstream work the answer may createp
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createa
## What downstream work the answer may creates
## What downstream work the answer may createk
## What downstream work the answer may create 
## What downstream work the answer may create(
## What downstream work the answer may creater
## What downstream work the answer may createa
## What downstream work the answer may createi
## What downstream work the answer may creates
## What downstream work the answer may createe
## What downstream work the answer may created
## What downstream work the answer may create 
## What downstream work the answer may createb
## What downstream work the answer may createy
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may createp
## What downstream work the answer may creater
## What downstream work the answer may createo
## What downstream work the answer may createt
## What downstream work the answer may createo
## What downstream work the answer may createt
## What downstream work the answer may createy
## What downstream work the answer may createp
## What downstream work the answer may createe
## What downstream work the answer may create,
## What downstream work the answer may create 
## What downstream work the answer may createn
## What downstream work the answer may createo
## What downstream work the answer may createt
## What downstream work the answer may create 
## What downstream work the answer may createp
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may create-
## What downstream work the answer may createc
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may createa
## What downstream work the answer may createt
## What downstream work the answer may createe
## What downstream work the answer may created
## What downstream work the answer may create)
## What downstream work the answer may create 
## What downstream work the answer may createf
## What downstream work the answer may createo
## What downstream work the answer may createl
## What downstream work the answer may created
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may createi
## What downstream work the answer may createn
## What downstream work the answer may createt
## What downstream work the answer may createo
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createe
## What downstream work the answer may create

## What downstream work the answer may create 
## What downstream work the answer may create 
## What downstream work the answer may createp
## What downstream work the answer may createe
## What downstream work the answer may creater
## What downstream work the answer may create-
## What downstream work the answer may createl
## What downstream work the answer may createa
## What downstream work the answer may createn
## What downstream work the answer may createg
## What downstream work the answer may createu
## What downstream work the answer may createa
## What downstream work the answer may createg
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may createf
## What downstream work the answer may createe
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may createn
## What downstream work the answer may createc
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may createf
## What downstream work the answer may createi
## What downstream work the answer may createl
## What downstream work the answer may createe
## What downstream work the answer may creates
## What downstream work the answer may create.
## What downstream work the answer may create 
## What downstream work the answer may createS
## What downstream work the answer may createl
## What downstream work the answer may createi
## What downstream work the answer may createc
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may create5
## What downstream work the answer may create 
## What downstream work the answer may createw
## What downstream work the answer may creater
## What downstream work the answer may createi
## What downstream work the answer may createt
## What downstream work the answer may createe
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may createp
## What downstream work the answer may createo
## What downstream work the answer may createl
## What downstream work the answer may createi
## What downstream work the answer may createc
## What downstream work the answer may createy
## What downstream work the answer may create-
## What downstream work the answer may createl
## What downstream work the answer may createe
## What downstream work the answer may createv
## What downstream work the answer may createe
## What downstream work the answer may createl
## What downstream work the answer may create 
## What downstream work the answer may createb
## What downstream work the answer may createu
## What downstream work the answer may createn
## What downstream work the answer may created
## What downstream work the answer may createl
## What downstream work the answer may createi
## What downstream work the answer may createn
## What downstream work the answer may createg
## What downstream work the answer may create 
## What downstream work the answer may create+
## What downstream work the answer may create 
## What downstream work the answer may createa
## What downstream work the answer may create

## What downstream work the answer may create 
## What downstream work the answer may create 
## What downstream work the answer may createp
## What downstream work the answer may createo
## What downstream work the answer may createi
## What downstream work the answer may createn
## What downstream work the answer may createt
## What downstream work the answer may createe
## What downstream work the answer may creater
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createo
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may create(
## What downstream work the answer may createf
## What downstream work the answer may createo
## What downstream work the answer may creater
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createc
## What downstream work the answer may createo
## What downstream work the answer may createm
## What downstream work the answer may createi
## What downstream work the answer may createn
## What downstream work the answer may createg
## What downstream work the answer may create)
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createe
## What downstream work the answer may createm
## What downstream work the answer may createp
## What downstream work the answer may createl
## What downstream work the answer may createa
## What downstream work the answer may createt
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may creates
## What downstream work the answer may createo
## What downstream work the answer may create 
## What downstream work the answer may create`
## What downstream work the answer may creates
## What downstream work the answer may createk
## What downstream work the answer may createi
## What downstream work the answer may createl
## What downstream work the answer may createl
## What downstream work the answer may create-
## What downstream work the answer may createc
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may createa
## What downstream work the answer may createt
## What downstream work the answer may createo
## What downstream work the answer may creater
## What downstream work the answer may create`
## What downstream work the answer may create 
## What downstream work the answer may createi
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may createn
## What downstream work the answer may createo
## What downstream work the answer may createt
## What downstream work the answer may create 
## What downstream work the answer may createb
## What downstream work the answer may createl
## What downstream work the answer may createo
## What downstream work the answer may createc
## What downstream work the answer may createk
## What downstream work the answer may createe
## What downstream work the answer may created
## What downstream work the answer may create 
## What downstream work the answer may createo
## What downstream work the answer may createn
## What downstream work the answer may create

## What downstream work the answer may create 
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may createp
## What downstream work the answer may creater
## What downstream work the answer may createo
## What downstream work the answer may createt
## What downstream work the answer may createo
## What downstream work the answer may createt
## What downstream work the answer may createy
## What downstream work the answer may createp
## What downstream work the answer may createe
## What downstream work the answer may create.
## What downstream work the answer may create

## What downstream work the answer may create-
## What downstream work the answer may create 
## What downstream work the answer may createQ
## What downstream work the answer may create1
## What downstream work the answer may create'
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may createb
## What downstream work the answer may createy
## What downstream work the answer may create-
## What downstream work the answer may createh
## What downstream work the answer may createa
## What downstream work the answer may createn
## What downstream work the answer may created
## What downstream work the answer may create-
## What downstream work the answer may createf
## What downstream work the answer may createa
## What downstream work the answer may createl
## What downstream work the answer may createl
## What downstream work the answer may createb
## What downstream work the answer may createa
## What downstream work the answer may createc
## What downstream work the answer may createk
## What downstream work the answer may create 
## What downstream work the answer may creates
## What downstream work the answer may createa
## What downstream work the answer may createf
## What downstream work the answer may createe
## What downstream work the answer may createt
## What downstream work the answer may createy
## What downstream work the answer may create 
## What downstream work the answer may created
## What downstream work the answer may createe
## What downstream work the answer may createc
## What downstream work the answer may createi
## What downstream work the answer may creates
## What downstream work the answer may createi
## What downstream work the answer may createo
## What downstream work the answer may createn
## What downstream work the answer may create 
## What downstream work the answer may createi
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may createa
## What downstream work the answer may createl
## What downstream work the answer may creates
## What downstream work the answer may createo
## What downstream work the answer may create 
## What downstream work the answer may createl
## What downstream work the answer may createi
## What downstream work the answer may createf
## What downstream work the answer may createt
## What downstream work the answer may createe
## What downstream work the answer may created
## What downstream work the answer may create 
## What downstream work the answer may createi
## What downstream work the answer may createn
## What downstream work the answer may createt
## What downstream work the answer may createo
## What downstream work the answer may create 
## What downstream work the answer may create`
## What downstream work the answer may creates
## What downstream work the answer may createk
## What downstream work the answer may createi
## What downstream work the answer may createl
## What downstream work the answer may createl
## What downstream work the answer may create-
## What downstream work the answer may createc
## What downstream work the answer may creater
## What downstream work the answer may createe
## What downstream work the answer may createa
## What downstream work the answer may createt
## What downstream work the answer may createo
## What downstream work the answer may creater
## What downstream work the answer may create`
## What downstream work the answer may create'
## What downstream work the answer may creates
## What downstream work the answer may create

## What downstream work the answer may create 
## What downstream work the answer may create 
## What downstream work the answer may createo
## What downstream work the answer may createw
## What downstream work the answer may createn
## What downstream work the answer may create 
## What downstream work the answer may createb
## What downstream work the answer may createo
## What downstream work the answer may created
## What downstream work the answer may createy
## What downstream work the answer may create 
## What downstream work the answer may create(
## What downstream work the answer may creates
## What downstream work the answer may createl
## What downstream work the answer may createi
## What downstream work the answer may createc
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may create3
## What downstream work the answer may create)
## What downstream work the answer may create,
## What downstream work the answer may create 
## What downstream work the answer may createa
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may createu
## What downstream work the answer may creates
## What downstream work the answer may createe
## What downstream work the answer may creater
## What downstream work the answer may create 
## What downstream work the answer may creates
## What downstream work the answer may createp
## What downstream work the answer may createe
## What downstream work the answer may createc
## What downstream work the answer may createi
## What downstream work the answer may createf
## What downstream work the answer may createi
## What downstream work the answer may createe
## What downstream work the answer may created
## What downstream work the answer may create.
## What downstream work the answer may create

## What downstream work the answer may create-
## What downstream work the answer may create 
## What downstream work the answer may createI
## What downstream work the answer may createf
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may createg
## What downstream work the answer may creater
## What downstream work the answer may createi
## What downstream work the answer may createl
## What downstream work the answer may createl
## What downstream work the answer may createi
## What downstream work the answer may createn
## What downstream work the answer may createg
## What downstream work the answer may create 
## What downstream work the answer may creates
## What downstream work the answer may createu
## What downstream work the answer may creater
## What downstream work the answer may createf
## What downstream work the answer may createa
## What downstream work the answer may createc
## What downstream work the answer may createe
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may createa
## What downstream work the answer may create 
## What downstream work the answer may createg
## What downstream work the answer may createe
## What downstream work the answer may createn
## What downstream work the answer may createu
## What downstream work the answer may createi
## What downstream work the answer may createn
## What downstream work the answer may createe
## What downstream work the answer may createl
## What downstream work the answer may createy
## What downstream work the answer may create 
## What downstream work the answer may created
## What downstream work the answer may createi
## What downstream work the answer may creates
## What downstream work the answer may createt
## What downstream work the answer may createi
## What downstream work the answer may createn
## What downstream work the answer may createc
## What downstream work the answer may createt
## What downstream work the answer may create 
## What downstream work the answer may create*
## What downstream work the answer may createf
## What downstream work the answer may createo
## What downstream work the answer may createu
## What downstream work the answer may creater
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may create*
## What downstream work the answer may create 
## What downstream work the answer may createw
## What downstream work the answer may createe
## What downstream work the answer may createl
## What downstream work the answer may createl
## What downstream work the answer may create-
## What downstream work the answer may createk
## What downstream work the answer may createn
## What downstream work the answer may createo
## What downstream work the answer may createw
## What downstream work the answer may createn
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createa
## What downstream work the answer may creater
## What downstream work the answer may createg
## What downstream work the answer may createe
## What downstream work the answer may createt
## What downstream work the answer may create

## What downstream work the answer may create 
## What downstream work the answer may create 
## What downstream work the answer may createl
## What downstream work the answer may createa
## What downstream work the answer may createn
## What downstream work the answer may createg
## What downstream work the answer may createu
## What downstream work the answer may createa
## What downstream work the answer may createg
## What downstream work the answer may createe
## What downstream work the answer may create,
## What downstream work the answer may create 
## What downstream work the answer may creater
## What downstream work the answer may createa
## What downstream work the answer may createi
## What downstream work the answer may creates
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may createa
## What downstream work the answer may create 
## What downstream work the answer may createf
## What downstream work the answer may createo
## What downstream work the answer may createl
## What downstream work the answer may createl
## What downstream work the answer may createo
## What downstream work the answer may createw
## What downstream work the answer may create-
## What downstream work the answer may createu
## What downstream work the answer may createp
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createa
## What downstream work the answer may creates
## What downstream work the answer may createk
## What downstream work the answer may create 
## What downstream work the answer may createv
## What downstream work the answer may createi
## What downstream work the answer may createa
## What downstream work the answer may create 
## What downstream work the answer may createW
## What downstream work the answer may createa
## What downstream work the answer may createy
## What downstream work the answer may createf
## What downstream work the answer may createi
## What downstream work the answer may createn
## What downstream work the answer may created
## What downstream work the answer may createe
## What downstream work the answer may creater
## What downstream work the answer may create 
## What downstream work the answer may create(
## What downstream work the answer may created
## What downstream work the answer may createo
## What downstream work the answer may create 
## What downstream work the answer may createn
## What downstream work the answer may createo
## What downstream work the answer may createt
## What downstream work the answer may create 
## What downstream work the answer may createe
## What downstream work the answer may createx
## What downstream work the answer may createp
## What downstream work the answer may createa
## What downstream work the answer may createn
## What downstream work the answer may created
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createh
## What downstream work the answer may createi
## What downstream work the answer may creates
## What downstream work the answer may create 
## What downstream work the answer may createt
## What downstream work the answer may createa
## What downstream work the answer may creates
## What downstream work the answer may createk
## What downstream work the answer may create'
## What downstream work the answer may creates
## What downstream work the answer may create

## What downstream work the answer may create 
## What downstream work the answer may create 
## What downstream work the answer may creates
## What downstream work the answer may createc
## What downstream work the answer may createo
## What downstream work the answer may createp
## What downstream work the answer may createe
## What downstream work the answer may create 
## What downstream work the answer may createm
## What downstream work the answer may createi
## What downstream work the answer may created
## What downstream work the answer may create-
## What downstream work the answer may createg
## What downstream work the answer may creater
## What downstream work the answer may createi
## What downstream work the answer may createl
## What downstream work the answer may createl
## What downstream work the answer may create)
## What downstream work the answer may create.
## What downstream work the answer may create
## Completion evidence

The grilling's design tree is fully visited. The decision, in the user's terms:

- **Decision:** `skill-creator` ships a **shared** support-script backbone file
  (`references/support-scripts.md`) + three per-language specifics files
  (Python, JS/TS, Bash). The backbone encodes: when to ship a script; language
  choice (Python default, JS/TS when host is JS/TS, **Bash discouraged** /
  Windows-fragile); **self-contained at the end-user runtime** (stdlib-only OR
  libraries bundled into one committed file via a build step); **by-hand
  fallback is not a default** (safety-first: omit for dangerous ops);
  min-version contract (declare + error usefully + consult-user-before-install);
  and a **17-slot default stack** (one library per concern per language) at the
  Python 3.10 / Node 20 floor, chosen by settled standards.

- **Default stack (Q7, all 17 rows):**
  1. CLI: click / commander 14.x · 2. HTTP: httpx / built-in fetch · 3. config:
  PyYAML / yaml (follow surrounding tooling) · 4. formatting: plain-text
  default (rich/picocolors opt-in, humans-only) · 5. validation: marshmallow /
  zod · 6. FS/glob: stdlib / tinyglobby · 7. subprocess: stdlib / tinyexec ·
  8. OpenAPI codegen: datamodel-code-generator (dataclasses) / @hey-api/
  openapi-ts (fetch-based) · 9. web UI: bottle / hono + vendored htmx
  (rarely appropriate) · 10. REST server: bottle / hono · 11. retry: tenacity
  / async-retry · 12. templating: jinja2 / eta · 13a. markdown: mistune /
  marked · 13b. HTML: beautifulsoup4+stdlib html.parser / cheerio · 14. diff:
  stdlib difflib / diff-match-patch · 15. date: stdlib datetime / date-fns ·
  16. CSV: stdlib csv / papaparse (Excel dropped) · 17. git: dulwich /
  isomorphic-git (no git binary needed).

- **Important alternatives considered:** pydantic (gate-1: Rust core, won't
  zipapp) → marshmallow; jsonschema (gate-1: rpds-py Rust) → marshmallow;
  axios (supply-chain backdoor Mar 2026) → excluded; execa (13 deps / Node 22)
  → tinyexec; p-retry (stale-major pin) → async-retry; Flask (5 MB / 6 deps) →
  bottle; markdown-it-py (507 KB / 1 dep) → mistune; jsdiff (1 MB) →
  diff-match-patch; GitPython/simple-git (git binary) → dulwich/isomorphic-git.

- **Constraints and rationale:** Python 3.10 / Node 20 floor (Apple ships 3.9;
  3.10 is realistic mid-2026, keeps latest library majors). Every produced
  helper script declares its min runtime + errors usefully if older (agent
  must consult user before installing). Self-contained-at-runtime: stdlib-only
  OR bundled-committed-artifact (zipapp / JS bundler — the specific bundler
  template is deferred to the `bundle-script-template` prototype task).

- **Dependent-task implications:** slice 5 of `build-skill-creator-skill`
  consumes these decisions (shared + per-language references). The
  `bundle-script-template` prototype (blocked_by this grilling) provides the
  concrete zipapp/bundler templates; a later follow-up folds them into the
  references. `build-skill-creator-skill` is NOT blocked on the prototype
  (slice 5 ships policy-level bundling + a pointer).

- **Remaining fog / newly discovered work:** the `bundle-script-template`
  prototype (created) and its follow-up. No other fog from this grilling.
