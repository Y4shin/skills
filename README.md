# task-workflow

> Intake → Wayfinder → specification → architecture and ticket graph → implementation → effort close, a gated planning workflow for `docs/tasks/`.
> Pi package. One `pi install` away.

## What v5 enforces

- **One front door.** `/skill:intake` turns every request, bugs included,
  into an effort with a map and exactly one non-negotiables grilling task.
  There is no separate bug queue and no rejection path.
- **The opener is the gate.** Every phase opens with `tw_open` and closes
  with `tw_close`. A phase opened out of turn is refused by the tool with
  the legal next call, not by prose.
- **Two graph kinds.** Planning tasks under `tasks/` and implementation
  tickets under `tickets/`, with kind-scoped `blocked_by` edges; the
  frontier and the dependency levels are computed per kind.
- **One living architecture document.** `/skill:to-tickets` produces
  `architecture.md` alongside the ticket graph, and the specification's
  architecture content becomes archival.
- **Close-out is inlined.** Each landed ticket gets its CI gate, changelog,
  done-marking, and merge in the same run; `/skill:finalize-effort` runs the
  holistic review, the finding triage, and the archive.
- **The tools own the rules.** The named `tw_*` tools are the only writers
  of `docs/tasks/**`, and `write` and `edit` are refused on that tree.

## Install

```bash
pi install /path/to/task-workflow
pi install git:github.com/Y4shin/pi-telemetry@v0.4.0
```

Both packages are required. pi-subagents drives every ticket chain, and
every shipped subagent lists `submit_feedback` in its `tools` allowlist;
pi-subagents treats that allowlist as strict and fails a child whose tool is
unavailable, so without pi-telemetry the chain stops at its first gate. The
session start prints a warning when either package is missing.

Then once per repo:

```
/skill:setup-workflow    # scaffold docs/tasks/ at schema 5, or migrate an older tree
```

## Workflow

Every request enters as an effort through `/skill:intake`, the single front
door, which creates the effort's map and its exactly one non-negotiables
grilling task. `/skill:wayfinder` works the planning frontier in bounded passes
and hands off when the effort is ready for the spec. `/skill:to-spec` writes the
specification from the settled record, `/skill:to-tickets` produces
`architecture.md` and the ticket graph, and `/skill:implement-ticket` implements
the ready frontier in dependency levels with the per-ticket close-out inline.
`/skill:finalize-effort` reviews the whole effort, dispositions every finding,
and archives it.

`docs/tasks/` is an OKF bundle: one directory per effort holding `map.md`, an
optional `spec.md`, `architecture.md` when the ticket graph needs interface
contracts, a `tasks/` directory of planning tasks, and a `tickets/` directory of
implementation tickets. A finished effort moves to `docs/tasks/archive/`.

## Skills

The package ships exactly the promoted set in `package.json`'s `pi.skills`.
A user-invoked skill is reachable only when you type `/skill:<name>`; a
model-invoked skill is model- or user-reachable.

### User-invoked

- [improve-codebase-architecture](./skills/engineering/improve-codebase-architecture/SKILL.md)
- [intake](./skills/engineering/intake/SKILL.md)
- [setup-workflow](./skills/engineering/setup-workflow/SKILL.md)
- [to-spec](./skills/engineering/to-spec/SKILL.md)
- [to-tickets](./skills/engineering/to-tickets/SKILL.md)
- [wayfinder](./skills/engineering/wayfinder/SKILL.md)
- [grill-me](./skills/productivity/grill-me/SKILL.md)
- [handoff](./skills/productivity/handoff/SKILL.md)
- [teach](./skills/productivity/teach/SKILL.md)
- [wait-what](./skills/productivity/wait-what/SKILL.md)

### Model-invoked

- [codebase-design](./skills/engineering/codebase-design/SKILL.md)
- [code-review](./skills/engineering/code-review/SKILL.md)
- [diagnosing-bugs](./skills/engineering/diagnosing-bugs/SKILL.md)
- [domain-modeling](./skills/engineering/domain-modeling/SKILL.md)
- [eval-review](./skills/engineering/eval-review/SKILL.md)
- [finalize-effort](./skills/engineering/finalize-effort/SKILL.md)
- [grilling](./skills/engineering/grilling/SKILL.md)
- [implement-ticket](./skills/engineering/implement-ticket/SKILL.md)
- [prototype](./skills/engineering/prototype/SKILL.md)
- [research](./skills/engineering/research/SKILL.md)
- [resolving-merge-conflicts](./skills/engineering/resolving-merge-conflicts/SKILL.md)
- [skill-creator](./skills/engineering/skill-creator/SKILL.md)
- [skill-review](./skills/engineering/skill-review/SKILL.md)
- [task-workflow-doctor](./skills/engineering/task-workflow-doctor/SKILL.md)
- [task-workflow-overview](./skills/engineering/task-workflow-overview/SKILL.md)
- [tdd](./skills/engineering/tdd/SKILL.md)
- [wizard](./skills/engineering/wizard/SKILL.md)
- [to-questionnaire](./skills/productivity/to-questionnaire/SKILL.md)
- [writing-for-agents](./skills/productivity/writing-for-agents/SKILL.md)

## Development

```bash
npm install
npm test
npm run typecheck
```

## Repo gating (auto-disable in work repos)

This package is **global**, so it would load in every repo, including work
repos where it doesn't belong. The gate auto-disables all of the package's
resources in work repos based on the repo's `git origin`, with **zero
per-repo config**. See [`docs/repo-gating.md`](docs/repo-gating.md) for the
full truth table, detection rules, and the one known limitation (the package's
skills still appear on `/help` in a work repo, because pi has no hook to
suppress them there; explicit `/skill:<name>` is blocked via the `input`
event instead).