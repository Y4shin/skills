---
kind: task
type: feature
slug: gate-skills-prompt-and-help
title: Hide the six skills from system prompt + /help/skill-list, and enforce/warn on explicit /skill: in work repos
map: gate-skills-by-repo
status: ready
slices:
  - gate-strip-skills-from-prompt
  - gate-suppress-help-and-skill-list
  - gate-explicit-invocation-policy
---

# gate-skills-prompt-and-help — feature

## User-visible outcome

In a work repo, the six task-workflow skills (`task-overview`,
`onboard-workflow`, `wayfinder`, `implement-task`, `finalize-task`,
`report-bug`) are **not auto-advertised**: they're stripped from the system
prompt's skills XML, hidden from `/help` / skill-list to the extent pi
allows, and an explicit `/skill:<name>` invocation is either **prevented**
or **warned-before-loading** (whichever pi's internals permit), per grilling
D3 + D4. In a personal repo, all six are advertised and invocable exactly as
today.

## User story

As the user, I want the work repo's system prompt, `/help`, and skill-list to
show none of the Y4shin task-workflow skills, and an explicit
`/skill:implement-task` there to either be blocked or clearly tell me "this
is gated here" — so the work repo's own canon is the only advertised path and
I'm not silently running the personal workflow in a work context.

## Scope boundaries

- **In:**
  - a `before_agent_start` handler (registered **only** when gated) that
    returns a `systemPrompt` with the six `<skill name="…">…</skill>` blocks
    stripped (prompt rewrite, per the idea's option (a));
  - suppression of the six from `/help` / skill-list surfaces, using whatever
    mechanism `gate-config-mechanics` confirms is available (e.g. a
    `resources_discover` result filter, or documented-as-not-possible);
  - the explicit `/skill:<name>` policy — prevent if pi exposes a hook,
    else warn via the chosen mechanism.
- **Out:** the skill *manifest* (still always loaded — pi reads
  `package.json pi.skills` regardless; the idea confirms an extension can't
  subtract from it). The trade-off is accepted: the skills remain on disk
  and `/skill:name` expansion finds them in the loaded set.
- **Out:** gating tools/injection (`gate-tools-and-injection`).

## Acceptance criteria

- **System prompt (D3):** when gated, the `before_agent_start` rewrite
  returns a prompt containing **none** of the six skill names in `<skill …>`
  blocks. Assert by string search on the rewritten prompt in an integration
  test with a fixture prompt containing all six. When not gated, **no**
  rewrite handler is registered (the personal path is untouched — the
  factory registers the strip handler only in the gated branch).
- **`/help` / skill-list (D3):** the six do not appear on the `/help` /
  skill-list surface in a work repo. If `gate-config-mechanics` confirms the
  surface reads from the loaded set and there is an interception point
  (e.g. `resources_discover`), use it. If there is no interception point,
  document the residual explicitly in the task result and in
  `gate-config-docs-and-defaults` as a known limitation; the acceptance
  criterion becomes "documented + prompt-stripped" rather than "fully
  hidden".
- **Explicit invocation (D4):** in a work repo, `/skill:implement-task`
  (and the other five) either (preferred) does not execute the skill, or
  (fallback) executes after printing a one-line "task-workflow is gated in
  this work repo" notice. The chosen behaviour is the one
  `gate-config-mechanics` confirms is mechanically possible. Assert the
  chosen behaviour in an integration test.
- No new runtime deps. `npm test` + `npm run typecheck` pass.

## Existing abstractions to use

- `before_agent_start` already returns `{ systemPrompt }` in this codebase
  (the guidelines injection does exactly that). The strip handler uses the
  same return shape; it just removes blocks instead of appending.
- The skill names are a constant list (`["task-overview",
  "onboard-workflow", "wayfinder", "implement-task", "finalize-task",
  "report-bug"]`) — source them from `package.json` `pi.skills` at load
  (read the manifest) rather than hardcoding, so a future seventh skill is
  gated automatically. But keep a pinned fallback list and a diagnostic if
  the manifest read fails.
- `gate-config-mechanics` is the authority on whether `before_agent_start`
  gets the *full* prompt (rewrite-safe) or an *append*; the strip handler
  only works if it's the full prompt. Confirm before implementing.

## Architecture / domain decisions

- **Strip by name, fail loud.** Per the idea: pin the strip to the six
  names and the exact `<skill name="…">…</skill>` format pi emits
  (`formatSkillsForPrompt`). If the format ever stops matching, log a
  diagnostic (do not silently leave the skills advertised). A regex like
  `/<skill name="(?:name1|name2|…)">[\s\S]*?<\/skill>\n?/g` is the expected
  tool.
- **Register the strip handler only when gated.** The factory's
  `if (gate.active) pi.on("before_agent_start", stripHandler)` is the
  mirror of `gate-tools-and-injection`'s `if (!gate.active)
  pi.on("before_agent_start", injectionHandler)`. Exactly one of them
  registers, never both, never neither (a work repo strips; a personal
  repo injects).
- **D4 prevention vs warning** is decided by `gate-config-mechanics`:
  if `_expandSkillCommand` (`agent-session.js`) can be intercepted or a
  `tool_call`/`input` hook can refuse the expansion, prevent; else warn via
  the `input` or `tool_call` event. Do not invent a new hook.

## Slice plan

Three slices; each independently verifiable, each leaves the factory
working.

### 1 — `gate-strip-skills-from-prompt` (size: m, blocked_by: [])

The `before_agent_start` strip handler, registered only when gated. Reads
skill names from `package.json` `pi.skills`, strips the matching
`<skill …>` blocks from the rewritten prompt, logs a diagnostic if the
format doesn't match. Integration test with a fixture prompt.

### 2 — `gate-suppress-help-and-skill-list` (size: m, blocked_by: ["gate-strip-skills-from-prompt"])

Suppress the six from `/help` / skill-list using the mechanism
`gate-config-mechanics` confirms. If none exists, this slice produces the
documented-limitation note and a test asserting the limitation is
recorded. Either way, it ends with a clear, tested outcome for the
`/help` surface.

### 3 — `gate-explicit-invocation-policy` (size: m, blocked_by: ["gate-suppress-help-and-skill-list"])

Implement the D4 policy (prevent preferred, warn fallback) using the
hook `gate-config-mechanics` confirms. Integration test: in a work repo,
`/skill:implement-task` is blocked or warned (assert the chosen
behaviour); in a personal repo, it loads normally.
