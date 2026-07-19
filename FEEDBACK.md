# Pipeline workflow feedback — repo-foundation

After running `/skill:pipeline-slices repo-foundation` through 4 slices (env-loading,
http-server-skeleton, migration-runner, embed-fs-scaffolding), here is an evaluation of
what worked and what didn't in the agentic workflow itself.

## What went well

### TDD worker produced excellent code

The `skills.tdd-worker` agent consistently wrote idiomatic, well-structured Go with
comprehensive table-driven tests. The `migration-runner` slice is a standout: 11 subtests
covering happy path, idempotency, multiple migrations, transaction rollback, empty
directory, lexical ordering, version parsing, context cancellation, closed DB, duplicate
versions, and pre-existing table. The code needed no structural fixes.

### Chain isolation prevented cascading failures

Each step (setup, tdd, verify, diverge, land) runs independently. When a step failed
(e.g. lint caught issues), only that slice was affected. No corruption propagated to
later slices or the task branch.

### Fork context was the right default

Using `context: "fork"` ensured each subagent started fresh with just its task description.
Agents did not inherit confused conversation history from earlier steps.

### Slice-verifier gate caught real issues

The `skills.slice-verifier` correctly blocked when lint or tests failed. Running `golangci-lint`
and `go test` as a hard gate before landing is essential.

## What caused problems

### 1. No retry path for verifier failures (biggest gap)

The chain is linear: tdd → verifier → diverge → land. When the verifier catches lint
issues or test failures, the chain stops with no recovery path.

The `pipeline-slices` skill only has retry logic for two specific artifact types:
- `tdd/uncertainty.md` (TDD worker is uncertain about a design decision)
- `diverge/divergence.md` (divergence from the plan detected)

A verifier failure that isn't either of those has no retry. The parent must inspect the
failure and manually intervene. For `http-server-skeleton`, the TDD worker wrote
correct code but with 13 lint issues — the verifier stopped there, and there was no
"go back and fix" loop built into the chain.

**Desired behaviour:** When the verifier fails, the chain should re-dispatch the TDD
worker with the specific error output and say "fix these issues, do not redo completed work."

### 2. Divergence check is redundant

Step 4 (worker) re-reads the slice doc and compares the implementation. But the TDD
worker (step 2) already built the implementation to match the spec, and the verifier
(step 3) already confirmed tests and lint pass. The divergence check added wall-clock
time without catching anything the earlier steps missed. It consumed agent turns and
wall-clock time for zero value.

**Recommendation:** Remove the divergence check step. Trust the TDD + verify gate.

### 3. Land step drifted out of scope

The land step (step 5) is supposed to be purely mechanical: merge branch, archive slice
doc, add implementation note, commit. But the `migration-runner` land agent instead
started modifying `main.go`, creating `staticfs` files, and working on the *next*
slice's implementation. It didn't stay scoped to its task.

**Recommendation:** Either give the land step an extremely tight, explicit task
instruction that says "do NOT write or modify any Go code, test files, or production
code — only merge, archive, commit," or use a restricted agent for it that has code
write tools removed.

### 4. Sequential pipeline is slow for independent slices

The pipeline implements slices one at a time. `migration-runner` only depends on
`go-module-and-layout` (done), not on `env-loading` or `http-server-skeleton`. Yet
it had to wait for those to finish before the pipeline reached it.

**Recommendation:** For slices that don't share blocked_by chains, run them in
parallel. Each gets its own branch and lands independently. The parent would need
to handle merge ordering if they modify the same files, but for truly independent
layers (migrate vs server vs staticfs) parallel execution would save significant time.

### 5. Timeout handling is brittle

Both the 600s (10 min) and 1800s (30 min) timeouts were hit. The bottleneck wasn't a
single slow step — it was the cumulative effect of many agent turns (TDD: write test →
write code → refactor → run tests → run build → run lint → fix lint → repeat). Each
turn is fast individually but adds up.

When a timeout fires mid-chain, partial work is lost. The `env-loading` chain completed
steps 1-3, then timed out on step 4 — the code was written but the lint fixes the
TDD worker applied were uncommitted. The parent had to manually inspect, detect, and
salvage.

**Recommendation:** Either increase default timeouts further (maybe 45 min) or introduce
checkpoint commits within the TDD step so partial work is never lost.

### 6. Agent turn budget mismatched actual work

The TDD worker for `http-server-skeleton` used 44/80+10 turns but still timed out.
For smaller slices (`embed-fs-scaffolding`), far fewer turns were needed. A single
budget for all slices is wasteful for small ones and insufficient for large ones.

**Recommendation:** Base the turn budget on the slice's `size` field (S/M/L) rather
than using a fixed value.
