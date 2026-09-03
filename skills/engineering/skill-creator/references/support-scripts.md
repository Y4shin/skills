# Support Scripts — Shared Policy

Read first when a produced skill bundles a script in `scripts/`.

This file states the cross-cutting policy **once**. Each per-language file
(`support-scripts-python.md`, `support-scripts-js-ts.md`,
`support-scripts-bash.md`) carries only language-specific details and points
back here for the shared decisions.

---

## When to ship a script

Bundle a script only for an operation that is **fragile, exact, repeated, or
numeric** — where prose would let the agent get it wrong. Keep judgment steps
as prose; script the deterministic steps. If the agent can reliably do it from
a one-line instruction, don't bundle a script.

## Language choice

- **Match the target repo/project's canonical language.** A Go repo → Go
  script; a JS/TS project → JS/TS; a Python codebase → Python.
- **Default to Python** when unconstrained — it has the broadest
  cross-platform reach with a rich stdlib.
- **JS/TS** when the host project is JS/TS.
- **Bash is supported but discouraged.** It is not reliably cross-platform
  (Windows portability varies by agent; some Windows agents have no POSIX
  shell). Use it only for tiny pure-shell glue and prefer Python for anything
  that must run on Windows. See `support-scripts-bash.md` for the full
  caveats.

When the target repo's canonical language is none of Python/JS/TS/Bash (e.g.
Ruby, Go, Rust), match that language — the per-language references here cover
the three well-known defaults; other languages follow the same shared policy
(self-contained at runtime, clear shape, tested on a worked example).

## Self-contained at the end-user runtime

A produced skill's scripts must be **self-contained at the end-user's
runtime** — the end user must not need to install libraries or have extra CLI
tools present. Two ways there:

1. **Stdlib-only** — the lightest option; no dependencies at all.
2. **Use libraries, but add a build step** that bundles the dependencies and
   the script into **one file**, and **commit the built artifact into the git
   tree** so it is ready to use. Python: `zipapp`; JS/TS: a bundler. The
   per-language file names the mechanism and points to the concrete build
   template.

**Network resources (HTTP/API calls) are an acceptable runtime dependency.**
What we avoid is requiring the end user's environment to have specific CLI
tools installed or to install libraries. The build step + committed artifact
are an **authoring concern** (the skill-author commits them at authoring
time), not run by the end user.

The concrete build recipe (one-file build command, entrypoint, where the
committed artifact lives) is now folded into the per-language reference files
(`support-scripts-python.md` and `support-scripts-js-ts.md`) — each carries the
verified bundle template + the verified 17-slot stack table for its language.

> **Verification note:** the `bundle-script-template` prototype smoke-tested
> all 17 default-stack library picks at the floor runtimes (Python 3.10 / Node
> 20 LTS) — every pick passed on the bare floor runtime (no venv / no
> `node_modules`), confirming the self-contained contract holds. No slot
> needs re-picking. See `docs/tasks/bundle-script-template/findings.md` for
> the full results.

## By-hand fallback — a considered, safety-first choice, NOT a default

The by-hand fallback is **not** a default that every script carries. The
skill-author must weigh two questions:

1. **Can the agent even do it by hand?**
2. **Is the by-hand path safe?**

For ops that are **dangerous, irreversible, or non-obvious** — e.g. an API
mutation such as a Forgejo operation, destructive ops, side-effect-heavy calls
— a by-hand fallback the agent tries to replicate is **worse than none**. The
agent may find outdated or poor API docs and fumble a dangerous op "by any
means necessary." In those cases **omit the by-hand fallback**; the skill
should **stop and require the script** (or a human) rather than hand the agent
a recipe to execute badly.

Provide a by-hand fallback only when the path is **safe, deterministic, and
within the agent's reliable capability.**

This safety stance is taught in `skill-creator`'s own `SKILL.md` body (the
"Choose a script language" rule) so the author encounters it at decision time.
The detail lives here (single-source); the per-language files point back to it
and do not restate it.

## Shape

Every produced-skill script should be:

- **Clear inputs** — arguments or stdin, documented; the agent (or user)
  knows what to pass.
- **A single output** — one result, not a side-effect-laden multi-step cascade
  unless that is the explicit purpose.
- **Helpful errors** — not a bare traceback/stack. Catch failures and print
  what went wrong and what to do. The agent reading the error should be able
  to diagnose and fix, or know to ask the user.
- **Runnable AND readable** — the script runs, but an agent that needs to
  patch it can read and understand it. When bundling, keep the readable source
  alongside the committed artifact (per the per-language file).

