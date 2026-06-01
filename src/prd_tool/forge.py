"""Forge (git host) helper: detect GitHub vs Forgejo/Gitea from ``origin`` and
emit the provider-correct command snippet for a requested key.

Ported from the old ``scripts/forge_detect.sh`` so the skills can reach it
through the bundled ``prd_tool.pyz`` (one allowlisted entry point) instead of a
second script. This module is the single source of truth for the per-provider
command shapes the prd-workflow skills inject; the human narrative lives in the
consuming repo's ``docs/workflow/forge.md``.

Placeholders in emitted commands use ``<angle-brackets>``; fill them in.
"""

from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass

# Keys grouped exactly as the old `forge_detect.sh keys` printed them.
KEY_GROUPS = (
    ("git_type", "owner", "repo", "auth_check"),
    ("cmd_get_issue", "cmd_create_issue", "cmd_list_issues", "cmd_comment", "cmd_close_issue"),
    ("cmd_edit_labels", "cmd_create_pr", "ensure_labels"),
    ("cmd_attach_subissue", "cmd_detach_subissue", "cmd_add_dependency", "ownership_note"),
)
KEYS = frozenset(k for group in KEY_GROUPS for k in group)

# Tracker labels provisioned idempotently by `ensure_labels` (name, hex colour).
LABELS = (
    ("epic", "b60205"),
    ("kind:feature", "1d76db"), ("kind:capability", "0e8a16"), ("prd", "5319e7"),
    ("mode:hitl", "fbca04"), ("mode:afk", "c2e0c6"),
    ("status:todo", "ededed"), ("status:in-progress", "0052cc"),
    ("status:needs-review", "d93f0b"), ("status:done", "0e8a16"),
)


class UnknownForge(Exception):
    """The ``origin`` remote doesn't map to a supported provider."""

    def __init__(self, remote: str) -> None:
        super().__init__(remote)
        self.remote = remote


def _remote_url() -> str:
    try:
        out = subprocess.run(
            ["git", "remote", "get-url", "origin"],
            capture_output=True, text=True,
        )
    except FileNotFoundError:
        return ""
    return out.stdout.strip()


@dataclass
class Forge:
    provider: str   # "gh" (GitHub) | "fgj" (Forgejo/Codeberg/Gitea)
    owner: str
    repo: str

    def pick(self, gh: str, fgj: str) -> str:
        return gh if self.provider == "gh" else fgj


def detect(remote: str | None = None) -> Forge:
    """Resolve provider + owner/repo from the ``origin`` remote (or *remote*)."""
    remote = _remote_url() if remote is None else remote
    low = remote.lower()
    if "github.com" in low:
        provider = "gh"
    elif "codeberg.org" in low or "forgejo" in low or "gitea" in low:
        provider = "fgj"
    else:
        raise UnknownForge(remote)
    path = remote[:-4] if remote.endswith(".git") else remote
    repo = path.rsplit("/", 1)[-1]
    rest = path.rsplit("/", 1)[0] if "/" in path else path
    owner = re.split(r"[:/]", rest)[-1]   # last segment after the final '/' or ':'
    return Forge(provider=provider, owner=owner, repo=repo)


def _ensure_labels(f: Forge) -> str:
    lines = []
    for name, color in LABELS:
        if f.provider == "gh":
            lines.append(f"gh label create '{name}' --color {color} --force")
        else:
            lines.append(f"fgj label create '{name}' --color '#{color}' || true")
    return "\n".join(lines)


def _attach_subissue(f: Forge) -> str:
    # The ONLY relationship that uses sub-issue parenting: epic -> {child PRD, child slice}.
    # Everything else (PRD<-slice, slice<-slice, PRD<-PRD) is a dependency — see cmd_add_dependency.
    if f.provider == "gh":
        return "\n".join((
            "# GitHub native sub-issue. child id != issue number — resolve it first.",
            f'child_id=$(gh api "repos/{f.owner}/{f.repo}/issues/<child#>" --jq .id)',
            f'gh api --method POST "repos/{f.owner}/{f.repo}/issues/<epic#>/sub_issues" -F sub_issue_id="$child_id"',
        ))
    return "\n".join((
        "# Forgejo/Gitea: sub-issue support varies by version. If the build exposes it, set the child's",
        '# parent ref to the epic; otherwise emulate by convention (epic task list "- [ ] #<child>" +',
        '# a "Part of #<epic>" line in the child). Confirm the API against your fgj version first.',
    ))


