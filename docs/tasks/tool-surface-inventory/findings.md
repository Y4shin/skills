---
kind: finding
task: tool-surface-inventory
map: task-tools-overhaul
date: 2026-09-14
---

# Tool surface inventory: contract-level catalog

Source of truth: the working tree at commit `d20b00b` plus uncommitted
in-flight changes (labeled [IN-FLIGHT] where they matter). Every entry cites
`file + function + line` so R2 and G1 can verify a claim without re-reading
the extension. `src/pi.ts` is 1065 lines in the working tree.

Quoting convention: tool outputs and error messages are quoted verbatim
with one exception, the repo's no-em-dash rule: the em-dash character in
the extension's own runtime strings (e.g. `tw_map_tick`'s `→ done`,
`tw_state_set`'s error text, `tw_show`'s map output) is transcribed
as a plain hyphen.

Live verification: run against a real `pi -p` session with only this
extension loaded (`-ne -e src/pi.ts`) in (a) an ungated personal repo and
(b) a fake work repo gated by origin pattern and by
`.pi/settings.json` `taskWorkflow.enable`. The ungated session exposes
exactly 20 extension tools: 17 `task_*` + `notify_user`, `get_guidelines`,
`list_guidelines`; the gated session exposes zero (confirmed twice, both
gating mechanisms). Full details in "Live cross-check" below.

## 1. Registration overview

The single extension entry point is `src/pi.ts`, `export default function
(pi: ExtensionAPI)` (line 731). It is registered by `package.json`
`pi.extensions: ["./src/pi.ts"]`. At load it resolves the repo gate once:
`resolveGate(process.cwd())` (src/pi.ts:734, src/core/repo-gate.ts:369
`resolveGate`), catching any throw and failing open to
`gate.active = false` with a diagnostic (src/pi.ts:735-742).

Everything the extension registers is conditional on `gate.active`:

- `gate.active === false` (personal repo): register all 17 `task_*` tools
  (loop at src/pi.ts:747-773 over `createTools()`, src/pi.ts:459),
  `notify_user` (src/pi.ts:777), `get_guidelines` (src/pi.ts:1008),
  `list_guidelines` (src/pi.ts:1044); subscribe
  `before_agent_start` guidelines injection (src/pi.ts:984).
- `gate.active === true` (work repo): register no tools; subscribe
  `before_agent_start` skill-strip (src/pi.ts:1003) and `input`
  invocation gate (src/pi.ts:1004).
- Both directions: subscribe `session_start` (src/pi.ts:958) and
  `session_compact` (src/pi.ts:981).

### Registration-condition table

| Surface | gate.active === false (personal) | gate.active === true (work) |
| --- | --- | --- |
| 17 `task_*` tools | registered | not registered |
| `notify_user` | registered | not registered |
| `get_guidelines` | registered | not registered |
| `list_guidelines` | registered | not registered |
| `session_start` hook | registered (peer checks run) | registered (peer checks skipped after notify) |
| `session_compact` hook | registered | registered (no-op for the gate) |
| `before_agent_start` guidelines injection | registered | not registered |
| `before_agent_start` skill-strip | not registered | registered |
| `input` `/skill:` gate | not registered | registered |

### Shared plumbing (cited once, referenced by tools)

- `findRoot(start)` (src/pi.ts:174): walks up from the tool's
  `ctx.directory` to the first dir containing `docs/tasks` or `.git`;
  returns the start dir unchanged when neither is found. All task tools
  resolve artifacts relative to this root.
- `taskRoot(root)` (src/pi.ts:185): `<root>/docs/tasks`.
- `resolveArt(root, selector, want?)` (src/pi.ts:225): the universal
  resolver. Tries selector as an existing path (relative to cwd, or
  absolute; a directory arg auto-picks `map.md` then `task.md` inside it,
  src/pi.ts:234-237), parses frontmatter, enforces `want` kind only on the
  explicit-path branch (src/pi.ts:241). Falls back to a slug scan over all
  `maps/<sub>/map.md` and all task dirs' `task.md` (src/pi.ts:252-270),
  matching `art.slug === selector` or directory basename. If no hit and
  `want` is not `map`/`task`, scans the active task's
  `slices/<n>-*.md` (state.yaml `task` pointer, src/pi.ts:276-296) then
  all tasks' slices dirs (src/pi.ts:298-315). Throws `ResolutionError` on
  zero hits ("no <kind> matches '<selector>'") or on multiple hits
  ("'<selector>' is ambiguous - matches multiple artifacts", src/pi.ts:322).
  Edge cases verified live: slug scan skips `archive/` and `maps/` (the
  `skip` set at src/pi.ts:258, and `listSubdirs` src/pi.ts:212), so an
  archived slug is invisible to slug resolution but an explicit path to
  `docs/tasks/archive/<slug>/task.md` still resolves and works.
- `activeSlices(root, taskSlug)` (src/pi.ts:326): reads only the legacy
  directory `<task>/slices/`, only files matching `SLICE_RE =
  /^(\d+)-(.+)\.md$/` (src/pi.ts:172), skipping `archive` and dotfiles.
  Never reads a `slices:` frontmatter list.
- `loadState` / `saveState` (src/pi.ts:400/406): read/write
  `<root>/docs/tasks/state.yaml` via `fromObject`/`toObject`
  (src/core/state.ts:35/20). `saveState` rewrites the whole file, dropping
  every key outside `{task, slice}`.
- `mapChildInfos(root, mapPath)` (src/pi.ts:372): reads a map's `tasks:`
  frontmatter; for each child slug calls `taskPathForSlug`
  (src/pi.ts:359) which returns null when `<slug>/task.md` does not exist
  (spec-only directories). Map-listed `blocked_by` overrides the task
  file's own list, and map-listed `done: true` overrides the task's status
  (src/pi.ts:385-390). Children with no task file are silently dropped
  from the info list.
