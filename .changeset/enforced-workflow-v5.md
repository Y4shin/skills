---
"task-workflow": major
---

task-workflow v5: the enforced workflow. The workflow is now a set of phases, each opened by an opener that checks its preconditions and discloses only that phase's tools.

- **Two graph kinds.** Planning tasks (`tasks/<slug>/task.md`) and implementation tickets (`tickets/<slug>/ticket.md`), with kind-scoped `blocked_by` edges and a frontier computed per kind. `intake` is the single front door and always creates an effort with a map and one non-negotiables grilling task; every bug report enters as an effort too, and `docs/bugs/` becomes a static archive.
- **Schema 5.** `architecture.md` and `type: architecture` replace `arch-spec.md` and `type: arch spec`, a `review` artifact type joins them, the map gains `ready_for_spec` and `origin_effort`, and `## Out of scope` becomes `## Non-goals` beside a new `## Non-negotiable facts`. The migration CLI carries any vintage forward in one idempotent hop, archives included.
- **Progressive disclosure.** The gated `tw_*` tools register `exposure: "direct"`, `defaultActive: false`; `tw_open` checks the phase precondition and activates the toolset in one call, `tw_close` removes only what no open skill still needs, and `tw_next` answers in every state. `skill-creator` nests its bundled script tools inside an open phase.
- **Named writers and a write lockdown.** Every write to `docs/tasks/**` goes through a named tool, and the built-in `write` and `edit` are refused there in every phase. Scratch and evidence (`.work/`, `deviation-reports/`) are exempt, and a ticket's implementation notes have their own writer.
- **`finalize-effort`** runs the whole-effort review, triages every finding, and archives the effort only once every finding is dispositioned.
- **Retired:** the `triage`, `implement-task`, and `finalize-task` skills, the `slice` and `slices/` vocabulary, `docs/tasks/maps/`, `mode: hitl`/`afk` as a task marker, and the shell mutation scan.
