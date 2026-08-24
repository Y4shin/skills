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
- Given a fixture `event.systemPrompt` containing the real pi skills-XML
  format — a single `<available_skills>` block with one `<skill>` per
  skill, each having `<name>`, `<description>`, `<location>` children (see
  `findings.md` V1, `PI/dist/core/skills.js:257-283` `formatSkillsForPrompt`)
  — the returned `systemPrompt` contains **zero** `<skill>` blocks whose
  `<name>` child is one of the gated six, and the surrounding prompt text
  is otherwise unchanged. If the removal empties `<available_skills>`
  (the common case — the six are the only skills this package ships), drop
  the whole `<available_skills>…</available_skills>` block including its
  header lines (the `The following skills…` preamble that precedes it).
- If the prompt contains **no** `<available_skills>` block (format drift),
  the handler logs a diagnostic ("skill-strip: expected an
  <available_skills> block, found none; format may have changed") and
  returns the prompt unchanged (fail loud, not silent — but never corrupt
  the prompt).
- Personal path: the strip handler is not registered; the integration test
  asserts the stub `ExtensionAPI` recorded no `before_agent_start` beyond
  the injection handler.

## Test plan

- **Seams:** invoke the recorded handler with a constructed
  `{ systemPrompt: FIXTURE }`. FIXTURE is a realistic pi skills-XML string:
  the `\n\nThe following skills…<available_skills>…<skill><name>wayfinder</name>…</skill>…</available_skills>` block with the six gated skills plus a seventh non-gated skill and some surrounding text, to prove (a) only the gated six are removed by `<name>` match and (b) a non-gated skill is left intact.
- **Failure modes:** format drift (no `<available_skills>` → diagnostic + unchanged), manifest read failure (pinned fallback list used), empty skill list (no-op).
- **Scenarios:** gated with all six present (all six `<skill>` blocks removed; if the seventh remains, the `<available_skills>` wrapper stays with just the seventh), gated with none present (diagnostic), personal (handler absent).
- **Edge cases:** a skill name that is a substring of another (must match the exact `<name>` text, not a substring), a `<name>` containing XML-escaped chars (the strip matches the escaped form pi emits).

## Constraints and dependencies

- Blocked by `gate-config-mechanics` (must confirm `before_agent_start`
  receives the *full* prompt so a rewrite is safe) and
  `gate-detection-helper` (the gate decision).
- Do not hardcode the six names; read `package.json` `pi.skills`.
- The strip and injection handlers are mutually exclusive — exactly one
  registers per repo type.
