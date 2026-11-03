---
type: findings
title: Keying and layout for the local state root
status: stable
---

# Findings: keying and layout for the local state root

## Question

How should the local state root outside the repo be keyed and laid out: the
per-repo identity derived from the repo path (special characters, length,
collisions, symlinks, worktrees, moves), pi's own conventions for machine-local
state, the naming, and the marker that marks a repo as locally set up.

## Sources

1. `src/pi.ts:201-214` - root discovery and the state anchor: `findRoot` walks
   up to the first dir holding `docs/tasks` or `.git`; `taskRoot(root) =
   join(root, "docs", "tasks")`.
2. `src/pi.ts:246-247,3554` - setup detection today is exactly
   `isInitialized(root) = isDir(join(root, "docs", "tasks"))`, no marker, no
   version check, no cache; the gate resolves once per process from
   `process.cwd()`, not from a tool call's cwd.
3. `src/core/repo-gate.ts:59-72` - `walkToGitRoot` stops at the first dir with
   `.git`; in a worktree `.git` is a file, so a worktree is its own root.
4. `src/core/state.ts:1-45`, `docs/tasks/state.yaml`, `src/core/migrate.ts:99` -
   the pointer model a local state file must mirror (`schema_version: 5`, `map`,
   `task`).
5. `docs/ideas/gate-skills-by-repo.md` - prior art: one global JSON key
   `taskWorkflow.disableOnRepo` in `~/.pi/agent/settings.json`, config patterns
   only, not per-repo state.
6. `docs/tasks/local-state-efforts/map.md:16-17` - the raw sketch
   `~/.pi/task-workflow/external-state/<path-relative-to-~>/` is a possibility,
   not a decision; "external" wording is retracted.
