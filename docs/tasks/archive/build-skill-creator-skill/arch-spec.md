# Architecture spec — `build-skill-creator-skill`

> Shared across all slice chains. The user approved this before Step 2.
> Task: `docs/tasks/build-skill-creator-skill/task.md`. Map:
> `portable-skill-authoring`.

## Ground facts (verified before drafting)

- **Manifest is already at 16 skills** (`wait-what` was added after the task doc
  was written). Adding `skill-creator` → **17**. The task doc says "15 → 16"
  and "length 16" in several places; those are **stale** — target **17**
  everywhere (`pi.skills.length === 17`, the length assertion `toBe(17)`, and
  `SKILL_FILES` gains the new row). Carry this correction into every slice;
  do not "fix" the task doc's prose, just implement to 17.
- Current Agent Skills spec (agentskills.io/specification, rechecked live):
  - `name` ≤64, lowercase a-z/0-9 + hyphens, no leading/trailing/consecutive
    hyphens, **must match parent dir**.
  - `description` ≤1024, non-empty.
  - Optional: `license`, `compatibility` (≤500), `metadata` (string→string),
    `allowed-tools` (space-separated, experimental). **No other fields are
    spec-valid.**
  - Body <5000 tokens / <500 lines; references one level deep; progressive
    disclosure (metadata ~100t → body → resources as needed).
  - Validator: `skills-ref` (github.com/agentskills/agentskills).
- Repo precedent for a skill with companion reference files: `skills/tdd/`
  ships `mocking.md` + `tests.md` alongside `SKILL.md` — mirror that shape.
