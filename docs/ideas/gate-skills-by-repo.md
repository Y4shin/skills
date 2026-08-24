---
kind: idea
title: Gate task-workflow skills/tools/injection by repo (no work-repo config)
slug: gate-skills-by-repo
status: open
created_at: 2026-08-24T12:00:00Z
---

# Gate task-workflow resources by repo (auto-disable in work repos)

## The problem

`task-workflow` is a **global** pi package (`~/.pi/agent/settings.json` →
`packages: ["git:github.com/Y4shin/skills", ...]`). Because it's global, all six
of its skills (`task-overview`, `onboard-workflow`, `wayfinder`,
`implement-task`, `finalize-task`, `report-bug`), all its `task_*` tools, the
`notify_user` / `get_guidelines` / `list_guidelines` tools, and the
`before_agent_start` system-prompt injection (guidelines/subagent checks) load
in **every** repo — including work repos (QNCGmbH on GitHub, anwaltde on
Bitbucket).

In a work repo none of that belongs: the work repo has its own engineering
canon (anwalt.de's `engineering-workflow` skills + `.cursor/rules/...`), the
`task_*` tools write to a `docs/tasks/` tree the work repo doesn't use, and the
injected guidelines/subagent text clutters the system prompt. The user wants
all of it to **disappear in work repos with zero config in those repos** — the
gating must live on the global/personal side, driven by a signal pi can read
from the repo itself.

## Outcome

In a work repo (origin matches a configurable regex set), `task-workflow`:

- registers **no `task_*` tools** and **no `notify_user`/`get_guidelines`/
  `list_guidelines` tools** (keeps the model's tool list clean),
- keeps its six skills out of the system prompt (not advertised for
  auto-invocation; `/skill:<name>` still works because skill-command expansion
  reads the loaded set, not the prompt),
- runs **no `before_agent_start` system-prompt injection**.

In a personal repo, everything works exactly as today (skills advertised,
tools registered, injection runs). `/skill:<name>` works everywhere either way.

## Detection — regex over the normalized `provider/org/repo` remote

The gate reads the repo's `origin` remote URL (walking up from cwd to the repo
root), normalizes it to `provider/org/repo`, and tests it against a list of
regexes from configuration. Default work-org patterns:

```
^github\.com[:/]QNCGmbH/.*$
^bitbucket\.org[:/]anwaltde/.*$
```

Normalization handles both SSH (`git@github.com:QNCGmbH/openai.git`) and HTTPS
(`https://github.com/QNCGmbH/openai.git`) forms by stripping scheme, auth,
`.git` suffix, and collapsing the host/path separator to `/` — so the regex
matches `github.com/QNCGmbH/openai` regardless of transport. A repo with **no**
`origin` remote (or no `.git`) is treated as personal (not work) — the gate
opt-ins on the remote, not on the absence of one.

Examples (verified):

- `~/Projects/openai` → `git@github.com:QNCGmbH/openai.git` → `github.com/QNCGmbH/openai` → **work** ✓
- `~/Projects/plai-api` → `git@bitbucket.org:anwaltde/plai-api.git` → `bitbucket.org/anwaltde/plai-api` → **work** ✓
- this repo (`~/.pi/agent/git/github.com/Y4shin/skills`) → `github.com/Y4shin/skills` → personal ✓

## Configuration

A single config key, read by the extension at startup, listing the regexes
that mark a repo as "work" (disable the package there). Lives in the
**global** settings (`~/.pi/agent/settings.json`) so it applies everywhere with
no per-repo file. Proposed key + shape:

```jsonc
// ~/.pi/agent/settings.json
{
  "taskWorkflow": {
    "disableOnRepo": [
      "^github\\.com[:/]QNCGmbH/.*$",
      "^bitbucket\\.org[:/]anwaltde/.*$"
    ]
  }
}
```

- `disableOnRepo`: array of regex strings tested against the normalized
  `provider/org/repo` remote. Empty / absent → gate disabled (current
  behaviour; everything loads everywhere). The regexes are matched with the
  JS `RegExp` `test()`; an invalid regex is reported via the extension's
  startup diagnostics and skipped.
- The key name (`taskWorkflow`) mirrors the package name; the extension reads
  it from the settings manager (the same path every pi extension reads user
  config). If pi's settings schema doesn't allow arbitrary top-level keys, the
  fallback is a section under an existing extension-config namespace — confirm
  during implementation.

## Design — all gating in the one existing extension (`src/pi.ts`)

`task-workflow` already ships one extension entry point (`package.json` →
`pi.extensions: ["./src/pi.ts"]`) whose default export is the factory
`function (pi: ExtensionAPI)`. All gating belongs in that one file, so the
gate travels with the thing being gated.

### When the gate runs (and why this is the right hook)

The factory is invoked by pi at load time **with the cwd already resolved**
(pi's extension cache is keyed by cwd and cleared on cwd change —
`useExtensionCacheCwd` in `dist/core/extensions/loader.js`). That means the
factory itself can run the detection synchronously at the top, before any
`pi.registerTool(...)` or `pi.on(...)` call, and **simply skip them** in a work
repo. No late unregistration, no per-turn filtering — the cleanest path,
because it never registers the things in the first place.

```
export default function (pi: ExtensionAPI) {
  const workRepo = isWorkRepo(process.cwd(), disableOnRepoPatterns);

  if (!workRepo) {
    for (const [name, def] of Object.entries(tools)) pi.registerTool(...);
    pi.registerTool(notify_user, ...);
    pi.registerTool(get_guidelines, ...);
    pi.registerTool(list_guidelines, ...);
  }

  if (!workRepo) {
    pi.on("before_agent_start", guidelinesInjectionHandler);
  }
  // skills: declared in package.json pi.skills — see "Skills" below
}
```

### What gets gated (the three resources)

1. **Tools** — the `for` loop over `createTools()` (all `task_*` tools) **and**
   the three `pi.registerTool` calls for `notify_user`, `get_guidelines`,
   `list_guidelines` are wrapped in `if (!workRepo) { ... }`. They never
   register in a work repo, so the model never sees them and can't call them.
   (`setActiveTools` exists but is for *narrowing* the active set per turn;
   not-registering is simpler and keeps the registry clean.)
2. **`before_agent_start` injection** — the existing
   `pi.on("before_agent_start", ...)` handler that appends the guidelines /
   "Use list_guidelines()" text is wrapped in `if (!workRepo)`. In a work repo
   it's never registered, so no injection.
3. **Skills** — the six skills are declared in `package.json` under
   `pi.skills`, so pi **loads** them regardless (the manifest is always read;
   an extension can't subtract from it — confirmed: `resources_discover` is
   additive-only, `skillsOverride` is a caller-only option not exposed to
   extensions). Two ways to keep them out of the work-repo system prompt:
   - **(a) Prompt rewrite** — register a `before_agent_start` handler *only in
     a work repo* that returns a `systemPrompt` with the six `<skill>` entries
     stripped (text-based, by skill name). `/skill:<name>` still works (it
     reads the loaded set via `_expandSkillCommand`, not the prompt).
   - **(b) `disable-model-invocation`** — but it's static (frontmatter), not
     conditional, so it would hide them in personal repos too. Not viable.
   - → **Use (a).** Implementation note: the strip must target the exact
     skills-XML format pi emits (`formatSkillsForPrompt` →
     `<skill name="…">…</skill>` blocks); pin to the six names and log if the
     format ever stops matching so it fails loud, not silent.

### What is NOT gated

- `/skill:<name>` expansion — in both repo types, because skill commands read
  from the *loaded* skill set (`_expandSkillCommand` →
  `resourceLoader.getSkills()`), which is unaffected by the prompt strip. So
  even in a work repo, `/skill:implement-task` still loads the skill on
  explicit demand. (Acceptable: explicit invocation is deliberate; the gate is
  about auto-advertising, not forbidding.)
- The `task_*` tool implementations themselves (they're just not registered).
- Other global packages (pi-aura, pi-subagents, etc.) — only this package
  gates itself.

## Detection helper — `isWorkRepo(cwd, patterns)`

```
function isWorkRepo(cwd, patterns) {
  if (!patterns?.length) return false;
  const origin = readOriginRemote(cwd);          // git remote get-url origin, walk up to .git
  if (!origin) return false;                     // no origin → personal
  const normalized = normalizeRemote(origin);    // → "github.com/QNCGmbH/openai"
  return patterns.some(p => {
    try { return new RegExp(p).test(normalized); }
    catch { /* invalid regex: skip + diagnostics */ return false; }
  });
}
```

- `readOriginRemote`: walk up from `cwd` to find `.git`, run
  `git remote get-url origin` (or read `.git/config` if shelling out is
  undesirable). Cache per session keyed by repo root so it's cheap on repeat.
- `normalizeRemote`: strip `scheme://`, `user@`, trailing `.git`, collapse
  `:` to `/` between host and path, lowercase the host. SSH and HTTPS then
  produce the same `provider/org/repo` string.
- Invalid regex in `disableOnRepo` → the extension emits a startup diagnostic
  (pi surfaces these) and skips that pattern, rather than crashing.

## Test plan

- **Unit (`tests/`)**: `normalizeRemote("git@github.com:QNCGmbH/openai.git")`
  → `"github.com/QNCGmbH/openai"`; the HTTPS variant; a no-origin cwd;
  an empty-patterns config (gate disabled → personal); a matching pattern
  (work); a non-matching (personal).
- **Integration (manual, in the two example repos)**:
  - In `~/Projects/openai` (QNCGmbH): start pi; confirm no `task_*` tools in
    the tool list, no `task-overview`/`implement-task`/etc. in the system
    prompt's skills XML, and no guidelines injection. `/skill:implement-task`
    still loads.
  - In `~/Projects/plai-api` (anwaltde): same.
  - In this repo (`Y4shin/skills`, personal): confirm all six skills
    advertised, all `task_*` tools registered, injection runs — i.e. unchanged.
  - With `disableOnRepo: []` (or key absent) in `~/.pi/agent/settings.json`:
    everything loads everywhere (current behaviour).

## Constraints

- **No work-repo config.** The gate reads only global settings + the repo's
  own `origin`. Nothing is written into the work repo.
- **No new extension.** All gating in `src/pi.ts`; no second file, no
  `~/.pi/agent/extensions/` entry.
- **Detection is remote-based, not content-based.** Matching `.cursor/rules/`
  or `AGENTS.md` would be fragile (a personal repo could have an anwalt.de rule
  tree). The git origin is unambiguous and survives renames within the org.
- **Skills can't be un-loaded** (manifest is always read); they can only be
  hidden from the prompt. Accept that trade-off — `/skill:name` still works.
- **Regexes are JS `RegExp`.** Don't invent a mini-DSL; `disableOnRepo` is a
  list of strings compiled with `new RegExp(string)`.

## Open questions for grilling

- Q1 — Should `notify_user` be gated too, or is it repo-agnostic enough to
  keep everywhere? (Current draft: gate it, for a clean work-repo context.
  But it's arguably a general utility, not task-workflow-specific.)
- Q2 — The config key `taskWorkflow.disableOnRepo` assumes pi's settings
  schema accepts an arbitrary top-level object. If it doesn't, where does
  the config live? (Fallback candidates: under an existing
  extension-config namespace, or a small `~/.pi/task-workflow.json` file
  the extension reads itself.)
- Q3 — Should the gate also suppress the six skills' **descriptions** from
  pi's `/help` / skill-list surfaces (not just the system prompt), or is
  prompt-stripping enough? (The `/help` surface may read from the loaded set,
  not the prompt — needs a check.)
- Q4 — When the user runs `/skill:implement-task` in a work repo, should it
  warn ("you're in a work repo; task-workflow is gated here") before loading,
  or load silently? (Current draft: load silently — explicit is explicit.)

## Notes

- Verified against pi 0.80.10 source (`dist/core/extensions/loader.js`,
  `dist/core/extensions/runner.js`, `dist/core/agent-session.js`,
  `dist/core/resource-loader.js`, `dist/core/skills.d.ts`): the factory
  receives cwd at load time; `resources_discover` is additive-only;
  `skillsOverride` is caller-only; `formatSkillsForPrompt` excludes
  `disableModelInvocation: true` skills but that flag is static;
  `before_agent_start` can return a `systemPrompt` to rewrite the turn;
  `/skill:name` expansion reads from the loaded skill set, not the prompt.
- The anwalt.de `engineering-workflow` package (pi-aura) has the *inverse*
  concern (its 14 skills should not advertise in non-anwalt.de repos) but
  that's a separate gate in a separate package; this spec is only the
  Y4shin side.
- Related: this is the mirror of the "gate anwalt.de skills to anwalt.de
  repos" idea discussed in the pi-aura repo — both gates use the same
  remote-origin detection, just opposite default directions.
