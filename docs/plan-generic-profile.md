# Plan: Make prd-workflow skills generic via a project profile

## Goal

The skills in `plugins/prd-workflow/skills/` are hardcoded with Junius-specific
details (file paths, test commands, code conventions, architecture layers). Make
them generic and reusable across any project by extracting project-specific
context into a **`docs/prd/profile.md`** file in the consuming repo, injected
into skills at runtime alongside the existing `reference` and `list` injections.

## Design

### The profile file (`docs/prd/profile.md` in the consuming repo)

A single markdown file with well-known sections that skills reference by name.
**Optional** — if missing, `prd_tool.pyz profile` emits nothing and skills
degrade gracefully (they still work, just without project-specific context).

Sections:

| Section | Used by | Purpose |
|---|---|---|
| `## Project` | grill-me, all create-* | One-liner project description for orientation |
| `## Orientation docs` | grill-me, create-*, analyse-issue, implement-issue | Docs to read before grilling or writing PRDs |
| `## Architecture layers` | create-feature-prd, create-capability-prd, feature-prd-to-issues, capability-prd-to-issues, adopt-prd | What a "vertical slice" / "enabling slice" means in this project |
| `## Test infrastructure` | analyse-issue, implement-issue | Test types, file patterns, run commands |
| `## CI` | implement-issue | CI command(s) that must pass before opening a PR |
| `## Code conventions` | implement-issue | Non-negotiable coding rules |
| `## Knowledge destinations` | finalize-prd, finalize-epic | Where durable knowledge gets folded |

See `plugins/prd-workflow/examples/profile.md` for the full Junius example
(already created).

### How skills change

Each skill gets a new injection line alongside the existing `!reference` and `!list`:

