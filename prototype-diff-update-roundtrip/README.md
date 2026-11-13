# Prototype: diff-update-roundtrip (THROWAWAY)

This directory is a throwaway prototype for the planning task
`architecture-fitting/tasks/diff-update-roundtrip`. It answers one question:

> Can the settled architecture schema represent a complete reviewed diff
> whose clean update is a mechanical, verifiable removal of review markup,
> while preserving unchanged content and agent-authored assignments and
> using only clean `HEAD` for code analysis?

Nothing here is production code. Run it, read the artifacts, then delete or
ignore it. The validated decision goes to the effort map; the code is not
lifted.

## How to run

```bash
node run-prototype.mjs
```

One command, no dependencies beyond Node and git. It prints a verification
report and leaves inspectable output behind:

- `tmp/fixture-repo/`: the temporary git repository with TypeScript and Go
  fixtures and the fitted architecture. Persistent so you can inspect it.
- `artifacts/`: the architectures and reports copied out for review.

## Artifacts

- `artifacts/01-base-architecture/`: the fitted architecture at the base
  commit (source of the diff).
- `artifacts/02-code-changes.diff`: the fixture code changes between base
  commit and HEAD, for reference.
- `artifacts/03-diff-architecture/`: the complete highlighted diff
  architecture produced by the diff operation.
- `artifacts/04-reviewed-diff-architecture/`: the diff after simulated
  operator review (one localized assignment accepted, one broader redesign
  proposal deferred).
- `artifacts/05-clean-architecture/`: the output of update, produced from the
  reviewed diff alone.
- `artifacts/06-verification-report.txt`: the pass or fail checks.
- `artifacts/07-dirty-run-report.txt`: the dirty working tree run, proving
  the analysis target was a detached worktree at HEAD.

## Diagram conventions

All diagrams (base, diff, clean) use: box spacing via a mermaid init
directive; few-word edge labels describing the relationship (declared
relationships carry an authored `label`, observed evidence yields
`imports X` / `uses X` descriptions); `[U]`-prefixed labels for declared-but-
not-observed edges (what it should have been) and `[ND]`-prefixed labels for
observed-but-undeclared edges (what actually is there). Diff diagrams add the
change class as a second line inside each changed AU's box, plus tier color
classes; update strips both mechanically.

## What the prototype proves or fails to prove

The verification report checks: unchanged authored content and fitted
assignments survive the roundtrip exactly, tool-derived facts refresh, no
review markup survives update, update consumed only the reviewed diff, and a
dirty original working tree did not influence the analyzed result.

The schema it exercises was settled by the `architecture-schema` planning
task; this prototype validates that settlement, it does not re-decide it.