- Repo precedent for a bundled single-`.mjs` skill: `scripts/build.ts` (Vite
  lib-mode) emits `skills/grilling-with-ui/grilling-cli.mjs`. `skill-creator`'s
  own helpers are *not* bundled (they're dependency-light `.mjs` run directly).
- Test runner: `npm test` = `vitest run`. `tests/skills.test.ts` parses
  frontmatter with a minimal regex (`parseFrontmatter`) — **not** a real YAML
  parser; it splits on the first `:` per line. Multi-line or `|`/`>` block
  scalars aren't handled. `skill-creator`'s frontmatter is single-line
  `name:` + `description:` so this is fine; don't introduce block scalars.
- Git: on `main`, no task branch yet. Workers create `task/build-skill-creator-skill`
  (the land-worker merges slice branches into it).

## Slice map (6 slices, strict sequential levels)

| # | Slice | Size | Exports / interface contract |
|---|---|---|---|
| 1 | scaffold-and-register | s | `skills/skill-creator/SKILL.md` (skeleton body + spec-pure frontmatter), empty `scripts/`+`references/` dirs, trigger-test seeds in the slice doc. `package.json` `pi.skills` → 17 (adds `./skills/skill-creator`); `tests/skills.test.ts` `SKILL_FILES` + the length assertion → 17. |
| 2 | support-scripts-node | m | `scripts/{validate_skill,scaffold_skill,discover_skill}.mjs` (Node, stdlib-only or the already-dep `yaml`; by-hand fallback in each header). `tests/skill-creator-scripts.test.ts` (vitest). `SKILL.md` gains a "Helper scripts" section. **`validate_skill` must accept `compatibility` (the bug-fix) and reject `disable-model-invocation`.** Dogfood: `validate_skill.mjs skills/skill-creator` PASSes. |
| 3 | core-skill-body | l | `SKILL.md` body replaced with the full synthesized core: capability-ceiling + 4 conditional rules, 8-phase workflow, frontmatter guidance, core principles, "choose a script language" rule (points to the slice-5 references), references index (one level deep, when-to-read notes). ≤500 lines / ≲5000 tokens. **Depends on slice 2's "Helper scripts" section being present.** |
| 4 | references-portable-and-pi | m | `references/agent-skills-spec.md` (the portable format, single-sourced from the live spec) + `references/target-pi.md` (Pi target: `skills/<name>/` + `package.json` + `tests` registration, repo gate, companion-doc precedent, Pi-only frontmatter as explicit harness extension). Both linked from slice 3's index. |
| 5 | references-support-scripts | m | `references/support-scripts.md` (shared backbone) + `support-scripts-{python,js-ts,bash}.md` (per-language), seeded from the `support-script-conventions` grilling decisions (Q1–Q7). **Policy-level bundling + a pointer to the concrete template** (the `bundle-script-template` prototype's findings, already done, fold the concrete template in via the *separate* `fold-bundle-templates-into-refs` task — NOT this slice). `SKILL.md`'s "choose a script language" rule resolves to these files. |
| 6 | self-review-and-finalize | s | Trigger test (slice-1 seeds executed against the final description), execution dry-run, context + generalization review, `validate_skill` dogfood, `skills-ref` (or manual checklist), remove placeholders, `npm test` green, summary. |

## Per-slice spec

### Slice 1 — scaffold-and-register

- **Exports:** `skills/skill-creator/SKILL.md` (frontmatter `{name:
  skill-creator, description: <≤1024>}` only; body = 8-phase skeleton + capability-
  ceiling stub). Empty `scripts/` + `references/` dirs (no placeholder files).
  Trigger-test seeds (≥3 should-trigger + ≥2 near-miss) recorded in the slice
  doc.
- **Existing abstractions to use:** `tests/skills.test.ts` `SKILL_FILES` array +
  `pi.skills.length` assertion (mirror the `build-tdd-reference-skill` precedent
  for registration + length bump); `package.json` `pi.skills` list; the `tdd`
  skill's frontmatter (`name` + `description`, no Pi-only fields) as the spec-pure
  shape to copy.
- **Do NOT reimplement:** no validator, no scaffold script, no body content
  beyond the skeleton — those are slices 2–3.
- **Seams:** `npm test` (the structure tests + manifest assertions); the
  frontmatter parses to exactly `{name, description}`.
- **Interface contract for slice 2+:** the `SKILL.md` file exists at
  `skills/skill-creator/SKILL.md` with a "Helper scripts" section *placeholder*
  (slice 2 fills it) and a references-index *placeholder* (slice 3 fills it).
  The folder + empty `scripts/`/`references/` dirs exist for slices 2–5 to
  populate.

### Slice 2 — support-scripts-node

- **Exports:** three `.mjs` scripts in `skills/skill-creator/scripts/`:
  - `validate_skill.mjs` — `node validate_skill.mjs <skill-dir>`; exit 0 + "OK"
    on pass, exit 1 + first-error message on fail. Allowed frontmatter keys =
    `{name, description, license, compatibility, allowed-tools, metadata}` —
    **`compatibility` is allowed (the sentient-agi bug fix)**. Checks: SKILL.md
    exists; `---`…`---`; `name` present, matches the regex `^[a-z0-9]+(-[a-z0-9]+)*$`,
    ≤64, no leading/trailing/consecutive hyphens, **equals the folder name**;
    `description` present, ≤1024, no angle brackets; no unknown keys.
  - `scaffold_skill.mjs` — `node scaffold_skill.mjs <name> [--path <dir>]
    [--resources scripts,references,assets]`; normalizes the name, creates the
    folder + `SKILL.md` template (`name` + a TODO `description`), refuses to
    overwrite an existing skill.
  - `discover_skill.mjs` — `node discover_skill.mjs "<intent>" --skills-dir <dir>
    [--threshold 0.4] [--json]`; scans immediate subdirs for `SKILL.md`, parses
    `name`+`description`, ranks by name similarity + token-overlap (overlap
    coefficient on the smaller set), prints candidates ≥ threshold with an
    "UPDATE over create" hint.
  - Each script's header comment states a by-hand fallback.
- **Existing abstractions to use:** Node stdlib (`node:fs`, `node:path`,
  `node:process`); the repo already depends on `yaml` (^2.6.1) — **using it for
  robust frontmatter parsing in `validate_skill` is acceptable and preferred
  over a hand-rolled YAML parser** (the hand-rolled one mis-handles quoted
  colons / block scalars). Keep the runtime dep surface to stdlib + `yaml`.
  Mirror sentient-agi's `meta-skill-creator` `scripts/{validate,scaffold,discover}_
  skill.py` UX (fetch from github.com/sentient-agi/skills or the agent's cache).
- **Do NOT reimplement:** don't write a full YAML parser by hand; use `yaml`.
  Don't add a 4th script. Don't touch the references (slices 4–5) or the full
  body (slice 3) beyond the "Helper scripts" section.
- **Seams:** the script CLIs (stdout/exit code) via
  `tests/skill-creator-scripts.test.ts` (vitest, `spawnSync`); the dogfood run
  `validate_skill.mjs skills/skill-creator` (PASS).
- **Interface contract for slice 3:** `SKILL.md` has a "Helper scripts"
  section naming the three scripts + when to run each + by-hand fallbacks;
  slice 3's body references them (discover before create; validate before
  finish; scaffold for new skills).
- **Bug-fix assertion (must-have test):** `validate_skill` **accepts** a skill
  with `compatibility:` in frontmatter and **rejects** one with
  `disable-model-invocation:`.

### Slice 3 — core-skill-body

- **Exports:** the full `SKILL.md` body (replacing the slice-1 skeleton). Must
  contain: capability-ceiling default + the 4 conditional rules
  (filesystem / bash-exec / network-MCP / harness-extensions) + the "Portable
  vs harness-specific extension" distinction; the 8-phase workflow; produced-
  skill frontmatter guidance (`name`+`description` rules + the 4 optional
  fields with a justification each + "keep the portable core free of harness-
  specific fields"); core principles; the "choose a script language" rule
  pointing to `references/support-scripts.md` + the per-language files; a
  references index (one level deep, when-to-read notes). ≤500 lines / ≲5000
  tokens.
- **Existing abstractions to use:** the live Agent Skills spec (slice 4
  digests it; this slice links it); the agentskills.io best-practices /
  optimizing-descriptions guidance (fetch live); the DeepAgents + sentient-agi
  `skill-creator`s as synthesis sources (fetch live); the
  `support-script-conventions` grilling decisions (Q1–Q7) for the script rule.
- **Do NOT reimplement:** don't paraphrase the spec into the body — link
  `references/agent-skills-spec.md` (slice 4). Don't list Pi specifics inline —
  link `references/target-pi.md` (slice 4). Don't duplicate the support-script
  policy — link `references/support-scripts.md` (slice 5). Don't write the
  references themselves.
- **Seams:** the `SKILL.md` text (no executable behavior); `validate_skill
  skills/skill-creator` still PASSes (frontmatter unchanged); `npm test` green.
- **Interface contract for slices 4–5:** the references index names exactly
  `references/agent-skills-spec.md`, `references/target-pi.md`,
  `references/support-scripts.md`, `references/support-scripts-python.md`,
  `references/support-scripts-js-ts.md`, `references/support-scripts-bash.md`
  (and optionally `references/trigger-design.md` only if trigger detail
  outgrows the body — default: keep it in the body). Slices 4–5 create those
  files to match.

### Slice 4 — references-portable-and-pi

- **Exports:** `references/agent-skills-spec.md` (the portable format digest,
  single-sourced from the live spec — directory structure, frontmatter rules
  with the 64/1024/500 limits, body guidance, progressive disclosure, file
  refs one level deep, validation via `skills-ref`) + `references/target-pi.md`
  (Pi-package target: `skills/<name>/` + `package.json` `pi.skills` registration
  + `tests/skills.test.ts` coverage, the repo gate, companion-doc precedent
  from `tdd`, Pi-only frontmatter `disable-model-invocation` +
  `metadata.telemetry.capture` as **explicit opt-in harness extensions, not the
  portable core**, a worked mini-example).
- **Existing abstractions to use:** the live spec (recheck before finalizing);
  the `tdd` skill as the companion-reference precedent; `tests/skills.test.ts`
  + `package.json` patterns for the Pi-registration example.
- **Do NOT reimplement:** don't restate the spec in `SKILL.md` or in
  `target-pi.md`; each fact has one home.
- **Seams:** the reference file text; `validate_skill skills/skill-creator`
  still PASSes (references don't change frontmatter); `npm test` green.
- **Interface contract for slice 5:** the `references/` dir exists with these
  two files; slice 5 adds the four support-script files alongside.

### Slice 5 — references-support-scripts

- **Exports:** `references/support-scripts.md` (shared backbone: when-to-ship,
  language choice incl. Bash-discouraged/Windows, self-contained-at-runtime
  dependency+build policy, safety-first by-hand-fallback decision, shape,
  testing) + `support-scripts-python.md`, `-js-ts.md`, `-bash.md` (per-language
  specifics only; the shared policy is stated once in the shared file).
- **Existing abstractions to use:** the `support-script-conventions` grilling
  task's settled decisions (Q1–Q7) as the **source content** — read
  `docs/tasks/support-script-conventions/task.md` "Decisions reached" first.
  The `bundle-script-template` findings (`docs/tasks/bundle-script-template/
  findings.md`) confirm all 17 picks pass at the floor — cite it as the
  verification note, but **do NOT fold the concrete bundle template here**
  (that's the separate `fold-bundle-templates-into-refs` task, blocked on this
  one). This slice ships policy-level bundling + a pointer to the prototype's
  findings for the concrete template.
- **Do NOT reimplement:** don't duplicate the shared policy in the per-language
  files. Don't invent library picks — use the Q7 table verbatim. Don't fold the
  concrete build commands (that's the follow-up task).
- **Seams:** the reference file text; `validate_skill skills/skill-creator`
  still PASSes; `npm test` green; the `SKILL.md` "choose a script language"
  rule (slice 3) resolves to the shared file first.
- **Interface contract for slice 6:** all referenced files exist; the
  references index is fully resolvable; slice 6's self-review dry-run can
  reach every reference.

### Slice 6 — self-review-and-finalize

- **Exports:** the trigger test executed (slice-1 seeds vs the final
  `description`, revisions applied + re-checked against the 1024 limit); the
  execution dry-run of "create a skill for reviewing Go API changes" +
  "improve this SKILL.md" + "make this Claude-oriented skill portable" with
  stalls fixed; context review (cut sections a capable agent doesn't need);
  generalization review; `validate_skill skills/skill-creator` PASS
  (dogfood); `skills-ref` run or the manual checklist recorded; no
  placeholder/TODO/auxiliary-doc files remain; `npm test` green (length 17);
  a summary in the slice result (not in the skill).
- **Existing abstractions to use:** `validate_skill.mjs` (slice 2); the
  trigger-test seeds (slice 1); the references index (slice 3).
- **Do NOT reimplement:** this slice reviews/finalizes; it does not redesign.
  If a review exposes a real design gap, stop and return to Wayfinder (write
  `docs/tasks/build-skill-creator-skill/.work/uncertainty.md`).
- **Seams:** `npm test`; `validate_skill.mjs skills/skill-creator`; the
  description text; the references index resolvability.

## Cross-cutting rules for every slice

- **Manifest number is 17, not 16.** The task doc's "15 → 16" / "length 16" is
  stale (`wait-what` was added). `pi.skills.length === 17`; the assertion is
  `toBe(17)`; `SKILL_FILES` has the new row. Do not edit the task doc prose.
- **Spec-pure frontmatter on `skill-creator` itself:** only `name` +
  `description`. No `disable-model-invocation` (it's Pi-only, fails external
  validators, and a skill-creator should auto-trigger). No `license`,
  `compatibility`, `metadata`, `allowed-tools` on `skill-creator` itself.
- **No auxiliary docs in `skills/skill-creator/`:** no `README`, `CHANGELOG`,
  install guide, dev diary. By-hand fallbacks live in script header comments +
  `SKILL.md`, not separate docs.
- **Single-source:** each fact has one home. `SKILL.md` links the references;
  it doesn't paraphrase them.
- **Capability-conditional, not brand-conditional.** Brands (Claude, ChatGPT)
  are examples only; rules key on target-agent capabilities.
- **`npm test` must stay green** after every slice. The new
  `tests/skill-creator-scripts.test.ts` (slice 2) joins the suite.
- **Branch hygiene:** each slice runs on its own slice branch off
  `task/build-skill-creator-skill`; the land-worker merges into the task
  branch and archives the slice doc. The parent never implements; it
  dispatches + reads results.

## Slice-arch notes (appended to each tdd-worker prompt)

Each slice chain gets its own `### Slice N — <slug> notes` block lifted from
this spec's per-slice section, so the tdd-worker sees its interface contract +
abstractions + do-NOT-reimplement + seams without re-reading the whole spec.
