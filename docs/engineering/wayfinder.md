# wayfinder

## What it does

`wayfinder` is the single planning-phase skill. It creates the effort's map
and planning tasks, then works the planning frontier one bounded pass at a
time: each `/skill:wayfinder` invocation snapshots the frontier once, works
the non-grilling ready tasks, runs at most one grilling, and releases. It
never rolls into the next frontier. Planning work is serialized per kind:
never two grillings at once, while research and prototype may run
concurrently. It produces **decisions, not deliverables**: when the pull to
"just do the work" shows up, that is the signal the map is done and it is
time to hand off.

The map lives at `docs/tasks/<effort>/map.md` and carries Destination,
Constraints, Decisions so far, Fog, Non-goals, and Non-negotiable facts. Its
decision tasks live at `docs/tasks/<effort>/tasks/<task-slug>/task.md`; the
directory is the registration, there is no list to update. Each task carries
one planning subtype: `research` (gather high-trust evidence), `prototype`
(throwaway code answering one design question), `grilling` (resolve a human
decision through conversation), or `manual` (a human or environment
prerequisite). Research and prototype delegate to their standalone skills;
grilling delegates to the `grilling` skill; manual runs here. The per-subtype
resources live at `skills/engineering/wayfinder/resources/`.

Every planning task writes its own results back to the map through
`tw_write_section` as its final step, before it marks itself done with
`tw_mark_done`; the done-marking refuses until the map references the task.
When the ready frontier empties, the pass runs the reconcile: it verifies
each done task's recorded results against the map, fixes what is missing
through the writer, and sets the ready flag through `tw_finalize_map`, the
flag's only setter. `to-spec` then checks only that flag.

## When to reach for it

Type `/skill:wayfinder` when the way from here to the destination is not
visible yet: a huge, foggy effort where the questions outnumber the answers.
Each invocation is one pass; call it again for the next frontier. It is
user-invoked: the model does not reach for it on its own.

Skip it for work whose shape you already know (go to `/skill:to-spec`
directly), for single-session fixes (go straight to the implementation
phase), and for implementation work already ticketed.

## Common questions

**Why does every map start with a grilling session?**
The first grilling establishes destination, constraints, scope boundary, and
the first precise questions before anything is written. A small idea may
produce one task, but it still gets the alignment pass, and it counts as that
pass's one grilling.

**Where are the feature and bug tasks?**
Wayfinder creates planning subtypes only. Feature and bug creation belongs
to `/skill:to-tickets`, which runs after the decisions are clear. Looping a
map straight into implementation throws the linked detail away.

**What is "fog"?**
Questions that are in scope but not yet sharp enough to become tasks. They
sit in the map's Fog section instead of being invented into speculative
tasks, and graduate as they sharpen.

**What happens when the ready frontier is empty?**
The pass reconciles instead of ending idle: it verifies the map against the
done tasks' recorded results, repairs gaps through `tw_write_section`, and
sets the ready flag through `tw_finalize_map`. A run that skips
reconciliation is refused at `to-spec` with a pointer back here.

**What happens if implementation exposes a new uncertainty?**
The affected task stops with a clear discovery and wayfinder is called back
to create a **new** planning task (never a re-open of the old one). That is
a designed-for escape hatch, and it is recorded when it fires.

## It's working if

- The map exists at `docs/tasks/<effort>/map.md` with destination,
  constraints, decisions so far, fog, non-goals, and non-negotiable facts
  sections.
- Decision tasks appear as files under `docs/tasks/<effort>/tasks/`, each
  with a planning subtype, `blocked_by` edges, and a `workflow_state`.
- Each pass stays bounded: one frontier snapshot, the non-grilling ready
  tasks, at most one grilling, then release.
- Results land in the map through `tw_write_section` write-backs that
  reference their task, and `tw_mark_done` accepts them.
- An empty frontier ends in `tw_finalize_map` setting the ready flag, and
  `/skill:to-spec` opens on that flag alone.
