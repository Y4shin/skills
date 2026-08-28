# Wayfinder Planning Resource — Grilling

Use this resource when the next task is a human decision that cannot be
answered from the repository or external sources.

Create a direct task with `type: grilling` and no slices:

```yaml
---
kind: task
type: grilling
slug: <slug>
title: <decision>
map: <map-slug>
status: ready
blocked_by: []
---
```

The task body must state:

- the decision to settle;
- the parent decisions it depends on;
- the choices already known;
- the recommended starting answer;
- what downstream work the answer may create.

The execution resource drives the grilling CLI
(`skills/grilling/grilling-cli.mjs`) end-to-end: it starts the visualizer, builds
the design-tree graph via `update`, opens each round via `set-state` + `refresh`,
blocks on the user via `wait`, reads answers via `get`, recomputes the frontier,
and repeats. The completion gate uses `final-review` + `wait accepted`/`rejected`
+ `finalize`. The user answers in the browser; the agent drives the loop. The
agent only ever holds the `--state <key>` handle and must not answer on the
user's behalf.
