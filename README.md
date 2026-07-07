# prd-workflow

> Epic → PRD → slices → TDD → finalize — a simplified planning workflow for `docs/prd/`.
> Available as a **pi package** and an **opencode overlay**.

## What is this?

A workflow for planning and coordinating work in a repo:

- **PRD** — a product requirements doc describing one feature or capability
- **Epic** — a coordinated outcome spanning several PRDs (optional; a lone PRD needs no epic)
- **Slice** — an independently-grabbable, mergeable tracer-bullet issue

Everything lives in `docs/prd/` under version control. Issues are tracked on GitHub (`gh` CLI), Forgejo/Codeberg (bundled REST client), or a built-in local tracker for repos without a remote.

## Simplified — what changed from the original

| Before (16 skills) | After (7 skills) |
|---|---|
| create-epic, create-feature-prd, create-capability-prd, grill-me, epic-to-prds | **create-prd** — one interview, produces PRD or epic |
| feature-prd-to-issues, capability-prd-to-issues | **slice-prd** — one slice template |
| analyse-issue | **start-issue** — test strategy |
| implement-issue | **implement-issue** — TDD |
| finalize-prd, finalize-epic | **finalize-prd** — closes PRD + epic |
| adopt-prd | **adopt-prd** — backfill legacy docs |
| init-prd-workflow, update-prd-workflow | **init-prd-workflow** — setup |

**Dropped:** feature/capability distinction, version dotfile + migration, build system for generating one plugin from another.

## Install

### As a pi package (recommended for pi users)

```bash
# From a local path (during development)
pi install /path/to/prd-workflow

# Or from git once published
pi install git:github.com/your-username/prd-workflow@v0.11.0
```

This auto-loads:
- **Extension** — registers the `prd_*` tools (`prd_show`, `prd_list`, `prd_set`, …) as native pi tools
- **Skills** — `create-prd`, `slice-prd`, `start-issue`, `implement-issue`, `finalize-prd`, `adopt-prd` loadable via `/skill:name`

Then in your repo:
1. Run `/init-prd-workflow` to create `docs/prd/`
2. Follow the `/skill:create-prd` instructions

### As a pi extension + skills (manual)

Add to your pi settings (`~/.pi/agent/settings.json` or `.pi/settings.json`):

```json
{
  "extensions": ["/path/to/prd-workflow/src/pi/index.ts"],
  "skills": ["/path/to/prd-workflow/skills"]
}
```

### As an opencode overlay

```bash
# Copy the overlay into your repo
cp -r opencode-overlay/* your-repo/.opencode/
```

Then:
1. Run `/init-prd-workflow` first
2. Follow the command instructions

## Architecture

```
prd-workflow/
├── src/
│   ├── core/              # Shared: frontmatter, model, forge, forgejo, tracker
│   ├── pi/
│   │   └── index.ts       # Pi extension (tools + commands)
│   └── opencode/
│       └── plugin.ts      # Opencode plugin (native prd_* tools)
├── skills/                # SKILL.md files (shared by pi + opencode)
├── opencode-overlay/      # Generated .opencode/ overlay
├── docs/artifacts.md      # Schema reference
├── build.mjs              # Builds CLI + plugin, generates overlay
└── package.json           # Also serves as pi package manifest
```

## Pi package details

The `package.json` declares a `pi` manifest:

```json
{
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./src/pi/index.ts"],
    "skills": ["./skills"]
  }
}
```

Pi imports are in `peerDependencies` (`@earendil-works/pi-coding-agent`, `typebox`) — pi provides them at runtime. Runtime deps (`yaml`, `smol-toml`) are in `dependencies` and auto-installed.

## Usage

### Workflow steps

| Step | Skill | What the agent does |
|---|---|---|
| Setup | `/skill:init-prd-workflow` or `/init-prd-workflow` | Creates `docs/prd/` |
| Plan | `/skill:create-prd` | Interviews you, writes `prd.md` or `epic.md` |
| Slice | `/skill:slice-prd` | Breaks a PRD into tracked issues + slice docs |
| Analyse | `/skill:start-issue` | Grills on test strategy, appends test plan |
| Build | `/skill:implement-issue` | TDD: red→green→refactor, merges slice |
| Close | `/skill:finalize-prd` | Harvests knowledge, single PR/merge, deletes PRD dir |
| Adopt | `/skill:adopt-prd` | Backfills frontmatter on legacy docs |

### Tools

All artifact operations go through `prd_*` tools (not ad-hoc scripting):

| Tool | Purpose |
|---|---|
| `prd_show`, `prd_get`, `prd_set` | Read/write frontmatter |
| `prd_resolve`, `prd_assert_kind` | Locate & verify artifacts |
| `prd_list`, `prd_slices` | List the planning tree |
| `prd_finalizable`, `prd_lint` | Check readiness |
| `prd_epic_prds`, `prd_epic_tick`, `prd_epic_finalizable` | Epic management |
| `prd_forge`, `prd_reference`, `prd_profile` | Context injection |
| `prd_workflow_gate` | Setup check |

## Provider support

| Provider | How it works |
|---|---|
| **GitHub** | Uses `gh` CLI |
| **Forgejo/Codeberg** | Bundled REST client — no `fgj` CLI needed beyond token |
| **Local** | Built-in JSON tracker (`docs/prd/tracker.json`) |

## Development

```sh
npm install
npm run build     # bundle CLI + plugin, generate opencode overlay
npm test          # 51 tests
npm run typecheck
```

## Provider detection

The provider is auto-detected from the `origin` remote:
- `github.com` → `gh`
- `codeberg.org`, `forgejo`, `gitea` → `fgj`
- No remote → `local` (file-based tracker)
- Override via `.prdrc` `[forge]` section