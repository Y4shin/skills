# A failed migration

## Symptom

- `/skill:setup-workflow`'s migrate branch stopped partway: the `tw_migrate`
  tool errored, the tree is half-transformed, or both the old and the new
  path exist for the same artifact.
- The migration report lists failures, or `tw_frontier` cannot read the tree
  after the run.
- `docs/tasks/state.yaml` still names an older schema version while some
  files already carry the current shape.

## Missing / misconfigured artifact

The migration did not complete, so the tree sits between schemas.

## Route

1. Stop writing to the tree: a half-migrated tree is not a live effort tree.
2. Restore the backup branch the migrate branch created
   (`migrate/schema-<from>-to-5`), and read the migration report from that
   run.
3. Fix the reported cause on the backup branch. The usual one is a
   hand-edited frontmatter the migration could not parse.
4. Re-run `/skill:setup-workflow`'s migrate branch. It is idempotent: a second
   run over an already-migrated tree is a no-op.

The doctor diagnoses the failed run and names the recovery order; the
migration owns the fix.
