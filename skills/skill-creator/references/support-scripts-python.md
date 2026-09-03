# Support Scripts — Python

Read when the chosen language is Python. The shared policy (when to ship,
language choice, self-contained-at-runtime, by-hand fallback, shape,
testing, runtime floor, default-stack picks) lives in
`support-scripts.md` — read it first. This file covers only Python-specific
details.

## Shebang

Every Python helper starts with:

```python
#!/usr/bin/env python3
```

This finds `python3` on the user's `PATH` without hardcoding a path. Make the
file executable (`chmod +x`), but also support `python3 script.py` invocation
for agents that run it explicitly.

## Self-contained at runtime: stdlib-only or `zipapp`

Two paths (the shared policy in `support-scripts.md` explains *why* — the end
user must not install libraries or have extra CLI tools):

### 1. Stdlib-only (lightest)

No dependencies. Use this whenever the stdlib suffices (`argparse`, `json`,
`csv`, `pathlib`, `subprocess`, `datetime`, `difflib`, `html.parser`, etc.).
The source *is* the artifact — commit it and run it directly.

### 2. `zipapp` bundling (when libraries are used)

When the helper needs a library (from the default-stack table in the shared
file), bundle deps + script into one committed `.pyz` (zipapp) via a build
step:

- The build step produces a committed `helper.pyz` (the zipapp) that the end
  user runs with `python3 helper.pyz <args>` — no venv, no `PYTHONPATH`, no
  installed libraries.
- **Keep the readable source** (`src/your_pkg/cli.py`) alongside the
  committed `.pyz` for patching (the "runnable AND readable" principle).
- The build step + committed artifact are an **authoring concern** (the
  skill-author commits them), not run by the end user.

The concrete `zipapp` build recipe (one-file build command, entrypoint, where
the committed artifact lives) is provided by the `bundle-script-template`
prototype. This reference states the `zipapp` path at the **policy level** and
points to the prototype's findings (`docs/tasks/bundle-script-template/
findings.md`) for the concrete template. The follow-up task
`fold-bundle-templates-into-refs` folds the verified template here.

## Inputs

- **`argparse`** for CLI arguments — it's stdlib, handles `--flags`,
  positional args, help text, and subcommands.
- **stdin** for piped input when the script is part of a pipeline.
- Avoid interactive `input()` prompts unless the script's explicit purpose
  is human-interactive (the consumer is usually an LLM, not a human at a
  terminal).

## Exit codes

- `0` — success.
- Non-zero — failure. Use `sys.exit(1)` for a general failure, or specific
  codes if the caller distinguishes them. Print a helpful message to stderr
  before exiting (see "Shape" in the shared file).

## Known-good-literal vs recomputed-value (numeric scripts)

When a script computes a numeric result, **test it against a known-good
literal** — a value you verified independently (by hand, from a spec, or
from a trusted source). **Never** assert against a value recomputed the same
way the script computes it: that test passes by construction and can never
disagree with the implementation. If the script has a bug, a recomputed
expected value carries the same bug.

```python
# ✅ Good — the expected value is a known-good literal
assert compute_checksum(b"hello") == 0x36106061  # verified independently

# ❌ Bad — recomputed the same way, so it can never disagree
assert compute_checksum(b"hello") == compute_checksum(b"hello")
```

This is the tautological-test anti-pattern from the TDD skill, applied to
numeric scripts.

## Testing

Per the shared policy (Q4): test on a worked example with a known answer. If
the skill lives in a project with pytest, use it. Otherwise run the script
directly on a known input and assert the output:

```bash
python3 helper.pyz --input known.json --output result.json
diff result.json expected.json  # known-good literal
```

When bundling, test the **committed `.pyz`** (what the end user runs), not
only the source. For stdlib-only scripts the source *is* the artifact.

## Min-version contract

Python floor = **3.10**. The script's `main` should check `sys.version_info`
and error with a useful "install at least Python 3.10" message if run older.
An agent reading that error must **consult the user before installing
anything** — never silently install an interpreter.

```python
import sys

if sys.version_info < (3, 10):
    sys.exit("Error: this script requires Python 3.10+. "
             "Please install Python 3.10 or newer. "
             "(If you are an agent, ask the user before installing.)")
```

Pin library majors that satisfy the floor (see the default-stack table in the
shared file for the concrete pins).

## By-hand fallback

Per the shared safety decision in `support-scripts.md` — a by-hand fallback
is a considered, safety-first choice, not a default. Omit it for
dangerous/irreversible/non-obvious ops; provide it only when the path is
safe, deterministic, and within the agent's reliable capability. Do not
restate the shared policy here — refer to it.
