"""Forge helper: detect the issue/PR provider and emit the provider-correct
command snippet for a requested key.

Three providers are supported:

An **epic is a milestone** (not an issue): a child PRD issue joins its epic by being
assigned that milestone, and slices block their PRD issue via native dependencies.
There are no epic issues and no sub-issues.

* ``gh``    — GitHub (``origin`` points at github.com). Uses the ``gh`` CLI.
* ``fgj``   — Forgejo / Codeberg / Gitea. **All operations route through the
  bundled native REST client** (``prd_tool forgejo ...`` → ``forgejo_api.py``),
  not the ``fgj`` CLI; the only ``fgj`` touch is fetching the auth token, done
  inside the client. This sidesteps the CLI's gaps (no ``api`` passthrough, no
  ``--milestone``) and gives native milestones for epics.
* ``local`` — **no recognised git host**: the repo is a local git repo with no
  ``origin`` remote (or an empty one). The snippets drive the built-in local
  issue tracker (``prd_tool tracker ...`` → ``docs/prd/tracker.json``) and
  **use the same branch workflow** (``prd/<slug>``, ``slice/<n>-<slug>``) as the
  hosted forges — just without remote operations (no fetch/push/PRs). The PRD
  branch is merged into ``main`` locally at finalize.

  Git must be initialised (``git rev-parse`` must succeed); a directory that
  isn't a git repo at all raises ``NotAGitRepo``. A *non-empty but unrecognised*
  remote is still an error (``UNKNOWN_FORGE``) — we don't guess at an unknown
  host's CLI.

Ported from the old ``scripts/forge_detect.sh`` so the skills can reach it
through the bundled ``prd_tool.pyz`` (one allowlisted entry point) instead of a
second script. This module is the single source of truth for the per-provider
command shapes the prd-workflow skills inject; the human narrative lives in the
consuming repo's ``docs/workflow/forge.md``.

Placeholders in emitted commands use ``<angle-brackets>``; fill them in.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
import tomllib
from dataclasses import dataclass
from pathlib import Path

# Keys grouped exactly as the old `forge_detect.sh keys` printed them.
KEY_GROUPS = (
    ("git_type", "owner", "repo", "auth_check"),
    ("cmd_get_issue", "cmd_create_issue", "cmd_list_issues", "cmd_comment", "cmd_close_issue"),
    ("cmd_edit_labels", "cmd_edit_issue", "cmd_create_pr", "ensure_labels"),
    ("cmd_create_milestone", "cmd_close_milestone", "cmd_add_dependency", "ownership_note"),
)
KEYS = frozenset(k for group in KEY_GROUPS for k in group)

# Tracker labels provisioned idempotently by `ensure_labels` (name, hex colour).
# An epic is a *milestone*, not an issue, so there is no `epic` label.
LABELS = (
    ("kind:feature", "1d76db"), ("kind:capability", "0e8a16"), ("prd", "5319e7"),
    ("mode:hitl", "fbca04"), ("mode:afk", "c2e0c6"),
    ("status:todo", "ededed"), ("status:in-progress", "0052cc"),
    ("status:needs-review", "d93f0b"), ("status:done", "0e8a16"),
)


# Absolute command to re-invoke this very tool, computed from the running
# artifact's own path. The CLI embeds this in every command snippet it prints, so
# the model runs an absolute path in the Bash tool — no ${CLAUDE_PLUGIN_ROOT} /
# ${CLAUDE_SKILL_DIR} needed (neither is set in the Bash tool's runtime env; they
# only expand during a skill's `!` preprocessing). Recomputed each run, so it
# survives plugin updates. realpath() normalises any `..` from a CLAUDE_SKILL_DIR
# -relative invocation down to the real plugin-root path.
PRD_TOOL = f'python3 "{os.path.realpath(sys.argv[0])}"'


class UnknownForge(Exception):
    """The ``origin`` remote is non-empty but doesn't map to a supported host."""

    def __init__(self, remote: str) -> None:
        super().__init__(remote)
        self.remote = remote


class NotAGitRepo(Exception):
    """The working directory is not inside a git repository."""


def _is_git_repo() -> bool:
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--is-inside-work-tree"],
            capture_output=True, text=True,
        )
        return out.returncode == 0
    except FileNotFoundError:
        return False


def _remote_url() -> str:
    try:
        out = subprocess.run(
            ["git", "remote", "get-url", "origin"],
            capture_output=True, text=True,
        )
    except FileNotFoundError:
        return ""
    return out.stdout.strip()


def _repo_root() -> Path | None:
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True,
        )
    except FileNotFoundError:
        return None
    if out.returncode != 0:
        return None
    return Path(out.stdout.strip())


VALID_PROVIDERS = frozenset(("gh", "fgj", "local"))


