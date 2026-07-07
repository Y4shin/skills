# prd-workflow for opencode

Ready-to-copy `.opencode/` overlay for the prd-workflow — the same epic → PRD → slice → implement → finalize workflow, backed by the same TypeScript implementation.

## Install

```sh
cp -r opencode-overlay/* your-repo/.opencode/
```

Then run `/init-prd-workflow` first.

## Structure

```
.opencode/
├── command/<name>.md           # Workflow commands (/create-prd, /slice-prd, …)
├── skill/prd-workflow-overview/  # Auto-invokable orientation (agent picks it by description)
├── plugin/prd-workflow.js      # Registers native prd_* tools
└── scripts/prd-tool.js         # CLI for command header injections
```

### Why commands + a skill + tools

- **Skills** are static — they can't run `!\`…\`` injections. The orientation doc is a skill so the agent auto-invokes it (by description).
- **Commands** can run `!\`…\`` injections. Each operational step is a command whose header injects context.
- **Plugin** registers the native `prd_*` tools for artifact operations.

### Permissions

The `!\`…\`` header injections run shell commands. If opencode prompts on each run, allow bash:

```json
{ "permission": { "bash": "allow" } }
```

### Regenerating

Everything under `opencode-overlay/` is generated from the canonical SKILL.md sources:

```sh
npm run build   # rebuilds CLI + plugin bundles and regenerates command/
```