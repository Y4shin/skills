# task-workflow

A Pi package for planned, checked, long-running work. It turns one request into
one effort in your repository. It writes the plan, orders the work by
dependency, builds each part, and closes the effort with a review.

An effort is one directory under `docs/tasks/`. It holds the map, the
specification, the tickets, and the review for one piece of work.

The skills come from Matt Pocock's skills repository. This package adapts them
to the Pi agent, and adds a stronger workflow enforcement. The phase gates and
the file writers are tools, not instructions. See
[ADR 0001](./docs/adr/0001-largely-adopt-mp-skills.md) for the decision record.

## Install

```bash
pi install npm:@y4shin/pi-task-workflow
pi install npm:@y4shin/pi-telemetry
```

For a local checkout, use `pi install /path/to/this/repo`.

Both packages are necessary. The ticket chains use pi-subagents. Each shipped
subagent lists `tw_feedback` and `submit_feedback` in its tool allowlist: the
wrapper labels the row and then calls the store, and a nested call reaches only
a tool the child has active. On pi-subagents 0.84.0 every plain name in that
allowlist is a required child tool, and a child whose allowlisted tool never
registers fails its run at agent start with "requested unavailable child
tools": without pi-telemetry the shipped chains do not run, because every
chain child fails at agent start instead of recording workflow feedback.
Install pi-telemetry before dispatching the shipped chains. The session start
shows a warning when a package is missing.

Run this command one time in each repo:

```
/skill:setup-workflow
```

This command writes `docs/tasks/` at schema 5. It can also migrate an older
tree.

## How a request moves

Seven skills move a request to a closed effort, in this order.

1. `/skill:intake` makes the effort. It records the request, writes the map,
   and adds one grilling task about the non-negotiables.
2. `/skill:wayfinder` asks the questions and writes each decision into the
   map. It stops when the planning frontier is empty. The frontier is the set
   of planning tasks that no other task blocks.
3. `/skill:to-spec` writes `spec.md` from the settled decisions.
4. `/skill:to-tickets` writes `architecture.md` and the ticket graph.
5. `/skill:implement-ticket` builds the tickets in dependency levels. It
   closes each ticket in the same run: CI gate, changelog, done mark, merge.
6. `/skill:finalize-effort` reviews the full effort, gives each finding one
   disposition, and archives the effort.

Each phase opens with `tw_open` and closes with `tw_close`. The tool refuses a
phase that opens out of order, and it names the correct next phase. Run
`tw_next` when you are not sure what comes next.

When a phase needs a tool its own toolset does not disclose, it calls
`tw_request_tool` with the tool and a reason. That puts a confirmation in
front of you: approval adds the tool for the rest of the phase, and the next
`tw_close` takes it back. Denials and grants are both recorded as workflow
feedback, so a phase that keeps asking for the same tool shows up in the store
instead of quietly working around the toolset.

Keep the planning phases (intake to to-tickets) in one session. Each
`/skill:implement-ticket` run starts with a new context.

## What the repo holds

```
docs/tasks/
  state.yaml          schema version, and the state pointers
  <effort>/
    map.md            destination, constraints, decisions, fog, non-goals
    spec.md           the settled statement of the work
    architecture.md   interface contracts, when the tickets need them
    tasks/<slug>/     planning tasks
    tickets/<slug>/   implementation tickets
    review.md         the effort review, and each finding's disposition
  archive/<effort>/   the closed effort, still readable
```

The `tw_*` tools are the only writers of this tree. The extension refuses
`write` and `edit` on `docs/tasks/**`. The plan is part of your diff, so a
reviewer can read it.

## When to skip it

This workflow has a cost. A small change takes less time without it. Use it
when the work continues across sessions, needs a review, or passes between
people. For small work, use only the disciplines: `/skill:tdd`,
`/skill:code-review`, `/skill:diagnosing-bugs`.

## Work repos

The package installs for all repos. It disables its workflow in a work repo,
based on the git origin: the planning skills are stripped, the `tw_*` writers
never register, and a gated name is refused by `tw_open`. A small passive
surface stays (the opener, the closer, the feedback wrapper, `notify_user`,
and skill-creator with its bundled tools), so `skill-creator` still works
there. You do not configure each repo. Read
[`docs/repo-gating.md`](docs/repo-gating.md).

