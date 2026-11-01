# Releasing

A `vX.Y.Z` tag starts a release. A merge to `main` releases nothing: the tag is
the consent.

```bash
npm run changeset        # declare the bump level and summary
git commit … && git push # land the work on main
./scripts/release.sh     # version, commit, tag, push
```

Then approve the staged version with 2FA. Nothing reaches the registry before
that approval.

## Where the authority lives

This page explains the shape. Three files carry the exact steps, and each is
the source of truth for its own half when this page disagrees:

- [`scripts/release.sh`](../scripts/release.sh) runs the local half. Its header
  states every precondition and every check it performs.
- [`.github/workflows/release.yml`](../.github/workflows/release.yml) runs the
  remote half. Its header documents the two jobs, the auth model, and the
  integrity check.
- [`docs/release-threat-model.md`](./release-threat-model.md) explains what the
  approval step is worth, and why the workflow cannot publish on its own.

## What a changeset is

Every behaviour change adds one Markdown file under `.changeset/`:

```markdown
---
"@y4shin/pi-task-workflow": minor
---

Add `tw_feedback`, the single labelled route from a workflow phase to the telemetry store.
```

The level is `patch`, `minor`, or `major`, and the body is the changelog entry.
`changeset version` consumes the pending files, bumps `package.json`, and writes
the released section to the root `CHANGELOG.md` (the file npm consumers read;
`docs/tasks/CHANGELOG.md` is the older in-repo history and stays untouched).

Several pending changesets release together, and the highest level wins: a
pending minor plus a pending patch releases a minor. Keep the entries separate
anyway, one per change, so the changelog reads as a list of changes rather than
one paragraph.

## The local half: `./scripts/release.sh`

The script refuses rather than guesses, and every refusal names what to fix:

| Refusal | Reason |
| --- | --- |
| Not on `main` | The tag is cut from the checked-out commit, so releasing from a feature branch tags a commit `main` does not have. |
| Behind `origin/main` | The tag would miss commits origin already has. |
| Pending or staged changes | The release commit must contain the bump and nothing else. |
| `@changesets/cli` missing | Run `npm install`. |
| No pending changeset | There is nothing to release; the script exits without a bump. |

When it proceeds it runs `changeset version`, refreshes the lockfile's root
version with `npm install --package-lock-only`, and then checks four things that
each turn a release red if skipped:

- `docs/migration-target.yaml` names the new version in `package_version`, which
  a test pins to `package.json`.
- The tarball includes `README.md`, which is the npm page.
- `CHANGELOG.md` carries a section for the new version.
- The tag `vX.Y.Z` does not exist yet.

It then commits `chore(release): releasing vX.Y.Z`, tags, and pushes both. A
failure at this point leaves the bump in the worktree; reset it and fix the
cause rather than re-tagging by hand.

## The remote half: two jobs, split by privilege

The tag starts `release.yml`:

- **build** has no id-token and cannot publish. It runs `npm ci`, `npm run
  typecheck`, `npm run typecheck:tests`, `npm test`, and `npm pack`, then
  uploads the tarball. It also compares `.github/workflows/` at the tag with
  `origin/main`, so a tag carrying a modified pipeline fails instead of
  publishing through it.
- **stage** never checks out the repository and runs no install scripts. It
  downloads that tarball, unpacks it to check that the name and version inside
  agree with what the build job read from the tag, prints the tarball's sha256,
  and runs `npm stage publish`. The artifact that reaches npm is the artifact
  the tests passed, byte for byte. A version already on the registry is not an
  error, so a re-run after a partial failure stays safe.

Auth is npm Trusted Publishing over OIDC. There is no `NPM_TOKEN` secret
anywhere, and the registered publisher has no `npm publish` permission, so the
only publishing call the workflow can make is `npm stage publish`.

## Approval

```bash
gh run watch $(gh run list --workflow=release.yml --limit=1 --json databaseId --jq '.[0].databaseId')
npm stage list @y4shin/pi-task-workflow
npm stage approve <stage-id>
```

Approval needs 2FA, and it can also be done on the package's Staged Packages
tab at npmjs.com. Review the tarball, not the habit of clicking approve: the
approval is the last place a compromised build can be stopped, which is what
[`release-threat-model.md`](./release-threat-model.md) works through.

## One-time setup, already done

These ran once, when the package did not exist on npm yet, and do not repeat:

1. Publish the first version by hand with `npm login` and
   `npm publish --access public`.
2. On npmjs.com, add the Trusted Publisher: owner `Y4shin`, repository `skills`,
   workflow `release.yml`, no environment, both allowed-action boxes unticked.
   The connection expires after two days if its first publish fails, and it
   cannot be edited afterwards.

## What the release is not

Two repo facts decide what a version means, and neither is part of the release
path:

- Skills are shipped from `package.json`'s `pi.skills` array, which lists
  exactly the promoted buckets. A skill added to `skills/engineering/` but not to
  that array does not reach consumers, and a test fails rather than letting the
  two drift.
- The install path is `pi install npm:@y4shin/pi-task-workflow`. The package is
  a Pi package, not a Claude Code plugin: there is no plugin manifest, and
  `.claude-plugin/` is not how this ships.
