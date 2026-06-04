"""Forge helper: detect the issue/PR provider and emit the provider-correct
command snippet for a requested key.

Three providers are supported:

* ``gh``    — GitHub (``origin`` points at github.com).
* ``fgj``   — Forgejo / Codeberg / Gitea.
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


# How a skill invokes the bundled tool from its bash context. Used verbatim in
# the `local` provider's snippets; ${CLAUDE_PLUGIN_ROOT} expands when the agent
# runs the command (prd_tool only prints this string literally).
PRD_TOOL = 'python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz"'


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


@dataclass
class Forge:
    provider: str   # "gh" (GitHub) | "fgj" (Forgejo/Codeberg/Gitea) | "local"
    owner: str
    repo: str

    def pick(self, gh: str, fgj: str) -> str:
        return gh if self.provider == "gh" else fgj


def detect(remote: str | None = None) -> Forge:
    """Resolve the provider + owner/repo from the ``origin`` remote (or *remote*).

    Git must be initialised — ``NotAGitRepo`` is raised otherwise. An empty
    remote (git with no ``origin``) resolves to the built-in ``local`` tracker
    with full local branching. A non-empty remote we don't recognise raises
    ``UnknownForge``.
    """
    if remote is None:
        if not _is_git_repo():
            raise NotAGitRepo
        remote = _remote_url()
    if not remote.strip():
        return Forge(provider="local", owner="-", repo="-")
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
            f'{t} tracker create --title "<t>" --body-file <f> --label <l>'
            "   # prints the new #number to record"
        ),
        "cmd_list_issues": f"{t} tracker list --label <l> --json",
        "cmd_comment": f'{t} tracker comment <n> --body "<text>"',
        "cmd_close_issue": f'{t} tracker close <n> --comment "<text>"',
        "cmd_edit_labels": f"{t} tracker edit <n> --add-label <a> --remove-label <r>",
        "cmd_create_pr": (
            "# No git host — there is no PR. Merge the PRD branch into main locally:\n"
            "git checkout main\n"
            "git merge --no-ff prd/<prd-slug> -m \"Merge PRD <prd-slug> — Closes #<prd-issue>\"\n"
            "git branch -d prd/<prd-slug>"
        ),
        "ensure_labels": f"{t} tracker ensure-labels   # labels are freeform; just initialises the store",
        "cmd_attach_subissue": f"{t} tracker attach <epic#> <child#>",
        "cmd_detach_subissue": f"{t} tracker detach <epic#> <child#>",
        "cmd_add_dependency": f"{t} tracker dep <issue#> --blocked-by <blocker#>",
        "ownership_note": (
            "Local tracker (docs/prd/tracker.json): epic→child via parent links (tracker attach); "
            "PRD<-slice / slice<-slice / PRD<-PRD ordering via native blocked_by edges (tracker dep). "
            "Same branch workflow (prd/<slug>, slice/<n>-<slug>), no remote — PRD branch merges into "
            "main locally at finalize."
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
