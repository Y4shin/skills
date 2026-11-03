---
type: findings
title: Milestone hooks for the local state root
status: stable
---

# Question

What would a milestone-hook mechanism declared in the local state look like: which milestone points the
arc exposes, how the hooks are declared and where the declaration sits inside the local state root, and
how notification and gating work so a skill mid-run learns a hook fired and a gating hook blocks
continuation until its declared work is done.

# Sources

1. `src/disclosure.ts` (lines 35-70, 72-253, 292-350) - `SKILL_REGISTRY`: six phases (`intake`,
   `setup-workflow`, `wayfinder`, `to-spec`, `to-tickets`, `implement-ticket`, `finalize-effort`), each
   with a `gate` kind (`none | effort | spec-ready | tickets-ready | implementation`), a `toolset`, and a
   symmetric `conflicts` table. A skill "derives as open when every tool of its toolset is active"
   (line 292), so open/close is tool-set state, not a marker file.
2. `src/pi.ts` (1334-1465) `phaseGate` - the gate taxonomy and what each kind checks: readiness flag,
   published spec, ticket count, architecture status, target readiness. (1479-1620) the helpers
   (`isBugOnly`, `unfinishedBlockers`, `readyTicketSlugs`).
3. `src/pi.ts` (1621-1624) `refusedOuttext` - the established refusal idiom:
   `Refused: <reason>. Legal next: <calls>.` A gating hook should speak in exactly this shape.
4. `src/pi.ts` (1912-1973) `tw_finalize_map` - "the only setter of the flag, and it sets it last";
   refuses naming every missing item. `tw_write_section` (1885-1911) clears `ready_for_spec` on every
   write, so the flag is a genuine edge.
5. `src/pi.ts` (1975-2000) `tw_write_spec`, (2001-2090) `tw_write_architecture` - the only writers;
   `publish: true` flips `status: stable`, which is what the next gate reads (1370-1390).
6. `src/pi.ts` (2662-2715) `tw_mark_done` - the ticket half refuses while `docs/tasks/CHANGELOG.md` has
   no entry referencing the ticket; the planning half refuses while the map does not reference the task.
   The most load-bearing finding: the workflow already ships a hardcoded
   "declared external work must be recorded before the transition" gate. A hook system is the
   declarable, per-repo generalization of that check, not a new concept in the design.
7. `src/pi.ts` single-writer tools that define the milestone points (line of definition):
   `tw_finalizable` 1770, `tw_dependency_levels` 1784, `tw_frontier` 1806, `tw_map_finalizable` 1861,
   `tw_add_ticket` 2306, `tw_create_effort` 2382, `tw_add_task` 2440, `tw_split_ticket` 2541,
   `tw_mark_blocked` 2717, `tw_archive_effort` 2752, `tw_resolve_uncertainty` 2874,
   `tw_write_changelog` 2893, `tw_write_task_note` 2948, `tw_write_ticket_note` 2984,
   `tw_record_out_of_scope` 3020, `tw_state_set` 3085, `tw_open` 3178, `tw_close` 3234.
8. `src/pi.ts` (3518-3535, 3616) `guardTaskTreeWrites` registered through `pi.on("tool_call")`, with the
   comment "It is a hook, not a declared tool, so it ... blocks in every phase". (3582-3614) the tool
   registration: `exposure: "direct"`, `defaultActive: false`, activation only by the opener. (3621-3657)
   the `notify_user` ntfy tool. (3659-3691) `session_start`, `before_agent_start` (`stripSkills`), `input`.
9. pi docs, `.../pi-monorepo/docs/extensions.md` (68-146) the run lifecycle and per-call hook order
   (`tool_execution_start`, `tool_call`, `tool_result`, ...); (148-170) "choose an event by intent";
   (190-245) handler composition: notification vs gate, "gate handlers should fail closed", and
   `turn_end` / `agent_before_settle` as actionable boundaries needing guarded continuation.
   `docs/configuration.md` (10-47) agent-dir vs project `.pi` files and project trust;
   `docs/settings.md` (1-40) settings keys are fixed, no free-form extension-namespaced block.
10. pi examples, `examples/extensions/`: `permission-gate.ts` (13-25) a `tool_call` gate that blocks and
    fails closed with no UI; `plan-mode/index.ts` (16-30) a mode that swaps the active tool set as its
    gate, plus `[DONE:n]` step markers; `dirty-repo-guard.ts` (46-56) a boundary handler that cancels
    with a reason; `notify.ts` (54) notification work on `agent_settled`.
