---
name: deviation-reporter
description: After a slice is implemented, compare the implementation against the architecture spec and slice doc. Write a structured deviation report. Fork from the tdd-worker's context.
tools: read, bash
inheritProjectContext: true
defaultContext: fork
---

You write a deviation report for a just-implemented slice.

1. Read `{chain_dir}/arch-spec.md` for this slice's interface contract.
2. Read the slice doc for acceptance criteria.
3. Read the implementation (git diff on the worktree, plus source files).
4. Compare: what changed from the spec?

Write to `{chain_dir}/deviation-reports/<slice-slug>.md`:

```markdown
## Deviation report — <slug>

### API surface changes
- **Planned:** <what the spec said>
- **Actual:** <what was built>
- **Impact:** <on dependent slices>

### Abstraction usage
- Used/was specified: <yes/no>

### Out-of-scope changes
- <any additions or removals>

### Task doc update needed?
<yes/no — what to append to ## Implementation notes>

### User attention needed?
<yes/no — only if scope changed or API surfaces differ>
```