- Tool wrapper: `def(description, args, exec)` (src/pi.ts:450) plus the
  schema builder loop (src/pi.ts:747-773): plain `{type, description,
  optional, enum}` descriptors become TypeBox `Type.String` /
  `Type.Boolean` / `Type.Array(Type.String)`, with enums as
  `Type.Union(Type.Literal(...))` and optional flags as `Type.Optional`.
  Labels are derived mechanically: strip `task_`, underscores to spaces,
  title-case words (src/pi.ts:761), e.g. `tw_dependency_levels` ->
  label "Dependency Levels". A `json` boolean flag is a common optional
  parameter that switches the tool to JSON output.
- Generic tool error path: an executor throw surfaces as a failed tool
  call (isError) with the thrown message as text; there is no per-tool
  catch in the wrapper (src/pi.ts:767-770). Gate-detection failure at load
  is the only load-time catch (src/pi.ts:735-742).

## 2. Tool catalog (17 task_* + 3 utility tools)

All `task_*` tools are registered ungated (never in a work repo). All
three utility tools are likewise ungated. Side effects list exact paths
written; every write uses `writeFileSync(path, dump(doc))` (or YAML
serialization for state), with no backup, no git operations, and no
mkdir except where noted.

### tw_show

- Code: `createTools` entry, src/pi.ts:461-474.
- Label: "Show". Registered: ungated only.
- Parameters: `selector` (string, required, "Slug or path"); `json`
  (boolean, optional).
- Behavior: resolves via `resolveArt` and prints the artifact's
  frontmatter as `key: value` lines (arrays as JSON), or the full
  `Artifact` JSON when `json` is set.
- Side effects: none (read-only).
- Return: string as above; empty string if frontmatter is empty.
- Errors: `ResolutionError` from `resolveArt` (no match / ambiguous /
  unparseable). Verified live: a file with frontmatter but no `kind` throws
  `invalid or missing 'kind' in frontmatter: undefined` (that is the
  plain `Error` from `fromFrontmatter`, src/core/art.ts:39, rethrown
  through `parseArtifactFile`).
- Edge cases: a directory selector auto-picks `map.md`/`task.md`
  (verified live: `docs/tasks/maps/task-tools-overhaul` shows the map).
  Spec-only directories (no task.md/map.md, e.g. a dir holding only
  spec.md) throw `not a recognised artifact` (verified live against
  `docs/tasks/build-eval-creator-skill`).

### tw_get

- Code: src/pi.ts:475-483.
- Label: "Get". Registered: ungated only.
- Parameters: `selector` (string, required); `field` (string, required,
  "Field name").
- Behavior: resolves, returns `String(doc.data[field])` or `""` when the
  field is absent (verified live: missing field returns empty string).
- Side effects: none.
- Return: the field as a string; objects become `"[object Object]"`.
- Errors: `ResolutionError` from resolution; no field validation.
- Edge cases: none beyond resolution.

### tw_set

- Code: src/pi.ts:485-502.
- Label: "Set". Registered: ungated only.
- Parameters: `selector` (string, required); `field` (string, required);
  `value` (string, required, "New value").
- Behavior: auto-types the string value: `"true"`/`"false"` -> boolean,
  `"null"` -> null, integer regex -> parseInt, decimal regex -> parseFloat,
  else string. Writes the field into the frontmatter and rewrites the
  whole file.
- Side effects: rewrites the resolved artifact file in place (e.g.
  `docs/tasks/<slug>/task.md`).
- Return: `<field> = <raw value string>`.
- Errors: `ResolutionError` on resolution failure.
- Edge cases: any field name is accepted (no schema validation); the
  auto-typing is on the raw string, so a title "42" becomes the integer 42
  (lossy). Verified live.

### tw_set_slices

- Code: src/pi.ts:504-513.
- Label: "Set Slices". Registered: ungated only.
- Parameters: `selector` (string, required, "Task slug or path"); `slugs`
  (array of string, required, "Slice slug").
- Behavior: sets `slices:` frontmatter of a task (resolved with
  `want="task"`) to the given slug list and rewrites the file.
- Side effects: rewrites the task file.
- Return: `slices: [a, b]`.
- Errors: `ResolutionError` (including kind mismatch on the explicit-path
  branch).
- Edge cases: nothing in the extension ever reads `doc.data["slices"]`
  back (grep confirms the only read/write sites are this tool's lines
  510-512). Verified live: after `tw_set_slices`, `tw_slices`,
  `tw_finalizable`, and `tw_dependency_levels` still see only legacy
  `slices/<n>-*.md` files. The written list is write-only data.

### tw_resolve

- Code: src/pi.ts:516-522.
- Label: "Resolve". Registered: ungated only.
- Parameters: `selector` (string, required); `kind` (string, optional,
  "map, task, or slice").