11. Skills, the milestone prose: `skills/engineering/intake/SKILL.md` (create effort, one grilling task),
    `wayfinder/SKILL.md` (write-back, `tw_finalize_map`, reconcile), `to-spec/SKILL.md` (draft write,
    publish), `to-tickets/SKILL.md` (architecture publish, `tw_add_ticket` in dependency order, verify),
    `implement-ticket/SKILL.md` (CI gate, harvest, changelog, `tw_mark_done`, `tw_finalizable`, state
    clear, merge), `finalize-effort/SKILL.md` (reconcile, review, triage, `tw_archive_effort`).
12. `docs/tasks/local-state-efforts/map.md` (30, 38) the success test and the hook-system fact;
    `tasks/settle-non-negotiables/task.md` (174) its origin: "hooks declared in the local state fire at
    workflow milestones ..., notify the agent to do the declared work, and can gate continuation".
13. `src/core/state.ts` (1-40) state.yaml is two pointers plus a lossless `rest` bag, so an added key
    survives read-modify-write. `src/core/repo-gate.ts` (1-45) `gate.active`: the package can switch
    itself off per repo, which is why hook firing must ride on this same extension.

# Milestone inventory across the arc

Every point below is a single-writer transition, so it is detectable without transcript parsing or file
watching: the tool that owns the write is the firing point. Two points are phase-boundary only, because no
tool terminates them; that is a real gap the mechanism must cover.

| Milestone | Firing point (single writer) | What it means | Skill |
|---|---|---|---|
| `phase_opened` | `tw_open` | phase entry, after its gate passed | all |
| `phase_closed` | `tw_close` | the phase releases | all |
| `effort_created` | `tw_create_effort` | map + root index written | intake |
| `intake_recorded` | `tw_add_task` (grilling task) + `tw_state_set map` | the effort's facts are recorded | intake |
| `task_added` | `tw_add_task` | a planning task joined the frontier | wayfinder |
| `task_done` / `task_blocked` | `tw_mark_done` (task half) / `tw_mark_blocked` | planning progress | wayfinder |
| `map_finalized` | `tw_finalize_map` | `ready_for_spec: true`, set last | wayfinder |
| `map_unfinalized` | `tw_write_section`, `tw_mark_done` (task half) | the flag clears on a post-reconcile write | wayfinder |
| `spec_drafted` | `tw_write_spec` (no publish) | `status: draft` | to-spec |
| `spec_published` | `tw_write_spec` `publish: true` | `status: stable`, the external-tracker use case | to-spec |
| `architecture_published` | `tw_write_architecture` `publish: true` | the living design is stable | to-tickets |
| `ticket_created` | `tw_add_ticket` | one ticket, edges validated at creation | to-tickets |
| `tickets_settled` | `tw_close to-tickets` (no writer terminates the graph) | the breakdown is final | to-tickets |
| `ticket_split` | `tw_split_ticket` | supersede plus sub-tickets | to-tickets, implement |
| `changelog_written` | `tw_write_changelog` | the ticket's record exists | implement |
| `ticket_landed` | `tw_mark_done` (ticket half) | the check requires the changelog reference first; the `git merge` in step 8 of the skill is shell, so it is not observable | implement |
| `ticket_finalizable` | `tw_finalizable` | the graph agrees the ticket is closed | implement |
| `uncertainty_resolved` | `tw_resolve_uncertainty` | a chain unblocked with a recorded resolution | implement |
| `review_written` / `review_triaged` | `tw_write_review` (`findings`, `follow_up`, `reconcile`) | the whole-effort review and its dispositions | implement, finalize |
| `out_of_scope_recorded` | `tw_record_out_of_scope` | a decision to not do the work | wayfinder |
| `effort_archived` | `tw_archive_effort` | the effort leaves `## Live` | finalize |

