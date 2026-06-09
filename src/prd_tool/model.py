"""Discover and resolve prd-workflow artifacts in a repo's ``docs/prd`` tree.

Layout (see references/artifacts.md):

    docs/prd/epics/<slug>/epic.md     kind: epic
    docs/prd/<slug>/prd.md            kind: feature | capability
    docs/prd/<slug>/slices/<n>-<slug>.md   (no frontmatter; presence == state)

Only ``epic.md`` and ``prd.md`` carry YAML frontmatter. Slice docs are tracked
by filename and by their presence on disk (a surviving slice doc means
unfinished work), so we model them as plain files, not frontmatter documents.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from .frontmatter import Document, FrontmatterError, parse

EPIC_KIND = "epic"
PRD_KINDS = ("feature", "capability")
_SLICE_RE = re.compile(r"^(\d+)-(.+)\.md$")


class ResolutionError(ValueError):
    """A selector matched no artifact, or matched more than one."""


def find_root(start: Path) -> Path:
    """Walk up from *start* to the repo root (the dir containing ``docs/prd``,
    or failing that a ``.git``). Falls back to *start* itself."""
    start = start.resolve()
    for d in (start, *start.parents):
        if (d / "docs" / "prd").is_dir() or (d / ".git").exists():
            return d
    return start


def prd_root(root: Path) -> Path:
    return root / "docs" / "prd"


@dataclass
class Artifact:
    path: Path          # the .md file carrying the frontmatter
    kind: str           # epic | feature | capability
    doc: Document

    @property
    def dir(self) -> Path:
        return self.path.parent

    @property
    def slug(self) -> str:
        return self.doc.data.get("slug") or self.dir.name

    @property
    def status(self) -> str | None:
        return self.doc.data.get("status")

    @property
    def issue(self) -> int | None:
        # PRDs carry prd_issue; an epic is a milestone, not an issue (see `milestone`).
        return self.doc.data.get("prd_issue")

    @property
    def milestone(self) -> int | None:
        # An epic is represented by a milestone (epic_milestone); PRDs have none.
        return self.doc.data.get("epic_milestone")

    @property
    def slices_dir(self) -> Path:
        return self.dir / "slices"

    def slice_files(self) -> list[Slice]:
        d = self.slices_dir
        if not d.is_dir():
            return []
        out: list[Slice] = []
        for f in sorted(d.glob("*.md")):
            m = _SLICE_RE.match(f.name)
            if m:
                out.append(Slice(path=f, number=int(m.group(1)), slug=m.group(2)))
        return out


@dataclass
class Slice:
    path: Path
    number: int
    slug: str


def discover_epics(root: Path) -> list[Artifact]:
    base = prd_root(root) / "epics"
    if not base.is_dir():
        return []
    out = []
    for f in sorted(base.glob("*/epic.md")):
        try:
            doc = parse(f)
        except FrontmatterError:
            continue  # unstructured/legacy doc — surfaced by the validate.* linter, not here
        out.append(Artifact(path=f, kind=doc.data.get("kind", EPIC_KIND), doc=doc))
    return out


def discover_prds(root: Path) -> list[Artifact]:
    base = prd_root(root)
    if not base.is_dir():
        return []
    out = []
    for f in sorted(base.glob("*/prd.md")):
        if f.parent.parent.name == "epics":  # belt-and-braces; epics have epic.md
            continue
        try:
            doc = parse(f)
        except FrontmatterError:
            continue  # unstructured/legacy doc — surfaced by the validate.* linter, not here
        out.append(Artifact(path=f, kind=doc.data.get("kind", "feature"), doc=doc))
    return out


def discover_all(root: Path) -> list[Artifact]:
    return discover_epics(root) + discover_prds(root)


def _as_issue(selector: str) -> int | None:
    s = selector.lstrip("#")
    return int(s) if s.isdigit() else None


def resolve(root: Path, selector: str, *, want: str | None = None) -> Artifact:
    """Resolve a selector to a single artifact.

    A selector is one of: a path to an ``epic.md``/``prd.md`` or its directory,
    an issue number (``42`` or ``#42``), or a ``slug``. *want* optionally
    constrains the artifact kind: ``"epic"`` or ``"prd"``.
    """
    candidates = (
        discover_epics(root) if want == "epic"
        else discover_prds(root) if want == "prd"
        else discover_all(root)
    )

    # 1) explicit path
    p = Path(selector)
    if p.exists():
        target = (p / ("epic.md" if (p / "epic.md").exists() else "prd.md")) if p.is_dir() else p
        target = target.resolve()
        for a in candidates:
            if a.path.resolve() == target:
                return a
        raise ResolutionError(f"{selector!r} is not a recognised artifact under {prd_root(root)}")

    # 2) issue number (PRD issue) or milestone number (epic)
    n = _as_issue(selector)
    if n is not None:
        hits = [a for a in candidates if a.issue == n or a.milestone == n]
    else:
        # 3) slug (frontmatter slug or directory name)
        hits = [a for a in candidates if a.slug == selector or a.dir.name == selector]

    if not hits:
        raise ResolutionError(f"no {want or 'artifact'} matches {selector!r}")
    if len(hits) > 1:
        where = ", ".join(str(a.path) for a in hits)
        raise ResolutionError(f"{selector!r} is ambiguous — matches: {where}")
    return hits[0]