def _read_prdrc() -> dict[str, str] | None:
    """Read ``[forge]`` overrides from ``.prdrc`` at the repo root.

    Returns ``None`` if the file doesn't exist or has no ``[forge]`` section.
    """
    root = _repo_root()
    if root is None:
        return None
    rc = root / ".prdrc"
    if not rc.is_file():
        return None
    try:
        data = tomllib.loads(rc.read_text())
    except (OSError, tomllib.TOMLDecodeError):
        return None
    forge_section = data.get("forge")
    if not isinstance(forge_section, dict):
        return None
    provider = forge_section.get("provider")
    if provider is None:
        return None
    if provider not in VALID_PROVIDERS:
        return None
    result: dict[str, str] = {"provider": provider}
    for key in ("owner", "repo"):
        val = forge_section.get(key)
        if isinstance(val, str) and val:
            result[key] = val
    return result


@dataclass
class Forge:
    provider: str   # "gh" (GitHub) | "fgj" (Forgejo/Codeberg/Gitea) | "local"
    owner: str
    repo: str

    def pick(self, gh: str, fgj: str) -> str:
        return gh if self.provider == "gh" else fgj


def detect(remote: str | None = None) -> Forge:
    """Resolve the provider + owner/repo from the ``origin`` remote (or *remote*).

    If a ``.prdrc`` file exists at the repo root with a ``[forge]`` section
    containing ``provider``, that value takes precedence over URL-based
    detection. ``owner`` and ``repo`` may also be set there; if omitted they
    are inferred from the remote as usual (or default to ``"-"``).

    Git must be initialised — ``NotAGitRepo`` is raised otherwise. An empty
    remote (git with no ``origin``) resolves to the built-in ``local`` tracker
    with full local branching. A non-empty remote we don't recognise raises
    ``UnknownForge`` — unless ``.prdrc`` overrides the provider.
    """
    rc = _read_prdrc() if remote is None else None

    if remote is None:
        if not _is_git_repo():
            raise NotAGitRepo
        remote = _remote_url()

    owner_from_remote: str | None = None
    repo_from_remote: str | None = None
    if remote.strip():
        path = remote[:-4] if remote.endswith(".git") else remote
        repo_from_remote = path.rsplit("/", 1)[-1]
        rest = path.rsplit("/", 1)[0] if "/" in path else path
        owner_from_remote = re.split(r"[:/]", rest)[-1]

    if rc is not None:
        return Forge(
            provider=rc["provider"],
            owner=rc.get("owner") or owner_from_remote or "-",
            repo=rc.get("repo") or repo_from_remote or "-",
        )

    if not remote.strip():
        return Forge(provider="local", owner="-", repo="-")
    low = remote.lower()
    if "github.com" in low:
        provider = "gh"
    elif "codeberg.org" in low or "forgejo" in low or "gitea" in low:
        provider = "fgj"
    else:
        raise UnknownForge(remote)
    return Forge(provider=provider, owner=owner_from_remote or "-", repo=repo_from_remote or "-")


def _ensure_labels(f: Forge) -> str:
    if f.provider == "fgj":
        return f"{PRD_TOOL} forgejo ensure-labels"
    return "\n".join(
        f"gh label create '{name}' --color {color} --force" for name, color in LABELS
    )


def _create_milestone(f: Forge) -> str:
    # An epic IS a milestone. Create it from the epic's title; record the number
    # it prints as `epic_milestone:`. Child PRD issues join it via cmd_create_issue's
    # --milestone "<epic-title>".
    if f.provider == "gh":
        return (
            f'gh api --method POST "repos/{f.owner}/{f.repo}/milestones" '
            '-f title="<epic-title>" --jq .number   # prints the milestone number to record'
        )
    return f'{PRD_TOOL} forgejo milestone create "<epic-title>"   # prints the milestone number to record'


def _close_milestone(f: Forge) -> str:
    if f.provider == "gh":
        return f'gh api --method PATCH "repos/{f.owner}/{f.repo}/milestones/<ms#>" -f state=closed'
    return f"{PRD_TOOL} forgejo milestone close <ms#>"


def _add_dependency(f: Forge) -> str:
    # Make <issue#> blocked-by <blocker#> (native dependency). issue_id != number — resolve it.
    if f.provider == "gh":
        return "\n".join((
            f'blocker_id=$(gh api "repos/{f.owner}/{f.repo}/issues/<blocker#>" --jq .id)',
            f'gh api --method POST "repos/{f.owner}/{f.repo}/issues/<issue#>/dependencies/blocked_by" \\',
            '  -H "X-GitHub-Api-Version: 2026-03-10" -F issue_id="$blocker_id"',
        ))
    return f"{PRD_TOOL} forgejo dep <issue#> --blocked-by <blocker#>"


