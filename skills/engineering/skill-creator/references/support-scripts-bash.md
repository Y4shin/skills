# Support Scripts — Bash

Read when the chosen language is Bash. The shared policy (when to ship,
language choice, self-contained-at-runtime, by-hand fallback, shape,
testing, runtime floor, default-stack picks) lives in `support-scripts.md` —
read it first. This file covers only Bash-specific details.

> **Bash is discouraged; prefer Python for anything that must run on
> Windows.** Some Windows agents have no POSIX shell. Use Bash only for tiny
> pure-shell glue; for anything beyond trivial glue, Python is the better
> default (it sidesteps Bash's Windows fragility and handles structured data
> cleanly).

## When Bash is genuinely the right tool

Tiny pure-shell glue: wrapping a few commands, simple file moves, a
one-liner over a list of files. If the script needs JSON parsing, structured
data, error handling beyond a simple `||` check, or any logic that would be
more than a few lines — **stop and use Python instead.** Python avoids both
Bash's Windows fragility and its quoting/word-splitting pitfalls.

## Default shell and strictness

Recommend `#!/usr/bin/env bash` + `set -euo pipefail` by default:

```bash
#!/usr/bin/env bash
set -euo pipefail
```

- `-e` — exit on any command failure.
- `-u` — error on unset variables.
- `-o pipefail` — a pipe fails if any command in it fails (not just the last).

Fall back to `#!/bin/sh` (POSIX) only when the script stays within POSIX and
max portability is wanted. **Note:** `pipefail` is **not** POSIX — a POSIX
`sh` script cannot rely on it. Use explicit `||` checks instead:

```sh
#!/bin/sh
set -eu
# No pipefail — check pipe results explicitly
cmd1 | cmd2 || exit 1
```

## POSIX-vs-GNU coreutils portability

Coreutils behavior differs between POSIX and GNU implementations:

- `sed -i` — GNU `sed` supports `sed -i` inline; BSD/macOS `sed` needs
  `sed -i ''` (empty string). Use a temp file + `mv` for portability.
- `grep -P` — Perl-compatible regex is a GNU extension; POSIX `grep` doesn't
  support it. Use `grep -E` (extended regex, POSIX) or stick to basic patterns.
- `date` — format flags differ (`date +%F` is GNU; BSD `date` uses different
  syntax). Prefer a Python one-liner for date formatting if portability
  matters.
- `readlink -f` — GNU extension; BSD `readlink` doesn't support `-f`. Use
  `python3 -c "import os; print(os.path.abspath('...'))"` for a portable
  absolute path.

When in doubt, prefer a Python one-liner for anything non-trivial — it's
cross-platform and avoids the POSIX/GNU split.

## Quoting and word-splitting pitfalls

- **Always quote variables** — `"$var"`, not `$var`. Unquoted variables
  undergo word splitting and glob expansion.
- **Use `"$@"` (quoted)** for arguments, not `$@` (unquoted). `"$@"` preserves
  each argument as a separate word; `$@` re-splits on spaces.
- **Arrays:** `"${arr[@]}"` (quoted) for all elements; `${#arr[@]}` for count.
- **Avoid `eval`** — it's a quoting nightmare and a security risk. If you
  need dynamic variable names, use an associative array instead.

```bash
# ✅ Good
for file in "$@"; do
  process "$file"
done

# ❌ Bad — word-splitting on spaces in filenames
for file in $@; do
  process $file
done
```

## Keep to stdlib coreutils only

Bash scripts should use only the shell builtins and standard coreutils
(`cp`, `mv`, `rm`, `mkdir`, `cat`, `grep`, `sed`, `awk`, `sort`, `find`,
etc.). **Avoid requiring external CLI tools** such as `jq` — if the script
needs JSON parsing or structured data, **prefer Python** (which also
sidesteps Bash's Windows fragility). This keeps the script self-contained
per the shared policy (no extra CLI tools present at the end-user runtime).

## Testing

Per the shared policy (Q4): test on a worked example with a known answer.
For Bash, the primary testing tool is **shellcheck** — run it on the script
to catch quoting, word-splitting, and portability issues:

```bash
shellcheck script.sh
```

Then run the script on a known input and assert the output. If the skill
lives in a project with a test runner, use it; otherwise run the script
directly and diff against a known-good literal.

## By-hand fallback

Per the shared safety decision in `support-scripts.md` — a by-hand fallback
is a considered, safety-first choice, not a default. Omit it for
dangerous/irreversible/non-obvious ops; provide it only when the path is
safe, deterministic, and within the agent's reliable capability. Do not
restate the shared policy here — refer to it.
