"""Lint the YAML frontmatter of the planning artifacts under ``docs/prd``.

The ``create-*`` / ``*-prd-to-issues`` skills always emit conforming frontmatter,
but a *legacy* or hand-written artifact may be missing the block entirely, carry
the wrong ``kind``, or omit required fields. This module scans the tree by **file
location** (not by parsing first, so a file with no fence is still reportable)
and returns a clear, concise list of what each artifact is missing — the input
the ``adopt-prd`` skill uses to fix up a whole directory at once.

All three frontmatter-bearing artifacts are linted:
``docs/prd/epics/*/epic.md`` (epic), ``docs/prd/*/prd.md`` (feature|capability),
and ``docs/prd/*/slices/<n>-<slug>.md`` (slice — inherits its parent PRD's kind).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from .frontmatter import FrontmatterError, parse
from .model import prd_root

# Allowed value domains, keyed by the artifact's expected kind.
_EPIC_STATUS = ("draft", "prds-planned", "in-progress", "done")
_PRD_STATUS = ("draft", "issues-created", "in-progress", "done")
_PRD_KINDS = ("feature", "capability")
_SLICE_MODES = ("hitl", "afk")
_SLICE_RE = re.compile(r"^(\d+)-(.+)\.md$")  # <issue>-<slug>.md


@dataclass
class Report:
    """The lint result for one artifact file."""

    path: Path
    family: str                 # "epic" | "prd" | "slice" — inferred from location
    violations: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.violations


def _nonempty_str(v) -> bool:
    return isinstance(v, str) and bool(v.strip())


def _check_str(data: dict, key: str, out: list[str]) -> None:
    if key not in data:
        out.append(f"missing required field '{key}'")
    elif not _nonempty_str(data[key]):
        out.append(f"field '{key}' is empty — expected a non-empty string")


def _check_choice(data: dict, key: str, choices: tuple[str, ...], out: list[str]) -> None:
    allowed = ", ".join(choices)
    if key not in data:
        out.append(f"missing required field '{key}' (expected one of: {allowed})")
    elif data[key] not in choices:
        out.append(f"field '{key}' is {data[key]!r} — must be one of: {allowed}")


def family_for(path: Path) -> str:
    """Classify an artifact file by its location in the docs/prd tree."""
    if path.name == "epic.md" or path.parent.parent.name == "epics":
        return "epic"
    if path.parent.name == "slices":
        return "slice"
    return "prd"


def validate_data(data: dict, family: str) -> list[str]:
    """Return the field-level frontmatter violations of *data* for *family*.

    Checks required fields and value domains only; location-consistency checks
    (slug vs directory/filename) live in :func:`validate_file`, which has the
    path. An empty list means the frontmatter conforms.
    """
    out: list[str] = []
    if family == "epic":
        _check_choice(data, "kind", ("epic",), out)
        _check_str(data, "title", out)
        _check_str(data, "slug", out)
        _check_choice(data, "status", _EPIC_STATUS, out)
    elif family == "slice":
        _check_choice(data, "kind", _PRD_KINDS, out)
        _check_str(data, "title", out)
        _check_str(data, "slug", out)
        if "issue" not in data:
            out.append("missing required field 'issue'")
        elif not isinstance(data["issue"], int):
            out.append(f"field 'issue' is {data['issue']!r} — expected an integer issue number")
        _check_str(data, "prd", out)
        _check_choice(data, "mode", _SLICE_MODES, out)
    else:  # prd
        _check_choice(data, "kind", _PRD_KINDS, out)
        _check_str(data, "title", out)
        _check_str(data, "slug", out)
        _check_choice(data, "status", _PRD_STATUS, out)
    return out


def validate_file(path: Path, family: str) -> Report:
    """Parse and lint a single artifact file, capturing a missing/broken fence
    and any mismatch between the frontmatter and the file's own location."""
    try:
        doc = parse(path)
    except FrontmatterError as e:
        # Strip the redundant "<path>: " prefix the parser prepends.
        msg = str(e).split(": ", 1)[-1]
        return Report(path=path, family=family, violations=[f"no/invalid frontmatter: {msg}"])

    out = validate_data(doc.data, family)
    data = doc.data
    if family == "slice":
        m = _SLICE_RE.match(path.name)
        if not m:
            out.append(f"filename {path.name!r} does not match the '<issue>-<slug>.md' convention")
        else:
            num, fslug = int(m.group(1)), m.group(2)
            if _nonempty_str(data.get("slug")) and data["slug"] != fslug:
                out.append(f"slug {data['slug']!r} does not match the filename slug {fslug!r}")
            if isinstance(data.get("issue"), int) and data["issue"] != num:
                out.append(f"issue {data['issue']} does not match the filename number {num}")
    else:  # epic / prd: slug should be the directory name
        dir_name = path.parent.name
        if _nonempty_str(data.get("slug")) and data["slug"] != dir_name:
            out.append(f"slug {data['slug']!r} does not match directory name {dir_name!r}")
    return Report(path=path, family=family, violations=out)


def candidate_files(root: Path) -> list[tuple[Path, str]]:
    """Every frontmatter-bearing artifact path under docs/prd, with its family.

    Enumerated by glob (not by ``discover_*``, which would raise on the first
    file lacking a fence), so unstructured files are still surfaced.
    """
    base = prd_root(root)
    out: list[tuple[Path, str]] = []
    epics = base / "epics"
    if epics.is_dir():
        for f in sorted(epics.glob("*/epic.md")):
            out.append((f, "epic"))
    if base.is_dir():
        for f in sorted(base.glob("*/prd.md")):
            if f.parent.parent.name == "epics":  # belt-and-braces
                continue
            out.append((f, "prd"))
        for f in sorted(base.glob("*/slices/*.md")):
            out.append((f, "slice"))
    return out


def scan(root: Path) -> list[Report]:
    """Lint every artifact under docs/prd; returns one Report per file."""
    return [validate_file(path, family) for path, family in candidate_files(root)]
