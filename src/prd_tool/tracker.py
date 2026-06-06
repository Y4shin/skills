"""Local file-based issue tracker for git repos without a remote.

When a git repo has no recognised git host — no ``origin`` remote — the
prd-workflow ``forge`` selects the ``local`` provider, whose command snippets
drive this tracker instead of ``gh``/``fgj``. Issues, their labels,
dependencies, and epic milestones live in a single JSON ledger in the
consuming repo at ``docs/prd/tracker.json``. The branch workflow
(``prd/<slug>``, ``slice/<n>-<slug>``) works identically to hosted forges —
only remote operations (fetch, push, PRs) are skipped; the PRD branch merges
into ``main`` locally at finalize.

The shape deliberately mirrors what the skills already read from ``gh``/``fgj``:
issues carry a ``number``, ``title``, ``body``, ``labels``, ``state``
(``open``/``closed``), free-text ``comments``, native ``blocked_by`` dependency
edges, and an optional ``milestone`` number (the epic it belongs to). Milestones
live in a parallel ``milestones`` list — an **epic is a milestone**, matching the
git-host model; there are no epic issues or sub-issues.
"""

from __future__ import annotations

import json
from pathlib import Path


class TrackerError(Exception):
    """A local-tracker operation that can't be satisfied (e.g. unknown issue)."""


def store_path(root: Path) -> Path:
    return root / "docs" / "prd" / "tracker.json"


def _load(root: Path) -> dict:
    p = store_path(root)
    if not p.is_file():
        return {"next": 1, "issues": [], "next_milestone": 1, "milestones": []}
    data = json.loads(p.read_text(encoding="utf-8"))
    data.setdefault("next", 1)
    data.setdefault("issues", [])
    data.setdefault("next_milestone", 1)
    data.setdefault("milestones", [])
    return data


def _save(root: Path, data: dict) -> None:
    p = store_path(root)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def _find(data: dict, number: int) -> dict:
    for issue in data["issues"]:
        if issue["number"] == number:
            return issue
    raise TrackerError(f"no issue #{number} in the local tracker (docs/prd/tracker.json)")


def ensure(root: Path) -> Path:
    """Initialise the store if absent (idempotent). Returns its path."""
    _save(root, _load(root))
    return store_path(root)


def create(root: Path, title: str, body: str, labels, milestone: str | None = None) -> int:
    data = _load(root)
    number = int(data["next"])
    data["next"] = number + 1
    ms_number = _ensure_milestone(data, milestone) if milestone else None
    data["issues"].append(
        {
            "number": number,
            "title": title,
            "body": body,
            "labels": list(labels),
            "state": "open",
            "comments": [],
            "blocked_by": [],
            "milestone": ms_number,
        }
    )
    _save(root, data)
    return number


def view(root: Path, number: int) -> dict:
    return _find(_load(root), number)


def list_issues(root: Path, label: str | None = None, state: str | None = None) -> list[dict]:
    issues = _load(root)["issues"]
    if label:
        issues = [i for i in issues if label in i["labels"]]
    if state:
        issues = [i for i in issues if i["state"] == state]
    return issues


def comment(root: Path, number: int, text: str) -> None:
    data = _load(root)
    _find(data, number)["comments"].append(text)
    _save(root, data)


def close(root: Path, number: int, comment_text: str | None = None) -> None:
    data = _load(root)
    issue = _find(data, number)
    issue["state"] = "closed"
    if comment_text:
        issue["comments"].append(comment_text)
    _save(root, data)


def edit_labels(root: Path, number: int, add=(), remove=()) -> list[str]:
    data = _load(root)
    issue = _find(data, number)
    remove = set(remove)
    labels = [label for label in issue["labels"] if label not in remove]
    for label in add:
        if label not in labels:
            labels.append(label)
    issue["labels"] = labels
    _save(root, data)
    return labels


def add_dependency(root: Path, number: int, blocker: int) -> None:
    data = _load(root)
    issue = _find(data, number)
    _find(data, blocker)  # the blocker must exist
    if blocker == number:
        raise TrackerError(f"issue #{number} cannot block itself")
    if blocker not in issue["blocked_by"]:
        issue["blocked_by"].append(blocker)
    _save(root, data)


def _find_milestone(data: dict, number: int) -> dict:
    for m in data["milestones"]:
        if m["number"] == number:
            return m
    raise TrackerError(f"no milestone #{number} in the local tracker (docs/prd/tracker.json)")


def _ensure_milestone(data: dict, title: str) -> int:
    """Return the number of the milestone titled *title*, creating it if absent."""
    for m in data["milestones"]:
        if m["title"] == title:
            return m["number"]
    number = int(data["next_milestone"])
    data["next_milestone"] = number + 1
    data["milestones"].append({"number": number, "title": title, "state": "open"})
    return number


def create_milestone(root: Path, title: str) -> int:
    """Create the epic milestone (idempotent by title); returns its number."""
    data = _load(root)
    number = _ensure_milestone(data, title)
    _save(root, data)
    return number


def close_milestone(root: Path, number: int) -> None:
    data = _load(root)
    _find_milestone(data, number)["state"] = "closed"
    _save(root, data)


def list_milestones(root: Path) -> list[dict]:
    return _load(root)["milestones"]


def set_milestone(root: Path, number: int, title: str) -> int:
    """Assign issue *number* to the milestone titled *title* (created if absent)."""
    data = _load(root)
    issue = _find(data, number)
    ms_number = _ensure_milestone(data, title)
    issue["milestone"] = ms_number
    _save(root, data)
    return ms_number
