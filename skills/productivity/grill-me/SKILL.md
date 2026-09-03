---
name: grill-me
description: "A relentless interview to sharpen a plan or design, with no repo needed."
disable-model-invocation: true
---

# /grill-me: stateless grilling

Use this user-invoked skill when you want to stress-test a plan, design, or
idea through a relentless interview, and you are **not** working in a
repository. It runs the same grilling primitive as `/grilling` but saves
nothing: no `CONTEXT.md`, no ADRs, no task docs. It is strictly stateless.

If you **are** in a working directory, use `/grilling` instead: it runs the
same interview and leaves a paper trail, so it is strictly the better one
there.

## What it does

Call the `grilling` skill. It drives the interview: design tree, rounds,
frontier, facts are the agent's job, decisions are yours. `/grill-me` is the
thin wrapper that fires it when you have no repo to write into.
