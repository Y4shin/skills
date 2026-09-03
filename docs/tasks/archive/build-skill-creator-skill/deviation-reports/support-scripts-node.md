## Deviation report — support-scripts-node

### API surface changes
- **Planned:** three `.mjs` scripts (`validate_skill.mjs`, `scaffold_skill.mjs`,
  `discover_skill.mjs`) with the CLIs specified in the arch spec; `validate_skill`
  accepts a `<skill-dir>` path; `scaffold_skill` accepts `<name> [--path <dir>]
  [--resources ...]`; `discover_skill` accepts `"<intent>" --skills-dir <dir>
  [--threshold 0.4] [--json]`. `SKILL.md` gains a "Helper scripts" section.
- **Actual:** all three scripts match their planned CLI surface exactly. The
  `validate_skill` directory-path interface is spec-compliant (the arch spec
  says `node validate_skill.mjs <skill-dir>`, and the implementation does
  `resolve(skillDir)` + `basename` for the folder-name check). No API surface
  deviations.
- **Impact:** none on dependent slices. Slice 3's body can reference the three
  scripts by their exact CLI shapes.

### Abstraction usage
- Used `yaml` (^2.6.1, already a repo dependency) for frontmatter parsing in
  `validate_skill.mjs` and `discover_skill.mjs` — **as specified** (the arch spec
  says "using it for robust frontmatter parsing in `validate_skill` is
  acceptable and preferred over a hand-rolled YAML parser"). No hand-rolled
  YAML parser was written. ✓
- Node stdlib (`node:fs`, `node:path`, `node:process`, `node:child_process` in
  tests) — as specified. ✓
- No 4th script was added. ✓
- No third-party runtime deps beyond `yaml` (already shipped). ✓

### Out-of-scope changes
- **`skills/wait-what/SKILL.md`** — committed on this slice branch by the parent
  orchestrator (not the tdd-worker) to fix the base-state mismatch flagged in
  the slice-1 land-worker report (`wait-what` was registered in the manifest
  but the file was never committed to git). This is a parent-side fix, not a
  tdd-worker scope addition. It is additive (a new file, no modifications to
  existing code) and does not affect any slice-2 acceptance criterion.
- **`.gitignore`** — shows in the diff as modified (3 lines removed) because the
  slice branch was cut from a base that had a different `.gitignore` state than
  the task branch (the parent added `prototype-bundle/` to `.gitignore` on the
  task branch after the slice branched). Not a tdd-worker change.

### Bug-fix assertion (must-have)
- **`validate_skill` accepts `compatibility`:** ✓ — confirmed by both the test
  suite (`accepts a skill with compatibility field (the bug-fix assertion)`) and
  a manual run (`OK`, exit 0). The allowed-keys set is `{name, description,
  license, compatibility, allowed-tools, metadata}` — `compatibility` is present.
- **`validate_skill` rejects `disable-model-invocation`:** ✓ — confirmed by both
  the test suite (`rejects unknown frontmatter key (disable-model-invocation)`)
  and a manual run (`Error: unknown frontmatter key "disable-model-invocation"`,
  exit 1).
- Both bug-fix assertions are tested and pass.

### Slice doc acceptance criteria — compliance summary

| Criterion | Status | Evidence |
|---|---|---|
| Three `.mjs` files exist, zero third-party runtime deps beyond `yaml` | ✓ | `validate_skill.mjs`, `scaffold_skill.mjs`, `discover_skill.mjs` exist; only `yaml` (already a dep) is imported |
| `validate_skill` PASSes on `skills/skill-creator` | ✓ | dogfood test + manual run: `OK`, exit 0 |
| `validate_skill` PASSes on `skills/tdd` | ✓ | dogfood test + manual run: `OK`, exit 0 |
| `validate_skill` FAILs on each bad temp skill | ✓ | 10 rejection tests (bad name, missing desc, desc >1024, unknown key, trailing hyphen, name ≠ folder, angle brackets, consecutive hyphens, name >64, missing SKILL.md) |
| `validate_skill` accepts `compatibility` | ✓ | bug-fix test + manual run |
| `validate_skill` rejects `disable-model-invocation` | ✓ | bug-fix test + manual run |
| `scaffold_skill` creates + refuses overwrite | ✓ | 3 tests (create, refuse overwrite, normalize spaces) |
| `discover_skill` ranks known above irrelevant | ✓ | 2 tests (ranking + --json) |
| `tests/skill-creator-scripts.test.ts` passes | ✓ | 22/22 tests pass |
| `npm test` green | ✓ | 602/602 (bundler.test.ts flaked on first run — known pre-existing race per the archived grilling handoff; green on re-run) |
| By-hand fallback in each script header | ✓ | All three scripts have a `// By-hand fallback:` comment block |
| "Helper scripts" section in `SKILL.md` | ✓ | Present with when-to-run + by-hand fallback for each script |

### Additional tests beyond spec (not deviations, just thoroughness)
- `validate_skill`: description-exactly-1024 boundary test, name-≠-folder test,
  angle-brackets test, consecutive-hyphens test, name->64 test, missing-SKILL.md
  test, colon-in-description test (robust YAML parse), all-allowed-keys test.
  These are beyond the minimum slice-doc test list but are valid edge-case
  coverage for the same acceptance criteria.
- `discover_skill`: `--json` output test (in-spec but not explicitly listed).
- `scaffold_skill`: name-normalization (spaces→hyphens) test.

### Test note: one test name mismatch (cosmetic)
- The test `"rejects description containing a colon (robust YAML parse)"` actually
  **accepts** (exit 0) a description with a colon — the test name says "rejects"
  but the assertion is `expect(result.status).toBe(0)`. The behavior is correct
  (a colon in a quoted description should be accepted, not rejected — the
  failure mode the slice doc warned about is a parser *mishandling* it); only the
  test name is misleading. Not a deviation; a cosmetic test-naming issue.

### Task doc update needed?
No. The task doc's `## Implementation notes` section should be appended by the
land-worker (standard landing step). No arch-spec or slice-doc corrections are
needed — the implementation matches both.

### User attention needed?
No. No scope changes, no API surface deviations, no design gaps. The only
non-slice commit (`wait-what`) is a parent-side fix already documented in the
slice-1 implementation notes. The `bundler.test.ts` flake is the known
pre-existing race, not a regression.