```
!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" profile`
```

Then all hardcoded Junius-specific content is replaced with generic prose that
references the profile sections. For example:

**Before** (implement-issue):
```
- No `unsafe` (`unsafe_code = "forbid"`).
- No clippy-disallowed methods; go through `junius-sdk`.
```

**After**:
```
Follow the project profile's "Code conventions" section. Read any
referenced config files for the full details.
```

**Before** (analyse-issue test vocabulary):
```
- **e2e** — Playwright (`plugins/*/frontend/e2e/**/*.spec.ts`) → `task test:e2e`
- **rust-integration** — testcontainers, `tests/*.rs` → `task test:rust`
...
```

**After**:
```
Use the test types, file patterns, and run commands from the project profile's
"Test infrastructure" section. If no profile exists, explore the codebase to
identify available test frameworks and their run commands.
```

### Skills that stay unchanged (or nearly)

- `adopt-prd` — mostly workflow-internal logic; only the `kind` inference
  guidance referencing "proto/RPC → migration" needs to reference the profile's
  architecture layers instead.
- `epic-to-prds` — already fairly generic; only "SDK/macro/host" language in
  the decomposition rules needs generalizing.

## Implementation state

### Done

1. **`profile` CLI command** — Added to `src/prd_tool/cli.py`:
   - `_profile_text(root)` helper reads `docs/prd/profile.md`, returns empty
     string if missing.
   - `cli.command()` `profile` prints the content if it exists, prints nothing
     otherwise. No error, no crash.

2. **Example profile** — Created at
   `plugins/prd-workflow/examples/profile.md` with all Junius-specific content
   extracted from the current skills (project description, orientation docs,
   architecture layers, test infrastructure, CI command, code conventions,
   knowledge destinations).

### Remaining (per skill)

Each SKILL.md needs two changes:
1. Add `!`python3 ... profile`` injection line (alongside existing `!reference` and `!list`)
2. Replace hardcoded Junius content with generic profile-referencing prose

Here's what to change in each skill:

#### `grill-me/SKILL.md`
- **Remove**: "This repo is a Rust + nix + React/TanStack plugin-driven monolith ("Junius"); orient with `docs/design/`, `docs/impl/README.md`, and `docs/plugin-authoring-guide.md`"
- **Replace with**: Generic instruction to read the project profile's "Project" description and "Orientation docs" list. If no profile, explore the codebase.
- **Add**: `!profile` injection

#### `create-feature-prd/SKILL.md`
- **Remove**: "proto/RPC → migration → plugin Rust → frontend → test" from intro
- **Remove**: Step 1 hardcoded docs (`docs/plugin-authoring-guide.md`, `docs/design/04-frontend.md`, `plugins/<name>/`, `docs/design/06-plugin-shape.md`, `docs/impl/` milestone)
- **Remove**: Step 2 grill questions #3 ("proto/RPC services, migrations, frontend routes, background jobs"), #4 ("events plugin pattern")
- **Replace with**: Generic instructions referencing profile's orientation docs, architecture layers
- **Add**: `!profile` injection

#### `create-capability-prd/SKILL.md`
- **Remove**: "junius-sdk" from description and intro
- **Remove**: Step 1 hardcoded docs (`docs/design/11-*`, `12-*`, `08-*`, `crates/junius-sdk/`, `crates/junius-sdk-macros/`, `clippy.toml`)
- **Remove**: Step 2 references to `platform/`, host layering rules
- **Replace with**: Generic instructions referencing profile
- **Update description**: Remove "junius-sdk" reference
- **Add**: `!profile` injection

#### `create-epic/SKILL.md`
- **Remove**: Step 1 hardcoded docs (`docs/design/02-*`, `06-*`, `08-*`, `plugins/` trees, `docs/impl/` milestones)
- **Remove**: Step 2 grill #2 referencing "plugins, host/SDK surfaces", #3 "SDK, macro, host, manifest, navigation"
- **Replace with**: Generic instructions referencing profile
- **Add**: `!profile` injection

#### `analyse-issue/SKILL.md`
- **Remove**: Step 1 hardcoded docs (`docs/design/`, `docs/impl/README.md`, `docs/plugin-authoring-guide.md`, `clippy.toml`)
- **Remove**: Presentation template referencing "DB schema · proto/RPC · plugin Rust · frontend · job"
- **Remove**: Entire hardcoded test-type vocabulary table (e2e, rust-integration, etc. with specific paths/commands)
- **Remove**: Push-back examples referencing "DB/HTTP"
- **Replace with**: Reference profile's "Orientation docs", "Architecture layers", and "Test infrastructure"
- **Add**: `!profile` injection

#### `implement-issue/SKILL.md`
- **Remove**: Step 3 "Repo non-negotiables" (unsafe, clippy, junius-sdk, plugin.toml)
- **Remove**: Step 4 hardcoded test commands (`task test:rust`, `task test:js`, `task test:e2e`) and file patterns
- **Remove**: Step 5 acceptance checklist items (`task ci`, `cargo sqlx prepare`, `task sqlx:check`, `buf`)
- **Replace with**: Reference profile's "Code conventions", "CI", and note that test commands come from the slice doc's test plan
- **Add**: `!profile` injection

#### `feature-prd-to-issues/SKILL.md`
- **Remove**: Step 1 domain glossary ("proto/RPC under `proto/`, migrations under `migrations/`, plugin Rust in `plugins/<name>/src/`, frontend in `plugins/<name>/frontend/`", `docs/design/`, `plugin.toml`)
- **Remove**: Step 2 vertical slice rules referencing "proto/RPC (Connect) → migration → plugin Rust → frontend route/component → test"
- **Replace with**: Reference profile's "Architecture layers → Feature"
- **Add**: `!profile` injection

#### `capability-prd-to-issues/SKILL.md`
- **Remove**: Step 1 paths (`crates/junius-sdk/`, `crates/junius-sdk-macros/`, `platform/`, `docs/design/11-*`, `12-*`, `plugin.toml`)
- **Remove**: Acceptance criteria mentioning specific trybuild/compile-fail patterns
- **Replace with**: Reference profile's "Architecture layers → Capability"
- **Add**: `!profile` injection

#### `adopt-prd/SKILL.md`
- **Remove**: Step 2 kind inference example: "feature = user-facing plugin behaviour that cuts through the stack (proto/RPC → migration → plugin → frontend → test)"
- **Remove**: Step 4 canonical template section names are OK to keep (they're workflow concepts, not project-specific), but the brief `kind` descriptions should reference the profile
- **Replace with**: Reference profile's architecture layers for kind inference

#### `finalize-prd/SKILL.md`
- **Remove**: Step 3 hardcoded paths (`docs/design/*`, `docs/design/14-decision-log.md`, `docs/impl/NN-M<NN>-*.md`, `docs/impl/README.md`)
- **Replace with**: Reference profile's "Knowledge destinations"
- **Add**: `!profile` injection

#### `finalize-epic/SKILL.md`
- **Remove**: Step 3 hardcoded paths (`docs/design/*`, `08-cross-plugin-composition.md`, `docs/design/14-decision-log.md`, `docs/impl/`)
- **Replace with**: Reference profile's "Knowledge destinations"
- **Add**: `!profile` injection

#### `epic-to-prds/SKILL.md`
- Already mostly generic. Only the decomposition-rules mention of "SDK/macro/host unit" needs generalizing to reference the profile's capability layer description.

### Skill descriptions (frontmatter `description:` field)

Several descriptions contain Junius-specific language that should be made generic:

- `create-capability-prd`: "introducing an API surface into junius-sdk, a new macro, a host capability, or infra primitive" → "introducing a foundational capability, API surface, or infra primitive"
- `capability-prd-to-issues`: "SDK/macro/host surface, each with a first consumer" → "foundational surface, each with a first consumer"

### After all skills are updated

1. **Rebuild `prd_tool.pyz`**: `nix develop` then `uv run prd-tool-build`
2. **Update `README.md`**: Document the profile mechanism and point at the example

### Pattern for the profile injection block

Add this block to each skill that needs it (all except grill-me, which gets
it differently since it has no `allowed-tools` for prd_tool currently — it
should get the allowed-tools line added too). Place it after the existing
`!reference` injection:

```markdown
The project profile (project description, architecture layers, test
infrastructure, code conventions, knowledge destinations) is injected below
when available — if empty, explore the codebase for project-specific context:

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" profile`
```

### Key design principle

When no profile exists, skills should still be fully functional — they just
won't have pre-loaded project context and will need to explore the codebase
themselves. The profile is a convenience and consistency mechanism, not a
hard dependency.
