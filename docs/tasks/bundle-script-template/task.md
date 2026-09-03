---
kind: task
type: prototype
slug: bundle-script-template
title: Pick a bundle template (Python zipapp + JS/TS bundler) AND smoke-test the 17-slot default stack
map: portable-skill-authoring
status: done
blocked_by:
- support-script-conventions
---

## Design / behavior question

Two questions, answered by one throwaway project:

1. **Bundle template** — what is the optimum, reusable **"bundle a produced
   skill's helper script with its dependencies into one committed, self-
   contained, runnable file"** template, for **Python** and for **JS/TS**?
   (Deferred from grilling Q3.)

2. **Stack smoke test** — do all 17 grilling-settled default-stack library
   picks actually **bundle cleanly into a self-contained artifact** and **run
   at the floor** (Python 3.10 / Node 20) for common skill-helper use cases?
   This catches gate-1/gate-2 surprises (compiled cores, native modules,
   engine floors) that the research *said* were clear but that only a real
   bundle + run confirms — before the picks are baked into the references.

The optimum bundle path per language + a pass/fail per library per use case
becomes the **template + verification report** that a follow-up task folds
into `skills/skill-creator/references/support-scripts-python.md` and
`references/support-scripts-js-ts.md`.

## Alternatives worth comparing (bundle template)

- **Python — `zipapp`:** `python -m zipapp src/ -m "cli:main" -o script.pyz`
  (a `.pyz` the end user runs with `python script.pyz`); deps vendored into the
  zip; vs a thin shim that imports a vendored dir; vs `shiv`/`pex` (heavier).
  Compare ergonomics (one-command build), artifact size, readability of the
  committed `.pyz` vs. keeping the readable source alongside it, and whether a
  `.pyz` is reliably runnable across python3 setups.
- **JS/TS — bundler:** `esbuild` (fast, minimal config, single-file) vs
  `rollup` (cleaner, more config) vs `vite` vs the project's existing bundler;
  output a single committed `.mjs`; keep the readable source
  (`script.ts`/`script.mjs`) for patching; `.ts` → committed `.mjs` (no
  end-user `tsc`). Compare config burden, artifact readability, and the
  "use the project's existing bundler if it has one" heuristic.

## Stack smoke test — what to verify

For **each** of the 17 grilling-settled picks (Python + JS/TS where
applicable), write a tiny representative use case into the throwaway project,
bundle it into the self-contained artifact, and **run the artifact on a bare
floor runtime** (Python 3.10 / Node 20 — no `node_modules`/`site-packages`
on the path) to confirm it works dependency-free. The picks to verify:

| # | Concern | Python pick | JS/TS pick |
|---|---------|-------------|------------|
| 1 | CLI parsing | `click` | `commander` 14.x |
| 2 | HTTP requests | `httpx` | built-in `fetch` / `node:undici` |
| 3 | config/env/secrets | `PyYAML` | `yaml` (eemeli) |
| 4 | formatting (opt-in) | `rich` | `picocolors` |
| 5 | validation/schemas | `marshmallow` | `zod` |
| 6 | FS traversal/globbing | stdlib `pathlib` | `tinyglobby` |
| 7 | process/subprocess | stdlib `subprocess` | `tinyexec` |
| 8 | OpenAPI client (codegen) | `datamodel-code-generator` (→ dataclasses) | `@hey-api/openapi-ts` (→ fetch client) |
| 9 | local interactive web UI | `bottle` + vendored htmx | `hono` + vendored htmx |
| 10 | local REST API server | `bottle` | `hono` |
| 11 | retry/backoff | `tenacity` | `async-retry` |
| 12 | output templating | `jinja2` | `eta` |
| 13a | markdown render | `mistune` | `marked` |
| 13b | HTML parse | `beautifulsoup4` + stdlib `html.parser` | `cheerio` |
| 14 | diffing/patching | stdlib `difflib` | `diff-match-patch` |
| 15 | date/time | stdlib `datetime` | `date-fns` (tree-shakeable) |
| 16 | tabular (CSV) | stdlib `csv` | `papaparse` |
| 17 | git operations | `dulwich` (pure-Py fallback) | `isomorphic-git` |