7. pi docs: `docs/sessions.md:50` (sessions grouped by working directory);
   `docs/configuration.md:5-17` (agent dir, default `~/.pi/agent`);
   `docs/environment-variables.md:81-82` (`PI_CODING_AGENT_DIR`);
   `docs/security.md:57-71` (trust.json, "saved decisions use canonical
   directory paths").
8. pi source, the exact encoding
   (`.../pi-monorepo/dist/core/session-manager.js:288-296`):
   `const safePath = \`--${resolvedCwd.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-")}--\`;`
   over `resolvePath(cwd)` (lexical, no realpath), and `getDefaultSessionDir`
   `mkdirSync`s the directory as a side effect of reading it.
9. pi source (`dist/config.js:491-497`): `getAgentDir()` honours
    `PI_CODING_AGENT_DIR`, else `join(homedir(), ".pi", "agent")`; exported at
    `dist/index.d.ts:2`, so importable from `@earendil-works/pi-coding-agent`,
    already a dependency (`src/pi.ts:18`).
10. Local filesystem, `~/.pi/agent/`: `sessions/--home-patric-Projects-skills--/`;
    `trust.json` (map keyed by canonical absolute path); `missions/projects/<64
    hex>/` with `missions/index/<hash>.json` carrying
    `"projectRoot": "/home/patric/Projects/homeserver"`.

## Findings

**F1. pi has three per-project conventions, not one.** (a) encoded absolute
path as a dir name (sessions); (b) `sha256(absolute path)` as a dir name with
the real path inside a record (verified: `printf %s
/home/patric/Projects/homeserver | sha256sum` equals the existing
`missions/projects/14f35ea9...` dir); (c) JSON keyed by canonical absolute path
(trust.json). Confidence: high.

**F2. The pi session encoding is lossy and collides.** `/x/a/b` and `/x/a-b`
both become `--x-a-b--` (verified in node against the exact expression).
Confidence: high.

**F3. Spaces, unicode, trailing spaces survive verbatim.** Verified:
`/tmp/enc-test/a b` to `--tmp-enc-test-a b--`; `/tmp/enc-test/ünïcode` to
`--tmp-enc-test-ünïcode--`. Not shell-safe: a directory name can contain
spaces. Confidence: high.

**F4. It overflows NAME_MAX on deep paths.** `getconf NAME_MAX` is 255 bytes
here; a 261-char path encoded to a 264-byte name and `mkdir` failed with
`ENAMETOOLONG` (verified). The ceiling is a 251-character absolute path, since
4 bytes go to the `--` wrappers, and unicode costs more bytes than characters.
pi's own sessions tree carries the same latent failure. Confidence: high.

**F5. It does not resolve symlinks.** `path.resolve` is lexical, so a symlinked
working dir gives a different key from its target (verified:
`/tmp/enc-test/link -> /tmp/enc-test/a b` yields `--tmp-enc-test-link--` versus
`--tmp-enc-test-a b--`). No canonicalization anywhere in pi. Confidence: high.

**F6. A worktree is its own root, hence its own state.** Verified on a scratch
repo: in the worktree `git rev-parse --show-toplevel` returns the worktree path
while `--git-common-dir` returns the main checkout's `.git`. `repo-gate.ts`
already treats a worktree as a separate repo. Confidence: high.

**F7. Home-relative keys break outside `$HOME`.** `path.relative(homedir(),
"/mnt/c/Users/Patric/Projects/deckbox")` is
`"../../../mnt/c/Users/Patric/Projects/deckbox"`, so the raw sketch's
`<path-relative-to-~>` puts `..` traversal inside a directory name. This
machine has exactly such a repo, already trusted in `trust.json`: a concrete
counterexample, not a hypothetical. Confidence: high.

**F8. `PI_CODING_AGENT_DIR` moves the agent tree.** Hardcoding `~/.pi/agent`
breaks when it is set; `getAgentDir()` is the supported lookup. Confidence:
high.

**F9. `mkdir` inside a lookup is a bad precedent.** A probe from the gate in
every repo would litter the local state root with empty dirs for repos never
set up. Detection must be read-only. Confidence: high on the source fact,
medium on the harm.

## Layout options

All options put the root under `<agent-dir>/task-workflow/local-state/`,
resolved through `getAgentDir()`, and differ in the per-repo dir name.

**A. pi session style, encoded absolute path** -
`local-state/repos/--home-patric-Projects-skills--/`.
Identity: absolute path, lexical. Same key as `~/.pi/agent/sessions/` for the
same cwd, which helps a human debugging both. Collisions: silent (F2), and a
collision silently merges two repos' workflow history, the worst failure in
this space. Length: fails above a 251-char path (F4) with no fallback.
Readability and listing: excellent; `ls` reads like the path and sorts by
parent. Cost: zero, the transform already exists in the ecosystem.

**B. Readable slug plus short path hash (recommended)** -
`local-state/repos/home-patric-Projects-skills-92f23aef3689/`.
Name is the encoded path minus the `--` wrappers, truncated to 200 chars from
the leaf side, then `-`, then the first 12 hex of `sha256(canonical path)`.
Verified name lengths: 40, 50, 48, 63 for the real repos here; 213 for a
261-char path; all under 255. Identity: canonical absolute path, injective in
practice. Collisions: gone, and truncation cannot collide since the hash covers
the whole path. Length: bounded, so no ENAMETOOLONG class at all. Readability:
high, the leaf project name always survives leaf-side truncation. Listing:
high, `ls` sorts by path and `ls | grep <name>` works. Cost: 13 chars of noise,
and a name no longer byte-identical to pi's session dir for the same repo.

**C. Pure hash with a manifest (pi missions style)** -
`local-state/repos/<64 hex>/local-setup.yaml` carrying `repo: /abs/path`.
Identity stored, not encoded. No collisions, no length risk. Readability zero:
"which repo is this" needs a file open. Listing needs a registry or a
scan-and-read of every manifest to answer "which repos are locally set up", the
one listing the spec will actually want (doctor, init guard). Upside: a future
encoding change is a no-op, and a move repair is one manifest edit.

**D. Mirrored filesystem tree** - `local-state/repos/home/patric/Projects/skills/`.
Identity is the path itself: no encoding, no collisions, no length arithmetic
beyond what the real tree already tolerates. Readability and listing best of
all: `tree`, `find`, tab completion, even `cd`. Cost: metadata filenames live
inside a tree whose leaf is a repo name, so a repo literally named `state.yaml`
or `local-setup.yaml` collides with metadata; every lookup walks several levels;
and listing locally set up repos becomes a recursive walk that cannot tell a
repo dir from an intermediate dir without reading a marker. On a
case-insensitive filesystem two repos differing only in case merge undetected.

## Recommendation

**Option B.** It is the only option simultaneously collision free, length safe,
human readable, and listable without a registry; A and C each fail one of those
outright, D fails on marker ambiguity.

```
<agent-dir>/task-workflow/
  local-state/
    repos/
      home-patric-Projects-skills-92f23aef3689/
        local-setup.yaml     <- the marker, written once by the local init
        state.yaml           <- same schema as the in-repo state.yaml
        hooks.yaml           <- the hook declaration (design-hook-mechanism)
        efforts/<effort>/...
```

Naming: `task-workflow` for the package tree under the agent dir (matches the
package name) and `local-state` for the state root, so the directory renames
with the concept; `external-state` is retracted (`map.md:16`) and `local-state`
matches the map's vocabulary. `repos/` is deliberate indirection, leaving room
for machine-wide files beside it (`local-state/README.md`, a future registry)
without mixing them with per-repo dirs.

## The local-setup marker

`local-setup.yaml`, at the per-repo directory root:

```yaml
schema_version: 1
kind: local
repo: /home/patric/Projects/skills
created_at: 2026-11-02T23:44:00Z
```

Detection reads exactly this and nothing else:

1. `root = findRoot(cwd)`, unchanged (`src/pi.ts:201`).
2. `canonical = realpathSync(root)`; `key = slug(canonical)` (option B).
3. `marker = <agent-dir>/task-workflow/local-state/repos/<key>/local-setup.yaml`.
4. `existsSync(marker)` only. No `mkdir`, no directory creation on a probe
   (F9). Absent means "not locally set up", which is not an error.
5. If present, parse; require `kind: local`, an integer `schema_version`, and
   `repo === canonical`. A mismatch is a hard refusal naming both the stored and
   the detected path: the second line of defence against a scheme change or a
   hand-moved directory.
6. Both-setups refusal: marker present and `docs/tasks/` also present in the
   repo means refuse, naming both, per `map.md:34`.
7. The regular setup keeps today's rule (`isDir(docs/tasks)`), so other repos
   behave exactly as today (`map.md:35`).
8. `realpathSync` is the identity canonicalizer, not lexics, so a symlinked
   workspace does not spawn a second empty local state for one repo (F5). This
   deliberately diverges from pi's lexical session keying; the spec should say
   so, so nobody "fixes" it back.

`state.yaml` keeps the in-repo shape (`schema_version: 5`, `map`, `task`), so
`src/core/state.ts` is reused unchanged and only the base path differs.

## Impact on dependents

- **The spec**: root path, keying function (pure, in `src/core`, testable with
  no disk, mirroring `repo-gate.ts`'s pure-core-plus-injected-fs style), marker
  contract, detection order.
- **`design-hook-mechanism`**: `hooks.yaml` sits beside the marker, in the same
  directory detection already opened.
- **`survey-in-repo-assumptions`**: every `taskRoot(root)` call site
  (`src/pi.ts:212` and its users) becomes `taskRoot(root)` or
  `localStateDir(canonical)`, chosen once per call from the detection result.
- **The init sister skill**: creates the tree, writes the marker, never
  converts (a non-goal, `map.md:26`).
- **`task-workflow-doctor`**: two new checks, a marker whose `repo` does not
  match its own directory key, and a locally set-up repo that also has
  `docs/tasks`.
- **Tests**: keying is pure, so collision (`/x/a/b` vs `/x/a-b`), unicode,
  space, 251-char, and 400-char cases are unit tests with no filesystem, plus
  one real-temp-dir test for the marker.

## Unresolved questions

1. **Hook file naming**: `hooks.yaml` grates against git's `hooks/`; the hook
   task owns the format and should confirm the name.
2. **Truncation rule**: leaf-side truncation can make two deep repos share a
   readable prefix (the hash still disambiguates). Consider keeping the first
   segment and the last two, then hashing.
3. **Case-insensitive filesystems**: the hash covers the path as typed, so on
   APFS `/Projects/X` and `/projects/x` get different keys for one repo. Out of
   scope; the marker's `repo` field is the cheap future fix.
4. **Two version counters**: marker `schema_version: 1` versus state
   `schema_version: 5`. Different files with different lifecycles is right, but
   the spec must say so, and say whether local init owns marker upgrades (the
   map's fog already asks).
5. **Moved or renamed repos**: identity is the path, so a move orphans the
   state. Repair is a non-goal; the `repo` field plus the hash make a later
   `rehome` two lines. Detection cannot cheaply say "an orphaned local state
   used to be this repo", so silence is recommended for now.
6. **An override for the state root**: not proposed. A user who relocates the
   agent dir takes local state along via `PI_CODING_AGENT_DIR`; confirm that is
   acceptable rather than adding a second env var.
