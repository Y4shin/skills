# Findings: pi-headless-isolation-spike

**Question:** Can a headless `pi -p` run be made hermetic (only under-test
skills/extensions + pinned model load, nothing from system state), and can
leaks be *proven* absent rather than assumed?

**Answer: Yes.** The own-auth + local runner architecture is committed on
this evidence. The recipe below loads exactly what the eval specifies; a
canary extension makes the loaded set assertable; planted leaks are
detected by both the canary (skills) and stderr (extensions).

## The proven isolation recipe

```
PI_CODING_AGENT_DIR=<temp agent dir> \
  pi -p --no-session --mode json \
    --no-extensions --no-skills --no-context-files \
    --no-prompt-templates --no-themes \
    -e <canary.ts> [-e <under-test-extension>...] \
    --skill <under-test-skill> [--skill <fixture-skill>...] \
    --no-approve \
    <prompt>
```

with cwd = the fixture repo (in a temp dir, **outside any git repo root**),
and the temp agent dir seeded with exactly three files from the real one:

| File | Why |
|---|---|
| `auth.json` | Credentials. Without it the run dies with "No API key found for the selected model" (exit 1). Redirecting the agent dir kills auth; it must be re-seeded. |
| `models.json` | The provider catalog (custom providers like requesty live here; built-in providers also need it for model lists). |
| `settings.json` | Copied with `packages: []` (and stripped of anything else the eval does not want), so no package resources resolve. |

Nothing else is copied: no `skills/`, no `extensions/`, no `trust.json`.

## What each lever actually does (verified empirically, pi 0.84.4)

