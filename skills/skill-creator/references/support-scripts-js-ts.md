# Support Scripts — JS/TS

Read when the chosen language is JS or TypeScript. The shared policy (when
to ship, language choice, self-contained-at-runtime, by-hand fallback,
shape, testing, runtime floor, default-stack picks) lives in
`support-scripts.md` — read it first. This file covers only JS/TS-specific
details.

## Runtime

JS/TS helpers run on **Node.js** (the default), **Deno**, or **Bun** —
whichever the target project already uses. Node floor = **Node 20 LTS**.

**Portability trade-off:** a Node/TS script needs a runtime the target harness
may not have. Unlike Python (nearly universally available), Node is not
guaranteed on every end-user machine. This is a **non-default by-hand/stop
fallback** per the shared safety decision in `support-scripts.md`: if the
end user may not have Node, the skill should either (a) document the Node
requirement in `compatibility` frontmatter, or (b) fall back to a by-hand
path if it is safe and deterministic, or (c) stop and require the script if
the op is dangerous. Don't assume Node is present.

## Self-contained at runtime: bundle into a committed artifact

When a JS/TS helper needs libraries, **bundling is endorsed** — bundle
deps + script into one **committed** runnable artifact via a build step:

- The build step produces a committed `.mjs` (or `.js`) that the end user
  runs with `node helper.mjs <args>` — no `node_modules`, no installed
  packages.
- **Keep the readable source** (`src/cli.ts` or `src/cli.mjs`) alongside the
  committed artifact for patching (the "runnable AND readable" principle).
  The artifact-only approach is rejected — it loses the patchable source.
- The build step + committed artifact are an **authoring concern** (the
  skill-author commits them), not run by the end user.

**Bundler heuristic:** use the target project's existing bundler if it has
one. If none, `esbuild` is the lean default (one binary, ~zero config,
fastest). The specific bundler + build setup + artifact shape are chosen by
the `bundle-script-template` prototype — its findings live at
`docs/tasks/bundle-script-template/findings.md`. This reference states the
path at the **policy level** and points to the findings for the concrete
template. The follow-up task `fold-bundle-templates-into-refs` folds the
verified template here.

## `.ts` only with a committed runnable artifact

Ship `.ts` source **iff** the build step commits a runnable artifact
(`.mjs`/`.js`). **Never** ship a `.ts` that needs `tsc`/`tsx` at the end-user
runtime — the end-user runtime stays dependency-free per the shared policy.
The committed artifact is what the end user runs; the `.ts` source is kept
for patching.

## Shebang

The committed artifact starts with:

```javascript
#!/usr/bin/env node
```

Make it executable (`chmod +x`), but also support `node helper.mjs`
invocation for agents that run it explicitly.

## Inputs

- **`process.argv`** for CLI arguments, or use `commander` (default-stack
  pick) for anything beyond trivial parsing.
- **stdin** for piped input when the script is part of a pipeline.
- Avoid interactive `readline` prompts unless the script's explicit purpose
  is human-interactive.

## Testing

Per the shared policy (Q4): test on a worked example with a known answer. If
the skill lives in a project with vitest/jest, use it. Otherwise run the
script directly on a known input and assert the output:

```bash
node helper.mjs --input known.json --output result.json
diff result.json expected.json  # known-good literal
```

When bundling, test the **committed `.mjs`** (what the end user runs), not
only the source. For a stdlib-only script with no bundler, the source *is*
the artifact.

## Min-version contract

Node floor = **Node 20 LTS**. The script should check `process.version` /
`process.versions.node` and error with "install at least Node 20" if older.
An agent reading that error must **consult the user before installing
anything** — never silently install an interpreter.

```javascript
const [major] = process.versions.node.split(".").map(Number);
if (major < 20) {
  console.error("Error: this script requires Node 20 LTS or newer. " +
    "Please install Node 20+. " +
    "(If you are an agent, ask the user before installing.)");
  process.exit(1);
}
```

Pin library majors that satisfy the floor (see the default-stack table in the
shared file for the concrete pins).

## By-hand fallback

Per the shared safety decision in `support-scripts.md` — a by-hand fallback
is a considered, safety-first choice, not a default. Omit it for
dangerous/irreversible/non-obvious ops; provide it only when the path is
safe, deterministic, and within the agent's reliable capability. Do not
restate the shared policy here — refer to it.
