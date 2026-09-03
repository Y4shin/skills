# docs/agents/

Per-repo configuration that the engineering skills read. `onboard-workflow`
populates this directory during initial setup; edit the files directly to
reconfigure.

The files that will live here (mirroring Matt Pocock's
`setup-matt-pocock-skills` convention, adapted to our `docs/tasks/`
substrate):

- `issue-tracker.md` (or equivalent): how skills read/write work items.
  We use `docs/tasks/` files, not an external tracker; this file records
  that convention.
- `domain.md`: domain doc layout (single-context vs multi-context) and
  consumer rules for reading `CONTEXT.md` and `docs/adr/`.
- `triage-labels.md`: the label strings mapped to the canonical triage
  roles, when `triage` is configured.

These are created lazily: `onboard-workflow` writes them when it runs, and
they are extended as the adoption lands.
