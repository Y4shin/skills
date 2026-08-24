---
kind: slice
slug: gate-strip-skills-from-prompt
title: before_agent_start strip handler removes the six <skill> blocks when gated
task: ../task.md
mode: afk
status: todo
size: m
blocked_by: []
---

# gate-strip-skills-from-prompt

## End-to-end behavior

When the gate is active, a `before_agent_start` handler (registered only in
the gated branch) rewrites the system prompt to remove the six
`<skill name="…">…</skill>` blocks. When the gate is inactive, no strip
handler is registered (the injection handler from
`gate-tools-and-injection` is the one that runs).

## Acceptance criteria

- The factory registers the strip handler iff `gate.active`:
  `if (gate.active) pi.on("before_agent_start", stripSkills)`.
- The strip handler reads the six (or current) skill names from
  `package.json` `pi.skills` at load; falls back to a pinned list with a
  diagnostic if the manifest read fails.
- Given a fixture `event.systemPrompt` containing all six
  `<skill name="…">…</skill>` blocks (built to match
  `formatSkillsForPrompt`'s output), the returned `systemPrompt` contains
  **zero** occurrences of those six names inside `<skill …>` blocks, and
  the surrounding prompt text is otherwise unchanged.
- If the prompt contains **no** matching blocks (format drift), the
  handler logs a diagnostic ("skill-strip: expected N skill blocks, found
  0; format may have changed") and returns the prompt unchanged (fail
  loud, not silent — but never corrupt the prompt).
- Personal path: the strip handler is not registered; the integration test
  asserts the stub `ExtensionAPI` recorded no extra `before_agent_start`
  beyond the injection handler.

## Test plan

- **Seams:** invoke the recorded handler with a constructed
  `{ systemPrompt: FIXTURE }`. FIXTURE is a realistic pi skills-XML string
  with the six blocks plus a seventh non-gated skill and some surrounding
  text, to prove only the gated six are removed.
- **Failure modes:** format drift (no match → diagnostic + unchanged),
  manifest read failure (pinned fallback list used), empty skill list
  (no-op).
- **Scenarios:** gated with all six present (all six stripped), gated with
  none present (diagnostic), personal (handler absent).
- **Edge cases:** a skill name that is a substring of another (must match
  the exact `name="..."` attribute, not a substring), nested-looking
  content inside `<skill>` (the `[\s\S]*?` is non-greedy and stops at the
  first `</skill>`).

## Constraints and dependencies

- Blocked by `gate-config-mechanics` (must confirm `before_agent_start`
  receives the *full* prompt so a rewrite is safe) and
  `gate-detection-helper` (the gate decision).
- Do not hardcode the six names; read `package.json` `pi.skills`.
- The strip and injection handlers are mutually exclusive — exactly one
  registers per repo type.
