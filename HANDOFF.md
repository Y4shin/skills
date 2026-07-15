# Handoff: Subagent Conversion

## Status: IMPLEMENTED (v0.17.0)

## What was done

Convert 4 skills into pi-subagents agent definitions, bundled within this same
`task-workflow` package. Add a startup extension that checks for `pi-subagents`
presence. Rewrite orchestrator skills to dispatch subagents instead of invoking
sub-skills.

## Agents to create (under `agents/`)

| Agent | From skill | Role | Key tools |
| --- | --- | --- | --- |
| `tdd-worker` | `develop-tdd` | Worker implementation | read, write, edit, bash |
| `slice-verifier` | `verify-slice` | Gatekeeper | read, bash |
| `test-strategist` | `design-test-strategy` | Planner (read-only) | read |
| `task-summarizer` | `summarize-task` | Small worker | read, write |

## Orchestrator rewrites needed

| Skill | Change |
| --- | --- |
| `implement-slice` | Step 4: `subagent({ agent: "tdd-worker", task: "..." })` instead of `/skill:develop-tdd`. Step 5: `subagent({ agent: "slice-verifier", task: "..." })` instead of `/skill:verify-slice`. |
| `start-slice` | Step 3: `subagent({ agent: "test-strategist", task: "..." })` instead of `/skill:design-test-strategy`. |
| `finalize-task` | Step 5: `subagent({ agent: "task-summarizer", task: "..." })` instead of `/skill:summarize-task`. |
| `slice-task` | Step 4: `subagent({ agent: "slice-sizer", task: "..." })` — note: `size-slices` was listed but needs a dedicated agent too, or keep as inline skill since it's grilling. |

## Extension to add

`extensions/check-subagents.ts` — checks `pi.getAllTools()` for `subagent` on
`session_start`, warns if missing.

## package.json changes

- Add `peerDependencies: { "pi-subagents": "*" }`
- Add `pi.subagents.agents: ["./agents"]` to the manifest
- Add the check extension path

## Skills not converted (stay as skills)

`grill-me`, `create-task`, `task-workflow-overview`, `resume-workflow`,
`onboard-workflow`, `migrate-workflow`, `archive-artifact`, `land-slice`,
`size-slices` (user-interactive grilling) — these are interactive,
one-time setup, or read-only and don't benefit from subagent isolation.

## Agent naming

Use skill-derived names: `tdd-worker`, `slice-verifier`, `test-strategist`,
`task-summarizer`.

## Constraints

- Same repo, same `task-workflow` npm package
- pi-subagents listed in `peerDependencies`, not bundled
- Check extension warns at startup if pi-subagents missing
- Orchestrators rewritten to dispatch subagents
