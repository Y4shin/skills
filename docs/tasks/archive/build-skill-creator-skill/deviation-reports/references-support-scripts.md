## Deviation report — references-support-scripts

### API surface changes
- **Planned:** four reference files in `skills/skill-creator/references/`:
  `support-scripts.md` (shared backbone), `support-scripts-python.md`,
  `support-scripts-js-ts.md`, `support-scripts-bash.md` (per-language specifics).
  Named exactly as the slice-3 references index expects.
- **Actual:** all four files created with the exact names the index expects.
  No other files changed (0 modifications to `SKILL.md`, frontmatter, tests, or
  any source). Diff: `543 insertions(+), 4 files` — pure additions.
- **Impact:** none on dependent slices. Slice 6 can resolve every reference in
  the index. The `fold-bundle-templates-into-refs` follow-up (blocked on this
  task) will edit `support-scripts-python.md` and `-js-ts.md` to fold the concrete
  bundle templates — the policy-level pointers it will replace are already in
  place.

### Abstraction usage
- **Q1–Q7 carried faithfully?** Yes. Verified row-by-row:
  - **Q1 (shared backbone + structure):** shared file states the cross-cutting
    policy once; per-language files point back and carry only specifics. ✅
  - **Q1 refinements:** Bash-discouraged/Windows, self-contained+build (stdlib
    OR bundled-committed-artifact), by-hand-fallback safety (NOT a default,
    Forgejo example, stop-and-require), shape, testing — all present in the
    shared file. ✅
  - **Q2 (Bash specifics):** `#!/usr/bin/env bash` + `set -euo pipefail` default;
    POSIX `#!/bin/sh` fallback with the `pipefail`-not-POSIX caveat; Windows
    discouragement up top; POSIX-vs-GNU coreutils portability; quoting pitfalls;
    coreutils-only + "prefer Python for JSON/structured data" boundary. ✅
  - **Q3 (JS/TS specifics):** bundling endorsed; keep readable source; `.ts`
    only with committed runnable artifact; bundler heuristic (existing-bundler-
    else-esbuild); specific build setup deferred to the prototype findings. ✅
  - **Q4 (testing):** worked example + known answer; test the committed
    artifact not only the source; use the project's runner if present. ✅
  - **Q5 (selection standards):** the five hard gates are in the shared file's
    "Selection standards" section. ✅
  - **Q-version-floor (3.10 / Node 20):** present in the shared file's "Runtime
    floor + min-version contract" section + each per-language file's min-version
    contract with the agent-must-consult-user remark. ✅
  - **Q7 (default-stack table):** the 17-slot table is in the shared file,
    verbatim from the grilling (same picks, same cells, same stdlib/zero-dep
    "no entry" notation). ✅
- **Q7 table verbatim?** Yes — every row matches the grilling's Q7 table. Row
  2 carries the ❌ axios supply-chain backdoor note. Row 5 carries the
  marshmallow/zod-over-pydantic/jsonschema selection note. Row 8 carries the
  "gen dataclasses/TypedDict = 0 runtime deps" / "gen fetch-based client = 0
  runtime deps" notes. ✅
- **`bundle-script-template` findings cited as verification?** Yes — the shared
  file has a "Verification note" blockquote citing the findings doc and
  confirming all 17 picks pass at the floor. ✅
- **Concrete bundle templates NOT folded?** Confirmed — no concrete `python -m
  zipapp` commands, no esbuild/vite/rollup build commands, no `createRequire`
  banner snippets. Only policy-level pointers to
  `docs/tasks/bundle-script-template/findings.md` + the
  `fold-bundle-templates-into-refs` follow-up task name. ✅

### Out-of-scope changes
- **No scope widening.** Only the four reference files were created. No changes
  to `SKILL.md` (slice 3 already wired the cross-refs), no frontmatter changes,
  no test changes, no source code changes.
- **One benign in-scope addition:** the shared file includes a "Runtime floor +
  min-version contract" section and the full Q7 default-stack table — these are
  not explicitly listed in the slice doc's deliverables for the shared file
  (which lists: when-to-ship, language choice, self-contained+build, by-hand-
  fallback safety, shape, testing) but ARE Q1–Q7 settled decisions, and the
  arch spec says "source content = Q1–Q7" and "cite the findings as verification
  note." Including them is faithful to the arch spec's broader directive. Not a
  deviation.
- **`esbuild` named as the lean default in the JS/TS file:** the grilling Q3
  says "until the prototype lands, the reference names no bundler" — but the
  prototype HAS landed (it's done) and picked esbuild as the lean default. The
  JS/TS file names `esbuild` at the policy level (one sentence: "If none,
  `esbuild` is the lean default") with a pointer to the findings for the concrete
  build setup. This is consistent: the "until it lands" restriction no longer
  applies, and naming the chosen default (without folding the concrete build
  commands) is correct. The `fold-bundle-templates-into-refs` task owns the
  concrete build commands, not the naming.

### Acceptance criteria check (all pass)

| Criterion | Status | Evidence |
|---|---|---|
| All four files exist, non-empty; shared opens with cross-cutting policy stated once | ✅ | 186/128/114/115 lines; shared file has when-to-ship, language choice, self-contained+build, by-hand safety, shape, testing each in its own section |
| No per-language file restates cross-cutting policy; each points back | ✅ | All three open with "read `support-scripts.md` first"; grep for policy-body keywords (when to ship, language choice, dangerous/irreversible) in per-language files returns only the header pointer line |
| Python has known-good-literal vs recomputed anti-pattern + `zipapp` path | ✅ | "Known-good-literal vs recomputed-value" section with code examples; "zipapp bundling" section with policy-level pointer to findings |
| JS/TS has Node-runtime portability trade-off + bundling endorsed + `.ts`-build-step | ✅ | "Portability trade-off" paragraph; "bundling is endorsed" section; "`.ts` only with a committed runnable artifact" section |
| Bash has Windows discouragement + `bash`+`set -euo pipefail` (or POSIX `sh`) + coreutils + "prefer Python for JSON" | ✅ | Discouragement blockquote up top; default shell section with `set -euo pipefail` + POSIX fallback; "Keep to stdlib coreutils only" section with jq/Python boundary |
| By-hand-fallback safety (Forgejo, stop-and-require) in shared file + concisely in SKILL.md, NOT duplicated in per-language | ✅ | Shared file has "By-hand fallback — a considered, safety-first choice, NOT a default" with Forgejo example; SKILL.md lines 259–265 carry it concisely; per-language files have "By-hand fallback" sections that only say "Per the shared safety decision — refer to it" |
| Faithful to Q1–Q7; none silently dropped or added | ✅ | See row-by-row verification above |
| All four linked one level deep from SKILL.md's references index (shared first) | ✅ | SKILL.md lines 334–349 index all four; shared file listed first |
| `validate_skill.mjs skills/skill-creator` still PASSes | ✅ | `OK` (exit 0) |
| `npm test` green | ✅ | 602/602 passed (31 test files) |

### Task doc update needed?
No. The task doc's `## Implementation notes` does not need updating for this
slice — it is spec-compliant with zero deviations.

### User attention needed?
No. No API surface changes, no scope widening, no deviations from the spec. The
one observation (esbuild named at the policy level) is consistent with the
prototype being done and the arch spec's "cite the findings" directive.
