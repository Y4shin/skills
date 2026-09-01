---
kind: task
type: prototype
slug: bundle-script-template
title: Pick a bundle-self-contained-helper-script template (Python zipapp + JS/TS bundler)
map: portable-skill-authoring
status: ready
blocked_by:
- support-script-conventions
---

## Design / behavior question

What is the optimum, reusable **"bundle a produced skill's helper script with
its dependencies into one committed, self-contained, runnable file"** template
— for **Python** and for **JS/TS** — given the grilling's self-contained-at-
runtime policy (Q1) and the JS/TS bundling/source-keeping policy (Q3)?

The grilling (Q3) deliberately deferred the **specific bundler + build setup +
artifact shape** to this prototype. The optimum path per language becomes a
**template** that a follow-up task folds into
`skills/skill-creator/references/support-scripts-python.md` and
`references/support-scripts-js-ts.md`.

## Alternatives worth comparing

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

## Smallest artifact that can answer it

A **throwaway** repo (e.g. under `/tmp` or a scratch branch) with one trivial
helper per language (e.g. a small CLI that reads a JSON arg and emits a
derived value, using one third-party lib — e.g. a date/parser lib — so the
bundle is non-trivial). For each language, build the self-contained artifact
with ≥2 candidate approaches, actually run the committed artifact to confirm
it's dependency-free at runtime, and record the build command, the committed
artifact, and the authoring ergonomics. Performance need not be benchmarked —
**research** the candidates' perf reputation; focus on **ergonomics** (how
much config/build friction), **reliability** (does the artifact run on a bare
runtime), **readability** (can an agent read/patch the source + understand the
artifact), and **footprint** (artifact size / committed-tree bloat).

## Who must react to the result

The user picks the optimum path per language from the prototype's comparison
(the grilling's Q3 created this prototype precisely to defer that pick to a
reactable artifact rather than a guess).

## Decision or implementation tasks it should unblock

- A follow-up **feature** task (raised by this prototype via Wayfinder when it
  picks an optimum path — **not** pre-created) that folds the per-language
  **template** (build command + artifact shape + where the committed artifact
  lives + the keep-readable-source note) into
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
