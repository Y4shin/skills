---
name: release
description: >
  Cut a release of the task-workflow package. Picks a version bump
  (major/minor/patch), writes the new version to package.json and
  package-lock.json, commits the change (optionally bundling other pending
  changes after asking), tags the commit as vX.Y.Z with an annotated tag
  message, and pushes the commit and tag to origin. Use when publishing a new
  version of this package.
---

# Release — cut a new package version

Releases are linear and mostly irreversible once pushed, so this skill asks
before the two decision points (bump size, bundling other changes) and once
more right before the push.

## Conventions for THIS repo

- Version source of truth: `package.json` `version` (kept in sync with
  `package-lock.json`).
- Tag name: `vX.Y.Z` (with the `v` prefix), **annotated** (has a message — never
  a lightweight tag).
- Commit message: `chore: release vX.Y.Z`.
- Remote: `origin` (the current branch's upstream).

## Steps

0. **Pre-flight checks.** Stop and report on any failure here; do not proceed.

   ```bash
   # Must have an upstream to push to.
   git rev-parse --abbrev-ref '@{u}'   # fails if no upstream → stop
   ```

   ```bash
   git fetch origin
   # Remote must not be ahead of local.
   git rev-list --count HEAD..'@{u}'   # > 0 → stop, ask the user to pull first
   ```

   Read the current version:

   ```js
   const current = JSON.parse(bash("cat package.json")).version // e.g. "1.0.10"
   ```

   Do **not** run `npm version` yet — first present the bump choice (step 1) so
   the target tag is known before any check for an existing tag.

1. **Pick the version bump.** Compute the three candidates from `current` and
   ask the user which to apply. Use previews to show old → new.

   ```js
   const [maj, min, pat] = current.split(".").map(Number)
   const candidates = {
     patch: `${maj}.${min}.${pat + 1}`,          // 1.0.10 → 1.0.11
     minor: `${maj}.${min + 1}.0`,                // 1.0.10 → 1.1.0
     major: `${maj + 1}.0.0`,                     // 1.0.10 → 2.0.0
   }

   const bump = await ask_user_question({
     header: "Version",
     question: `Current version is ${current}. Pick the bump for this release.`,
     options: [
       { label: "Patch",
         description: `${current} → ${candidates.patch}`,
         preview: `${current}  →  ${candidates.patch}` },
       { label: "Minor",
         description: `${current} → ${candidates.minor}`,
         preview: `${current}  →  ${candidates.minor}` },
       { label: "Major",
         description: `${current} → ${candidates.major}`,
         preview: `${current}  →  ${candidates.major}` },
     ],
   })

   const NEW = candidates[bump]   // e.g. "1.0.11"
   const TAG = `v${NEW}`          // e.g. "v1.0.11"
   ```

   Then guard against a pre-existing tag:

   ```bash
   git rev-parse --verify --quiet "refs/tags/v${NEW}"   # succeeds → tag exists, stop
   ```

   If the tag already exists, stop and tell the user (they may need a different
   bump, or to delete the stale tag manually).

2. **Write the new version.** `npm version` with `--no-git-tag-version` bumps
   `package.json` **and** `package-lock.json` (root `version` and
   `packages[""].version`) without committing or tagging, and tolerates a dirty
   working tree.

   ```bash
   npm version <patch|minor|major> --no-git-tag-version
   ```

   Verify the bump landed in both files:

   ```js
   const pj = JSON.parse(bash("cat package.json")).version
   const pl = JSON.parse(bash("cat package-lock.json")).version
   if (pj !== NEW || pl !== NEW) stop("version sync failed")
   ```

3. **Decide what to commit.** The version bump always goes in. Other pending
   changes are bundled only if the user agrees.

   ```js
   const status = bash("git status --short")  // one line per change
   const versionFiles = new Set(["package.json", "package-lock.json"])
   const others = status
     .split("\n").filter(Boolean)
     .filter((line) => !versionFiles.has(line.slice(3).trim()))
   ```

   - If `others` is empty → stage only the version files and go to step 4.
   - Otherwise **ask** the user, listing the other changes:

   ```js
   const scope = await ask_user_question({
     header: "Scope",
     question:
       `The version bump is staged for commit. There are other pending ` +
       `changes too:\n\n${others.join("\n")}\n\nInclude them in the release commit?`,
     options: [
       { label: "Version bump only",
         description: "Commit just package.json and package-lock.json." },
       { label: "Include all pending changes",
         description: "Stage everything (the bump plus the files listed above)." },
     ],
   })
   ```

   Stage accordingly:

   ```bash
   # Always:
   git add package.json package-lock.json
   # If "Include all pending changes":
   git add -A
   ```

4. **Commit.**

   ```bash
   git commit -m "chore: release v${NEW}"
   ```

   Capture the commit SHA for the report:

   ```bash
   git rev-parse HEAD
   ```

5. **Tag** the commit with an **annotated** `vX.Y.Z` tag carrying a message.
   Build the message from a shortlog of what shipped since the previous tag
   (fall back to a plain message if there is no previous `v*` tag).

   ```bash
   prev=$(git describe --tags --match 'v*' --abbrev=0 2>/dev/null || true)
   ```

   ```js
   let body = ""
   if (prev) {
     body = "\n\n" + bash(`git shortlog -n -e ${prev}..HEAD`)
   }
   // Subject line first, then the shortlog; git tag -m takes a single message.
   const tagMessage = `Release ${TAG}${body}`
   ```

   ```bash
   git tag -a "v${NEW}" -m "<tagMessage>"
   ```

   Verify the tag is annotated (this prints the tag message; a lightweight tag
   would print nothing):

   ```bash
   git for-each-ref refs/tags/v${NEW} --format='%(objecttype) %(taggerdate)'
   # objecttype should be "tag" (annotated), not "commit"
   ```

6. **Confirm, then push** the commit and the tag to `origin`. This is the
   irreversible step, so confirm first.

   Show the user a summary, then ask:

   ```js
   const go = await ask_user_question({
     header: "Push",
     question:
       `Ready to push to origin:\n` +
       `  commit: ${sha}  (chore: release ${TAG})\n` +
       `  tag:    ${TAG}  (annotated)\n` +
       `  branch: ${bash("git rev-parse --abbrev-ref HEAD")}\n\nPush now?`,
     options: [
       { label: "Push now",
         description: "Push the commit and the tag to origin." },
       { label: "Stop — I'll push manually",
         description: "Leave the commit and tag local; print the push commands." },
     ],
   })
   ```

   If "Push now":

   ```bash
   git push origin HEAD          # the commit(s) on the current branch
   git push origin "v${NEW}"    # the tag
   ```

   If "Stop", do not push. Print the two commands so the user can run them
   manually, and stop.

7. **Report.** Summarize the release:

   - old → new version (e.g. `1.0.10 → 1.0.11`)
   - commit SHA and message
   - tag name (annotated) and its message subject
   - the pushed branch and the `vX.Y.Z` tag URL on the remote

## Notes

- Never use a lightweight tag (`git tag vX.Y.Z` with no `-a`/`-m`). The tag
  must carry a message; always `git tag -a vX.Y.Z -m "..."`.
- Never push with `--force` or move an already-pushed tag. If something is
  wrong after pushing, stop and tell the user how to recover manually.
- If the working tree had other pending changes and the user chose "version
  bump only", those changes remain unstaged/untracked after the release — call
  this out in the report so nothing is silently left behind.