- Behavior: returns the absolute file path via `resolveArt`.
- Side effects: none.
- Return: the absolute path.
- Errors: `ResolutionError` on no match/ambiguity.
- Edge cases: when the selector resolves by slug scan, the `kind`
  parameter is not enforced (the slug branch of `resolveArt` ignores
  `want`): verified live, `tw_resolve {selector: "task-tools-overhaul",
  kind: "task"}` returns the map's path, and `{selector:
  "tool-surface-inventory", kind: "slice"}` returns the task's path.
  Spec-only directories are invisible (verified live: "no artifact matches
  'build-eval-creator-skill'").

### tw_assert_kind

- Code: src/pi.ts:525-533.
- Label: "Assert Kind". Registered: ungated only.
- Parameters: `selector` (string, required); `kind` (string enum
  [map, task, slice], required).
- Behavior: resolves, compares `art.kind`, throws on mismatch.
- Side effects: none.
- Return: `kind: <kind> - OK`.
- Errors: `ResolutionError` from resolution; plain `Error`
  (`'<selector>' has kind '<actual>', not '<wanted>'.`) on mismatch
  (verified live).
- Edge cases: no separate not-found message; resolution errors name the
  selector.

### tw_list

- Code: src/pi.ts:536-572.
- Label: "List". Registered: ungated only.
- Parameters: `kind` (string enum [map, task], optional); `status`
  (string, optional); `map` (string, optional, "Map slug filter"); `json`
  (boolean, optional).
- Behavior: when `kind` is not "task", scans `docs/tasks/maps/<sub>/map.md`;
  when not "map", scans `docs/tasks/<sub>/task.md`. Filters by `status`
  and by frontmatter `map` field. Output lines `<slug> (<kind>)
  [<status>]`, JSON array when `json`.
- Side effects: none.
- Return: "(no docs/tasks directory)" when `docs/tasks` is missing;
  "(empty)" when no matches; else the lines/JSON.
- Errors: none thrown (unparseable files are skipped).
- Edge cases: `archive/` is excluded from the task scan via the skip set
  (verified live: 32 archived task dirs, none listed). Spec-only
  directories are invisible (their names do not appear as tasks; verified
  live against this repo). Only `map`/`task` kinds are listable; slices
  cannot be listed by kind. Filtering by `map` matches the task
  frontmatter's `map:` field, not a directory relation.

### tw_slices

- Code: src/pi.ts:574-583, delegating to `activeSlices` (src/pi.ts:326).
- Label: "Slices". Registered: ungated only.
- Parameters: `selector` (string, required, "Task slug or path"); `json`
  (boolean, optional).
- Behavior: lists the task's active (non-archived) legacy slice docs as
  `<number> - <slug> [<status>]`, or JSON array of
  `{number, slug, path, status}`.
- Side effects: none.
- Return: "(no open slices)" when empty.
- Errors: `ResolutionError`; note the `want="task"` is only enforced on
  the explicit-path branch, so a map slug passes too (verified live:
  `tw_slices {selector: "task-tools-overhaul"}` -> "(no open slices)").
- Edge cases: legacy-only. A task whose `slices:` frontmatter lists slugs
  but has no `slices/<n>-*.md` files returns "(no open slices)" (verified
  live in a scratch tree). Conversely the tool never reads the
  frontmatter list. Slice files that fail frontmatter parsing are skipped
  silently.

### tw_finalizable

- Code: src/pi.ts:586-595.
- Label: "Finalizable". Registered: ungated only.
- Parameters: `selector` (string, required, "Task slug or path").
- Behavior: throws when `activeSlices` is non-empty; returns "ready to
  finalize" otherwise.
- Side effects: none.
- Return: "ready to finalize" or throw
  `task '<slug>' has <n> open slice(s): <numbers>`.
- Errors: as above; plus `ResolutionError`.
- Edge cases: same legacy-only semantics as `tw_slices`: a task with
  only a `slices:` frontmatter list is "ready to finalize" (verified
  live). A map slug also returns "ready to finalize" (kind not enforced
  on slug scan, verified live).

### tw_dependency_levels

- Code: src/pi.ts:598-626, delegating to `dependencyLevels`
  (src/core/art.ts:59) and `mapChildInfos` (src/pi.ts:372).
- Label: "Dependency Levels". Registered: ungated only.
- Parameters: `selector` (string, required, "Map or task slug").
- Behavior: for a map: takes unfinished child tasks (`status !== "done"`
  after map overrides) and computes BFS levels. For a task: takes
  non-done active legacy slices, parses each `slices/<n>-<slug>.md` for
  `size`/`blocked_by` via `sliceInfoFrom`, computes BFS levels.
- Side effects: none.
- Return: JSON `{levels, remaining_count, done_count}` where `levels` is
  an array of arrays of slugs.
- Errors: `ResolutionError` ("must resolve to a map or task" for slices).
- Edge cases: `dependencyLevels` treats blockers outside the set as
  satisfied, and when no node is ready (cycle or all-blocked) it assigns
  the whole remainder to one level to avoid deadlock (src/core/art.ts:77-80;
  verified live: a 2-cycle a<->b plus orphan c yields `[["c"],["a","b"]]`).
  Spec-only child directories are dropped by `mapChildInfos`, so they
  never appear in `remaining_count` (verified live: a map listing a
  spec-only child and a real task reports only the real task).
  Slice-level mode silently falls back to `{number, slug, status, size:
  null, blocked_by: []}` when a slice file cannot be parsed
  (src/pi.ts:617-620).

### tw_frontier

- Code: src/pi.ts:628-640, delegating to `mapChildInfos` (src/pi.ts:372).
- Label: "Frontier". Registered: ungated only.
- Parameters: `selector` (string, required, "Map slug or path", enforced
  `want="map"` on the path branch); `json` (boolean, optional).
- Behavior: children not done whose `blocked_by` are all in the done set.
- Side effects: none.
- Return: "(empty frontier)" or lines `<slug> (<type>)`, or JSON.
- Errors: `ResolutionError`.
- Edge cases: spec-only children are invisible (dropped before frontier
  computation, verified live). A task whose task.md says "ready" but
  whose map entry says `done: true` counts as done (map override,
  src/pi.ts:388-389). `done` is judged from the WorkItemInfo list, which
  itself is built from task files plus map overrides; tasks done per map
  but missing files are simply absent.

### tw_map_tasks

- Code: src/pi.ts:642-653.
- Label: "Map Tasks". Registered: ungated only.
- Parameters: `selector` (string, required, "Map slug or path"); `json`
  (boolean, optional).
- Behavior: prints the map's raw `tasks:` frontmatter entries as
  `<slug> [✓] [blocked_by: a, b]`.
- Side effects: none.
- Return: "(no child tasks planned yet)" when `tasks:` is not an array;
  else lines or the raw JSON of the tasks array.
- Errors: `ResolutionError`; on the slug-scan branch `want="map"` is
  unenforced (verified live: `tw_map_tasks` on a task slug returns "(no
  child tasks planned yet)").
- Edge cases: unlike the other map tools, this one does not look at task
  files at all, so spec-only children DO appear here (verified live:
  a spec-only child shows with its map-level done state). The ✓ is the
  map-listed `done` flag only, never the task file's status.

### tw_map_tick

- Code: src/pi.ts:655-672.
- Label: "Map Tick". Registered: ungated only.
- Parameters: `selector` (string, required, "Map slug or path");
  `task_slug` (string, required, "Child task slug").
- Behavior: finds the child entry in the map's `tasks:` array and sets
  `done: true` on it (only the first matching entry), rewrites the map
  file.
- Side effects: rewrites `<root>/docs/tasks/maps/<map>/map.md`.
- Return: `<task_slug> → done`.
- Errors: `Error` (`no task '<slug>' in map`) when the slug is absent;
  `ResolutionError` from resolution. When `tasks:` is not an array, the
  loop iterates an empty array and the same "no task" error is thrown.
- Edge cases: never writes `done: false` back; ticks are one-way. It does
  not touch the child's own task.md status field. Only the first match is
  ticked if a slug is listed twice.

### tw_map_finalizable

- Code: src/pi.ts:674-685.
- Label: "Map Finalizable". Registered: ungated only.
- Parameters: `selector` (string, required, "Map slug or path").
- Behavior: reads the map's raw `tasks:` array; throws when any entry has
  `done` falsy.
- Side effects: none.
- Return: "ready to finalize - all children done" or throw
  `unfinished children: <slugs>` (a `?` placeholder for entries missing a
  slug).
- Errors: as above; `ResolutionError`.
- Edge cases: pure frontmatter check; task files are never opened. A
  spec-only child with `done: false` in the map makes the map
  non-finalizable (verified live), but the same directory is invisible to
  `tw_resolve`/`tw_frontier`/`tw_dependency_levels` (they drop
  fileless children), so the only tools that can "see" the blocker are
  this one and `tw_map_tasks`. Conversely, an entry with no
  corresponding directory that is marked `done: true` satisfies the check.

### tw_state

- Code: src/pi.ts:687-697, delegating to `loadState` (src/pi.ts:400).
- Label: "State". Registered: ungated only.
- Parameters: none.
- Behavior: prints `task:` and `slice:` from state.yaml via
  `fromObject` (both v2 flat and v1 nested formats, src/core/state.ts:35).
- Side effects: none.
- Return: two lines `task:  <x|"(none)">` and `slice: <x|"(none)">`.
- Errors: none thrown; unreadable state.yaml yields `(none)` values
  (catch in `loadState`, src/pi.ts:403).
- Edge cases: v1 nested format (`{active: {task, slice, map}, ...}`) is
  parsed but only `task` and `slice` surface; `map` and the v1
  `last_action`/`next_action` keys are dropped on any subsequent
  `saveState`. Live-verified in this repo: state.yaml
  `{task: tool-surface-inventory, slice: None}` prints both fields.

### tw_state_set

- Code: src/pi.ts:700-713, delegating to `loadState`/`saveState`
  (src/pi.ts:400/406).
- Label: "State Set". Registered: ungated only.
- Parameters: `field` (string, required, "Field: 'task' or 'slice'");
  `value` (string, required, "New value (or 'null')").
- Behavior: string `"null"` becomes actual null; sets the field on the
  in-memory `WorkflowState`, then `saveState` serializes via `toObject`
  and rewrites the whole file.
- Side effects: rewrites `<root>/docs/tasks/state.yaml`, creating
  `docs/tasks/` first when missing (src/pi.ts:705). The rewrite drops
  every key outside `{task, slice}`.
- Return: `<field> = <value|'null'>`.
- Errors: `Error` (`unknown field '<f>' - use 'task' or 'slice'`) for any
  other field (verified live).
- Edge cases: the key-dropping is the confirmed schema_version wipe bug
  (see Confirmed facts). Verified live in a scratch tree: a state.yaml
  `{task: scratch-task, slice: null, schema_version: 3}` becomes
  `{task: scratch-task, slice: "1-slice-a"}` after
  `tw_state_set {field: slice, value: 1-slice-a}`; `schema_version` is
  gone. In this repo the working tree state.yaml has already lost its
  `schema_version: 3` (the HEAD version has it, the working tree does
  not; see In-flight changes).

### tw_context

- Code: src/pi.ts:716-723 + `artifactSchemaRef` (src/pi.ts:418) and
  `profileText` (src/pi.ts:412).
- Label: "Context". Registered: ungated only.
- Parameters: none.
- Behavior: returns a hardcoded frontmatter-schema reference string
  (task/legacy-slice/map blocks) plus `docs/tasks/profile.md` content
  when that file exists.
- Side effects: none.
- Return: the schema text; when a profile exists, `schema + "\n\n---\n\n##
  Project profile\n\n" + profile`. This repo has no
  `docs/tasks/profile.md`, so the profile branch is dormant here.