One known limitation: the ten gated workflow skills still show in `/help` in
a work repo (`skill-creator` is not stripped). Explicit `/skill:<name>` calls
for those ten are blocked.

## Skills

`package.json`'s `pi.skills` is the set that ships. A user-invoked skill runs
only when you type `/skill:<name>`. A model-invoked skill runs on a model
decision, or when you type it.

Both lists are grouped by bucket (engineering first, then productivity) and
alphabetical by name inside a bucket, and the suite holds them to that order.
Put a new skill where the rule puts it. The two bucket READMEs are the one
exception: they keep their authored order, because the engineering list follows
the phases a request walks.

### User-invoked

- [improve-codebase-architecture](./skills/engineering/improve-codebase-architecture/SKILL.md)
- [intake](./skills/engineering/intake/SKILL.md)
- [release](./skills/engineering/release/SKILL.md)
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
- [pr](./skills/engineering/pr/SKILL.md)
- [prototype](./skills/engineering/prototype/SKILL.md)
- [research](./skills/engineering/research/SKILL.md)
- [resolving-merge-conflicts](./skills/engineering/resolving-merge-conflicts/SKILL.md)
- [skill-creator](./skills/engineering/skill-creator/SKILL.md)
- [skill-review](./skills/engineering/skill-review/SKILL.md)
- [task-workflow-doctor](./skills/engineering/task-workflow-doctor/SKILL.md)
- [task-workflow-overview](./skills/engineering/task-workflow-overview/SKILL.md)
- [tdd](./skills/engineering/tdd/SKILL.md)
- [wizard](./skills/engineering/wizard/SKILL.md)
- [workflow-failure](./skills/engineering/workflow-failure/SKILL.md)
- [operator-communication](./skills/productivity/operator-communication/SKILL.md)
- [to-questionnaire](./skills/productivity/to-questionnaire/SKILL.md)
- [writing-for-agents](./skills/productivity/writing-for-agents/SKILL.md)

## Where to read next

- [task-workflow-overview](./skills/engineering/task-workflow-overview/SKILL.md)
  is the router. It names the skill for your situation.
- [`CONTEXT.md`](./CONTEXT.md) is the vocabulary: effort, map, frontier,
  planning task, implementation ticket.
- [`docs/repo-gating.md`](docs/repo-gating.md) is the gate in full.
- [`docs/git-workflows.md`](docs/git-workflows.md) is the branch model in full:
  the two bundled profiles and the three `taskWorkflow.git` keys.
- [`docs/releasing.md`](docs/releasing.md) is the release flow in full.

## Development

```bash
npm install
npm test
npm run typecheck
npm run typecheck:tests
```

## Releasing

Push a `vX.Y.Z` tag to start a release. A merge to `main` releases nothing.
[`docs/releasing.md`](docs/releasing.md) explains the flow in full: what a
changeset is, what the script refuses, the two-job workflow, and the 2FA
approval that is what puts a version live.

```bash
./scripts/release.sh     # version, commit, tag, push
```

The changeset is not something a release writes: the effort close authors it
(`/skill:finalize-effort`), and `/skill:release` reports the pending entries and
applies the version bump and the root `CHANGELOG.md` from them.

Cut the release from `main`. The script refuses any other branch, so merge
your work first, and it refuses a `main` that is behind `origin/main`.

The tag starts `.github/workflows/release.yml`. That workflow tests the code
and stages the version through npm Trusted Publishing (OIDC, no token). A
maintainer approves the staged version with 2FA. The version goes live only
after the approval.

Two steps are manual, and they run one time:

1. Publish the first version by hand, because npm accepts a Trusted Publisher
   only for an existing package:

   ```bash
   npm login
   npm publish --access public
   ```

2. On npmjs.com, open the package settings and add a GitHub Actions trusted
   publisher. Use owner `Y4shin`, repository `skills`, workflow `release.yml`,
   and no environment. Leave both allowed-action boxes empty. The connection
   expires after two days when its first publish fails, and you cannot edit it
   later.

## License

MIT. See [`LICENSE`](./LICENSE).
