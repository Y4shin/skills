---
name: start-issue
description: Fetch a slice issue (#n), present a structured summary, then run a focused grilling session to decide the test strategy before any code. Appends a confirmed Test plan to the issue's committed slice doc and hands off to /skill:implement-issue. Use when starting work on an issue. Provider-aware (gh, fgj, local).
---

# Start Issue (Test Plan)

Phase 1.5: understand the issue, then challenge the developer to decide the right test strategy *before* writing a line of code.

**Use `prd_forge` to get provider-correct commands for fetching the issue.**

**Use `prd_slices <prd-slug>` to locate the slice doc.**

**Use `prd_profile` to load test infrastructure conventions.**

**Use `prd_reference` to load the slice doc/lifecycle reference.**

## Step 1 — Fetch + present

Get the issue details (using the provider-correct command from `prd_forge cmd_get_issue`). Locate the PRD dir and slice doc:

```bash
prd_resolve <prd#> --kind prd   # → docs/prd/<slug>/prd.md
```

Read both the `prd.md` and `docs/prd/<slug>/slices/<n>-<slug>.md` in full. Present a structured summary.

## Step 2 — Grill on test strategy (one question at a time)

Give your recommended answer + reasoning first, then ask. Work through in order:

1. "What does this slice touch end-to-end? Which layers?"
2. "What's the simplest test that gives honest confidence this works in *production*?"
3. "If you run that test every few minutes while coding, is the feedback fast enough?"
4. "Walk me through the failure modes — at least two. Does the test type catch each one?"
5. "Do we need a real dependency (real DB, real HTTP, real browser) here, or can it be faked?"
6. "Is any part already tested elsewhere? What's the exact gap we're filling?"

**Test-type vocabulary:** use the test types, file patterns, and run commands from the project profile's "Test infrastructure". `none` is valid only if the slice is truly trivial or fully covered elsewhere.

## Step 3 — Persist the test plan

Once confirmed, **set `analysed: true`** in the slice doc's frontmatter and **append** a `## Test plan` section to the slice doc:

```markdown
## Test plan

**Test type:** <one type from the project's test infrastructure>
**Reasoning:** <one sentence>

### Assertions
- <key assertion 1>
- <key assertion 2>
- <error cases>

### Test file
`<path>`

### Run command
`<run command>`
```

Commit the slice doc. Then hand off: invoke `/skill:implement-issue <n>`.

## Error handling

- If the slice doc is missing, the issue wasn't produced by this workflow — confirm the PRD/slug.
- If the issue can't be fetched (auth, wrong number), tell the user.

## Constraints

- **Spec-first** — assertions derive from acceptance criteria, never from an implementation.
- Don't start implementing here.