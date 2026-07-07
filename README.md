# prd-workflow

> Epic → PRD → slices → TDD → finalize — a planning workflow for `docs/prd/`.
>
> A **[pi package](https://pi.dev)** — one `pi install` away.

## What is this?

A workflow for planning and coordinating work:

- **PRD** (`kind: prd`) — a product requirements doc for one feature or capability
- **Epic** (`kind: epic`) — a coordinated outcome spanning several PRDs (optional)
- **Slice** — an independently-grabbable, mergeable tracer-bullet issue

Everything lives in `docs/prd/` under version control. Issues are tracked on
GitHub (`gh` CLI), Forgejo/Codeberg (bundled REST client), or a built-in local
tracker for repos without a remote.

## Simplified — from 16 skills to 7

| Before | After |
|---|---|
| create-epic, create-feature-prd, create-capability-prd, grill-me, epic-to-prds | **create-prd** — one interview, produces PRD or epic |
| feature-prd-to-issues, capability-prd-to-issues | **slice-prd** — one slice template |
| analyse-issue | **start-issue** — test strategy |
| implement-issue | **implement-issue** — TDD |
| finalize-prd, finalize-epic | **finalize-prd** — closes PRD + epic |
| adopt-prd | **adopt-prd** — backfill legacy docs |
| init-prd-workflow, update-prd-workflow | **init-prd-workflow** — setup |

**Dropped:** feature/capability distinction, version dotfile + migration, dual
plugin build system (was Claude Code + opencode, now pi only).

## Install

```bash
# Local (during development)
pi install /path/to/prd-workflow

# From git once published
pi install git:codeberg.org/Yashin/skills@v0.11.0
```

This auto-loads:

| Resource | What |
|---|---|
| **Extension** (`src/pi/index.ts`) | 15 `prd_*` native tools + `/init-prd-workflow` command |
| **Skills** (`skills/`) | 7 SKILL.md files: overview, create-prd, slice-prd, start-issue, implement-issue, finalize-prd, adopt-prd |

Then in any repo:

```
/init-prd-workflow        # creates docs/prd/
/skill:create-prd         # start planning
```

## What you get

### Tools (agent-callable)

All artifact operations go through `prd_*` tools — the agent calls them directly,
no bash subprocesses:

| Tool | What it does |
|---|---|
| `prd_show`, `prd_get`, `prd_set` | Read/write frontmatter |
| `prd_resolve`, `prd_assert_kind` | Locate & verify artifacts |
| `prd_list`, `prd_slices` | List the planning tree |
| `prd_finalizable`, `prd_lint` | Readiness checks |
| `prd_epic_prds`, `prd_epic_tick`, `prd_epic_finalizable` | Epic management |
| `prd_forge`, `prd_reference`, `prd_profile` | Context injection |
| `prd_workflow_gate` | Setup check |

### Workflow steps

| Step | Skill | What the agent does |
|---|---|---|
| Setup | `/skill:init-prd-workflow` or `/init-prd-workflow` | Creates `docs/prd/` |
| Plan | `/skill:create-prd` | Interviews you, writes `prd.md` or `epic.md` |
| Slice | `/skill:slice-prd` | Breaks a PRD into tracked issues + slice docs |
| Analyse | `/skill:start-issue` | Grills on test strategy, appends test plan |
| Build | `/skill:implement-issue` | TDD: red→green→refactor, merges slice |
| Close | `/skill:finalize-prd` | Harvests knowledge, single PR, deletes PRD dir |
| Adopt | `/skill:adopt-prd` | Backfills frontmatter on legacy docs |

## Provider support

| Provider | How it works |
|---|---|
| **GitHub** | Uses `gh` CLI |
| **Forgejo/Codeberg** | Bundled REST client (`src/core/forgejo.ts`) — no `fgj` CLI needed |
| **Local** | Built-in JSON tracker (`docs/prd/tracker.json`) |

Auto-detected from `origin` remote. Override via `.prdrc` `[forge]` section.

## Development

```sh
npm install
npm test          # 48 tests
npm run typecheck
```

The `pi` manifest in `package.json` is the single source of truth for
auto-discovery — no build step needed.