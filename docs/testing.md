# Testing

## Framework

- [Vitest](https://vitest.dev/) (`vitest run`), test files under `tests/`.
- Type checking: `tsc --noEmit` (no emitted build; `type: module`).

## Run commands

| Command | Purpose |
|---|---|
| `npm test` | Run the full test suite |
| `npm run typecheck` | Type-check without emitting |
| `npx vitest run <file>` | Run a single test file |
| `devenv shell -- npm test` | Run the full suite in the reproducible devenv shell |

## Mock conventions

- _To be filled in as patterns emerge._
- **Extension factory tests (no pi runtime):** when testing an extension's
  `export default (pi) => …` factory, drive it with a **stub
  `ExtensionAPI`** that records `registerTool`/`on`/`getAllTools` calls, and
  stub the detection/config modules via `vi.mock`. This is cheaper and more
  isolating than the integration harness and works when the harness is
  broken. See `tests/gate-factory.test.ts` (the repo-gate factory tests) for
  the pattern, it asserts which tool names register and which `on(event)`
  handlers fire under different gate decisions._
- **Iteration-loop seams (function-as-dependency):** when a loop shells out
  to an external process and parses its output, inject the step as a
  `() => Promise<Result>` function so the loop logic (convergence, caps,
  escalation) is unit-testable with a mock, independent of the real
  subprocess. _(The former `scripts/eval/` harness that illustrated this was
  removed with the grilling-with-ui CLI it drove; the pattern stands.)_
- **Lossless round-trip modules (state.yaml):** when a module reads and
  rewrites a user-owned file it does not fully model, give it an explicit
  bag for the unmodeled keys (`WorkflowState.rest`) and test fidelity at the
  pure seam: `toObject(fromObject(original))` must `toEqual(original)` for an
  arbitrary object, not just for the fields the module knows. Cover the
  value types (numbers stay numbers, real nulls never become the string
  `"None"`), a sequence of two writes, and the legacy shape the module must
  preserve but no longer model. See `tests/state.test.ts` and the
  `tw_state` / `tw_state_set` blocks in `tests/plugin.test.ts`.
- **Dual-shape parsers (the v3 to v4 transition):** when one parser must read
  both an old and a new frontmatter shape, discriminate on the key that only
  the old shape has (`kind`), never on the key both share (`type`, which means
  different things in each). Test each shape separately plus a mixed tree, and
  assert the shape field so a misclassification fails loudly. See
  `tests/art.test.ts` (`fromFrontmatter v3 shape` / `v4 shape`).
- **Location-derived checks need a path-aware rule, and a v3 guard:**
  `findAnomalies` computes orphan and effort-scoping anomalies from paths, so
  its heuristics must be shape-aware. A filename that is type-neutral in v3
  (`task.md`) implies a type only under the v4 subtree; an anchor requirement
  (an effort needs a map or spec) applies to v4 only, since a v3 flat task
  directory is its own effort. Test both directions of every mismatch and
  assert the v3 shapes are NOT flagged, or the check becomes a false-positive
  pile on the live tree. Measure the real tree: `findAnomalies` over
  `docs/tasks` must stay at zero.
- **Test the PRODUCTION port, not only the test double.** When a module does
  its I/O through a port interface, a test double that implements its own
  atomicity proves the *double's* atomicity, not the code's. `FsPort` had no
  undo at all while `MemPort` had a scratch-copy swap, so the "a failure
  leaves the tree untouched" test passed against a defect that would corrupt
  a real repo. Keep the port in its own module (not in a CLI entry point that
  calls `process.exit`, which kills an importing test process), then drive it
  against a real temp directory. Assert the whole tree, not just files:
  compare the directory listing too, or a restore that leaves empty
  scaffolding behind passes.
- **Induce a real failure, not only an injected one.** A hook like
  `failAfterWrites` tests the hook; a genuine OS error tests the recovery
  path. `chmod 500` on a destination directory makes `mkdir` fail with EACCES
  partway through an apply, which is exactly the half-applied case the
  guarantee is about. Note that `chmod` semantics are POSIX, so such a test
  is not portable to Windows.
- **Idempotence tests need a fixture with every feature that can break it.**
  The migration was idempotent on a plain tree but not on one holding a
  vendored clone, because the index was computed from the pre-migration path
  set and missed a file the plan itself adds. A no-op assertion over one
  fixture is not a no-op guarantee; run it over the whole fixture set.
- **A package-wide rename sweep must exempt its historical records up front,
  and the exemption set is part of the design.** A mechanical identifier sweep
  over the whole package will eat its own rename table (the arch-spec's
  old-to-new mapping collapses to the new name on both sides), dated changelog
  entries, decision records, and audit findings, producing a never-existent
  mixed state. The durable guard is a **corpus assertion** that walks the
  package, checks every file against the old-name regex (assembled from parts
  so the test file itself carries no old literal), and holds an explicit
  exemption set for the historical-record class. Guard the wildcard form too
  (`<prefix>*`), not only exact identifiers. See the `tool prefix rename`
  block in `tests/skills.test.ts`.
- **A fixture patched to make a new check pass can violate the schema the
  suite stands for.** When a new status-based check landed, the v3 fixture
  was patched to carry the new field (`workflow_state: done`) on top of
  `status: draft`, a pair the conformance rules forbid, and the suite went
  green while the live tree (which carries neither field) broke. Two guards:
  fixtures must stay schema-valid even when it costs a test rewrite, and any
  check that changes what the live tree sees needs one test driving the
  tool against the live tree's actual shape (status-only frontmatter), not
  only against fixtures.

## Integration harness (tests/integration/)

- Sessions run on the **faux provider** from pi-ai's compat layer:
  canned responses, no network. Two layers: `registerFauxProvider`
  (pi-ai, serves the responses) + `ModelRegistry.registerProvider`
  (pi-coding-agent, makes auth/model resolution pass).
- Use `AuthStorage.inMemory()` + `ModelRegistry.inMemory(authStorage)`
 , `ModelRuntime` was removed in pi-coding-agent 0.80.3.
- `registerProvider` requires `baseUrl` when the provider defines
  models (a dummy like `http://faux.local` is fine).

### The harness runs green on the installed pi (0.80.10)

`tests/integration/session.test.ts` (16 tests) **passes** on the installed
`@earendil-works/pi-coding-agent` 0.80.10. An earlier revision of this doc
recorded a `TypeError: Cannot read properties of undefined (reading
'inMemory')` at `harness.ts:138` (`AuthStorage.inMemory()`); that was a
version-skew failure from before the harness moved to `ModelRuntime.create`
with `InMemoryCredentialStore` (see the imports at the top of `harness.ts`).
The failure no longer reproduces, on `main` or on task branches. Run the full
suite normally; do not exclude this file.

## Skill prose testing

- Skills are tested via **structure/cross-reference assertions** in
  `tests/skills.test.ts` (e.g. "implement-task references
  tdd-worker"). When adding a skill: extend `SKILL_FILES` and bump the
  manifest count assertion.
- **Producer prose is tested by running its templates through the engine.**
  A skill that teaches agents to write artifacts is a producer, and its
  prose templates are its real output contract: extract every fenced YAML
  frontmatter block from the prose, substitute the placeholders, and run
  each through the repo's own `parse` + `fromFrontmatter` +
  `validateArtifact` + `findAnomalies` asserting zero anomalies and no
  killed keys. Assemble fixture efforts from the extracted templates (a
  fresh effort, a one-off with one ticket, a spec-only effort) and assert
  zero anomalies; plant a nonconformant file (an invalid
  status/workflow_state pair, a type-less file) and assert the engine
  reports it. Prose and engine rules then cannot drift silently. See the
  `conformance seam` blocks in `tests/skills.test.ts`
  (overhaul-planning-skills).
- **Tool allowlist assertion for rewritten prose.** When a skill rewrite
  must not reference deleted tools, assert every `tw_*` name appearing in
  the prose is in the surviving-tool set (`expectOnlySurvivingTools` in
  `tests/skills.test.ts`), so a stale tool reference fails a structure test
  instead of waiting for the dead-surface sweep.
- **YAML gotcha:** an unquoted `: ` inside a frontmatter value (e.g. a
  title containing `type: bug`) makes the YAML invalid; the task tools
  then *silently skip* the file. Quote such values.
- **Skill bucket layout (adopt-mp-skills-way):** skills live in bucket folders
  `engineering/`/`productivity/` (promoted, in `package.json` `pi.skills` + get a
  `docs/<bucket>/<name>.md` page) and `misc/`/`in-progress/`/`deprecated/` (kept,
  not promoted). `tests/skills.test.ts` asserts the bucket layout via `readdirSync`
  (only bucket dirs at `skills/` top level) + the manifest count. When moving a
  skill between buckets, update `SKILL_FILES` paths, the `pi.skills` entries, and
  any `toContain("./skills/<bucket>/<name>")` assertions in one commit.
- **validate_skill.mjs allows `disable-model-invocation` + `argument-hint`:** the
  validator's `ALLOWED_KEYS` includes these Pi frontmatter keys (every user-invoked
  skill uses `disable-model-invocation`); a skill whose folder name != frontmatter
  `name:` fails validation (rename the folder to match, not the name).
- **Migration skill (setup-workflow) + version-stamp:** `docs/tasks/state.yaml`
  carries `schema_version`; `setup-workflow` auto-detects fresh/old/current and
  applies per-upgrade resources (`resources/upgrade-<from>-to-<to>.md`) in
  sequence. Structure assertions verify the skill references `upgrade-2-to-3`,
  `migration-target.yaml`, and the dry-run/backup/idempotent safety guarantees.
- **Skill helper-script testing (CLI seam):** when a skill ships executable
  helper scripts (e.g. `skills/engineering/skill-creator/scripts/*.mjs`), test them via
  `spawnSync` on the script CLI (stdout + exit code) from a dedicated vitest
  file (e.g. `tests/skill-creator-scripts.test.ts`). Pin `cwd` to the repo
  root, give each `spawnSync` a timeout, and use `mkdtempSync` + `try/finally
  rmSync` for any temp skill dirs. Include a **dogfood assertion** where
  appropriate, e.g. `validate_skill.mjs skills/skill-creator` must exit 0
  (the skill's own validator validates itself).
