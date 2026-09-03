#!/usr/bin/env bash
# Release helper: changeset version -> fold changelog -> commit -> tag -> push.
#
# Usage: ./scripts/release.sh
#
# Changesets is the source of truth for the version bump and the changelog
# entry: each .changeset/<name>.md declares a level (major/minor/patch) and a
# summary; `changeset version` consumes them, bumps package.json, and writes a
# changelog entry to the repo-root CHANGELOG.md. This script then folds that
# generated entry into docs/tasks/CHANGELOG.md (where this repo keeps its
# changelog), commits the version bump + changelog, tags, and pushes.
#
# Preconditions:
#   - No pending or staged changes in the worktree.
#   - A remote (origin) configured for pushing the commit and tag.
#   - @changesets/cli installed (run `npm install` if not).
#   - At least one pending changeset under .changeset/ (else nothing to release).

set -euo pipefail

# Always operate from the repository root, regardless of cwd.
cd "$(git rev-parse --show-toplevel)"

# --------------------------------------------------------------------------
# 1. Clean-worktree guard (pending/staged changes)
# --------------------------------------------------------------------------
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: worktree has pending or staged changes. Commit or stash first." >&2
  echo >&2
  git status --short >&2
  exit 1
fi

# --------------------------------------------------------------------------
# 2. Guard: @changesets/cli must be installed
# --------------------------------------------------------------------------
if ! command -v changeset >/dev/null 2>&1 && ! [ -x node_modules/.bin/changeset ]; then
  echo "Error: @changesets/cli is not installed. Run \`npm install\` first." >&2
  exit 1
fi
CHANGESET_BIN="$(command -v changeset >/dev/null 2>&1 && echo changeset || echo "$(pwd)/node_modules/.bin/changeset")"

# --------------------------------------------------------------------------
# 3. Guard: at least one pending changeset (else nothing to release)
# --------------------------------------------------------------------------
# Pending changesets are .changeset/*.md excluding README.md and config.json.
pending_changesets="$(find .changeset -maxdepth 1 -type f -name '*.md' ! -name 'README.md' 2>/dev/null || true)"
if [ -z "$pending_changesets" ]; then
  echo "No pending changesets under .changeset/. Nothing to release." >&2
  exit 0
fi

current_version="$(node -p "require('./package.json').version")"
echo "Current version: ${current_version}"
echo "Pending changesets:"
echo "$pending_changesets" | sed 's/^/  /'
echo

# --------------------------------------------------------------------------
# 4. Run `changeset version` (consumes .changeset/*.md -> bumps package.json,
#    writes a changelog entry to the repo-root CHANGELOG.md)
# --------------------------------------------------------------------------
"$CHANGESET_BIN" version

new_version="$(node -p "require('./package.json').version")"

if [ "$new_version" = "$current_version" ]; then
  echo "changeset version did not bump the version (no version-level changesets?). Aborting." >&2
  exit 1
fi

echo
echo "Bumped ${current_version} -> ${new_version}"

# --------------------------------------------------------------------------
# 5. Fold the generated root CHANGELOG.md into docs/tasks/CHANGELOG.md
# --------------------------------------------------------------------------
# changesets writes/appends to ./CHANGELOG.md (the default formatter). This
# repo keeps its changelog at docs/tasks/CHANGELOG.md, so fold the generated
# entry in and remove the root file to avoid a second source of truth.
if [ -f CHANGELOG.md ]; then
  # Prepend the changesets-generated content to docs/tasks/CHANGELOG.md,
  # preserving the docs/tasks/CHANGELOG.md title and the new version heading.
  tmp="$(mktemp)"
  # Keep the docs/tasks/CHANGELOG.md title line if present, then the
  # changesets content, then the rest of docs/tasks/CHANGELOG.md minus its
  # duplicate title.
  if [ -f docs/tasks/CHANGELOG.md ]; then
    title_line="$(head -1 docs/tasks/CHANGELOG.md)"
    printf '%s\n\n' "$title_line" >> "$tmp"
    cat CHANGELOG.md >> "$tmp"
    # Append the rest of docs/tasks/CHANGELOG.md, skipping its first title line
    # and any leading blank line, to avoid restating the title.
    tail -n +2 docs/tasks/CHANGELOG.md | sed -e '1{/^$/d;}' >> "$tmp"
    mv "$tmp" docs/tasks/CHANGELOG.md
  else
    mv CHANGELOG.md docs/tasks/CHANGELOG.md
  fi
  rm -f CHANGELOG.md
  echo "Folded changesets changelog into docs/tasks/CHANGELOG.md"
fi

# --------------------------------------------------------------------------
# 6. Confirm before committing/tagging/pushing
# --------------------------------------------------------------------------
echo
echo "Staged for release v${new_version}:"
git status --short
echo
read -r -p "Proceed with commit, tag v${new_version}, and push to origin? (y/N) " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Aborted. Working tree has the changeset version bump + changelog; unstage or reset manually." >&2
  exit 0
fi

# --------------------------------------------------------------------------
# 7. Stage, commit, tag
# --------------------------------------------------------------------------
git add package.json docs/tasks/CHANGELOG.md
git commit -q -m "chore(release): releasing v${new_version}"
git tag "v${new_version}" -m "v${new_version}"
echo "Tagged v${new_version}"

# --------------------------------------------------------------------------
# 8. Push the commit, then the tag
# --------------------------------------------------------------------------
branch="$(git rev-parse --abbrev-ref HEAD)"
git push origin "$branch"
git push origin "v${new_version}"

echo
echo "Released v${new_version}"