- Errors: none.
- Edge cases: the schema text ends "The map and task bodies are the
  specification; there is no separate ticket-generation phase."
  (src/pi.ts:442, verified live), contradicting the v3 two-phase
  to-spec/to-tickets flow (see Confirmed facts). The schema also calls
  the slice block "Legacy Slice", acknowledging the legacy status.

### notify_user

- Code: src/pi.ts:777-809 (registration block 775-810). Registered:
  ungated only.
- Label: "Notify User".
- Parameters: `title` (string, optional); `message` (string, required);
  `priority` (enum [low, normal, high], optional).
- Behavior: reads `~/.unipi/config/notify/config.json`; if absent
  returns "No ntfy config found." (details.sent false). If
  `cfg.ntfy.enabled` is falsy or `cfg.ntfy.topic` missing, returns "ntfy
  not enabled or no topic configured." Otherwise POSTs the message as
  text/plain to `<serverUrl|https://ntfy.sh>/<topic>` with an optional
  bearer token, Title and Priority headers (low=2, normal=3, high=5,
  default 3).
- Side effects: an outbound HTTP request to the configured ntfy server;
  no file writes.
- Return: "Notification sent." / "Failed (HTTP <n>)." / "Notification
  error: <msg>"; details carry `sent`.
- Errors: never throws; all failures are returned as text with
  `sent: false`.
