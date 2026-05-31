"""Read and write the YAML frontmatter block of a markdown file.

A frontmatter file is ``---\\n<yaml>\\n---\\n<body>``. We parse the YAML into an
ordered ``dict`` and keep the body verbatim, so a mutation rewrites only the
frontmatter and leaves the prose untouched. Comments *inside* the frontmatter
block are not preserved across a write — this is a programmatic editor, not a
round-tripping one.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import yaml

_FENCE = "---"


class FrontmatterError(ValueError):
    """Raised when a file is expected to carry frontmatter but does not."""


@dataclass
class Document:
    path: Path
    data: dict          # parsed frontmatter (empty dict if the block was empty)
    body: str           # everything after the closing fence, verbatim

    def dump(self) -> str:
        block = yaml.safe_dump(
            self.data,
            sort_keys=False,
            allow_unicode=True,
            default_flow_style=False,
        ).rstrip("\n")
        return f"{_FENCE}\n{block}\n{_FENCE}\n{self.body}"

    def save(self) -> None:
        self.path.write_text(self.dump(), encoding="utf-8")


def parse(path: Path) -> Document:
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines(keepends=True)
    if not lines or lines[0].strip() != _FENCE:
        raise FrontmatterError(f"{path}: no opening '---' frontmatter fence")

    for i in range(1, len(lines)):
        if lines[i].strip() == _FENCE:
            raw = "".join(lines[1:i])
            body = "".join(lines[i + 1:])
            data = yaml.safe_load(raw) or {}
            if not isinstance(data, dict):
                raise FrontmatterError(f"{path}: frontmatter is not a mapping")
            return Document(path=path, data=data, body=body)

    raise FrontmatterError(f"{path}: unterminated frontmatter (no closing '---')")
