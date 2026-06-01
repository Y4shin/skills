"""Bundle prd_tool + its deps into a single zipapp artifact.

Exposed as the ``prd-tool-build`` console script — run it from the Nix devshell:

    uv run prd-tool-build

Steps:
  1. ``uv pip install`` the project (and its click/pyyaml deps) into a staging dir.
  2. Prune compiled extensions / metadata so the result is pure-Python and small
     (PyYAML transparently falls back to its pure-Python loader without _yaml).
  3. Drop a root ``__main__.py`` shim and zip the tree into one ``.pyz``.

Output: ``plugins/prd-workflow/scripts/prd_tool.pyz`` — the single Python
artifact the plugin ships.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
import zipapp
from pathlib import Path

# src/prd_tool/_build.py → repo root is three levels up.
ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "plugins" / "prd-workflow" / "scripts" / "prd_tool.pyz"
# The frontmatter reference is bundled into the package so `prd-tool reference`
# can print it — the skills inject it that way instead of `cat`-ing a file
# outside the consuming repo's working directory (which the host blocks).
REFERENCE = ROOT / "plugins" / "prd-workflow" / "references" / "artifacts.md"
INTERPRETER = "/usr/bin/env python3"

# Cruft that can't run from inside a zip (extensions) or just bloats it.
# Globs are matched recursively — compiled exts live nested under packages.
PRUNE_GLOBS = ("**/*.so", "**/*.pyd", "**/__pycache__", "**/*.dist-info", "**/*.egg-info")
PRUNE_DIRS = ("bin",)
PRUNE_FILES = (".lock", "prd_tool/_build.py")  # uv lock + the build tool itself


def run(*cmd: str) -> None:
    print("+", " ".join(cmd))
    subprocess.run(cmd, check=True, cwd=ROOT)


def stage(staging: Path) -> None:
    # Install the project + deps for the current (Nix) interpreter into staging.
    run("uv", "pip", "install", "--target", str(staging), str(ROOT))


def prune(staging: Path) -> None:
    for pattern in PRUNE_GLOBS:
        for p in staging.glob(pattern):
            shutil.rmtree(p) if p.is_dir() else p.unlink()
    for name in PRUNE_DIRS:
        shutil.rmtree(staging / name, ignore_errors=True)
    for name in PRUNE_FILES:
        (staging / name).unlink(missing_ok=True)


def bundle_reference(staging: Path) -> None:
    # Drop the frontmatter reference next to the package so importlib.resources
    # can read it from inside the zipapp.
    shutil.copyfile(REFERENCE, staging / "prd_tool" / "artifacts.md")


def write_shim(staging: Path) -> None:
    (staging / "__main__.py").write_text(
        "import sys\n"
        "from prd_tool.cli import main\n"
        "sys.exit(main())\n",
        encoding="utf-8",
    )


def build() -> None:
    # Stage in a throwaway temp dir so nothing persists in the repo between runs.
    with tempfile.TemporaryDirectory(prefix="prd-tool-build-") as tmp:
        staging = Path(tmp)
        stage(staging)
        prune(staging)
        bundle_reference(staging)
        write_shim(staging)
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        if OUTPUT.exists():
            OUTPUT.unlink()
        zipapp.create_archive(
            source=staging,
            target=OUTPUT,
            interpreter=INTERPRETER,
            compressed=True,
        )
    OUTPUT.chmod(0o755)
    size_kb = OUTPUT.stat().st_size / 1024
    print(f"\nwrote {OUTPUT.relative_to(ROOT)}  ({size_kb:.0f} KiB)")


def main() -> int:
    try:
        build()
    except subprocess.CalledProcessError as e:
        return e.returncode
    return 0


if __name__ == "__main__":
    sys.exit(main())