- Edge cases: `process.env.HOME || "~"` falls back to a literal `~` path
  that cannot exist; unknown priority values silently become 3.

### get_guidelines

- Code: src/pi.ts:1008-1042. Registered: ungated only.
- Label: "Get Guidelines".
- Parameters: `language` (string, optional); `topic` (string, optional).
- Behavior: filters the in-memory `guidelinesCache` (populated at
  session_start by `discoverGuidelines`, src/pi.ts:909). `language`
  matches if the file name contains it or a topic equals it;
  `topic` matches if a topic contains it (all case-insensitive).
  Returns matching entries' contents joined with `---`; when nothing
  matches, returns the inlined 12-Fowler-smells `SMELL_BASELINE`
  (src/pi.ts:834-903) as a floor.
- Side effects: none (network: none).
- Return: tool content as above; the "no match" path is not an error.
- Errors: none thrown.
- Edge cases: discovery rules (src/pi.ts:909-950): `docs/testing.md`
  gets topic `testing`; files ending `-guidelines.md`,
  `-conventions.md`, `-practices.md` get the stripped suffix as topic;
  `AGENTS.md`, `CLAUDE.md`, `CONTEXT.md` at repo root get topic
  `standards`; `docs/standards.md` gets `standards`. This repo's discovery
  surface: `docs/testing.md`, `AGENTS.md`, `CONTEXT.md`. Note the
  `EXT_TO_LANG` (src/pi.ts:822) and `SKIP_DIRS` (src/pi.ts:829) constants
  are declared but never used by this implementation (dead code from an
  earlier recursive-walk design).
- In-memory cache caveat: the cache is per-session, refreshed only at
  session_start / session_compact re-inject flag; files created mid-session
  are not discovered.

### list_guidelines

- Code: src/pi.ts:1044-1062. Registered: ungated only.
- Label: "List Guidelines".
- Parameters: none.
- Behavior: lists the cache's entries as `<display-path> (topics: ...)`;
  when the cache is empty, lists only the smell baseline.
- Side effects: none.
- Return: the list text.
- Errors: none.
- Edge cases: display path is `docs/<file>` for source `docs` entries,
  bare file name for root entries (src/pi.ts:953).

## 3. Lifecycle hook catalog

Hook signatures verified against the installed
`@earendil-works/pi-coding-agent` 0.80.3 type declarations
(`dist/core/extensions/types.d.ts`): `session_start`
(SessionStartEvent, line 405; fired on startup/reload/new/resume/fork),
`session_compact` (SessionCompactEvent, line 443), `before_agent_start`
(BeforeAgentStartEvent line 514; result may replace systemPrompt, line
787-790), `input` (InputEvent line 617; result action
continue/transform/handled, line 629-637). `pi.on` overloads at
types.d.ts:842-872.

### Hook: session_start

- Code: src/pi.ts:958-979. Registered: always (both gate directions).
- Behavior: (1) rebuilds `guidelinesCache` from `ctx.cwd`;
  (2) sets `shouldInjectGuidelines = true`; (3) notifies each
  `gate.diagnostics` entry (info); (4) notifies each
  `SKILL_NAME_DIAGNOSTICS` entry (warning; from `loadGatedSkillNames`,
  src/pi.ts:38-61, when package.json `pi.skills` is missing/not an array
  of strings, falling back to the 5-name list at src/pi.ts:30); (5) when
  `gate.active`, notifies "task-workflow gate active: <reason>" and
  returns early; (6) otherwise checks `pi.getAllTools()` for a `subagent`
  tool and a `submit_feedback` tool, warning with install hints when
  absent.
- Side effects: none on disk; in-memory cache/state only; UI
  notifications.
- Failure mode: none; all steps are notify-based. Peer warnings are
  informational, not enforcement.

### Hook: session_compact

- Code: src/pi.ts:981. Registered: always.
- Behavior: sets `shouldInjectGuidelines = true` so the next
  `before_agent_start` re-injects the guidelines block after compaction.
- Side effects: none. Failure mode: none (no failure possible).

### Hook: before_agent_start, guidelines injection

- Code: src/pi.ts:984-997. Registered: ungated only
  (`!gate.active`).
- Behavior: one-shot per session/compact: if `shouldInjectGuidelines`
  (reset to false immediately) and the cache is non-empty, returns
  `{systemPrompt: event.systemPrompt + "\n\n" + lines}` where lines list
  every discovered guideline file with topics, plus pointers to
  `get_guidelines` / `list_guidelines` and an "Abide by any conventions"
  instruction. When the cache is empty it returns nothing (undefined),
  leaving the prompt unchanged.