For each: confirm (a) it **bundles** into the zipapp/bundle artifact without
error (no compiled-core/native-module surprise), (b) the **artifact runs** on
the bare floor runtime, (c) the use case produces the expected output.
Record a **pass/fail per pick** + the failure mode if any (e.g. "dulwich .so
stripped → pure-Py fallback works", "cheerio pulls undici 7.x → verify engine",
"date-fns tree-shakes to X KB"). **Stdlib slots** (6, 7, 14, 15-Py, 16-Py)
trivially pass — still run them to confirm the bundle doesn't break stdlib
imports.

## Smallest artifact that can answer it

A **throwaway** repo (e.g. under `/tmp` or a scratch branch) with:

- **Bundle-template test:** one trivial helper per language (a small CLI that
  reads a JSON arg and emits a derived value, using one third-party lib so the
  bundle is non-trivial). Build the self-contained artifact with ≥2 candidate
  bundlers per language, actually run the committed artifact to confirm it's
  dependency-free at runtime, and record the build command, the committed
  artifact, and the authoring ergonomics. Performance need not be benchmarked —
  **research** the candidates' perf reputation; focus on **ergonomics**
  (config/build friction), **reliability** (does the artifact run on a bare
  runtime), **readability** (can an agent read/patch the source + understand the
  artifact), and **footprint** (artifact size / committed-tree bloat).

- **Stack smoke test:** one tiny use-case script per library pick (a few lines
  each — CLI flag parse, HTTP GET to a mock, YAML load, validate a dict, glob a
  dir, run a subprocess, render markdown, parse HTML, diff two strings, format
  a date, read CSV, init a git repo, serve a one-route Bottle/Hono app, render a
  Jinja2/eta template, retry a flaky call). Bundle each (or a combined "kitchen-
  sink" script using several) into the artifact and run on the bare floor. A
  representative sample suffices when a pick has many similar uses; the goal is
  "does it bundle + run at the floor", not exhaustive API coverage.

## Who must react to the result

The user picks the optimum bundle path per language from the prototype's
comparison (the grilling's Q3 created this prototype precisely to defer that
pick to a reactable artifact rather than a guess). The user also reviews the
**stack smoke-test pass/fail**: any FAIL triggers a re-pick for that slot
(raise with Wayfinder) before the picks are baked into the references.

## Decision or implementation tasks it should unblock

- A follow-up **feature** task (raised by this prototype via Wayfinder when it
  picks an optimum path — **not** pre-created) that folds the per-language
  **template** (build command + artifact shape + where the committed artifact
  lives + the keep-readable-source note) **and the verified stack** into
  `skills/skill-creator/references/support-scripts-python.md` and
  `references/support-scripts-js-ts.md`.
- That follow-up is independent of `build-skill-creator-skill`, which ships
  policy-level bundling + a pointer in slice 5 and is **not** blocked on this
  prototype or the follow-up.

## Constraints

- Keep the prototype throwaway; production wiring is a separate feature task.
- The user hands the prototype its specific restrictions at run time (e.g.
  "no internet at build? must support py3.9+? avoid bundlers over X MB?") —
  note them in the result so the pick is reproducible.
- Stay within the grilling's policy: end-user runtime must be self-contained
  (no end-user lib installs, no required external CLI tools); network calls
  are an acceptable dependency; keep a readable source for patching.
- The smoke test runs on the **floor** (Python 3.10, Node 20) — not the latest
  runtime — to catch the exact environment the produced skills target.
- If a library pick **fails** the smoke test (won't bundle or won't run at the
  floor), record the failure mode and **raise a Wayfinder follow-up** to re-pick
  that slot; do not silently keep a broken pick.
