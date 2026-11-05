---
type: task
subtype: grilling
title: Grill the effort's non-goals and non-negotiable facts
status: stable
workflow_state: ready
blocked_by: []
---

## Decision to settle

The effort's non-goals and non-negotiable facts, including the effort-level success test.

## Raw request (verbatim)

"I want to create an effort for implementing this" (referring to the analyzed fix): an extension that adds an additional output-limit parameter (roughly `maxLines`) to the bash tool so the tool itself applies the tail cut to the result before handing it back to the model, while streaming the full output live to the preview. The extension edits/patches the bash tool's description and prompt guidelines so the model uses the parameter instead of piping through `| tail -n N`, which currently leaves the live stdout preview silent because tail cannot emit until the pipeline exits.

Full context of the analysis (three-turn grounding in pi's installed source, read-only): pi's bash tool streams stdout/stderr to a rolling live preview and truncates the final result to the last 2000 lines / 50KB, saving full output to a temp file; a model-added `| tail -n N` pipe hides all output from the preview until process exit. Ideas considered: (A) a per-call output-limit parameter on the bash tool with amended tool description, (B) TUI hint "(piped through tail: no live output until exit)" via registerToolRenderer, (C) spawnHook command rewriting, (D) guidance only. Chosen scope: the parameter approach (A), user-answered "add an additional parameter so that the tool handles the tail cutting before handing the result to the user, while streaming the output live".

## Destination (user's words)

Add an additional parameter so that the tool handles the tail cutting before handing the result to the user, while streaming the output live.

## Actor

The pi operator (the developer running pi sessions) and, on distribution, any pi user who installs the extension.

## Classification

Feature.

## Stories

- As a pi operator, I want bash commands to stream their output live in the tool preview, so that long-running commands give me continuous visual feedback instead of a frozen preview.
- As a pi operator, I want the model to bound command output through a tool parameter instead of `| tail -n N` pipes, so that context protection no longer costs live feedback.
- As a pi operator, I want the bash tool's model-facing description and guidelines to steer away from `| tail` (and mention streaming-safe alternatives like `head`, `grep -m`, or `tail -f --pid`), so that the tool tells the model the right habit without external prompting.
- As a pi operator or downstream pi user, I want the extension to fingerprint the stock bash tool contract and refuse to patch on mismatch (fail-inert with a warning only), so that an unexpected pi version or a pre-existing override leaves the builtin tool intact.
- As the repo maintainer, I want the extension to live in this skills repo and ship via its pi package, so that it installs and loads through the standard extension pipeline.

## Constraints

- Usable by other pi users: must tolerate different pi versions, shells, and configs; the contract fingerprint gates everything.
- Failure to verify the fingerprint results only in a warning to the user; the patched tool is not registered and the extension is inert.
- Home: this repository (fork of mattpocock/pi-skills), shipped via its pi package; note the repo AGENTS.md currently governs skills only, so adding a shipped extension is new package infrastructure.
- Facts established during intake about pi's extension API (verified in the installed pi-monorepo source, no edits made): `pi.registerTool({ name: "bash", ... })` replaces the builtin by name collision (documented in examples/extensions/tool-override.ts); `createBashTool(cwd)` and `*Operations` types are exported from @earendil-works/pi-coding-agent for factory reuse (bash-spawn-hook.ts, ssh.ts patterns); `pi.getAllTools()` returns ToolInfo with live description, TypeBox parameter schema, promptGuidelines, sourceInfo for fingerprinting; `pi.on("before_agent_start")` exposes mutable `event.systemPromptOptions.sections` for prompt injection (prompt-customizer.ts); tool description/promptGuidelines travel with the declaration and are the preferred channel for tool-specific guidance.
- Related live effort in this repo: `architecture-tracking` (tracks ADRs/architecture of the package itself); a new shipped extension likely belongs in its tracking.