## Testing

Test the script on a **worked example with a known answer.** The one
non-obvious bit: run that test against the **committed bundled artifact** (the
`.pyz`/`.mjs` the end user actually runs), not only the source. For
stdlib-only scripts the source *is* the artifact, but when bundling, testing
only the source doesn't prove the self-contained artifact works.

If the skill lives in a project with a test runner (pytest / vitest / etc.),
use it. Otherwise run the script directly on a known input and assert the
output. Don't force a test framework onto a skill that has none.

## Runtime floor + min-version contract

**Python floor: 3.10. Node floor: Node 20 LTS.** Every produced helper script
declares its minimum supported runtime and, if run on an older one, **errors
with a useful message** telling the user to install at least that version —
**with a remark that, if an agent reads that error, it must consult the user
before installing anything** (never silently install an interpreter).

Pin library majors that satisfy the floor. The floor is a *minimum-
compatibility target*, not a recommendation — a produced skill must still run
on the lowest version real users have. Prefer the current LTS where you
control the runtime, but don't raise the declared floor (that breaks skills
for users who haven't upgraded).

## Default-stack library picks

When a produced-skill script needs a library, use the verified default-stack
picks below (one per slot, per language). These were chosen against hard
gates: bundles into one self-contained file (pure-Python / pure-JS, no
C/Rust extensions or native modules); no required external binaries; cross-
platform where the script must run; permissive license (MIT/Apache-2.0/BSD/
ISC) by default; actively maintained. The `bundle-script-template` prototype
smoke-tested all 17 at the floor — they pass.

Bash stays **coreutils-only / discouraged** — no library picks for Bash.

| # | Slot | Python | JS/TS |
|---|------|--------|-------|
| 1 | CLI parsing | `click` | `commander` 14.x |
| 2 | HTTP requests | `httpx` | built-in `fetch` / `node:undici` (❌ axios — supply-chain backdoor) |
| 3 | config/env/secrets | `PyYAML` + stdlib `json`/`os` | `yaml` (eemeli) |
| 4 | formatting (LLM-facing) | *(plain text — no entry)* | *(plain text — no entry)* |
| 5 | validation/schemas | `marshmallow` | `zod` |
| 6 | FS traversal/globbing | *(stdlib `pathlib`/`glob`)* | `tinyglobby` |
| 7 | process/subprocess | *(stdlib `subprocess`)* | `tinyexec` |
| 8 | OpenAPI client (codegen) | `datamodel-code-generator` (gen dataclasses/TypedDict = 0 runtime deps) | `@hey-api/openapi-ts` (gen fetch-based client = 0 runtime deps) |
| 9 | local interactive web UI | `bottle` + vendored htmx | `hono` + vendored htmx |
| 10 | local REST API server | `bottle` (JSON endpoints) | `hono` (JSON endpoints) |
| 11 | retry/backoff | `tenacity` | `async-retry` |
| 12 | output templating | `jinja2` | `eta` |
| 13a | markdown render | `mistune` | `marked` |
| 13b | HTML parse | `beautifulsoup4` (stdlib `html.parser` backend) | `cheerio` |
| 14 | diffing/patching text | *(stdlib `difflib`)* | `diff-match-patch` |
| 15 | date/time | *(stdlib `datetime`)* | `date-fns` |
| 16 | tabular (CSV/TSV) | *(stdlib `csv`)* | `papaparse` |
| 17 | git operations | `dulwich` (pure-Py fallback; no git binary) | `isomorphic-git` (no git binary) |

**Selection standards (the gates every pick passed):**

1. Bundles into one self-contained file (pure-Python / pure JS, no
   C/Rust extensions or native modules that break the bundler).
2. No required external binaries / no native runtime.
3. Cross-platform where the script must run (no Windows-fragile defaults).
4. License — permissive (MIT/Apache-2.0/BSD/ISC) by default; copyleft
   (GPL/AGPL) allowed only conditionally: when the copyleft candidate is
   outstandingly better AND the target repo is license-compatible.
5. Actively maintained, not abandoned.

**Selection note for row 5 (validation/schemas):** `marshmallow` and `zod` are
chosen over `pydantic` and `jsonschema` because both pull a compiled Rust core
that fails the self-contained-bundle gate. Use `pydantic`/`jsonschema` only
when the target repo already ships them (not bundling).

**Selection note for row 2 (HTTP):** ❌ `axios` — supply-chain backdoor
(UNC1069, Mar 2026). Do not use it.
