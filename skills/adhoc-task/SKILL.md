---
name: adhoc-task
description: >
  Take a raw idea, grill it into a full implementation spec and an agreed
  testing strategy, then build it under full control (strict TDD + hard
  verify gate) via a subagent chain. Creates no docs/tasks/ artifacts — the
  spec is ephemeral, living in the chain run's {chain_dir}. Use for small or
  quick changes that don't warrant a planned task. Requires pi-subagents.
---

# Ad-hoc Task — refine, then build under control

For a raw idea that's too small for the full planned pipeline (no task doc,
no slices, no archive) but still wants full control: relentless refinement →
agreed test plan → strict TDD → hard verify gate.

Nothing is written under `docs/tasks/`. The spec lives in the chain run's
`{chain_dir}` and disappears with the run; the chain logs and the git branch
are the only audit trail.

## Prerequisites

- `pi-subagents` installed (`pi install npm:pi-subagents`). The build reuses
  the `tdd-worker` and `slice-verifier` agents shipped with this package, plus
  the `adhoc-refiner` agent defined here.
- A git repo — the result lands on a branch.

## Step 0 — Pre-flight: branch + warnings

Before refining, decide where the result lands and warn about conflicts.

1. Read `task_state`. If `active.task` or `active.slice` is set, there is
   in-progress **planned** work — warn: "Planned work is active
   (task `<slug>`). Ad-hoc work on the same branch will mix them."

2. Run `git status` and `git branch --show-current`. If the working tree is
   dirty, or the current branch is `task/*` or `slice/*`, warn explicitly
   that committing here mixes ad-hoc work into planned work or uncommitted
   changes.

3. Ask the user (one question, recommended answer first) how to land this
   run. Resolve `<slug>` as a 2–4 word kebab of the idea:
   - **commit on the current branch** — default when the tree is clean and no
     planned work is active
   - **new `feat/<slug>` off the current branch**
   - **new `feat/<slug>` off `main`**
   - **abort**

4. Act on the choice: if a `feat/` branch was chosen, create and switch to it
   now (`git checkout -b feat/<slug>` from the chosen base). Do **not** commit
   yet — the chain implements first.

If aborted, stop.

## Step 1 — Grill the idea

Load context first so recommendations are grounded:
- `task_profile` for architecture / orientation.
- `get_guidelines` / `list_guidelines` for language conventions.
- Explore the codebase for the layers the idea touches.

Invoke `grill-me`:

- **Subject:** the idea — what to build and why (the implementation spec).
- **Advisory topics:** who is the user & what outcome; end-to-end behaviour
  or API surface; layers touched; boundaries (out of scope, what must NOT
  change).

`grill-me` walks the decision tree relentlessly until a shared, detailed
understanding exists — the advisory topics are signposts, not a fixed
checklist.

Outcome: a confirmed **implementation spec** — behaviour, boundaries,
explicitly out-of-scope, and acceptance criteria.

## Step 2 — Testing-strategy feedback loop

With the implementation spec agreed, invoke `grill-me` again, now scoped to
testing:

- **Subject:** the testing strategy for this spec.
- **Advisory topics:** test type(s) & scope (what's tested, what's excluded);
  dependency strategy (real vs fake per dependency); key scenarios (happy path
  first) & edge cases; failure modes (≥2) and the assertion that catches each;
  the run command.

The run command is a fact in the environment — `docs/testing.md`,
`package.json`, `Makefile`, or CI config — so `grill-me` looks it up rather
than asking. Iterate until the test plan is agreed. Do not start implementing
until the user confirms.

## Step 3 — Launch the build chain

Dispatch a three-step subagent chain. The chain shares `{chain_dir}`: the
first step writes the spec there, the later steps read it.

```
subagent({
  async: true,
  timeoutMs: 300_000,
  turnBudget: { maxTurns: 30, graceTurns: 5 },
  chain: [
    {
      agent: "skills.adhoc-refiner",
      as: "refine",
      phase: "Planning",
      label: "Crystallize ephemeral spec",
      outputMode: "file-only",
      task: "Crystallize the confirmed ad-hoc spec + test plan into {chain_dir}/task.md.\n\nTitle: <title>\nSlug: <slug>\nBranch: <chosen-branch>\n\nImplementation spec:\n<confirmed spec from Step 1 — behaviour, boundaries, out-of-scope, acceptance criteria>\n\nTesting strategy:\n<confirmed test plan from Step 2 — types, scenarios, edge cases, failure modes>\n\nResolve the Run command from docs/testing.md / package.json / Makefile / CI. Do not ask the user."
    },
    {
      agent: "skills.tdd-worker",
      as: "build",
      phase: "Implementation",
      label: "TDD: implement spec",
      task: "Implement the spec at {chain_dir}/task.md via strict TDD (RED → GREEN → REFACTOR).\n\nThere is no parent task doc and no slice branch. Work on the current branch (already set to <chosen-branch>); do not create or switch branches. Derive every assertion from the spec's acceptance criteria and Test plan. Run the full suite before finishing."
    },
    {
      agent: "skills.slice-verifier",
      as: "verify",
      phase: "Verification",
      label: "Run lint and tests",
      outputMode: "file-only",
      task: "Verify the ad-hoc work against {chain_dir}/task.md. Run lint and the test Run command from the doc's ## Test plan. Block on any failure."
    }
  ]
})
```

