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

#### Bundle template (Python)

The concrete `zipapp` build — stdlib only (no third-party build tool, no
`pyproject.toml`):

```bash
# 1. Vendor deps into a dir (floor python; --target avoids touching site-packages).
#    Use --python "$(command -v python3)" so uv uses the system python3 (the
#    floor 3.10) instead of a newer managed CPython.
uv venv --python python3 .venv && source .venv/bin/activate
uv pip install --python "$(command -v python3)" --target build/deps -r requirements.txt

# 2. Compose the zip root: deps + your package(s) side by side.
mkdir -p build/pkg && cp -r build/deps/* build/pkg/ && cp -r src/your_pkg build/pkg/

# 3. Build the .pyz (-m generates __main__.py; -c compresses).
python -m zipapp build/pkg -m "your_pkg.cli:main" -o dist/helper.pyz -c
```

- **Run on the bare floor:** `python3 dist/helper.pyz <args>` — no venv, no
  `PYTHONPATH`, no installed libraries (the `.pyz` is self-contained).
- **Min-version contract:** the `.pyz` shebang is `#!/usr/bin/env python3`; if
  the helper needs a floor newer than the user's python, the script's `main`
  must check `sys.version_info` and error with "install at least 3.10" (an
  agent reading that error must consult the user before installing — never
  silently install an interpreter). See [Min-version contract](#min-version-contract) below.
- **`shiv` / `pex` rejected** — heavier pip-driven alternatives that require
  an installable project (wheel build), a correct console-script name, and
  fight externally-managed pythons. `shiv` also hit entry-resolution failure
  (`ModuleNotFoundError: No module named 'helper_pkg'`) at runtime in the
  prototype. `zipapp` is a one-liner over a vendored deps dir with zero config.

> **Verified at Python 3.10** via the `bundle-script-template` prototype — the
> `zipapp` template produced a self-contained `.pyz` that ran clean on the bare
> floor runtime (no venv, no `PYTHONPATH`). See
> `docs/tasks/bundle-script-template/findings.md` for the build comparison and
> smoke-test results.

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

## Verified default-stack table (Python)

The shared `support-scripts.md` lists the full default-stack table for both
languages. Below is the **Python column**, verified at the floor (Python 3.10)
via the `bundle-script-template` prototype — every pick passed when bundled
into a self-contained `.pyz` and run on the bare floor runtime (no venv, no
`PYTHONPATH`).

| # | Slot | Python pick |
|---|------|-------------|
| 1 | CLI parsing | `click` |
| 2 | HTTP requests | `httpx` |
| 3 | config/env/secrets | `PyYAML` + stdlib `json`/`os` |
| 4 | formatting (LLM-facing) | *(plain text — no entry)* |
| 5 | validation/schemas | `marshmallow` |
| 6 | FS traversal/globbing | *(stdlib `pathlib`/`glob`)* |
| 7 | process/subprocess | *(stdlib `subprocess`)* |
| 8 | OpenAPI client (codegen) | `datamodel-code-generator` (gen dataclasses/TypedDict = 0 runtime deps) |
| 9 | local interactive web UI | `bottle` + vendored htmx |
| 10 | local REST API server | `bottle` (JSON endpoints) |
| 11 | retry/backoff | `tenacity` |
| 12 | output templating | `jinja2` |
| 13a | markdown render | `mistune` |
| 13b | HTML parse | `beautifulsoup4` (stdlib `html.parser` backend) |
| 14 | diffing/patching text | *(stdlib `difflib`)* |
| 15 | date/time | *(stdlib `datetime`)* |
| 16 | tabular (CSV/TSV) | *(stdlib `csv`)* |
| 17 | git operations | `dulwich` (pure-Py fallback; no git binary) |

> Verified at Python 3.10 via the `bundle-script-template` prototype — all 17
> slots passed on the bare floor runtime bundled into a self-contained
> `.pyz`. See `docs/tasks/bundle-script-template/findings.md` for the full
> smoke-test results.

## By-hand fallback

Per the shared safety decision in `support-scripts.md` — a by-hand fallback
is a considered, safety-first choice, not a default. Omit it for
dangerous/irreversible/non-obvious ops; provide it only when the path is
safe, deterministic, and within the agent's reliable capability. Do not
restate the shared policy here — refer to it.
