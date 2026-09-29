# OKF conformance failure

## Symptom

- Files under `docs/tasks/` fail OKF conformance: a file has no frontmatter,
  a frontmatter with a missing or empty `type`, or an invalid
  status/workflow_state pair (`draft` paired with anything but `todo`,
  `deprecated` paired with anything but `done`).
- The graph tools report anomalies: `[invalid-combination]`, `[orphan]`,
  `[missing-blocked-by-target]`.
- Artifacts are silently absent from listings and frontiers, with no error.

## Detection

1. Read `docs/tasks/state.yaml`. A missing `schema_version`, or a
   `schema_version` below 4, means the tree is pre-v4: stop here and use the
   migration route below.
2. Run `tw_frontier docs/tasks` and read the `## Anomalies` block. It reports
   invalid status/workflow_state combinations, orphans (a `type` that
   disagrees with the file's location in the tree), and `blocked_by` targets
   that no artifact in the same effort provides.
3. The scan skips files it cannot parse as artifacts, so nonconformant
   frontmatter never shows up in step 2. Sweep for frontmatter presence and a
   non-empty `type` directly:

```bash
find docs/tasks -name '*.md' ! -name 'index.md' ! -name 'log.md' | sort |
while IFS= read -r f; do
  head -n 1 "$f" | grep -q '^---$' || { echo "no frontmatter: $f"; continue; }
  awk -v f="$f" '
    NR > 1 && /^---/ { if (!saw) print "no type: " f; exit }
    /^type:[[:space:]]*$/ { print "empty type: " f; exit }
    /^type:/ { saw = 1 }
  ' "$f"
done
```

`index.md` and `log.md` are reserved filenames and are exempt from the sweep.

## Routing

- A pre-v4 tree (no `schema_version`, or below 4): run
  `/skill:setup-workflow` (migrate branch). The migration reshapes the layout
  and backfills conformant frontmatter.
- v4 drift goes to the responsible producer, by file:
  - `map.md` or `tasks/<task>/task.md`: `/skill:wayfinder`
  - `tickets/<ticket>/ticket.md`: `/skill:to-tickets`
  - `spec.md`: `/skill:to-spec`
  - archived shapes under `docs/tasks/archive/`: `/skill:finalize-task`

Report the file, the rule it breaks, and the route. The doctor diagnoses and
routes; it does not fix.