- Side effects: none on disk; the system prompt of every fresh session in
  a personal repo gains this block.
- Failure mode: none; no try/catch but the body only reads the cache.

### Hook: before_agent_start, skill strip

- Code: `stripSkills` src/pi.ts:100-168, subscribed at src/pi.ts:1003.
  Registered: gated only (`gate.active`).
- Behavior: finds the `<available_skills>...</available_skills>` block in
  the system prompt; removes `<skill>` entries whose `<name>` is in
  `GATED_SKILL_NAMES`. If all skills are gated, drops the entire block
  including its "The following skills" preamble (blank-run aware,
  src/pi.ts:143-158). If the block or closing tag is missing, notifies a
  format-may-have-changed warning (via the first handler's ctx) and
  returns the prompt unchanged (fail-open).
- `GATED_SKILL_NAMES` source: package.json `pi.skills` basenames
  (src/pi.ts:38-61), currently all 29 promoted skills (verified live via
  the same loader logic), so in a work repo the entire package's skills
  vanish from the system prompt. [IN-FLIGHT] the list includes
  `eval-review` (added to package.json in the working tree, see
  In-flight changes).
- Side effects: none on disk.
- Failure mode: fail-open on prompt-format drift (notify + unchanged
  prompt). Known limitation (documented in docs/repo-gating.md): the
  `/help` skill-list surface still shows the skills in a work repo; the
  input gate below is the compensating control.

### Hook: input, `/skill:` invocation gate

- Code: `gateSkillInvocation` src/pi.ts:71-97, subscribed at
  src/pi.ts:1004. Registered: gated only.
- Behavior: if the input text starts with `/skill:`, extracts the name up
  to the first space; when the name is in `GATED_SKILL_NAMES`, notifies
  "task-workflow is gated in this work repo; not loading <name>"
  (warning) and returns `{action: "handled"}` (input swallowed before
  skill expansion). All other input passes through (`continue`).
- Side effects: none on disk.
- Failure mode: none. Edge cases: `/skill:name` with no space works
  (name = rest of line); `/skill:` with empty name passes through
  (continue) rather than being blocked; the comparison is exact-name,
  so `/skill:wayfinder extra` is blocked but hypothetical variants with
  path separators are not.

### Load-time gate resolution (not a hook, but load-time behavior)

- Code: src/pi.ts:732-742 calling `resolveGate` (src/core/repo-gate.ts:369).
- Behavior: `resolveGate` reads the origin remote (walk to `.git`, parse
  `.git/config` `[remote "origin"]`, or `git remote get-url origin` for
  gitfile `.git`, src/core/repo-gate.ts:106-153), normalizes it
  (scheme/user/port/colon/.git stripped, host lowercased, src/core/repo-gate.ts:61-100),
  reads global settings
  (`$PI_CODING_AGENT_DIR` or `~/.pi/agent/settings.json`) for
  `taskWorkflow.disableOnRepo` regexes and project settings
  (`<repo>/.pi/settings.json`) for `taskWorkflow.enable`
  (src/core/repo-gate.ts:239-299), and applies the truth table in
  `isWorkRepo` (src/core/repo-gate.ts:395-443): enable true -> inactive
  (forced on); enable false -> active (forced off); else pattern match ->
  active (work repo); no match or empty patterns -> inactive. No origin ->
  personal. Never throws from `resolveGate`; and even a throw in the
  extension is caught and fails open (src/pi.ts:737-742). Invalid regexes
  are skipped with diagnostics. [IN-FLIGHT] this whole config/decision
  layer is the uncommitted refactor, see In-flight changes.

## 4. Core-module notes

### src/core/art.ts (104 lines)

- `Artifact` model (line 29-35): `{kind: "map"|"task"|"slice", slug,
  status, title, data}` where `data` is the raw frontmatter record.
  `fromFrontmatter` (line 38) throws plain `Error` ("invalid or missing
  'kind' in frontmatter: <v>") unless `kind` is exactly one of the three
  strings.
- `sliceInfoFrom(filename, data)` (line 48): parses `<n>-<slug>.md` names
  (regex line 50 identical to `SLICE_RE`), extracts `blocked_by` (array
  or empty), `status`, `size`. Throws on non-matching filenames.
- `dependencyLevels(nodes)` (line 59): BFS level assignment over
  `SliceInfo | WorkItemInfo`. Blockers not present in the input set count
  as satisfied (line 71 comment); a zero-ready iteration (cycles,
  all-blocked) assigns the whole remaining set to one level (line 77-80)
  so the loop cannot spin forever. Verified live with a two-node cycle
  plus an orphan.
- Pure module: no file I/O.

### src/core/state.ts (43 lines)

- `WorkflowState` = `{task: string|null, slice: string|null}` (line 9).
- `toObject` (line 20) is the key-dropping serializer: it writes exactly
  `{task, slice}` and nothing else.
- `fromObject` (line 35) accepts two formats: v2 flat (`{task, slice}`,
  detected when `task` is a string or null) and v1 nested
  (`{active: {task, slice, map}, last_action, next_action}`), reading
  only `active.task` and `active.slice`. Anything else in the raw object
  (e.g. `schema_version`) is parsed into nothing and dropped by the next
  `toObject`. Live-verified.
- Consequence: `tw_state_set` + `saveState` round-trips state.yaml
  through this lossy pair; see Confirmed facts.

### src/core/frontmatter.ts (51 lines)

- `parse(text)` (line 20): requires the first line to be exactly
  `---` (trimmed), finds the closing `---` line, YAML-parses the block,
  throws `FrontmatterError` ("no opening fence" / "unterminated" / "not a
  mapping") otherwise. Body is everything after the closing fence,
  preserving interior newlines.
- `dump(doc)` (line 41): YAML.stringify with PLAIN default string/key
  types, `indentSeq: false`, `lineWidth: 0`, trailing newlines of the
  block trimmed, then `---\n<block>\n---\n<body>`. Note: the body is
  concatenated without a separating newline, so `parse(dump(doc))`
  round-trips exactly (verified live: data and body byte-identical,
  including a body starting immediately with text and one starting with
  a blank line; arrays re-serialize as block sequences without
  indentation).
- YAML quoting is automatic only where needed: verified live that a
  value with a colon or `#` or newline gets double-quoted / block-quoted
  on dump; plain scalars stay plain. Quoted input scalars lose their
  quotes on round-trip (cosmetic change, data-equal).
- Error class shared: `FrontmatterError` (src/core/err.ts:2);
  `ResolutionError` (src/core/err.ts:3) is used by pi.ts for resolution
  failures.

### src/core/repo-gate.ts (443 lines) [IN-FLIGHT]

- The working tree contains an uncommitted refactor of this module
  versus HEAD (git diff: ~138 lines changed). The committed version had
  `GateConfig.enable: boolean` (default true) with project-over-global
  per-key override (`pickOverride`), and the old truth table
  `active = matches !== (projectEnable === false)`. The working tree has
  `enable?: boolean` (undefined = no override), reads `disableOnRepo`
  from global settings only and `enable` from project settings only
  (src/core/repo-gate.ts:239-299), and `isWorkRepo` honors enable as
  authoritative force-on/force-off (src/core/repo-gate.ts:395-413).
- Everything cataloged above cites the working-tree version. Tests
  (`tests/repo-gate.test.ts`, 42 tests) match the working tree and pass
  (verified: full suite green).
- Supporting docs diff `docs/repo-gating.md` [IN-FLIGHT] describes the new
  semantics ("`enable` means exactly what it says").
- Live-verified truth table against the working tree:
  enable undefined + pattern match -> active; enable true + match ->
  inactive; enable false + no match -> active; this repo (origin
  `github.com/Y4shin/skills`, patterns include QNCGmbH/anwaltde) ->
  inactive. Normalization verified for SSH, SSH+scheme+port, HTTPS,
  uppercase, `.git` suffix forms.

### package.json registration facts

- `pi.extensions`: exactly `["./src/pi.ts"]` (one entry point).
- `pi.skills`: 28 entries at HEAD; 29 in the working tree (adds
  `./skills/engineering/eval-review`) [IN-FLIGHT]. All entries are
  basenames loaded by `loadGatedSkillNames` into `GATED_SKILL_NAMES`
  (verified live: 29 names incl. `to-spec`, `to-tickets`, `grilling`,
  `eval-review`).
- `pi.subagents.agents`: `["./agents"]`.
- name `task-workflow`, version 3.0.0; the description text still reads
  "Wayfinder grilling → task frontier → type-specific execution" with a
  v2-era arrow glyph, unchanged in the working tree.

## 5. Confirmed facts carried from the pre-map audit

These were established in the 2026-09-12 session and are restated here as
verified facts with current code references (re-confirmed in this
inventory, live where noted).

1. **tw_state_set drops unknown state.yaml keys including
   schema_version (toObject/fromObject round-trip).** Code:
   `saveState` (src/pi.ts:406) -> `toObject` (src/core/state.ts:20-26)
   writes only `{task, slice}`; `fromObject`
   (src/core/state.ts:35-52) parses only those two fields. Live-verified
   again in a scratch tree: `{task, slice: null, schema_version: 3}`
   becomes a two-key file after one `tw_state_set`. Concrete evidence in
   this repo: `git diff docs/tasks/state.yaml` shows the working tree
   lost `schema_version: 3` relative to HEAD. `setup-workflow` keys its
   fresh/migrate/no-op detection on `schema_version`
   (skills/engineering/setup-workflow/SKILL.md:3, 21-26), so any
   `tw_state_set` call silently resets the repo to the "fresh" branch.
2. **tw_context schema text denies the ticket-generation phase.**
   `artifactSchemaRef` ends with "The map and task bodies are the
   specification; there is no separate ticket-generation phase."
   (src/pi.ts:442, live-verified in the tool's output). This contradicts
   the v3 two-phase main flow (to-spec then to-tickets as separate
   skills, both in `pi.skills`).
3. **Slice machinery sees only legacy `slices/<n>-*.md` files, never the
   `slices:` frontmatter list.** Code: `activeSlices` (src/pi.ts:326-340)
   filters on `SLICE_RE` (src/pi.ts:172) over the slices directory only;
   consumers are `tw_slices`, `tw_finalizable`,
   `tw_dependency_levels` (task branch). Live-verified in a scratch
   tree: a task with a populated `slices:` frontmatter list and no slice
   files reports "(no open slices)" and "ready to finalize"; after
   adding one legacy file it is listed and blocks finalization.
4. **tw_set_slices writes a list nothing reads.** Code: the write is
   src/pi.ts:510-512; grep for `data["slices"]` / `.slices` reads finds
   no reader anywhere in `src/`. Live-verified: after `tw_set_slices`,
   no slice tool's output changes.
5. **Spec-only directories are invisible to tw_resolve and
   tw_map_finalizable's peers.** Code: `mapChildInfos`
   (src/pi.ts:372-396) drops children whose `<slug>/task.md` is missing
   (via `taskPathForSlug`, src/pi.ts:359); the slug scan in `resolveArt`
   reads only `maps/*/map.md` and `*/task.md` (src/pi.ts:252-270).
   Live-verified against this repo: `docs/tasks/build-eval-creator-skill`
   (contains only `spec.md`) resolves to nothing, and a scratch map
   listing a fileless child drops it from frontier/dependency levels.
   Refinement discovered in this inventory (not previously recorded):
   `tw_map_finalizable` (src/pi.ts:674-685) and `tw_map_tasks`
   (src/pi.ts:642-653) DO see spec-only children because they read the
   raw map frontmatter; so a spec-only child marked `done: false`
   surfaces in exactly two tools and is invisible to every other one,
   and a map listing only spec-only done children reports "ready to
   finalize - all children done" (live-verified against
   `pi-harness-evals`, whose third planned child `build-eval-creator-skill`
   exists as a spec-only directory and is absent from `tw_list`).
6. **The extension registers 20 tools: 17 task_* plus notify_user,
   get_guidelines, list_guidelines.** Code: 17 entries in `createTools()`
   (src/pi.ts:459-729, `def(` count = 17 task tools + the `def` helper)
   plus three direct `pi.registerTool` calls (src/pi.ts:777 notify_user,
   1008 get_guidelines, 1044 list_guidelines). Live-verified twice
   (see "Live cross-check"): 20/20 names present ungated, 0/20 gated.
7. **v3 adoption left src/pi.ts untouched ("keep-as-ours, Q11").**
   Reference: `docs/tasks/archive/run-adoption-migration/arch-spec.md:52-53`
   ("The repo-gate (`src/core/repo-gate.ts`) and Pi extension (`src/pi.ts`)
   are foundational and untouched (keep-as-ours, Q11)"). Last commit
   touching `src/pi.ts` predates the v3 skill migration; the tools still
   encode v2-era semantics as cataloged above.

## 6. Live cross-check (registered tool list)

Method: run the real extension in headless `pi -p` sessions with
extension discovery disabled and only this extension loaded
(`pi --no-session -p -ne -e src/pi.ts`), asking the model to list its
tool names without calling anything. Cross-checked against the
registration code path (`createTools()` + the three direct
`registerTool` calls) and against this delegate session's own tool
surface.

- Ungated (personal repo, this repo's origin does not match the
  QNCGmbH/anwaltde patterns): the session listed exactly
  `tw_show, tw_get, tw_set, tw_set_slices, tw_resolve,
  tw_assert_kind, tw_list, tw_slices, tw_finalizable,
  tw_dependency_levels, tw_frontier, tw_map_tasks, tw_map_tick,
  tw_map_finalizable, tw_state, tw_state_set, tw_context,
  notify_user, get_guidelines, list_guidelines` (20 names). With a
  `-t` allowlist naming all 20 plus the four builtins, all 20 were
  present and callable.
- Gated by origin pattern (fake repo with origin
  `https://github.com/QNCGmbH/somerepo.git`, global patterns applied):
  zero of the 20 tools registered; with a `-t` allowlist naming
  task/notify/guidelines tools, none were present (only builtins). The
  model reported an empty tool list.
- Gated by project override (same fake repo, no origin needed,
  `.pi/settings.json` `{"taskWorkflow":{"enable":false}}`): also zero of
  the 20 tools. This confirms the [IN-FLIGHT] project-override path
  end-to-end.
- This delegate session's own environment (the extension installed as a
  global package in the personal-repo configuration) exposes the same 20
  tools, matching the task brief's expectation: 17 `task_*` plus
  `notify_user`, `get_guidelines`, `list_guidelines`.
- Discrepancy check: none found. The registration code path, the live
  headless sessions, and this session's tool list agree: 20 ungated, 0
  gated. One nuance worth recording for R2: `notify_user`,
  `get_guidelines`, `list_guidelines` are registered by the same
  extension and gated identically, so a work repo loses them too (the
  docs/repo-gating.md text and the gate-factory tests confirm this is
  intended).

## 7. In-flight changes affecting this surface

Labeled per the map's decision Q3 (working tree is the source of truth;
in-flight changes are labeled, not treated as provisional).

- `src/core/repo-gate.ts` [IN-FLIGHT]: uncommitted refactor, ~138 lines
  changed. `GateConfig.enable` becomes optional (undefined = no
  override); config reading split (disableOnRepo global-only, enable
  project-only); `isWorkRepo` truth table rewritten to
  enable-authoritative semantics. Cataloged in section 3 and 4.
- `docs/repo-gating.md` [IN-FLIGHT]: documentation rewritten to the new
  truth table ("enable means exactly what it says").
- `tests/repo-gate.test.ts` [IN-FLIGHT] and `tests/skills.test.ts`
  [IN-FLIGHT]: tests updated to the new semantics; the skills-list
  count assertion moved from 28 to 29.
- `package.json` [IN-FLIGHT]: `pi.skills` gains
  `./skills/engineering/eval-review` (29 entries), which flows into
  `GATED_SKILL_NAMES` for the work-repo strip/invocation gate.
- `docs/tasks/state.yaml` [IN-FLIGHT]: working tree is
  `{task: tool-surface-inventory, slice: None}`; the `schema_version: 3`
  key present at HEAD is gone (consistent with fact 1: a
  `tw_state_set` call was made on this tree).
- Other uncommitted files (skills/engineering/README.md,
  skills/engineering/task-workflow-overview/SKILL.md,
  skills/productivity/handoff/SKILL.md, .changeset/eval-review-skill.md,
  new docs pages, eval-review skill dir) are workflow-prose changes
  outside `src/`; they do not change the registered tool surface but R2
  audits them as prose.
- `src/pi.ts` itself has NO uncommitted diff: every tool/hook cataloged
  above is the committed v3.0.0 state.