def _detach_subissue(f: Forge) -> str:
    if f.provider == "gh":
        return "\n".join((
            "# GitHub: detach <child#> from <epic#>. Uses the child's internal id.",
            f'child_id=$(gh api "repos/{f.owner}/{f.repo}/issues/<child#>" --jq .id)',
            f'gh api --method DELETE "repos/{f.owner}/{f.repo}/issues/<epic#>/sub_issue" -F sub_issue_id="$child_id"',
        ))
    return "# Forgejo: clear the child's parent ref (PATCH /issues/<child#> with empty parent)."


def _add_dependency(f: Forge) -> str:
    # Make <issue#> blocked-by <blocker#> (native dependency). issue_id != number — resolve it.
    if f.provider == "gh":
        return "\n".join((
            f'blocker_id=$(gh api "repos/{f.owner}/{f.repo}/issues/<blocker#>" --jq .id)',
            f'gh api --method POST "repos/{f.owner}/{f.repo}/issues/<issue#>/dependencies/blocked_by" \\',
            '  -H "X-GitHub-Api-Version: 2026-03-10" -F issue_id="$blocker_id"',
        ))
    return "\n".join((
        "# Forgejo/Gitea native dependency: <issue#> depends on (is blocked by) <blocker#>.",
        f'fgj api --method POST "repos/{f.owner}/{f.repo}/issues/<issue#>/dependencies" \\',
        '  --field "index=<blocker#>"',
    ))


def _snippet(f: Forge, key: str) -> str:
    p = f.pick
    if key == "git_type":
        return f.provider
    if key == "owner":
        return f.owner
    if key == "repo":
        return f.repo
    if key == "auth_check":
        return p("gh auth status", "fgj auth status")
    if key == "cmd_get_issue":
        return p("gh issue view <n> --json number,title,body,labels,state", "fgj issue view <n>")
    if key == "cmd_create_issue":
        return p(
            'gh issue create --title "<t>" --body-file <f> --label <l> --milestone "<M>"',
            'fgj issue create --title "<t>" --body "<b>" --label <l>   # no --milestone: use a milestone:M<NN> label',
        )
    if key == "cmd_list_issues":
        return p("gh issue list --label <l> --json number,title,state", "fgj issue list --label <l>")
    if key == "cmd_comment":
        return p('gh issue comment <n> --body "<text>"', 'fgj issue comment <n> --body "<text>"')
    if key == "cmd_close_issue":
        return p('gh issue close <n> --comment "<text>"', "fgj issue close <n>")
    if key == "cmd_edit_labels":
        return p("gh issue edit <n> --add-label <a> --remove-label <r>", "fgj issue edit <n> --label <a>")
    if key == "cmd_create_pr":
        return p(
            'gh pr create --base main --head <branch> --title "<t>" --body-file <f>',
            'fgj pr create --base main --head <branch> --title "<t>" --body "<b>"',
        )
    if key == "ensure_labels":
        return _ensure_labels(f)
    if key == "cmd_attach_subissue":
        return _attach_subissue(f)
    if key == "cmd_detach_subissue":
        return _detach_subissue(f)
    if key == "cmd_add_dependency":
        return _add_dependency(f)
    if key == "ownership_note":
        return p(
            "GitHub: epics own children via native sub-issues; PRD<-slice / slice<-slice / PRD<-PRD "
            "order via native issue dependencies (gh api).",
            "Forgejo: native sub-issues (parent ref) for epic->child; native issue dependencies for "
            "ordering (fgj api).",
        )
    raise KeyError(key)


def keys_listing() -> str:
    return "\n".join(" ".join(group) for group in KEY_GROUPS)


def render(key: str) -> tuple[str, int]:
    """Return ``(text, exit_code)`` for *key*.

    ``keys`` lists the available keys (no remote needed). An unsupported
    provider yields a visible ``UNKNOWN_FORGE`` marker on stdout with exit 0
    (so an injection shows it rather than failing). An unknown key is an error
    (exit 65), matching the old script.
    """
    if key == "keys":
        return keys_listing(), 0
    if key not in KEYS:
        return f"unknown key {key!r} — run 'forge keys' for the list", 65
    try:
        f = detect()
    except UnknownForge as e:
        return (
            f"UNKNOWN_FORGE: cannot tell provider from remote {e.remote!r} — "
            "ask the user which CLI to use.",
            0,
        )
    return _snippet(f, key), 0
