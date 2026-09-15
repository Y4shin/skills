---
kind: task
type: prototype
slug: pi-headless-isolation-spike
title: Spike - prove hermetic headless pi runs for evals
map: pi-harness-evals
status: done
blocked_by: []
---

## Decision to settle

Prove (or disprove) that a headless `pi -p` run can be made **hermetic**:
only the under-test skills, extensions, and the pinned model load, with no
system-state pollution (no global skills, no global extensions, no user
context files, no stray packages). The own-auth + local runner architecture
commits only if the spike shows clean isolation.

## Context

The prior-art repo (`~/Projects/agent-plugins-evals/`) runs pi on the host
with its own auth (Inspect orchestrates, pi runs in a temp-dir fixture
copy). Its isolation levers were: `.pi/settings.json` with `packages: []`,
fixture-local skill dirs via `--skill <dir>`, extensions via `-e <path>`,
and disabling flags. But it never proved the isolation end to end: it
disabled everything and then selectively re-enabled the plugin under test.
The user's requirement is sharper: the eval must be able to load **only**
the under-test resources, and it must be **provable** that nothing else
leaked in.

Candidate levers to test (from the session research + pi docs):

- `--no-extensions`, `--no-skills`, `--no-context-files`, plus
  `--no-prompt-templates`, `--no-themes` (the prior art's full disable set)
- selective enablement: `-e <path>` for the extension under test,
  `--skill <dir>` for the skill under test
- project-local `.pi/settings.json` in the fixture with `packages: []`
- `HOME` override to a temp dir (kills `~/.pi/agent/*` globals); test what
  breaks (auth!) and what survives
- `--approve` / `defaultProjectTrust` for non-interactive project trust
- model pinning: project-local `.pi/models.json` (OpenAI-compatible) or
  `--model` flag; how subscriptions behave when `HOME` is overridden
- an instrumented canary extension that logs which resources pi loaded
  (skills, extensions, prompts, themes, context files) at startup, giving
  a hard "what loaded" list to assert against

## The single design or behavior question

Can a `pi -p` invocation, configured purely from a temp-dir fixture plus
CLI flags, be proven to load exactly the intended resource set (pinned
model + under-test skill/extension + nothing else), and can a leaked
global resource be detected when deliberately planted?

## The alternatives worth comparing

- **Flags-only isolation** (`--no-*` + selective enablement): simplest,
  expected to work, but must be verified (does `--skill <dir>` survive
  `--no-skills`? do user-level skills leak if `HOME` is left alone?).
- **HOME override + flags**: strongest (kills all user globals including
  auth), but requires re-establishing auth in the temp HOME (subscription
  login files? API keys?) and may break subscription-based models.
- **Instrumented canary extension**: an extension listening for
  resource-load events that writes a manifest of everything loaded; makes
  isolation **assertable** rather than assumed. Slight risk: the canary
  itself is an extension the eval must load, so it must be subtracted in
  the assert.

Compare by running each lever combination against a fixture with a
**deliberately planted leak** (e.g. a user-level skill with a known name in
the real `HOME`, or a global extension) and checking the detection path
catches it.

- **Fallback if isolation cannot be proven on-host**: the docker/bridge
  architecture (rejected as default) or a documented "isolation best-effort"
- The smallest artifact: a throwaway spike script + short findings file
  recording the proven flag set, the observed loads, and the recommended
  isolation recipe, stored in this task's directory.

## Who must react

The user reacts to the spike's findings file (recommended recipe) before
the to-spec design for `build-eval-creator-skill` is drafted. The spike
does not build production code; it answers the question and stops.

## The decision or implementation tasks it should unblock

- `build-eval-creator-skill` (feature): the runner's isolation recipe and
  the canary/assert mechanism become part of its arch spec.
- The research task (`eval-stack-research`) provides the verified flag
  semantics; the spike consumes them and produces the recipe.

## Keep it throwaway

The spike script, canary extension, planted leaks, and findings file are
throwaway artifacts. Production implementation (the scaffold's Python
lib, the eval-creator skill body) belongs to the feature task created
after this decision.