def _local_snippet(key: str) -> str:
    # Local git repo without a remote: issue ops map to the built-in `tracker`
    # (docs/prd/tracker.json); branches follow the same prd/<slug> + slice/<n>-<slug>
    # model as hosted forges — just without fetch/push/PRs.
    t = PRD_TOOL
    table = {
        "git_type": "local",
        "owner": "-",
        "repo": "-",
        "auth_check": "# local tracker (docs/prd/tracker.json) — no host auth needed",
        "cmd_get_issue": f"{t} tracker view <n> --json",
        "cmd_create_issue": (
            f'{t} tracker create --title "<t>" --body-file <f> --label <l> --milestone "<M>"'
            "   # --milestone (the epic) optional; prints the new #number to record"
        ),
        "cmd_list_issues": f"{t} tracker list --label <l> --json",
        "cmd_comment": f'{t} tracker comment <n> --body "<text>"',
        "cmd_close_issue": f'{t} tracker close <n> --comment "<text>"',
        "cmd_edit_labels": f"{t} tracker edit <n> --add-label <a> --remove-label <r>",
        "cmd_edit_issue": f'{t} tracker edit <n> --title "<t>" --body-file <f> --add-label <a> --remove-label <r>',
        "cmd_create_pr": (
            "# No git host — there is no PR. Merge the PRD branch into main locally:\n"
            "git checkout main\n"
            "git merge --no-ff prd/<prd-slug> -m \"Merge PRD <prd-slug> — Closes #<prd-issue>\"\n"
            "git branch -d prd/<prd-slug>"
        ),
        "ensure_labels": f"{t} tracker ensure-labels   # labels are freeform; just initialises the store",
        "cmd_create_milestone": f'{t} tracker milestone create "<epic-title>"   # prints the milestone number to record',
        "cmd_close_milestone": f"{t} tracker milestone close <ms#>",
        "cmd_add_dependency": f"{t} tracker dep <issue#> --blocked-by <blocker#>",
        "ownership_note": (
            "Local tracker (docs/prd/tracker.json): an epic is a milestone (tracker milestone); a PRD "
            "issue joins it via `tracker create --milestone`; slices block the PRD via blocked_by edges "
            "(tracker dep). Same branch workflow (prd/<slug>, slice/<n>-<slug>), no remote — PRD branch "
            "merges into main locally at finalize."
        ),
    }
    return table[key]


def _snippet(f: Forge, key: str) -> str:
    if f.provider == "local":
        return _local_snippet(key)
    p = f.pick
    if key == "git_type":
        return f.provider
    if key == "owner":
        return f.owner
    if key == "repo":
        return f.repo
    if key == "auth_check":
        return p("gh auth status", f"{PRD_TOOL} forgejo auth-check")
    if key == "cmd_get_issue":
        return p("gh issue view <n> --json number,title,body,labels,state", f"{PRD_TOOL} forgejo view <n> --json")
    if key == "cmd_create_issue":
        return p(
            'gh issue create --title "<t>" --body-file <f> --label <l> --milestone "<M>"',
            f'{PRD_TOOL} forgejo create --title "<t>" --body-file <f> --label <l> --milestone "<M>"',
        )
    if key == "cmd_list_issues":
        return p("gh issue list --label <l> --json number,title,state", f"{PRD_TOOL} forgejo list --label <l> --json")
    if key == "cmd_comment":
        return p('gh issue comment <n> --body "<text>"', f'{PRD_TOOL} forgejo comment <n> --body "<text>"')
    if key == "cmd_close_issue":
        return p('gh issue close <n> --comment "<text>"', f'{PRD_TOOL} forgejo close <n> --comment "<text>"')
    if key == "cmd_edit_labels":
        return p(
            "gh issue edit <n> --add-label <a> --remove-label <r>",
            f"{PRD_TOOL} forgejo edit <n> --add-label <a> --remove-label <r>",
        )
    if key == "cmd_edit_issue":
        return p(
            'gh issue edit <n> --title "<t>" --body-file <f> --add-label <a> --remove-label <r>',
            f'{PRD_TOOL} forgejo edit <n> --title "<t>" --body-file <f> --add-label <a> --remove-label <r>',
        )
    if key == "cmd_create_pr":
        return p(
            'gh pr create --base main --head <branch> --title "<t>" --body-file <f>',
            f'{PRD_TOOL} forgejo create-pr --base main --head <branch> --title "<t>" --body-file <f>',
        )
    if key == "ensure_labels":
        return _ensure_labels(f)
    if key == "cmd_create_milestone":
        return _create_milestone(f)
    if key == "cmd_close_milestone":
        return _close_milestone(f)
    if key == "cmd_add_dependency":
        return _add_dependency(f)
    if key == "ownership_note":
        return p(
            "GitHub: an epic is a milestone; each child PRD issue joins it via "
            "`gh issue create --milestone`; slices block their PRD issue via native dependencies "
            "(gh api). No epic issue, no sub-issues.",
            "Forgejo: an epic is a native milestone; each child PRD issue joins it via "
            "`forgejo create --milestone`; slices block their PRD issue via native dependencies. "
            "No epic issue, no sub-issues. All ops go through `prd_tool forgejo` (REST API) — the "
            "fgj CLI isn't used.",
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
    except NotAGitRepo:
        return (
            "NOT_A_GIT_REPO: this directory is not a git repository. "
            "Initialise one with `git init` before running the prd-workflow.",
            1,
        )
    except UnknownForge as e:
        return (
            f"UNKNOWN_FORGE: cannot tell provider from remote {e.remote!r} — "
            "ask the user which CLI to use.",
            0,
        )
    return _snippet(f, key), 0