Notes that constrain the design: (a) milestones are per effort, so the record is keyed
`<effort>/<milestone>/<hook>`; (b) `tw_write_spec` fires twice for one milestone family (draft, then
publish), so `draft` must not satisfy a hook on `spec_published`; (c) `ticket_landed` precedes the merge,
so a hook that must see the merged branch declares on `phase_closed` of the next open or on
`effort_archived`; (d) the subagent chains never load this extension (see `implement-ticket/SKILL.md`, a
worker's `tools:` allowlist does not load it), so hooks fire only in the phase session holding the
`tw_*` tools.

# Declaration format options

## Option A - prose instruction file

One markdown file in the local state root, for example `<repo-state>/hooks.md`, read by the skills the way
`docs/tasks/profile.md` is read today (`src/pi.ts` 525-530). Each hook is a heading plus a sentence: "when
the spec is stable, create a plan artifact in <tracker> and put it up for review before continuing".

- For: zero schema, human-editable, and prose is the format agents handle best, in line with the
  existing "resources are prose" style of every skill.
- Against: nothing can be enforced. The extension cannot answer "did this hook's work happen", so
  gating degrades to "the model was told"; ids cannot be referenced from a refusal or a log; a mid-run
  skill that compacted loses the instruction with no fallback. Option A alone does not meet the map's
  "can gate continuation until that work is done" fact. It would sit at `<repo-state>/hooks.md`.

## Option B - structured declaration (YAML) plus prose payload

One YAML document in the local state root, for example `<repo-state>/hooks.yaml`, parsed by the
extension:

```yaml
version: 1
hooks:
  - id: tracker-plan
    on: spec_published          # a milestone token from the inventory above
    when: gate                  # gate | notify
    scope: phase                # phase | milestone
    instruction: |
      Create a plan artifact in the tracker for this effort's spec and put it up for review.
      Reference the spec path so the reviewer can read it.
    done_when: evidence         # evidence | reference | acknowledgement
```

- For: the milestone token, gate polarity and scope are machine-readable, so the extension can fire
  deterministically, refuse in the `refusedOuttext` shape, and persist a per-hook record; `instruction`
  stays prose, so the agent still gets natural language; and the shape generalizes the existing
  changelog-before-`tw_mark_done` check into a declaration instead of a hardcoded rule.
- Against: a new schema the local initialization must write and migrate (mirroring `setup-workflow`'s
  `schema_version` role, `skills/engineering/setup-workflow/SKILL.md` 16-31); milestone tokens become an
  interface that must stay in sync with the writer inventory; a YAML typo becomes a silent no-fire unless
  the reader validates strictly and refuses loudly.
- Where it sits: `<repo-state>/hooks.yaml` for the declaration and, separately,
  `<repo-state>/hook-state.yaml` for firing and completion records. Same file is tempting but wrong: the
  declaration is operator-edited, the state is tool-written, and mixing them puts declarations at risk of
  being rewritten by the state writer.

## Option C - pi settings or an in-repo extension convention

Declare hooks in `.pi/settings.json` (project) or `<agent-dir>/settings.json` (user).

- Rejected on three counts. A project `.pi/settings.json` is a workflow file written into the locally
  set-up repo, which the map's non-negotiable fact forbids. User-level settings are global and not per
  repo, and `docs/settings.md` documents a fixed key set with no extension-namespaced free-form block, so
  this would fork pi's config surface rather than use it. And project settings load behind project trust
  (`docs/configuration.md` 1-4), so a hook gate would silently not exist in an untrusted checkout.

## Option D - a DSL

A condition language or templated commands instead of an `instruction` string is rejected: it
reimplements conditional logic the agent already does well and makes the declaration a program that must
be sandboxed. Option B's `instruction` field is prose on purpose; that is the whole of the structure.

# Recommendation

Declaration. `<repo-state>/hooks.yaml`, versioned, one document per repo, sibling to the state file, with
the shape in Option B: `id`, `on` (a milestone token from the inventory), `when` (`gate` or `notify`),
`scope` (`phase` or `milestone`), `instruction` (prose, the work the agent must do), `done_when`
(`evidence`, a non-empty reference such as a tracker URL or artifact id). Firing and completion records go
in `<repo-state>/hook-state.yaml`, keyed `<effort>/<milestone>/<hook-id>`, holding `fired_at`,
`status` (`fired | done | skipped`), and `evidence`. The declaration is read by the extension at the
milestone write, never copied into the repo. Repo-level only for the first cut; a per-effort override file
is a later addition if an effort ever needs a hook the repo does not.

Firing. No new delivery channel: the milestone's own tool evaluates the declaration after a successful
write and appends the notice to the result text it already returns, which is how a skill mid-run learns a
hook fired. The notice names the hook id, the instruction, and the exact call that records completion. A
`notify` hook is done there. Three durable surfaces cover the cases in-band notice cannot: the opener
(`tw_open`) and phase gate (`tw_close`, `tw_mark_done`) refuse or warn with the pending hooks named, so a
resumed or compacted run rediscovers them; `before_agent_start` injects one line per pending hook into the
prompt (the `stripSkills` precedent, `src/pi.ts` 3689); `session_start` reports the count (the diagnostics
precedent, 3659). `agent_before_settle` continuation is rejected for the first cut: an unconditional
continuation loops, and the workflow's runs are token-driven by design.

Gating. A `gate` hook makes the milestone write succeed (the artifact is written; a hook must not be able
to corrupt a transition) but sets the milestone's record to `fired`, and from then on the transition tools
refuse in the `refusedOuttext` shape. Scope decides which: `scope: phase` refuses `tw_close <this phase>`
and `tw_open` of any conflicting phase, which is exactly the map's use case (the spec is published, the
plan artifact must exist and be up for review before `to-tickets` opens); `scope: milestone` refuses only
the named next transition. Completion goes through a new named tool, `tw_hook_done <hook-id>` with
`evidence`, which validates that the hook fired, that `evidence` is non-empty, and that the caller holds
the writer for the current phase (the disclosure model already gives every phase a toolset, so the
recording tool joins the closing phase's set). A `skip` variant with a mandatory reason exists so an
external outage cannot jam an effort forever; the skip is recorded and surfaced in the run's degradation
report, matching the "explicit degradation" fact. Because a hook gate is a refusal, it inherits the
property that the whole gate model already relies on: fail closed, and name the legal next call.

Why the tools instead of pi events: a `tool_call` hook can only block an arbitrary call by name, while a
milestone gate has to be per effort, per milestone, and per hook, and it must fire after a write it cannot
intercept cleanly. The workflow's own refusals are the right lever; the pi hook surface is the right lever
for the reminder injection and the operator notification, which is how `guardTaskTreeWrites` and
`stripSkills` already split the same problem.

Confidence: medium-high. The firing points are the single writers, verified in code and in the skills;
the gating precedent is shipped (`tw_mark_done`'s changelog check) and the refusal idiom is established.
The residual uncertainty is the milestone token set (two points have no terminating writer) and whether
`done_when: evidence` is enough to keep a hook from being satisfied by a sloppy reference.

# Composition with pi's own surfaces

- `pi.on("tool_call")` stays what it is for (the write lockdown on `docs/tasks/**`); a hook must not ride
  on it, since a `tool_call` gate sees the call before the milestone write and has no effort context.
- `before_agent_start` (prompt injection), `session_start` (diagnostics) and the `notify_user` ntfy tool
  (3659, 3621) cover the out-of-band surfaces; `agent_settled` is there if a hook should page the operator
  only after processing stops (`examples/extensions/notify.ts` 54).
- The extension is per-repo switchable (`src/core/repo-gate.ts`, `gate.active`): when the package is off,
  no `tw_*` tool exists, so no hook fires. That is correct and must be stated in the spec, because the
  hook mechanism's availability is exactly the package's availability.
- Subagent chains run in child sessions without this extension, so any hook that must be honoured inside a
  chain has to be declared at a milestone the parent phase owns, never at a worker step.

# Impact on dependents

- The spec's hook section: declaration schema, the milestone token list, the firing and gating rules, the
  `tw_hook_done` / `tw_hook_skip` surface, and the per-repo location.
- `research-local-state-root`: the local root layout must reserve the two filenames and must not key them
  per effort for the declaration (state is per effort inside the one file).
- The local initialization sister skill: writes `hooks.yaml` (possibly an empty skeleton) and owns its
  `version` migrations, mirroring `setup-workflow`'s stamp role.
- The fog item about finalize's integration review: with this mechanism it can be an instance (a `gate`
  hook on `effort_archived`) rather than built-in behaviour, though the built-in reading stays legal.
- Every skill that releases a phase: `tw_close` gains a refusal mode, and the report's degradation
  section gains a hook line.
- `to-tickets` and `implement-ticket` gating: unchanged mechanically, but a pending hook now shows up in
  their opener refusals as one more named item.

# Unresolved questions

1. `tickets_settled` and `ticket_landed` have no single terminating writer (`tw_close` and a shell `git
   merge` respectively). Does the mechanism accept phase-boundary milestones as first-class tokens, or
   does the spec add a writer (a `tw_finalize_tickets`) to keep every token single-writer?
2. Is `done_when: evidence` (a non-empty reference) a strong enough bar, or does each hook need a typed
   check, for example "the artifact must be reachable by the operator" recorded through a fresh
   `tw_hook_done` with the reviewer's name?
3. Do hooks apply to the regular setup at all? The map says local-only; if a regular repo later wants the
   same gate, does the declaration move to `docs/tasks/hooks.yaml` or stay local? Reading it from the local
   root only is simpler and matches the non-negotiable fact, but it means the mechanism is invisible in a
   regularly set-up repo's record.
4. Should a fired `notify` hook also be recorded (so the run's degradation report can name it), or is the
   in-band notice enough?
5. Which tool holds the recorder when two phases are legally open at once? The registry forbids two
   top-level phases, so this may be moot; it needs one sentence in the spec either way.