Wait for the chain to finish. If `slice-verifier` fails, **stop** — re-dispatch
`tdd-worker` with the failure output (or the whole chain). Do not commit a
red build.

## Step 4 — Harvest durable knowledge

The code is built and verified, but nothing is durably documented yet — the
spec is ephemeral and will vanish with the chain run. Before landing, migrate
the durable knowledge so future work benefits. This mirrors `finalize-task`
Step 4 (fold into permanent docs), but without a `docs/tasks/` artifact or
CHANGELOG entry.

1. **Gather.** Read the ephemeral spec at `{chain_dir}/task.md` and review the
   working-tree changes (the implementation is present, uncommitted):

   ```bash
   git status
   git diff HEAD
   ```

   Read `task_profile` for project knowledge destinations, `docs/testing.md`
   for test conventions, and scan `docs/` for existing design / decision docs.

2. **Decide what's durable.** Identify knowledge worth keeping permanently:
   - **Architectural decisions** — what was decided and *why*. The reasoning
     in the ephemeral spec is the valuable part; it must not be lost.
   - **New testing patterns / tooling / conventions** discovered during the
     build.
   - **Design changes** to existing architecture docs.

   Not everything is durable — a one-line bugfix may have nothing worth
   saving. If so, skip the write (still do the confirm below) with a one-line
   note.

3. **Confirm (one round).** Present what you will durably save and where
   (e.g. "new ADR at `docs/decisions/<n>-<slug>.md`; update `docs/testing.md`
   §Mocking"), recommended-first. Ask: "save as proposed, or adjust?" Iterate
   once if needed. This is the only harvest interaction — the parent owns it
   (subagents don't interview the user).

4. **Write.** Migrate into the project's permanent locations:
   - Architectural decisions → the project's decision log / ADRs. If the
     project has no decision log, create `docs/decisions/<n>-<slug>.md`
     (ADR-style: Context, Decision, Consequences).
   - Testing lessons → `docs/testing.md`.
   - Design changes → existing architecture docs under `docs/`.
   Use `task_profile`'s knowledge destinations if the project declares them.

   Do **not** write anything under `docs/tasks/` and do **not** append to
   `docs/tasks/CHANGELOG.md` — that is the planned workflow's record; ad-hoc
   work stays out of it. (Harvested docs are committed in Step 5.)

## Step 5 — Land

Once the verifier passes (Step 3) and knowledge is harvested (Step 4):

1. Stage and commit the implementation changes on the chosen branch. Suggested
   message: `feat(ad-hoc): <slug> — <one-line summary>`.
2. If Step 4 wrote durable docs, commit them separately:
   `docs(ad-hoc): harvest knowledge for <slug>`.
3. Report the branch, the harvested docs (if any), and the chain run location
   (`{chain_dir}` / run status) as the audit trail — the chain logs are the
   only record of the ephemeral spec.

Do **not**:
- write anything under `docs/tasks/`
- run `finalize-task`, archive, or append to `docs/tasks/CHANGELOG.md`
- merge to `main` automatically — the user reviews and merges the branch

## Error handling

- If `pi-subagents` is missing, stop and tell the user to run
  `pi install npm:pi-subagents`.
- If `adhoc-refiner` leaves a `TODO: resolve run command`, do not proceed to
  the verifier — resolve the command with the user first, then re-run the
  refiner step.
- Never commit when `slice-verifier` failed.

## Constraints

- **Ephemeral** — no `docs/tasks/` artifacts and no `docs/tasks/CHANGELOG.md`
  entry. The spec lives only in `{chain_dir}` (temp) and is never committed.
  Durable knowledge, however, is harvested into permanent repo docs (Step 4).
- **Harvest before land** — after the verify gate, durable knowledge
  (architectural decisions, testing lessons) is migrated to permanent docs
  before the final commit. Ephemeral ≠ undocumented: the spec vanishes, but
  its durable lessons must not.
- **Full control** — strict TDD + hard verify gate, same rigour as
  `implement-slice`.
- **English**; no speculative scope — unresolved items go to "Open questions"
  in the spec.
- The parent orchestrator owns both grills (Step 1, Step 2) and the harvest
  confirm (Step 4); subagents do not interview the user.

**Handoff:** Report the branch, harvested docs (if any), and chain run
location. If the work grew beyond ad-hoc, suggest promoting it: run
`/skill:create-task` with the agreed spec as seed.
