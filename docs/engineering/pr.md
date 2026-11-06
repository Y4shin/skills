# pr

## What it does

`pr` writes the body of a pull request. It fills one fixed template so a
reviewer can see the shape of the change, the proof that it works, and the
risk of merging it, in that order:

1. **Summary** opens with the smallest visual that makes the key point
   clear: a pseudocode sketch, a call tree, a component tree, a shallow
   file tree, a Mermaid diagram, a diff, or a short copyable code block.
2. **Evidence** shows the change working, before and after. Screenshots
   when the change is visual and the environment supports them, otherwise
   test runs and console output.
3. **Merge Danger** states whether the merge is a one-way or a two-way
   door, and names the blast radius: the scope a bad merge would touch.

Provenance: the skill is vendored from Matt Pocock's `pr` skill in
[mattpocock/skills](https://github.com/mattpocock/skills), which credits
Dex Horthy's `show-me` skill at
[Humanlayer](https://github.com/humanlayer/skills). The body, the trigger
description, and the credits frontmatter are kept byte-close to upstream.

## When to reach for it

The model reaches for it when it writes a PR body. There is nothing to
configure and nothing to run: the description ("Use when writing a PR
body.") is the whole trigger. It works on any host, with no
platform-specific conventions baked in.

## Common questions

**Why a fixed template?**
A reviewer starts from zero. The template gives every body the same three
landmarks (Summary, Evidence, Merge Danger), so the risk assessment is
findable instead of hunted for.

**What is a one-way door?**
A change that is hard to reverse: destructive actions, hard-to-undo
decisions. A PR that is cheap to roll back is a two-way door and lower
risk. The Merge Danger section says which one the merge is, and the blast
radius says what a bad merge would touch.

**Where does the template come from?**
Dex Horthy's `show-me` skill at Humanlayer, carried into Matt Pocock's
`pr` skill in mattpocock/skills, and vendored into this package.

## It's working if

- A PR body the skill wrote opens with a summary visual before any prose.
- The body shows before and after evidence: screenshots, test runs, or
  console output.
- The body states the merge danger: one-way or two-way door, and a blast
  radius.
- The body uses the project's own domain language and stays brief.