| Lever | Verified effect |
|---|---|
| `PI_CODING_AGENT_DIR` | Redirects the entire config dir (skills, extensions, packages, settings, models, auth, trust). User globals become invisible. |
| `--no-skills` | Kills *all* skill discovery: user-global, package, **and trusted project-local**. Project skills do not load even with `--approve`. |
| `--skill <path>` | Additive even under `--no-skills` (matches the docs); repeatable. This is the only way a skill loads in the hermetic recipe. |
| `--no-extensions` + `-e <path>` | Same relationship for extensions: discovery dies, explicit `-e` still loads. |
| `--approve` / `--no-approve` | Governs whether project-local resources (`.pi/skills`, `.pi/settings.json`, `.agents/skills` walking up to the repo root) load *when discovery is on*. With `--no-skills` it is irrelevant for skills; with discovery on, `--approve` pulls in **everything project-local**, including ancestor `.agents/skills` from any enclosing repo (observed: this repo's `impeccable` leaked into a fixture placed inside it). |
| `--no-context-files` | No AGENTS.md/CLAUDE.md loaded, verified even when the fixture has its own AGENTS.md and cwd is inside a repo with AGENTS.md at the root. |
| `--no-prompt-templates --no-themes` | Same family; included for completeness. |
| `--no-session` | No session JSONL written to the agent dir. |
| `--mode json` | Structured event stream on stdout: session header first, `agent_end` on completion, exit 1 + stderr on config errors (e.g. missing auth). This is the runner's completion/error channel. |

## Evidence from the recipes (pi 0.84.4, this host)

| Recipe | Loaded skills | Verdict |
|---|---|---|
| r0: real agent dir + all isolation flags | `under-test` only | Flags alone suffice to exclude user globals, even against the real home. But this relies on knowing every resource type; a missed flag leaks. |
| r1: fake agent dir, **no** isolation flags (positive control) | `leak-sentinel` + `under-test`, planted extension fired | Detection works: canary sees skill leaks via `systemPromptOptions.skills`; extension leaks visible on stderr. |
| r2: fake agent dir + isolation flags + `--no-approve` | `under-test` only | **The recipe.** No leak-sentinel, no project skill, no context files. |
| r3: fake agent dir + isolation flags + `--approve` | `under-test` only | Confirms `--no-skills` overrides `--approve` for skills. |
| probe A: fake dir + `--approve`, no `--no-skills`, cwd in fixture (inside this repo) | `proj-skill` + `impeccable` + `leak-sentinel` + `under-test` | `--approve` honors project trust, but ancestor `.agents/skills` discovery leaks enclosing-repo skills; user globals leak too. Not usable for isolation. |
| probe B: fake dir, no flags, cwd in fixture | `leak-sentinel` + `under-test` | Project-local skills correctly absent without a trust decision. |

## Key findings (beyond the recipe)

1. **Everything-explicit beats flags-only.** R0 shows the flags alone exclude
   globals, but each resource type needs its own flag and a missed one leaks.
   The fake-agent-dir recipe makes the default *nothing*, and the eval adds
   exactly what it wants. Failures are then visible (missing auth, missing
   skill) rather than silent contamination.
2. **Project-local skills cannot be isolated via trust.** `--approve` is
   all-or-nothing across project-local resources, and once discovery is on,
   ancestor `.agents/skills` leaks enclosing repos. If an eval wants the
   fixture's own skills in the treatment, pass them via `--skill` explicitly.
3. **Fixtures must live outside any git repo root.** A fixture inside a repo
   inherits that repo's `.agents/skills` (and AGENTS.md via context discovery)
   whenever discovery flags are off or trust is granted. Temp-dir placement
   is part of the isolation contract.
4. **Auth is the one thing that must be re-seeded.** `PI_CODING_AGENT_DIR`
   with a bare dir fails immediately (exit 1, "No API key found"). The recipe
   copies `auth.json` + `models.json` and a stripped `settings.json`. API-key
   providers would work via env vars instead; subscription/OAuth auth lives
   in `auth.json`.
5. **The canary is the assertion instrument.** `session_start` /
   `before_agent_start` expose `event.systemPromptOptions` with `.skills`,
   `.contextFiles`, `.selectedTools`. The eval runner loads a canary
   extension that dumps this; the eval asserts the loaded set equals the
   intended set. The canary itself must be subtracted from the assert (it is
   loaded via `-e`). Extension leaks are additionally visible via stderr.
6. **Model pinning** comes from the seeded `settings.json`
   (`defaultProvider`/`defaultModel`) or `--model provider/id` on the command
   line; `models.json` defines the available catalog. Both are inside the
   redirected agent dir, so the eval owns the model list.

## Consequences for dependents

- `build-eval-creator-skill` (future feature): the runner solver implements
  the recipe above; the fixture prep creates the temp agent dir + seeded
  files; the canary becomes a small, assertable guard in the scaffold's
  shared lib (subtracted from asserts). Baseline runs use the same recipe
  minus `--skill <under-test>` / `-e <under-test-extension>`; the difference
  between the two commands is exactly the treatment.
- `eval-stack-research` (research, in flight): confirmed the `--skill`
  additive behavior empirically; the findings file should reference this
  spike rather than re-deriving it.
- pi-mode detail for the runner: use `--mode json`, watch for `agent_end`,
  treat nonzero exit or missing `agent_end` as a failed run.

## Rejected alternatives

- Flags-only isolation against the real agent dir (r0): works today, but
  every resource type is a separate flag and any missed flag silently
  contaminates; also leaks auth into the eval process's real config.
- `--approve` + project discovery for fixture-local skills (probe A):
  uncontrollable; ancestor `.agents/skills` leaks the enclosing repo.
- docker/bridge: unnecessary for the isolation requirement; remains the
  future option for strict model pinning through the bridge proxy.

## Artifacts

- `spike/canary.ts`: the canary extension (kept as the reference
  instrument; the production version lives in the eval-creator scaffold).
- `spike/run-spike.sh`: the recipe driver + assertions (rerunnable).
- `spike/results/`: deleted after each run (contains a seeded copy of
  `auth.json`; never commit or keep it).
