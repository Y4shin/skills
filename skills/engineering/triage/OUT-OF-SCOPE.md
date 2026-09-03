# Out-of-Scope Knowledge Base

The `docs/tasks/out-of-scope/` directory in a repo stores persistent records of
rejected feature requests. It serves two purposes:

1. **Institutional memory**: why a feature was rejected, so the reasoning
   isn't lost when the task doc is archived
2. **Deduplication**: when a new request comes in that matches a prior
   rejection, the skill can surface the previous decision instead of
   re-litigating it

## Directory structure

```
docs/tasks/out-of-scope/
  dark-mode.md
  plugin-system.md
  graphql-api.md
```

One file per **concept**, not per request. Multiple requests asking for the
same thing are grouped under one file.

## File format

The file should be written in a relaxed, readable style, more like a short
design document than a database entry. Use paragraphs, code samples, and
examples to make the reasoning clear and useful to someone encountering it
for the first time.

```markdown
# Dark Mode

This project does not support dark mode or user-facing theming.

## Why this is out of scope

The rendering pipeline assumes a single color palette defined in
`ThemeConfig`. Supporting multiple themes would require:

- A theme context provider wrapping the entire component tree
- Per-component theme-aware style resolution
- A persistence layer for user theme preferences

This is a significant architectural change that doesn't align with the
project's focus on content authoring. Theming is a concern for downstream
consumers who embed or redistribute the output.

```ts
// The current ThemeConfig interface is not designed for runtime switching:
interface ThemeConfig {
  colors: ColorPalette; // single palette, resolved at build time
  fonts: FontStack;
}
```

## Prior requests

- docs/tasks/archive/dark-mode-support/task.md: "Add dark mode support"
- docs/tasks/archive/night-theme/task.md: "Night theme for accessibility"
- docs/tasks/archive/dark-theme-option/task.md: "Dark theme option"
```

### Naming the file

Use a short, descriptive kebab-case name for the concept: `dark-mode.md`,
`plugin-system.md`, `graphql-api.md`. The name should be recognizable enough
that someone browsing the directory understands what was rejected without
opening the file.

### Writing the reason

The reason should be substantive: not "we don't want this" but why. Good
reasons reference:

- Project scope or philosophy ("This project focuses on X; theming is a
  downstream concern")
- Technical constraints ("Supporting this would require Y, which conflicts
  with our Z architecture")
- Strategic decisions ("We chose to use A instead of B because...")

The reason should be durable. Avoid referencing temporary circumstances
("we're too busy right now"); those aren't real rejections, they're
deferrals.

## When to check `docs/tasks/out-of-scope/`

During triage (Step 1: Gather context), read all files in
`docs/tasks/out-of-scope/`. When evaluating a new request:

- Check if the request matches an existing out-of-scope concept
- Matching is by concept similarity, not keyword: "night theme" matches
  `dark-mode.md`
- If there's a match, surface it to the maintainer: "This is similar to
  `docs/tasks/out-of-scope/dark-mode.md`. We rejected this before because
  [reason]. Do you still feel the same way?"

The maintainer may:

- **Confirm**: the new request gets added to the existing file's "Prior
  requests" list, then the task doc is archived
- **Reconsider**: the out-of-scope file gets deleted or updated, and the
  request proceeds through normal triage
- **Disagree**: the requests are related but distinct, proceed with normal
  triage

## When to write to `docs/tasks/out-of-scope/`

Only when an **enhancement** (not a bug) is *rejected* as `wontfix`. Do **not**
write here when something is closed as `wontfix` because it's **already
implemented**. That's a built feature, not a rejected one; recording it would
poison the dedup checks with false rejections. Instead, the closing note
points to where the feature already lives.

The flow:

1. Maintainer decides a feature request is out of scope
2. Check if a matching `docs/tasks/out-of-scope/` file already exists
3. If yes: append the new request to the "Prior requests" list
4. If no: create a new file with the concept name, decision, reason, and
   first prior request
5. Post a note on the task doc explaining the decision and mentioning the
   out-of-scope file
6. Archive the task doc with `status: wontfix`

## Updating or removing out-of-scope files

If the maintainer changes their mind about a previously rejected concept:

- Delete the `docs/tasks/out-of-scope/` file
- The skill does not need to reopen old task docs; they're historical records
- The new request that triggered the reconsideration proceeds through
  normal triage
