# prd-workflow for opencode

The [opencode](https://opencode.ai) port of the `prd-workflow` plugin — the same
epic → PRD → slice → implement → finalize workflow as the Claude Code plugin in
[../prd-workflow/](../prd-workflow/), backed by the same single TypeScript
implementation of `prd-tool`.

This directory is a ready-to-copy **`.opencode/` overlay**:

```
command/<name>.md                       # 15 slash commands (/init-prd-workflow, /create-epic, …)
skill/prd-workflow-overview/SKILL.md    # auto-invokable orientation skill (model picks it by description)
plugin/prd-workflow.js                  # registers the native prd_* tools
scripts/prd-tool.js                     # the bundled CLI the command headers inject
```

The orientation doc is a **skill**, not a command: opencode's model auto-invokes it
(via the `skill` tool) when the user asks about PRDs — so the agent reaches for the
`prd_*` tools instead of improvising. The 15 operational steps are **commands**
(user-typed `/…`) because they rely on <code>!\`…\`</code> header injection.

## Why commands + a skill + tools

opencode `SKILL.md` files are **static** — they can't run the <code>!\`…\`</code>
shell injections the *operational* steps depend on (workflow-gate, reference,
list, profile, forge snippets). opencode **commands** can, and run from the
project root. So each operational step is shipped as a **command** whose header
injects context via the bundled CLI, and the agent-driven artifact operations are
exposed as **native tools** (the `prd_*` family, registered by
`plugin/prd-workflow.js`). Each command body carries a note steering the agent to
those tools.

The one exception is **`prd-workflow-overview`**, shipped as an actual
**skill** (`skill/…/SKILL.md`). It's an orientation doc that needs no injection, so
it can be static — and being a skill means opencode's **model auto-invokes it** (via
the `skill` tool, by description) the moment a user asks about PRDs. That's what
keeps the agent on the `prd_*` tools / `/…` commands instead of inventing an API or
hand-parsing the tree.

## Install (per-project)

Copy the contents of this directory into your repo's `.opencode/`:

```sh
mkdir -p your-repo/.opencode
cp -r command skill plugin scripts your-repo/.opencode/
```

Then, in `your-repo`, open opencode and run `/init-prd-workflow` first. The
`prd_*` tools appear automatically (opencode auto-loads `.opencode/plugin/*.js`).

**Per-project only.** The command headers reference the CLI by the
project-root-relative path `.opencode/scripts/prd-tool.js` (opencode runs
<code>!\`…\`</code> from the project root). A global install under
`~/.config/opencode/` would not resolve that relative path, because commands have
no "own-directory" variable.

### Runtime

`scripts/prd-tool.js` is a self-contained bundle with a `#!/usr/bin/env node`
shebang; the command headers invoke it as `node ".opencode/scripts/prd-tool.js"`.
It is runtime-agnostic — `bun ".opencode/scripts/prd-tool.js"` works too — but
**node** is the default. opencode itself runs on Bun, so a Bun is always present;
node is required only if you keep the default `node …` invocation.

### Permissions

The <code>!\`…\`</code> header injections run shell commands. If opencode prompts
on each run, allow bash in `opencode.json`:

```json
{ "$schema": "https://opencode.ai/config.json", "permission": { "bash": "allow" } }
```

### `@opencode-ai/plugin`

`plugin/prd-workflow.js` imports `@opencode-ai/plugin` (the framework's own plugin
API), which opencode provides at runtime. If your opencode build can't resolve it,
add it to a `.opencode/package.json` (`{ "dependencies": { "@opencode-ai/plugin":
"*" } }`) so opencode's startup `bun install` picks it up.

## Regenerating

Everything here is generated from the canonical `SKILL.md` sources by the repo's
build — don't edit these files by hand:

```sh
npm run build   # rebuilds the CLI + plugin bundles and regenerates command/
```
