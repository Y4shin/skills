# grill-me

## What it does

`grill-me` is the stateless grilling interview: the same relentless
stress-testing of a plan, design, or idea as `/skill:grilling` (design tree,
rounds, frontier, facts are the agent's job, decisions are yours), but it
**saves nothing**: no `CONTEXT.md`, no ADRs, no task docs. It is a thin
wrapper that fires the grilling primitive when you have no repo to write
into.

## When to reach for it

Type `/skill:grill-me` when you want the interview and you are **not**
working in a repository: on a train, in a scratch directory, mid-thought
before the project exists.

If you **are** in a working directory, use `/skill:grilling` instead: it
runs the same interview and leaves a paper trail, so it is strictly the
better one there.

## Common questions

**What actually differs from grilling?**
Only the writes. The interview mechanics are identical (whole-frontier
rounds with recommended answers, shared-understanding completion gate);
`grill-me` simply persists none of it.

**Is the output lost, then?**
The decisions live in the conversation and in whatever you copy out. If the
outcome should become artifacts (a glossary, an ADR, tasks), rerun the
settled decision through `/skill:grilling` inside the repo.

**Why not always keep a paper trail?**
Because sometimes there is no repo, and sometimes you do not want files
created for a conversation you are not sure about yet.

## It's working if

- Rounds ask the whole open frontier with concrete recommended answers, and
  nothing was decided on your behalf.
- No files were created anywhere.
- The interview ended on an explicit shared-understanding confirmation, not
  by running out of questions.
- When a repo was actually present, you were nudged toward `/skill:grilling`
  so the decisions could land somewhere durable.
